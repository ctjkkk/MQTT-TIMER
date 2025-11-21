import mongoose from 'mongoose'
import { HanqiOutletDocument } from '../../outlet/schema/outlet.schema'
import { UserDocument } from '../../../shared/schemas/User'

export interface HanqiScheduleDocument extends mongoose.Document {
  scheduleId: string
  name: string
  outletId: HanqiOutletDocument['_id']
  userId: UserDocument['_id']
  schedule_type: string
  is_enabled: boolean
  start_time: string
  end_time: string
  duration: number
  repeat_days: number[]
  spray_mode: {
    is_enabled: boolean
    eco_mode: boolean
    spray_pattern: string
    interval_on: number
    interval_off: number
  }
  priority: number
  next_run_time: Date
  last_run_time: Date
  run_count: number
  status: number
  createdAt: Date
  updatedAt: Date
}

const HanqiScheduleSchema = new mongoose.Schema(
  {
    scheduleId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      default: '����',
    },
    outletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HanqiOutlet',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    schedule_type: {
      type: String,
      enum: ['once', 'daily', 'weekly', 'custom'],
      default: 'daily',
    },
    is_enabled: {
      type: Boolean,
      default: true,
      comment: '/&/(',
    },
    start_time: {
      type: String,
      required: true,
    },
    end_time: {
      type: String,
    },
    duration: {
      type: Number,
      required: true,
      min: 0,
    },
    repeat_days: {
      type: [Number],
      default: [0, 1, 2, 3, 4, 5, 6],
    },
    spray_mode: {
      is_enabled: {
        type: Boolean,
        default: false,
      },
      eco_mode: {
        type: Boolean,
        default: false,
      },
      spray_pattern: {
        type: String,
        enum: ['continuous', 'interval', 'pulse'],
        default: 'continuous',
      },
      interval_on: {
        type: Number,
        default: 60,
      },
      interval_off: {
        type: Number,
        default: 30,
      },
    },
    priority: {
      type: Number,
      default: 0,
    },
    next_run_time: {
      type: Date,
    },
    last_run_time: {
      type: Date,
    },
    run_count: {
      type: Number,
      default: 0,
    },
    status: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
)

HanqiScheduleSchema.index({ outletId: 1 })
HanqiScheduleSchema.index({ userId: 1 })
HanqiScheduleSchema.index({ scheduleId: 1 }, { unique: true })
HanqiScheduleSchema.index({ is_enabled: 1 })
HanqiScheduleSchema.index({ status: 1 })
HanqiScheduleSchema.index({ next_run_time: 1 })
HanqiScheduleSchema.index({ start_time: 1 })
HanqiScheduleSchema.index({ outletId: 1, start_time: 1 })

const HanqiSchedule = mongoose.model<HanqiScheduleDocument>('HanqiSchedule', HanqiScheduleSchema)
export default HanqiSchedule
