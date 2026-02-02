import { Module } from '@nestjs/common'
import { MongodbModule } from './mongodb/mongodb.module'
import { RedisModule } from './redis/redis.module'

/**
 * 数据库模块（统一入口）
 * 包含 MongoDB 和 Redis 配置
 */
@Module({
  imports: [MongodbModule, RedisModule],
  exports: [MongodbModule, RedisModule],
})
export class DatabaseModule {}
