import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { InjectConnection } from '@nestjs/mongoose'
import { Connection } from 'mongoose'
import { SYNC_TABLES, SyncTableConfig } from '@/core/config/syncTables.config'
import { deserialize } from '@/common/utils/transform'
import { filterFields } from '@/common/utils/dataFilters'
import { LoggerService } from '@/core/logger/logger.service'
import { LogMessages, LogContext } from '@/shared/constants/logger.constants'
import { RabbitmqService } from '../rabbitmq/rabbitmq.service'

/**
 * 表同步服务（TIMER-MQTT 端）
 * 职责：
 * 1. 订阅 RabbitMQ 同步消息
 * 2. 更新本地缓存数据
 */
@Injectable()
export class SyncService implements OnModuleInit {
  private readonly logger = new Logger(SyncService.name)
  constructor(
    @InjectConnection() private connection: Connection,
    private readonly rabbitmqService: RabbitmqService,
    private readonly loggerService: LoggerService,
  ) {}

  // 模块初始化时订阅 RabbitMQ 消息
  async onModuleInit() {
    await this.rabbitmqService.consume(async (routingKey, content) => {
      const config = SYNC_TABLES.find(c => c.topic === routingKey)
      if (!config) return

      try {
        // 解析消息，还原 ObjectId、Date 等 MongoDB 类型
        const message = deserialize(JSON.parse(content.toString()))
        // 执行具体的数据库操作
        await this.handleSync(config, message)
      } catch (error) {
        this.loggerService.error(LogMessages.SYNC.SYNC_FAILED(routingKey, error.message), LogContext.SYNC)
      }
    })
    this.logger.log(`Subscribed to RabbitMQ sync queue for ${SYNC_TABLES.length} tables`)
  }

  // 处理同步消息
  private async handleSync(config: SyncTableConfig, payload: any) {
    const collection = this.connection.collection(config.localCollection)
    const keyField = config.keyField || '_id'
    switch (payload.operation) {
      case 'insert': {
        const { _id, ...data } = filterFields(payload.data, config)
        await collection.updateOne({ [keyField]: payload.key }, { $set: { ...data, syncedAt: new Date() } }, { upsert: true })

        // 记录详细日志
        this.loggerService.info(LogMessages.SYNC.INSERT_SUCCESS(config.localCollection, payload.key), LogContext.SYNC, {
          operation: 'insert',
          collection: config.localCollection,
          key: payload.key,
          fields: Object.keys(data),
          data: data,
        })
        break
      }

      case 'replace': {
        const { _id, ...data } = filterFields(payload.data, config)
        await collection.replaceOne({ [keyField]: payload.key }, { ...data, syncedAt: new Date() }, { upsert: true })

        // 记录详细日志
        this.loggerService.info(LogMessages.SYNC.REPLACE_SUCCESS(config.localCollection, payload.key), LogContext.SYNC, {
          operation: 'replace',
          collection: config.localCollection,
          key: payload.key,
          fields: Object.keys(data),
          data: data,
        })
        break
      }

      case 'update': {
        const { _id, ...fields } = filterFields(payload.data, config)
        const updateQuery: any = {
          $set: { ...fields, syncedAt: new Date() },
        }

        // 记录字段变更详情
        const removedFields: string[] = []

        // 只处理配置中允许的移除字段
        if (payload.removedFields?.length) {
          const allowedFields = new Set(config.fields)
          const filteredRemovedFields = payload.removedFields.filter((f: string) => allowedFields.has(f))
          if (filteredRemovedFields.length) {
            updateQuery.$unset = Object.fromEntries(filteredRemovedFields.map((f: string) => [f, '']))
            removedFields.push(...filteredRemovedFields)
          }
        }

        await collection.updateOne({ [keyField]: payload.key }, updateQuery, { upsert: true })

        // 记录详细日志 - 包含修改和删除的字段
        this.loggerService.info(LogMessages.SYNC.UPDATE_SUCCESS(config.localCollection, payload.key), LogContext.SYNC, {
          operation: 'update',
          collection: config.localCollection,
          key: payload.key,
          changedData: fields,
        })
        break
      }

      case 'delete':
        await collection.deleteOne({ [keyField]: payload.key })
        // 记录详细日志
        this.loggerService.info(LogMessages.SYNC.DELETE_SUCCESS(config.localCollection, payload.key), LogContext.SYNC, {
          operation: 'delete',
          collection: config.localCollection,
          key: payload.key,
        })
        break

      default:
        this.loggerService.warn(LogMessages.SYNC.UNSUPPORTED_OPERATION(payload.operation), LogContext.SYNC)
    }
  }
}
