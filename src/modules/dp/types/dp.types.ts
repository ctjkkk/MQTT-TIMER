/**
 * 涂鸦 DP 点类型定义
 */

/**
 * DP 数据类型（涂鸦标准）
 */
export enum DpDataType {
  BOOLEAN = 'bool', // 布尔型
  VALUE = 'value', // 数值型
  ENUM = 'enum', // 枚举型
  RAW = 'raw', // 透传/字符串型
  FAULT = 'fault', // 故障型（位图）
}

/**
 * DP 传输类型（读写权限）
 */
export enum DpAccessMode {
  READ_WRITE = 'rw', // 可下发可上报
  READ_ONLY = 'ro', // 只上报
  WRITE_ONLY = 'wo', // 只下发（少见）
}

/**
 * DP 点定义（单个功能点）
 */
export interface DpDefinition {
  /** DP ID */
  id: number

  /** 功能点标识符（涂鸦标准命名） */
  code: string

  /** 功能点名称（中文描述） */
  name: string

  /** 数据传输类型 */
  accessMode: DpAccessMode

  /** 数据类型 */
  dataType: DpDataType

  /** 数值型：数值范围 */
  valueRange?: {
    min: number
    max: number
    step: number // 间距
    scale: number // 倍数
    unit: string // 单位
  }

  /** 枚举型：枚举值列表 */
  enumValues?: string[]

  /** 故障型：故障值列表 */
  faultValues?: string[]

  /** 备注说明 */
  description?: string
}

/**
 * 产品 DP Schema（某个产品型号的完整 DP 配置）
 */
export interface ProductDpSchema {
  /** 产品ID（涂鸦平台） */
  productId: string

  /** 产品名称 */
  productName: string

  /** 出水口数量 */
  channelCount: number

  /** 支持的所有 DP 点 */
  dps: DpDefinition[]
}

/**
 * 所有产品的 DP Schema 映射表
 */
export type ProductDpSchemaMap = Record<string, ProductDpSchema>

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
