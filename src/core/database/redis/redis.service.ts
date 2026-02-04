import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Redis from 'ioredis'
import { LogContext, LogMessages } from '@/shared/constants/logger.constants'

/**
 * Redis 服务
 * 提供 Redis 缓存操作的封装
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis
  private isConnected = false
  private logger = new Logger(RedisService.name)
  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.connect()
  }

  async onModuleDestroy() {
    await this.disconnect()
  }

  /**
   * 连接 Redis（等待连接成功后返回）
   */
  private async connect() {
    return new Promise<void>((resolve, reject) => {
      try {
        const redisConfig = this.configService.get('redis')

        this.client = new Redis({
          host: redisConfig.host,
          port: redisConfig.port,
          password: redisConfig.password,
          db: redisConfig.db,
          maxRetriesPerRequest: redisConfig.maxRetriesPerRequest,
          enableReadyCheck: redisConfig.enableReadyCheck,
          retryStrategy: redisConfig.retryStrategy,
        })

        // 连接成功（ready 表示可以执行命令了）
        this.client.on('ready', () => {
          this.isConnected = true
          // 使用 NestJS 系统日志（开发日志）
          this.logger.log('Redis connected successfully')
          resolve()
        })

        this.client.on('error', err => {
          this.isConnected = false
          // 错误日志（开发调试用）
          this.logger.error(`Redis connection error: ${err.message}`, err.stack)
          // 首次连接失败时 reject
          if (!this.isConnected) {
            reject(err)
          }
        })

        this.client.on('close', () => {
          this.isConnected = false
          // 断开连接警告（开发调试用）
          this.logger.warn('Redis 连接已关闭')
        })

        this.client.on('reconnecting', () => {
          // 重连日志（开发调试用）
          this.logger.log('Redis 正在重连...')
        })
      } catch (error) {
        this.logger.error(LogMessages.REDIS.INIT_FAILED(error.message), error.stack, LogContext.REDIS)
        reject(error)
      }
    })
  }

  /**
   * 断开 Redis 连接
   */
  private async disconnect() {
    if (this.client) {
      await this.client.quit()
      this.logger.log(LogMessages.REDIS.DISCONNECT(), LogContext.REDIS)
    }
  }

  /**
   * 获取 Redis 客户端实例
   */
  getClient(): Redis {
    if (!this.isConnected) {
      throw new Error('Redis 未连接')
    }
    return this.client
  }

  /**
   * 检查连接状态
   */
  isReady(): boolean {
    return this.isConnected && this.client.status === 'ready'
  }

  /**
   * 设置缓存（带过期时间）
   * @param key 键
   * @param value 值
   * @param ttl 过期时间（秒），默认使用配置的 TTL
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value)
    const expireTime = ttl || this.configService.get('redis').ttl
    await this.client.setex(key, expireTime, stringValue)
  }

  /**
   * 获取缓存
   * @param key 键
   * @returns 值（自动解析 JSON）
   */
  async get<T = any>(key: string): Promise<T | null> {
    const value = await this.client.get(key)
    if (!value) return null

    try {
      return JSON.parse(value) as T
    } catch {
      return value as T
    }
  }

  /**
   * 删除缓存
   * @param key 键
   */
  async del(key: string): Promise<void> {
    await this.client.del(key)
  }

  /**
   * 批量删除缓存（支持通配符）
   * @param pattern 匹配模式（如 'user:*'）
   */
  async delByPattern(pattern: string): Promise<void> {
    const keys = await this.client.keys(pattern)
    if (keys.length > 0) {
      await this.client.del(...keys)
    }
  }

  /**
   * 检查键是否存在
   * @param key 键
   */
  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key)
    return result === 1
  }

  /**
   * 设置过期时间
   * @param key 键
   * @param ttl 过期时间（秒）
   */
  async expire(key: string, ttl: number): Promise<void> {
    await this.client.expire(key, ttl)
  }

  /**
   * 获取剩余过期时间
   * @param key 键
   * @returns 剩余秒数（-1 表示永不过期，-2 表示不存在）
   */
  async ttl(key: string): Promise<number> {
    return await this.client.ttl(key)
  }

  // ========== Hash 操作 ==========

  /**
   * 设置 Hash 字段
   */
  async hset(key: string, field: string, value: any): Promise<void> {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value)
    await this.client.hset(key, field, stringValue)
  }

  /**
   * 获取 Hash 字段
   */
  async hget<T = any>(key: string, field: string): Promise<T | null> {
    const value = await this.client.hget(key, field)
    if (!value) return null

    try {
      return JSON.parse(value) as T
    } catch {
      return value as T
    }
  }

  /**
   * 获取整个 Hash
   */
  async hgetall<T = any>(key: string): Promise<T | null> {
    const value = await this.client.hgetall(key)
    if (!value || Object.keys(value).length === 0) return null

    // 尝试解析每个字段的 JSON
    const parsed: any = {}
    for (const [field, val] of Object.entries(value)) {
      try {
        parsed[field] = JSON.parse(val)
      } catch {
        parsed[field] = val
      }
    }
    return parsed as T
  }

  /**
   * 删除 Hash 字段
   */
  async hdel(key: string, field: string): Promise<void> {
    await this.client.hdel(key, field)
  }

  // ========== Set 操作 ==========

  /**
   * 添加到集合
   */
  async sadd(key: string, ...members: string[]): Promise<void> {
    await this.client.sadd(key, ...members)
  }

  /**
   * 从集合中移除
   */
  async srem(key: string, ...members: string[]): Promise<void> {
    await this.client.srem(key, ...members)
  }

  /**
   * 获取集合所有成员
   */
  async smembers(key: string): Promise<string[]> {
    return await this.client.smembers(key)
  }

  /**
   * 检查是否是集合成员
   */
  async sismember(key: string, member: string): Promise<boolean> {
    const result = await this.client.sismember(key, member)
    return result === 1
  }

  // ========== Sorted Set 操作 ==========

  /**
   * 添加到有序集合
   */
  async zadd(key: string, score: number, member: string): Promise<void> {
    await this.client.zadd(key, score, member)
  }

  /**
   * 获取有序集合范围（按分数）
   */
  async zrangebyscore(key: string, min: number, max: number): Promise<string[]> {
    return await this.client.zrangebyscore(key, min, max)
  }

  /**
   * 从有序集合中移除
   */
  async zrem(key: string, member: string): Promise<void> {
    await this.client.zrem(key, member)
  }

  // ========== 分布式锁 ==========

  /**
   * 获取分布式锁
   * @param key 锁的键
   * @param ttl 锁的过期时间（秒）
   * @returns 是否成功获取锁
   */
  async acquireLock(key: string, ttl: number = 10): Promise<boolean> {
    const lockKey = `lock:${key}`
    const result = await this.client.set(lockKey, '1', 'EX', ttl, 'NX')
    return result === 'OK'
  }

  /**
   * 释放分布式锁
   * @param key 锁的键
   */
  async releaseLock(key: string): Promise<void> {
    const lockKey = `lock:${key}`
    await this.client.del(lockKey)
  }

  // ========== 发布订阅 ==========

  /**
   * 发布消息
   */
  async publish(channel: string, message: string): Promise<void> {
    await this.client.publish(channel, message)
  }

  /**
   * 订阅频道
   */
  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    const subscriber = this.client.duplicate()
    await subscriber.subscribe(channel)
    subscriber.on('message', (ch, msg) => {
      if (ch === channel) {
        callback(msg)
      }
    })
  }
}
