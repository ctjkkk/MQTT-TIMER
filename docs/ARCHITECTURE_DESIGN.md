# 水阀控制系统完整架构设计

## 📋 目录
- [1. 数据模型设计](#1-数据模型设计)
- [2. API 接口设计](#2-api-接口设计)
- [3. MQTT 通信协议](#3-mqtt-通信协议)
- [4. 事件分发机制](#4-事件分发机制)
- [5. 技术选型建议](#5-技术选型建议)
- [6. 设计模式建议](#6-设计模式建议)
- [7. 实施步骤](#7-实施步骤)

---

## 1. 数据模型设计

### 1.1 现有模型（✅ 已完成）

#### Timer（子设备）
```typescript
{
  timerId: string              // 子设备ID
  name: string                 // 设备名称
  userId: ObjectId             // 所属用户
  gatewayId: string            // 所属网关
  outlet_count: number         // 出水口数量（1-4）
  status: number               // 设备状态
  online: number               // 在线状态
  battery_level: number        // 电池电量
  signal_strength: number      // 信号强度
  dp_data: Map<string, any>    // DP点数据
}
```

#### Outlet（出水口）
```typescript
{
  outletId: string             // 出水口ID
  name: string                 // 出水口名称
  timerId: ObjectId            // 所属Timer
  userId: ObjectId             // 所属用户
  outlet_number: number        // 出水口编号（1-4）
  zone_name: string            // 区域名称（如"前院子"）
  is_enabled: boolean          // 是否启用
  current_status: number       // 当前状态：0-关闭 1-运行中 2-暂停 3-故障
  flow_rate: number            // 流速（L/min）
  pressure: number             // 水压（bar）
  total_water_used: number     // 累计用水量（L）
  remaining_time: number       // 剩余时间（秒）
  dp_data: Map<string, any>    // DP点数据
}
```

#### Schedule（定时计划）
```typescript
{
  scheduleId: string           // 计划ID
  name: string                 // 计划名称
  outletId: ObjectId           // 关联的出水口
  userId: ObjectId             // 所属用户
  schedule_type: string        // 类型：once/daily/weekly/custom
  is_enabled: boolean          // 是否启用
  start_time: string           // 开始时间
  duration: number             // 持续时间（分钟）
  repeat_days: number[]        // 重复日期（0-6代表周日-周六）
  spray_mode: {                // 喷洒模式
    is_enabled: boolean
    eco_mode: boolean
    spray_pattern: string      // continuous/interval/pulse
    interval_on: number
    interval_off: number
  }
  next_run_time: Date          // 下一次运行时间
  last_run_time: Date          // 上次运行时间
  run_count: number            // 运行次数
  weather_skip: {              // 🆕 天气跳过配置
    is_enabled: boolean
    skip_on_rain: boolean
    skip_on_temp_above: number
    skip_on_temp_below: number
  }
}
```

### 1.2 新增模型（🆕 需要创建）

#### WateringHistory（浇水历史）
```typescript
{
  historyId: string            // 历史记录ID
  outletId: ObjectId           // 关联的出水口
  timerId: ObjectId            // 关联的Timer
  userId: ObjectId             // 所属用户

  // 浇水基本信息
  start_time: Date             // 开始时间
  end_time: Date               // 结束时间
  duration: number             // 实际持续时间（秒）
  planned_duration: number     // 计划持续时间（秒）

  // 浇水类型
  watering_type: string        // 'manual' | 'scheduled' | 'auto'
  scheduleId?: ObjectId        // 如果是定时任务，关联scheduleId

  // 用水数据
  water_used: number           // 用水量（L）
  avg_flow_rate: number        // 平均流速（L/min）
  avg_pressure: number         // 平均水压（bar）

  // 状态信息
  status: string               // 'completed' | 'interrupted' | 'failed'
  completion_rate: number      // 完成率（百分比）
  interruption_reason?: string // 中断原因

  // 天气信息（可选）
  weather_data?: {
    temperature: number
    humidity: number
    rainfall: number
    weather_condition: string
  }

  // 是否因天气跳过
  weather_skipped: boolean
  skip_reason?: string

  // 时间戳
  createdAt: Date
}
```

#### WeatherCondition（天气条件 - 可选）
```typescript
{
  conditionId: string
  userId: ObjectId
  location: {
    latitude: number
    longitude: number
    address: string
  }

  // 当前天气
  current: {
    temperature: number
    humidity: number
    rainfall: number
    weather_condition: string
    wind_speed: number
  }

  // 未来7天预报
  forecast: Array<{
    date: Date
    temp_high: number
    temp_low: number
    rainfall_probability: number
    weather_condition: string
  }>

  last_updated: Date
}
```

---

## 2. API 接口设计

### 2.1 Outlet API（出水口操作）

#### 获取子设备详情（包含所有出水口）
```http
GET /api/timer/:timerId/detail
Authorization: Bearer {token}

Response:
{
  "code": 200,
  "msg": "查询成功",
  "data": {
    "timer": {
      "timerId": "TIMER_001",
      "name": "Name Host 1",
      "outlet_count": 2,
      "battery_level": 85,
      "signal_strength": 92,
      "location": "Sunnyvale, CA"
    },
    "outlets": [
      {
        "outletId": "OUTLET_001",
        "outlet_number": 1,
        "name": "Valve 1",
        "zone_name": "Front Yard",
        "current_status": 1,  // 正在浇水
        "remaining_time": 600,
        "flow_rate": 5.2,
        "pressure": 2.5,
        "total_water_used": 1250.5
      },
      {
        "outletId": "OUTLET_002",
        "outlet_number": 2,
        "name": "Valve 2",
        "zone_name": "Back Yard",
        "current_status": 0,
        "remaining_time": 0
      }
    ],
    "next_schedule": {
      "scheduleId": "SCH_001",
      "outlet_number": 1,
      "next_run_time": "2025-12-25T18:00:00Z",
      "duration": 600
    },
    "weather": {
      "forecast": [...] // 7天天气预报
    }
  }
}
```

#### 手动浇水控制
```http
POST /api/outlet/:outletId/manual-watering
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "action": "start",        // start | stop | pause | resume
  "duration": 600           // 持续时间（秒），仅在 start 时需要
}

Response:
{
  "code": 200,
  "msg": "浇水已启动",
  "data": {
    "outletId": "OUTLET_001",
    "current_status": 1,
    "remaining_time": 600,
    "start_time": "2025-02-02T10:30:00Z"
  }
}
```

#### 修改出水口名称
```http
POST /api/outlet/:outletId/rename
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "name": "前院子",
  "zone_name": "Front Yard"  // 可选
}

Response:
{
  "code": 200,
  "msg": "修改成功",
  "data": {
    "outletId": "OUTLET_001",
    "name": "前院子",
    "zone_name": "Front Yard"
  }
}
```

### 2.2 Schedule API（定时计划）

#### 获取出水口的定时计划
```http
GET /api/outlet/:outletId/schedules
Authorization: Bearer {token}

Response:
{
  "code": 200,
  "msg": "查询成功",
  "data": {
    "schedules": [
      {
        "scheduleId": "SCH_001",
        "name": "早晨浇水",
        "start_time": "07:00",
        "duration": 600,
        "repeat_days": [1, 2, 3, 4, 5],  // 周一到周五
        "is_enabled": true,
        "weather_skip": {
          "is_enabled": true,
          "skip_on_rain": true
        },
        "next_run_time": "2025-02-03T07:00:00Z"
      }
    ]
  }
}
```

#### 创建/更新定时计划
```http
POST /api/schedule
PUT /api/schedule/:scheduleId
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "outletId": "OUTLET_001",
  "name": "早晨浇水",
  "start_time": "07:00",
  "duration": 600,
  "repeat_days": [1, 2, 3, 4, 5],
  "is_enabled": true,
  "weather_skip": {
    "is_enabled": true,
    "skip_on_rain": true,
    "skip_on_temp_above": 35,
    "skip_on_temp_below": 5
  }
}
```

#### 删除定时计划
```http
DELETE /api/schedule/:scheduleId
Authorization: Bearer {token}
```

#### 切换天气跳过开关
```http
POST /api/schedule/:scheduleId/weather-skip
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "is_enabled": true
}
```

### 2.3 History API（浇水历史）

#### 查询浇水历史（按日期分组）
```http
GET /api/outlet/:outletId/history?start_date=2025-02-01&end_date=2025-02-28
Authorization: Bearer {token}

Response:
{
  "code": 200,
  "msg": "查询成功",
  "data": {
    "history": {
      "2025-02-02": [
        {
          "historyId": "HIST_001",
          "start_time": "2025-02-02T07:00:00Z",
          "end_time": "2025-02-02T07:10:00Z",
          "duration": 600,
          "watering_type": "scheduled",
          "water_used": 52.5,
          "status": "completed",
          "weather_data": {
            "temperature": 22,
            "weather_condition": "晴天"
          }
        },
        {
          "historyId": "HIST_002",
          "start_time": "2025-02-02T18:00:00Z",
          "end_time": "2025-02-02T18:10:00Z",
          "duration": 600,
          "watering_type": "manual",
          "water_used": 50.8,
          "status": "completed"
        }
      ],
      "2025-02-01": [...]
    },
    "statistics": {
      "total_water_used": 1250.5,
      "total_duration": 7200,
      "average_per_day": 62.5
    }
  }
}
```

#### 获取下一次浇水时间
```http
GET /api/outlet/:outletId/next-watering
Authorization: Bearer {token}

Response:
{
  "code": 200,
  "msg": "查询成功",
  "data": {
    "next_watering": {
      "scheduleId": "SCH_001",
      "scheduled_time": "2025-02-03T07:00:00Z",
      "duration": 600,
      "schedule_name": "早晨浇水",
      "will_skip": false,
      "skip_reason": null
    }
  }
}
```

---

## 3. MQTT 通信协议

### 3.1 DP 点定义

基于你现有的 DP 点映射（每个出水口间隔 20）：

#### Outlet 1 (DP 21-40)
- **DP 21**: 开关（0=关，1=开）
- **DP 22**: 状态（0=关闭，1=运行，2=暂停，3=故障）
- **DP 23**: 模式（0=手动，1=定时，2=自动）
- **DP 24**: 剩余时间（秒）
- **DP 25**: 流速（L/min * 10）
- **DP 26**: 水压（bar * 10）
- **DP 27**: 累计用水量（L）
- **DP 28**: 区域名称（字符串）

#### Outlet 2 (DP 41-60)
- **DP 41-48**: 同上

#### Outlet 3 (DP 61-80)
- **DP 61-68**: 同上

#### Outlet 4 (DP 81-100)
- **DP 81-88**: 同上

### 3.2 命令下发（云 → 设备）

#### 手动浇水命令
```json
{
  "msgType": "dp_command",
  "msgId": "CMD_12345",
  "deviceId": "GATEWAY_001",
  "subDeviceId": "TIMER_001",
  "timestamp": 1738483200,
  "data": {
    "dps": {
      "21": true,        // 打开出水口1
      "23": 0,           // 手动模式
      "24": 600          // 10分钟
    }
  }
}
```

#### 停止浇水命令
```json
{
  "msgType": "dp_command",
  "deviceId": "GATEWAY_001",
  "subDeviceId": "TIMER_001",
  "data": {
    "dps": {
      "21": false       // 关闭出水口1
    }
  }
}
```

### 3.3 状态上报（设备 → 云）

#### DP 点上报
```json
{
  "msgType": "dp_report",
  "deviceId": "GATEWAY_001",
  "subDeviceId": "TIMER_001",
  "timestamp": 1738483200,
  "data": {
    "dps": {
      "21": true,        // 出水口1开启
      "22": 1,           // 运行中
      "24": 580,         // 剩余580秒
      "25": 52,          // 流速5.2 L/min
      "26": 25,          // 水压2.5 bar
      "27": 1250         // 累计用水量1250L
    }
  }
}
```

---

## 4. 事件分发机制

### 4.1 现有机制（✅ 已实现）

```
MQTT Broker
    ↓
MqttHandlerService (接收消息)
    ↓
EventEmitter2 (发出事件)
    ↓
TimerEventsHandler (监听事件)
    ↓
TimerService (处理业务逻辑)
    ↓
OutletService (更新出水口状态)
```

### 4.2 事件流程图

```
┌─────────────────────────────────────────────────────────────┐
│                         用户操作                              │
└───────────────────┬─────────────────────────────────────────┘
                    ↓
        ┌───────────────────────┐
        │  HTTP API (Controller) │
        └───────────┬─────────────┘
                    ↓
        ┌───────────────────────┐
        │   Service (业务逻辑)    │
        └───────────┬─────────────┘
                    ↓
        ┌───────────────────────┐
        │  CommandSenderService  │ (下发MQTT命令)
        └───────────┬─────────────┘
                    ↓
        ┌───────────────────────┐
        │     MQTT Broker       │
        └───────────┬─────────────┘
                    ↓
        ┌───────────────────────┐
        │      网关 + 子设备      │
        └───────────┬─────────────┘
                    ↓
        ┌───────────────────────┐
        │  设备状态上报 (MQTT)    │
        └───────────┬─────────────┘
                    ↓
        ┌───────────────────────┐
        │ MqttHandlerService    │ (接收上报)
        └───────────┬─────────────┘
                    ↓
        ┌───────────────────────┐
        │   EventEmitter2       │
        └───────────┬─────────────┘
                    ↓
        ┌───────────────────────┐
        │  TimerEventsHandler   │
        └───────────┬─────────────┘
                    ↓
        ┌───────────────────────┐
        │   OutletService       │ (更新数据库)
        └───────────┬─────────────┘
                    ↓
        ┌───────────────────────┐
        │   WebSocket (可选)     │ (推送给前端)
        └───────────────────────┘
```

### 4.3 关键事件类型

```typescript
// 现有事件
export const AppEvents = {
  MQTT_GATEWAY_MESSAGE: 'mqtt.gateway.message',
  MQTT_SUBDEVICE_MESSAGE: 'mqtt.subdevice.message',

  // 🆕 新增事件
  WATERING_STARTED: 'watering.started',
  WATERING_COMPLETED: 'watering.completed',
  WATERING_INTERRUPTED: 'watering.interrupted',
  SCHEDULE_TRIGGERED: 'schedule.triggered',
  WEATHER_SKIP_ACTIVATED: 'weather.skip.activated',
}
```

---

## 5. 技术选型建议

### 5.1 是否需要 Kafka？

**❌ 暂时不需要**

**理由：**
1. **当前规模不大**：预计设备数量在 1000-10000 级别，MQTT + EventEmitter2 完全够用
2. **MQTT 已经很好**：MQTT 专为 IoT 设计，轻量、可靠
3. **增加复杂度**：Kafka 需要额外维护（Zookeeper、集群）
4. **延迟更高**：Kafka 适合批处理，不如 MQTT 实时

**何时引入 Kafka：**
- 设备数 > 10万
- 需要复杂的事件流处理（CEP）
- 需要历史数据回溯
- 需要与大数据平台集成

### 5.2 推荐的技术栈

#### 核心技术（✅ 已有）
- **NestJS** - 后端框架
- **MongoDB + Mongoose** - 数据库
- **MQTT** - 设备通信
- **EventEmitter2** - 事件系统

#### 建议补充
- **Bull** (基于 Redis) - 定时任务调度
  - 用于执行 Schedule（定时浇水）
  - 比 node-cron 更可靠，支持分布式

- **@nestjs/schedule** - 简单定时任务
  - 用于天气数据定期获取
  - 心跳检测等轻量任务

- **WebSocket/Socket.io** - 实时推送（可选）
  - 推送浇水状态给前端
  - 实时显示流速、水压等

- **Redis** - 缓存 + 会话
  - 缓存设备在线状态
  - 缓存天气数据
  - Bull 队列存储

- **第三方天气 API**
  - OpenWeatherMap
  - WeatherAPI.com
  - 或国内的和风天气 API

### 5.3 架构图

```
┌─────────────┐
│   前端 App   │ (React Native / Flutter)
└──────┬──────┘
       │ HTTP/WebSocket
       ↓
┌─────────────────────────────────────┐
│          NestJS 后端服务器            │
│  ┌────────────┬────────────────┐    │
│  │ Controller │   WebSocket     │    │
│  └─────┬──────┴────────────────┘    │
│        ↓                             │
│  ┌──────────────────────────┐       │
│  │      Service Layer       │       │
│  │  - TimerService          │       │
│  │  - OutletService         │       │
│  │  - ScheduleService       │       │
│  │  - HistoryService        │       │
│  │  - WeatherService        │       │
│  └───────┬──────────────────┘       │
│          ↓                           │
│  ┌──────────────────────────┐       │
│  │   MQTT Client Service    │       │
│  └───────┬──────────────────┘       │
└──────────┼──────────────────────────┘
           │
           ↓ MQTT (QoS 1)
┌──────────────────────┐
│    MQTT Broker       │ (EMQX / Mosquitto)
└──────────┬───────────┘
           │
           ↓
┌──────────────────────┐
│   网关 (ESP32/树莓派)  │
└──────────┬───────────┘
           │ Zigbee/蓝牙
           ↓
┌──────────────────────┐
│   子设备 (水阀控制器)   │
└──────────────────────┘

┌──────────────────────┐
│   MongoDB 数据库      │
│  - timers            │
│  - outlets           │
│  - schedules         │
│  - watering_history  │
│  - users             │
└──────────────────────┘

┌──────────────────────┐
│    Redis 缓存         │
│  - 设备在线状态       │
│  - 天气数据          │
│  - Bull 队列         │
└──────────────────────┘
```

---

## 6. 设计模式建议

### 6.1 策略模式 (Strategy Pattern)

用于不同的浇水策略：

```typescript
// 浇水策略接口
interface WateringStrategy {
  execute(outlet: Outlet, duration: number): Promise<void>
}

// 手动浇水策略
class ManualWateringStrategy implements WateringStrategy {
  async execute(outlet: Outlet, duration: number) {
    // 直接开启浇水
    await this.commandSender.startWatering(outlet.outletId, duration)
  }
}

// 定时浇水策略
class ScheduledWateringStrategy implements WateringStrategy {
  async execute(outlet: Outlet, duration: number) {
    // 检查天气跳过
    if (await this.shouldSkipDueToWeather()) {
      this.logger.log('天气跳过浇水')
      return
    }
    // 执行浇水
    await this.commandSender.startWatering(outlet.outletId, duration)
  }
}

// 智能浇水策略（基于土壤湿度）
class SmartWateringStrategy implements WateringStrategy {
  async execute(outlet: Outlet, duration: number) {
    const soilMoisture = await this.getSoilMoisture(outlet)
    if (soilMoisture < 30) {
      // 土壤湿度低于30%，开始浇水
      await this.commandSender.startWatering(outlet.outletId, duration)
    }
  }
}
```

### 6.2 观察者模式 (Observer Pattern)

用于状态变化通知（已通过 EventEmitter2 实现）：

```typescript
// 浇水状态变化 → 通知多个订阅者
this.eventEmitter.emit(AppEvents.WATERING_STARTED, {
  outletId: 'OUTLET_001',
  startTime: new Date(),
})

// 订阅者1：历史记录服务
@OnEvent(AppEvents.WATERING_STARTED)
handleWateringStarted(event) {
  this.historyService.createHistory(event)
}

// 订阅者2：WebSocket 推送
@OnEvent(AppEvents.WATERING_STARTED)
handleWateringStartedForWebSocket(event) {
  this.websocketGateway.broadcast('watering:started', event)
}

// 订阅者3：统计服务
@OnEvent(AppEvents.WATERING_STARTED)
handleWateringStartedForStats(event) {
  this.statsService.incrementCounter('watering_started')
}
```

### 6.3 命令模式 (Command Pattern)

用于封装 MQTT 命令：

```typescript
interface Command {
  execute(): Promise<void>
  undo(): Promise<void>
}

class StartWateringCommand implements Command {
  constructor(
    private outletId: string,
    private duration: number,
    private commandSender: CommandSenderService,
  ) {}

  async execute() {
    await this.commandSender.sendDpCommand(this.outletId, {
      '21': true,
      '24': this.duration,
    })
  }

  async undo() {
    await this.commandSender.sendDpCommand(this.outletId, {
      '21': false,
    })
  }
}

// 使用
const command = new StartWateringCommand('OUTLET_001', 600, commandSender)
await command.execute()

// 撤销
await command.undo()
```

### 6.4 工厂模式 (Factory Pattern)

用于创建不同类型的 Schedule：

```typescript
class ScheduleFactory {
  createSchedule(type: string, data: any): Schedule {
    switch (type) {
      case 'once':
        return new OnceSchedule(data)
      case 'daily':
        return new DailySchedule(data)
      case 'weekly':
        return new WeeklySchedule(data)
      case 'custom':
        return new CustomSchedule(data)
      default:
        throw new Error('Unknown schedule type')
    }
  }
}
```

---

## 7. 实施步骤

### Phase 1: 数据模型 + 基础 API（1-2天）
1. ✅ 创建 WateringHistory schema
2. ✅ 完善 Schedule schema（添加 weather_skip 字段）
3. ✅ 实现 Outlet Controller 基础 API
   - 获取子设备详情
   - 手动浇水控制
   - 出水口重命名

### Phase 2: 定时任务系统（2-3天）
1. ✅ 安装并配置 Bull (定时任务队列)
2. ✅ 实现 ScheduleService
   - 创建/更新/删除定时计划
   - 计算 next_run_time
3. ✅ 实现定时触发器
   - 定时执行浇水任务
   - 处理天气跳过逻辑

### Phase 3: 历史记录系统（1-2天）
1. ✅ 实现 HistoryService
   - 创建浇水记录
   - 查询历史（按日期分组）
   - 统计分析
2. ✅ 监听浇水事件自动创建历史

### Phase 4: 天气集成（1-2天）
1. ✅ 集成第三方天气 API
2. ✅ 实现天气跳过判断逻辑
3. ✅ 缓存天气数据（Redis）

### Phase 5: 实时推送（可选，1-2天）
1. ✅ 实现 WebSocket Gateway
2. ✅ 推送浇水状态给前端
3. ✅ 推送设备在线状态

### Phase 6: 优化 + 测试（2-3天）
1. ✅ 单元测试 + 集成测试
2. ✅ MQTT 通信压力测试
3. ✅ 性能优化（数据库索引、缓存策略）
4. ✅ 日志完善

---

## 8. 关键代码示例

### 8.1 手动浇水 API

```typescript
// outlet.controller.ts
@Post(':outletId/manual-watering')
@ApiResponseStandard({
  summary: '手动浇水控制',
  msg: '操作成功',
})
async manualWatering(
  @CurrentUserId() userId: string,
  @Param('outletId') outletId: string,
  @Body() dto: ManualWateringDto,
) {
  return this.outletService.manualWatering(userId, outletId, dto)
}

// outlet.service.ts
async manualWatering(userId: string, outletId: string, dto: ManualWateringDto) {
  // 1. 验证权限
  const outlet = await this.outletModel.findOne({ outletId })
  if (!outlet) throw new NotFoundException('出水口不存在')
  if (outlet.userId.toString() !== userId) throw new ForbiddenException('无权限操作')

  // 2. 下发 MQTT 命令
  const baseDpId = [0, 21, 41, 61, 81][outlet.outlet_number]
  const dps = {
    [baseDpId]: dto.action === 'start',  // 开关
    [baseDpId + 3]: dto.duration || 0,    // 持续时间
  }

  await this.commandSender.sendDpCommand(outlet.timerId, dps)

  // 3. 发出事件
  if (dto.action === 'start') {
    this.eventEmitter.emit(AppEvents.WATERING_STARTED, {
      outletId,
      startTime: new Date(),
      duration: dto.duration,
      type: 'manual',
    })
  }

  return { outletId, status: 'success' }
}
```

### 8.2 定时任务调度

```typescript
// schedule.service.ts
import { Queue } from 'bull'
import { InjectQueue } from '@nestjs/bull'

@Injectable()
export class ScheduleService {
  constructor(
    @InjectQueue('watering') private wateringQueue: Queue,
  ) {}

  async createSchedule(dto: CreateScheduleDto) {
    // 1. 保存到数据库
    const schedule = await this.scheduleModel.create({
      ...dto,
      scheduleId: uuidv4(),
      next_run_time: this.calculateNextRunTime(dto),
    })

    // 2. 添加到 Bull 队列
    await this.wateringQueue.add(
      'scheduled-watering',
      { scheduleId: schedule.scheduleId },
      {
        delay: schedule.next_run_time.getTime() - Date.now(),
        jobId: schedule.scheduleId,
      }
    )

    return schedule
  }

  private calculateNextRunTime(schedule: CreateScheduleDto): Date {
    const now = new Date()
    const [hour, minute] = schedule.start_time.split(':').map(Number)

    const nextRun = new Date(now)
    nextRun.setHours(hour, minute, 0, 0)

    // 如果今天的时间已过，计算下一次执行
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1)
    }

    // 根据 repeat_days 调整日期
    while (!schedule.repeat_days.includes(nextRun.getDay())) {
      nextRun.setDate(nextRun.getDate() + 1)
    }

    return nextRun
  }
}

// watering.processor.ts
@Processor('watering')
export class WateringProcessor {
  @Process('scheduled-watering')
  async handleScheduledWatering(job: Job) {
    const { scheduleId } = job.data
    const schedule = await this.scheduleService.findById(scheduleId)

    if (!schedule.is_enabled) return

    // 检查天气跳过
    if (await this.shouldSkipDueToWeather(schedule)) {
      this.logger.log(`天气跳过: ${scheduleId}`)
      this.eventEmitter.emit(AppEvents.WEATHER_SKIP_ACTIVATED, { scheduleId })
      return
    }

    // 执行浇水
    await this.outletService.startWatering(schedule.outletId, schedule.duration)

    // 更新 next_run_time 并重新加入队列
    const nextRunTime = this.calculateNextRunTime(schedule)
    await this.scheduleModel.updateOne(
      { scheduleId },
      {
        $set: { next_run_time: nextRunTime, last_run_time: new Date() },
        $inc: { run_count: 1 }
      }
    )

    await this.wateringQueue.add(
      'scheduled-watering',
      { scheduleId },
      {
        delay: nextRunTime.getTime() - Date.now(),
        jobId: scheduleId,
      }
    )
  }
}
```

---

## 9. 总结

### ✅ 推荐方案
- 基于现有 NestJS + MQTT 架构
- **不需要** Kafka（当前规模）
- 使用 Bull 做定时任务调度
- 使用 Redis 做缓存
- 使用 WebSocket 做实时推送（可选）

### 📊 预期性能
- 支持 10,000+ 设备
- MQTT 消息延迟 < 100ms
- API 响应时间 < 200ms
- 定时任务精度 ±5秒

### 🎯 关键优势
1. **架构清晰**：Controller → Service → MQTT → EventHandler
2. **易于扩展**：模块化设计，新增功能只需添加模块
3. **实时性强**：MQTT + WebSocket 双重保障
4. **可靠性高**：Bull 队列持久化，支持失败重试
5. **易于维护**：TypeScript 强类型，代码可读性好

### 🚀 后续扩展方向
1. 添加 AI 浇水推荐（基于历史数据）
2. 多用户协作（家庭成员共享设备）
3. 设备分组管理
4. 用水统计报表
5. 故障告警系统
