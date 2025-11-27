/**
 * 汉奇MQTT Topic定义（简化版）
 *
 * 设计原则：
 * 1. 统一Topic，通过消息体的msgType区分数据类型
 * 2. 便于网关扩展新类型子设备，无需云端迭代
 * 3. 参考涂鸦IoT平台和MQTT最佳实践
 */

/**
 * MQTT消息类型枚举
 * 用于区分不同类型的数据
 */
export enum MqttMessageType {
  /** DP点数据上报 */
  DP_REPORT = 'dp_report',

  /** DP点命令下发 */
  DP_COMMAND = 'dp_command',

  /** 设备状态上报 */
  DEVICE_STATUS = 'device_status',

  /** 定时任务同步 */
  SCHEDULE_SYNC = 'schedule_sync',

  /** 设备信息上报 */
  DEVICE_INFO = 'device_info',

  /** 子设备列表上报（网关） */
  SUB_DEVICES = 'sub_devices',

  /** OTA升级 */
  OTA_UPGRADE = 'ota_upgrade',

  /** OTA进度 */
  OTA_PROGRESS = 'ota_progress',

  /** 事件上报（告警、故障等） */
  EVENT_REPORT = 'event_report',

  /** 心跳 */
  HEARTBEAT = 'heartbeat',
}

/**
 * 统一的MQTT消息格式
 */
export interface MqttUnifiedMessage<T = any> {
  /** 消息类型 */
  msgType: MqttMessageType | string

  /** 消息ID（可选） */
  msgId?: string

  /** 设备ID */
  deviceId: string

  /** 时间戳（秒） */
  timestamp: number

  /** 消息数据 */
  data: T
}

/**
 * 汉奇MQTT Topic（简化版）
 *
 * 核心设计：
 * - 设备只需要3个固定Topic：report、command、status
 * - 通过msgType字段区分不同的数据类型
 * - 新增子设备类型无需修改Topic结构
 */
export class HanqiMqttTopic {
  /**
   * 设备数据上报Topic（设备 -> 云端）
   * 所有类型的数据都通过这个topic上报
   *
   * @param deviceId 设备ID
   * @returns Topic字符串
   *
   * @example
   * HanqiMqttTopic.deviceReport('timer_001')
   * // 返回: 'hanqi/device/timer_001/report'
   */
  static deviceReport(deviceId: string): string {
    return `hanqi/device/${deviceId}/report`
  }

  /**
   * 设备命令Topic（云端 -> 设备）
   * 所有类型的命令都通过这个topic下发
   *
   * @param deviceId 设备ID
   * @returns Topic字符串
   */
  static deviceCommand(deviceId: string): string {
    return `hanqi/device/${deviceId}/command`
  }

  /**
   * 设备状态Topic（双向）
   * 用于设备状态查询和上报
   *
   * @param deviceId 设备ID
   * @returns Topic字符串
   */
  static deviceStatus(deviceId: string): string {
    return `hanqi/device/${deviceId}/status`
  }

  /**
   * 网关数据上报Topic（网关 -> 云端）
   *
   * @param gatewayId 网关ID
   * @returns Topic字符串
   */
  static gatewayReport(gatewayId: string): string {
    return `hanqi/gateway/${gatewayId}/report`
  }

  /**
   * 网关命令Topic（云端 -> 网关）
   *
   * @param gatewayId 网关ID
   * @returns Topic字符串
   */
  static gatewayCommand(gatewayId: string): string {
    return `hanqi/gateway/${gatewayId}/command`
  }

  // ========== 订阅用（通配符Topic）==========

  /**
   * 订阅所有设备的数据上报
   * @returns 'hanqi/device/+/report'
   */
  static allDeviceReport(): string {
    return 'hanqi/device/+/report'
  }

  /**
   * 订阅所有设备的状态
   * @returns 'hanqi/device/+/status'
   */
  static allDeviceStatus(): string {
    return 'hanqi/device/+/status'
  }

  /**
   * 订阅所有网关的数据上报
   * @returns 'hanqi/gateway/+/report'
   */
  static allGatewayReport(): string {
    return 'hanqi/gateway/+/report'
  }

  // ========== 工具方法 ==========

  /**
   * 从Topic中解析设备ID
   * @param topic MQTT Topic
   * @returns 设备ID，如果解析失败返回null
   */
  static parseDeviceId(topic: string): string | null {
    const match = topic.match(/hanqi\/device\/([^/]+)/)
    return match ? match[1] : null
  }

  /**
   * 从Topic中解析网关ID
   * @param topic MQTT Topic
   * @returns 网关ID，如果解析失败返回null
   */
  static parseGatewayId(topic: string): string | null {
    const match = topic.match(/hanqi\/gateway\/([^/]+)/)
    return match ? match[1] : null
  }

  /**
   * 判断Topic是否为设备上报
   * @param topic MQTT Topic
   */
  static isDeviceReport(topic: string): boolean {
    return topic.includes('/device/') && topic.endsWith('/report')
  }

  /**
   * 判断Topic是否为设备命令
   * @param topic MQTT Topic
   */
  static isDeviceCommand(topic: string): boolean {
    return topic.includes('/device/') && topic.endsWith('/command')
  }

  /**
   * 判断Topic是否为网关上报
   * @param topic MQTT Topic
   */
  static isGatewayReport(topic: string): boolean {
    return topic.includes('/gateway/') && topic.endsWith('/report')
  }
}

/**
 * MQTT QoS等级
 */
export enum MqttQos {
  /** 最多一次 */
  AT_MOST_ONCE = 0,
  /** 至少一次 */
  AT_LEAST_ONCE = 1,
  /** 恰好一次 */
  EXACTLY_ONCE = 2,
}

/**
 * MQTT消息配置
 */
export const MQTT_MESSAGE_CONFIG = {
  /** 默认QoS等级 */
  DEFAULT_QOS: MqttQos.AT_LEAST_ONCE,
  /** 状态消息QoS */
  STATUS_QOS: MqttQos.AT_LEAST_ONCE,
  /** 控制命令QoS */
  COMMAND_QOS: MqttQos.AT_LEAST_ONCE,
  /** 数据上报QoS */
  REPORT_QOS: MqttQos.AT_MOST_ONCE,
  /** 消息保留 */
  RETAIN: false,
} as const

// ========== 消息构建辅助函数 ==========

/**
 * 构建统一的MQTT消息
 */
export function buildMqttMessage<T = any>(msgType: MqttMessageType | string, deviceId: string, data: T): MqttUnifiedMessage<T> {
  return {
    msgType,
    msgId: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    deviceId,
    timestamp: Math.floor(Date.now() / 1000),
    data,
  }
}

/**
 * 解析统一的MQTT消息
 */
export function parseMqttMessage<T = any>(payload: Buffer | string): MqttUnifiedMessage<T> | null {
  try {
    const str = typeof payload === 'string' ? payload : payload.toString()
    return JSON.parse(str) as MqttUnifiedMessage<T>
  } catch (error) {
    console.error('Failed to parse MQTT message:', error)
    return null
  }
}
