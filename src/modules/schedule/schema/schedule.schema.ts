import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose'

export type ScheduleDocument = HydratedDocument<Schedule>

@Schema({ timestamps: true, collection: 'schedules' })
export class Schedule {
  @Prop({ type: String, required: true, unique: true, trim: true })
  scheduleId: string

  @Prop({ type: String, required: true, trim: true, default: 'Scheduled Task' })
  name: string

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Channel', required: true })
  channelId: MongooseSchema.Types.ObjectId

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: MongooseSchema.Types.ObjectId

  @Prop({ type: String, enum: ['once', 'daily', 'weekly', 'custom'], default: 'daily' })
  schedule_type: string

  @Prop({ type: Boolean, default: true, comment: 'Enabled status' })
  is_enabled: boolean

  @Prop({ type: String, required: true })
  start_time: string

  @Prop({ type: String })
  end_time: string

  @Prop({ type: Number, required: true, min: 0 })
  duration: number

  @Prop({ type: [Number], default: [0, 1, 2, 3, 4, 5, 6] })
  repeat_days: number[]

  @Prop({
    type: {
      is_enabled: { type: Boolean, default: false },
      eco_mode: { type: Boolean, default: false },
      spray_pattern: { type: String, enum: ['continuous', 'interval', 'pulse'], default: 'continuous' },
      interval_on: { type: Number, default: 60 },
      interval_off: { type: Number, default: 30 },
    },
    _id: false,
  })
  spray_mode: {
    is_enabled: boolean
    eco_mode: boolean
    spray_pattern: string
    interval_on: number
    interval_off: number
  }

  @Prop({ type: Number, default: 0 })
  priority: number

  @Prop({ type: Date })
  next_run_time: Date

  @Prop({ type: Date })
  last_run_time: Date

  @Prop({ type: Number, default: 0 })
  run_count: number

  @Prop({ type: Number, default: 0 })
  status: number
}

export const ScheduleSchema = SchemaFactory.createForClass(Schedule)

// Add indexes
ScheduleSchema.index({ channelId: 1 })
ScheduleSchema.index({ userId: 1 })
ScheduleSchema.index({ scheduleId: 1 }, { unique: true })
ScheduleSchema.index({ is_enabled: 1 })
ScheduleSchema.index({ status: 1 })
ScheduleSchema.index({ next_run_time: 1 })
ScheduleSchema.index({ start_time: 1 })
ScheduleSchema.index({ channelId: 1, start_time: 1 })
