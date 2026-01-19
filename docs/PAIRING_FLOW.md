# 网关配网流程文档

## 概述

本文档描述汉奇智能网关的完整配网流程，包括前端App、网关设备、后端服务之间的交互。

---

## 完整配网流程

```
┌─────────┐         ┌─────────┐         ┌─────────┐
│  App    │         │ Gateway │         │ Backend │
└────┬────┘         └────┬────┘         └────┬────┘
     │                   │                   │
     │  1. 蓝牙扫描       │                   │
     ├──────────────────>│                   │
     │                   │                   │
     │  2. 读取 gatewayId│                   │
     │<──────────────────┤                   │
     │                   │                   │
     │  3. 配置WiFi      │                   │
     ├──────────────────>│                   │
     │  (SSID + Password)│                   │
     │                   │                   │
     │                   │  4. 连接WiFi       │
     │                   │  5. 连接MQTT      │
     │                   ├──────────────────>│
     │                   │                   │
     │                   │  6. 注册消息       │
     │                   │  (action=register) │
     │                   ├──────────────────>│
     │                   │                   │
     │                   │                   │ 7. 创建网关记录
     │                   │                   │    (未绑定用户)
     │                   │                   │
     │  8. 轮询验证在线   │                   │
     ├─────────────────────────────────────>│
     │  POST /gateway/:id/verify             │
     │                   │                   │
     │<─────────────────────────────────────┤
     │  { isOnline: true }                  │
     │                   │                   │
     │  9. 绑定网关       │                   │
     ├─────────────────────────────────────>│
     │  POST /gateway/bind                  │
     │  { gatewayId, name }                 │
     │                   │                   │
     │                   │                   │ 10. 验证并绑定
     │                   │                   │
     │<─────────────────────────────────────┤
     │  { gatewayId, name, isOnline, ... }  │
     │                   │                   │
```

---

## 前端实现步骤

### 1. 蓝牙扫描与连接

```javascript
// 扫描附近的网关设备
const devices = await BluetoothLE.scan({
  services: ['hanqi-gateway-service'],
  timeout: 10000,
})

// 连接到目标设备
const gateway = await BluetoothLE.connect(devices[0].id)
```

### 2. 读取网关ID

```javascript
// 从蓝牙特征值读取网关ID
const gatewayId = await gateway.readCharacteristic({
  service: 'hanqi-gateway-service',
  characteristic: 'device-id',
})

console.log('Gateway ID:', gatewayId) // 例如: "GW20240119001"
```

### 3. 配置WiFi信息

```javascript
// 将WiFi信息写入网关
await gateway.writeCharacteristic({
  service: 'hanqi-gateway-service',
  characteristic: 'wifi-config',
  value: JSON.stringify({
    ssid: 'YourWiFiName',
    password: 'YourWiFiPassword',
  }),
})

// 断开蓝牙连接（网关将尝试连接WiFi）
await gateway.disconnect()
```

### 4. 轮询验证网关在线

```javascript
async function waitForGatewayOnline(gatewayId, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await axios.post(
        `/api/gateway/${gatewayId}/verify`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (response.data.isOnline) {
        return true // 网关已上线
      }
    } catch (error) {
      console.log('等待网关上线...', i + 1)
    }

    // 等待2秒后重试
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }

  throw new Error('网关上线超时')
}

// 使用
await waitForGatewayOnline(gatewayId)
```

### 5. 绑定网关到用户

```javascript
async function bindGateway(gatewayId, name) {
  try {
    const response = await axios.post(
      '/api/gateway/bind',
      {
        gatewayId: gatewayId,
        name: name || '我的网关',
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    return response.data
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error('网关未找到，请确认设备已上线')
    } else if (error.response?.status === 400) {
      throw new Error('网关当前离线或已被绑定')
    }
    throw error
  }
}

// 使用
const result = await bindGateway(gatewayId, '客厅网关')
console.log('绑定成功:', result)
```

---

## API 接口说明

### POST /api/gateway/:gatewayId/verify

验证网关是否在线

**请求参数**
- `gatewayId`: 网关ID（路径参数）

**响应示例**
```json
{
  "code": 200,
  "data": {
    "gatewayId": "GW20240119001",
    "isOnline": true,
    "message": "网关已上线"
  }
}
```

---

### POST /api/gateway/bind

绑定网关到用户账号

**请求头**
```
Authorization: Bearer <JWT_TOKEN>
```

**请求体**
```json
{
  "gatewayId": "GW20240119001",
  "name": "客厅网关"
}
```

**成功响应 (200)**
```json
{
  "code": 200,
  "data": {
    "gatewayId": "GW20240119001",
    "name": "客厅网关",
    "isOnline": true,
    "message": "网关绑定成功"
  }
}
```

**错误响应**

| 状态码 | 错误信息 | 说明 |
|-------|---------|------|
| 404 | 网关未找到，请确认设备已上线或检查网关ID是否正确 | 网关未通过MQTT注册 |
| 400 | 网关当前离线，请确保设备已连接网络后重试 | 网关不在线 |
| 400 | 该网关已被其他用户绑定 | 网关已绑定其他用户 |

---

## 安全机制

### 1. 严格的绑定验证

- ✅ 网关必须先通过MQTT注册才能被绑定
- ✅ 防止用户绑定虚假或不存在的网关ID
- ✅ 网关必须在线（1分钟内有心跳）才能绑定

### 2. 唯一性保证

- ✅ **一个用户只能绑定一个网关**（如需更换网关，请先解绑）
- ✅ 一个网关只能绑定一个用户
- ✅ 已绑定的网关不能被其他用户绑定
- ✅ 重复绑定会更新名称而不是报错

### 3. 实时性保证

- ✅ 使用心跳机制维持在线状态
- ✅ 1分钟无心跳自动标记为离线
- ✅ 绑定时验证最近1分钟内有活动

---

## 测试流程

### 模拟网关设备测试

如果没有真实硬件，可以使用MQTT客户端模拟：

```bash
# 1. 模拟网关注册
mosquitto_pub -h 35.172.194.174 -p 1885 \
  -u hanqi -P 12358221044 \
  -t "hanqi/gateway/GW_TEST_001/report" \
  -m '{
    "msgType": "operate_device",
    "deviceId": "GW_TEST_001",
    "data": {
      "action": "gateway_register"
    }
  }'

# 2. 模拟心跳
mosquitto_pub -h 35.172.194.174 -p 1885 \
  -u hanqi -P 12358221044 \
  -t "hanqi/gateway/GW_TEST_001/report" \
  -m '{
    "msgType": "heartbeat",
    "deviceId": "GW_TEST_001"
  }'

# 3. 验证在线
curl -X POST http://localhost:8018/api/gateway/GW_TEST_001/verify \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 4. 绑定网关
curl -X POST http://localhost:8018/api/gateway/bind \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "gatewayId": "GW_TEST_001",
    "name": "测试网关"
  }'
```

---

## 常见问题

### Q1: 为什么绑定时提示"网关未找到"？

**原因**: 网关尚未通过MQTT连接并注册到后端

**解决**:
1. 确认网关已连接WiFi
2. 确认网关已连接MQTT Broker
3. 查看后端日志是否有注册消息
4. 检查网关ID是否正确

---

### Q2: 为什么绑定时提示"网关离线"？

**原因**: 网关超过1分钟没有发送心跳

**解决**:
1. 确认网关网络连接正常
2. 重启网关设备
3. 检查MQTT连接是否断开

---

### Q3: 能否直接创建网关而不通过MQTT注册？

**回答**: 不能。这是安全设计，防止用户绑定虚假设备。网关必须先物理连接到系统才能被绑定。

---

### Q4: gatewayId 从哪里获取？

**回答**:
- 方式1: 通过蓝牙连接读取（推荐）
- 方式2: 扫描网关背面二维码
- 方式3: 手动输入设备序列号

---

## 相关文件

- `src/modules/gateway/gateway.service.ts` - 绑定逻辑实现
- `src/modules/gateway/gateway.controller.ts` - API接口
- `src/modules/gateway/dto/pairing.dto.ts` - 请求DTO
- `src/modules/gateway/dto/response.dto.ts` - 响应DTO
