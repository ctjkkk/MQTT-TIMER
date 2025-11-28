import { Injectable, Inject } from '@nestjs/common'
import { AedesBrokerService } from '@/core/mqtt/mqtt-broker.service'
import {
  MqttUnifiedMessage,
  SubDevicesData,
  HanqiMqttTopic,
  MqttMessageType,
} from '@/shared/constants/hanqi-mqtt-topic.constants'
import HanqiGateway from './schema/HanqiGateway.schema'
import HanqiTimer from '../timer/schema/timer.schema'
import User from '@/shared/schemas/User'
import type { UserDocument } from '@/shared/schemas/User'
import { buildGatewayMessage, buildSubDeviceMessage } from './utils/gateway.utils'
import { GatewayStatusData } from './interfaces/gateway-type.interface'
/**
 * Gateway模块的Service
 *
 * 职责：
 * 1. 处理网关自身的业务逻辑（连接、状态、子设备列表）
 * 2. 提供通过网关发送命令到子设备的能力
 * 3. 管理网关和子设备的关联关系
 */
@Injectable()
export class GatewayService {
  // 注入 MQTT Broker
  constructor(
    @Inject(AedesBrokerService)
    private readonly broker: AedesBrokerService,
  ) {}

  // ========== 设备注册相关 ==========

  /**
   * 根据MAC地址查找用户（设备加入时使用）
   */
  async findUserByMacAddress(mac: string): Promise<UserDocument | null> {
    const gateway = await HanqiGateway.findOne({ mac_address: mac })
    if (!gateway) return null

    const user = await User.findById(gateway.userId)
    if (!user) return null

    // 更新网关状态
    gateway.is_connected = 1
    gateway.last_seen = new Date()
    await gateway.save()

    return user
  }

  /**
   * 断开设备连接
   */
  async disconnectDevice(mac: string): Promise<boolean> {
    const gateway = await HanqiGateway.findOne({ mac_address: mac })
    if (!gateway) return false

    gateway.is_connected = 0
    gateway.last_seen = new Date()
    await gateway.save()

    // 同时更新该网关下所有子设备的状态
    await HanqiTimer.updateMany({ gatewayId: gateway._id }, { $set: { is_connected: 0 } })

    return true
  }

  /**
   * 根据ID查找网关
   */
  async findByGatewayId(gatewayId: string) {
    return await HanqiGateway.findOne({ gatewayId })
  }

  // ========== 网关消息处理 ==========

  /**
   * 处理网关状态上报
   */
  async handleGatewayStatus(message: MqttUnifiedMessage<GatewayStatusData>) {
    console.log(`[GatewayService] 处理网关状态: ${message.deviceId}`)

    const { online, wifi_rssi, firmware, memory_usage, cpu_usage } = message.data

    await HanqiGateway.updateOne(
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
   * 处理子设备列表上报
   * 网关启动时或子设备变化时会上报
   */
  async handleSubDeviceList(message: MqttUnifiedMessage<SubDevicesData>) {
    console.log(`[GatewayService] 处理子设备列表: ${message.deviceId}`)

    const { subDevices } = message.data
    const gatewayId = message.deviceId

    // 查找网关
    const gateway = await HanqiGateway.findOne({ gatewayId })
    if (!gateway) {
      console.warn(`[GatewayService] 网关不存在: ${gatewayId}`)
      return
    }

    // 更新或创建子设备记录
    for (const subDevice of subDevices) {
      await HanqiTimer.updateOne(
        { timerId: subDevice.subDeviceId },
        {
          $set: {
            gatewayId: gateway._id,
            userId: gateway.userId,
            outlet_count: subDevice.outletCount || 2,
            is_connected: subDevice.online ? 1 : 0,
            battery_level: subDevice.battery,
            signal_strength: subDevice.signal,
            firmware_version: subDevice.firmware,
            last_seen: new Date(),
          },
        },
        { upsert: true }, // 不存在则创建
      )
    }

    // 更新网关的子设备列表字段（可选）
    await HanqiGateway.updateOne(
      { _id: gateway._id },
      {
        $set: {
          sub_devices: subDevices.map(sub => ({
            subDeviceId: sub.subDeviceId,
            deviceType: sub.deviceType,
            addedAt: new Date(),
          })),
        },
      },
    )

    console.log(`[GatewayService] 子设备列表已更新: ${subDevices.length}个设备`)
  }

  /**
   * 处理网关心跳
   */
  async handleHeartbeat(message: MqttUnifiedMessage) {
    await HanqiGateway.updateOne({ gatewayId: message.deviceId }, { $set: { last_seen: new Date() } })
  }

  // ========== 向网关发送命令 ==========

  /**
   * 向网关发送命令
   * 这是网关自身的命令（如查询子设备列表、重启等）
   */
  async sendGatewayCommand(gatewayId: string, msgType: MqttMessageType | string, data: any): Promise<void> {
    const message = buildGatewayMessage(msgType, gatewayId, data)
    const topic = HanqiMqttTopic.gatewayCommand(gatewayId)

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
    const message = buildSubDeviceMessage(msgType, gatewayId, subDeviceId, data)
    const topic = HanqiMqttTopic.gatewayCommand(gatewayId)

    this.broker.publish(topic, message)

    console.log(
      `[GatewayService] 已发送子设备命令: ` +
        `gatewayId: ${gatewayId}, ` +
        `subDeviceId: ${subDeviceId}, ` +
        `msgType: ${msgType}`,
    )
  }

  /**
   * 查询网关的子设备列表
   */
  async querySubDevices(gatewayId: string): Promise<void> {
    await this.sendGatewayCommand(gatewayId, MqttMessageType.QUERY_SUB_DEVICES, {})
  }

  /**
   * 删除子设备（从网关解绑）
   */
  async removeSubDevice(gatewayId: string, subDeviceId: string): Promise<void> {
    await this.sendSubDeviceCommand(gatewayId, subDeviceId, MqttMessageType.REMOVE_SUB_DEVICE, {})

    // 更新数据库
    await HanqiTimer.updateOne({ timerId: subDeviceId }, { $set: { is_connected: 0 } })
  }

  // ========== 工具方法 ==========

  /**
   * 根据子设备ID查找它所属的网关
   * 这个方法会被其他Service频繁调用
   */
  async findGatewayBySubDeviceId(subDeviceId: string) {
    const timer = await HanqiTimer.findOne({ timerId: subDeviceId })
    if (!timer) return null

    const gateway = await HanqiGateway.findById(timer.gatewayId)
    return gateway
  }
}
