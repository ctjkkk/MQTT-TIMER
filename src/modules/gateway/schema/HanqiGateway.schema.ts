import mongoose from 'mongoose'
import { UserDocument } from '../../../shared/schemas/User'
export interface HanqiGatewayDocument extends mongoose.Document {
  merge(payload: any): unknown
  gatewayId: String
  name: String
  userId: UserDocument['_id']
  status: Number
  last_seen: Date
  hanqi_product_key: String
  hanqi_device_secret: String
  firmware_version: String
  mac_address: String
  is_connected: Number
  createdAt: Date
  updatedAt: Date
  timestamps: Date
}

const HanqiGatewaySchema = new mongoose.Schema({
  gatewayId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    comment: '汉奇网关设备ID',
  },
  name: {
    type: String,
    required: true,
    trim: true,
    comment: '网关名称',
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    comment: '所属用户ID',
  },
  status: {
    type: Number,
    comment: '是否弃用',
  },
  is_connected: {
    type: Number,
    comment: '心跳状态(连接状态)',
  },
  last_seen: {
    type: Date,
    default: null,
    comment: '最后通信时间',
  },
  hanqi_product_key: {
    type: String,
    trim: true,
    comment: '汉奇产品密钥',
  },
  hanqi_device_secret: {
    type: String,
    trim: true,
    comment: '汉奇设备密钥',
  },
  firmware_version: {
    type: String,
    default: '1.0.0',
    trim: true,
    comment: '固件版本',
  },
  mac_address: {
    type: String,
    trim: true,
  },
  timestamps: { type: Date, default: Date.now },
})

// 添加索引
HanqiGatewaySchema.index({ userId: 1 })
HanqiGatewaySchema.index({ status: 1 })
HanqiGatewaySchema.index({ last_seen: 1 })
HanqiGatewaySchema.index({ gatewayId: 1 }, { unique: true })

const HanqiGateway = mongoose.model<HanqiGatewayDocument>('HanqiGateway', HanqiGatewaySchema)
export default HanqiGateway
