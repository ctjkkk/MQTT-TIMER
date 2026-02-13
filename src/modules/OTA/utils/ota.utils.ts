import { MqttUnifiedMessage } from '@/shared/constants/topic.constants'

/**
 * OTA 消息类型
 */
export enum OtaMessageType {
  PROGRESS = 'ota_progress', // 升级进度上报
  RESULT = 'ota_result', // 升级结果上报
}

/**
 * OTA 升级状态
 */
export enum OtaStatus {
  DOWNLOADING = 'downloading',
  VERIFYING = 'verifying',
  INSTALLING = 'installing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * OTA 进度数据
 */
export interface OtaProgressData {
  status: OtaStatus.DOWNLOADING | OtaStatus.VERIFYING | OtaStatus.INSTALLING
  progress: number // 0-100
}

/**
 * OTA 结果数据
 */
export interface OtaResultData {
  status: OtaStatus.COMPLETED | OtaStatus.FAILED
  version?: string // 升级后的版本（成功时）
  errorCode?: string // 错误码（失败时）
  errorMessage?: string // 错误详情（失败时）
}

/**
 * 解析 OTA MQTT 消息
 */
export function parseOtaMqttMessage<T = any>(payload: Buffer | string): MqttUnifiedMessage<T> | null {
  try {
    const str = typeof payload === 'string' ? payload : payload.toString()
    return JSON.parse(str) as MqttUnifiedMessage<T>
  } catch (error) {
    console.error('Failed to parse OTA MQTT message:', error)
    return null
  }
}

/**
 * 判断是否为 OTA 进度消息
 */
export function isOtaProgressMessage(message: MqttUnifiedMessage): boolean {
  return message.msgType === OtaMessageType.PROGRESS
}

/**
 * 判断是否为 OTA 结果消息
 */
export function isOtaResultMessage(message: MqttUnifiedMessage): boolean {
  return message.msgType === OtaMessageType.RESULT
}
