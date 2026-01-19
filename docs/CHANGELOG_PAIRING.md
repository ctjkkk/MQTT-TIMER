# 配网逻辑修改记录

## 日期: 2026-01-19

## 修改原因

原有的网关绑定逻辑存在安全隐患：
- ❌ 用户可以绑定任意不存在的 `gatewayId`
- ❌ 没有验证网关是否真实存在
- ❌ 没有验证网关是否在线
- ❌ 可能被恶意利用创建虚假网关记录

---

## 修改内容

### 1. `gateway.service.ts` - `bindGatewayToUser()` 方法

**修改前**:
```typescript
async bindGatewayToUser(userId: string, gatewayId: string, gatewayName?: string) {
  let gateway = await this.gatewayModel.findOne({ gatewayId })

  if (!gateway) {
    // ❌ 直接创建网关记录（不安全）
    gateway = await this.gatewayModel.create({
      gatewayId,
      userId,
      is_connected: 0,
    })
  }
  // ...
}
```

**修改后**:
```typescript
async bindGatewayToUser(userId: string, gatewayId: string, gatewayName?: string) {
  // 1. 检查网关是否已注册
  const gateway = await this.gatewayModel.findOne({ gatewayId })

  if (!gateway) {
    // ✅ 拒绝绑定不存在的网关
    throw new NotFoundException('网关未找到，请确认设备已上线或检查网关ID是否正确')
  }

  // 2. 检查网关是否在线
  const isOnline = gateway.is_connected === 1
  const isRecentlySeen = gateway.last_seen && Date.now() - gateway.last_seen.getTime() < 60000

  if (!isOnline || !isRecentlySeen) {
    // ✅ 拒绝绑定离线网关
    throw new BadRequestException('网关当前离线，请确保设备已连接网络后重试')
  }

  // 3. 检查是否已被其他用户绑定
  if (gateway.userId && gateway.userId.toString() !== userId) {
    throw new BadRequestException('该网关已被其他用户绑定')
  }

  // 4. 绑定到用户
  await this.gatewayModel.updateOne(
    { gatewayId },
    {
      $set: {
        userId,
        name: gatewayName || `网关-${gatewayId.slice(-6)}`,
        updatedAt: new Date(),
      },
    },
  )
  // ...
}
```

**关键改进**:
- ✅ 网关必须先通过MQTT注册才能被绑定
- ✅ 网关必须在线（1分钟内有心跳）
- ✅ 防止绑定虚假或不存在的网关
- ✅ 完善的错误提示信息

---

### 2. `gateway.service.ts` - `handleGatewayRegister()` 方法

**修改前**:
```typescript
private async handleGatewayRegister(gatewayId: string, data: any) {
  const existingGateway = await this.gatewayModel.findOne({ gatewayId })
  if (!existingGateway) {
    await this.gatewayModel.create({
      gatewayId,
      is_connected: 1,
      // ❌ 没有设置 userId: null
    })
  }
}
```

**修改后**:
```typescript
private async handleGatewayRegister(gatewayId: string, data: any) {
  const existingGateway = await this.gatewayModel.findOne({ gatewayId })

  if (!existingGateway) {
    // ✅ 创建未绑定用户的网关记录
    await this.gatewayModel.create({
      gatewayId,
      userId: null,  // 明确标记未绑定
      name: `网关-${gatewayId.slice(-6)}`,
      is_connected: 1,
      createdAt: new Date(),
      last_seen: new Date(),
    })
  } else {
    // ✅ 网关已存在，只更新在线状态
    await this.gatewayModel.updateOne(
      { gatewayId },
      {
        $set: {
          is_connected: 1,
          last_seen: new Date(),
        },
      },
    )
  }
}
```

**关键改进**:
- ✅ 明确设置 `userId: null` 表示未绑定
- ✅ 区分"首次注册"和"重新上线"两种情况
- ✅ 更详细的日志记录

---

### 3. `gateway.controller.ts` - 文档注释更新

添加了完整的配网流程说明和安全限制：

```typescript
/**
 * 绑定网关到用户账号（严格模式）
 *
 * 完整配网流程：
 * 1. App通过蓝牙连接网关，获取 gatewayId
 * 2. App通过蓝牙配置WiFi信息（SSID + 密码）
 * 3. 网关连接WiFi并连接MQTT Broker
 * 4. 网关自动注册（handleGatewayRegister），创建未绑定的网关记录
 * 5. App轮询 /gateway/:gatewayId/verify 检查网关是否在线
 * 6. 确认在线后，调用此接口绑定网关到用户账号
 *
 * 安全限制：
 * - 网关必须已通过MQTT注册（防止绑定虚假设备）
 * - 网关必须在线（防止绑定失效设备）
 * - 网关只能绑定一个用户（防止重复绑定）
 */
```

---

## 新增文档

### `docs/PAIRING_FLOW.md`

完整的配网流程文档，包含：
- 流程图和时序图
- 前端实现步骤（含代码示例）
- API接口详细说明
- 安全机制说明
- 测试流程
- 常见问题 FAQ

---

## 破坏性变更（Breaking Changes）

### ⚠️ API行为变更

**POST /api/gateway/bind**

**之前**: 如果网关不存在，会自动创建
**现在**: 如果网关不存在，返回 404 错误

**影响**:
- 前端需要先确保网关通过MQTT上线
- 需要实现轮询机制等待网关上线
- 需要处理新的错误响应

**错误响应示例**:

```json
// 404 - 网关未注册
{
  "statusCode": 404,
  "message": "网关未找到，请确认设备已上线或检查网关ID是否正确"
}

// 400 - 网关离线
{
  "statusCode": 400,
  "message": "网关当前离线，请确保设备已连接网络后重试"
}

// 400 - 已被绑定
{
  "statusCode": 400,
  "message": "该网关已被其他用户绑定"
}
```

---

## 前端需要的调整

### 1. 添加轮询等待逻辑

```javascript
// 配置WiFi后，需要轮询等待网关上线
async function pairGateway(gatewayId, name) {
  // 1. 等待网关上线
  await waitForGatewayOnline(gatewayId)

  // 2. 绑定网关
  await bindGateway(gatewayId, name)
}
```

### 2. 完善错误处理

```javascript
try {
  await bindGateway(gatewayId, name)
} catch (error) {
  if (error.response?.status === 404) {
    showError('网关未上线，请稍后重试')
  } else if (error.response?.status === 400) {
    showError(error.response.data.message)
  }
}
```

### 3. 添加配网状态提示

```
配网中... → WiFi配置完成 → 等待设备上线... → 绑定成功
```

---

## 测试建议

### 1. 正常流程测试

- [x] 网关MQTT注册
- [x] 网关在线验证
- [x] 网关成功绑定
- [x] 绑定后查询状态

### 2. 异常流程测试

- [x] 绑定不存在的网关（应返回404）
- [x] 绑定离线的网关（应返回400）
- [x] 绑定已被他人绑定的网关（应返回400）
- [x] 重复绑定同一网关（应返回更新消息）

### 3. 边界情况测试

- [x] 网关刚好1分钟没心跳（应判断为离线）
- [x] 网关59秒有心跳（应判断为在线）
- [x] 并发绑定同一网关

---

## 数据迁移

如果生产环境已有数据，需要：

1. 检查现有网关记录的 `userId` 字段
2. 确认所有在线网关都有 `last_seen` 时间戳
3. 清理可能存在的"虚假"网关记录

```javascript
// MongoDB 数据清理脚本（示例）
db.gateways.find({ userId: null, is_connected: 0 }).forEach(gateway => {
  const daysSinceCreated = (Date.now() - gateway.createdAt.getTime()) / (1000 * 60 * 60 * 24)

  // 删除超过7天未上线的未绑定网关
  if (daysSinceCreated > 7) {
    db.gateways.deleteOne({ _id: gateway._id })
  }
})
```

---

## 回滚方案

如果新逻辑导致问题，可以临时回滚：

```typescript
// 临时移除在线检查（仅用于紧急回滚）
async bindGatewayToUser(userId: string, gatewayId: string, gatewayName?: string) {
  const gateway = await this.gatewayModel.findOne({ gatewayId })

  if (!gateway) {
    throw new NotFoundException('网关未找到')
  }

  // 注释掉在线检查
  // if (!isOnline || !isRecentlySeen) {
  //   throw new BadRequestException('网关离线')
  // }

  // 继续绑定逻辑...
}
```

---

## 相关 Issue/PR

- Issue: 网关绑定逻辑存在安全隐患
- PR: 实现严格的网关绑定验证

---

## 审核人

- [ ] 后端开发
- [ ] 前端开发
- [ ] 产品经理
- [ ] 测试工程师
