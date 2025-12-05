import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose'

export type HanqiOutletDocument = HydratedDocument<HanqiOutlet>

@Schema({ timestamps: true, collection: 'hanqioutlets' })
export class HanqiOutlet {
  @Prop({ type: String, required: true, unique: true, trim: true, comment: '出水口唯一标识' })
  outletId: string

  @Prop({ type: String, required: true, trim: true, default: '出水口', comment: '出水口名称' })
  name: string

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'HanqiTimer', required: true, comment: '所属Timer设备ID' })
  timerId: MongooseSchema.Types.ObjectId

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, comment: '所属用户ID' })
  userId: MongooseSchema.Types.ObjectId

  @Prop({ type: Number, required: true, min: 1, max: 4, comment: '出水口编号（1-4）' })
  outlet_number: number

  @Prop({ type: String, trim: true, default: '', comment: '区域名称（对应现实中的灌溉区域）' })
  zone_name: string

  @Prop({ type: Boolean, default: true, comment: '是否启用该出水口' })
  is_enabled: boolean

  @Prop({ type: Number, default: 0, comment: '当前状态：0-关闭，1-运行中，2-暂停，3-故障' })
  current_status: number

  @Prop({ type: Number, default: 0, comment: '当前流速（升/分钟）' })
  flow_rate: number

  @Prop({ type: Number, default: 0, comment: '当前水压（bar）' })
  pressure: number

  @Prop({ type: Number, default: 0, comment: '累计用水量（升）' })
  total_water_used: number

  @Prop({ type: Number, default: 0, comment: '剩余运行时间（秒）' })
  remaining_time: number

  @Prop({ type: Map, of: MongooseSchema.Types.Mixed, default: {}, comment: 'DP点数据存储（键为dpId，值为dp值）' })
  dp_data: Map<string, any>

  @Prop({ type: Date, default: null, comment: '最后一次DP点更新时间' })
  last_dp_update: Date
}

export const HanqiOutletSchema = SchemaFactory.createForClass(HanqiOutlet)

// 添加索引
HanqiOutletSchema.index({ timerId: 1 })
HanqiOutletSchema.index({ userId: 1 })
HanqiOutletSchema.index({ outletId: 1 }, { unique: true })
HanqiOutletSchema.index({ timerId: 1, outlet_number: 1 }, { unique: true })
HanqiOutletSchema.index({ current_status: 1 })
HanqiOutletSchema.index({ is_enabled: 1 })
