# DP 模块快速上手

## 核心组件

DP 模块只有 **2 个核心组件**：

1. **DpConfigService** - DP 配置查询 + MQTT 命令构建
2. **ParseDpReportPipe** - MQTT 上报解析 + 验证

## DpConfigService 使用

### 1. 注入服务

```typescript
import { Injectable } from '@nestjs/common'
import { DpConfigService } from '@/modules/dp'

@Injectable()
export class OutletService {
  constructor(
    private readonly dpConfigService: DpConfigService,
  ) {}
}
```

### 2. 查询 DP 配置

```typescript
// 获取完整 Schema
const schema = this.dpConfigService.getSchema('rgnmfjlnx6hzagwe')
// 返回: { productId, productName, outletCount, dps: [...] }

// 获取单个 DP 定义
const dpDef = this.dpConfigService.getDpDefinition('rgnmfjlnx6hzagwe', 1)
// 返回: { id: 1, code: 'switch_1', name: '区域 A', dataType: 'bool', ... }
```

### 3. 构建 MQTT 命令（核心功能）⭐

```typescript
/**
 * 控制出水口开关
 */
async switchOutlet(deviceId: string, outletNum: number, value: boolean) {
  // 1. 查询设备信息
  const device = await this.gatewayService.findByDeviceId(deviceId)

  // 2. 构建并验证命令（一行搞定）
  const command = this.dpConfigService.buildCommand(
    device.productId,  // 产品ID
    deviceId,          // 设备ID
    { [outletNum]: value }  // DP 数据: { 1: true } 表示 DP1=true
  )
  // 自动验证：DP 是否存在、是否可写、值的类型是否正确
  // 返回: { msgId: "xxx", deviceId: "yyy", t: 123456, dps: { "1": true } }

  // 3. 发送 MQTT
  await this.mqttClient.publish(
    `device/${deviceId}/command`,
    JSON.stringify(command)
  )

  return { success: true }
}
```

### 完整示例

```typescript
import { Injectable } from '@nestjs/common'
import { DpConfigService } from '@/modules/dp'

@Injectable()
export class OutletService {
  constructor(
    private readonly dpConfigService: DpConfigService,
    private readonly gatewayService: GatewayService,
    private readonly mqttClient: MqttClientService,
  ) {}

  // 示例 1: 打开开关
  async switchOn(deviceId: string, outletNum: number) {
    const device = await this.gatewayService.findByDeviceId(deviceId)

    const command = this.dpConfigService.buildCommand(
      device.productId,
      deviceId,
      { [outletNum]: true }  // DP1-4 对应开关1-4
    )

    await this.mqttClient.publish(`device/${deviceId}/command`, JSON.stringify(command))
  }

  // 示例 2: 设置倒计时
  async setCountdown(deviceId: string, outletNum: number, seconds: number) {
    const device = await this.gatewayService.findByDeviceId(deviceId)

    const command = this.dpConfigService.buildCommand(
      device.productId,
      deviceId,
      { [16 + outletNum]: seconds }  // DP17-20 对应倒计时1-4
    )

    await this.mqttClient.publish(`device/${deviceId}/command`, JSON.stringify(command))
  }

  // 示例 3: 批量设置（开关 + 倒计时）
  async switchWithCountdown(deviceId: string, outletNum: number, seconds: number) {
    const device = await this.gatewayService.findByDeviceId(deviceId)

    const command = this.dpConfigService.buildCommand(
      device.productId,
      deviceId,
      {
        [outletNum]: true,         // 打开开关
        [16 + outletNum]: seconds  // 设置倒计时
      }
    )

    await this.mqttClient.publish(`device/${deviceId}/command`, JSON.stringify(command))
  }

  // 示例 4: 设置天气功能
  async setWeather(deviceId: string, weatherSwitch: boolean, smartWeather: string) {
    const device = await this.gatewayService.findByDeviceId(deviceId)

    const command = this.dpConfigService.buildCommand(
      device.productId,
      deviceId,
      {
        43: weatherSwitch,   // DP43: 天气开关
        44: smartWeather     // DP44: 智能天气 (sunny/rainy)
      }
    )

    await this.mqttClient.publish(`device/${deviceId}/command`, JSON.stringify(command))
  }
}
```

## ParseDpReportPipe 使用

### 1. 注入管道

```typescript
import { Injectable } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { ParseDpReportPipe, ParsedDpReport } from '@/modules/dp'

@Injectable()
export class DeviceReportHandler {
  constructor(
    private readonly parseDpReportPipe: ParseDpReportPipe,
    private readonly outletService: OutletService,
    private readonly gatewayService: GatewayService,
  ) {}
}
```

### 2. 解析 MQTT 上报

```typescript
/**
 * 处理设备上报
 * Topic: device/{deviceId}/report
 */
@OnEvent('mqtt.device.report')
async handleReport(event: { deviceId: string; payload: Buffer; productId: string }) {
  const { deviceId, payload, productId } = event

  // 注入 productId（必须）
  const json = JSON.parse(payload.toString())
  json.productId = productId
  const modifiedPayload = Buffer.from(JSON.stringify(json))

  // 使用管道解析和验证
  const report = await this.parseDpReportPipe.transform(modifiedPayload, {
    type: 'body',
    metatype: Buffer,
    data: '',
  })

  // report 结构:
  // {
  //   dps: [{ dpId, code, name, value, formattedValue, valid, errors }],
  //   validCount: 2,
  //   invalidCount: 0,
  //   deviceId: 'device_001',
  //   productId: 'rgnmfjlnx6hzagwe',
  //   timestamp: 1234567890000
  // }

  this.logger.log(`设备 ${deviceId} 上报 ${report.validCount} 个有效 DP`)

  // 处理有效的 DP
  for (const dp of report.dps) {
    if (dp.valid) {
      await this.handleDp(deviceId, dp)
    }
  }

  // 处理无效的 DP（记录日志）
  const invalidDps = report.dps.filter(dp => !dp.valid)
  if (invalidDps.length > 0) {
    this.logger.warn(`无效 DP: ${invalidDps.map(dp => `DP${dp.dpId}`).join(', ')}`)
  }
}
```

### 3. 处理不同的 DP

```typescript
/**
 * 根据 DP 类型分发处理
 */
private async handleDp(deviceId: string, dp: ParsedDpReport['dps'][0]) {
  const { code, value, dpId } = dp

  switch (code) {
    // 开关状态
    case 'switch_1':
    case 'switch_2':
    case 'switch_3':
    case 'switch_4':
      await this.outletService.updateSwitchState(deviceId, dpId, value)
      this.logger.log(`${code} = ${value ? '开' : '关'}`)
      break

    // 运行倒计时
    case 'running_countdown_1':
    case 'running_countdown_2':
    case 'running_countdown_3':
    case 'running_countdown_4':
      const outletNum = dpId - 104  // DP105-108 → 1-4
      await this.outletService.updateCountdown(deviceId, outletNum, value)
      this.logger.log(`倒计时${outletNum} = ${value}秒`)
      break

    // 电池电量
    case 'battery_state':
      await this.gatewayService.updateBattery(deviceId, value)
      this.logger.log(`电池电量 = ${value}`)
      break

    // 故障告警
    case 'fault':
      this.logger.warn(`设备 ${deviceId} 故障: ${value}`)
      // await this.alertService.handleFault(deviceId, value)
      break

    // 工作状态
    case 'work_state_1':
    case 'work_state_2':
    case 'work_state_3':
    case 'work_state_4':
      const outlet = dpId - 118  // DP119-122 → 1-4
      await this.outletService.updateWorkState(deviceId, outlet, value)
      this.logger.log(`工作状态${outlet} = ${value}`)
      break

    default:
      this.logger.debug(`收到 DP${dpId}(${code}) = ${dp.formattedValue}`)
      break
  }
}
```

## 常用 DP 点速查

| DP ID | Code | 名称 | 读写 | 说明 |
|-------|------|------|------|------|
| 1-4 | switch_1-4 | 开关1-4 | rw | 控制出水口开关 |
| 17-20 | countdown_1-4 | 倒计时1-4 | rw | 设置倒计时（秒） |
| 38 | timer | 通道1普通定时 | rw | 定时任务 |
| 42 | remaining_weather_delay | 剩余天气延时 | ro | 只读 |
| 43 | weather_switch | 天气开关 | rw | 开启/关闭天气功能 |
| 44 | smart_weather | 智能天气 | rw | sunny/rainy |
| 45 | weather_delay | 雨天延时 | rw | 1-7天/cancel |
| 47 | battery_state | 电池电量 | ro | 只读，0-6 |
| 53 | fault | 故障告警 | ro | 只读 |
| 105-108 | running_countdown_1-4 | 运行倒计时 | ro | 只读 |
| 109-112 | irr_timestamp_next1-4 | 下次定时 | ro | 只读 |
| 113-115 | timer2-4 | 通道2-4定时 | rw | 定时任务 |
| 117 | signal_boost_switch | 信号放大 | rw | 开启/关闭 |
| 118 | signal_strength | 信号强度 | ro | 只读 |
| 119-122 | work_state_1-4 | 工作状态1-4 | ro | 只读，manual/timing/spray/idle |
| 131-134 | irrigation_time_1-4 | 灌溉时长日志 | ro | 只读 |

## MQTT 消息格式

### 设备上报（Device → Server）

```json
{
  "msgId": "123456",
  "deviceId": "device_001",
  "t": 1234567890,
  "dps": {
    "1": true,
    "17": 300,
    "47": "5",
    "105": 285
  }
}
```

### 命令下发（Server → Device）

```json
{
  "msgId": "1234567890_abc",
  "deviceId": "device_001",
  "t": 1234567890,
  "dps": {
    "1": true,
    "17": 300
  }
}
```

## 错误处理

```typescript
try {
  const command = this.dpConfigService.buildCommand(
    productId,
    deviceId,
    { 2: true }  // 如果1路产品不支持 DP2
  )
} catch (error) {
  // Error: 验证失败: DP2 不存在
  this.logger.error('构建命令失败', error.message)
}
```

## 常见问题

### Q: 出水口编号和 DP ID 的关系？
A: 出水口编号 = DP ID
- 出水口1 对应 DP1（switch_1）
- 出水口2 对应 DP2（switch_2）
- 倒计时1 对应 DP17（countdown_1）
- 倒计时2 对应 DP18（countdown_2）

### Q: 如何验证产品支持哪些 DP？
A: 查看 `src/modules/dp/constants/product.schemas.ts` 或调用：
```typescript
const schema = this.dpConfigService.getSchema('rgnmfjlnx6hzagwe')
console.log(schema.dps)  // 所有支持的 DP
```

### Q: 为什么要注入 productId？
A: 管道需要知道是哪个产品型号，才能验证 DP 是否正确。1路产品不支持 DP2，4路产品才支持 DP1-4。

### Q: 如何处理只读 DP？
A: buildCommand 会自动检查，如果尝试下发只读 DP 会抛出错误。

## 总结

**DpConfigService 核心方法：**
- `getSchema(productId)` - 查询 DP 配置
- `getDpDefinition(productId, dpId)` - 查询单个 DP
- `buildCommand(productId, deviceId, dps)` - 构建 MQTT 命令 ⭐

**ParseDpReportPipe 核心方法：**
- `transform(payload, metadata)` - 解析 MQTT 上报 ⭐

**数据流：**
```
上报: MQTT Buffer → ParseDpReportPipe → ParsedDpReport → 业务处理

下发: 业务代码 → DpConfigService.buildCommand → MQTT JSON → MQTT
```
