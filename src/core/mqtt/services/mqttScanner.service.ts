import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common'
import { ModuleRef, ModulesContainer } from '@nestjs/core'
import { MQTT_TOPIC_METADATA } from '@/shared/constants/mqtt.constants'
import { LogMessages } from '@/shared/constants/logger.constants'
import { MqttDispatchService } from './mqttDispatch.service'
@Injectable()
export class MqttScannerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(MqttScannerService.name)

  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly modulesContainer: ModulesContainer,
    private readonly dispatchService: MqttDispatchService,
  ) {}

  // onApplicationBootstrap 在所有模块初始化完成但尚未开始监听连接时调用。
  async onApplicationBootstrap() {
    await this.scanMqttHandlers()
  }
  private async scanMqttHandlers(): Promise<void> {
    this.logger.log(LogMessages.MQTT.SCANNING_PROCESSOR())

    let handlerCount = 0
    // 遍历所有模块
    for (const moduleRef of this.modulesContainer.values()) {
      // 合并 controllers + providers 统一扫描
      const entries = [...moduleRef.controllers.entries(), ...moduleRef.providers.entries()]

      for (const [token, _] of entries) {
        try {
          // 拿到实例
          const instance = await this.moduleRef.get(token, { strict: false })
          if (!instance) continue

          const proto = Object.getPrototypeOf(instance)
          const methods = Object.getOwnPropertyNames(proto).filter(n => n !== 'constructor' && typeof proto[n] === 'function')

          // 遍历方法，找 @Topic
          for (const methodName of methods) {
            const topics = Reflect.getMetadata(MQTT_TOPIC_METADATA, proto, methodName)
            if (!topics) continue

            const topicList = Array.isArray(topics) ? topics : [topics]
            for (const topic of topicList) {
              this.dispatchService.subscribe(topic, { instance, methodName })
              handlerCount++
              this.logger.log(LogMessages.MQTT.REGISTER_PROCESSOR(topic, instance.constructor.name, methodName))
            }
          }
        } catch (e) {}
      }
    }

    this.logger.log(LogMessages.MQTT.SCANNING_PROCESSOR_SCCUSS(handlerCount))
  }
}
