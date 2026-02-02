# Database 模块重构总结

## ✅ 完成的工作

### 1. 目录结构重构

**之前的结构：**
```
src/core/
└── config/
    └── database.config.ts  ❌ 只有 MongoDB 配置
```

**重构后的结构：**
```
src/core/
└── database/
    ├── config/
    │   └── database.config.ts      ✅ 统一配置（MongoDB + Redis）
    ├── mongodb/
    │   └── mongodb.module.ts       ✅ MongoDB 模块封装
    ├── redis/
    │   ├── redis.module.ts         ✅ Redis 模块
    │   └── redis.service.ts        ✅ Redis 服务（350+ 行完整实现）
    ├── database.module.ts          ✅ 统一入口
    ├── index.ts                    ✅ 导出文件
    └── USAGE_EXAMPLE.md            ✅ 使用文档
```

### 2. 集成 Redis

#### 安装的依赖
```bash
pnpm add ioredis
```

#### Redis 服务功能
- ✅ 基础操作（set, get, del, exists, expire, ttl）
- ✅ Hash 操作（hset, hget, hgetall, hdel）
- ✅ Set 操作（sadd, srem, smembers, sismember）
- ✅ Sorted Set 操作（zadd, zrangebyscore, zrem）
- ✅ 分布式锁（acquireLock, releaseLock）
- ✅ 发布订阅（publish, subscribe）
- ✅ 自动重连机制
- ✅ JSON 序列化/反序列化
- ✅ 完整的类型支持

### 3. 更新的文件

#### 新增文件
- `src/core/database/config/database.config.ts` - 统一配置
- `src/core/database/mongodb/mongodb.module.ts` - MongoDB 模块
- `src/core/database/redis/redis.module.ts` - Redis 模块
- `src/core/database/redis/redis.service.ts` - Redis 服务
- `src/core/database/database.module.ts` - 统一入口
- `src/core/database/index.ts` - 导出文件
- `src/core/database/USAGE_EXAMPLE.md` - 使用文档

#### 修改的文件
- `src/app.module.ts` - 更新数据库模块引用
- `src/shared/constants/logger.constants.ts` - 添加 DATABASE 和 REDIS 日志上下文
- `.env.development` - 添加 Redis 配置
- `.env.production` - 添加 Redis 配置

#### 删除的文件
- `src/core/config/database.config.ts` - 已迁移到 `src/core/database/config/database.config.ts`

### 4. 环境变量配置

在 `.env.development` 和 `.env.production` 中添加了：

```env
# MongoDB（原有）
MONGO_HOST=mongodb://...

# Redis（新增）
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_TTL=3600
```

### 5. 模块导入方式

**app.module.ts 中的配置：**

```typescript
import { DatabaseModule } from './core/database/database.module'
import { mongodbConfig, redisConfig } from '@/core/database'

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [mongodbConfig, redisConfig, mqttConfig],
    }),
    DatabaseModule,  // 包含 MongoDB + Redis
    // ...
  ],
})
```

## 🚀 如何使用 Redis

### 在任意服务中注入 RedisService

```typescript
import { Injectable } from '@nestjs/common'
import { RedisService } from '@/core/database'

@Injectable()
export class YourService {
  constructor(private readonly redis: RedisService) {}

  async example() {
    // 设置缓存
    await this.redis.set('key', { data: 'value' }, 60)

    // 获取缓存
    const value = await this.redis.get('key')

    // 删除缓存
    await this.redis.del('key')
  }
}
```

### 常见使用场景

1. **设备在线状态管理**
   ```typescript
   await this.redis.sadd('online_devices', deviceId)
   const isOnline = await this.redis.sismember('online_devices', deviceId)
   ```

2. **天气数据缓存**
   ```typescript
   await this.redis.set('weather:location', weatherData, 3600)
   ```

3. **分布式锁**
   ```typescript
   const acquired = await this.redis.acquireLock('resource:1', 10)
   if (acquired) {
     try {
       // 业务逻辑
     } finally {
       await this.redis.releaseLock('resource:1')
     }
   }
   ```

4. **用户会话管理**
   ```typescript
   await this.redis.hset('session:123', 'userId', 'user1')
   const session = await this.redis.hgetall('session:123')
   ```

## 📋 下一步建议

### 1. 安装和配置 Redis 服务器

#### 开发环境（本地）
- **Windows**: 下载 [Redis for Windows](https://github.com/tporadowski/redis/releases)
- **macOS**: `brew install redis` 然后 `brew services start redis`
- **Linux**: `sudo apt-get install redis-server`

#### 生产环境
- 使用云服务：AWS ElastiCache, Azure Cache for Redis, 或 Upstash
- 或自行部署 Redis 服务器

### 2. 更新 .env 配置

确保 `.env.development` 和 `.env.production` 中的 Redis 配置正确：

```env
REDIS_HOST=your_redis_host
REDIS_PORT=6379
REDIS_PASSWORD=your_password  # 如果有密码
```

### 3. 开始使用

项目已经编译成功，可以直接使用：

```bash
# 启动开发环境
pnpm run start:dev

# 启动生产环境
pnpm run start:prod
```

## 🎯 实现水阀控制的下一步

基于现在的 Redis 集成，你可以：

1. **缓存设备在线状态** - 用 Set 存储在线设备列表
2. **缓存天气数据** - 用 Hash 存储天气信息（1小时过期）
3. **实现定时任务调度** - 接下来安装 Bull (基于 Redis)
4. **缓存浇水历史** - 用 Sorted Set 存储最近的浇水记录
5. **实时状态推送** - 用 Redis Pub/Sub 实现 WebSocket 广播

## ✨ 关键优势

1. **清晰的模块化结构** - database 相关代码集中管理
2. **统一的配置文件** - MongoDB 和 Redis 配置在一个文件中
3. **类型安全** - 完整的 TypeScript 类型支持
4. **易于扩展** - 未来添加其他数据库只需在 database 目录下新增模块
5. **生产就绪** - 包含自动重连、错误处理、日志记录

## 📚 参考文档

- `src/core/database/USAGE_EXAMPLE.md` - 详细使用示例
- [ioredis 官方文档](https://github.com/redis/ioredis)
- [Redis 命令参考](https://redis.io/commands/)

---

重构完成！现在项目拥有完整的 MongoDB + Redis 支持，可以开始实现水阀控制的核心功能了。🎉
