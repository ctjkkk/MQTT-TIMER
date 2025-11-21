# 模块化MQTT消息处理架构 - 实施指南

## 🎯 架构概述

采用**统一Topic + 模块化处理**的架构：
- ✅ 所有设备数据通过统一Topic上报：`hanqi/device/+/report`
- ✅ 通过`msgType`字段区分不同类型的数据
- ✅ 每个模块独立订阅和处理自己关心的消息
- ✅ Controller负责路由，Service负责业务逻辑

## 📁 文件结构

```
src/
├── modules/
│   ├── timer/
│   │   ├── timer.controller.ts     ✅ 已创建 - 订阅并处理Timer消息
│   │   ├── timer.service.ts        ✅ 已创建 - Timer业务逻辑
│   │   └── schema/
│   │       └── timer.schema.ts
│   ├── outlet/
│   │   ├── outlet.controller.ts    ✅ 已创建 - 订阅并处理Outlet消息
│   │   ├── outlet.service.ts       ✅ 已创建 - Outlet业务逻辑
│   │   └── schema/
│   │       └── outlet.schema.ts
│   └── gateway/
│       ├── gateway.controller.ts   ✅ 已更新 - 订阅并处理Gateway消息
│       ├── gateway.service.ts      ✅ 已更新 - Gateway业务逻辑
│       └── schema/
│           └── HanqiGateway.schema.ts
├── shared/constants/
│   └── hanqi-mqtt-topic.constants.ts  ✅ 统一Topic定义
└── core/mqtt/
    ├── mqtt-broker.service.ts
    └── mqtt-scanner.service.ts
```

## 📡 消息流程

### 1. 设备发送消息

```
设备timer_001发送DP点数据
↓
Topic: hanqi/device/timer_001/report
Payload: {
  "msgType": "dp_report",
  "deviceId": "timer_001",
  "timestamp": 1732147200,
  "data": {
    "dps": {
      "2": true,
      "4": 85,
      "21": true
    }
  }
}
```

### 2. MQTT Broker分发

```
MQTT Broker收到消息
↓
分发给所有订阅 hanqi/device/+/report 的Controller
├─→ TimerController
└─→ OutletController
```

### 3. 模块处理

```
TimerController:
  ↓ 收到消息
  ↓ 解析msgType = "dp_report"
  ↓ 匹配：这是Timer关心的消息
  ↓ 调用 TimerService.handleDpReport()
  ↓ 更新数据库

OutletController:
  ↓ 收到消息
  ↓ 解析msgType = "dp_report"
  ↓ 匹配：这也是Outlet关心的消息（出水口相关DP）
  ↓ 调用 OutletService.handleOutletDpUpdate()
  ↓ 更新出水口状态
```

## 🔧 消息类型分配

| msgType | 处理模块 | Service方法 | 说明 |
|---------|---------|------------|------|
| `dp_report` | Timer + Outlet | `handleDpReport`<br>`handleOutletDpUpdate` | Timer处理设备级DP，Outlet处理出水口DP |
| `device_status` | Timer | `handleDeviceStatus` | 设备整体状态 |
| `irrigation_record` | Outlet | `handleIrrigationRecord` | 灌溉记录 |
| `schedule_sync` | Schedule | `handleScheduleSync` | 定时任务同步 |
| `sub_devices` | Gateway | `handleSubDevices` | 子设备列表 |
| `heartbeat` | Timer | `handleHeartbeat` | 心跳消息 |

## 💻 代码示例

### Timer模块

**timer.controller.ts**
```typescript
@Controller('timer')
export class TimerController {
  @MqttSubscribe(HanqiMqttTopic.allDeviceReport())
  async handleDeviceReport(@MqttPayload() payload: Buffer) {
    const message = parseMqttMessage(payload)
    if (!message) return

    switch (message.msgType) {
      case MqttMessageType.DP_REPORT:
        await this.timerService.handleDpReport(message)
        break
      case MqttMessageType.DEVICE_STATUS:
        await this.timerService.handleDeviceStatus(message)
        break
      case MqttMessageType.HEARTBEAT:
        await this.timerService.handleHeartbeat(message)
        break
    }
  }
}
```

**timer.service.ts**
```typescript
@Injectable()
export class TimerService {
  async handleDpReport(message: MqttUnifiedMessage) {
    // 1. 查找设备
    const timer = await HanqiTimer.findOne({ timerId: message.deviceId })

    // 2. 提取DP点数据
    const { dps } = message.data

    // 3. 更新数据库
    await HanqiTimer.updateOne(
      { _id: timer._id },
      { $set: { dp_data: dps, battery_level: dps['4'] } }
    )
  }
}
```

### Outlet模块

**outlet.controller.ts**
```typescript
@Controller('outlet')
export class OutletController {
  @MqttSubscribe(HanqiMqttTopic.allDeviceReport())
  async handleDeviceReport(@MqttPayload() payload: Buffer) {
    const message = parseMqttMessage(payload)
    if (!message) return

    switch (message.msgType) {
      case MqttMessageType.IRRIGATION_RECORD:
        await this.outletService.handleIrrigationRecord(message)
        break
      case MqttMessageType.DP_REPORT:
        await this.outletService.handleOutletDpUpdate(message)
        break
    }
  }
}
```

**outlet.service.ts**
```typescript
@Injectable()
export class OutletService {
  async handleIrrigationRecord(message: MqttUnifiedMessage) {
    // 1. 查找出水口
    const outlet = await HanqiOutlet.findOne(...)

    // 2. 创建灌溉记录
    await HanqiIrrigationRecord.create({
      outletId: outlet._id,
      duration: message.data.duration,
      water_used: message.data.waterUsed
    })

    // 3. 更新累计用水量
    await HanqiOutlet.updateOne(
      { _id: outlet._id },
      { $inc: { total_water_used: message.data.waterUsed } }
    )
  }
}
```

## 🚀 如何添加新的消息类型

假设要添加一个新的消息类型：**设备告警**

### 1. 定义消息类型

```typescript
// hanqi-mqtt-topic.constants.ts
export enum MqttMessageType {
  // ... 现有类型
  DEVICE_ALERT = 'device_alert',  // 新增
}
```

### 2. 在对应模块处理

```typescript
// timer.controller.ts
@MqttSubscribe(HanqiMqttTopic.allDeviceReport())
async handleDeviceReport(@MqttPayload() payload: Buffer) {
  const message = parseMqttMessage(payload)

  switch (message.msgType) {
    // ... 现有case
    case MqttMessageType.DEVICE_ALERT:  // 新增
      await this.timerService.handleDeviceAlert(message)
      break
  }
}

// timer.service.ts
async handleDeviceAlert(message: MqttUnifiedMessage) {
  console.log('[TimerService] 处理设备告警:', message.deviceId)
  const { alertType, level, description } = message.data
  // 处理告警逻辑...
}
```

### 3. 设备端发送

```json
Topic: hanqi/device/timer_001/report
Payload: {
  "msgType": "device_alert",
  "deviceId": "timer_001",
  "timestamp": 1732147200,
  "data": {
    "alertType": "low_battery",
    "level": "warning",
    "description": "电池电量低于20%"
  }
}
```

## ✅ 优势

1. **模块独立**：每个模块只关心自己的业务
2. **易于扩展**：新增消息类型只需在对应模块添加case
3. **职责清晰**：Controller路由，Service处理
4. **便于测试**：每个Service可以独立测试
5. **符合架构**：完全符合你的模块化架构思想

## ⚠️ 注意事项

1. **多个订阅者**：多个Controller订阅同一Topic是正常的MQTT行为
2. **消息过滤**：每个Controller会快速过滤掉不关心的msgType
3. **性能**：消息解析是轻量级的，不会有性能问题
4. **错误处理**：每个Service方法应该有try-catch
5. **日志记录**：建议在每个处理方法中添加日志

## 📊 模块职责划分

| 模块 | 职责 | 关心的msgType |
|------|------|--------------|
| Timer | 设备级别的数据和状态 | DP_REPORT, DEVICE_STATUS, HEARTBEAT |
| Outlet | 出水口和灌溉相关 | IRRIGATION_RECORD, DP_REPORT |
| Gateway | 网关和子设备管理 | SUB_DEVICES, DEVICE_STATUS |
| Schedule | 定时任务管理 | SCHEDULE_SYNC |

## 🎉 完成！

现在你的项目已经实现了：
- ✅ 统一Topic设计（满足嵌入式团队要求）
- ✅ 模块化处理（符合你的架构思想）
- ✅ Controller订阅，Service处理（符合你的开发习惯）
- ✅ 易于扩展和维护

你可以开始测试和开发了！
