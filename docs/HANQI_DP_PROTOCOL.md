# 汉奇Timer设备DP点传输协议文档

## 概述

本文档定义了汉奇Timer设备基于涂鸦IoT平台标准的DP点（Data Point）传输协议。DP点是设备功能和属性的标准化抽象，用于设备与云端之间的数据交互。

## DP点基本概念

### 什么是DP点？

DP点（Data Point）是涂鸦IoT平台定义的设备功能抽象单元，每个DP点代表设备的一个具体功能或属性。

### DP点的组成

- **dpId**: DP点唯一标识（数字）
- **type**: 数据类型（bool/value/enum/string/raw）
- **mode**: 访问模式（ro/wo/rw）
- **value**: DP点的值

### DP点类型说明

| 类型 | 说明 | 示例 |
|------|------|------|
| bool | 布尔型 | true/false |
| value | 数值型 | 0-100 |
| enum | 枚举型 | "0"/"1"/"2" |
| string | 字符串型 | "前院草坪" |
| raw | 透传型 | JSON对象 |

## 汉奇Timer设备DP点定义

### DP点分类

```
1-20:    网关/Timer设备基础功能
21-40:   出水口1控制
41-60:   出水口2控制
61-80:   出水口3控制
81-100:  出水口4控制
101-120: 定时任务相关
121-140: 统计和记录
```

### 基础功能DP点 (1-20)

| DP ID | 名称 | 类型 | 模式 | 说明 |
|-------|------|------|------|------|
| 1 | device_switch | bool | rw | 设备总开关 |
| 2 | device_online | bool | ro | 设备在线状态 |
| 3 | device_reset | bool | wo | 设备重启 |
| 4 | battery_level | value | ro | 电池电量(0-100%) |
| 5 | signal_strength | value | ro | 信号强度(0-100) |
| 6 | firmware_version | string | ro | 固件版本 |
| 7 | outlet_count | value | ro | 出水口数量(2-4) |
| 8 | device_fault | enum | ro | 故障告警 |
| 9 | longitude | string | rw | 经度 |
| 10 | latitude | string | rw | 纬度 |

**device_fault 枚举值：**
- 0: 正常
- 1: 低电量
- 2: 水压异常
- 3: 传感器故障

### 出水口DP点 (21-100)

每个出水口占用20个DP点，以出水口1为例：

| DP ID | 名称 | 类型 | 模式 | 说明 |
|-------|------|------|------|------|
| 21 | outlet_1_switch | bool | rw | 出水口1开关 |
| 22 | outlet_1_status | enum | ro | 出水口1运行状态 |
| 23 | outlet_1_manual_duration | value | wo | 手动运行时长(秒) |
| 24 | outlet_1_remaining_time | value | ro | 剩余运行时长(秒) |
| 25 | outlet_1_flow_rate | value | ro | 流速(升/分钟) |
| 26 | outlet_1_pressure | value | ro | 水压(bar*10) |
| 27 | outlet_1_total_water | value | ro | 累计用水量(升) |
| 28 | outlet_1_zone_name | string | rw | 区域名称 |
| 29 | outlet_1_enabled | bool | rw | 启用状态 |

**outlet_status 枚举值：**
- 0: 关闭
- 1: 运行中
- 2: 暂停
- 3: 故障

**其他出水口DP点计算公式：**
- 出水口2: 基础ID = 41 (DP41-DP60)
- 出水口3: 基础ID = 61 (DP61-DP80)
- 出水口4: 基础ID = 81 (DP81-DP100)

### 定时任务DP点 (101-120)

| DP ID | 名称 | 类型 | 模式 | 说明 |
|-------|------|------|------|------|
| 101 | schedule_data | raw | rw | 定时任务配置(JSON) |
| 102 | schedule_sync | bool | wo | 请求同步定时任务 |
| 103 | schedule_conflict | string | ro | 任务冲突告警 |

### 统计记录DP点 (121-140)

| DP ID | 名称 | 类型 | 模式 | 说明 |
|-------|------|------|------|------|
| 121 | today_total_water | value | ro | 今日总用水量(升) |
| 122 | week_total_water | value | ro | 本周总用水量(升) |
| 123 | month_total_water | value | ro | 本月总用水量(升) |
| 124 | irrigation_record | raw | ro | 灌溉记录(JSON) |

## MQTT Topic定义

### Topic格式

```
设备上报: /hanqi/device/{deviceId}/dp/report
设备下发: /hanqi/device/{deviceId}/dp/command
设备状态: /hanqi/device/{deviceId}/status
设备在线: /hanqi/device/{deviceId}/online
设备离线: /hanqi/device/{deviceId}/offline
灌溉记录: /hanqi/device/{deviceId}/irrigation/record
定时同步: /hanqi/device/{deviceId}/schedule/sync
```

### 订阅Topic（服务端）

```
/hanqi/device/+/dp/report        # 订阅所有设备的DP点上报
/hanqi/device/+/online           # 订阅所有设备的在线状态
/hanqi/device/+/offline          # 订阅所有设备的离线状态
/hanqi/device/+/irrigation/record # 订阅所有灌溉记录
```

## 消息格式

### DP点消息结构

```json
{
  "msgId": "1732147200000_abc123",
  "deviceId": "timer_001",
  "t": 1732147200,
  "dps": {
    "1": true,
    "4": 85,
    "21": true,
    "22": 1,
    "24": 300
  }
}
```

**字段说明：**
- `msgId`: 消息ID（可选）
- `deviceId`: 设备ID
- `t`: 时间戳（秒）
- `dps`: DP点数据对象（键为dpId字符串，值为对应的DP点值）

## 典型使用场景

### 场景1: 设备上报状态

**设备 -> 云端**

Topic: `/hanqi/device/timer_001/dp/report`

```json
{
  "deviceId": "timer_001",
  "t": 1732147200,
  "dps": {
    "2": true,
    "4": 85,
    "5": 92,
    "21": false,
    "41": true,
    "42": 1,
    "44": 1800
  }
}
```

解释：
- DP2: 设备在线
- DP4: 电池85%
- DP5: 信号92%
- DP21: 出水口1关闭
- DP41: 出水口2开启
- DP42: 出水口2运行中
- DP44: 出水口2剩余1800秒

### 场景2: 控制出水口

**云端 -> 设备**

Topic: `/hanqi/device/timer_001/dp/command`

```json
{
  "msgId": "cmd_123456",
  "deviceId": "timer_001",
  "t": 1732147200,
  "dps": {
    "21": true,
    "23": 600
  }
}
```

解释：
- DP21: 打开出水口1
- DP23: 运行600秒(10分钟)

### 场景3: 设置区域名称

**云端 -> 设备**

Topic: `/hanqi/device/timer_001/dp/command`

```json
{
  "deviceId": "timer_001",
  "t": 1732147200,
  "dps": {
    "28": "前院草坪",
    "48": "后院花园",
    "68": "菜园",
    "88": "果树区"
  }
}
```

### 场景4: 上报灌溉记录

**设备 -> 云端**

Topic: `/hanqi/device/timer_001/irrigation/record`

```json
{
  "deviceId": "timer_001",
  "t": 1732147200,
  "dps": {
    "124": {
      "outletNumber": 1,
      "startTime": "2024-11-21T08:00:00Z",
      "endTime": "2024-11-21T08:10:00Z",
      "duration": 600,
      "waterUsed": 50,
      "triggerType": "scheduled"
    }
  }
}
```

### 场景5: 同步定时任务

**云端 -> 设备**

Topic: `/hanqi/device/timer_001/schedule/sync`

```json
{
  "deviceId": "timer_001",
  "t": 1732147200,
  "dps": {
    "101": {
      "schedules": [
        {
          "scheduleId": "sch_001",
          "outletNumber": 1,
          "startTime": "06:00",
          "duration": 600,
          "repeatDays": [1, 3, 5],
          "enabled": true,
          "sprayMode": {
            "enabled": true,
            "ecoMode": true,
            "pattern": "interval",
            "intervalOn": 60,
            "intervalOff": 30
          }
        }
      ]
    }
  }
}
```

## 代码使用示例

### 1. 解析设备上报的DP点消息

```typescript
import { DpService } from '@/shared/services/dp.service'
import { HanqiTimerDpId } from '@/shared/constants/hanqi-dp.constants'

// 在MQTT消息处理器中
async handleDeviceReport(payload: Buffer, clientId: string) {
  const dpMessage = this.dpService.parseDpMessage(payload)
  if (!dpMessage) return

  // 获取电池电量
  const batteryLevel = this.dpService.getDpValue<number>(
    dpMessage,
    HanqiTimerDpId.BATTERY_LEVEL
  )

  // 获取出水口1的数据
  const outlet1Data = this.dpService.getOutletData(dpMessage, 1)
  console.log('出水口1状态:', outlet1Data.status)
  console.log('出水口1剩余时间:', outlet1Data.remainingTime)
}
```

### 2. 构建控制指令

```typescript
// 控制出水口1运行10分钟
const dpData = this.dpService.buildOutletControlCommand(1, true, 600)
const message = this.dpService.buildDpMessage('timer_001', dpData)

// 发送MQTT消息
this.mqttBroker.publish(
  HanqiMqttTopic.deviceDpCommand('timer_001'),
  message,
  1 // QoS
)
```

### 3. 验证DP点数据

```typescript
const isValid = this.dpService.validateDpValue(
  HanqiTimerDpId.BATTERY_LEVEL,
  85
)
// true

const isValid2 = this.dpService.validateDpValue(
  HanqiTimerDpId.BATTERY_LEVEL,
  150
)
// false (超出范围0-100)
```

## 最佳实践

### 1. QoS设置建议

- 控制命令: QoS 1 (至少一次)
- 状态上报: QoS 0 (最多一次)
- 重要数据: QoS 1 (至少一次)

### 2. 消息频率控制

- 状态上报: 建议间隔5-30秒
- 运行中的出水口: 建议每5秒上报一次剩余时间
- 电池电量: 建议每分钟上报一次

### 3. 错误处理

- 始终验证DP点数据的有效性
- 对于无法识别的DP点ID，记录警告日志
- 设备离线时，缓存控制命令待设备上线后重发

### 4. 数据持久化

- 将最新的DP点数据存储到数据库的`dp_data`字段
- 记录`last_dp_update`时间戳
- 重要的状态变化应写入日志

## 注意事项

1. **dpId必须使用字符串**: 在JSON中，dps对象的键必须是字符串类型
2. **时间戳使用秒**: `t`字段使用Unix时间戳（秒）
3. **设备ID唯一性**: deviceId在整个系统中必须唯一
4. **DP点访问权限**: 严格遵守ro/wo/rw的访问模式
5. **数值单位**: 某些数值需要乘以系数（如水压*10）以保持精度

## 扩展性

该DP点方案预留了足够的扩展空间：
- DP11-DP20: 基础功能扩展
- 每个出水口有10个预留DP点
- DP104-DP120: 定时任务功能扩展
- DP125-DP140: 统计记录扩展

## 相关文件

- DP点定义: `src/shared/constants/hanqi-dp.constants.ts`
- DP点服务: `src/shared/services/dp.service.ts`
- MQTT Topic: `src/shared/constants/hanqi-mqtt-topic.constants.ts`
- 数据模型: `src/modules/timer/schema/timer.schema.ts`
