// 元数据键
import { MQTT_TOPIC_METADATA, MQTT_PARAM_METADATA } from '@/shared/constants/mqtt.constants'

/**
 * MQTT主题订阅装饰器
 * 用于在Controller或Service的方法上标记要订阅的MQTT主题
 * @param topic - MQTT主题，支持通配符 + 和 #
 */
export const MqttSubscribe = (topic: string | string[]): MethodDecorator => {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const topics = Array.isArray(topic) ? topic : [topic]
    const existing = Reflect.getMetadata(MQTT_TOPIC_METADATA, target, propertyKey) || []
    existing.push(...topics)
    Reflect.defineMetadata(MQTT_TOPIC_METADATA, existing, target, propertyKey)
  }
}

/**
 * MQTT消息负载参数装饰器
 * 用于获取MQTT消息的payload（Buffer格式）
 * @param property - 可选，如果payload是JSON，可以指定要提取的属性
 */
export const MqttPayload = (property?: string) => {
  return (target: any, propertyKey: string, parameterIndex: number) => {
    const existingParameters: any[] = Reflect.getOwnMetadata(MQTT_PARAM_METADATA, target, propertyKey) || []
    existingParameters[parameterIndex] = {
      index: parameterIndex,
      type: 'payload',
      property: property,
    }
    Reflect.defineMetadata(MQTT_PARAM_METADATA, existingParameters, target, propertyKey)
  }
}

/**
 * MQTT客户端ID参数装饰器
 * 用于获取发送消息的MQTT客户端ID
 */
export const MqttClientId = () => {
  return (target: any, propertyKey: string, parameterIndex: number) => {
    const existingParameters: any[] = Reflect.getOwnMetadata(MQTT_PARAM_METADATA, target, propertyKey) || []
    existingParameters[parameterIndex] = {
      index: parameterIndex,
      type: 'clientId',
    }
    Reflect.defineMetadata(MQTT_PARAM_METADATA, existingParameters, target, propertyKey)
  }
}

/**
 * MQTT主题参数装饰器
 * 用于获取消息实际发布的主题（特别是使用通配符订阅时有用）
 */
export const MqttTopic = () => {
  return (target: any, propertyKey: string, parameterIndex: number) => {
    const existingParameters: any[] = Reflect.getOwnMetadata(MQTT_PARAM_METADATA, target, propertyKey) || []
    existingParameters[parameterIndex] = {
      index: parameterIndex,
      type: 'topic',
    }
    Reflect.defineMetadata(MQTT_PARAM_METADATA, existingParameters, target, propertyKey)
  }
}

/**
 * @deprecated 使用 @MqttTopic 代替
 */
export const TopicParam = MqttTopic

/**
 * MQTT Broker实例参数装饰器
 * 用于获取AedesBrokerService实例，可以用来发布消息
 */
export const MqttBroker = () => {
  return (target: any, propertyKey: string, parameterIndex: number) => {
    const existingParameters: any[] = Reflect.getOwnMetadata(MQTT_PARAM_METADATA, target, propertyKey) || []
    existingParameters[parameterIndex] = {
      index: parameterIndex,
      type: 'broker',
    }
    Reflect.defineMetadata(MQTT_PARAM_METADATA, existingParameters, target, propertyKey)
  }
}

/**
 * @deprecated 使用 @MqttBroker 代替
 */
export const Broker = MqttBroker
