import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose'

export type ChannelDocument = HydratedDocument<Channel>

/**
 * Channel（出水口/阀门）数据模型
 *
 * 设计说明：
 * - 每个 Timer 设备有 1-4 个 Channel（根据 outlet_count）
 * - Channel 是虚拟概念，数据来源于 Timer 的 DP 点
 * - 例如：DP1=开关1, DP17=时长1, DP105=倒计时1, DP119=状态1
 */
@Schema({ timestamps: true, collection: 'channels' })
export class Channel {
  // ========== 基础信息 ==========

  @Prop({ type: String, required: true, trim: true })
  timerId: string

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: MongooseSchema.Types.ObjectId

  @Prop({ type: Number, required: true, min: 1, max: 4, comment: '通道编号（1-4）' })
  channel_number: number

  @Prop({ type: String, trim: true, default: '', comment: '用户自定义区域名称（如：前院、后院）' })
  zone_name: string

  @Prop({ type: String, trim: true, default: '', comment: '用户自定义区域图片 URL' })
  zone_image: string

  // ========== 状态信息（来自 DP 点）==========

  @Prop({ type: Number, default: 0, enum: [0, 1], comment: '当前开关状态（DP1-4）：0=关闭，1=运行' })
  is_running: number

  @Prop({
    type: String,
    enum: ['manual', 'timing', 'spray', 'idle'],
    default: 'idle',
    comment: '工作状态（DP119-122）：manual=手动,timing=定时,spray=喷雾,idle=空闲',
  })
  work_state: string

  @Prop({ type: Number, default: 0, min: 0, comment: '剩余运行倒计时（秒）（DP105-108）' })
  remaining_countdown: number

  @Prop({ type: Number, default: 0, min: 0, max: 43200, comment: '设置的灌溉时长（秒）（DP17-20）' })
  irrigation_duration: number

  // ========== 定时任务信息 ==========

  @Prop({ type: Date, default: null, comment: '下次定时运行时间（DP109-112 或 DP38/113-115）' })
  next_run_time: Date

  @Prop({ type: String, default: '', comment: '定时任务配置（原始 DP 数据）' })
  timer_config: string

  // ========== 天气跳过功能 ==========

  @Prop({ type: Number, default: 0, enum: [0, 1], comment: '是否启用天气跳过：0=禁用，1=启用' })
  weather_skip_enabled: number

  // ========== 统计信息 ==========

  @Prop({ type: Number, default: 0, comment: '累计灌溉时长（分钟）（DP131-134）' })
  total_irrigation_time: number

  @Prop({ type: Date, default: null, comment: '最后一次运行时间' })
  last_run_time: Date

  @Prop({ type: Date, default: null, comment: '最后一次 DP 更新时间' })
  last_dp_update: Date
}

export const ChannelSchema = SchemaFactory.createForClass(Channel)

// 添加索引
ChannelSchema.index({ timerId: 1, channel_number: 1 }, { unique: true }) // 联合唯一索引：一个 Timer 的每个通道编号唯一
ChannelSchema.index({ userId: 1 }) // 按用户查询所有 Channel
ChannelSchema.index({ is_running: 1 }) // 按运行状态查询
ChannelSchema.index({ next_run_time: 1 }) // 按下次运行时间查询（用于定时任务调度）
