import { Injectable } from '@nestjs/common'
import { LoggerService } from '@/core/logger/logger.service'
import { Handler, HandlerMetadata } from '../types/mqtt.type'
import { LogContext } from '@/shared/constants/logger.constants'

@Injectable()
export class MqttDispatchService {
  private topicHandlers = new Map<string, Handler[]>() // 存储已订阅的主题及其对应的处理函数列表

  constructor(private readonly loggerService: LoggerService) {}

  public subscribe(topic: string, handler: Handler): void {
    const handlers = this.topicHandlers.get(topic) ?? []
    handlers.push(handler)
    this.topicHandlers.set(topic, handlers)
  }

  async dispatch(topic: string, payload: Buffer | string, clientId: string, broker?: any): Promise<void> {
    for (const [registeredTopic, handlers] of this.topicHandlers) {
      this.topicMatches(topic, registeredTopic) &&
        (await Promise.all(handlers.map(handler => this.invokeHandler(handler, topic, payload, clientId, broker))))
    }
  }

  private async invokeHandler(
    handler: Handler,
    topic: string,
    payload: Buffer | string,
    clientId: string,
    broker?: any,
  ): Promise<void> {
    try {
      if (typeof handler === 'object' && handler.instance && handler.methodName) {
        //如果是通过注解订阅的主题
        await this.invokeDecoratorHandler(handler, topic, payload, clientId, broker)
      } else if (typeof handler === 'function') {
        //如果是通过 subscribe 方法订阅的主题，直接调用回调函数
        await handler(payload, clientId, topic)
      } else {
        this.loggerService.warn(`Unknown handler type for topic: ${topic}`, LogContext.DISPATCH_SERVICE)
      }
    } catch (error) {
      this.loggerService.error(`Handler execution failed for topic ${topic}: ${error.message}`, LogContext.DISPATCH_SERVICE)
    }
  }

  private async invokeDecoratorHandler(
    handler: HandlerMetadata,
    topic: string,
    payload: Buffer | string,
    clientId: string,
    broker?: any,
  ): Promise<void> {
    const params = Reflect.getMetadata('MQTT_PARAM_METADATA', handler.instance, handler.methodName) || []
    const args = new Array(params.length)

    params.forEach((p: any) => {
      switch (p.type) {
        case 'payload':
          args[p.index] = Buffer.isBuffer(payload) ? payload : Buffer.from(String(payload))
          break
        case 'clientId':
          args[p.index] = clientId
          break
        case 'topic':
          args[p.index] = topic
          break
        case 'broker':
          args[p.index] = broker
          break
      }
    })

    await handler.instance[handler.methodName](...args)
  }

  //topic通配符匹配算法 + 匹配单个，# 匹配多个
  private topicMatches(pubTopic: string, subTopic: string): boolean {
    const pubParts = pubTopic.split('/')
    const subParts = subTopic.split('/')
    for (let i = 0; i < Math.max(pubParts.length, subParts.length); i++) {
      const sub = subParts[i]
      if (sub === '#') return true
      if (sub === '+') continue
      if (pubParts[i] !== sub) return false
    }
    return true
  }
}
