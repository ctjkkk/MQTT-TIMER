import { Injectable } from '@nestjs/common'
import {
  DpCommand,
  DpData,
  DpMessage,
  DpType,
  HANQI_TIMER_DP_CONFIG,
  HanqiTimerDpId,
  getOutletDpId,
} from '@/shared/constants/dp.constants'
import { LoggerService } from '@/core/logger/logger.service'

/**
 * DP点处理服务
 * 负责DP点数据的解析、验证和转换
 */
@Injectable()
export class DpService {
  constructor(private readonly logger: LoggerService) {}

  /**
   * 解析MQTT消息中的DP点数据
   * @param payload MQTT消息负载
   * @returns DP消息对象
   */
  parseDpMessage(payload: Buffer | string): DpMessage | null {
    try {
      const data = typeof payload === 'string' ? payload : payload.toString()
      const message = JSON.parse(data) as DpMessage

      if (!message.dps) {
        this.logger.warn('Invalid DP message format: missing dps field')
        return null
      }
      // 兼容处理：如果是对象格式，转换为数组格式
      if (!Array.isArray(message.dps)) {
        this.logger.debug('Converting old DP format to new format')
        const dpsArray: DpCommand[] = []
        Object.entries(message.dps).forEach(([dpId, value]) => {
          const config = this.getDpConfig(Number(dpId))
          dpsArray.push({
            dpId,
            value,
            type: config?.type || DpType.RAW,
          })
        })

        message.dps = dpsArray
      }

      return message
    } catch (error) {
      this.logger.error('Failed to parse DP message', error)
      return null
    }
  }

  /**
   * 构建DP点消息
   * @param deviceId 设备ID
   * @param dpData DP点数据数组
   * @returns DP消息对象
   */
  buildDpMessage(deviceId: string, dpData: DpData[]): DpMessage {
    const dps: DpCommand[] = []
    dpData.forEach(dp => {
      const config = this.getDpConfig(dp.dpId)
      if (!config) {
        this.logger.warn(`Unknown DP ID: ${dp.dpId}`)
        return
      }

      dps.push({
        dpId: dp.dpId.toString(),
        value: dp.value,
        type: config.type, // 从配置中获取type
      })
    })

    return {
      msgId: this.generateMessageId(),
      deviceId,
      t: Math.floor(Date.now() / 1000),
      dps,
    }
  }

  /**
   * 验证DP点数据
   * @param dpId DP点ID
   * @param value DP点值
   * @returns 验证是否通过
   */
  validateDpValue(dpId: number, value: any): boolean {
    const config = HANQI_TIMER_DP_CONFIG[dpId]
    if (!config) {
      this.logger.warn(`Unknown DP ID: ${dpId}`)
      return false
    }

    switch (config.type) {
      case DpType.BOOL:
        return typeof value === 'boolean'

      case DpType.VALUE:
        if (typeof value !== 'number') return false
        if (config.min !== undefined && value < config.min) return false
        if (config.max !== undefined && value > config.max) return false
        return true

      case DpType.ENUM:
        if (typeof value !== 'string' && typeof value !== 'number') return false
        return config.range ? String(value) in config.range : true

      case DpType.STRING:
        if (typeof value !== 'string') return false
        return config.maxLen ? value.length <= config.maxLen : true

      case DpType.RAW:
        return true // RAW类型不做验证

      default:
        return false
    }
  }

  /**
   * 从DP消息中提取指定DP点的值
   * @param message DP消息
   * @param dpId DP点ID
   * @returns DP点值，如果不存在则返回undefined
   */
  getDpValue<T = any>(message: DpMessage, dpId: number): T | undefined {
    // 处理数组格式
    if (Array.isArray(message.dps)) {
      const dp = message.dps.find(d => d.dpId === dpId.toString())
      return dp?.value as T
    }

    // 处理对象格式
    return message.dps[dpId.toString()] as T
  }

  /**
   * 从DP消息中提取出水口数据
   * @param message DP消息
   * @param outletNumber 出水口编号 (1-4)
   * @returns 出水口数据对象
   */
  getOutletData(message: DpMessage, outletNumber: number) {
    const baseDpId = getOutletDpId(outletNumber, 0)

    return {
      switch: this.getDpValue<boolean>(message, baseDpId),
      status: this.getDpValue<number>(message, baseDpId + 1),
      manualDuration: this.getDpValue<number>(message, baseDpId + 2),
      remainingTime: this.getDpValue<number>(message, baseDpId + 3),
      flowRate: this.getDpValue<number>(message, baseDpId + 4),
      pressure: this.getDpValue<number>(message, baseDpId + 5),
      totalWater: this.getDpValue<number>(message, baseDpId + 6),
      zoneName: this.getDpValue<string>(message, baseDpId + 7),
      enabled: this.getDpValue<boolean>(message, baseDpId + 8),
    }
  }

  /**
   * 构建出水口控制指令
   * @param outletNumber 出水口编号 (1-4)
   * @param switch_ 开关状态
   * @param duration 运行时长（秒）
   * @returns DP点数据数组
   */
  buildOutletControlCommand(outletNumber: number, switch_: boolean, duration?: number): DpData[] {
    const baseDpId = getOutletDpId(outletNumber, 0)
    const dpData: DpData[] = [
      {
        dpId: baseDpId,
        value: switch_,
        timestamp: Date.now(),
      },
    ]

    if (duration !== undefined && duration > 0) {
      dpData.push({
        dpId: baseDpId + 2, // manual_duration
        value: duration,
        timestamp: Date.now(),
      })
    }

    return dpData
  }

  /**
   * 构建定时任务数据
   * @param scheduleConfig 定时任务配置
   * @returns DP点数据
   */
  buildScheduleData(scheduleConfig: any): DpData {
    return {
      dpId: HanqiTimerDpId.SCHEDULE_DATA,
      value: scheduleConfig,
      timestamp: Date.now(),
    }
  }

  /**
   * 批量设置DP点值
   * @param message 原始消息
   * @param updates DP点更新数据
   * @returns 更新后的消息
   */
  updateDpValues(message: DpMessage, updates: Record<number, any>): DpMessage {
    const newDps = { ...message.dps }

    Object.entries(updates).forEach(([dpId, value]) => {
      if (this.validateDpValue(Number(dpId), value)) {
        newDps[dpId] = value
      } else {
        this.logger.warn(`Invalid DP value for DP${dpId}: ${value}`)
      }
    })

    return {
      ...message,
      dps: newDps,
      t: Math.floor(Date.now() / 1000),
    }
  }

  /**
   * 生成消息ID
   * @returns 消息ID
   */
  private generateMessageId(): string {
    return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }

  /**
   * 获取DP点配置信息
   * @param dpId DP点ID
   * @returns DP点配置
   */
  getDpConfig(dpId: number) {
    return HANQI_TIMER_DP_CONFIG[dpId]
  }

  /**
   * 获取所有DP点配置
   * @returns DP点配置列表
   */
  getAllDpConfigs() {
    return HANQI_TIMER_DP_CONFIG
  }

  /**
   * 检查DP点是否可读
   * @param dpId DP点ID
   * @returns 是否可读
   */
  isDpReadable(dpId: number): boolean {
    const config = HANQI_TIMER_DP_CONFIG[dpId]
    return config ? config.mode === 'ro' || config.mode === 'rw' : false
  }

  /**
   * 检查DP点是否可写
   * @param dpId DP点ID
   * @returns 是否可写
   */
  isDpWritable(dpId: number): boolean {
    const config = HANQI_TIMER_DP_CONFIG[dpId]
    return config ? config.mode === 'wo' || config.mode === 'rw' : false
  }

  /**
   * 格式化DP点值用于显示
   * @param dpId DP点ID
   * @param value DP点值
   * @returns 格式化后的字符串
   */
  formatDpValue(dpId: number, value: any): string {
    const config = HANQI_TIMER_DP_CONFIG[dpId]
    if (!config) return String(value)

    switch (config.type) {
      case DpType.BOOL:
        return value ? '开' : '关'

      case DpType.VALUE:
        return config.unit ? `${value}${config.unit}` : String(value)

      case DpType.ENUM:
        return config.range?.[String(value)] || String(value)

      case DpType.STRING:
        return String(value)

      case DpType.RAW:
        return typeof value === 'object' ? JSON.stringify(value) : String(value)

      default:
        return String(value)
    }
  }
}
