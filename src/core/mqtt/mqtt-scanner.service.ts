import { Injectable, OnModuleInit, Logger } from '@nestjs/common'
import { ModuleRef, ModulesContainer } from '@nestjs/core'
import { AedesBrokerService } from './mqtt-broker.service'
import { MQTT_TOPIC_METADATA } from '@/shared/constants/mqtt.constants'

@Injectable()
export class MqttScannerService implements OnModuleInit {
  private readonly logger = new Logger(MqttScannerService.name)

  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly modulesContainer: ModulesContainer,
    private readonly mqttBroker: AedesBrokerService,
  ) {}

  async onModuleInit() {
    // 等待所有模块加载完成后扫描
    setTimeout(() => {
      this.scanMqttHandlers()
    }, 100)
  }
  private async scanMqttHandlers(): Promise<void> {
    this.logger.log('🔍 开始扫描 MQTT 处理器...')

    let handlerCount = 0

    // 1. 遍历所有模块
    for (const moduleRef of this.modulesContainer.values()) {
      // 2. 合并 controllers + providers 统一扫描
      const entries = [...moduleRef.controllers.entries(), ...moduleRef.providers.entries()]

      for (const [token, controllerOrProvider] of entries) {
        try {
          // 3. 拿到实例（可能抛出，catch 跳过）
          const instance = await this.moduleRef.get(token, { strict: false })
          if (!instance) continue

          const proto = Object.getPrototypeOf(instance)
          const methods = Object.getOwnPropertyNames(proto).filter(n => n !== 'constructor' && typeof proto[n] === 'function')

          // 4. 遍历方法，找 @Topic
          for (const methodName of methods) {
            const topics = Reflect.getMetadata(MQTT_TOPIC_METADATA, proto, methodName)
            if (!topics) continue

            const topicList = Array.isArray(topics) ? topics : [topics]
            for (const topic of topicList) {
              this.mqttBroker.subscribe(topic, { instance, methodName })
              handlerCount++
              this.logger.debug(`注册处理器: ${topic} -> ${instance.constructor.name}.${methodName}`)
            }
          }
        } catch (e) {}
      }
    }

    this.logger.log(`✅ MQTT 处理器扫描完成，共找到 ${handlerCount} 个处理器`)
  }

  // 手动重新扫描（用于开发时热重载）
  async rescanHandlers(): Promise<void> {
    this.logger.log('🔄 重新扫描 MQTT 处理器...')
    await this.scanMqttHandlers()
  }

  // 获取已注册的主题列表
  getRegisteredTopics(): string[] {
    // 注意：这里需要访问 mqttBroker 的私有属性，实际使用时可能需要修改
    // 这里返回一个空数组作为示例，实际实现可能需要修改 MqttBrokerService
    return []
  }
}
