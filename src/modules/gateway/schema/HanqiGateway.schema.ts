import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose'

export type GatewayDocument = HydratedDocument<Gateway>

@Schema({ timestamps: true, collection: 'gateways' })
export class Gateway {
  @Prop({ type: String, required: true, unique: true, trim: true, comment: '汉奇网关设备ID' })
  gatewayId: string

  @Prop({ type: String, required: true, trim: true, comment: '网关名称' })
  name: string

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', comment: '所属用户ID' })
  userId: MongooseSchema.Types.ObjectId

  @Prop({ type: Number, comment: '是否弃用' })
  status: number

  @Prop({ type: Number, comment: '心跳状态(连接状态)' })
  is_connected: number

  @Prop({ type: Date, default: null, comment: '最后通信时间' })
  last_seen: Date

  @Prop({ type: String, trim: true, comment: '汉奇产品密钥' })
  hanqi_product_key: string

  @Prop({ type: String, trim: true, comment: '汉奇设备密钥' })
  hanqi_device_secret: string

  @Prop({ type: String, default: '1.0.0', trim: true, comment: '固件版本' })
  firmware_version: string

  @Prop({ type: String, trim: true })
  mac_address: string

  @Prop({ type: Number, comment: 'WiFi信号强度(dBm)' })
  wifi_rssi: number
}

export const GatewaySchema = SchemaFactory.createForClass(Gateway)

// 添加索引
GatewaySchema.index({ userId: 1 })
GatewaySchema.index({ status: 1 })
GatewaySchema.index({ last_seen: 1 })
GatewaySchema.index({ gatewayId: 1 }, { unique: true })
