/**
 * 汉奇Timer设备DP点定义
 * 参考涂鸦IoT平台的DP点标准设计
 */

/**
 * DP点类型枚举
 */

/**
 * DP点访问模式
 */
export enum DpMode {
  RW = 'rw', // 可读可写
  RO = 'ro', // 只读
  WO = 'wo', // 只写
}

/**
 * 汉奇Timer设备DP点ID定义
 *
 * DP点分类：
 * 1-20:    网关/Timer设备基础功能
 * 21-40:   出水口1控制
 * 41-60:   出水口2控制
 * 61-80:   出水口3控制
 * 81-100:  出水口4控制
 * 101-120: 定时任务相关
 * 121-140: 统计和记录
 */
export enum HanqiTimerDpId {
  // ========== 网关/Timer设备基础功能 (1-20) ==========

  /** DP1: 设备开关 (bool, rw) */
  DEVICE_SWITCH = 1,

  /** DP2: 设备在线状态 (bool, ro) */
  DEVICE_ONLINE = 2,

  /** DP3: 设备重启 (bool, wo) */
  DEVICE_RESET = 3,

  /** DP4: 电池电量百分比 (value, ro, 0-100) */
  BATTERY_LEVEL = 4,

  /** DP5: 信号强度 (value, ro, 0-100) */
  SIGNAL_STRENGTH = 5,

  /** DP6: 固件版本 (string, ro) */
  FIRMWARE_VERSION = 6,

  /** DP7: 出水口数量 (value, ro, 2-4) */
  OUTLET_COUNT = 7,

  /** DP8: 设备故障告警 (enum, ro) - 0:正常, 1:低电量, 2:水压异常, 3:传感器故障 */
  DEVICE_FAULT = 8,

  /** DP9: 经度 (string, rw) */
  LONGITUDE = 9,

  /** DP10: 纬度 (string, rw) */
  LATITUDE = 10,

  // ========== 出水口1控制 (21-40) ==========

  /** DP21: 出水口1开关 (bool, rw) */
  OUTLET_1_SWITCH = 21,

  /** DP22: 出水口1运行状态 (enum, ro) - 0:关闭, 1:运行中, 2:暂停, 3:故障 */
  OUTLET_1_STATUS = 22,

  /** DP23: 出水口1手动运行时长 (value, wo, 单位:秒, 0-7200) */
  OUTLET_1_MANUAL_DURATION = 23,

  /** DP24: 出水口1剩余运行时长 (value, ro, 单位:秒) */
  OUTLET_1_REMAINING_TIME = 24,

  /** DP25: 出水口1流速 (value, ro, 单位:升/分钟) */
  OUTLET_1_FLOW_RATE = 25,

  /** DP26: 出水口1水压 (value, ro, 单位:bar*10) */
  OUTLET_1_PRESSURE = 26,

  /** DP27: 出水口1累计用水量 (value, ro, 单位:升) */
  OUTLET_1_TOTAL_WATER = 27,

  /** DP28: 出水口1区域名称 (string, rw) */
  OUTLET_1_ZONE_NAME = 28,

  /** DP29: 出水口1启用状态 (bool, rw) */
  OUTLET_1_ENABLED = 29,

  // ========== 出水口2控制 (41-60) ==========

  /** DP41: 出水口2开关 (bool, rw) */
  OUTLET_2_SWITCH = 41,

  /** DP42: 出水口2运行状态 (enum, ro) */
  OUTLET_2_STATUS = 42,

  /** DP43: 出水口2手动运行时长 (value, wo, 单位:秒) */
  OUTLET_2_MANUAL_DURATION = 43,

  /** DP44: 出水口2剩余运行时长 (value, ro, 单位:秒) */
  OUTLET_2_REMAINING_TIME = 44,

  /** DP45: 出水口2流速 (value, ro, 单位:升/分钟) */
  OUTLET_2_FLOW_RATE = 45,

  /** DP46: 出水口2水压 (value, ro, 单位:bar*10) */
  OUTLET_2_PRESSURE = 46,

  /** DP47: 出水口2累计用水量 (value, ro, 单位:升) */
  OUTLET_2_TOTAL_WATER = 47,

  /** DP48: 出水口2区域名称 (string, rw) */
  OUTLET_2_ZONE_NAME = 48,

  /** DP49: 出水口2启用状态 (bool, rw) */
  OUTLET_2_ENABLED = 49,

  // ========== 出水口3控制 (61-80) ==========

  /** DP61: 出水口3开关 (bool, rw) */
  OUTLET_3_SWITCH = 61,

  /** DP62: 出水口3运行状态 (enum, ro) */
  OUTLET_3_STATUS = 62,

  /** DP63: 出水口3手动运行时长 (value, wo, 单位:秒) */
  OUTLET_3_MANUAL_DURATION = 63,

  /** DP64: 出水口3剩余运行时长 (value, ro, 单位:秒) */
  OUTLET_3_REMAINING_TIME = 64,

  /** DP65: 出水口3流速 (value, ro, 单位:升/分钟) */
  OUTLET_3_FLOW_RATE = 65,

  /** DP66: 出水口3水压 (value, ro, 单位:bar*10) */
  OUTLET_3_PRESSURE = 66,

  /** DP67: 出水口3累计用水量 (value, ro, 单位:升) */
  OUTLET_3_TOTAL_WATER = 67,

  /** DP68: 出水口3区域名称 (string, rw) */
  OUTLET_3_ZONE_NAME = 68,

  /** DP69: 出水口3启用状态 (bool, rw) */
  OUTLET_3_ENABLED = 69,

  // ========== 出水口4控制 (81-100) ==========

  /** DP81: 出水口4开关 (bool, rw) */
  OUTLET_4_SWITCH = 81,

  /** DP82: 出水口4运行状态 (enum, ro) */
  OUTLET_4_STATUS = 82,

  /** DP83: 出水口4手动运行时长 (value, wo, 单位:秒) */
  OUTLET_4_MANUAL_DURATION = 83,

  /** DP84: 出水口4剩余运行时长 (value, ro, 单位:秒) */
  OUTLET_4_REMAINING_TIME = 84,

  /** DP85: 出水口4流速 (value, ro, 单位:升/分钟) */
  OUTLET_4_FLOW_RATE = 85,

  /** DP86: 出水口4水压 (value, ro, 单位:bar*10) */
  OUTLET_4_PRESSURE = 86,

  /** DP87: 出水口4累计用水量 (value, ro, 单位:升) */
  OUTLET_4_TOTAL_WATER = 87,

  /** DP88: 出水口4区域名称 (string, rw) */
  OUTLET_4_ZONE_NAME = 88,

  /** DP89: 出水口4启用状态 (bool, rw) */
  OUTLET_4_ENABLED = 89,

  // ========== 定时任务相关 (101-120) ==========

  /** DP101: 定时任务数据 (raw, rw) - JSON格式的定时任务配置 */
  SCHEDULE_DATA = 101,

  /** DP102: 定时任务同步请求 (bool, wo) - 请求设备上报所有定时任务 */
  SCHEDULE_SYNC = 102,

  /** DP103: 定时任务冲突告警 (string, ro) - 任务ID列表 */
  SCHEDULE_CONFLICT = 103,
}

/**
 * DP点配置接口
 */
export interface DpConfig {
  /** DP点ID */
  id: number
  /** DP点名称 */
  name: string
  /** DP点类型 */
  type: DpType
  /** 访问模式 */
  mode: DpMode
  /** 描述 */
  desc: string
  /** 最小值（仅value类型） */
  min?: number
  /** 最大值（仅value类型） */
  max?: number
  /** 步长（仅value类型） */
  step?: number
  /** 单位（仅value类型） */
  unit?: string
  /** 枚举值映射（仅enum类型） */
  range?: Record<string, string>
  /** 最大长度（仅string类型） */
  maxLen?: number
}

/**
 * DP点数据格式
 */
export interface DpData {
  /** DP点ID */
  dpId: number
  /** DP点值 */
  value: boolean | number | string | object
  /** 时间戳（毫秒） */
  timestamp?: number
}

export enum DpType {
  BOOL = 'bool', // 布尔型
  VALUE = 'value', // 数值型
  ENUM = 'enum', // 枚举型
  STRING = 'string', // 字符串型
  RAW = 'raw', // 透传型
}

export interface DpCommand {
  dpId: string // DP点ID
  value: boolean | number | string | object
  type: DpType // 使用DpType枚举
}

/**
 * MQTT DP点消息格式
 */
export interface DpMessage {
  /** 消息ID */
  msgId?: string
  /** 设备ID */
  deviceId: string
  /** 时间戳（秒） */
  t?: number
  /** DP点数据 */
  dps: DpCommand[] | Record<string, any>
}

/**
 * 汉奇Timer设备完整DP点配置
 */
export const HANQI_TIMER_DP_CONFIG: Record<number, DpConfig> = {
  // 基础功能
  [HanqiTimerDpId.DEVICE_SWITCH]: {
    id: 1,
    name: 'device_switch',
    type: DpType.BOOL,
    mode: DpMode.RW,
    desc: '设备总开关',
  },
  [HanqiTimerDpId.DEVICE_ONLINE]: {
    id: 2,
    name: 'device_online',
    type: DpType.BOOL,
    mode: DpMode.RO,
    desc: '设备在线状态',
  },
  [HanqiTimerDpId.BATTERY_LEVEL]: {
    id: 4,
    name: 'battery_level',
    type: DpType.VALUE,
    mode: DpMode.RO,
    desc: '电池电量百分比',
    min: 0,
    max: 100,
    unit: '%',
  },
  [HanqiTimerDpId.OUTLET_COUNT]: {
    id: 7,
    name: 'outlet_count',
    type: DpType.VALUE,
    mode: DpMode.RO,
    desc: '出水口数量',
    min: 2,
    max: 4,
  },
  [HanqiTimerDpId.DEVICE_FAULT]: {
    id: 8,
    name: 'device_fault',
    type: DpType.ENUM,
    mode: DpMode.RO,
    desc: '设备故障告警',
    range: {
      '0': '正常',
      '1': '低电量',
      '2': '水压异常',
      '3': '传感器故障',
    },
  },
  // 出水口1
  [HanqiTimerDpId.OUTLET_1_SWITCH]: {
    id: 21,
    name: 'outlet_1_switch',
    type: DpType.BOOL,
    mode: DpMode.RW,
    desc: '出水口1开关',
  },
  [HanqiTimerDpId.OUTLET_1_STATUS]: {
    id: 22,
    name: 'outlet_1_status',
    type: DpType.ENUM,
    mode: DpMode.RO,
    desc: '出水口1运行状态',
    range: {
      '0': '关闭',
      '1': '运行中',
      '2': '暂停',
      '3': '故障',
    },
  },
  [HanqiTimerDpId.OUTLET_1_MANUAL_DURATION]: {
    id: 23,
    name: 'outlet_1_manual_duration',
    type: DpType.VALUE,
    mode: DpMode.WO,
    desc: '出水口1手动运行时长',
    min: 0,
    max: 7200,
    unit: '秒',
  },
  [HanqiTimerDpId.OUTLET_1_ZONE_NAME]: {
    id: 28,
    name: 'outlet_1_zone_name',
    type: DpType.STRING,
    mode: DpMode.RW,
    desc: '出水口1区域名称',
    maxLen: 50,
  },

  [HanqiTimerDpId.OUTLET_2_SWITCH]: {
    id: 41,
    name: 'outlet_2_zone_name',
    type: DpType.STRING,
    mode: DpMode.RW,
    desc: '出水口2区域名称',
    maxLen: 50,
  },
  // ... 其他出水口类似配置(目前省略了出水口3、4)
  // 定时任务
  [HanqiTimerDpId.SCHEDULE_DATA]: {
    id: 101,
    name: 'schedule_data',
    type: DpType.RAW,
    mode: DpMode.RW,
    desc: '定时任务数据（JSON格式）',
  },
}

/**
 * DP类型到数字的映射（用于命令下发）
 */
export const DP_TYPE_TO_NUMBER: Record<DpType, number> = {
  [DpType.BOOL]: 1,
  [DpType.VALUE]: 2,
  [DpType.ENUM]: 3,
  [DpType.STRING]: 4,
  [DpType.RAW]: 5,
}

/**
 * 数字到DP类型的映射（用于解析）
 */
export const NUMBER_TO_DP_TYPE: Record<number, DpType> = {
  1: DpType.BOOL,
  2: DpType.VALUE,
  3: DpType.ENUM,
  4: DpType.STRING,
  5: DpType.RAW,
}

/**
 * 获取出水口特定功能的DP点ID
 * @param outletNumber 出水口编号 (1-4)
 * @param dpOffset DP点偏移量 (0-19)
 * @returns DP点ID
 */
export function getOutletDpId(outletNumber: number, dpOffset: number): number {
  const base = [0, 21, 41, 61, 81][outletNumber] ?? 0
  return base + dpOffset
}
