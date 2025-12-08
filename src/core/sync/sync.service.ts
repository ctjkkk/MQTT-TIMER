import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { InjectConnection } from '@nestjs/mongoose'
import { Connection } from 'mongoose'
import { AedesBrokerService } from '@/core/mqtt/mqttBroker.service'
import { SYNC_TABLES, SyncTableConfig } from '@/core/config/syncTables.config'
import { deserialize } from '@/common/utils/transform'
import { filterFields } from '@/common/utils/dataFilters'
import { LoggerService } from '@/core/logger/logger.service'
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
        this.loggerService.error(LogMessages.SYNC.SYNC_FAILED(config.localCollection, error.message), 'SYNC')
      }
    })
  }

  // 处理同步消息
  private async handleSync(config: SyncTableConfig, payload: any) {
    const collection = this.connection.collection(config.localCollection)
    const keyField = config.keyField || '_id'

    switch (payload.operation) {
      case 'insert': {
        const { _id, ...data } = filterFields(payload.data, config)
        await collection.updateOne({ [keyField]: payload.key }, { $set: { ...data, syncedAt: new Date() } }, { upsert: true })
        break
      }

      case 'replace': {
        const { _id, ...data } = filterFields(payload.data, config)
        await collection.replaceOne({ [keyField]: payload.key }, { ...data, syncedAt: new Date() }, { upsert: true })
        break
      }

      case 'update': {
        const { _id, ...fields } = filterFields(payload.data, config)
        const updateQuery: any = {
          $set: { ...fields, syncedAt: new Date() },
        }
        // 只处理配置中允许的移除字段
        if (payload.removedFields?.length) {
          const allowedFields = new Set(config.fields)
          const filteredRemovedFields = payload.removedFields.filter((f: string) => allowedFields.has(f))
          if (filteredRemovedFields.length) {
            updateQuery.$unset = Object.fromEntries(filteredRemovedFields.map((f: string) => [f, '']))
          }
        }
        await collection.updateOne({ [keyField]: payload.key }, updateQuery, { upsert: true })
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
