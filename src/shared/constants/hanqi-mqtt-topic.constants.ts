/**
 * 汉奇MQTT Topic定义（网关-子设备架构）
 *
 * 设计原则：
 * 1. 云端只和网关通信，不直接和子设备（Timer）通信
 * 2. 统一Topic，通过消息体的msgType区分数据类型
 * 3. 通过subDeviceId字段标识具体的子设备
 * 4. 便于网关扩展新类型子设备，无需云端迭代
 */

/**
 * MQTT消息类型枚举
 * 用于区分不同类型的数据
 */
export enum MqttMessageType {
  // ========== 网关自身的消息 ==========
  /** 网关状态上报 */
  GATEWAY_STATUS = 'gateway_status',

  /** 子设备列表上报（网关启动时/子设备变化时） */
  SUB_DEVICES = 'sub_devices',

  /** 查询子设备列表 */
  QUERY_SUB_DEVICES = 'query_sub_devices',

  /** 删除子设备 */
  REMOVE_SUB_DEVICE = 'remove_sub_device',

  // ========== 子设备的消息（通过网关转发） ==========
  /** DP点数据上报 */
  DP_REPORT = 'dp_report',

  /** DP点命令下发 */
  DP_COMMAND = 'dp_command',

  /** 设备信息上报 */
  DEVICE_INFO = 'device_info',

  /** 灌溉记录上报 */
  IRRIGATION_RECORD = 'irrigation_record',

  /** 定时任务同步 */
  SCHEDULE_SYNC = 'schedule_sync',

  /** 事件上报（告警、故障等） */
  EVENT_REPORT = 'event_report',

  /** 心跳 */
  HEARTBEAT = 'heartbeat',

  // ========== OTA相关 ==========
  /** OTA升级 */
  OTA_UPGRADE = 'ota_upgrade',

  /** OTA进度 */
  OTA_PROGRESS = 'ota_progress',
}

/**
 * 统一的MQTT消息格式（网关-子设备架构）
 */
export interface MqttUnifiedMessage<T = any> {
  /** 消息类型 */
  msgType: MqttMessageType | string

  /** 消息ID（可选，用于请求响应匹配） */
  msgId?: string

  /** 设备ID（网关ID） */
  deviceId: string

  /** 子设备ID（可选，如果是子设备的消息则必填） */
  subDeviceId?: string

  /** 时间戳（秒） */
  timestamp: number

  /** 消息数据 */
  data: T
}

/**
 * 子设备信息
 */
export interface SubDeviceInfo {
  /** 子设备ID */
  subDeviceId: string

  /** 设备类型（timer, sensor等） */
  deviceType: string

  /** 出水口数量（Timer特有） */
  outletCount?: number

  /** 是否在线 */
  online: boolean

  /** 电池电量 */
  battery?: number

  /** 信号强度（Zigbee/BLE信号） */
  signal?: number

  /** 固件版本 */
  firmware?: string
}

/**
 * 子设备列表数据
 */
export interface SubDevicesData {
  /** 子设备列表 */
  subDevices: SubDeviceInfo[]
}

/**
 * DP点上报数据
 */
export interface DpReportData {
  /** DP点数据对象 */
  dps: Record<string, any>
}

/**
 * 灌溉记录数据
 */
export interface IrrigationRecordData {
  /** 出水口编号 */
  outletNumber: number

  /** 开始时间 */
  startTime: string | Date

  /** 结束时间（可选） */
  endTime?: string | Date

  /** 运行时长（秒） */
  duration: number

  /** 用水量（升） */
  waterUsed?: number

  /** 触发类型 */
  triggerType: 'scheduled' | 'manual' | 'api' | 'sensor'

  /** 温度 */
  temperature?: number

  /** 天气状况 */
  weatherCondition?: string
}

/**
 * 定时任务数据
 */
export interface ScheduleData {
  /** 定时任务ID */
  scheduleId: string

  /** 出水口编号 */
  outletNumber: number

  /** 开始时间 (HH:mm) */
  startTime: string

  /** 运行时长（秒） */
  duration: number

  /** 重复天数（0-6，0为周日） */
  repeatDays?: number[]

  /** 是否启用 */
  isEnabled?: boolean

  /** 喷雾模式配置 */
  sprayMode?: {
    isEnabled: boolean
    ecoMode?: boolean
    sprayPattern?: 'continuous' | 'interval' | 'pulse'
    intervalOn?: number
    intervalOff?: number
  }
}

/**
 * 汉奇MQTT Topic（网关-子设备架构）
 *
 * 核心设计：
 * - 云端只和网关通信
 * - 所有子设备消息都通过网关转发
 * - 通过msgType和subDeviceId字段区分不同的设备和数据类型
 */
export class HanqiMqttTopic {
  // ========== 网关Topic ==========

  /**
   * 网关数据上报Topic（网关 -> 云端）
   * 网关自身状态和所有子设备数据都通过这个topic上报
   *
   * @param gatewayId 网关ID
   * @returns Topic字符串
   *
   * @example
   * HanqiMqttTopic.gatewayReport('gw_12345')
   * // 返回: 'hanqi/gateway/gw_12345/report'
   */
  static gatewayReport(gatewayId: string): string {
    return `hanqi/gateway/${gatewayId}/report`
  }

  /**
   * 网关命令Topic（云端 -> 网关）
   * 所有控制命令（包括给子设备的）都通过这个topic下发
   *
   * @param gatewayId 网关ID
   * @returns Topic字符串
   */
  static gatewayCommand(gatewayId: string): string {
    return `hanqi/gateway/${gatewayId}/command`
  }

  /**
   * 网关响应Topic（网关 -> 云端，可选）
   * 网关对命令的响应
   *
   * @param gatewayId 网关ID
   * @returns Topic字符串
   */
  static gatewayResponse(gatewayId: string): string {
    return `hanqi/gateway/${gatewayId}/response`
  }

  // ========== 特殊Topic（保留用于设备注册等） ==========

  /**
   * 设备加入Topic
   * 网关首次上线时使用
   */
  static deviceJoin(): string {
    return 'hanqi/device/join'
  }

  /**
   * 设备加入响应Topic
   */
  static deviceJoinResponse(mac: string): string {
    return `hanqi/device/${mac}/join/response`
  }

  /**
   * 设备断开Topic
   */
  static deviceDisconnect(): string {
    return 'hanqi/device/disconnect'
  }

  // ========== 订阅用（通配符Topic）==========

  /**
   * 订阅所有网关的数据上报（重要！云端只需要订阅这一个）
   * @returns 'hanqi/gateway/+/report'
   */
  static allGatewayReport(): string {
    return 'hanqi/gateway/+/report'
  }

  // ========== 工具方法 ==========

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
   * 判断Topic是否为网关上报
   * @param topic MQTT Topic
   */
  static isGatewayReport(topic: string): boolean {
    return topic.includes('/gateway/') && topic.endsWith('/report')
  }

  /**
   * 判断Topic是否为网关命令
   * @param topic MQTT Topic
   */
  static isGatewayCommand(topic: string): boolean {
    return topic.includes('/gateway/') && topic.endsWith('/command')
  }

  /**
   * 判断Topic是否为网关响应
   * @param topic MQTT Topic
   */
  static isGatewayResponse(topic: string): boolean {
    return topic.includes('/gateway/') && topic.endsWith('/response')
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
