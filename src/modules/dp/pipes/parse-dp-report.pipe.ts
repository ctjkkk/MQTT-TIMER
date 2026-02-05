import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException, Logger } from '@nestjs/common'
import { plainToClass } from 'class-transformer'
import { validate } from 'class-validator'
import { DpReportDto } from '../dto/dp-report.dto'
import { DpConfigService } from '../dp.service'
import { DpDataType } from '../types/dp.types'

/**
 * 解析后的 DP 数据结构
 */
export interface ParsedDpReport {
  dps: Array<{
    dpId: number // DP ID
    code: string // DP 标识符（如：'switch_1'）
    name: string // DP 名称（如：'区域 A'）
    value: any // DP 值
    formattedValue: string // 格式化后的值（用于显示）
    valid: boolean // 验证是否通过
    errors?: string[] // 验证错误信息
  }>
  validCount: number // 有效 DP 数量
  invalidCount: number // 无效 DP 数量
  deviceId: string
  productId: string
  timestamp: number
}

/**
 * DP 上报解析管道
 *
 * 功能：
 * 1. 解析 MQTT Buffer 为 JSON
 * 2. 验证消息格式
 * 3. 解析 dps 字段
 * 4. 验证每个 DP 点的合法性
 *
 * 使用方式：
 * @OnEvent('mqtt.device.report')
 * async handleReport(event) {
 *   const report = await this.parseDpReportPipe.transform(event.payload, metadata)
 *   // 使用 report.dps
 * }
 */
@Injectable()
export class ParseDpReportPipe implements PipeTransform<Buffer | string, Promise<ParsedDpReport>> {
  private readonly logger = new Logger(ParseDpReportPipe.name)

  constructor(private readonly dpConfigService: DpConfigService) {}

  /**
   * 管道转换方法
   *
   * @param value - MQTT 消息（Buffer 或 String）
   * @returns 解析后的 DP 数据
   * @throws BadRequestException 如果消息格式错误
   */
  async transform(value: Buffer | string, metadata: ArgumentMetadata): Promise<ParsedDpReport> {
    // 1. 解析 JSON
    const json = this.parseJson(value)
    if (!json) {
      throw new BadRequestException('无法解析 MQTT 消息')
    }

    // 2. 验证 DTO 格式
    const dto = plainToClass(DpReportDto, json)
    const errors = await validate(dto)
    if (errors.length > 0) {
      throw new BadRequestException('MQTT 消息格式错误')
    }

    // 3. 检查 productId
    if (!dto.productId) {
      throw new BadRequestException('缺少 productId')
    }

    // 4. 解析和验证每个 DP 点
    const dpsArray = this.extractDpsArray(dto.dps)
    const parsedDps = dpsArray.map(({ dpId, value }) => this.validateDp(dto.productId!, dpId, value))
    // 5. 统计有效/无效数量
    const validCount = parsedDps.filter(dp => dp.valid).length
    return {
      dps: parsedDps,
      validCount,
      invalidCount: parsedDps.length - validCount,
      deviceId: dto.deviceId,
      productId: dto.productId,
      timestamp: dto.t ? dto.t * 1000 : Date.now(),
    }
  }

  /**
   * 解析 JSON（私有方法）
   */
  private parseJson(payload: Buffer | string): any {
    try {
      const data = typeof payload === 'string' ? payload : payload.toString('utf-8')
      return JSON.parse(data)
    } catch {
      return null
    }
  }

  /**
   * 提取 dps 数组（私有方法）
   * 支持两种格式：
   * 1. 对象格式: { "1": true, "17": 300 }
   * 2. 数组格式: [{ dpId: 1, value: true }]
   */
  private extractDpsArray(dps: any): Array<{ dpId: number; value: any }> {
    if (!dps) return []
    // 对象格式
    if (typeof dps === 'object' && !Array.isArray(dps)) {
      return Object.entries(dps).map(([dpId, value]) => ({ dpId: Number(dpId), value }))
    }
    // 数组格式
    if (Array.isArray(dps)) {
      return dps.map(item => ({ dpId: Number(item.dpId), value: item.value }))
    }
    return []
  }

  /**
   * 验证单个 DP 点（私有方法）
   */
  private validateDp(productId: string, dpId: number, value: any) {
    // 获取 DP 定义
    const dpDef = this.dpConfigService.getDpDefinition(productId, dpId)
    // DP 不存在
    if (!dpDef) {
      return {
        dpId,
        code: `unknown_${dpId}`,
        name: `未知DP${dpId}`,
        value,
        formattedValue: String(value),
        valid: false,
        errors: [`DP${dpId} 不存在`],
      }
    }

    // 验证值的类型和范围
    const errors = this.validateValue(dpDef, value)

    return {
      dpId,
      code: dpDef.code,
      name: dpDef.name,
      value,
      formattedValue: this.formatValue(dpDef, value),
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    }
  }

  /**
   * 验证 DP 值（私有方法）
   */
  private validateValue(dpDef: any, value: any): string[] {
    const errors: string[] = []
    const { id, name, dataType, valueRange, enumValues } = dpDef

    switch (dataType) {
      case DpDataType.BOOLEAN:
        if (typeof value !== 'boolean') {
          errors.push(`DP${id}(${name}) 应该是布尔类型`)
        }
        break
      case DpDataType.VALUE:
        if (typeof value !== 'number') {
          errors.push(`DP${id}(${name}) 应该是数值类型`)
        } else if (valueRange) {
          if (value < valueRange.min || value > valueRange.max) {
            errors.push(`DP${id}(${name}) 值应在 ${valueRange.min}-${valueRange.max} 之间`)
          }
        }
        break
      case DpDataType.ENUM:
        if (!enumValues || !enumValues.includes(String(value))) {
          errors.push(`DP${id}(${name}) 值应为 [${enumValues?.join(', ')}] 之一`)
        }
        break
    }

    return errors
  }

  /**
   * 格式化 DP 值（私有方法）
   *
   * 将 DP 值转换为易读的字符串
   */
  private formatValue(dpDef: any, value: any): string {
    const { dataType, valueRange } = dpDef
    switch (dataType) {
      case DpDataType.BOOLEAN:
        return value ? '开' : '关'
      case DpDataType.VALUE:
        return valueRange?.unit ? `${value}${valueRange.unit}` : String(value)
      default:
        return String(value)
    }
  }
}
