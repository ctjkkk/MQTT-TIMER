# 汉奇水阀DP点协议说明文档

## 文档概述

本文档基于汉奇提供的3路和4路433水阀技术规格，结合 TIMER-MQTT 项目的实际需求，详细说明水阀设备的DP点（Data Point）定义、数据格式和使用方法。

**参考文档：**
- `HQ2026-3路433水阀(fdekfvdlkmqyslqr)_01_28.xlsx`
- `HQ2026-4路433水阀(ui9sxthml2sayg6a)_01_28.xlsx`

**目标读者：** 后端开发人员、设备对接工程师

---

## 一、DP点基础知识

### 1.1 什么是DP点？

DP点（Data Point）是物联网设备的"功能点"，每个DP点代表设备的一项功能或状态。通过读写DP点，可以实现：
- **控制设备**：如开关水阀、设置灌溉时长
- **查询状态**：如电池电量、运行状态
- **接收告警**：如低电量告警、故障告警

### 1.2 DP点的关键属性

| 属性名称 | 说明 | 示例 |
|---------|------|------|
| **DP ID** | DP点的唯一标识符，1-255的数字 | `1`, `17`, `38` |
| **标识符** | DP点的英文名称，用于代码中引用 | `switch_1`, `countdown_1`, `timer` |
| **数据类型** | 决定了值的格式 | `bool`, `value`, `enum`, `raw` |
| **传输类型** | 读写权限 | `rw`(可读写), `ro`(只读), `wo`(只写) |
| **数值范围** | 仅value类型有效 | `0-43200` |
| **单位** | 数值的计量单位 | `s`(秒), `h`(小时), `%`(百分比) |

### 1.3 DP点数据类型详解

| 类型 | 说明 | 值示例 | 用途 |
|------|------|--------|------|
| **bool** | 布尔型，表示开关状态 | `true`, `false` | 区域开关、天气开关 |
| **value** | 数值型，表示数量 | `3600`, `75`, `240` | 倒计时、电量、延时时长 |
| **enum** | 枚举型，表示固定的几种状态 | `"sunny"`, `"rainy"`, `"manual"` | 天气状态、工作模式 |
| **raw** | 原始数据型，通常是Base64编码的二进制数据 | `"AQIDBAUGBwg="` | 定时计划、复杂数据结构 |
| **fault** | 故障型，可同时上报多个故障 | `["low_battery", "fault_1"]` | 设备故障告警 |

---

## 二、3路 vs 4路水阀DP点对比

### 2.1 核心区别

| 特性 | 3路水阀 | 4路水阀 |
|------|---------|---------|
| **产品ID** | `fdekfvdlkmqyslqr` | `ui9sxthml2sayg6a` |
| **通道数量** | 3个 (A/B/C) | 4个 (A/B/C/D) |
| **区域开关DP** | DP1-3 | DP1-4 |
| **倒计时设置DP** | DP17-19 | DP17-20 |
| **剩余倒计时DP** | DP105-107 | DP105-108 |
| **下次定时DP** | DP109-111 | DP109-112 |
| **普通定时DP** | DP38, DP113-114 | DP38, DP113-115 |
| **工作状态DP** | DP119-121 | DP119-122 |
| **灌溉日志DP** | DP131-133 | DP131-134 |

**注意：** 4路水阀的DP20倒计时单位是`min`(分钟)，其他通道都是`s`(秒)！

### 2.2 共享的DP点

以下DP点在3路和4路水阀中完全相同：

| DP ID | 功能 | 类型 | 传输 |
|-------|------|------|------|
| 38 | 通道1普通定时 | raw | rw |
| 39 | 喷雾定时 | raw | rw |
| 42 | 剩余天气延时时间 | value (0-240h) | ro |
| 43 | 天气开关 | bool | rw |
| 44 | 智能天气 | enum (sunny/rainy) | rw |
| 45 | 雨天延时 | enum (1-7天/cancel) | rw |
| 47 | 电池电量状态 | enum (0-6) | ro |
| 53 | 故障告警 | fault | ro |
| 117 | 信号放大 | bool | rw |
| 118 | 信号强度 | value (-255~255) | ro |
| 123 | 升级状态 | enum | ro |

---

## 三、关键DP点功能详解

### 3.1 区域开关（DP1-4）

**功能：** 手动开启/关闭指定灌溉通道

```typescript
// 开启通道A（DP1）
{
  dpId: 1,
  value: true,  // true=开启，false=关闭
  type: 'bool'
}
```

**应用场景：**
- 用户在APP上点击"立即灌溉"
- 紧急情况需要手动控制

**注意事项：**
- 开关优先级高于定时任务
- 关闭后会中断正在运行的灌溉

### 3.2 灌溉倒计时设置（DP17-20）

**功能：** 设置各通道手动灌溉的持续时长

```typescript
// 设置通道1灌溉60分钟（3600秒）
{
  dpId: 17,
  value: 3600,  // 单位：秒 (0-43200，即0-12小时)
  type: 'value'
}

// ⚠️ 特别注意：DP20（4路水阀通道4）单位是分钟！
{
  dpId: 20,
  value: 60,  // 单位：分钟 (0-43200分钟)
  type: 'value'
}
```

**应用场景：**
- 配合区域开关使用
- 先设置倒计时，再开启开关，水阀会在指定时长后自动关闭

**工作流程：**
```
1. 下发 DP17 = 3600（设置1小时）
2. 下发 DP1 = true（开启通道）
3. 设备开始灌溉
4. 设备每秒上报 DP105（剩余时间）
5. 3600秒后自动关闭
```

### 3.3 运行剩余倒计时（DP105-108）

**功能：** 查询当前正在运行的灌溉任务还剩多少时间

```typescript
// 设备上报剩余1800秒（30分钟）
{
  dpId: 105,
  value: 1800,
  type: 'value'
}
```

**数据来源：** 设备主动上报（只读）

**应用场景：**
- 实时显示"还剩XX分钟"
- 判断是否灌溉完成

### 3.4 通道工作状态（DP119-122）

**功能：** 查询通道当前的工作模式

```typescript
// 通道1处于定时灌溉状态
{
  dpId: 119,
  value: "timing",
  type: 'enum'
}
```

**枚举值说明：**

| 值 | 含义 | 说明 |
|----|------|------|
| `idle` | 空闲 | 水阀关闭，无任务 |
| `manual` | 手动模式 | 用户手动开启 |
| `timing` | 定时模式 | 定时任务触发 |
| `spray` | 喷雾模式 | 喷雾定时触发 |

**应用场景：**
- 在APP上显示"正在定时灌溉"
- 区分手动和自动灌溉

### 3.5 下次定时时间（DP109-112）

**功能：** 查询下一次定时任务的执行时间

```typescript
// 设备上报下次定时为2026年1月30日 06:00
{
  dpId: 109,
  value: <Base64编码的时间戳>,
  type: 'raw'
}
```

**数据来源：** 设备主动上报（只读）

**数据格式：** raw类型，需要解码（具体格式待汉奇确认）

**应用场景：**
- 显示"下次灌溉时间"
- 验证定时任务是否生效

---

## 四、核心功能：定时计划（Raw类型DP）

### 4.1 DP38/113/114/115 - 普通定时

**DP分配：**
- **DP38**: 通道1普通定时
- **DP113**: 通道2普通定时
- **DP114**: 通道3普通定时
- **DP115**: 通道4普通定时（仅4路水阀）

**数据类型：** `raw` - 自定义协议，通常是Base64编码的二进制数据

**数据格式（推测）：**

根据涂鸦IoT平台标准，raw类型的定时数据可能包含以下信息：

```json
{
  "timers": [
    {
      "id": 1,                    // 定时任务ID
      "enable": true,             // 是否启用
      "time": "06:00",            // 执行时间 HH:mm
      "loops": "1111100",         // 重复规则：周一到周日，1=执行，0=不执行
      "duration": 3600,           // 灌溉时长（秒）
      "mode": "single"            // 模式：single(单次) / cycle(循环)
    }
  ]
}
```

**编码流程：**
```
1. 构建定时JSON对象
2. 转换为二进制格式（可能用Protocol Buffers或自定义格式）
3. Base64编码
4. 下发到设备
```

**示例代码：**

```typescript
// 下发一个定时任务：每天早上6点灌溉1小时
async setTimer(channelId: number, timer: TimerConfig) {
  const timerData = {
    timers: [{
      id: 1,
      enable: true,
      time: "06:00",
      loops: "1111111",  // 每天执行
      duration: 3600
    }]
  }

  // 编码为raw格式（需要根据汉奇提供的协议文档实现）
  const rawData = encodeTimerData(timerData)

  // 计算DP ID
  const dpId = channelId === 1 ? 38 : 112 + channelId

  await this.dpService.sendCommand({
    dpId,
    value: rawData,
    type: 'raw'
  })
}
```

### 4.2 DP39 - 喷雾定时

**功能：** 循环定时，用于定期喷雾场景

**数据格式（推测）：**

```json
{
  "enable": true,
  "interval": 3600,        // 间隔时间（秒）
  "duration": 300,         // 每次持续时间（秒）
  "start_time": "06:00",   // 开始时间
  "end_time": "18:00"      // 结束时间
}
```

**应用场景：**
- 大棚喷雾降温：每小时喷5分钟
- 温室加湿：每30分钟喷2分钟

---

## 五、天气功能DP点

### 5.1 智能天气系统工作原理

```
┌─────────────────────────────────────────────────┐
│  云端天气系统                                     │
│  ↓                                               │
│  检测到下雨 → 下发 DP44 = "rainy"                │
│  ↓                                               │
│  设备收到后，如果 DP43(天气开关) = true           │
│  ↓                                               │
│  根据 DP45(雨天延时) 设置值，暂停灌溉X天           │
│  ↓                                               │
│  上报 DP42(剩余延时时间) = X小时                  │
└─────────────────────────────────────────────────┘
```

### 5.2 DP43 - 天气开关

```typescript
// 开启天气功能
{
  dpId: 43,
  value: true,
  type: 'bool'
}
```

**作用：** 总开关，关闭后不响应天气变化

### 5.3 DP44 - 智能天气状态

```typescript
// 云端下发晴天
{
  dpId: 44,
  value: "sunny",  // sunny(晴天) / rainy(雨天)
  type: 'enum'
}
```

**数据来源：**
- **云端主动下发**（收费功能）
- 云端检测天气变化后推送

### 5.4 DP45 - 雨天延时设置

```typescript
// 设置雨天延时3天
{
  dpId: 45,
  value: "3",  // 枚举值："1"-"7" 表示延时天数，"cancel"表示取消延时
  type: 'enum'
}
```

**用户场景：**
```
1. 用户在APP设置"雨天延时3天"（下发DP45=3）
2. 云端检测到下雨，下发DP44="rainy"
3. 设备暂停所有定时任务，开始倒计时72小时
4. 设备上报DP42=72（剩余72小时）
5. 每小时递减，上报DP42=71, 70, 69...
6. 72小时后恢复定时任务
```

### 5.5 DP42 - 剩余天气延时时间

```typescript
// 设备上报还剩48小时恢复灌溉
{
  dpId: 42,
  value: 48,  // 单位：小时 (0-240)
  type: 'value'
}
```

**数据来源：** 设备上报（只读）

---

## 六、状态监控DP点

### 6.1 DP47 - 电池电量状态

```typescript
{
  dpId: 47,
  value: "5",  // 枚举值：0-6
  type: 'enum'
}
```

**电量对照表（4路水阀）：**

| 枚举值 | 电压 | 说明 |
|--------|------|------|
| 6 | 3.05V | 满电 |
| 5 | 2.95V | 良好 |
| 4 | 2.85V | 中等 |
| 3 | 2.75V | 偏低 |
| 2 | 2.65V | 低电量 |
| 1 | 2.60V | 极低 |
| 0 | <2.60V | 需立即更换 |

**应用场景：**
- 电量 ≤ 2 时，APP推送"低电量告警"
- 电量 = 0 时，禁止新的灌溉任务

### 6.2 DP53 - 故障告警

```typescript
// 设备同时上报多个故障
{
  dpId: 53,
  value: ["low_battery", "fault_1"],
  type: 'fault'
}
```

**故障值说明：**

| 故障值 | 含义 | 处理建议 |
|--------|------|----------|
| `low_battery` | 低电量 | 提醒用户更换电池 |
| `fault_1` | 通道1故障 | 检查水阀连接 |
| `fault_2` | 通道2故障 | 检查水阀连接 |
| `fault_3` | 通道3故障 | 检查水阀连接 |

### 6.3 DP118 - 信号强度

```typescript
{
  dpId: 118,
  value: -65,  // 单位：dBm (-255 ~ 255)
  type: 'value'
}
```

**信号质量评估：**
- \> -50: 优秀
- -50 ~ -70: 良好
- -70 ~ -85: 一般
- < -85: 较差

### 6.4 DP117 - 信号放大

```typescript
// 开启信号放大功能
{
  dpId: 117,
  value: true,
  type: 'bool'
}
```

**作用：** 在信号弱的环境下开启，增强433MHz通信

---

## 七、灌溉日志（DP131-134）

### 功能说明

设备完成一次灌溉后，会上报本次灌溉的实际时长。

```typescript
// 通道1完成灌溉，实际运行了3580秒
{
  dpId: 131,
  value: 3580,  // 单位：秒
  type: 'value'
}
```

**应用场景：**
1. **统计用水量：** 结合流量数据计算总用水
2. **异常检测：** 如果实际时长远小于设定时长，可能是水压不足或设备故障
3. **历史记录：** 构建"灌溉历史"功能

**数据库设计建议：**

```typescript
// irrigation_logs 集合
{
  timerId: ObjectId,
  channelId: number,
  planned_duration: 3600,      // 计划灌溉时长
  actual_duration: 3580,       // 实际灌溉时长（来自DP131-134）
  start_time: ISODate,
  end_time: ISODate,
  trigger_type: 'manual' | 'timing' | 'spray',
  water_consumption: 180       // 用水量（升）
}
```

---

## 八、与现有项目的集成建议

### 8.1 现有DP点定义的差异

**项目现状（`dp.constants.ts`）：**
```typescript
export enum HanqiTimerDpId {
  OUTLET_1_SWITCH = 21,           // 项目定义
  OUTLET_1_MANUAL_DURATION = 23,
  // ...
}
```

**汉奇实际设备：**
```
DP1: 区域A开关 (switch_1)
DP17: 设置通道1灌溉时长 (countdown_1)
DP38: 通道1普通定时 (timer)
```

**结论：** 项目中的DP ID与汉奇设备不匹配，需要调整。

### 8.2 建议的集成方案

#### 方案A：创建汉奇专用DP常量

```typescript
// src/shared/constants/dp-hanqi.constants.ts

export enum HanqiWaterValveDpId {
  // 区域开关
  CHANNEL_A_SWITCH = 1,
  CHANNEL_B_SWITCH = 2,
  CHANNEL_C_SWITCH = 3,
  CHANNEL_D_SWITCH = 4,  // 仅4路水阀

  // 灌溉时长设置
  CHANNEL_1_COUNTDOWN = 17,
  CHANNEL_2_COUNTDOWN = 18,
  CHANNEL_3_COUNTDOWN = 19,
  CHANNEL_4_COUNTDOWN = 20,  // 仅4路水阀，单位：分钟！

  // 定时任务
  CHANNEL_1_TIMER = 38,
  CHANNEL_2_TIMER = 113,
  CHANNEL_3_TIMER = 114,
  CHANNEL_4_TIMER = 115,

  // 喷雾定时
  CYCLE_TIMING = 39,

  // 天气功能
  WEATHER_SWITCH = 43,
  SMART_WEATHER = 44,
  WEATHER_DELAY = 45,
  REMAINING_WEATHER_DELAY = 42,

  // 状态监控
  BATTERY_STATE = 47,
  FAULT = 53,
  SIGNAL_STRENGTH = 118,
  SIGNAL_BOOST_SWITCH = 117,

  // 工作状态
  WORK_STATE_1 = 119,
  WORK_STATE_2 = 120,
  WORK_STATE_3 = 121,
  WORK_STATE_4 = 122,

  // 运行倒计时
  RUNNING_COUNTDOWN_1 = 105,
  RUNNING_COUNTDOWN_2 = 106,
  RUNNING_COUNTDOWN_3 = 107,
  RUNNING_COUNTDOWN_4 = 108,

  // 下次定时
  NEXT_TIMER_1 = 109,
  NEXT_TIMER_2 = 110,
  NEXT_TIMER_3 = 111,
  NEXT_TIMER_4 = 112,

  // 灌溉日志
  IRRIGATION_TIME_1 = 131,
  IRRIGATION_TIME_2 = 132,
  IRRIGATION_TIME_3 = 133,
  IRRIGATION_TIME_4 = 134,

  // 升级状态
  UPGRADE_STATUS = 123,
}
```

#### 方案B：在Timer Schema中扩展DP数据

```typescript
// timer.schema.ts 中已有的设计很好：
@Prop({
  type: Map,
  of: MongooseSchema.Types.Mixed,
  default: {},
  comment: 'DP点数据存储（键为dpId，值为dp值）'
})
dp_data: Map<string, any>

// 使用示例：
timer.dp_data.set('1', true)        // DP1: 开启通道A
timer.dp_data.set('17', 3600)       // DP17: 设置1小时
timer.dp_data.set('47', '5')        // DP47: 电量状态5
```

### 8.3 DP点处理服务示例

```typescript
// src/shared/services/hanqi-valve-dp.service.ts

@Injectable()
export class HanqiValveDpService {

  /**
   * 开启/关闭灌溉通道
   */
  async toggleChannel(
    timerId: string,
    channelId: number,
    enabled: boolean
  ): Promise<void> {
    const dpId = channelId  // DP1-4对应通道A-D

    await this.dpService.sendCommand({
      deviceId: timerId,
      dpId,
      value: enabled,
      type: DpType.BOOL
    })
  }

  /**
   * 设置灌溉时长并开启
   */
  async startIrrigation(
    timerId: string,
    channelId: number,
    durationSeconds: number
  ): Promise<void> {
    // Step 1: 设置倒计时
    const countdownDpId = 16 + channelId  // DP17-20

    // ⚠️ 特别处理DP20（4路水阀第4通道单位是分钟）
    const value = (channelId === 4)
      ? Math.round(durationSeconds / 60)
      : durationSeconds

    await this.dpService.sendCommand({
      deviceId: timerId,
      dpId: countdownDpId,
      value,
      type: DpType.VALUE
    })

    // Step 2: 开启通道
    await this.toggleChannel(timerId, channelId, true)
  }

  /**
   * 查询剩余运行时间
   */
  async getRemainingTime(
    timerId: string,
    channelId: number
  ): Promise<number> {
    const dpId = 104 + channelId  // DP105-108
    const timer = await this.timerModel.findOne({ timerId })

    return timer?.dp_data?.get(dpId.toString()) || 0
  }

  /**
   * 设置定时任务（需要实现raw编码）
   */
  async setTimerSchedule(
    timerId: string,
    channelId: number,
    schedule: TimerSchedule
  ): Promise<void> {
    const dpId = channelId === 1 ? 38 : 112 + channelId

    // TODO: 实现定时数据编码
    const rawData = this.encodeTimerSchedule(schedule)

    await this.dpService.sendCommand({
      deviceId: timerId,
      dpId,
      value: rawData,
      type: DpType.RAW
    })
  }

  /**
   * 设置天气延时
   */
  async setWeatherDelay(
    timerId: string,
    delayDays: number | 'cancel'
  ): Promise<void> {
    await this.dpService.sendCommand({
      deviceId: timerId,
      dpId: HanqiWaterValveDpId.WEATHER_DELAY,
      value: delayDays.toString(),
      type: DpType.ENUM
    })
  }
}
```

### 8.4 MQTT消息处理

```typescript
// gateway.service.ts 中处理DP点上报

async handleDpReport(message: DpMessage) {
  const { deviceId, dps } = message

  // 更新Timer的dp_data
  await this.timerModel.updateOne(
    { timerId: deviceId },
    {
      $set: {
        'dp_data': dps,
        'last_dp_update': new Date()
      }
    }
  )

  // 处理特定DP点
  for (const [dpId, value] of Object.entries(dps)) {
    switch (parseInt(dpId)) {
      case HanqiWaterValveDpId.FAULT:
        // 故障告警 - 推送通知
        await this.handleFaultAlert(deviceId, value)
        break

      case HanqiWaterValveDpId.BATTERY_STATE:
        // 电量告警
        if (parseInt(value) <= 2) {
          await this.handleLowBattery(deviceId)
        }
        break

      case HanqiWaterValveDpId.IRRIGATION_TIME_1:
      case HanqiWaterValveDpId.IRRIGATION_TIME_2:
      case HanqiWaterValveDpId.IRRIGATION_TIME_3:
      case HanqiWaterValveDpId.IRRIGATION_TIME_4:
        // 灌溉完成 - 记录日志
        await this.logIrrigation(deviceId, parseInt(dpId) - 130, value)
        break
    }
  }
}
```

---

## 九、待确认的问题

### 9.1 Raw类型数据格式

**问题：** DP38/39/113/114/115 的raw数据具体编码格式未知

**需要汉奇提供：**
1. 定时数据的二进制协议文档
2. 编码/解码示例代码
3. 是否使用Protocol Buffers或其他序列化格式

**临时方案：** 可以先通过设备抓包分析实际数据格式

### 9.2 下次定时时间格式

**问题：** DP109-112 的raw数据是时间戳还是其他格式？

**需要确认：**
- 是Unix时间戳（秒/毫秒）？
- 是Base64编码的时间？
- 还是自定义格式？

### 9.3 产品高级功能的计费

**涉及功能：**
1. 离线提醒 - 按设备收费
2. 智能天气（云端下发） - 按设备收费
3. 跳转网页 - 按设备收费

**需要确认：**
- 是否需要在后端验证用户是否开通服务？
- 计费逻辑由谁实现？

---

## 十、开发检查清单

### 10.1 基础功能

- [ ] 创建 `HanqiWaterValveDpId` 枚举
- [ ] 实现 `HanqiValveDpService` 服务
- [ ] 添加DP点上报处理逻辑
- [ ] 更新Timer Schema的dp_data字段

### 10.2 核心功能

- [ ] 实现手动灌溉功能（DP1-4 + DP17-20）
- [ ] 实现定时任务功能（DP38/113/114/115）
  - [ ] 向汉奇确认raw数据格式
  - [ ] 实现编码/解码函数
  - [ ] 添加定时任务CRUD接口
- [ ] 实现喷雾定时功能（DP39）
- [ ] 实现天气功能
  - [ ] 接入天气API
  - [ ] 实现雨天延时逻辑
  - [ ] 定时任务暂停/恢复

### 10.3 监控与告警

- [ ] 实现电池电量监控（DP47）
- [ ] 实现故障告警处理（DP53）
- [ ] 实现信号强度监控（DP118）
- [ ] 添加推送通知

### 10.4 数据统计

- [ ] 创建灌溉日志数据库表
- [ ] 实现灌溉日志记录（DP131-134）
- [ ] 添加用水统计接口
- [ ] 添加灌溉历史查询接口

### 10.5 测试

- [ ] 单元测试
- [ ] 集成测试（需要真实设备或模拟器）
- [ ] 压力测试（多设备并发）

---

## 十一、参考资料

1. **涂鸦IoT开发文档：** https://developer.tuya.com/
2. **项目现有DP常量：** `src/shared/constants/dp.constants.ts`
3. **项目Timer Schema：** `src/modules/timer/schema/timer.schema.ts`
4. **汉奇设备规格：**
   - 3路水阀：`docs/HQ2026-3路433水阀(fdekfvdlkmqyslqr)_01_28.xlsx`
   - 4路水阀：`docs/HQ2026-4路433水阀(ui9sxthml2sayg6a)_01_28.xlsx`

---

## 附录：完整DP点速查表

### A.1 3路水阀DP点汇总

| DP ID | 功能名称 | 标识符 | 类型 | 传输 | 范围/枚举值 | 单位 |
|-------|---------|--------|------|------|-------------|------|
| 1 | 区域A | switch_1 | bool | rw | true/false | - |
| 2 | 区域B | switch_2 | bool | rw | true/false | - |
| 3 | 区域C | switch_3 | bool | rw | true/false | - |
| 17 | 设置通道1灌溉时长 | countdown_1 | value | rw | 0-43200 | s |
| 18 | 设置通道2灌溉时长 | countdown_2 | value | rw | 0-43200 | s |
| 19 | 设置通道3灌溉时长 | countdown_3 | value | rw | 0-43200 | s |
| 38 | 通道1普通定时 | timer | raw | rw | 自定义协议 | - |
| 39 | 喷雾定时 | cycle_timing | raw | rw | 自定义协议 | - |
| 42 | 剩余天气延时时间 | remaining_weather_delay | value | ro | 0-240 | h |
| 43 | 天气开关 | weather_switch | bool | rw | true/false | - |
| 44 | 智能天气 | smart_weather | enum | rw | sunny, rainy | - |
| 45 | 雨天延时 | weather_delay | enum | rw | 1-7, cancel | - |
| 47 | 电池电量状态 | battery_state | enum | ro | 0-6 | - |
| 53 | 故障告警 | fault | fault | ro | low_battery, fault_1/2/3 | - |
| 105 | 通道1运行剩余倒计时 | running_countdown_1 | value | ro | 0-43200 | s |
| 106 | 通道2运行剩余倒计时 | running_countdown_2 | value | ro | 0-43200 | s |
| 107 | 通道3运行剩余倒计时 | running_countdown_3 | value | ro | 0-43200 | s |
| 109 | 通道1下次定时 | irr_timestamp_next1 | raw | ro | - | - |
| 110 | 通道2下次定时 | irr_timestamp_next2 | raw | ro | - | - |
| 111 | 通道3下次定时 | irr_timestamp_next3 | raw | ro | - | - |
| 113 | 通道2普通定时 | timer2 | raw | rw | 自定义协议 | - |
| 114 | 通道3普通定时 | timer3 | raw | rw | 自定义协议 | - |
| 117 | 信号放大 | signal_boost_switch | bool | rw | true/false | - |
| 118 | 信号强度 | signal_strength | value | ro | -255~255 | - |
| 119 | 通道1工作状态 | work_state_1 | enum | ro | manual, timing, spray, idle | - |
| 120 | 通道2工作状态 | work_state_2 | enum | ro | manual, timing, spray, idle | - |
| 121 | 通道3工作状态 | work_state_3 | enum | ro | manual, timing, spray, idle | - |
| 123 | 升级状态 | upgrate_status | enum | ro | upgrate_complete, upgrate_begin | - |
| 131 | 通道1灌溉时长日志 | irrigation_time_1 | value | ro | 0-43200 | s |
| 132 | 通道2灌溉时长日志 | irrigation_time_2 | value | ro | 0-43200 | s |
| 133 | 通道3灌溉时长日志 | irrigation_time_3 | value | ro | 0-43200 | s |

### A.2 4路水阀特有/差异DP点

| DP ID | 功能名称 | 标识符 | 类型 | 传输 | 范围/枚举值 | 单位 | 备注 |
|-------|---------|--------|------|------|-------------|------|------|
| 4 | 区域D | switch_4 | bool | rw | true/false | - | 4路专有 |
| 20 | 设置通道4灌溉时长 | countdown_4 | value | rw | 0-43200 | **min** | ⚠️ 单位是分钟！ |
| 108 | 通道4运行剩余倒计时 | running_countdown_4 | value | ro | 0-43200 | s | 4路专有 |
| 112 | 通道4下次定时 | irr_timestamp_next4 | raw | ro | - | - | 4路专有 |
| 115 | 通道4普通定时 | timer4 | raw | rw | 自定义协议 | - | 4路专有 |
| 122 | 通道4工作状态 | work_state_4 | enum | ro | manual, timing, spray, idle | - | 4路专有 |
| 134 | 通道4灌溉时长日志 | irrigation_time_4 | value | ro | 0-43200 | s | 4路专有 |

---

**文档版本：** v1.0
**创建日期：** 2026-01-29
**作者：** Claude (基于汉奇提供的技术文档)
**审核状态：** 待与汉奇确认raw类型数据格式
