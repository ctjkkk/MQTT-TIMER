import { Injectable } from '@nestjs/common'
import { MqttUnifiedMessage } from '@/shared/constants/hanqi-mqtt-topic.constants'
import HanqiGateway from './schema/HanqiGateway.schema'
import User from '@/shared/schemas/User'
import type { UserDocument } from '@/shared/schemas/User'

/**
 * Gateway模块的Service
 * 处理网关相关的业务逻辑
 */
@Injectable()
export class GatewayService {
  async findUserByMacAddress(mac: string): Promise<UserDocument | null> {
    const gateway = await HanqiGateway.findOne({ mac_address: mac })
    if (!gateway) return null
    const user = await User.findById(gateway.userId)
    if (!user) return null
    gateway.is_connected = 1
    gateway.last_seen = new Date()
    await gateway.save()

    return user
  }

  async disconnectDevice(mac: string): Promise<boolean> {
    const gateway = await HanqiGateway.findOne({ mac_address: mac })
    if (!gateway) return false

    gateway.is_connected = 0
    gateway.last_seen = new Date()
    await gateway.save()

    return true
  }

  /**
   * 处理子设备列表上报
   */
  async handleSubDevices(message: MqttUnifiedMessage) {
    console.log(`[GatewayService] 处理子设备列表: ${message.deviceId}`)
    const { subDevices } = message.data
    // 查找网关
    const gateway = await HanqiGateway.findOne({ gatewayId: message.deviceId })
    if (!gateway) {
      console.warn(`网关不存在: ${message.deviceId}`)
      return
    }

    // TODO: 可以在网关表中添加subDevices字段存储子设备列表
    // 或者更新子设备的在线状态
    console.log(`[GatewayService] 网关 ${message.deviceId} 有 ${subDevices?.length || 0} 个子设备`)
  }

  /**
   * 处理网关状态上报
   */
  async handleGatewayStatus(message: MqttUnifiedMessage) {
    console.log(`[GatewayService] 处理网关状态: ${message.deviceId}`)
    const { online, firmware, signal } = message.data
    await HanqiGateway.updateOne(
      { gatewayId: message.deviceId },
      {
        $set: {
          is_connected: online ? 1 : 0,
          firmware_version: firmware,
          last_seen: new Date(),
        },
      },
    )

    console.log(`[GatewayService] 网关状态已更新: ${message.deviceId}`)
  }
}
