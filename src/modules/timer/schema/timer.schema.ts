import mongoose from 'mongoose'
import { UserDocument } from '../../../shared/schemas/User'
import { HanqiGatewayDocument } from '../../gateway/schema/HanqiGateway.schema'

export interface HanqiTimerDocument extends mongoose.Document {
  timerId: string
  name: string
  userId: UserDocument['_id']
  gatewayId: HanqiGatewayDocument['_id']
  hanqi_device_id: string
  outlet_count: number
  status: number
  is_connected: number
  last_seen: Date
  firmware_version: string
  mac_address: string
  battery_level: number
  signal_strength: number
  dp_data: Record<string, any>
  last_dp_update: Date
  createdAt: Date
  updatedAt: Date
}

const HanqiTimerSchema = new mongoose.Schema(
  {
    timerId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    gatewayId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HanqiGateway',
      required: true,
    },
    hanqi_device_id: {
      type: String,
      trim: true,
    },
    outlet_count: {
      type: Number,
      required: true,
      min: 2,
      max: 4,
      default: 2,
    },
    status: {
      type: Number,
      default: 0,
    },
    is_connected: {
      type: Number,
      default: 0,
    },
    last_seen: {
      type: Date,
      default: null,
    },
    firmware_version: {
      type: String,
      default: '1.0.0',
      trim: true,
      comment: '��H,',
    },
    mac_address: {
      type: String,
      trim: true,
      comment: 'MAC0@',
    },
    battery_level: {
      type: Number,
      min: 0,
      max: 100,
      default: 100,
    },
    signal_strength: {
      type: Number,
      min: 0,
      max: 100,
      default: 100,
      comment: '信号强度',
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

HanqiTimerSchema.index({ userId: 1 })
HanqiTimerSchema.index({ gatewayId: 1 })
HanqiTimerSchema.index({ timerId: 1 }, { unique: true })
HanqiTimerSchema.index({ status: 1 })
HanqiTimerSchema.index({ is_connected: 1 })
HanqiTimerSchema.index({ last_seen: 1 })
HanqiTimerSchema.index({ 'location.coordinates': '2dsphere' })

const HanqiTimer = mongoose.model<HanqiTimerDocument>('HanqiTimer', HanqiTimerSchema)
export default HanqiTimer
