import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

/**
 * 产品配置表（类似涂鸦云的 ProductID 配置）
 *
 * 设计理念（汉奇建议的方案）：
 * - 网关只需上报 productId，云端根据这个表查出产品的所有特性
 * - 新产品上线：只需在这个表加一条配置，不需要修改代码
 * - 修改产品功能：只需修改配置，不需要更新固件
 *
 * 为什么要独立成模块？
 * - 产品配置是通用的业务概念
 * - timer、gateway、outlet 等模块都需要查询产品信息
 * - 独立模块便于维护和扩展
 */

export type ProductDocument = Product & Document

@Schema({ collection: 'products', timestamps: true })
export class Product {
  /**
   * 产品ID（主键）- 涂鸦平台的产品标识符
   *
   * 说明：
   * - 这是产品的唯一标识（涂鸦云平台生成的字符串）
   * - 网关固件中烧录这个ID
   * - 云端根据这个ID查询产品配置
   *
   * 例如：
   * - "fdekfvdlkmqyslqr": 3路433水阀
   * - "ui9sxthml2sayg6a": 4路433水阀
   */
  @Prop({ required: true, unique: true, index: true })
  productId: string

  /**
   * 产品名称
   *
   * 说明：显示给用户看的名称
   * 例如："单路智能水阀"、"双路智能水阀"
   */
  @Prop({ required: true })
  name: string

  @Prop({ required: true, default: 1 })
  deviceType: number

  @Prop({ required: true, min: 1, max: 4 })
  outletCount: number

  @Prop({ required: true, default: '1.0.0' })
  defaultFirmwareVersion: string

  @Prop({ required: true, default: 100 })
  defaultBatteryLevel: number

  @Prop({ default: '' })
  imageUrl: string

  @Prop({ default: '' })
  description: string

  /**
   * 是否启用
   * 说明：
   * - 可以通过这个字段下架某个产品
   * - 下架后，网关上报这个 productId 会被拒绝
   * - 已添加的设备仍可正常使用
   */
  @Prop({ default: true })
  enabled: boolean

  @Prop()
  createdAt?: Date

  @Prop()
  updatedAt?: Date
}

export const ProductSchema = SchemaFactory.createForClass(Product)

/**
 * 预定义产品配置（初始化数据）
 *
 * 说明：
 * - 这是汉奇水阀的标准产品型号（使用涂鸦云平台的真实 productId）
 * - 系统启动时会自动导入这些配置
 * - 如果汉奇推出新型号，直接在这里加一条即可
 *
 * 使用方式：
 * - ProductService 启动时会自动读取这个数组
 * - 如果数据库中不存在，则插入
 * - 已存在则跳过（不会覆盖已修改的配置）
 *
 * ProductID 来源：
 * - 涂鸦云平台产品定义文档（docs/HQ*.txt）
 * - 单路和双路水阀的 productId 待汉奇工程师提供
 */
export const PREDEFINED_PRODUCTS: Partial<Product>[] = [
  // TODO: 待汉奇提供单路水阀的真实 productId（涂鸦云平台生成）
  {
    productId: 'temp_single_outlet', // 临时 ID，等汉奇提供真实 productId
    name: 'HQ2026-单路智能水阀',
    deviceType: 1,
    outletCount: 1, // 1个出水口
    defaultFirmwareVersion: '1.0.0',
    defaultBatteryLevel: 100,
    description: '支持1个出水口的433智能水阀，适用于小型花园',
    enabled: true,
  },
  // TODO: 待汉奇提供双路水阀的真实 productId（涂鸦云平台生成）
  {
    productId: 'temp_dual_outlet', // 临时 ID，等汉奇提供真实 productId
    name: 'HQ2026-双路智能水阀',
    deviceType: 1,
    outletCount: 2, // 2个出水口
    defaultFirmwareVersion: '1.0.0',
    defaultBatteryLevel: 100,
    description: '支持2个出水口的433智能水阀，适用于中型花园',
    enabled: true,
  },
  // 真实 productId（来自 docs/HQ2026-3路433水阀(fdekfvdlkmqyslqr)_01_28.txt）
  {
    productId: 'fdekfvdlkmqyslqr',
    name: 'HQ2026-3路433水阀',
    deviceType: 1,
    outletCount: 3, // 3个出水口
    defaultFirmwareVersion: '1.0.0',
    defaultBatteryLevel: 100,
    description: '支持3个出水口的433智能水阀，适用于大型花园',
    imageUrl: '',
    enabled: true,
  },
  // 真实 productId（来自 docs/HQ2026-4路433水阀(ui9sxthml2sayg6a)_01_28.txt）
  {
    productId: 'ui9sxthml2sayg6a',
    name: 'HQ2026-4路433水阀',
    deviceType: 1,
    outletCount: 4, // 4个出水口
    defaultFirmwareVersion: '1.0.0',
    defaultBatteryLevel: 100,
    description: '支持4个出水口的433智能水阀，适用于超大型花园或农场',
    imageUrl: '',
    enabled: true,
  },
]
