/**
 * 子设备类型定义
 * 用于前端展示可选的水阀类型
 */

export interface SubDeviceType {
  /** 类型标识符 */
  type: string
  /** 出水口数量 */
  outletCount: number
  /** 类型名称 */
  name: string
  /** 图标标识（前端可用于显示对应图标） */
  image?: string
}
