import { registerAs } from '@nestjs/config'

/**
 * MongoDB 数据库配置
 */
const mongodbConfig = registerAs('mongodb', () => ({
  host: process.env.MONGO_HOST ?? '',
  options: {
    dbName: 'host_timer',
    maxPoolSize: 10, // 连接池中最大连接数
    serverSelectionTimeoutMS: 5000, // 服务器选择超时时间（毫秒）
    socketTimeoutMS: 45000, // Socket 操作超时时间（毫秒）
    connectTimeoutMS: 10000, // 连接建立超时时间（毫秒）
    bufferCommands: false, // 是否缓冲数据库命令
  },
}))

/**
 * Redis 缓存配置
 */
const redisConfig = registerAs('redis', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  ttl: parseInt(process.env.REDIS_TTL || '3600', 10), // 默认缓存时间（秒）
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  // 连接重试策略
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000)
    return delay
  },
}))

export { mongodbConfig, redisConfig }
