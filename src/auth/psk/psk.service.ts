import { Injectable, Logger, NotFoundException, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { randomBytes } from 'crypto'
import { Psk, PskDocument } from './schema/psk.schema'
import { LoggerService } from '@/core/logger/logger.service'
import { LogMessages, LogContext } from '@/shared/constants/logger.constants'
import { RedisService } from '@/core/database'
import type { PskMeta } from './types/psk'
import { IPskServiceInterface } from './interface/pskService.interface'

/**
 * PSK认证服务（管理数据库 ↔ Redis 同步）
 *
 * 架构说明：
 * - PskService：负责数据库 CRUD 和 Redis 同步
 * - PskAuthStrategy：从 Redis 加载到内存缓存（用于 TLS 同步回调）
 *
 * 缓存策略：
 * 1. 数据库（MongoDB）- 持久化存储
 * 2. Redis - 分布式缓存（多实例共享，永不过期）
 * 3. MQTT 模块内存缓存 - 用于 TLS pskCallback 同步查询
 *
 * 同步流程：
 * - PSK 生成/确认 → 数据库 → Redis
 * - 定期同步：每 5 分钟从数据库同步到 Redis
 */
@Injectable()
export class PskService implements OnModuleInit, IPskServiceInterface {
  // NestJS 系统日志（用于同步日志）
  private readonly systemLogger = new Logger(PskService.name)
  // Redis 键前缀
  readonly REDIS_PREFIX = 'psk:'

  constructor(
    @InjectModel(Psk.name) private readonly hanqiPskModel: Model<PskDocument>,
    private readonly redis: RedisService,
    private readonly loggerService: LoggerService, // 业务日志（生成、确认等）
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit() {
    // Redis 已由 DatabaseModule 确保连接就绪
    await this.syncFromDatabase()
    // 同步完成后通知 PskAuthStrategy 重新加载
    this.eventEmitter.emit('psk.sync.completed')
  }

  /**
   * 从数据库同步到 Redis
   */
  private async syncFromDatabase() {
    try {
      const allPsks = await this.hanqiPskModel.find().lean()
      const dbIdentities = new Set(allPsks.map(p => p.identity))
      // 更新/新增到 Redis
      for (const psk of allPsks) {
        const meta: PskMeta = { key: psk.key, status: psk.status }
        await this.redis.set(`${this.REDIS_PREFIX}${psk.identity}`, meta, 0)
      }
      // 删除 Redis 中不存在的
      const redisKeys = await this.redis.getClient().keys(`${this.REDIS_PREFIX}*`)
      for (const key of redisKeys) {
        const identity = key.replace(this.REDIS_PREFIX, '')
        if (!dbIdentities.has(identity)) {
          await this.redis.del(key)
          this.loggerService.warn(LogMessages.PSK.REDIS_REMOVED(identity), LogContext.PSK)
        }
      }
      // 使用系统日志（开发日志，只输出到控制台）
      this.systemLogger.log(`PSK sync complete, ${allPsks.length} record(s) in Redis`)
    } catch (error) {
      // 错误日志仍使用业务日志（需要持久化追踪）
      this.loggerService.error(LogMessages.PSK.SYNC_FAILED(error.message), error.stack, LogContext.PSK)
    }
  }

  /**
   * 生成 PSK（同时更新 Redis + 内存）
   */
  async generatePsk(macAddress: string) {
    const existingPsk = await this.hanqiPskModel.findOne({ mac_address: macAddress })
    // 删除旧的 Redis 缓存
    if (existingPsk) {
      await this.redis.del(`${this.REDIS_PREFIX}${existingPsk.identity}`)
    }
    const identity = macAddress
    const key = randomBytes(64).toString('hex')
    // 更新数据库
    await this.hanqiPskModel.findOneAndUpdate(
      { mac_address: macAddress },
      {
        $set: {
          identity,
          key,
          status: 0,
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
      },
    )
    const meta: PskMeta = { key, status: 0 }
    // 同步到 Redis
    await this.redis.set(`${this.REDIS_PREFIX}${identity}`, meta, 0)
    // 发出事件通知内存缓存更新
    this.eventEmitter.emit('psk.updated', { identity })
    this.loggerService.info(LogMessages.PSK.GENERATED(identity, key), LogContext.PSK)
    return { identity, key }
  }

  /**
   * 确认 PSK（更新数据库和 Redis）
   */
  async confirmPsk(macAddress: string) {
    const psk = await this.hanqiPskModel.findOne({ mac_address: macAddress })
    if (!psk) {
      throw new NotFoundException('未找到该MAC地址的PSK记录，请先调用生成接口')
    }
    if (psk.status) {
      return { tip: 'PSK已经确认过' }
    }
    // 更新数据库
    psk.status = 1
    await psk.save()

    const meta: PskMeta = { key: psk.key, status: 1 }
    // 同步到 Redis
    await this.redis.set(`${this.REDIS_PREFIX}${psk.identity}`, meta, 0)
    // 发出事件通知内存缓存更新
    this.eventEmitter.emit('psk.updated', { identity: psk.identity })
    this.loggerService.info(LogMessages.PSK.CONFIRMED(psk.identity), LogContext.PSK)
    return { tip: 'PSK烧录确认成功' }
  }

  /**
   * 获取 Redis 中的 PSK 数量
   */
  async getRedisCount(): Promise<number> {
    const keys = await this.redis.getClient().keys(`${this.REDIS_PREFIX}*`)
    return keys.length
  }

  /**
   * 手动触发同步
   */
  async manualSync() {
    await this.syncFromDatabase()
    return {
      redisCount: await this.getRedisCount(),
    }
  }

  /**
   * 清空所有 PSK 缓存
   */
  async clearAllCache() {
    await this.redis.delByPattern(`${this.REDIS_PREFIX}*`)
    this.loggerService.warn(LogMessages.PSK.CACHE_CLEARED(), LogContext.PSK)
  }
}
