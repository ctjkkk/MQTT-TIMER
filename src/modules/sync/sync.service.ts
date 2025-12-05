import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { InjectConnection } from '@nestjs/mongoose'
import { Connection } from 'mongoose'
import { AedesBrokerService } from '@/core/mqtt/mqtt-broker.service'
import { SYNC_TABLES, SyncTableConfig } from '@/config/sync-tables.config'
import { deserialize } from '@/common/utils/transform'
import { LoggerService } from '@/common/logger/logger.service'
import { LogMessages } from '@/shared/constants/log-messages.constants'
/**
 * 表同步服务（TIMER-MQTT 端）
 *
 * 职责：
 * 1. 订阅 MQTT 同步消息
 * 2. 更新本地缓存数据
 */
@Injectable()
export class SyncService implements OnModuleInit {
  private readonly logger = new Logger(SyncService.name)
  constructor(
    @InjectConnection() private connection: Connection,
    private mqttBrokerService: AedesBrokerService,
    private readonly loggerService: LoggerService,
  ) {}

  // 模块初始化时订阅所有表
  async onModuleInit() {
    for (const config of SYNC_TABLES) {
      this.subscribeTable(config)
    }
    this.logger.log(LogMessages.SYNC.SUBSCRIBED(SYNC_TABLES.length))
  }

  // 订阅指定表的同步消息
  private subscribeTable(config: SyncTableConfig) {
    this.mqttBrokerService.subscribe(config.topic, async (payload: Buffer) => {
      try {
        const message = deserialize(JSON.parse(payload.toString()))
        await this.handleSync(config, message)
      } catch (error) {
        this.loggerService.error(LogMessages.SYNC.SYNC_FAILED(config.localCollection, (error as Error).message), 'SYNC')
      }
    })
  }

  // 处理同步消息
  private async handleSync(config: SyncTableConfig, payload: any) {
    const collection = this.connection.collection(config.localCollection)
    const keyField = config.keyField || '_id'

    switch (payload.operation) {
      case 'insert': {
        const { _id, ...data } = payload.data
        await collection.updateOne({ [keyField]: _id }, { $set: { ...data, syncedAt: new Date() } }, { upsert: true })
        break
      }

      case 'replace': {
        const { _id, ...data } = payload.data
        await collection.replaceOne({ [keyField]: _id }, { ...data, syncedAt: new Date() }, { upsert: true })
        break
      }

      case 'update': {
        const { _id, ...fields } = payload.data
        const updateQuery: any = {
          $set: { ...fields, syncedAt: new Date() },
        }

        if (payload.removedFields?.length) {
          updateQuery.$unset = Object.fromEntries(payload.removedFields.map((f: string) => [f, '']))
        }

        await collection.updateOne({ [keyField]: payload.key }, updateQuery)
        break
      }

      case 'delete':
        await collection.deleteOne({ [keyField]: payload.key })
        break

      default:
        this.loggerService.warn(LogMessages.SYNC.UNSUPPORTED_OPERATION(payload.operation), 'SYNC')
    }
  }
}
