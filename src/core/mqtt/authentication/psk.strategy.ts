import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { IAuthStrategy } from '../types/mqtt.type'
import { PskService } from '@/auth/psk/psk.service'
import { LoggerService } from '@/core/logger/logger.service'
import { MqttClient } from '../types/mqtt.type'
import { LogMessages, LogContext } from '@/shared/constants/logger.constants'
import { RedisService } from '@/core/database'
import type { PskMeta } from '@/auth/psk/types/psk'

/**
 * PSK 认证策略（从 Redis 加载到内存缓存）
 *
 * 为什么需要内存缓存：
 * - TLS 的 pskCallback 必须是同步函数，不能使用 async/await
 * - Redis 查询是异步的，无法在 pskCallback 中使用
 * - 因此需要从 Redis 加载到内存 Map，提供同步查询
 * 同步策略：
 * - 启动时：从 Redis 加载到内存
 * - 定期同步：每 5 分钟从 Redis 同步（与 PskService 同步频率一致）
 */
@Injectable()
export class PskAuthStrategy implements IAuthStrategy, OnModuleInit {
  // 内存缓存（用于 TLS pskCallback 同步查询）
  private localCache = new Map<string, PskMeta>()

  constructor(
    private psk: PskService,
    private redis: RedisService,
    private logger: LoggerService, // 业务日志（认证失败等）
  ) {}

  async onModuleInit() {
    await this.loadFromRedis() // 标记为初始加载
  }

  /**
   * 从 Redis 加载到内存缓存
   */
  private async loadFromRedis() {
    try {
      const keys = await this.redis.getClient().keys(`${this.psk.REDIS_PREFIX}*`)
      this.localCache.clear()
      for (const key of keys) {
        const identity = key.replace(this.psk.REDIS_PREFIX, '')
        const meta = await this.redis.get<PskMeta>(key)
        if (meta) {
          this.localCache.set(identity, meta)
        }
      }
    } catch (error) {
      // 错误日志仍使用业务日志（需要持久化追踪）
      this.logger.error(LogMessages.PSK.LOAD_FROM_REDIS_FAILED(error.message), error.stack, LogContext.MQTT_AUTH)
    }
  }

  async validate(client: MqttClient): Promise<boolean> {
    const id = client.pskIdentity!
    // 从内存缓存检查 PSK 是否存在且已激活（同步）
    const meta = this.localCache.get(id)
    const exists = !!meta
    const isActive = meta?.status === 1

    if (!exists || !isActive) {
      this.logger.warn(LogMessages.PSK.AUTH_FAILED_DETAIL(client.id, id, exists, isActive, this.localCache.size), LogContext.MQTT_AUTH)
      return false
    }

    return true
  }

  /**
   * 获取 PSK 密钥（同步方法，用于 TLS pskCallback）
   */
  getPskKey(identity: string): Buffer | null {
    try {
      // 从内存缓存获取密钥（同步）
      const meta = this.localCache.get(identity)
      const key = meta?.key
      if (!key) {
        this.logger.warn(LogMessages.PSK.KEY_NOT_FOUND(identity, this.localCache.size, ''), LogContext.MQTT_AUTH)
        return null
      }
      this.logger.info(LogMessages.PSK.KEY_FOUND(identity), LogContext.MQTT_AUTH)
      return Buffer.from(key, 'hex')
    } catch (error) {
      this.logger.error(LogMessages.PSK.KEY_ERROR(identity, String(error)), LogContext.MQTT_AUTH)
      return null
    }
  }
}
