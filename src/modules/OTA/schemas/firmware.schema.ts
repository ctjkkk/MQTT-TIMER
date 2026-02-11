import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type FirmwareDocument = Firmware & Document

/**
 * 固件版本表
 * 用途：存储嵌入式团队上传的固件文件信息
 */
@Schema({
  collection: 'firmwares',
  timestamps: true, // 自动添加 createdAt 和 updatedAt
})
export class Firmware {
  // ==================== 基础信息 ====================

  @Prop({ required: true, unique: true })
  version: string // 版本号，如 "1.0.2"

  @Prop({ required: true })
  fileName: string // 文件名，如 "gateway_v1.0.2.bin"

  @Prop({ required: true })
  fileUrl: string // HTTP下载地址，网关会从这个地址下载固件

  @Prop({ required: true })
  fileSize: number // 文件大小（字节）

  // ==================== 校验信息 ====================

  @Prop({ required: true })
  md5: string // MD5校验和，用于验证文件完整性

  @Prop()
  sha256?: string // SHA256校验和（可选，更安全）

  // ==================== 设备信息 ====================

  @Prop({ required: true, enum: ['gateway', 'subdevice'] })
  deviceType: string // 设备类型：网关 或 子设备

  @Prop()
  modelName?: string // 适用的设备型号，如 "HQ-GW-01"

  // ==================== 版本说明 ====================

  @Prop()
  description?: string // 版本说明，如 "修复WiFi连接bug"

  @Prop({ type: [String] })
  changeLog?: string[] // 更新日志列表

  // ==================== 状态管理 ====================

  @Prop({
    default: 'draft',
    enum: ['draft', 'testing', 'released', 'deprecated'],
  })
  status: string
  // draft: 草稿（刚上传，还没发布）
  // testing: 测试中（可以给测试设备升级）
  // released: 正式发布（所有设备可以升级）
  // deprecated: 已废弃（不再使用）

  @Prop({ default: false, enum: [0, 1] })
  forceUpgrade: number // 是否强制升级（强制升级时，网关必须升级）

  // ==================== 兼容性 ====================

  @Prop()
  minCompatibleVersion?: string // 最低兼容版本，低于此版本不能直接升级

  // ==================== 其他信息 ====================

  @Prop()
  releaseDate?: Date // 发布日期

  @Prop()
  uploadedBy?: string // 上传者用户ID

  // 时间戳（由timestamps自动生成）
  createdAt: Date // 创建时间
  updatedAt: Date // 更新时间
}

export const FirmwareSchema = SchemaFactory.createForClass(Firmware)

// 创建索引（提高查询速度）
FirmwareSchema.index({ version: 1 })
FirmwareSchema.index({ status: 1 })
FirmwareSchema.index({ deviceType: 1 })
