import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

export type UpgradeTaskDocument = UpgradeTask & Document

/**
 * 升级任务表
 * 用途：记录每次OTA升级的过程和进度
 */
@Schema({
  collection: 'upgrade_tasks',
  timestamps: true,
})
export class UpgradeTask {
  // ==================== 设备信息 ====================

  @Prop({ required: true, ref: 'Gateway' })
  gatewayId: string // 网关ID，如 "HQ2026ABC123"

  // ==================== 版本信息 ====================

  @Prop({ required: true })
  fromVersion: string // 升级前版本，如 "1.0.1"

  @Prop({ required: true })
  toVersion: string // 目标版本，如 "1.0.2"

  // ==================== 固件信息 ====================

  @Prop({ required: true })
  firmwareUrl: string // 固件下载地址

  @Prop({ required: true })
  sha256: string // SHA256校验（更安全）

  @Prop({ required: true })
  fileSize: number // 文件大小（字节）

  // ==================== MQTT消息ID ====================

  @Prop({ required: true, unique: true })
  msgId: string // MQTT消息ID，用于追踪命令和响应的对应关系

  // ==================== 升级状态 ====================

  @Prop({
    default: 'pending',
    enum: [
      'pending', // 等待中（刚发送命令，网关还没开始）
      'downloading', // 下载中
      'verifying', // 校验中（检查MD5）
      'installing', // 安装中（写入Flash）
      'completed', // 升级完成
      'failed', // 升级失败
    ],
  })
  status: string

  @Prop({ default: 0, min: 0, max: 100 })
  progress: number // 升级进度（0-100）

  // ==================== 错误信息 ====================

  @Prop()
  errorCode?: string // 错误码，如 "MD5_MISMATCH", "DOWNLOAD_FAILED"

  @Prop()
  errorMessage?: string // 错误详情，如 "固件MD5校验失败"

  // ==================== 时间记录 ====================

  @Prop()
  startTime?: Date // 开始下载时间

  @Prop()
  completeTime?: Date // 完成时间（成功或失败）

  @Prop()
  duration?: number // 耗时（秒），完成时自动计算

  // ==================== 触发信息 ====================

  @Prop({ type: Types.ObjectId, ref: 'User' })
  triggeredBy?: Types.ObjectId // 触发人（手动升级时记录是谁点的按钮）

  @Prop({ default: false })
  isAutoUpgrade: boolean // 是否自动升级

  // ==================== 重试信息 ====================

  @Prop({ default: 0 })
  retryCount: number // 重试次数

  @Prop()
  lastRetryTime?: Date // 最后一次重试时间

  // 时间戳
  createdAt: Date
  updatedAt: Date
}

export const UpgradeTaskSchema = SchemaFactory.createForClass(UpgradeTask)

// 创建索引
UpgradeTaskSchema.index({ gatewayId: 1, createdAt: -1 }) // 查询某个网关的升级历史
UpgradeTaskSchema.index({ msgId: 1 }) // 通过msgId快速查找任务
UpgradeTaskSchema.index({ status: 1 }) // 查询所有进行中的任务
UpgradeTaskSchema.index({ createdAt: -1 }) // 按时间排序
