import { Injectable } from '@nestjs/common'
import { MqttBrokerService } from './mqttBroker.service'
import { buildGatewayMessage } from '@/modules/gateway/utils/gateway.utils'
import { LogContext, LogMessages } from '@/shared/constants/logger.constants'
import { MqttMessageType, MqttTopic, OperateAction, EntityType } from '@/shared/constants/mqtt-topic.constants'
import { LoggerService } from '@/core/logger/logger.service'

/**
 * 命令发送服务
 * 封装所有 MQTT 命令发送逻辑，统一管理设备命令下发
 *
 * 设计说明：
 * - 所有命令都是发给网关的，网关会根据消息内容判断是给自己还是转发给子设备
 * - 统一使用 buildGatewayMessage 构建消息（buildSubDeviceMessage 实现完全相同）
 * - 统一日志格式
 */
@Injectable()
export class CommandSenderService {
  constructor(
    private readonly logger: LoggerService,
    private readonly broker: MqttBrokerService,
  ) {}

  /**
   * 发送命令给网关（私有通用方法）
   * @param gatewayId 网关ID
   * @param msgType 消息类型
   * @param data 消息数据
   */
  private sendCommand(gatewayId: string, msgType: MqttMessageType | string, data: any): void {
    const message = buildGatewayMessage(msgType, gatewayId, data)
    const topic = MqttTopic.gatewayCommand(gatewayId)
    const clientId = `gateway_${gatewayId}`
    this.broker.publishToClient(clientId, topic, JSON.stringify(message))
    this.logger.debug(LogMessages.GATEWAY.COMMAND_SENT(gatewayId, msgType, message), LogContext.GATEWAY_SERVICE)
  }

  // ========== 网关级别命令 ==========

  /**
   * 发送网关命令（公共通用方法）
   * @param gatewayId 网关ID
   * @param msgType 消息类型
   * @param data 消息数据
   */
  sendGatewayCommand(gatewayId: string, msgType: MqttMessageType | string, data: any): void {
    this.sendCommand(gatewayId, msgType, data)
  }

  /**
   * 发送心跳响应给网关
   * @param gatewayId 网关ID
   * @param isBound 网关是否已绑定用户
   * @param userId 用户ID（如果已绑定）
   */
  sendHeartbeatResponse(gatewayId: string, isBound: boolean, userId?: string) {
    this.sendCommand(gatewayId, MqttMessageType.HEARTBEAT_ACK, {
      status: isBound ? 1 : 0,
      userId: isBound ? userId : null,
    })
  }

  /**
   * 发送开始配对子设备命令
   * @param gatewayId 网关ID
   */
  sendStartPairingCommand(gatewayId: string) {
    this.sendCommand(gatewayId, MqttMessageType.OPERATE_DEVICE, {
      entityType: EntityType.GATEWAY,
      action: OperateAction.START_PAIRING,
      timeout: 60, // 配对超时时间，单位秒
    })
  }

  /**
   * 发送停止配对子设备命令
   * @param gatewayId 网关ID
   * @param reason 停止原因, reason: 'timeout' | 'manual' | 'success'
   */
  sendStopPairingCommand(gatewayId: string, reason: string = 'success') {
    this.sendCommand(gatewayId, MqttMessageType.OPERATE_DEVICE, {
      entityType: EntityType.GATEWAY,
      action: OperateAction.STOP_PAIRING,
      reason: reason,
    })
  }
  /**
   * 发送网关重启命令
   * @param gatewayId 网关ID
   */
  sendGatewayRebootCommand(gatewayId: string) {
    this.sendCommand(gatewayId, MqttMessageType.OPERATE_DEVICE, {
      entityType: EntityType.GATEWAY,
      action: OperateAction.GATEWAY_REBOOT,
    })
  }

  // ========== 子设备级别命令 ==========
  /**
   * 发送删除子设备命令
   * @param gatewayId 网关ID
   * @param subDeviceId 子设备ID
   */
  sendDeleteSubDeviceCommand(gatewayId: string, subDeviceId: string) {
    this.sendCommand(gatewayId, MqttMessageType.OPERATE_DEVICE, {
      action: OperateAction.SUBDEVICE_DELETE,
      uuid: subDeviceId, // MQTT消息使用uuid
    })
  }

  /**
   * 发送控制子设备命令（DP点控制）
   * @param gatewayId 网关ID
   * @param subDeviceId 子设备ID（内部参数名）
   * @param dps DP点数据对象 { dpId: dpValue }
   */
  sendControlSubDeviceCommand(gatewayId: string, subDeviceId: string, dps: Record<number, any>) {
    this.sendCommand(gatewayId, MqttMessageType.DP_COMMAND, {
      uuid: subDeviceId, // MQTT消息使用uuid
      dps,
      timestamp: Date.now(),
    })
  }
}
