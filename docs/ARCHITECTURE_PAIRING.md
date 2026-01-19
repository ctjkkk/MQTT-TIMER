# 汉奇网关配网架构详解

## 目录
- [概览](#概览)
- [阶段0：工厂生产](#阶段0工厂生产)
- [阶段1：网关首次上线](#阶段1网关首次上线)
- [阶段2：用户配网](#阶段2用户配网)
- [阶段3：网关绑定](#阶段3网关绑定)
- [数据流转](#数据流转)
- [代码调用链](#代码调用链)
- [状态机](#状态机)

---

## 概览

### 完整时序图

```
┌────────┐  ┌─────────┐  ┌─────────┐  ┌──────────┐  ┌─────────────┐
│生产线   │  │  网关    │  │  App    │  │  后端API  │  │ MQTT Broker │
└───┬────┘  └────┬────┘  └────┬────┘  └────┬─────┘  └──────┬──────┘
    │            │             │            │               │
    │                                                       │
    ╞══════════════ 阶段0: 工厂生产 ═══════════════════════╡
    │                                                       │
    │ 1. 生成PSK  │             │            │               │
    ├────────────────────────────────────>│               │
    │            │             │  POST /psk/generate       │
    │            │             │  {mac: "AA:BB:CC"}        │
    │            │             │            │               │
    │ 2. 返回密钥 │             │            │               │
    │<────────────────────────────────────┤               │
    │  {identity, key}         │            │               │
    │            │             │            │               │
    │ 3. 烧录到网关固件         │            │               │
    ├──────────>│             │            │               │
    │   write(identity, key)   │            │               │
    │            │             │            │               │
    │ 4. 确认烧录成功           │            │               │
    ├────────────────────────────────────>│               │
    │            │   POST /psk/confirm     │               │
    │            │   {mac: "AA:BB:CC"}     │               │
    │            │             │            │               │
    │            │             │    5. 更新status=1         │
    │            │             │    6. 加载到缓存           │
    │            │             │       pskCacheMap.set()   │
    │<────────────────────────────────────┤               │
    │            │             │  {tip: "PSK已激活"}        │
    │            │             │            │               │
    │                                                       │
    ╞══════════════ 阶段1: 网关首次上线 ═══════════════════╡
    │                                                       │
    │            │ 7. 用户插电启动      │            │               │
    │            │ 8. 连接默认WiFi或热点│            │               │
    │            │             │            │               │
    │            │ 9. 尝试MQTT连接(PSK-TLS)         │               │
    │            ├───────────────────────────────────────>│
    │            │   identity="AA:BB:CC"   │        Port 8445
    │            │             │            │               │
    │            │             │            │  10. TLS握手   │
    │            │             │            │  pskCallback() │
    │            │             │            │<──────────────┤
    │            │             │            │  查找identity  │
    │            │             │            │  返回key       │
    │            │             │            │───────────────>│
    │            │             │            │               │
    │            │             │            │  11. 认证成功   │
    │            │             │            │  authenticate()│
    │            │             │            │<──────────────┤
    │            │             │            │  validate()    │
    │            │             │            │───────────────>│
    │            │             │            │               │
    │            │ 12. 发送注册消息      │               │
    │            ├───────────────────────────────────────>│
    │            │  Topic: hanqi/gateway/AA:BB:CC/report   │
    │            │  {                     │               │
    │            │    msgType: "operate_device"           │
    │            │    deviceId: "AA:BB:CC"                │
    │            │    data: {                             │
    │            │      action: "gateway_register"        │
    │            │    }                   │               │
    │            │  }                     │               │
    │            │             │            │               │
    │            │             │            │<──────────────┤
    │            │             │            │  13. MQTT消息  │
    │            │             │   GatewayController       │
    │            │             │   handleGatewayReport()   │
    │            │             │            │               │
    │            │             │   14. 发布事件             │
    │            │             │   eventEmitter.emit(      │
    │            │             │     MQTT_GATEWAY_MESSAGE) │
    │            │             │            │               │
    │            │             │   15. GatewayService监听  │
    │            │             │   @OnEvent(MQTT_...)      │
    │            │             │   handleGatewayMessage()  │
    │            │             │            │               │
    │            │             │   16. 路由到注册处理       │
    │            │             │   handleGatewayRegister() │
    │            │             │            │               │
    │            │             │   17. 检查网关是否存在     │
    │            │             │   findOne({gatewayId})    │
    │            │             │            │               │
    │            │             │   18. 创建网关记录         │
    │            │             │   create({                │
    │            │             │     gatewayId,            │
    │            │             │     userId: null, ←未绑定 │
    │            │             │     is_connected: 1,      │
    │            │             │   })                      │
    │            │             │            │               │
    │            │ 19. 开始发送心跳      │               │
    │            ├───────────────────────────────────────>│
    │            │  Topic: hanqi/gateway/AA:BB:CC/report   │
    │            │  {                     │               │
    │            │    msgType: "heartbeat"│               │
    │            │    deviceId: "AA:BB:CC"│               │
    │            │  }                     │               │
    │            │  (每30秒一次)          │               │
    │            │             │            │               │
    │                                                       │
    ╞══════════════ 阶段2: 用户配网 ═══════════════════════╡
    │                                                       │
    │            │             │ 20. 打开App配网界面       │
    │            │             │ 21. 扫描蓝牙设备          │
    │            │             ├──────>│            │               │
    │            │             │  BLE scan()              │
    │            │             │        │            │               │
    │            │<────────────┴────────┤            │               │
    │            │  22. 发现网关         │            │               │
    │            │  (蓝牙广播)           │            │               │
    │            │             │        │            │               │
    │            │             │ 23. 连接蓝牙             │
    │            │<────────────┴────────┤            │               │
    │            │  BLE connect()        │            │               │
    │            │             │        │            │               │
    │            │             │ 24. 读取gatewayId        │
    │            │<────────────┴────────┤            │               │
    │            │  read('device-id')    │            │               │
    │            ├─────────────────────>│            │               │
    │            │  "AA:BB:CC"           │            │               │
    │            │             │        │            │               │
    │            │             │ 25. 用户输入WiFi信息     │
    │            │             │  SSID: "Home-WiFi"       │
    │            │             │  Password: "********"    │
    │            │             │        │            │               │
    │            │             │ 26. 通过蓝牙配置WiFi     │
    │            │<────────────┴────────┤            │               │
    │            │  write('wifi-config', {           │               │
    │            │    ssid, password     │            │               │
    │            │  })                   │            │               │
    │            │             │        │            │               │
    │            │ 27. 断开蓝牙           │            │               │
    │            │ 28. 连接配置的WiFi    │            │               │
    │            │ 29. MQTT重连(已有PSK) │            │               │
    │            ├───────────────────────────────────────>│
    │            │             │        │            │               │
    │            │ 30. 发送心跳(现在是在线状态)         │
    │            ├───────────────────────────────────────>│
    │            │             │        │            │               │
    │                                                       │
    ╞══════════════ 阶段3: 网关绑定 ═══════════════════════╡
    │                                                       │
    │            │             │ 31. App轮询检查在线      │
    │            │             ├────────────────────>│               │
    │            │      POST /gateway/AA:BB:CC/verify│               │
    │            │             │        │            │               │
    │            │             │        │  32. 查询网关状态           │
    │            │             │        │  findOne({gatewayId})      │
    │            │             │        │  检查is_connected          │
    │            │             │        │            │               │
    │            │             │<───────────────────┤               │
    │            │             │  {                 │               │
    │            │             │    isOnline: true  │               │
    │            │             │  }                 │               │
    │            │             │        │            │               │
    │            │             │ 33. 确认在线，调用绑定   │
    │            │             ├────────────────────>│               │
    │            │      POST /gateway/bind          │               │
    │            │      Authorization: Bearer xxx   │               │
    │            │      {                           │               │
    │            │        gatewayId: "AA:BB:CC"     │               │
    │            │        name: "客厅网关"           │               │
    │            │      }                           │               │
    │            │             │        │            │               │
    │            │             │        │  34. JWT验证               │
    │            │             │        │  JwtAuthGuard              │
    │            │             │        │  获取userId                │
    │            │             │        │            │               │
    │            │             │        │  35. 严格验证               │
    │            │             │        │  bindGatewayToUser()       │
    │            │             │        │                            │
    │            │             │        │  a) 查询网关               │
    │            │             │        │     findOne({gatewayId})   │
    │            │             │        │     ✅ 存在                 │
    │            │             │        │                            │
    │            │             │        │  b) 检查在线               │
    │            │             │        │     is_connected === 1     │
    │            │             │        │     last_seen < 60秒       │
    │            │             │        │     ✅ 在线                 │
    │            │             │        │                            │
    │            │             │        │  c) 检查是否被绑定         │
    │            │             │        │     gateway.userId === null│
    │            │             │        │     ✅ 未绑定               │
    │            │             │        │                            │
    │            │             │        │  d) 绑定到用户             │
    │            │             │        │     updateOne({            │
    │            │             │        │       userId: userId,      │
    │            │             │        │       name: "客厅网关"     │
    │            │             │        │     })                     │
    │            │             │        │     ✅ 绑定成功             │
    │            │             │        │            │               │
    │            │             │<───────────────────┤               │
    │            │             │  {                 │               │
    │            │             │    gatewayId,      │               │
    │            │             │    name,           │               │
    │            │             │    isOnline: true, │               │
    │            │             │    message: "绑定成功"             │
    │            │             │  }                 │               │
    │            │             │        │            │               │
    │            │             │ 36. 显示成功页面          │
    │            │             │ "配网完成！"              │
    │            │             │        │            │               │
```

---

## 阶段0：工厂生产

### 详细流程

#### 1. PSK 生成请求

**生产线调用**：
```http
POST /api/psk/generate
Content-Type: application/json
x-timestamp: 1737340800
x-signature: hmac_sha256_signature

{
  "mac": "AA:BB:CC:DD:EE:FF"
}
```

**签名验证**：
```typescript
// SignatureGuard 验证
const timestamp = req.headers['x-timestamp']
const signature = req.headers['x-signature']
const body = JSON.stringify(req.body)

// 检查时间戳（5分钟内有效）
if (Math.abs(Date.now() / 1000 - timestamp) > 300) {
  throw new UnauthorizedException('时间戳过期')
}

// 验证签名
const expectedSignature = createHmac('sha256', PSK_SECRET)
  .update(`${timestamp}${body}`)
  .digest('hex')

if (signature !== expectedSignature) {
  throw new UnauthorizedException('签名无效')
}
```

**后端处理**：
```typescript
// psk.service.ts
async generatePsk(macAddress: string) {
  // 1. 检查是否已存在且已激活
  const existingPsk = await this.hanqiPskModel.findOne({
    mac_address: macAddress
  })

  if (existingPsk && existingPsk.status === 1) {
    throw new BadRequestException('该网关已经完成PSK烧录，不能重新生成')
  }

  // 2. 生成随机密钥（64字节 = 128位十六进制）
  const identity = macAddress
  const key = randomBytes(64).toString('hex')

  // 3. 保存到数据库
  await this.hanqiPskModel.findOneAndUpdate(
    { mac_address: macAddress },
    {
      $set: {
        identity,      // "AA:BB:CC:DD:EE:FF"
        key,           // "a1b2c3d4e5f6...128位"
        status: 0,     // 未激活
      },
    },
    { upsert: true, new: true }
  )

  return { identity, key }
}
```

**数据库状态**：
```javascript
// psks 集合
{
  _id: ObjectId("..."),
  mac_address: "AA:BB:CC:DD:EE:FF",
  identity: "AA:BB:CC:DD:EE:FF",
  key: "a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456",
  status: 0,  // ← 未激活
  createdAt: ISODate("2026-01-19T10:00:00Z"),
  updatedAt: ISODate("2026-01-19T10:00:00Z")
}
```

---

#### 2. 烧录到网关固件

生产线设备将 identity 和 key 写入网关的存储器（Flash/EEPROM）：

```c
// 网关固件代码（伪代码）
void burn_psk(const char* identity, const char* key) {
    flash_write(FLASH_PSK_IDENTITY_ADDR, identity, strlen(identity));
    flash_write(FLASH_PSK_KEY_ADDR, key, strlen(key));
    flash_commit();
}
```

---

#### 3. 确认烧录成功

**生产线调用**：
```http
POST /api/psk/confirm
Content-Type: application/json
x-timestamp: 1737340860
x-signature: hmac_sha256_signature

{
  "mac": "AA:BB:CC:DD:EE:FF"
}
```

**后端处理**：
```typescript
// psk.service.ts
async confirmPsk(macAddress: string) {
  // 1. 查找PSK记录
  const psk = await this.hanqiPskModel.findOne({
    mac_address: macAddress
  })

  if (!psk) {
    throw new NotFoundException('未找到该MAC地址的PSK记录，请先调用生成接口')
  }

  if (psk.status === 1) {
    return { tip: 'PSK已经确认过' }
  }

  // 2. 更新状态为已激活
  psk.status = 1
  await psk.save()

  // 3. 加载到内存缓存（重要！）
  this.pskCacheMap.set(psk.identity, {
    key: psk.key,
    status: 1
  })

  return { tip: 'PSK烧录确认成功' }
}
```

**数据库状态更新**：
```javascript
// psks 集合
{
  _id: ObjectId("..."),
  mac_address: "AA:BB:CC:DD:EE:FF",
  identity: "AA:BB:CC:DD:EE:FF",
  key: "a1b2c3d4e5f6...",
  status: 1,  // ← 已激活 ✅
  createdAt: ISODate("2026-01-19T10:00:00Z"),
  updatedAt: ISODate("2026-01-19T10:00:10Z")
}
```

**内存缓存状态**：
```typescript
// pskCacheMap (Map)
Map {
  "AA:BB:CC:DD:EE:FF" => {
    key: "a1b2c3d4e5f6...",
    status: 1
  }
}
```

---

## 阶段1：网关首次上线

### 详细流程

#### 1. 网关启动和MQTT连接

**网关固件代码**（伪代码）：
```c
// 1. 从Flash读取PSK凭证
char identity[32];
char key[128];
flash_read(FLASH_PSK_IDENTITY_ADDR, identity, 32);
flash_read(FLASH_PSK_KEY_ADDR, key, 128);

// 2. 配置MQTT客户端使用PSK-TLS
mqtt_client_config_t config = {
    .host = "35.172.194.174",
    .port = 8445,  // PSK-TLS端口
    .transport = MQTT_TRANSPORT_OVER_TLS,
    .psk_hint_key = {
        .key = (const unsigned char*)key,
        .key_size = strlen(key),
        .hint = identity
    }
};

// 3. 连接MQTT Broker
mqtt_client_handle_t client = mqtt_client_init(&config);
mqtt_client_start(client);
```

---

#### 2. TLS-PSK 握手过程

**后端处理**（`mqttBroker.service.ts`）：

```typescript
// 创建TLS服务器时设置pskCallback
this.tlsServer = tls.createServer(
  {
    pskCallback: (socket, identity) => {
      // identity = "AA:BB:CC:DD:EE:FF"

      console.log(`PSK握手请求: identity=${identity}`)

      // 1. 从缓存查找密钥
      const key = this.pskAuthStrategy.getPskKey(identity)

      if (!key) {
        console.error(`PSK未找到: identity=${identity}`)
        return null  // 拒绝连接
      }

      // 2. 标记这是PSK连接
      socket.once('secure', () => {
        const client = socket.client ?? socket.aedesClient
        if (client) {
          client['isPSK'] = true
          client['pskIdentity'] = identity
        }
      })

      // 3. 返回密钥完成TLS握手
      return key  // Buffer.from(key, 'hex')
    },
    ciphers: 'PSK-AES128-CBC-SHA:PSK-AES256-CBC-SHA',
  },
  this.aedes.handle
)
```

**getPskKey 实现**：
```typescript
// psk.strategy.ts
getPskKey(identity: string): Buffer | null {
  try {
    // 从内存缓存获取
    const pskMeta = this.psk.pskCacheMap.get(identity)

    if (!pskMeta || !pskMeta.key) {
      this.logger.warn(`PSK key not found: ${identity}`)
      return null
    }

    // 将十六进制字符串转换为Buffer
    return Buffer.from(pskMeta.key, 'hex')
  } catch (error) {
    this.logger.error(`PSK key lookup error: ${error}`)
    return null
  }
}
```

**TLS握手成功后的认证**：
```typescript
// mqttBroker.service.ts
private async authenticate(client, username, password, callback) {
  process.nextTick(async () => {
    try {
      // 检查是否是PSK连接
      if (client.isPSK) {
        // PSK认证
        const ok = await this.pskAuthStrategy.validate(client)

        if (!ok) {
          return callback(
            authError('PSK authentication failed', AuthErrorCode.NOT_AUTHORIZED),
            false
          )
        }

        // 记录连接日志
        this.loggerService.mqttConnect(client.pskIdentity, client.id)

        // 认证成功
        return callback(null, true)
      }

      // TCP连接的用户名密码认证...
    } catch (e) {
      this.loggerService.error('Authentication error', e)
      return callback(authError('Internal error'), false)
    }
  })
}
```

**验证逻辑**：
```typescript
// psk.strategy.ts
async validate(client: MqttClient): Promise<boolean> {
  const id = client.pskIdentity  // "AA:BB:CC:DD:EE:FF"

  // 检查是否存在
  if (!this.psk.exists(id)) {
    this.logger.warn(`PSK identity not found: ${id}`)
    return false
  }

  // 检查是否激活
  if (!this.psk.isActive(id)) {
    this.logger.warn(`PSK identity not active: ${id}`)
    return false
  }

  return true
}

// psk.service.ts
public exists(identity: string): boolean {
  return this.pskCacheMap.has(identity)
}

public isActive(identity: string): boolean {
  const meta = this.pskCacheMap.get(identity)
  return meta?.status === 1
}
```

---

#### 3. 网关注册消息

**网关发送**：
```javascript
// MQTT publish
Topic: hanqi/gateway/AA:BB:CC:DD:EE:FF/report
Payload: {
  "msgType": "operate_device",
  "deviceId": "AA:BB:CC:DD:EE:FF",
  "data": {
    "action": "gateway_register",
    "firmware": "1.0.5",
    "model": "HQ-GW-001"
  }
}
```

**后端处理链路**：

```typescript
// 1. GatewayController - MQTT消息入口
@MqttSubscribe(MqttTopic.allGatewayReport())
async handleGatewayReport(@MqttPayload() payload: Buffer) {
  // 解析消息
  const message = parseMqttMessage(payload)

  if (!message) {
    this.loggerService.error('MQTT消息解析失败')
    return
  }

  // 判断消息类型并发布事件
  if (isGatewayMessage(message)) {
    await this.eventEmitter.emitAsync(
      AppEvents.MQTT_GATEWAY_MESSAGE,
      message
    )
  }
}

// 2. GatewayService - 事件监听器
@OnEvent(AppEvents.MQTT_GATEWAY_MESSAGE)
async handleGatewayMessage(message: MqttUnifiedMessage) {
  switch (message.msgType) {
    case MqttMessageType.HEARTBEAT:
      await this.handleHeartbeat(message)
      break
    case MqttMessageType.OPERATE_DEVICE:
      await this.handleGatewayLifecycle(message)
      break
    default:
      this.logger.warn(`未知消息类型: ${message.msgType}`)
  }
}

// 3. GatewayService - 生命周期路由
private async handleGatewayLifecycle(message: MqttUnifiedMessage) {
  const { data, deviceId: gatewayId } = message
  const { action } = data

  // 策略模式路由
  const actionHandlers = new Map([
    [OperateAction.GATEWAY_REGISTER, () => this.handleGatewayRegister(gatewayId, data)],
    [OperateAction.GATEWAY_REBOOT, () => this.handleGatewayReboot(gatewayId, data)],
  ])

  const handler = actionHandlers.get(action)

  if (!handler) {
    this.logger.warn(`未处理的操作: ${action}`)
    return
  }

  await handler()
}

// 4. GatewayService - 注册处理
private async handleGatewayRegister(gatewayId: string, data: any) {
  this.logger.info(`网关注册: ${gatewayId}`)

  // 检查是否已存在
  const existingGateway = await this.gatewayModel.findOne({ gatewayId })

  if (!existingGateway) {
    // 创建未绑定用户的网关记录
    await this.gatewayModel.create({
      gatewayId: gatewayId,           // "AA:BB:CC:DD:EE:FF"
      userId: null,                    // ← 未绑定用户
      name: `网关-${gatewayId.slice(-6)}`,  // "网关-EE:FF"
      is_connected: 1,                 // 在线
      firmware_version: data.firmware || null,
      createdAt: new Date(),
      last_seen: new Date(),
    })

    this.logger.info(`网关 ${gatewayId} 已注册，等待用户绑定`)
  } else {
    // 网关已存在，只更新在线状态
    await this.gatewayModel.updateOne(
      { gatewayId },
      {
        $set: {
          is_connected: 1,
          last_seen: new Date(),
        },
      }
    )

    this.logger.info(`网关 ${gatewayId} 重新上线`)
  }

  // 发布网关注册事件
  await this.eventEmitter.emitAsync(AppEvents.GATEWAY_REGISTERED, {
    gatewayId,
    timestamp: new Date(),
  })
}
```

**数据库状态**：
```javascript
// gateways 集合
{
  _id: ObjectId("..."),
  gatewayId: "AA:BB:CC:DD:EE:FF",
  userId: null,  // ← 未绑定用户
  name: "网关-EE:FF",
  is_connected: 1,  // 在线
  firmware_version: "1.0.5",
  wifi_rssi: null,
  last_seen: ISODate("2026-01-19T10:05:00Z"),
  createdAt: ISODate("2026-01-19T10:05:00Z"),
  updatedAt: ISODate("2026-01-19T10:05:00Z")
}
```

---

#### 4. 心跳机制

**网关定时发送**：
```c
// 网关固件（每30秒）
void mqtt_heartbeat_task() {
    while (1) {
        // 构造心跳消息
        cJSON *root = cJSON_CreateObject();
        cJSON_AddStringToObject(root, "msgType", "heartbeat");
        cJSON_AddStringToObject(root, "deviceId", "AA:BB:CC:DD:EE:FF");

        char *payload = cJSON_Print(root);

        // 发布到MQTT
        mqtt_publish(client, "hanqi/gateway/AA:BB:CC:DD:EE:FF/report",
                    payload, strlen(payload), 0, 0);

        cJSON_Delete(root);
        free(payload);

        // 等待30秒
        vTaskDelay(30000 / portTICK_PERIOD_MS);
    }
}
```

**后端处理**：
```typescript
// GatewayService
private async handleHeartbeat(message: MqttUnifiedMessage) {
  const { deviceId } = message

  // 查询网关
  const gateway = await this.gatewayModel.findOne({ gatewayId: deviceId })

  if (!gateway) {
    this.logger.warn(`收到未知网关的心跳: ${deviceId}`)
    return
  }

  // 检测状态变化
  const wasOffline = gateway.is_connected === 0

  // 更新心跳时间和在线状态
  await this.gatewayModel.updateOne(
    { gatewayId: deviceId },
    {
      $set: {
        last_seen: new Date(),
        is_connected: 1,
      },
    }
  )

  // 如果从离线变为在线，发布上线事件
  if (wasOffline) {
    this.logger.info(`网关上线: ${deviceId}`)
    await this.eventEmitter.emitAsync(AppEvents.GATEWAY_ONLINE, {
      gatewayId: deviceId,
      timestamp: new Date(),
    })
  }
}
```

---

## 阶段2：用户配网

### 详细流程

#### 1. 蓝牙扫描和连接

**App端代码**（React Native示例）：
```javascript
import { BleManager } from 'react-native-ble-plx'

const manager = new BleManager()

// 1. 扫描蓝牙设备
async function scanForGateway() {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      manager.stopDeviceScan()
      reject(new Error('扫描超时'))
    }, 10000)

    manager.startDeviceScan(
      null,  // 不过滤UUID
      null,  // 默认选项
      (error, device) => {
        if (error) {
          clearTimeout(timeout)
          reject(error)
          return
        }

        // 查找汉奇网关（通过设备名称）
        if (device.name && device.name.startsWith('HanQi_GW_')) {
          manager.stopDeviceScan()
          clearTimeout(timeout)
          resolve(device)
        }
      }
    )
  })
}

// 2. 连接设备
async function connectToGateway(device) {
  await device.connect()
  await device.discoverAllServicesAndCharacteristics()
  return device
}
```

---

#### 2. 读取网关ID

```javascript
// 3. 读取网关ID
async function readGatewayId(device) {
  const SERVICE_UUID = '0000180A-0000-1000-8000-00805F9B34FB'
  const CHARACTERISTIC_UUID = '00002A29-0000-1000-8000-00805F9B34FB'

  const characteristic = await device.readCharacteristicForService(
    SERVICE_UUID,
    CHARACTERISTIC_UUID
  )

  // 将Base64解码为字符串
  const gatewayId = Buffer.from(characteristic.value, 'base64').toString('utf-8')

  console.log('Gateway ID:', gatewayId)  // "AA:BB:CC:DD:EE:FF"

  return gatewayId
}
```

---

#### 3. 配置WiFi信息

```javascript
// 4. 配置WiFi
async function configureWiFi(device, ssid, password) {
  const SERVICE_UUID = '0000180A-0000-1000-8000-00805F9B34FB'
  const WIFI_CONFIG_UUID = '00002A2A-0000-1000-8000-00805F9B34FB'

  const config = {
    ssid: ssid,
    password: password,
  }

  // 将配置编码为Base64
  const configJson = JSON.stringify(config)
  const configBase64 = Buffer.from(configJson).toString('base64')

  // 写入特征值
  await device.writeCharacteristicWithResponseForService(
    SERVICE_UUID,
    WIFI_CONFIG_UUID,
    configBase64
  )

  console.log('WiFi配置已发送')
}
```

**网关固件处理**：
```c
// 网关收到WiFi配置
void ble_wifi_config_callback(uint8_t *data, uint16_t len) {
    // 解析JSON
    cJSON *root = cJSON_Parse((char*)data);

    const char *ssid = cJSON_GetObjectItem(root, "ssid")->valuestring;
    const char *password = cJSON_GetObjectItem(root, "password")->valuestring;

    // 保存到NVS
    nvs_set_str(nvs_handle, "wifi_ssid", ssid);
    nvs_set_str(nvs_handle, "wifi_password", password);
    nvs_commit(nvs_handle);

    cJSON_Delete(root);

    // 断开蓝牙，重启WiFi
    ble_disconnect();
    wifi_connect(ssid, password);
}
```

---

#### 4. 网关连接新WiFi并重连MQTT

```c
// 网关固件
void wifi_event_handler(void* arg, esp_event_base_t event_base,
                       int32_t event_id, void* event_data) {
    if (event_id == WIFI_EVENT_STA_CONNECTED) {
        ESP_LOGI(TAG, "WiFi已连接");

        // 重新连接MQTT（使用已烧录的PSK）
        mqtt_reconnect();
    }
}

void mqtt_reconnect() {
    // 读取PSK凭证
    char identity[32];
    char key[128];
    flash_read(FLASH_PSK_IDENTITY_ADDR, identity, 32);
    flash_read(FLASH_PSK_KEY_ADDR, key, 128);

    // 重新连接
    mqtt_client_config_t config = {
        .host = "35.172.194.174",
        .port = 8445,
        .transport = MQTT_TRANSPORT_OVER_TLS,
        .psk_hint_key = {
            .key = (const unsigned char*)key,
            .key_size = strlen(key),
            .hint = identity
        }
    };

    mqtt_client_reconnect(client, &config);
}
```

---

## 阶段3：网关绑定

### 详细流程

#### 1. 轮询检查网关在线

**App端代码**：
```javascript
// 5. 轮询等待网关上线
async function waitForGatewayOnline(gatewayId, token, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await axios.post(
        `https://api.example.com/api/gateway/${gatewayId}/verify`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (response.data.data.isOnline) {
        console.log('网关已上线！')
        return true
      }

      console.log(`等待网关上线... (${i + 1}/${maxAttempts})`)
    } catch (error) {
      console.error('检查在线状态失败:', error)
    }

    // 等待2秒后重试
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  throw new Error('网关上线超时')
}
```

**后端处理**：
```typescript
// GatewayController
@Post('/:gatewayId/verify')
@ApiResponseStandard({
  summary: '验证配网状态',
  responseDescription: '返回网关在线状态',
  msg: '查询成功',
  responseType: VerifyPairingResponseDto,
})
async verifyPairing(@Param('gatewayId') gatewayId: string) {
  const isOnline = await this.gatewayService.verifyGatewayOnline(gatewayId)

  return {
    gatewayId,
    isOnline,
    message: isOnline ? '网关已上线' : '网关未上线，请稍候重试',
  }
}

// GatewayService
async verifyGatewayOnline(gatewayId: string): Promise<boolean> {
  const gateway = await this.gatewayModel.findOne({ gatewayId })

  if (!gateway) {
    return false
  }

  // 检查是否在线且最后在线时间在1分钟内
  const isOnline = gateway.is_connected === 1
  const isRecent = gateway.last_seen &&
                   Date.now() - gateway.last_seen.getTime() < 60000

  return isOnline && isRecent
}
```

---

#### 2. 绑定网关到用户

**App端代码**：
```javascript
// 6. 绑定网关
async function bindGateway(gatewayId, name, token) {
  try {
    const response = await axios.post(
      'https://api.example.com/api/gateway/bind',
      {
        gatewayId: gatewayId,
        name: name || '我的网关',
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    )

    console.log('绑定成功:', response.data.data)
    return response.data.data
  } catch (error) {
    if (error.response) {
      switch (error.response.status) {
        case 404:
          throw new Error('网关未找到，请确认设备已上线')
        case 400:
          throw new Error(error.response.data.message || '网关离线或已被绑定')
        default:
          throw new Error('绑定失败，请重试')
      }
    }
    throw error
  }
}
```

**后端处理**：
```typescript
// GatewayController
@Post('/bind')
@ApiResponseStandard({
  summary: '绑定网关到用户账号',
  responseDescription: '绑定成功',
  msg: '绑定成功',
  responseType: BindGatewayResponseDto,
})
async bindGateway(@Request() req: any, @Body() dto: BindGatewayDto) {
  // JWT Guard 已验证token并注入用户信息
  const userId = req.user.id

  return await this.gatewayService.bindGatewayToUser(
    userId,
    dto.gatewayId,
    dto.name
  )
}

// GatewayService
async bindGatewayToUser(userId: string, gatewayId: string, gatewayName?: string) {
  // ===== 验证步骤 =====

  // 1. 检查网关是否已注册
  const gateway = await this.gatewayModel.findOne({ gatewayId })

  if (!gateway) {
    this.logger.warn(`绑定失败: 网关 ${gatewayId} 未找到`)
    throw new NotFoundException('网关未找到，请确认设备已上线或检查网关ID是否正确')
  }

  // 2. 检查网关是否在线
  const isOnline = gateway.is_connected === 1
  const isRecentlySeen = gateway.last_seen &&
                         Date.now() - gateway.last_seen.getTime() < 60000

  if (!isOnline || !isRecentlySeen) {
    this.logger.warn(`绑定失败: 网关 ${gatewayId} 离线`)
    throw new BadRequestException('网关当前离线，请确保设备已连接网络后重试')
  }

  // 3. 检查是否已被其他用户绑定
  if (gateway.userId && gateway.userId.toString() !== userId) {
    this.logger.warn(`绑定失败: 网关 ${gatewayId} 已被其他用户绑定`)
    throw new BadRequestException('该网关已被其他用户绑定')
  }

  // 4. 检查是否已绑定到当前用户（重复绑定）
  if (gateway.userId && gateway.userId.toString() === userId) {
    // 只更新名称
    await this.gatewayModel.updateOne(
      { gatewayId },
      {
        $set: {
          name: gatewayName || gateway.name,
          updatedAt: new Date(),
        },
      }
    )

    this.logger.info(`网关 ${gatewayId} 信息已更新`)

    return {
      gatewayId,
      name: gatewayName || gateway.name,
      isOnline: true,
      message: '网关信息已更新',
    }
  }

  // ===== 绑定操作 =====

  // 5. 绑定到用户
  await this.gatewayModel.updateOne(
    { gatewayId },
    {
      $set: {
        userId: userId,
        name: gatewayName || `网关-${gatewayId.slice(-6)}`,
        updatedAt: new Date(),
      },
    }
  )

  this.logger.info(`网关 ${gatewayId} 已绑定到用户 ${userId}`)

  return {
    gatewayId,
    name: gatewayName || `网关-${gatewayId.slice(-6)}`,
    isOnline: true,
    message: '网关绑定成功',
  }
}
```

**数据库状态最终**：
```javascript
// gateways 集合
{
  _id: ObjectId("..."),
  gatewayId: "AA:BB:CC:DD:EE:FF",
  userId: ObjectId("507f1f77bcf86cd799439011"),  // ← 已绑定用户 ✅
  name: "客厅网关",  // ← 用户自定义名称
  is_connected: 1,
  firmware_version: "1.0.5",
  wifi_rssi: -45,
  last_seen: ISODate("2026-01-19T10:15:30Z"),
  createdAt: ISODate("2026-01-19T10:05:00Z"),
  updatedAt: ISODate("2026-01-19T10:15:35Z")  // ← 绑定时间
}
```

---

## 数据流转

### PSK 数据流转

```
┌──────────────────────────────────────────────────────────┐
│                    PSK 数据生命周期                        │
└──────────────────────────────────────────────────────────┘

1. 生成阶段
   ┌─────────────────┐
   │ 生产线调用API    │
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │ randomBytes(64) │ → 生成128位十六进制密钥
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │ MongoDB psks    │ → status: 0 (未激活)
   │ 集合            │
   └─────────────────┘

2. 烧录阶段
   ┌─────────────────┐
   │ 写入网关Flash    │
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │ 生产线确认API    │
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │ MongoDB psks    │ → status: 1 (已激活)
   │ 集合            │
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │ pskCacheMap     │ → 加载到内存
   │ (内存缓存)       │
   └─────────────────┘

3. 使用阶段
   ┌─────────────────┐
   │ 网关TLS连接      │
   └────────┬────────┘
            │ identity="AA:BB:CC"
            ▼
   ┌─────────────────┐
   │ pskCallback()   │ → 查找 pskCacheMap
   └────────┬────────┘
            │ 返回 key (Buffer)
            ▼
   ┌─────────────────┐
   │ TLS握手完成      │
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │ MQTT认证         │ → validate(client)
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │ 连接建立成功      │
   └─────────────────┘
```

---

### 网关数据流转

```
┌──────────────────────────────────────────────────────────┐
│                  Gateway 数据生命周期                       │
└──────────────────────────────────────────────────────────┘

1. 注册阶段（网关首次上线）
   ┌─────────────────┐
   │ MQTT连接成功     │
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │ 发送注册消息      │ → msgType: "operate_device"
   └────────┬────────┘   action: "gateway_register"
            │
            ▼
   ┌─────────────────┐
   │ handleGatewayRegister()
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │ MongoDB gateways│ → userId: null (未绑定)
   │ 集合            │   is_connected: 1
   └─────────────────┘

2. 心跳阶段
   ┌─────────────────┐
   │ 定时发送心跳      │ → 每30秒
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │ handleHeartbeat()│
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │ 更新 last_seen   │ → MongoDB
   │ 更新 is_connected│
   └─────────────────┘

3. 绑定阶段
   ┌─────────────────┐
   │ 用户调用绑定API   │
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │ 验证网关存在      │ → findOne({gatewayId})
   │ 验证网关在线      │ → is_connected && last_seen
   │ 验证未被绑定      │ → userId === null
   └────────┬────────┘
            │ 全部通过 ✅
            ▼
   ┌─────────────────┐
   │ 更新 userId      │ → MongoDB
   │ 更新 name        │
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │ 绑定成功          │ → userId: ObjectId("...")
   └─────────────────┘
```

---

## 代码调用链

### PSK 认证调用链

```
网关MQTT连接请求
      ↓
tls.createServer() pskCallback
      ↓
PskAuthStrategy.getPskKey(identity)
      ↓
pskCacheMap.get(identity)
      ↓
返回 Buffer(key)
      ↓
TLS握手成功
      ↓
Aedes authenticate(client, username, password, callback)
      ↓
检查 client.isPSK
      ↓
PskAuthStrategy.validate(client)
      ↓
pskCacheMap.has(identity) && status === 1
      ↓
callback(null, true) → 认证成功
```

---

### 网关注册调用链

```
网关发送 MQTT 消息
      ↓
MqttBrokerService.aedes.on('publish')
      ↓
MqttDispatchService.dispatch(topic, payload)
      ↓
GatewayController.handleGatewayReport() [@MqttSubscribe]
      ↓
parseMqttMessage(payload)
      ↓
isGatewayMessage() → true
      ↓
EventEmitter.emitAsync(MQTT_GATEWAY_MESSAGE)
      ↓
GatewayService.handleGatewayMessage() [@OnEvent]
      ↓
switch (msgType) → OPERATE_DEVICE
      ↓
handleGatewayLifecycle()
      ↓
策略模式路由 → action: GATEWAY_REGISTER
      ↓
handleGatewayRegister(gatewayId, data)
      ↓
gatewayModel.findOne({gatewayId})
      ↓
不存在 → gatewayModel.create({userId: null, ...})
      ↓
EventEmitter.emitAsync(GATEWAY_REGISTERED)
```

---

### 网关绑定调用链

```
App 调用 POST /api/gateway/bind
      ↓
JwtAuthGuard 验证 token
      ↓
提取 userId from JWT
      ↓
GatewayController.bindGateway(req, dto)
      ↓
GatewayService.bindGatewayToUser(userId, gatewayId, name)
      ↓
┌─────────────────────────────────┐
│ 验证流程                         │
├─────────────────────────────────┤
│ 1. findOne({gatewayId})         │
│    ↓ 不存在 → throw NotFoundException
│    ↓ 存在 → 继续                 │
│                                 │
│ 2. 检查在线状态                  │
│    is_connected === 1           │
│    last_seen < 60秒             │
│    ↓ 离线 → throw BadRequestException
│    ↓ 在线 → 继续                 │
│                                 │
│ 3. 检查绑定状态                  │
│    gateway.userId !== null      │
│    gateway.userId !== userId    │
│    ↓ 已被他人绑定 → throw BadRequestException
│    ↓ 未绑定 → 继续               │
└─────────────────────────────────┘
      ↓
updateOne({gatewayId}, {userId, name})
      ↓
返回绑定结果
```

---

## 状态机

### PSK 状态机

```
┌──────────┐
│  初始化   │
└────┬─────┘
     │ POST /psk/generate
     ▼
┌──────────┐
│ 已生成    │ status: 0
│ (未激活)  │
└────┬─────┘
     │ POST /psk/confirm
     │ (烧录成功)
     ▼
┌──────────┐
│ 已激活    │ status: 1
│          │ ← 加载到 pskCacheMap
└────┬─────┘
     │
     ▼
┌──────────┐
│ 可用于    │
│ MQTT认证  │
└──────────┘
```

---

### 网关状态机

```
┌───────────┐
│  不存在    │
└─────┬─────┘
      │ 网关MQTT注册
      ▼
┌───────────┐
│ 已注册     │ userId: null
│ (未绑定)   │ is_connected: 1
└─────┬─────┘
      │
      ├─────────────┐
      │             │
      │ 用户绑定     │ 离线（超60秒无心跳）
      ▼             ▼
┌───────────┐  ┌──────────┐
│ 已绑定     │  │  离线     │ is_connected: 0
│           │◄─┤          │
└─────┬─────┘  └────┬─────┘
      │             │
      │ 用户解绑     │ 重新上线
      ▼             ▼
┌───────────┐  ┌──────────┐
│ 已解绑     │  │  在线     │ is_connected: 1
│ (删除记录) │  │          │
└───────────┘  └──────────┘
```

---

### 配网流程状态机

```
┌────────────┐
│ 出厂状态    │ PSK已烧录
└──────┬─────┘
       │ 用户插电
       ▼
┌────────────┐
│ 等待配网    │ 蓝牙广播中
└──────┬─────┘
       │ App连接蓝牙
       ▼
┌────────────┐
│ 配网中      │ 读取ID、配置WiFi
└──────┬─────┘
       │ WiFi连接成功
       ▼
┌────────────┐
│ 连接MQTT    │ PSK-TLS握手
└──────┬─────┘
       │ MQTT连接成功
       ▼
┌────────────┐
│ 已注册      │ 发送注册消息
│ (未绑定)    │
└──────┬─────┘
       │ App轮询检测在线
       ▼
┌────────────┐
│ 检测到在线  │
└──────┬─────┘
       │ App调用绑定API
       ▼
┌────────────┐
│ 绑定成功    │ userId已关联
│ (配网完成)  │
└────────────┘
```

---

## 安全要点总结

### 1. PSK 安全

✅ 每个设备唯一密钥（64字节）
✅ 工厂烧录，用户无法修改
✅ TLS加密传输
✅ 签名保护生成API
✅ 内存缓存快速验证

### 2. 绑定安全

✅ 网关必须先注册（防止虚假设备）
✅ 网关必须在线（1分钟内有心跳）
✅ 一个网关只能绑定一个用户
✅ JWT认证保护API
✅ 详细的日志记录

### 3. 通信安全

✅ PSK-TLS端口：8445（加密）
✅ TCP端口：1885（仅开发测试）
✅ HTTPS API（生产环境）
✅ JWT token有效期控制

---

## 故障处理

### 常见问题诊断

#### 1. PSK连接失败

```
问题：网关无法通过PSK连接MQTT

诊断步骤：
1. 检查PSK是否已激活
   db.psks.findOne({identity: "AA:BB:CC"})
   → status 应该为 1

2. 检查是否在缓存中
   → 查看日志：pskCacheMap.has()

3. 检查密钥是否正确
   → 对比数据库和网关Flash中的key

解决方案：
- 重新生成并烧录PSK
- 重启后端服务重新加载缓存
```

#### 2. 绑定失败（404）

```
问题：绑定时提示"网关未找到"

诊断步骤：
1. 检查网关是否已注册
   db.gateways.findOne({gatewayId: "AA:BB:CC"})

2. 检查MQTT是否连接成功
   → 查看MQTT日志

3. 检查是否发送了注册消息
   → 查看GatewayService日志

解决方案：
- 确认网关MQTT已连接
- 确认网关发送了注册消息
- 手动触发网关重启
```

#### 3. 绑定失败（400 离线）

```
问题：绑定时提示"网关离线"

诊断步骤：
1. 检查 is_connected 字段
   db.gateways.findOne({gatewayId: "AA:BB:CC"})

2. 检查 last_seen 时间
   → 是否超过60秒

3. 检查心跳是否正常发送
   → 查看MQTT消息日志

解决方案：
- 确认网络连接正常
- 确认心跳机制运行正常
- 重启网关设备
```

---

这份文档详细说明了整个配网流程的每个环节！
