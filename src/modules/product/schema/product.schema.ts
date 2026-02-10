import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type ProductDocument = Product & Document

@Schema({ collection: 'products', timestamps: true })
export class Product {
  @Prop({ required: true, unique: true, index: true })
  productId: string

  @Prop({ required: true })
  name: string

  @Prop({ required: true, default: 1 })
  deviceType: number

  @Prop({ required: true, min: 1, max: 4 })
  channel_count: number

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
  @Prop({ default: 1 })
  enabled: number

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
 * 使用方式：
 * - ProductService 启动时会自动读取这个数组
 * - 如果数据库中不存在，则插入
 * - 已存在则跳过（不会覆盖已修改的配置）
 */
export const PREDEFINED_PRODUCTS: Partial<Product>[] = [
  {
    productId: 'rgnmfjInx6hzagwe', // Real productId
    name: 'HQ2026-1 Channel 433 Valve',
    deviceType: 1,
    channel_count: 1, // 1 outlet
    defaultFirmwareVersion: '1.0.0',
    defaultBatteryLevel: 100,
    description: 'Smart 433 valve with 1 outlet, suitable for small gardens',
    imageUrl: '',
    enabled: 1,
  },
  {
    productId: '9zkur06p7ggbwvbl', // Real productId
    name: 'HQ2026-2 Channel 433 Valve',
    deviceType: 1,
    channel_count: 2, // 2 outlets
    defaultFirmwareVersion: '1.0.0',
    defaultBatteryLevel: 100,
    description: 'Smart 433 valve with 2 outlets, suitable for medium gardens',
    imageUrl: '',
    enabled: 1,
  },
  // Real productId (from docs/HQ2026-3路433水阀(fdekfvdlkmqyslqr)_01_28.txt)
  {
    productId: 'fdekfvdlkmqyslqr',
    name: 'HQ2026-3 Channel 433 Valve',
    deviceType: 1,
    channel_count: 3, // 3 outlets
    defaultFirmwareVersion: '1.0.0',
    defaultBatteryLevel: 100,
    description: 'Smart 433 valve with 3 outlets, suitable for large gardens',
    imageUrl: '',
    enabled: 1,
  },
  // Real productId (from docs/HQ2026-4路433水阀(ui9sxthml2sayg6a)_01_28.txt)
  {
    productId: 'ui9sxthml2sayg6a',
    name: 'HQ2026-4 Channel 433 Valve',
    deviceType: 1,
    channel_count: 4, // 4 outlets
    defaultFirmwareVersion: '1.0.0',
    defaultBatteryLevel: 100,
    description: 'Smart 433 valve with 4 outlets, suitable for extra large gardens or farms',
    imageUrl: '',
    enabled: 1,
  },
]
