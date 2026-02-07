import { Injectable } from '@nestjs/common'
import { PRODUCT_DP_SCHEMAS } from '@/modules/dp/constants/product.schemas'
import { DpDefinition, ProductDpSchema } from '@/modules/dp/types/dp.types'

/**
 * DP 配置服务
 * 提供两个核心功能：
 * 1. 查询 DP 配置（根据 productId 和 dpId）
 * 2. 构建 MQTT 下发命令（自动验证）
 */
@Injectable()
export class DpService {
  /**
   * 获取产品的完整 DP Schema
   * @param productId - 产品ID（如：'rgnmfjlnx6hzagwe'）
   * @returns DP Schema 对象
   * @throws Error 产品不存在
   */
  getSchema(productId: string): ProductDpSchema {
    const schema = PRODUCT_DP_SCHEMAS[productId]
    if (!schema) {
      throw new Error(`Unknown productId: ${productId}`)
    }
    return schema
  }

  /**
   * 获取单个 DP 点的定义
   * @param productId - 产品ID
   * @param dpId - DP ID（如：1, 17, 42）
   * @returns DP 定义对象，不存在返回 null
   */
  getDpDefinition(productId: string, dpId: number): DpDefinition | null {
    const schema = this.getSchema(productId)
    return schema.dps.find(dp => dp.id === dpId) || null
  }

  /**
   * 验证 DP 命令数据（不构建消息，只验证）
   * @param productId - 产品ID
   * @param dps - DP 数据对象（如：{ 1: true, 17: 300 }）
   * @throws Error 验证失败
   */
  validateDpCommand(productId: string, dps: Record<number, any>): void {
    const errors: string[] = []
    for (const [dpId, value] of Object.entries(dps)) {
      const id = Number(dpId)
      const dpDef = this.getDpDefinition(productId, id)
      if (!dpDef) {
        errors.push(`DP${id} 不存在`)
        continue
      }
      // 检查 DP 是否可写
      if (dpDef.accessMode === 'ro') {
        errors.push(`DP${id}(${dpDef.name}) 是只读的`)
        continue
      }
      // 检查值的类型和范围
      const valueErrors = this.validateValue(dpDef, value)
      errors.push(...valueErrors)
    }
    if (errors.length > 0) {
      throw new Error(`${errors.join('; ')}`)
    }
  }

  /**
   * 构建 MQTT 下发命令（自动验证 DP 数据）
   * 验证内容：
   * - DP ID 是否存在
   * - DP 是否可写（ro 的不能下发）
   * - DP 值的类型和范围是否正确
   * @param productId - 产品ID
   * @param deviceId - 设备ID
   * @param dps - DP 数据对象（如：{ 1: true, 17: 300 }）
   * @returns MQTT 命令对象（涂鸦标准格式）
   * @throws Error 验证失败
   *
   * @example
   * const command = dpConfigService.buildCommand('rgnmfjlnx6hzagwe', 'device_001', {
   *   1: true,    // DP1: 打开开关
   *   17: 300     // DP17: 设置倒计时300秒
   * })
   * // 返回: { msgId: "xxx", deviceId: "device_001", t: 123456, dps: { "1": true, "17": 300 } }
   */
  buildCommand(productId: string, deviceId: string, dps: Record<number, any>) {
    // 验证所有 DP（复用 validateDpCommand）
    this.validateDpCommand(productId, dps)
    // 构建 MQTT 消息（涂鸦标准格式）
    const dpsObj: Record<string, any> = {}
    for (const [dpId, value] of Object.entries(dps)) {
      dpsObj[String(dpId)] = value // DP ID 转为字符串
    }
    return {
      msgId: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      deviceId,
      t: Math.floor(Date.now() / 1000),
      dps: dpsObj,
    }
  }

  /**
   * 验证 DP 值的类型和范围（私有方法）
   */
  private validateValue(dpDef: DpDefinition, value: any): string[] {
    const errors: string[] = []
    const { id, name, dataType, valueRange, enumValues } = dpDef

    switch (dataType) {
      case 'bool':
        if (typeof value !== 'boolean') {
          errors.push(`DP${id}(${name}) 应该是布尔类型`)
        }
        break

      case 'value':
        if (typeof value !== 'number') {
          errors.push(`DP${id}(${name}) 应该是数值类型`)
        } else if (valueRange) {
          if (value < valueRange.min || value > valueRange.max) {
            errors.push(`DP${id}(${name}) 值应在 ${valueRange.min}-${valueRange.max} 之间`)
          }
        }
        break

      case 'enum':
        if (!enumValues || !enumValues.includes(String(value))) {
          errors.push(`DP${id}(${name}) 值应为 [${enumValues?.join(', ')}] 之一`)
        }
        break
    }

    return errors
  }
}
