# 网关配网模拟测试

无需真实硬件，完整模拟网关配网流程。

## 📁 文件说明

```
test-simulation/
├── sim_gateway.js    # 网关固件模拟器
├── sim_app.html     # 前端配网模拟页面
├── package.json             # 依赖配置
└── README.md                # 本文档
```

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
cd test-simulation

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

1. **扫描蓝牙** → 选择 `TEST_GATEWAY_001`
2. **读取网关ID** → 自动填充
3. **配置WiFi** → 随便输入（模拟）
4. **等待上线** → 点击"开始检测"
5. **绑定网关** → 输入Token和网关名称

**Token配置**：
- 如果已在HTML中配置 `REAL_TOKEN`，会自动填充
- 否则需要手动粘贴Token

---

## 🔑 配置说明

### 1. 配置真实Token（可选）

编辑 `sim_app.html` 文件第340行左右：

```javascript
// 找到这一行，填入你的Token
const REAL_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'

// 留空则需要手动粘贴
const REAL_TOKEN = ''
```

---

### 2. 配置网关ID（可选）

编辑 `sim_gateway.js` 文件第15行左右：

```javascript
// 默认网关ID
GATEWAY_ID: process.env.GATEWAY_ID || 'TEST_GATEWAY_001',

// 通过环境变量修改（Windows）
// cross-env GATEWAY_ID=MY_GATEWAY npm start
```

---

### 3. PSK密钥配置（PSK模式）

如果要测试PSK-TLS加密连接：

#### 步骤1：生成PSK
使用你的PSK生成代码生成密钥，例如：
```
MAC地址: TEST_GATEWAY_001
PSK密钥: a1b2c3d4e5f67890a1b2c3d4e5f67890
```

#### 步骤2：粘贴配置
编辑 `sim_gateway.js` 文件第29行左右：

```javascript
// PSK模式配置
PSK_IDENTITY: process.env.PSK_IDENTITY || 'TEST_GATEWAY_001',
PSK_KEY: process.env.PSK_KEY || 'a1b2c3d4e5f67890a1b2c3d4e5f67890',  // ← 粘贴到这里
```

#### 步骤3：启动PSK模式
```bash
npm run start:psk
```

或者通过环境变量指定密钥（Windows）：
```bash
cross-env PSK_KEY=你的密钥 MODE=psk node sim_gateway.js
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
