# Redis 使用指南 - 智能灌溉系统

本文档详细介绍如何在智能灌溉系统中使用 Redis 的各种操作，包含完整的代码示例和应用场景。

## 📋 目录

- [1. 基础操作](#1-基础操作)
  - [1.1 缓存天气数据](#11-缓存天气数据)
  - [1.2 缓存设备状态](#12-缓存设备状态)
  - [1.3 缓存用户配置](#13-缓存用户配置)
- [2. Hash 操作](#2-hash-操作)
  - [2.1 存储设备详细信息](#21-存储设备详细信息)
  - [2.2 用户会话管理](#22-用户会话管理)
- [3. Set 操作](#3-set-操作)
  - [3.1 在线设备管理](#31-在线设备管理)
  - [3.2 活跃用户列表](#32-活跃用户列表)
- [4. Sorted Set 操作](#4-sorted-set-操作)
  - [4.1 浇水历史记录](#41-浇水历史记录)
  - [4.2 定时任务队列](#42-定时任务队列)
- [5. 分布式锁](#5-分布式锁)
  - [5.1 防止并发浇水](#51-防止并发浇水)
  - [5.2 设备操作互斥](#52-设备操作互斥)
- [6. 发布订阅](#6-发布订阅)
  - [6.1 实时状态推送](#61-实时状态推送)
  - [6.2 设备事件通知](#62-设备事件通知)

---

## 1. 基础操作

基础操作包括 `set`、`get`、`del`、`exists`、`expire`、`ttl`，适用于简单的键值缓存。

### 1.1 缓存天气数据

**场景**：从第三方 API 获取天气数据后缓存 1 小时，避免频繁调用 API。

**代码示例**：

```typescript
// src/modules/weather/weather.service.ts
import { Injectable } from '@nestjs/common'
import { RedisService } from '@/core/database'
import axios from 'axios'

@Injectable()
export class WeatherService {
  constructor(private readonly redis: RedisService) {}

  /**
   * 获取天气数据（带缓存）
   */
  async getWeather(location: string) {
    const cacheKey = `weather:${location}`

    // 1. 先查缓存
    const cached = await this.redis.get<WeatherData>(cacheKey)
    if (cached) {
      console.log('✅ 从缓存获取天气数据')
      return cached
    }

    // 2. 缓存未命中，调用第三方 API
    console.log('🌐 调用天气 API')
    const weather = await this.fetchWeatherFromAPI(location)

    // 3. 缓存 1 小时（3600 秒）
    await this.redis.set(cacheKey, weather, 3600)

    return weather
  }

  /**
   * 清除指定位置的天气缓存
   */
  async clearWeatherCache(location: string) {
    const cacheKey = `weather:${location}`
    await this.redis.del(cacheKey)
  }

  /**
   * 检查天气缓存是否存在
   */
  async hasWeatherCache(location: string): Promise<boolean> {
    const cacheKey = `weather:${location}`
    return await this.redis.exists(cacheKey)
  }

  /**
   * 获取天气缓存剩余时间
   */
  async getWeatherCacheTTL(location: string): Promise<number> {
    const cacheKey = `weather:${location}`
    return await this.redis.ttl(cacheKey) // 返回剩余秒数
  }

  /**
   * 延长天气缓存时间
   */
  async extendWeatherCache(location: string, ttl: number = 3600) {
    const cacheKey = `weather:${location}`
    await this.redis.expire(cacheKey, ttl)
  }

  private async fetchWeatherFromAPI(location: string): Promise<WeatherData> {
    // 调用第三方天气 API（示例：OpenWeatherMap）
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather`,
      {
        params: {
          q: location,
          appid: process.env.WEATHER_API_KEY,
          units: 'metric',
        },
      }
    )

    return {
      location,
      temperature: response.data.main.temp,
      humidity: response.data.main.humidity,
      condition: response.data.weather[0].main,
      description: response.data.weather[0].description,
      timestamp: Date.now(),
    }
  }
}

interface WeatherData {
  location: string
  temperature: number
  humidity: number
  condition: string
  description: string
  timestamp: number
}
```

**使用示例**：

```typescript
// 在 Controller 中使用
@Get('/weather/:location')
async getWeather(@Param('location') location: string) {
  const weather = await this.weatherService.getWeather(location)

  // 获取缓存剩余时间
  const ttl = await this.weatherService.getWeatherCacheTTL(location)

  return {
    ...weather,
    cacheExpireIn: ttl, // 缓存还剩多少秒
  }
}
```

---

### 1.2 缓存设备状态

**场景**：缓存设备的最后一次上报状态，避免频繁查询数据库。

**代码示例**：

```typescript
// src/modules/timer/timer.service.ts
import { Injectable } from '@nestjs/common'
import { RedisService } from '@/core/database'

@Injectable()
export class TimerService {
  constructor(private readonly redis: RedisService) {}

  /**
   * 缓存设备状态（5 分钟过期）
   */
  async cacheDeviceStatus(timerId: string, status: DeviceStatus) {
    const cacheKey = `device:status:${timerId}`
    await this.redis.set(cacheKey, status, 300) // 5 分钟
  }

  /**
   * 获取设备状态（优先缓存）
   */
  async getDeviceStatus(timerId: string): Promise<DeviceStatus | null> {
    const cacheKey = `device:status:${timerId}`

    // 先从缓存获取
    const cached = await this.redis.get<DeviceStatus>(cacheKey)
    if (cached) {
      return cached
    }

    // 缓存未命中，从数据库查询
    const device = await this.timerModel.findOne({ timerId })
    if (!device) return null

    const status: DeviceStatus = {
      timerId: device.timerId,
      name: device.name,
      online: device.online,
      battery_level: device.battery_level,
      signal_strength: device.signal_strength,
      last_seen: device.last_seen,
    }

    // 缓存起来
    await this.cacheDeviceStatus(timerId, status)

    return status
  }

  /**
   * 删除设备状态缓存（设备更新时调用）
   */
  async clearDeviceStatusCache(timerId: string) {
    const cacheKey = `device:status:${timerId}`
    await this.redis.del(cacheKey)
  }

  /**
   * 批量删除设备缓存（支持通配符）
   */
  async clearAllDeviceStatusCache() {
    await this.redis.delByPattern('device:status:*')
  }
}

interface DeviceStatus {
  timerId: string
  name: string
  online: number
  battery_level: number
  signal_strength: number
  last_seen: Date
}
```

---

### 1.3 缓存用户配置

**场景**：用户的灌溉偏好设置（通知开关、默认浇水时长等）。

**代码示例**：

```typescript
// src/modules/user/user-preference.service.ts
import { Injectable } from '@nestjs/common'
import { RedisService } from '@/core/database'

@Injectable()
export class UserPreferenceService {
  constructor(private readonly redis: RedisService) {}

  /**
   * 获取用户偏好设置（带缓存）
   */
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    const cacheKey = `user:preferences:${userId}`

    // 查缓存
    const cached = await this.redis.get<UserPreferences>(cacheKey)
    if (cached) return cached

    // 从数据库查询
    const preferences = await this.fetchFromDatabase(userId)

    // 缓存 1 天
    await this.redis.set(cacheKey, preferences, 86400)

    return preferences
  }

  /**
   * 更新用户偏好设置
   */
  async updateUserPreferences(userId: string, preferences: Partial<UserPreferences>) {
    const cacheKey = `user:preferences:${userId}`

    // 1. 更新数据库
    await this.updateDatabase(userId, preferences)

    // 2. 更新缓存
    const current = await this.getUserPreferences(userId)
    const updated = { ...current, ...preferences }
    await this.redis.set(cacheKey, updated, 86400)
  }

  private async fetchFromDatabase(userId: string): Promise<UserPreferences> {
    // 从 MongoDB 查询
    return {
      userId,
      notificationEnabled: true,
      defaultWateringDuration: 600,
      weatherSkipEnabled: true,
      language: 'zh-CN',
    }
  }

  private async updateDatabase(userId: string, preferences: Partial<UserPreferences>) {
    // 更新 MongoDB
  }
}

interface UserPreferences {
  userId: string
  notificationEnabled: boolean
  defaultWateringDuration: number
  weatherSkipEnabled: boolean
  language: string
}
```

---

## 2. Hash 操作

Hash 适合存储对象，一个 key 下可以存储多个字段。

### 2.1 存储设备详细信息

**场景**：存储设备的实时数据（流速、水压、剩余时间等），比存储整个 JSON 更节省内存。

**代码示例**：

```typescript
// src/modules/outlet/outlet.service.ts
import { Injectable } from '@nestjs/common'
import { RedisService } from '@/core/database'

@Injectable()
export class OutletService {
  constructor(private readonly redis: RedisService) {}

  /**
   * 缓存出水口实时数据（使用 Hash）
   */
  async cacheOutletData(outletId: string, data: OutletRealtimeData) {
    const hashKey = `outlet:realtime:${outletId}`

    // 使用 Hash 存储多个字段
    await this.redis.hset(hashKey, 'current_status', data.current_status)
    await this.redis.hset(hashKey, 'flow_rate', data.flow_rate)
    await this.redis.hset(hashKey, 'pressure', data.pressure)
    await this.redis.hset(hashKey, 'remaining_time', data.remaining_time)
    await this.redis.hset(hashKey, 'last_update', Date.now())

    // 设置 10 分钟过期
    await this.redis.expire(hashKey, 600)
  }

  /**
   * 获取出水口实时数据
   */
  async getOutletData(outletId: string): Promise<OutletRealtimeData | null> {
    const hashKey = `outlet:realtime:${outletId}`

    // 获取整个 Hash
    const data = await this.redis.hgetall<Record<string, any>>(hashKey)
    if (!data) return null

    return {
      current_status: Number(data.current_status),
      flow_rate: Number(data.flow_rate),
      pressure: Number(data.pressure),
      remaining_time: Number(data.remaining_time),
      last_update: Number(data.last_update),
    }
  }

  /**
   * 获取出水口单个字段
   */
  async getOutletStatus(outletId: string): Promise<number | null> {
    const hashKey = `outlet:realtime:${outletId}`
    const status = await this.redis.hget<number>(hashKey, 'current_status')
    return status
  }

  /**
   * 更新出水口单个字段
   */
  async updateOutletFlowRate(outletId: string, flowRate: number) {
    const hashKey = `outlet:realtime:${outletId}`
    await this.redis.hset(hashKey, 'flow_rate', flowRate)
    await this.redis.hset(hashKey, 'last_update', Date.now())
  }

  /**
   * 删除出水口某个字段
   */
  async clearOutletFlowRate(outletId: string) {
    const hashKey = `outlet:realtime:${outletId}`
    await this.redis.hdel(hashKey, 'flow_rate')
  }
}

interface OutletRealtimeData {
  current_status: number
  flow_rate: number
  pressure: number
  remaining_time: number
  last_update: number
}
```

**优势**：
- 比存储整个 JSON 更节省内存
- 可以单独更新某个字段
- 支持原子操作

---

### 2.2 用户会话管理

**场景**：存储用户登录会话信息。

**代码示例**：

```typescript
// src/modules/auth/session.service.ts
import { Injectable } from '@nestjs/common'
import { RedisService } from '@/core/database'

@Injectable()
export class SessionService {
  constructor(private readonly redis: RedisService) {}

  /**
   * 创建用户会话
   */
  async createSession(userId: string, sessionData: SessionData): Promise<string> {
    const sessionId = this.generateSessionId()
    const hashKey = `session:${sessionId}`

    // 使用 Hash 存储会话数据
    await this.redis.hset(hashKey, 'userId', userId)
    await this.redis.hset(hashKey, 'loginTime', Date.now())
    await this.redis.hset(hashKey, 'ipAddress', sessionData.ipAddress)
    await this.redis.hset(hashKey, 'userAgent', sessionData.userAgent)

    // 会话 2 小时过期
    await this.redis.expire(hashKey, 7200)

    return sessionId
  }

  /**
   * 获取会话信息
   */
  async getSession(sessionId: string): Promise<SessionInfo | null> {
    const hashKey = `session:${sessionId}`
    const data = await this.redis.hgetall<Record<string, any>>(hashKey)

    if (!data) return null

    return {
      sessionId,
      userId: data.userId,
      loginTime: Number(data.loginTime),
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    }
  }

  /**
   * 删除会话（登出）
   */
  async deleteSession(sessionId: string) {
    const hashKey = `session:${sessionId}`
    await this.redis.del(hashKey)
  }

  /**
   * 延长会话时间
   */
  async extendSession(sessionId: string) {
    const hashKey = `session:${sessionId}`
    await this.redis.expire(hashKey, 7200)
  }

  private generateSessionId(): string {
    return `${Date.now()}_${Math.random().toString(36).substring(7)}`
  }
}

interface SessionData {
  ipAddress: string
  userAgent: string
}

interface SessionInfo extends SessionData {
  sessionId: string
  userId: string
  loginTime: number
}
```

---

## 3. Set 操作

Set 适合存储不重复的集合，比如在线设备列表。

### 3.1 在线设备管理

**场景**：实时维护在线设备列表，快速判断设备是否在线。

**代码示例**：

```typescript
// src/modules/gateway/device-online.service.ts
import { Injectable } from '@nestjs/common'
import { RedisService } from '@/core/database'

@Injectable()
export class DeviceOnlineService {
  constructor(private readonly redis: RedisService) {}

  /**
   * 设备上线
   */
  async deviceOnline(deviceId: string) {
    const setKey = 'online_devices'

    // 1. 添加到在线设备集合
    await this.redis.sadd(setKey, deviceId)

    // 2. 记录最后上线时间
    await this.redis.set(`device:${deviceId}:last_seen`, Date.now(), 3600)

    console.log(`✅ 设备上线: ${deviceId}`)
  }

  /**
   * 设备离线
   */
  async deviceOffline(deviceId: string) {
    const setKey = 'online_devices'

    // 1. 从在线设备集合中移除
    await this.redis.srem(setKey, deviceId)

    // 2. 删除最后上线时间
    await this.redis.del(`device:${deviceId}:last_seen`)

    console.log(`❌ 设备离线: ${deviceId}`)
  }

  /**
   * 检查设备是否在线
   */
  async isDeviceOnline(deviceId: string): Promise<boolean> {
    const setKey = 'online_devices'
    return await this.redis.sismember(setKey, deviceId)
  }

  /**
   * 获取所有在线设备
   */
  async getAllOnlineDevices(): Promise<string[]> {
    const setKey = 'online_devices'
    return await this.redis.smembers(setKey)
  }

  /**
   * 获取在线设备数量
   */
  async getOnlineDeviceCount(): Promise<number> {
    const devices = await this.getAllOnlineDevices()
    return devices.length
  }

  /**
   * 批量检查设备是否在线
   */
  async checkDevicesOnline(deviceIds: string[]): Promise<Record<string, boolean>> {
    const result: Record<string, boolean> = {}

    for (const deviceId of deviceIds) {
      result[deviceId] = await this.isDeviceOnline(deviceId)
    }

    return result
  }
}
```

**使用示例**：

```typescript
// 在 Gateway 事件处理中使用
@OnEvent(AppEvents.MQTT_GATEWAY_MESSAGE)
async handleGatewayMessage(message: MqttUnifiedMessage) {
  if (message.msgType === MqttMessageType.HEARTBEAT) {
    // 设备心跳 → 标记为在线
    await this.deviceOnlineService.deviceOnline(message.deviceId)
  }
}

// 在 Controller 中查询
@Get('/devices/online')
async getOnlineDevices(@CurrentUserId() userId: string) {
  const onlineDevices = await this.deviceOnlineService.getAllOnlineDevices()
  const count = await this.deviceOnlineService.getOnlineDeviceCount()

  return {
    devices: onlineDevices,
    total: count,
  }
}
```

---

### 3.2 活跃用户列表

**场景**：记录最近活跃的用户（最近 24 小时内登录过）。

**代码示例**：

```typescript
// src/modules/user/active-user.service.ts
import { Injectable } from '@nestjs/common'
import { RedisService } from '@/core/database'

@Injectable()
export class ActiveUserService {
  constructor(private readonly redis: RedisService) {}

  /**
   * 记录用户活跃
   */
  async recordUserActive(userId: string) {
    const setKey = 'active_users'
    await this.redis.sadd(setKey, userId)

    // 记录活跃时间
    await this.redis.set(`user:${userId}:last_active`, Date.now(), 86400)
  }

  /**
   * 获取活跃用户列表
   */
  async getActiveUsers(): Promise<string[]> {
    const setKey = 'active_users'
    return await this.redis.smembers(setKey)
  }

  /**
   * 检查用户是否活跃
   */
  async isUserActive(userId: string): Promise<boolean> {
    const setKey = 'active_users'
    return await this.redis.sismember(setKey, userId)
  }
}
```

---

## 4. Sorted Set 操作

Sorted Set 用于排序存储，每个成员都有一个分数（score）。

### 4.1 浇水历史记录

**场景**：存储最近的浇水记录，按时间戳排序，方便查询最近 N 条记录。

**代码示例**：

```typescript
// src/modules/history/watering-history.service.ts
import { Injectable } from '@nestjs/common'
import { RedisService } from '@/core/database'

@Injectable()
export class WateringHistoryService {
  constructor(private readonly redis: RedisService) {}

  /**
   * 记录浇水历史（使用 Sorted Set）
   */
  async recordWatering(outletId: string, duration: number) {
    const zsetKey = `watering:history:${outletId}`
    const timestamp = Date.now()

    // 使用时间戳作为 score，历史记录作为 member
    const record = JSON.stringify({
      outletId,
      duration,
      startTime: timestamp,
    })

    await this.redis.zadd(zsetKey, timestamp, record)

    // 只保留最近 100 条记录
    await this.trimWateringHistory(outletId, 100)
  }

  /**
   * 获取最近的浇水记录
   */
  async getRecentWateringHistory(outletId: string, limit: number = 10): Promise<WateringRecord[]> {
    const zsetKey = `watering:history:${outletId}`

    // 获取最近的记录（按时间戳降序）
    const records = await this.redis.getClient().zrevrange(zsetKey, 0, limit - 1)

    return records.map(record => JSON.parse(record))
  }

  /**
   * 获取指定时间范围的浇水记录
   */
  async getWateringHistoryByTimeRange(
    outletId: string,
    startTime: number,
    endTime: number
  ): Promise<WateringRecord[]> {
    const zsetKey = `watering:history:${outletId}`

    // 按时间范围查询
    const records = await this.redis.zrangebyscore(zsetKey, startTime, endTime)

    return records.map(record => JSON.parse(record))
  }

  /**
   * 删除指定的浇水记录
   */
  async deleteWateringRecord(outletId: string, recordJson: string) {
    const zsetKey = `watering:history:${outletId}`
    await this.redis.zrem(zsetKey, recordJson)
  }

  /**
   * 清理旧记录，只保留最近 N 条
   */
  private async trimWateringHistory(outletId: string, maxRecords: number) {
    const zsetKey = `watering:history:${outletId}`
    const client = this.redis.getClient()

    // 获取记录总数
    const count = await client.zcard(zsetKey)

    // 如果超过限制，删除最旧的记录
    if (count > maxRecords) {
      const removeCount = count - maxRecords
      await client.zremrangebyrank(zsetKey, 0, removeCount - 1)
    }
  }
}

interface WateringRecord {
  outletId: string
  duration: number
  startTime: number
}
```

**使用示例**：

```typescript
// 记录浇水
await this.wateringHistoryService.recordWatering('OUTLET_001', 600)

// 获取最近 10 条记录
const recent = await this.wateringHistoryService.getRecentWateringHistory('OUTLET_001', 10)

// 获取今天的浇水记录
const todayStart = new Date().setHours(0, 0, 0, 0)
const todayEnd = Date.now()
const todayRecords = await this.wateringHistoryService.getWateringHistoryByTimeRange(
  'OUTLET_001',
  todayStart,
  todayEnd
)
```

---

### 4.2 定时任务队列

**场景**：按执行时间排序的定时任务队列。

**代码示例**：

```typescript
// src/modules/schedule/schedule-queue.service.ts
import { Injectable } from '@nestjs/common'
import { RedisService } from '@/core/database'

@Injectable()
export class ScheduleQueueService {
  constructor(private readonly redis: RedisService) {}

  /**
   * 添加定时任务到队列
   */
  async addScheduleToQueue(scheduleId: string, executeTime: number) {
    const zsetKey = 'schedule:queue'

    // 使用执行时间作为 score
    await this.redis.zadd(zsetKey, executeTime, scheduleId)
  }

  /**
   * 获取需要执行的任务（当前时间之前的所有任务）
   */
  async getPendingSchedules(): Promise<string[]> {
    const zsetKey = 'schedule:queue'
    const now = Date.now()

    // 获取 score <= 当前时间的所有任务
    return await this.redis.zrangebyscore(zsetKey, 0, now)
  }

  /**
   * 移除已执行的任务
   */
  async removeScheduleFromQueue(scheduleId: string) {
    const zsetKey = 'schedule:queue'
    await this.redis.zrem(zsetKey, scheduleId)
  }

  /**
   * 获取队列中的任务数量
   */
  async getQueueSize(): Promise<number> {
    const zsetKey = 'schedule:queue'
    const client = this.redis.getClient()
    return await client.zcard(zsetKey)
  }
}
```

---

## 5. 分布式锁

防止多个进程或请求同时操作同一资源。

### 5.1 防止并发浇水

**场景**：同一个出水口不能同时被多个用户启动浇水。

**代码示例**：

```typescript
// src/modules/outlet/outlet.service.ts
import { Injectable, ConflictException } from '@nestjs/common'
import { RedisService } from '@/core/database'

@Injectable()
export class OutletService {
  constructor(
    private readonly redis: RedisService,
    private readonly commandSender: CommandSenderService,
  ) {}

  /**
   * 手动浇水（使用分布式锁）
   */
  async startManualWatering(outletId: string, duration: number) {
    // 尝试获取锁（锁有效期 10 秒）
    const locked = await this.redis.acquireLock(`watering:${outletId}`, 10)

    if (!locked) {
      throw new ConflictException('该出水口正在浇水，请稍后再试')
    }

    try {
      // 执行浇水操作
      console.log(`🚿 开始浇水: ${outletId}, 时长: ${duration}秒`)

      // 1. 检查出水口状态
      const outlet = await this.outletModel.findOne({ outletId })
      if (!outlet) {
        throw new NotFoundException('出水口不存在')
      }

      if (outlet.current_status === 1) {
        throw new ConflictException('出水口已在浇水中')
      }

      // 2. 发送 MQTT 命令
      await this.commandSender.startWatering(outletId, duration)

      // 3. 更新数据库
      await this.outletModel.updateOne(
        { outletId },
        {
          $set: {
            current_status: 1,
            remaining_time: duration,
          },
        }
      )

      // 4. 发出事件
      this.eventEmitter.emit(AppEvents.WATERING_STARTED, {
        outletId,
        duration,
        startTime: Date.now(),
      })

      return { success: true, message: '浇水已启动' }
    } finally {
      // 释放锁（无论成功还是失败）
      await this.redis.releaseLock(`watering:${outletId}`)
    }
  }

  /**
   * 停止浇水
   */
  async stopWatering(outletId: string) {
    // 同样需要加锁
    const locked = await this.redis.acquireLock(`watering:${outletId}`, 10)

    if (!locked) {
      throw new ConflictException('操作冲突，请稍后重试')
    }

    try {
      // 发送停止命令
      await this.commandSender.stopWatering(outletId)

      // 更新数据库
      await this.outletModel.updateOne(
        { outletId },
        {
          $set: {
            current_status: 0,
            remaining_time: 0,
          },
        }
      )

      return { success: true, message: '浇水已停止' }
    } finally {
      await this.redis.releaseLock(`watering:${outletId}`)
    }
  }
}
```

**重要提示**：
- 锁会自动过期（防止死锁）
- **必须在 finally 块中释放锁**，确保异常时也能释放
- 锁的有效期要大于操作耗时

---

### 5.2 设备操作互斥

**场景**：同一个网关不能同时进行多个操作（重启、升级、配对等）。

**代码示例**：

```typescript
// src/modules/gateway/gateway.service.ts
import { Injectable, ConflictException } from '@nestjs/common'
import { RedisService } from '@/core/database'

@Injectable()
export class GatewayService {
  constructor(private readonly redis: RedisService) {}

  /**
   * 重启网关（使用分布式锁）
   */
  async rebootGateway(gatewayId: string) {
    const locked = await this.redis.acquireLock(`gateway:operation:${gatewayId}`, 30)

    if (!locked) {
      throw new ConflictException('网关正在执行其他操作，请稍后再试')
    }

    try {
      console.log(`🔄 重启网关: ${gatewayId}`)

      // 发送重启命令
      await this.commandSender.rebootGateway(gatewayId)

      return { success: true, message: '网关重启命令已发送' }
    } finally {
      await this.redis.releaseLock(`gateway:operation:${gatewayId}`)
    }
  }

  /**
   * 开启配对模式
   */
  async startPairing(gatewayId: string) {
    const locked = await this.redis.acquireLock(`gateway:operation:${gatewayId}`, 30)

    if (!locked) {
      throw new ConflictException('网关正在执行其他操作，请稍后再试')
    }

    try {
      console.log(`📡 开启配对模式: ${gatewayId}`)

      // 发送配对命令
      await this.commandSender.startPairing(gatewayId)

      return { success: true, message: '配对模式已开启' }
    } finally {
      await this.redis.releaseLock(`gateway:operation:${gatewayId}`)
    }
  }
}
```

---

## 6. 发布订阅

Pub/Sub 用于实时消息推送，适合 WebSocket 广播。

### 6.1 实时状态推送

**场景**：设备状态变化时，实时推送给所有连接的客户端。

**代码示例**：

```typescript
// src/modules/realtime/realtime.service.ts
import { Injectable } from '@nestjs/common'
import { RedisService } from '@/core/database'

@Injectable()
export class RealtimeService {
  constructor(private readonly redis: RedisService) {}

  /**
   * 发布设备状态变化
   */
  async publishDeviceStatus(deviceId: string, status: any) {
    const channel = `device:status:${deviceId}`
    const message = JSON.stringify({
      deviceId,
      status,
      timestamp: Date.now(),
    })

    await this.redis.publish(channel, message)
  }

  /**
   * 订阅设备状态变化
   */
  async subscribeDeviceStatus(deviceId: string, callback: (status: any) => void) {
    const channel = `device:status:${deviceId}`

    await this.redis.subscribe(channel, (message) => {
      const data = JSON.parse(message)
      callback(data.status)
    })
  }

  /**
   * 发布全局消息（所有用户）
   */
  async publishGlobalMessage(message: string) {
    await this.redis.publish('global:notifications', message)
  }
}
```

**WebSocket Gateway 集成**：

```typescript
// src/modules/realtime/realtime.gateway.ts
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets'
import { Server } from 'socket.io'
import { RedisService } from '@/core/database'

@WebSocketGateway({ cors: true })
export class RealtimeGateway {
  @WebSocketServer()
  server: Server

  constructor(private readonly redis: RedisService) {
    this.subscribeToDeviceEvents()
  }

  /**
   * 订阅 Redis 消息并广播给 WebSocket 客户端
   */
  private async subscribeToDeviceEvents() {
    // 订阅所有设备状态变化
    await this.redis.subscribe('device:status:*', (message) => {
      const data = JSON.parse(message)

      // 广播给所有连接的客户端
      this.server.emit('device_status_changed', data)
    })

    // 订阅浇水事件
    await this.redis.subscribe('watering:events', (message) => {
      const data = JSON.parse(message)
      this.server.emit('watering_event', data)
    })
  }
}
```

---

### 6.2 设备事件通知

**场景**：设备离线、故障等事件实时通知给用户。

**代码示例**：

```typescript
// src/modules/notification/notification.service.ts
import { Injectable } from '@nestjs/common'
import { RedisService } from '@/core/database'
import { OnEvent } from '@nestjs/event-emitter'
import { AppEvents } from '@/shared/constants/events.constants'

@Injectable()
export class NotificationService {
  constructor(private readonly redis: RedisService) {}

  /**
   * 监听设备离线事件
   */
  @OnEvent(AppEvents.DEVICE_OFFLINE)
  async handleDeviceOffline(event: { deviceId: string; userId: string }) {
    // 发布设备离线通知
    const channel = `user:${event.userId}:notifications`
    const message = JSON.stringify({
      type: 'device_offline',
      deviceId: event.deviceId,
      message: `设备 ${event.deviceId} 已离线`,
      timestamp: Date.now(),
    })

    await this.redis.publish(channel, message)
  }

  /**
   * 监听浇水完成事件
   */
  @OnEvent(AppEvents.WATERING_COMPLETED)
  async handleWateringCompleted(event: { outletId: string; userId: string; duration: number }) {
    const channel = `user:${event.userId}:notifications`
    const message = JSON.stringify({
      type: 'watering_completed',
      outletId: event.outletId,
      duration: event.duration,
      message: `浇水完成，用时 ${event.duration} 秒`,
      timestamp: Date.now(),
    })

    await this.redis.publish(channel, message)
  }
}
```

---

## 📊 性能优化建议

### 1. 键命名规范

```typescript
// ✅ 好的命名
'device:status:TIMER_001'
'weather:beijing'
'user:session:abc123'
'watering:history:OUTLET_001'

// ❌ 不好的命名
'timer001status'
'beijingweather'
'session_abc123'
```

### 2. 合理设置 TTL

```typescript
// 短期数据（实时状态）
await this.redis.set('device:status:xxx', data, 300) // 5 分钟

// 中期数据（天气、配置）
await this.redis.set('weather:xxx', data, 3600) // 1 小时

// 长期数据（用户偏好）
await this.redis.set('user:preferences:xxx', data, 86400) // 1 天
```

### 3. 避免大 key

```typescript
// ❌ 不要把所有设备存在一个 key 里
await this.redis.set('all_devices', { device1: {}, device2: {}, ... })

// ✅ 每个设备一个 key
await this.redis.set('device:status:TIMER_001', {})
await this.redis.set('device:status:TIMER_002', {})
```

### 4. 批量操作

```typescript
// ❌ 低效
for (const deviceId of deviceIds) {
  await this.redis.set(`device:${deviceId}`, data)
}

// ✅ 高效（使用 pipeline）
const pipeline = this.redis.getClient().pipeline()
for (const deviceId of deviceIds) {
  pipeline.set(`device:${deviceId}`, JSON.stringify(data))
}
await pipeline.exec()
```

---

## 🎯 总结

| 操作类型 | 适用场景 | 示例 |
|---------|---------|------|
| **基础操作** | 简单缓存 | 天气数据、设备状态、用户配置 |
| **Hash** | 对象存储 | 设备详细信息、用户会话 |
| **Set** | 去重集合 | 在线设备列表、活跃用户 |
| **Sorted Set** | 排序列表 | 浇水历史、定时任务队列 |
| **分布式锁** | 并发控制 | 防止并发浇水、设备操作互斥 |
| **Pub/Sub** | 实时推送 | WebSocket 广播、事件通知 |

---

**完整代码示例仓库**：`D:\workspace\soildrops\TIMER-MQTT`

如有问题，请查阅：
- [Redis 官方文档](https://redis.io/docs/)
- [ioredis 文档](https://github.com/redis/ioredis)
- 项目 `src/core/database/USAGE_EXAMPLE.md`
