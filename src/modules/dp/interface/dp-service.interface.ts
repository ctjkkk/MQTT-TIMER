import { DpDefinition, ProductDpSchema } from '../types/dp.types'

export interface IDpService {
  /**
   * 获取产品的完整 DP Schema
   * @param productId 产品ID
   * @returns DP Schema 对象
   * @throws Error 产品不存在
   */
  getSchema(productId: string): ProductDpSchema

  /**
   * 获取单个 DP 点的定义
   * @param productId 产品ID
   * @param dpId DP ID
   * @returns DP 定义对象，不存在返回 null
   */
  getDpDefinition(productId: string, dpId: number): DpDefinition | null

  /**
   * 验证 DP 命令数据（不构建消息，只验证）
   * @param productId 产品ID
   * @param dps DP 数据对象
   * @throws Error 验证失败
   */
  validateDpCommand(productId: string, dps: Record<number, any>): void

  /**
   * 构建 MQTT 下发命令（自动验证 DP 数据）
   * @param productId 产品ID
   * @param deviceId 设备ID
   * @param dps DP 数据对象
   * @returns MQTT 命令对象（涂鸦标准格式）
   * @throws Error 验证失败
   */
  buildCommand(productId: string, deviceId: string, dps: Record<number, any>): {
    msgId: string
    deviceId: string
    t: number
    dps: Record<string, any>
  }
}
