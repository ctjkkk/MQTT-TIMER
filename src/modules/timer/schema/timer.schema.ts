import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose'

export type TimerDocument = HydratedDocument<Timer>

@Schema({ timestamps: true, collection: 'timers' })
export class Timer {
  @Prop({ type: String, required: true, unique: true, trim: true })
  timerId: string

  @Prop({ type: String })
  productId: string

  @Prop({ type: Number })
  capability_bits: number

  @Prop({ type: String, required: true, trim: true })
  name: string

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: MongooseSchema.Types.ObjectId

  @Prop({ type: String, ref: 'Gateway', required: true })
  gatewayId: string

  @Prop({ type: Number, min: 1, max: 4, default: 2 })
  channel_count: number

  @Prop({ type: Number, default: 0, enum: [0, 1] })
  status: number

  @Prop({ type: Number, default: 0 })
  online: number

  @Prop({ type: Date, default: null })
  last_seen: Date

  @Prop({ type: String, default: '1.0.0', trim: true, comment: '固件版本' })
  firmware_version: string

  @Prop({ type: Number, min: 0, max: 100, default: 100 })
  battery_level: number

  @Prop({ type: Number, min: 0, max: 100, default: 100, comment: '信号强度' })
  signal_strength: number

  @Prop({ type: Date, default: null, comment: '最后一次DP点更新时间' })
  last_dp_update: Date
}

export const TimerSchema = SchemaFactory.createForClass(Timer)

// 添加索引
TimerSchema.index({ userId: 1 })
TimerSchema.index({ gatewayId: 1 })
TimerSchema.index({ timerId: 1 }, { unique: true })
TimerSchema.index({ status: 1 })
TimerSchema.index({ is_connected: 1 })
TimerSchema.index({ last_seen: 1 })
TimerSchema.index({ 'location.coordinates': '2dsphere' })
