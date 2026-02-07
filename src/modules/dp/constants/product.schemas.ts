/**
 * 涂鸦 DP Schema 配置
 * 参考文档：docs/HQ2026-*路433水阀(xxx).txt
 *
 * 说明：
 * - 每个产品型号有独立的 DP 配置
 * - DP ID 由涂鸦平台定义，不连续（1-4, 17-20, 38-39, 42-45, 47, 53, 105-134）
 * - 路数越多，DP 点越多（1路17个，2路24个，3路31个，4路38个）
 */

import { DpAccessMode, DpDataType, ProductDpSchema, ProductDpSchemaMap } from '../types/dp.types'

// 通用 DP 点（所有产品都有）
const COMMON_DPS = [
  // 天气相关（所有产品共享）
  {
    id: 42,
    code: 'remaining_weather_delay',
    name: '剩余天气延时时间',
    accessMode: DpAccessMode.READ_ONLY,
    dataType: DpDataType.VALUE,
    valueRange: { min: 0, max: 240, step: 1, scale: 0, unit: 'h' },
  },
  {
    id: 43,
    code: 'weather_switch',
    name: '天气开关',
    accessMode: DpAccessMode.READ_WRITE,
    dataType: DpDataType.BOOLEAN,
  },
  {
    id: 44,
    code: 'smart_weather',
    name: '智能天气',
    accessMode: DpAccessMode.READ_WRITE,
    dataType: DpDataType.ENUM,
    enumValues: ['sunny', 'rainy'],
  },
  {
    id: 45,
    code: 'weather_delay',
    name: '雨天延时',
    accessMode: DpAccessMode.READ_WRITE,
    dataType: DpDataType.ENUM,
    enumValues: ['1', '2', '3', '4', '5', '6', '7', 'cancel'],
    description: '1-7表示延时天数，cancel表示取消延时',
  },

  // 系统状态（所有产品共享）
  {
    id: 47,
    code: 'battery_state',
    name: '电池电量状态',
    accessMode: DpAccessMode.READ_ONLY,
    dataType: DpDataType.ENUM,
    enumValues: ['6', '5', '4', '3', '2', '1', '0'],
    description: '6=3.05V, 5=2.95V, 4=2.85V, 3=2.75V, 2=2.65V, 1=2.60V, 0=低于2.60V',
  },
  {
    id: 53,
    code: 'fault',
    name: '故障告警',
    accessMode: DpAccessMode.READ_ONLY,
    dataType: DpDataType.FAULT,
    faultValues: ['low_battery', 'fault_1', 'fault_2', 'fault_3'],
  },
  {
    id: 117,
    code: 'signal_boost_switch',
    name: '信号放大',
    accessMode: DpAccessMode.READ_WRITE,
    dataType: DpDataType.BOOLEAN,
  },
  {
    id: 118,
    code: 'signal_strength',
    name: '信号强度',
    accessMode: DpAccessMode.READ_ONLY,
    dataType: DpDataType.VALUE,
    valueRange: { min: -255, max: 255, step: 1, scale: 0, unit: '' },
  },
  {
    id: 123,
    code: 'upgrade_status',
    name: '升级状态',
    accessMode: DpAccessMode.READ_ONLY,
    dataType: DpDataType.ENUM,
    enumValues: ['upgrade_complete', 'upgrade_begin'],
  },

  // 喷雾定时（所有产品共享）
  {
    id: 39,
    code: 'cycle_timing',
    name: '喷雾定时',
    accessMode: DpAccessMode.READ_WRITE,
    dataType: DpDataType.RAW,
    description: '自定义协议',
  },
]

// 生成单个通道的 DP 点（工厂函数）
function createChannelDps(channelNum: number) {
  return [
    {
      id: channelNum, // DP1-4
      code: `switch_${channelNum}`,
      name: `区域 ${String.fromCharCode(64 + channelNum)}`, // A, B, C, D
      accessMode: DpAccessMode.READ_WRITE,
      dataType: DpDataType.BOOLEAN,
    },
    {
      id: 16 + channelNum, // DP17-20
      code: `countdown_${channelNum}`,
      name: `设置通道${channelNum}灌溉时长`,
      accessMode: DpAccessMode.READ_WRITE,
      dataType: DpDataType.VALUE,
      valueRange: {
        min: 0,
        max: 43200,
        step: 1,
        scale: 0,
        unit: channelNum === 4 ? 'min' : 's', // 注意：DP20 单位是 min！
      },
    },
    {
      id: 104 + channelNum, // DP105-108
      code: `running_countdown_${channelNum}`,
      name: `通道${channelNum}运行剩余倒计时`,
      accessMode: DpAccessMode.READ_ONLY,
      dataType: DpDataType.VALUE,
      valueRange: { min: 0, max: 43200, step: 1, scale: 0, unit: '' },
    },
    {
      id: 108 + channelNum, // DP109-112
      code: `irr_timestamp_next${channelNum}`,
      name: `通道${channelNum}下次定时`,
      accessMode: DpAccessMode.READ_ONLY,
      dataType: DpDataType.RAW,
    },
    {
      id: 118 + channelNum, // DP119-122
      code: `work_state_${channelNum}`,
      name: `通道${channelNum}工作状态`,
      accessMode: DpAccessMode.READ_ONLY,
      dataType: DpDataType.ENUM,
      enumValues: ['manual', 'timing', 'spray', 'idle'],
      description: 'manual=手动, timing=定时, spray=喷雾, idle=空闲',
    },
    {
      id: 130 + channelNum, // DP131-134
      code: `irrigation_time_${channelNum}`,
      name: `通道${channelNum}灌溉时长日志`,
      accessMode: DpAccessMode.READ_ONLY,
      dataType: DpDataType.VALUE,
      valueRange: { min: 0, max: 43200, step: 1, scale: 0, unit: 's' },
    },
  ]
}

// 生成普通定时 DP（通道2-4独有）
function createTimerDp(channelNum: number) {
  return {
    id: 111 + channelNum, // DP113-115
    code: channelNum === 1 ? 'timer' : `timer${channelNum}`,
    name: `通道${channelNum}普通定时`,
    accessMode: DpAccessMode.READ_WRITE,
    dataType: DpDataType.RAW,
    description: channelNum === 1 ? '自定义协议' : undefined,
  }
}

// 1路水阀 DP Schema
const PRODUCT_1_CHANNEL: ProductDpSchema = {
  productId: 'rgnmfjlnx6hzagwe',
  productName: 'HQ2026-1路433水阀',
  channelCount: 1,
  dps: [
    ...createChannelDps(1),
    {
      id: 38,
      code: 'timer',
      name: '通道1普通定时',
      accessMode: DpAccessMode.READ_WRITE,
      dataType: DpDataType.RAW,
      description: '自定义协议',
    },
    ...COMMON_DPS,
  ],
}

// 2路水阀 DP Schema
const PRODUCT_2_CHANNEL: ProductDpSchema = {
  productId: '9zkur06p7ggbwvbl',
  productName: 'HQ2026-2路433水阀',
  channelCount: 2,
  dps: [...createChannelDps(1), ...createChannelDps(2), createTimerDp(1), createTimerDp(2), ...COMMON_DPS],
}

// 3路水阀 DP Schema
const PRODUCT_3_CHANNEL: ProductDpSchema = {
  productId: 'fdekfvdlkmqyslqr',
  productName: 'HQ2026-3路433水阀',
  channelCount: 3,
  dps: [
    ...createChannelDps(1),
    ...createChannelDps(2),
    ...createChannelDps(3),
    createTimerDp(1),
    createTimerDp(2),
    createTimerDp(3),
    ...COMMON_DPS,
  ],
}

// 4路水阀 DP Schema
const PRODUCT_4_CHANNEL: ProductDpSchema = {
  productId: 'ui9sxthml2sayg6a',
  productName: 'HQ2026-4路433水阀',
  channelCount: 4,
  dps: [
    ...createChannelDps(1),
    ...createChannelDps(2),
    ...createChannelDps(3),
    ...createChannelDps(4),
    createTimerDp(1),
    createTimerDp(2),
    createTimerDp(3),
    createTimerDp(4),
    ...COMMON_DPS,
  ],
}

/**
 * 所有产品的 DP Schema 映射表
 * 使用方式：PRODUCT_DP_SCHEMAS[productId]
 */
export const PRODUCT_DP_SCHEMAS: ProductDpSchemaMap = {
  [PRODUCT_1_CHANNEL.productId]: PRODUCT_1_CHANNEL,
  [PRODUCT_2_CHANNEL.productId]: PRODUCT_2_CHANNEL,
  [PRODUCT_3_CHANNEL.productId]: PRODUCT_3_CHANNEL,
  [PRODUCT_4_CHANNEL.productId]: PRODUCT_4_CHANNEL,
}

// 导出单个产品的 Schema
export { PRODUCT_1_CHANNEL, PRODUCT_2_CHANNEL, PRODUCT_3_CHANNEL, PRODUCT_4_CHANNEL }
