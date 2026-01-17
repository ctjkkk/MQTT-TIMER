import { Injectable, Inject, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { OnEvent } from '@nestjs/event-emitter'
import { Model } from 'mongoose'
import { MqttBrokerService } from '@/core/mqtt/services/mqttBroker.service'
import type { MqttUnifiedMessage } from '@/shared/constants/mqtt-topic.constants'
import { MqttTopic, MqttMessageType, OperateAction } from '@/shared/constants/mqtt-topic.constants'
import { AppEvents } from '@/shared/constants/events.constants'
import { Gateway, GatewayDocument } from './schema/HanqiGateway.schema'
import { Timer, TimerDocument } from '@/modules/timer/schema/timer.schema'
import { buildGatewayMessage, buildSubDeviceMessage } from './utils/gateway.utils'
import { GatewayStatusData } from './types/gateway.type'
import { LoggerService } from '@/core/logger/logger.service'
import { LogMessages, LogContext } from '@/shared/constants/logger.constants'
import { IGatewayServiceInterface } from './interface/gateway-service.interface'

/**
 * Gateway模块的Service
 *
 * 职责：
 * 1. 处理网关自身的业务逻辑（连接、状态、子设备列表）
 * 2. 提供通过网关发送命令到子设备的能力
 * 3. 管理网关和子设备的关联关系
 * 4. 发布网关业务事件供其他模块监听
 */
@Injectable()
export class GatewayService implements IGatewayServiceInterface {
  constructor(
    @InjectModel(Gateway.name) private readonly gatewayModel: Model<GatewayDocument>,
    @InjectModel(Timer.name) private readonly timerModel: Model<TimerDocument>,
    @Inject(MqttBrokerService) private readonly broker: MqttBrokerService,
    private readonly loggerServer: LoggerService,
  ) {}

  async findAllOfSubDevice(macAddress: string): Promise<TimerDocument[]> {
    const gateway = await this.gatewayModel.findOne({ mac_address: macAddress }).exec()
    if (!gateway) throw new NotFoundException('该网关不存在!')

    const timers = await this.timerModel.find({ gatewayId: macAddress }).exec()
    if (!timers.length) throw new NotFoundException('该网关下无子设备')

    return timers
  }

  /**
   * 监听网关MQTT消息事件
   * 根据消息类型分发到对应的处理方法
   */
  @OnEvent(AppEvents.MQTT_GATEWAY_MESSAGE)
  async handleGatewayMessage(message: MqttUnifiedMessage) {
    switch (message.msgType) {
      case MqttMessageType.HEARTBEAT:
        // 心跳（网关）
        await this.handleHeartbeat(message)
        break
      case MqttMessageType.OPERATE_DEVICE:
        // 处理网关自身的生命周期
        await this.handleGatewayLifecycle(message)
        break
      default:
        this.loggerServer.warn(`未知的网关消息类型: ${message.msgType}`, LogContext.GATEWAY_SERVICE)
    }
  }

  /**
   * 处理网关状态上报
   */
  async handleGatewayStatus(message: MqttUnifiedMessage<GatewayStatusData>) {
    console.log(`[GatewayService] 处理网关状态: ${message.deviceId}`)
    const { online, wifi_rssi, firmware, memory_usage, cpu_usage } = message.data

    await this.gatewayModel.updateOne(
      { gatewayId: message.deviceId },
      {
        $set: {
          is_connected: online ? 1 : 0,
          wifi_rssi,
          firmware_version: firmware,
          last_seen: new Date(),
        },
      },
    )

    console.log(`[GatewayService] 网关状态已更新: ${message.deviceId}, 在线: ${online}`)
  }

  /**
   * 处理网关心跳
   */
  async handleHeartbeat(message: MqttUnifiedMessage) {
    await this.gatewayModel.updateOne({ gatewayId: message.deviceId }, { $set: { last_seen: new Date() } })
  }

  // ========== 向网关发送命令 ==========

  /**
   * 向网关发送命令
   * 这是网关自身的命令（如查询子设备列表、重启等）
   */
  async sendGatewayCommand(gatewayId: string, msgType: MqttMessageType | string, data: any): Promise<void> {
    const message = buildGatewayMessage(msgType, gatewayId, data)
    const topic = MqttTopic.gatewayCommand(gatewayId)

    this.broker.publish(topic, message)

    console.log(`[GatewayService] 已发送网关命令: ${gatewayId}, msgType: ${msgType}`)
  }

  /**
   * 通过网关向子设备发送命令
   * 这是核心方法，其他Service通过这个方法控制子设备
   *
   * @param gatewayId 网关ID
   * @param subDeviceId 子设备ID
   * @param msgType 消息类型
   * @param data 消息数据
   */
  async sendSubDeviceCommand(
    gatewayId: string,
    subDeviceId: string,
    msgType: MqttMessageType | string,
    data: any,
  ): Promise<void> {
    const message = buildSubDeviceMessage(msgType, gatewayId, data)
    const topic = MqttTopic.gatewayCommand(gatewayId)

    this.broker.publish(topic, message)

    console.log(
      `[GatewayService] 已发送子设备命令: ` +
        `gatewayId: ${gatewayId}, ` +
        `subDeviceId: ${subDeviceId}, ` +
        `msgType: ${msgType}`,
    )
  }

  /**
   * 根据子设备ID查找它所属的网关
   * 这个方法会被其他Service频繁调用
   */
  async findGatewayBySubDeviceId(subDeviceId: string) {
    const timer = await this.timerModel.findOne({ timerId: subDeviceId })
    if (!timer) return null
    const gateway = await this.gatewayModel.findById(timer.gatewayId)
    return gateway
  }

  async handleGatewayLifecycle(message: MqttUnifiedMessage) {
    const { data, deviceId: gatewayId } = message
    const { action } = data
    const actionHandlers = new Map<OperateAction, () => Promise<void>>([
      [OperateAction.GATEWAY_REGISTER, () => this.handleGatewayRegister(gatewayId, data)],
      [OperateAction.GATEWAY_UNREGISTER, () => this.handleGatewayUnregister(gatewayId, data)],
      [OperateAction.GATEWAY_UPDATE, () => this.handleGatewayUpdate(gatewayId, data)],
      [OperateAction.GATEWAY_REBOOT, () => this.handleGatewayReboot(gatewayId, data)],
      [OperateAction.GATEWAY_UPGRADE, () => this.handleGatewayUpgrade(gatewayId, data)],
      [OperateAction.GATEWAY_RESET, () => this.handleGatewayReset(gatewayId, data)],
    ])
    const handler = actionHandlers.get(action)
    if (!handler) {
      this.loggerServer.error(LogMessages.GATEWAY.UNKNOWN_ACTION(action), LogContext.GATEWAY)
      throw new NotFoundException('无效的action!')
    }
    await handler()
  }

  private async handleGatewayRegister(gatewayId: string, data: any) {}

  private async handleGatewayUnregister(gatewayId: string, data: any) {}

  private async handleGatewayUpdate(gatewayId: string, data: any) {}

  private async handleGatewayReboot(gatewayId: string, data: any) {}

  private async handleGatewayUpgrade(gatewayId: string, data: any) {}

  private async handleGatewayReset(gatewayId: string, data: any) {}

  private async handleSyncSubDevices(gatewayId: string, data: any) {}

  private async handleBatchAddSubDevices(gatewayId: string, data: any) {}

  private async handleBatchDeleteSubDevices(gatewayId: string, data: any) {}
}
