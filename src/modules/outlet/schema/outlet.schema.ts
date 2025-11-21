import mongoose from 'mongoose'
import { HanqiTimerDocument } from '../../timer/schema/timer.schema'
import { UserDocument } from '../../../shared/schemas/User'

export interface HanqiOutletDocument extends mongoose.Document {
  outletId: string
  name: string
  timerId: HanqiTimerDocument['_id']
  userId: UserDocument['_id']
  outlet_number: number
  zone_name: string
  is_enabled: boolean
  current_status: number
  flow_rate: number
  pressure: number
  total_water_used: number
  remaining_time: number
  dp_data: Record<string, any>
  last_dp_update: Date
  createdAt: Date
  updatedAt: Date
}

const HanqiOutletSchema = new mongoose.Schema(
  {
    outletId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      comment: '出水口唯一标识',
    },
    name: {
      type: String,
      required: true,
      trim: true,
      default: '出水口',
      comment: '出水口名称',
    },
    timerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HanqiTimer',
      required: true,
      comment: '所属Timer设备ID',
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      comment: '所属用户ID',
    },
    outlet_number: {
      type: Number,
      required: true,
      min: 1,
      max: 4,
      comment: '出水口编号（1-4）',
    },
    zone_name: {
      type: String,
      trim: true,
      default: '',
      comment: '区域名称（对应现实中的灌溉区域）',
    },
    is_enabled: {
      type: Boolean,
      default: true,
      comment: '是否启用该出水口',
    },
    current_status: {
      type: Number,
      default: 0,
      comment: '当前状态：0-关闭，1-运行中，2-暂停，3-故障',
    },
    flow_rate: {
      type: Number,
      default: 0,
      comment: '当前流速（升/分钟）',
    },
    pressure: {
      type: Number,
      default: 0,
      comment: '当前水压（bar）',
    },
    total_water_used: {
      type: Number,
      default: 0,
      comment: '累计用水量（升）',
    },
    remaining_time: {
      type: Number,
      default: 0,
      comment: '剩余运行时间（秒）',
    },
    dp_data: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
      comment: 'DP点数据存储（键为dpId，值为dp值）',
    },
    last_dp_update: {
      type: Date,
      default: null,
      comment: '最后一次DP点更新时间',
    },
  },
  {
    timestamps: true,
  },
)

// 添加索引
HanqiOutletSchema.index({ timerId: 1 })
HanqiOutletSchema.index({ userId: 1 })
HanqiOutletSchema.index({ outletId: 1 }, { unique: true })
HanqiOutletSchema.index({ timerId: 1, outlet_number: 1 }, { unique: true })
HanqiOutletSchema.index({ current_status: 1 })
HanqiOutletSchema.index({ is_enabled: 1 })

const HanqiOutlet = mongoose.model<HanqiOutletDocument>('HanqiOutlet', HanqiOutletSchema)
export default HanqiOutlet
