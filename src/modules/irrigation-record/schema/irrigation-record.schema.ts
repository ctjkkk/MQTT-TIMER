import mongoose from 'mongoose'
import { HanqiOutletDocument } from '../../outlet/schema/outlet.schema'
import { HanqiScheduleDocument } from '../../schedule/schema/schedule.schema'
import { UserDocument } from '../../../shared/schemas/User'

export interface HanqiIrrigationRecordDocument extends mongoose.Document {
  recordId: string
  outletId: HanqiOutletDocument['_id']
  scheduleId: HanqiScheduleDocument['_id']
  userId: UserDocument['_id']
  start_time: Date
  duration: number
  planned_duration: number
  water_used: number
  status: number
  trigger_type: string
  temperature: number
  weather_condition: string
  error_code: string
  error_message: string
  notes: string
  createdAt: Date
  updatedAt: Date
}

const HanqiIrrigationRecordSchema = new mongoose.Schema(
  {
    recordId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      comment: '灌溉记录唯一标识',
    },
    outletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HanqiOutlet',
      required: true,
      comment: '出水口ID',
    },
    scheduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HanqiSchedule',
      comment: '定时任务ID（手动触发时为空）',
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      comment: '所属用户ID',
    },
    start_time: {
      type: Date,
      required: true,
      comment: '开始时间',
    },

    duration: {
      type: Number,
      default: 0,
      comment: '实际运行时长（秒）',
    },
    planned_duration: {
      type: Number,
      default: 0,
      comment: '计划运行时长（秒）',
    },
    water_used: {
      type: Number,
      default: 0,
      comment: '用水量（升）',
    },
    status: {
      type: Number,
      default: 0,
      comment: '状态：0-进行中，1-正常完成，2-手动停止，3-异常中断，4-超时',
    },
    trigger_type: {
      type: String,
      enum: ['scheduled', 'manual', 'api', 'sensor'],
      default: 'scheduled',
      comment: '触发方式：scheduled-定时，manual-手动，api-接口，sensor-传感器',
    },
    temperature: {
      type: Number,
      comment: '当时温度（℃）',
    },
    weather_condition: {
      type: String,
      comment: '天气状况',
    },
    error_code: {
      type: String,
      comment: '错误代码',
    },
    error_message: {
      type: String,
      comment: '错误信息',
    },
    notes: {
      type: String,
      comment: '备注',
    },
  },
  {
    timestamps: true,
  },
)

// 添加索引
HanqiIrrigationRecordSchema.index({ outletId: 1 })
HanqiIrrigationRecordSchema.index({ scheduleId: 1 })
HanqiIrrigationRecordSchema.index({ userId: 1 })
HanqiIrrigationRecordSchema.index({ recordId: 1 }, { unique: true })
HanqiIrrigationRecordSchema.index({ start_time: -1 })
HanqiIrrigationRecordSchema.index({ status: 1 })
HanqiIrrigationRecordSchema.index({ trigger_type: 1 })
HanqiIrrigationRecordSchema.index({ outletId: 1, start_time: -1 })
HanqiIrrigationRecordSchema.index({ userId: 1, start_time: -1 })

const HanqiIrrigationRecord = mongoose.model<HanqiIrrigationRecordDocument>('HanqiIrrigationRecord', HanqiIrrigationRecordSchema)
export default HanqiIrrigationRecord
