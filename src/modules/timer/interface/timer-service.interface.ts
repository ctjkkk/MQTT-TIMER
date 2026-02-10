import type { MqttUnifiedMessage, DpReportData } from '@/shared/constants/topic.constants'
import { SubDeviceInfoResponseDto, SubDeviceListResponseDto } from '../dto/timer.response.dto'
import type { GatewayDocument } from '@/modules/gateway/schema/gateway.schema'

export interface ITimerService {
  /**
   * 处理Timer设备的DP点上报
   * @param message DP点上报消息
   */
  handleDpReport(message: MqttUnifiedMessage<DpReportData>): Promise<void>

  /**
   * 处理子设备心跳
   * @param message 心跳消息
   */
  handleHeartbeat(message: MqttUnifiedMessage): Promise<void>

  /**
   * 处理子设备生命周期操作（添加、删除、更新）
   * @param message 操作消息
   */
  handleOperateDevice(message: MqttUnifiedMessage): Promise<void>

  /**
   * 批量处理子设备状态上报
   * @param message 状态上报消息
   */
  handleDeviceStatus(message: MqttUnifiedMessage): Promise<void>

  /**
   * 添加子设备（网关配对成功后调用）
   * @param gatewayId 网关ID
   * @param subDevices 子设备列表，每个设备只包含 { uuid, productId }
   */
  addSubDevices(gatewayId: string, subDevices: any[]): Promise<void>

  /**
   * 删除子设备（网关主动上报删除）
   * @param gatewayId 网关ID
   * @param subDeviceId 子设备ID
   */
  deleteSubDeviceByGateway(gatewayId: string, subDeviceId: string): Promise<void>

  /**
   * 更新子设备信息
   * @param data 更新数据
   */
  updateSubDevice(data: any): Promise<void>

  /**
   * 根据子设备ID查找它所属的网关
   * @param subDeviceId 子设备ID
   * @returns 网关文档或null
   */
  findGatewayBySubDeviceId(subDeviceId: string): Promise<GatewayDocument | null>

  /**
   * 通过ID删除指定子设备
   * @param timerId Timer设备ID
   */
  deleteSubDeviceById(timerId: string): Promise<void>

  /**
   * 通过ID修改指定子设备名称
   * @param timerId Timer设备ID
   * @param newName 新名称
   * @returns 更新后的子设备信息
   */
  renameSubDeviceById(timerId: string, newName: string): Promise<SubDeviceListResponseDto>

  /**
   * 通过子设备ID查询该子设备的所有信息，包含通道详情列表
   * @param timerId Timer设备ID
   * @returns 子设备完整信息（含通道列表）
   */
  getSubDeviceInfoByTimerId(timerId: string): Promise<SubDeviceInfoResponseDto>
}
