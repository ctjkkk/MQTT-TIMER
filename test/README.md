# 网关配网模拟测试

无需真实硬件，完整模拟网关配网流程。

## 📁 文件说明

```
test/
├── sim_gateway.js    # 网关固件模拟器（支持BLE HTTP服务 + MQTT）
├── sim_app.html      # 前端配网模拟页面（真实扫描网关）
├── package.json      # 依赖配置
├── .env.example      # 环境变量配置示例（可选）
└── README.md         # 本文档
```

## 🔥 核心功能

- ✅ **真实扫描网关**：前端通过HTTP真实扫描运行中的网关模拟器
- ✅ **BLE服务模拟**：网关模拟器提供HTTP BLE服务（端口3002）
- ✅ **真实WiFi配网**：前端通过蓝牙（HTTP）发送WiFi配置给网关
- ✅ **WiFi连接模拟**：网关收到WiFi配置后，模拟连接WiFi，然后连接MQTT
- ✅ **完整配网流程**：扫描 → 读取ID → 配置WiFi → 网关连WiFi → 网关连MQTT → 上线 → 绑定

---

## ⚠️ 重要业务规则

**一个用户只能绑定一个网关**

- ✅ 首次配网：直接绑定网关
- ❌ 已绑定用户尝试绑定第二个网关：会报错
- ✔️ 更换网关：需先调用解绑接口，再绑定新网关

---

## 🚀 快速开始

### 第一步：启动后端服务

```bash
# 在项目根目录
npm run start:dev
```

确认看到：
```
✅ MQTT Broker (TCP) listening on port 1885
✅ HTTP Server listening on port 8018
```

---

### 第二步：启动网关模拟器

```bash
# 进入测试目录
cd test

# 首次运行需要安装依赖
npm install

# 启动网关模拟器（TCP模式）
npm start

# 或使用PSK模式
npm run start:psk
```

看到以下输出表示成功：
```
✅ MQTT连接成功！
📝 已发送注册消息
💓 心跳循环已启动
```

**保持这个窗口运行！**

---

### 第三步：打开前端模拟页面

**方式1：直接打开**
```bash
双击 sim_app.html
```

**方式2：使用HTTP服务器（推荐）**
```bash
npx http-server -p 3000 -o sim_app.html
```

---

### 第四步：完成配网流程

在浏览器中按步骤操作：

1. **扫描蓝牙** → 🔥 **真实扫描运行中的网关模拟器！**
   - 前端通过HTTP调用网关的BLE服务
   - 自动发现正在运行的网关（`http://localhost:3002`）
   - 如果扫描失败，请确认网关模拟器已启动

2. **读取网关ID** → 点击选中的网关，自动读取ID

3. **配置WiFi** → 🔥 **真实发送WiFi配置给网关！**
   - 输入WiFi信息（可以随便填，只是模拟）
   - 点击"配置WiFi"后，前端通过HTTP（模拟蓝牙）发送给网关
   - **观察网关模拟器窗口**，你会看到：
     - 📩 收到WiFi配置
     - 🔄 正在连接WiFi...
     - ✅ WiFi连接成功！
     - 🔄 正在连接MQTT Broker...
     - ✅ MQTT连接成功！

4. **等待上线** → 输入Token，点击"开始检测"

5. **绑定网关** → 输入网关名称，完成绑定

**Token配置**：
- 如果已在HTML中配置 `REAL_TOKEN`，会自动填充
- 否则需要手动粘贴Token

---

## 🎯 真实配网流程说明

### 模拟的是真实硬件配网过程

本测试系统**完整模拟了真实的IoT设备配网流程**：

#### 1️⃣ **网关启动（离线状态）**
```
网关上电 → 只开启BLE服务 → 等待WiFi配置
状态：无网络连接，无法连接云端
```

#### 2️⃣ **手机扫描网关（蓝牙近距离通信）**
```
手机 ←(蓝牙/HTTP)→ 网关
发现网关 → 读取网关ID
```

#### 3️⃣ **发送WiFi配置（关键步骤）**
```
手机 →(蓝牙/HTTP)→ 网关
发送：{ ssid: "家里的WiFi", password: "密码" }

网关收到配置后：
📩 收到WiFi配置
🔄 连接WiFi (SSID: 家里的WiFi)
✅ WiFi连接成功 (IP: 192.168.1.xxx)
```

#### 4️⃣ **网关连接云端（联网状态）**
```
网关 →(WiFi)→ 路由器 →(互联网)→ MQTT Broker
🔄 正在连接MQTT Broker...
✅ MQTT连接成功！
📝 已发送注册消息
💓 心跳循环已启动
```

#### 5️⃣ **手机检测上线并绑定**
```
手机 →(互联网)→ 后端API
轮询检测网关是否在线 → 在线 → 绑定到用户账号
```

### 为什么需要WiFi？

| 阶段 | 使用技术 | 目的 | 通信距离 |
|------|---------|------|---------|
| **配网** | 蓝牙 (BLE) | 传输WiFi配置 | 近距离（10米内） |
| **运行** | WiFi + MQTT | 联网通信，远程控制 | 无限制（通过互联网） |

**关键点：**
- 蓝牙只用于**配网时临时通信**（传输WiFi信息）
- WiFi用于**长期联网**，让设备连接云端，实现远程控制
- 没有WiFi，设备无法连接云端，无法远程控制

---

## 🔑 配置说明

### 1. 环境变量配置（可选）

网关模拟器支持通过环境变量配置，但**已有默认值，无需配置也能直接运行**。

#### 方式一：使用环境变量文件
```bash
# 复制示例文件
cp .env.example .env

# 编辑 .env 文件修改配置
GATEWAY_ID=MY_GATEWAY_001
MODE=tcp
```

#### 方式二：命令行传递（Windows）
```bash
# 自定义网关ID
cross-env GATEWAY_ID=MY_GATEWAY npm start

# PSK模式 + 自定义密钥
cross-env MODE=psk PSK_KEY=your_psk_key node sim_gateway.js
```

#### 方式三：直接修改代码
编辑 `sim_gateway.js` 文件第18-43行，修改 `CONFIG` 对象的默认值。

**支持的环境变量**：
| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `GATEWAY_ID` | `TEST_GATEWAY_001` | 网关ID（MAC地址） |
| `MQTT_HOST` | `127.0.0.1` | MQTT服务器地址 |
| `MODE` | `tcp` | 连接模式（tcp/psk） |
| `PSK_IDENTITY` | `TEST_GATEWAY_001` | PSK身份标识 |
| `PSK_KEY` | *(空)* | PSK密钥（128位十六进制） |
| `HEARTBEAT_INTERVAL` | `30000` | 心跳间隔（毫秒） |

---

### 2. 配置真实Token（可选）

编辑 `sim_app.html` 文件第340行左右：

```javascript
// 找到这一行，填入你的Token
const REAL_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'

// 留空则需要手动粘贴
const REAL_TOKEN = ''
```

---

### 3. PSK密钥配置（PSK加密模式）

如果需要测试PSK-TLS加密连接：

**第1步**：生成PSK密钥
```bash
# 使用你的PSK生成代码生成密钥
# 例如：MAC地址: TEST_GATEWAY_001
#      PSK密钥: a1b2c3d4e5f67890a1b2c3d4e5f67890
```

**第2步**：配置密钥（三选一）

方式A - 修改 `.env` 文件：
```bash
PSK_KEY=a1b2c3d4e5f67890a1b2c3d4e5f67890
```

方式B - 命令行传递：
```bash
cross-env MODE=psk PSK_KEY=a1b2c3d4e5f67890a1b2c3d4e5f67890 node sim_gateway.js
```

方式C - 直接修改代码 `sim_gateway.js` 第36行：
```javascript
PSK_KEY: process.env.PSK_KEY || 'a1b2c3d4e5f67890a1b2c3d4e5f67890',  // ← 粘贴到这里
```

**第3步**：启动PSK模式
```bash
npm run start:psk
```

---

## 🛠️ 常用命令

```bash
# TCP模式（用户名密码）
npm start

# PSK模式（加密连接）
npm run start:psk

# 自定义网关ID（Windows）
cross-env GATEWAY_ID=MY_GATEWAY npm start

# 自定义心跳间隔（Windows）
cross-env HEARTBEAT_INTERVAL=30000 npm start

# 组合使用（Windows）
cross-env MODE=psk PSK_KEY=你的密钥 GATEWAY_ID=MY_GATEWAY node sim_gateway.js
```

**注意**：Windows系统需要使用 `cross-env` 前缀设置环境变量。

---

## 📝 测试流程

### 正常流程 ✅
1. 启动后端
2. 启动网关模拟器（看到心跳）
3. 打开前端页面
4. 按步骤完成配网
5. 绑定成功 🎉

### 测试离线场景 ❌
1. **不启动**网关模拟器
2. 前端尝试绑定
3. 应该看到错误：「网关当前离线」

### 测试不存在的网关 ❌
1. 使用从未上线的网关ID
2. 尝试绑定
3. 应该看到错误：「网关未找到」

### 测试重复绑定（一个用户只能绑定一个网关）❌
1. 用户已绑定 `TEST_GATEWAY_001`
2. 尝试绑定 `TEST_GATEWAY_002`（需先启动另一个模拟器）
3. 应该看到错误：「您已绑定网关 xxx，一个用户只能绑定一个网关，请先解绑后再绑定新网关」

**测试步骤**：
```bash
# 终端1: 启动第一个网关模拟器
npm start

# 终端2: 启动第二个网关模拟器
cross-env GATEWAY_ID=TEST_GATEWAY_002 node sim_gateway.js

# 前端: 先绑定 TEST_GATEWAY_001，然后尝试绑定 TEST_GATEWAY_002
```

---

## 🐛 常见问题

### Q1: MQTT连接失败

**现象**：
```
❌ MQTT连接错误: connect ECONNREFUSED 127.0.0.1:1885
```

**解决**：
```bash
# 检查后端是否启动
netstat -an | findstr 1885

# 重启后端
npm run start:dev
```

---

### Q2: 网关一直离线

**检查**：
1. 网关模拟器是否在运行？
2. 看到心跳消息了吗？（💓）
3. 网关ID是否正确？

---

### Q3: Token无效

**现象**：401 Unauthorized

**解决**：
```bash
# 重新登录获取Token
curl -X POST http://localhost:8018/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"qumeng039@126.com","password":"12358221044"}'
```

---

### Q4: PSK连接失败

**检查**：
1. PSK是否已通过后端API激活？
2. PSK密钥是否正确（128位十六进制）？
3. 端口8445是否正常监听？

```bash
# 检查PSK端口
netstat -an | findstr 8445

# 激活PSK
curl -X POST http://localhost:8018/api/psk/confirm \
  -H "Content-Type: application/json" \
  -d '{"mac":"TEST_GATEWAY_001"}'
```

---

## 📊 验证结果

### 方法1：API查询
```bash
curl http://localhost:8018/api/gateway/list \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 方法2：查看后端日志
应该看到：
```
✅ 网关上线: TEST_GATEWAY_001
🔗 网关绑定成功: TEST_GATEWAY_001
```

### 方法3：MongoDB数据库
```javascript
db.gateways.find({ gatewayId: "TEST_GATEWAY_001" })
```

---

## 🧹 清理测试数据

```bash
# 删除测试网关
curl -X DELETE http://localhost:8018/api/gateway/unbind/TEST_GATEWAY_001 \
  -H "Authorization: Bearer YOUR_TOKEN"

# 或直接操作数据库
db.gateways.deleteMany({ gatewayId: /^TEST_/ })
```

---

## 💡 提示

- **业务规则**：⚠️ **一个用户只能绑定一个网关**，如需更换网关请先解绑
- **Token配置**：代码会自动添加 `Bearer ` 前缀，只需填入纯Token字符串
- **并发测试**：可同时运行多个网关模拟器（使用不同GATEWAY_ID）
- **心跳间隔**：默认30秒，可通过环境变量调整
- **连接模式**：TCP适合开发测试，PSK适合生产环境

---

**一切就绪！开始测试吧** 🚀
