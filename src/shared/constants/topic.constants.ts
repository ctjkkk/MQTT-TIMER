// Payload 传输格式
export enum MqttMessageType {
  DEVICE_STATUS = 'device_status',

  // 设备列表同步/添加/删除 (双向)
  OPERATE_DEVICE = 'operate_devices',

  /** DP点数据上报 */
  DP_REPORT = 'dp_report',

  /** DP点命令下发 */
  DP_COMMAND = 'dp_command',

  /** 事件上报（告警、故障等） */
  EVENT_REPORT = 'event_report',

  /** 心跳 */
  HEARTBEAT = 'heartbeat',

  /** 心跳响应（服务端 -> 设备） */
  HEARTBEAT_ACK = 'heartbeat_ack',
}

//区分设备的类型
export enum EntityType {
  /** 网关 */
  GATEWAY = 'gateway',

  /** 子设备 */
  SUBDEVICE = 'subDevice',
}

// 设备生命周期action
export enum OperateAction {
  // ========== 网关操作 ==========
  /** 注册网关（首次加入） */
  GATEWAY_REGISTER = 'gateway_register',

  /** 注销网关 */
  GATEWAY_UNREGISTER = 'gateway_unregister',

  /** 更新网关信息 */
  GATEWAY_UPDATE = 'gateway_update',

  /** 重启网关 */
  GATEWAY_REBOOT = 'gateway_reboot',

  /** 网关固件升级 */
  GATEWAY_UPGRADE = 'gateway_upgrade',

  /** 重置网关 */
  GATEWAY_RESET = 'gateway_reset',

  /** 网关开始配对子设备 */
  START_PAIRING = 'start_pairing',

  /** 网关停止配对子设备 */
  STOP_PAIRING = 'stop_pairing',

  // ========== 子设备操作 ==========
  /** 添加子设备 */
  SUBDEVICE_ADD = 'subdevice_add',

  /** 删除子设备 */
  SUBDEVICE_DELETE = 'subdevice_delete',

  /** 更新子设备信息 */
  SUBDEVICE_UPDATE = 'subdevice_update',
}
/**
 * 统一的MQTT消息格式（网关-子设备架构）
 */
export interface MqttUnifiedMessage<T = any> {
  /** 消息类型 */
  msgType: MqttMessageType | string

  /** 消息ID（可选，用于请求响应匹配） */
  msgId?: string

  /** 设备唯一识别码（网关ID或子设备ID） */
  uuid: string

  /** 可选，若是操作子设备则添加该字段 */
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
  deviceType: number

  /** 0为正常功耗，1为低功耗 */
  capabilities: number

  /** 产品ID（涂鸦云平台生成的产品标识符） */
  productId: string

  /** 固件版本: ota流程需要 */
  firmwareVersion: string

  /** 是否在线 */
  online: boolean

  /** 子设备私有数据，包括子设备key等信息，不允许丢失，需要在云端备份 */
  private: string
}

/**
 * DP点上报数据
 */
export interface DpReportData {
  /** DP点数据对象 */
  dps: Record<string, any>
}

/**
 * 汉奇MQTT Topic（网关-子设备架构）
 *
 * 核心设计：
 * - 云端只和网关通信
 * - 所有子设备消息都通过网关转发
 * - 通过msgType和subDeviceId字段区分不同的设备和数据类型
 */
export class MqttTopic {
  /**
   * 网关数据上报Topic（网关 -> 云端）
   * 网关自身状态和所有子设备数据都通过这个topic上报
   * @param gatewayId 网关ID
   * @returns Topic字符串
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
   * 订阅所有网关的数据上报（重要！云端只需要订阅这一个）
   * @returns 'hanqi/gateway/+/report'
   */
  static allGatewayReport(): string {
    return 'hanqi/gateway/+/report'
  }

  static allGatewayOtaReport(): string {
    return 'hanqi/gateway/+/ota/report'
  }

  static gatewayOtaCommand(gatewayId: string) {
    return `hanqi/gateway/${gatewayId}/ota/upgrade`
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
