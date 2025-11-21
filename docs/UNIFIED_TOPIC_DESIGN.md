# 统一Topic设计方案

## 🎯 设计目标

解决嵌入式团队提出的问题：
- ✅ 所有数据上报使用同一个Topic
- ✅ 网关接入新类型子设备无需云端迭代
- ✅ 通过消息体的`msgType`字段区分数据类型
- ✅ 完全符合涂鸦IoT平台标准

## 📡 Topic结构

### 核心Topic（仅3个）

```
设备上报：hanqi/device/{deviceId}/report    ← 所有数据都通过这个topic上报
设备命令：hanqi/device/{deviceId}/command   ← 所有命令都通过这个topic下发
设备状态：hanqi/device/{deviceId}/status    ← 可选，用于状态查询
```

### 云端订阅

```typescript
// 云端只需要订阅两个通配符Topic
hanqi/device/+/report   // 接收所有设备的数据上报
hanqi/device/+/status   // 接收所有设备的状态
```

## 📨 消息格式

### 统一消息结构

```typescript
interface MqttUnifiedMessage<T = any> {
  msgType: string        // 消息类型（关键字段）
  msgId?: string         // 消息ID（可选）
  deviceId: string       // 设备ID
  timestamp: number      // 时间戳（秒）
  data: T                // 具体数据
}
```

### 消息类型（msgType）

```typescript
enum MqttMessageType {
  DP_REPORT = 'dp_report'                    // DP点数据上报
  DEVICE_STATUS = 'device_status'            // 设备状态上报
  IRRIGATION_RECORD = 'irrigation_record'    // 灌溉记录上报
  SCHEDULE_SYNC = 'schedule_sync'            // 定时任务同步
  SUB_DEVICES = 'sub_devices'                // 子设备列表（网关）
  EVENT_REPORT = 'event_report'              // 事件上报（告警等）
  HEARTBEAT = 'heartbeat'                    // 心跳
  // ... 可以无限扩展，无需修改Topic
}
```

## 💡 使用示例

### 1. DP点数据上报

**设备发送：**
```json
Topic: hanqi/device/timer_001/report
Payload:
{
  "msgType": "dp_report",
  "deviceId": "timer_001",
  "timestamp": 1732147200,
  "data": {
    "dps": {
      "1": true,      // 设备开关
      "4": 85,        // 电池电量
      "21": true,     // 出水口1开关
      "22": 1,        // 出水口1状态
      "24": 1800      // 出水口1剩余时间
    }
  }
}
```

### 2. 灌溉记录上报

**设备发送：**
```json
Topic: hanqi/device/timer_001/report
Payload:
{
  "msgType": "irrigation_record",
  "deviceId": "timer_001",
  "timestamp": 1732147200,
  "data": {
    "outletNumber": 1,
    "startTime": "2024-11-21T08:00:00Z",
    "endTime": "2024-11-21T08:10:00Z",
    "duration": 600,
    "waterUsed": 50,
    "triggerType": "scheduled"
  }
}
```

### 3. 设备状态上报

**设备发送：**
```json
Topic: hanqi/device/timer_001/report
Payload:
{
  "msgType": "device_status",
  "deviceId": "timer_001",
  "timestamp": 1732147200,
  "data": {
    "online": true,
    "battery": 85,
    "signal": 92,
    "firmware": "1.0.5"
  }
}
```

### 4. 云端发送控制命令

**云端发送：**
```json
Topic: hanqi/device/timer_001/command
Payload:
{
  "msgType": "dp_command",
  "deviceId": "timer_001",
  "timestamp": 1732147200,
  "data": {
    "dps": {
      "21": true,   // 打开出水口1
      "23": 600     // 运行600秒
    }
  }
}
```

### 5. 网关上报子设备列表

**网关发送：**
```json
Topic: hanqi/gateway/gw_001/report
Payload:
{
  "msgType": "sub_devices",
  "deviceId": "gw_001",
  "timestamp": 1732147200,
  "data": {
    "subDevices": [
      {
        "deviceId": "timer_001",
        "deviceType": "timer",
        "online": true
      },
      {
        "deviceId": "sensor_001",
        "deviceType": "soil_sensor",
        "online": true
      }
    ]
  }
}
```

## 🔧 代码实现

### Controller示例

```typescript
import { Controller } from '@nestjs/common'
import { MqttSubscribe, MqttPayload } from '@/shared/decorators/mqtt.decorator'
import {
  HanqiMqttTopic,
  MqttMessageType,
  parseMqttMessage,
  buildMqttMessage,
} from '@/shared/constants/hanqi-mqtt-topic-v2.constants'

@Controller('device')
export class DeviceController {
  /**
   * 统一处理所有设备的数据上报
   * 根据msgType分发到不同的处理函数
   */
  @MqttSubscribe(HanqiMqttTopic.allDeviceReport())
  async handleDeviceReport(@MqttPayload() payload: Buffer) {
    // 解析消息
    const message = parseMqttMessage(payload)
    if (!message) return

    // 根据msgType分发处理
    switch (message.msgType) {
      case MqttMessageType.DP_REPORT:
        await this.handleDpReport(message)
        break

      case MqttMessageType.IRRIGATION_RECORD:
        await this.handleIrrigationRecord(message)
        break

      case MqttMessageType.DEVICE_STATUS:
        await this.handleDeviceStatus(message)
        break

      case MqttMessageType.EVENT_REPORT:
        await this.handleEventReport(message)
        break

      case MqttMessageType.HEARTBEAT:
        await this.handleHeartbeat(message)
        break

      default:
        console.warn('未知的消息类型:', message.msgType)
    }
  }

  /**
   * 处理DP点上报
   */
  private async handleDpReport(message: any) {
    console.log('DP点上报:', message.deviceId, message.data.dps)
    // 更新设备数据库...
  }

  /**
   * 处理灌溉记录
   */
  private async handleIrrigationRecord(message: any) {
    console.log('灌溉记录:', message.deviceId, message.data)
    // 保存灌溉记录到数据库...
  }

  /**
   * 处理设备状态
   */
  private async handleDeviceStatus(message: any) {
    console.log('设备状态:', message.deviceId, message.data)
    // 更新设备在线状态...
  }

  /**
   * 处理事件上报（告警、故障等）
   */
  private async handleEventReport(message: any) {
    console.log('事件上报:', message.deviceId, message.data)
    // 处理告警事件...
  }

  /**
   * 处理心跳
   */
  private async handleHeartbeat(message: any) {
    console.log('心跳:', message.deviceId)
    // 更新最后通信时间...
  }

  /**
   * 发送控制命令示例
   */
  async sendControlCommand(deviceId: string, broker: any) {
    // 构建命令消息
    const message = buildMqttMessage(
      MqttMessageType.DP_COMMAND,
      deviceId,
      {
        dps: {
          '21': true,   // 打开出水口1
          '23': 600,    // 运行600秒
        },
      },
    )

    // 发布到设备命令Topic
    broker.publish(HanqiMqttTopic.deviceCommand(deviceId), message)
  }
}
```

## 🚀 扩展性优势

### 添加新的子设备类型

假设网关需要接入一个新的**土壤传感器**：

**1. 定义新的消息类型（仅需添加常量）**
```typescript
export enum MqttMessageType {
  // ... 现有类型
  SOIL_SENSOR_DATA = 'soil_sensor_data',  // 新增
}
```

**2. 设备上报数据（使用相同的Topic）**
```json
Topic: hanqi/device/sensor_001/report   ← 相同的Topic模式
Payload:
{
  "msgType": "soil_sensor_data",        ← 新的msgType
  "deviceId": "sensor_001",
  "timestamp": 1732147200,
  "data": {
    "humidity": 65,
    "temperature": 25,
    "ph": 6.5
  }
}
```

**3. 云端处理（添加case分支）**
```typescript
@MqttSubscribe(HanqiMqttTopic.allDeviceReport())  ← 无需修改订阅
async handleDeviceReport(@MqttPayload() payload: Buffer) {
  const message = parseMqttMessage(payload)

  switch (message.msgType) {
    // ... 现有case
    case MqttMessageType.SOIL_SENSOR_DATA:  // 新增分支
      await this.handleSoilSensorData(message)
      break
  }
}
```

**无需修改：**
- ✅ Topic结构
- ✅ MQTT订阅
- ✅ 网关配置
- ✅ 协议层

## 📊 对比表

| 项目 | 原设计（多Topic） | 新设计（统一Topic） |
|------|------------------|-------------------|
| 设备上报Topic数 | 多个（dp、record、status等） | 1个（report） |
| 云端订阅数 | 随设备类型增长 | 固定（2个） |
| 新增子设备类型 | 需要云端迭代 | 无需云端迭代 |
| 协议扩展性 | 差 | 优秀 |
| 符合涂鸦标准 | 否 | 是 |

## ✅ 总结

新的统一Topic设计**完全满足**嵌入式团队的要求：

1. ✅ **所有数据上报同一个Topic**：`hanqi/device/{deviceId}/report`
2. ✅ **通过msgType区分数据类型**：灵活扩展，无需修改Topic
3. ✅ **网关无需迭代**：新增子设备只需定义新的msgType
4. ✅ **云端订阅固定**：永远只订阅`hanqi/device/+/report`
5. ✅ **符合行业标准**：参考涂鸦IoT平台设计

建议：**立即采用新的统一Topic设计**，替换原有的多Topic方案。
