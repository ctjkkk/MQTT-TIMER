import { SetMetadata } from '@nestjs/common'
// 元数据键
export const MQTT_TOPIC_METADATA = 'MQTT_TOPIC_METADATA'
export const MQTT_PARAM_METADATA = 'MQTT_PARAM_METADATA'

// 主题订阅装饰器
export const Topic = (topic: string | string[]) => {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const topics = Array.isArray(topic) ? topic : [topic]
    const existing = Reflect.getMetadata(MQTT_TOPIC_METADATA, target, propertyKey) || []
    existing.push(...topics)
    Reflect.defineMetadata(MQTT_TOPIC_METADATA, existing, target, propertyKey)
  }
}

// 参数装饰器
export const Payload = (property?: string) => {
  return (target: any, propertyKey: string, parameterIndex: number) => {
    const existingParameters: any[] = Reflect.getOwnMetadata(MQTT_PARAM_METADATA, target, propertyKey) || []
    existingParameters.push({
      index: parameterIndex,
      type: 'payload',
      property: property,
    })
    Reflect.defineMetadata(MQTT_PARAM_METADATA, existingParameters, target, propertyKey)
  }
}

// 客户端ID参数装饰器
export const ClientId = () => {
  return (target: any, propertyKey: string, parameterIndex: number) => {
    const existingParameters: any[] = Reflect.getOwnMetadata(MQTT_PARAM_METADATA, target, propertyKey) || []
    existingParameters[parameterIndex] = {
      index: parameterIndex,
      type: 'clientId',
    }
    Reflect.defineMetadata(MQTT_PARAM_METADATA, existingParameters, target, propertyKey)
  }
}

// 主题参数装饰器
export const TopicParam = () => {
  return (target: any, propertyKey: string, parameterIndex: number) => {
    const existingParameters: any[] = Reflect.getOwnMetadata(MQTT_PARAM_METADATA, target, propertyKey) || []
    existingParameters[parameterIndex] = {
      index: parameterIndex,
      type: 'topic',
    }
    Reflect.defineMetadata(MQTT_PARAM_METADATA, existingParameters, target, propertyKey)
  }
}

// 添加 Broker 参数装饰器（如果需要）
export const Broker = () => {
  return (target: any, propertyKey: string, parameterIndex: number) => {
    const existingParameters: any[] = Reflect.getOwnMetadata(MQTT_PARAM_METADATA, target, propertyKey) || []
    existingParameters.push({
      index: parameterIndex,
      type: 'broker',
    })
    Reflect.defineMetadata(MQTT_PARAM_METADATA, existingParameters, target, propertyKey)
  }
}
