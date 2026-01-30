import { MqttMessageType, MqttUnifiedMessage, EntityType } from '@/shared/constants/mqtt-topic.constants'

/**
 * 构建网关自身的MQTT消息
 */
export function buildGatewayMessage<T = any>(msgType: MqttMessageType | string, gatewayId: string, data: T): MqttUnifiedMessage<T> {
  return {
    msgType,
    msgId: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    deviceId: gatewayId,
    timestamp: Math.floor(Date.now() / 1000),
    data,
  }
}

/**
 * 判断消息是否为网关自身的消息
 */
export function isGatewayMessage(message: MqttUnifiedMessage): boolean {
  const { entityType } = message.data
  return EntityType.GATEWAY === entityType
}

/**
 * 判断消息是否为子设备的消息
 */
export function isSubDeviceMessage(message: MqttUnifiedMessage): boolean {
  const { entityType } = message.data
  return EntityType.SUBDEVICE === entityType
}

/**
 * 解析MQTT消息
 */
export function parseMqttMessage<T = any>(payload: Buffer | string): MqttUnifiedMessage<T> | null {
  try {
    const str = typeof payload === 'string' ? payload : payload.toString()
    return JSON.parse(str) as MqttUnifiedMessage<T>
  } catch (error) {
    console.error('Failed to parse MQTT message:', error)
    return error
  }
}
