/**
 * Tuya DP Schema Configuration
 * Reference: docs/HQ2026-*路433水阀(xxx).txt
 *
 * Description:
 * - Each product model has independent DP configuration
 * - DP IDs are defined by Tuya platform, non-continuous (1-4, 17-20, 38-39, 42-45, 47, 53, 105-134)
 * - More channels means more DP points (1ch: 17DPs, 2ch: 24DPs, 3ch: 31DPs, 4ch: 38DPs)
 */

import { DpAccessMode, DpDataType, ProductDpSchema, ProductDpSchemaMap } from '../types/dp.types'

// Common DP points (all products)
const COMMON_DPS = [
  // Weather related (shared by all products)
  {
    id: 42,
    code: 'remaining_weather_delay',
    name: 'Remaining Weather Delay Time',
    accessMode: DpAccessMode.READ_ONLY,
    dataType: DpDataType.VALUE,
    valueRange: { min: 0, max: 240, step: 1, scale: 0, unit: 'h' },
  },
  {
    id: 43,
    code: 'weather_switch',
    name: 'Weather Switch',
    accessMode: DpAccessMode.READ_WRITE,
    dataType: DpDataType.BOOLEAN,
  },
  {
    id: 44,
    code: 'smart_weather',
    name: 'Smart Weather',
    accessMode: DpAccessMode.READ_WRITE,
    dataType: DpDataType.ENUM,
    enumValues: ['sunny', 'rainy'],
  },
  {
    id: 45,
    code: 'weather_delay',
    name: 'Rainy Day Delay',
    accessMode: DpAccessMode.READ_WRITE,
    dataType: DpDataType.ENUM,
    enumValues: ['1', '2', '3', '4', '5', '6', '7', 'cancel'],
    description: '1-7 represents delay days, cancel means cancel delay',
  },

  // System status (shared by all products)
  {
    id: 47,
    code: 'battery_state',
    name: 'Battery Status',
    accessMode: DpAccessMode.READ_ONLY,
    dataType: DpDataType.ENUM,
    enumValues: ['6', '5', '4', '3', '2', '1', '0'],
    description: '6=3.05V, 5=2.95V, 4=2.85V, 3=2.75V, 2=2.65V, 1=2.60V, 0=below 2.60V',
  },
  {
    id: 53,
    code: 'fault',
    name: 'Fault Alarm',
    accessMode: DpAccessMode.READ_ONLY,
    dataType: DpDataType.FAULT,
    faultValues: ['low_battery', 'fault_1', 'fault_2', 'fault_3'],
  },
  {
    id: 117,
    code: 'signal_boost_switch',
    name: 'Signal Boost',
    accessMode: DpAccessMode.READ_WRITE,
    dataType: DpDataType.BOOLEAN,
  },
  {
    id: 118,
    code: 'signal_strength',
    name: 'Signal Strength',
    accessMode: DpAccessMode.READ_ONLY,
    dataType: DpDataType.VALUE,
    valueRange: { min: -255, max: 255, step: 1, scale: 0, unit: '' },
  },
  {
    id: 123,
    code: 'upgrade_status',
    name: 'Upgrade Status',
    accessMode: DpAccessMode.READ_ONLY,
    dataType: DpDataType.ENUM,
    enumValues: ['upgrade_complete', 'upgrade_begin'],
  },

  // Spray timing (shared by all products)
  {
    id: 39,
    code: 'cycle_timing',
    name: 'Spray Timing',
    accessMode: DpAccessMode.READ_WRITE,
    dataType: DpDataType.RAW,
    description: 'Custom protocol',
  },
]

// Generate DP points for a single channel (factory function)
function createChannelDps(channelNum: number) {
  return [
    {
      id: channelNum, // DP1-4
      code: `switch_${channelNum}`,
      name: `Zone ${String.fromCharCode(64 + channelNum)}`, // A, B, C, D
      accessMode: DpAccessMode.READ_WRITE,
      dataType: DpDataType.BOOLEAN,
    },
    {
      id: 16 + channelNum, // DP17-20
      code: `countdown_${channelNum}`,
      name: `Set Channel ${channelNum} Irrigation Duration`,
      accessMode: DpAccessMode.READ_WRITE,
      dataType: DpDataType.VALUE,
      valueRange: {
        min: 0,
        max: 43200,
        step: 1,
        scale: 0,
        unit: channelNum === 4 ? 'min' : 's', // Note: DP20 unit is min!
      },
    },
    {
      id: 104 + channelNum, // DP105-108
      code: `running_countdown_${channelNum}`,
      name: `Channel ${channelNum} Remaining Countdown`,
      accessMode: DpAccessMode.READ_ONLY,
      dataType: DpDataType.VALUE,
      valueRange: { min: 0, max: 43200, step: 1, scale: 0, unit: '' },
    },
    {
      id: 108 + channelNum, // DP109-112
      code: `irr_timestamp_next${channelNum}`,
      name: `Channel ${channelNum} Next Schedule`,
      accessMode: DpAccessMode.READ_ONLY,
      dataType: DpDataType.RAW,
    },
    {
      id: 118 + channelNum, // DP119-122
      code: `work_state_${channelNum}`,
      name: `Channel ${channelNum} Work State`,
      accessMode: DpAccessMode.READ_ONLY,
      dataType: DpDataType.ENUM,
      enumValues: ['manual', 'timing', 'spray', 'idle'],
      description: 'manual=manual, timing=scheduled, spray=spray, idle=idle',
    },
    {
      id: 130 + channelNum, // DP131-134
      code: `irrigation_time_${channelNum}`,
      name: `Channel ${channelNum} Irrigation Time Log`,
      accessMode: DpAccessMode.READ_ONLY,
      dataType: DpDataType.VALUE,
      valueRange: { min: 0, max: 43200, step: 1, scale: 0, unit: 's' },
    },
  ]
}

// Generate regular timer DP (channels 2-4 only)
function createTimerDp(channelNum: number) {
  return {
    id: 111 + channelNum, // DP113-115
    code: channelNum === 1 ? 'timer' : `timer${channelNum}`,
    name: `Channel ${channelNum} Regular Timer`,
    accessMode: DpAccessMode.READ_WRITE,
    dataType: DpDataType.RAW,
    description: channelNum === 1 ? 'Custom protocol' : undefined,
  }
}

// 1-Channel Valve DP Schema
const PRODUCT_1_CHANNEL: ProductDpSchema = {
  productId: 'rgnmfjlnx6hzagwe',
  productName: 'HQ2026-1 Channel 433 Valve',
  channelCount: 1,
  dps: [
    ...createChannelDps(1),
    {
      id: 38,
      code: 'timer',
      name: 'Channel 1 Regular Timer',
      accessMode: DpAccessMode.READ_WRITE,
      dataType: DpDataType.RAW,
      description: 'Custom protocol',
    },
    ...COMMON_DPS,
  ],
}

// 2-Channel Valve DP Schema
const PRODUCT_2_CHANNEL: ProductDpSchema = {
  productId: '9zkur06p7ggbwvbl',
  productName: 'HQ2026-2 Channel 433 Valve',
  channelCount: 2,
  dps: [...createChannelDps(1), ...createChannelDps(2), createTimerDp(1), createTimerDp(2), ...COMMON_DPS],
}

// 3-Channel Valve DP Schema
const PRODUCT_3_CHANNEL: ProductDpSchema = {
  productId: 'fdekfvdlkmqyslqr',
  productName: 'HQ2026-3 Channel 433 Valve',
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

// 4-Channel Valve DP Schema
const PRODUCT_4_CHANNEL: ProductDpSchema = {
  productId: 'ui9sxthml2sayg6a',
  productName: 'HQ2026-4 Channel 433 Valve',
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
