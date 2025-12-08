import type { TimerDocument } from '@/modules/timer/schema/timer.schema'
import type { GatewayDocument } from '../schema/HanqiGateway.schema'
import type { MqttUnifiedMessage, MqttMessageType } from '@/shared/constants/mqtt-topic.constants'
import type { GatewayStatusData } from '../types/gateway.type'

/**
 * Gateway服务接口
 * 定义网关模块的核心业务方法
 */
export interface IGatewayServiceInterface {
  /**
   * 查询网关下所有子设备
   * @param macAddress 网关MAC地址
   * @returns 子设备列表
   */
  findAllOfSubDevice(macAddress: string): Promise<TimerDocument[]>

  /**
   * 处理网关状态上报
   * @param message MQTT统一消息格式
   */
  handleGatewayStatus(message: MqttUnifiedMessage<GatewayStatusData>): Promise<void>

  /**
   * 处理网关心跳
   * @param message MQTT统一消息格式
   */
  handleHeartbeat(message: MqttUnifiedMessage): Promise<void>

  /**
   * 向网关发送命令
   * @param gatewayId 网关ID
   * @param msgType 消息类型
   * @param data 消息数据
   */
  sendGatewayCommand(gatewayId: string, msgType: MqttMessageType | string, data: any): Promise<void>

  /**
   * 通过网关向子设备发送命令
   * @param gatewayId 网关ID
   * @param subDeviceId 子设备ID
   * @param msgType 消息类型
   * @param data 消息数据
   */
  sendSubDeviceCommand(gatewayId: string, subDeviceId: string, msgType: MqttMessageType | string, data: any): Promise<void>

  /**
   * 根据子设备ID查找所属网关
   * @param subDeviceId 子设备ID
   * @returns 网关文档或null
   */
  findGatewayBySubDeviceId(subDeviceId: string): Promise<GatewayDocument | null>

  /**
   * 处理网关生命周期事件
   * @param message MQTT统一消息格式
   */
  handleGatewayLifecycle(message: MqttUnifiedMessage): Promise<void>
}
