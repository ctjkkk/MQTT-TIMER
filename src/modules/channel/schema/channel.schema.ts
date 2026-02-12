import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose'

export type ChannelDocument = HydratedDocument<Channel>

/**
 * Channel（出水口/阀门）数据模型
 *
 * 设计说明：
 * - 每个 Timer 设备有 1-4 个 Channel（根据 channel_number)
 * - Channel 是虚拟概念，数据来源于 Timer 的 DP 点
 * - 例如：DP1=开关1, DP17=时长1, DP105=倒计时1, DP119=状态1
 */
@Schema({ timestamps: true, collection: 'channels' })
export class Channel {
  // ========== 基础信息 ==========
  @Prop({ type: String, required: true, trim: true })
  channelId: string // 虚拟ID，实际存储在 _id 字段，返回给前端时重命名为 channelId

  @Prop({ type: String, ref: 'Timer', required: true, trim: true })
  timerId: string // 关联 Timer.timerId（业务ID），可以使用 populate 查询

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: MongooseSchema.Types.ObjectId

  @Prop({ type: Number, required: true, min: 1, max: 4, comment: 'Channel number (1-4)' })
  channel_number: number

  @Prop({ type: String, trim: true, default: '', comment: 'User-defined zone name (e.g., Front Yard, Back Yard)' })
  zone_name: string

  @Prop({ type: String, trim: true, default: '', comment: 'User-defined zone image URL' })
  zone_image: string

  // ========== Status Info (from DP points) ==========

  @Prop({ type: Number, default: 0, enum: [0, 1], comment: 'Current switch status (DP1-4): 0=off, 1=running' })
  is_running: number

  @Prop({
    type: String,
    enum: ['manual', 'timing', 'spray', 'idle'],
    default: 'idle',
    comment: 'Work state (DP119-122): manual=manual, timing=scheduled, spray=spray, idle=idle',
  })
  work_state: string

  @Prop({ type: Number, default: 0, min: 0, comment: 'Remaining countdown (seconds) (DP105-108)' })
  remaining_countdown: number

  @Prop({ type: Number, default: 0, min: 0, max: 43200, comment: 'Irrigation duration (seconds) (DP17-20)' })
  irrigation_duration: number

  // ========== Schedule Info ==========

  @Prop({ type: Date, default: null, comment: 'Next scheduled run time (DP109-112 or DP38/113-115)' })
  next_run_time: Date

  @Prop({ type: String, default: '', comment: 'Timer configuration (raw DP data)' })
  timer_config: string

  // ========== Weather Skip Feature ==========

  @Prop({ type: Number, default: 0, enum: [0, 1], comment: 'Weather skip enabled: 0=disabled, 1=enabled' })
  weather_skip_enabled: number

  // ========== Statistics ==========

  @Prop({ type: Number, default: 0, comment: 'Total irrigation time (minutes) (DP131-134)' })
  total_irrigation_time: number

  @Prop({ type: Date, default: null, comment: 'Last run time' })
  last_run_time: Date

  @Prop({ type: Date, default: null, comment: 'Last DP update time' })
  last_dp_update: Date
}

export const ChannelSchema = SchemaFactory.createForClass(Channel)

// 添加索引
ChannelSchema.index({ timerId: 1, channel_number: 1 }, { unique: true }) // 联合唯一索引：一个 Timer 的每个通道编号唯一
ChannelSchema.index({ userId: 1 }) // 按用户查询所有 Channel
ChannelSchema.index({ is_running: 1 }) // 按运行状态查询
ChannelSchema.index({ next_run_time: 1 }) // 按下次运行时间查询（用于定时任务调度）
