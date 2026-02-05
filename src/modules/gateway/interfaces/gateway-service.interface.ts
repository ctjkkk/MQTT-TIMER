import type { MqttUnifiedMessage, MqttMessageType } from '@/shared/constants/topic.constants'
import type { GatewayStatusData } from '../types/gateway.type'
import type { TimerDocument } from '@/modules/timer/schema/timer.schema'
import { BindGatewayResponseDto, GatewayStatusResponseDto } from '../dto/http-response.dto'
import { SubDeviceListResponseDto } from '@/modules/timer/dto/timer.response.dto'

export interface IGatewayServiceInterface {
  // ============ MQTT消息处理方法 ============

  /**
   * 处理网关心跳消息
   * @param message 心跳消息(会改变网关的在线状态)
   */
  processHeartbeat(message: MqttUnifiedMessage): Promise<void>

  /**
   * 处理网关状态上报
   * @param message 网关状态消息
   */
  handleGatewayStatus(message: MqttUnifiedMessage<GatewayStatusData>): Promise<void>

  /**
   * 处理网关生命周期消息（注册、重启等）
   * @param message 网关生命周期消息
   */
  processGatewayLifecycle(message: MqttUnifiedMessage): Promise<void>

  /**
   * 标记网关为离线状态
   * @param gatewayId 网关ID
   * @param timestamp 离线时间戳
   */
  markGatewayOffline(gatewayId: string, timestamp: Date): Promise<void>

  // ============ HTTP接口方法 ============

  /**
   * 绑定网关到用户账号
   * @param userId 用户ID
   * @param gatewayId 网关ID
   * @param gatewayName 可选的网关名称
   * @returns 绑定结果
   */
  bindGatewayToUser(userId: string, gatewayId: string, gatewayName?: string): Promise<BindGatewayResponseDto>

  /**
   * 获取网关状态
   * @param gatewayId 网关ID
   * @returns 网关状态信息
   */
  getGatewayStatus(gatewayId: string, userId: string): Promise<GatewayStatusResponseDto>

  /**
   * 验证网关是否在线
   * @param gatewayId 网关ID
   * @returns 在线状态
   */
  verifyGatewayOnline(gatewayId: string): Promise<boolean>

  /**
   * 解绑网关
   * @param userId 用户ID
   * @param gatewayId 网关ID
   * @returns 解绑结果
   */
  unbindGateway(userId: string, gatewayId: string): Promise<{ message: string }>

  // ============ 子设备管理 ============

  /**
   * 获取网关下的所有子设备
   * @param gatewayId 网关ID
   * @returns 子设备列表
   */
  getSubDevices(gatewayId: string, userId: string): Promise<SubDeviceListResponseDto[]>
}
