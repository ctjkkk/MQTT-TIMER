# OTA (空中升级) 完整教程

> **参考：涂鸦云OTA实现方案**
> **适用对象：第一次开发OTA功能的后端开发者**
> **版本：1.0**
> **日期：2026-02-11**

---

## 目录

1. [什么是OTA？](#1-什么是ota)
2. [涂鸦云OTA原理](#2-涂鸦云ota原理)
3. [整体架构](#3-整体架构)
4. [三方职责分工](#4-三方职责分工)
5. [后端实现详解](#5-后端实现详解)
6. [完整开发流程](#6-完整开发流程)
7. [测试指南](#7-测试指南)
8. [常见问题](#8-常见问题)

---

## 1. 什么是OTA？

### 1.1 定义

**OTA (Over-The-Air)** = 空中升级 = 远程固件更新

**通俗解释：**
就像你的手机可以在线更新系统一样，IoT设备（网关、传感器等）也可以通过网络远程升级固件，不需要物理连接电脑。

### 1.2 为什么需要OTA？

**没有OTA的痛点：**
```
发现固件bug
    ↓
需要收回设备 or USB烧录
    ↓
成本高、时间长、用户体验差
```

**有OTA的优势：**
```
发现bug
    ↓
后台上传新固件
    ↓
用户点击"升级"
    ↓
5-10分钟自动完成
    ↓
✅ 成本低、速度快、体验好
```

### 1.3 涂鸦云的OTA方案

涂鸦智能采用的OTA方案：
- **控制指令**：MQTT（实时推送）
- **固件下载**：HTTP（高效传输）
- **升级模式**：双分区切换（安全可靠）

这也是业界标准方案，小米、阿里云IoT等都采用类似架构。

---

## 2. 涂鸦云OTA原理

### 2.1 关键概念

#### 双分区（Dual Bank）

```
ESP32 Flash分区示例：

┌─────────────────────────────────┐
│  Bootloader (引导程序)          │ ← 固定不变
├─────────────────────────────────┤
│  OTA Data Partition (状态记录)  │ ← 记录哪个分区是活动的
├─────────────────────────────────┤
│  Factory App (出厂固件)         │ ← 可选，用于恢复
├─────────────────────────────────┤
│  ota_0 分区 (1MB)  ⭐ 当前运行  │ ← App Partition 0
├─────────────────────────────────┤
│  ota_1 分区 (1MB)               │ ← App Partition 1
├─────────────────────────────────┤
│  NVS (配置存储)                 │ ← 存储WiFi配置等
└─────────────────────────────────┘
```

**升级过程：**
1. 设备当前运行 `ota_0` 分区的固件（版本1.0.1）
2. 收到升级命令，下载新固件到 `ota_1` 分区
3. 校验MD5通过后，标记 `ota_1` 为启动分区
4. 重启设备，从 `ota_1` 启动（版本1.0.2）
5. 下次升级时，下载到 `ota_0`，循环往复

**好处：**
- ✅ 升级失败可以回滚到旧版本
- ✅ 不会破坏当前运行的固件
- ✅ 安全性高

#### MQTT vs HTTP

| 用途 | 协议 | 原因 |
|------|------|------|
| **下发升级通知** | MQTT | 实时推送，设备立即收到 |
| **下载固件文件** | HTTP | 高效传输大文件，支持断点续传 |
| **上报升级进度** | MQTT | 实时反馈，前端可以显示进度条 |

### 2.2 升级流程图

```
┌──────────┐         ┌──────────┐         ┌──────────┐         ┌──────────┐
│  前端    │         │  后端    │         │  网关    │         │ 文件服务器│
└────┬─────┘         └────┬─────┘         └────┬─────┘         └────┬─────┘
     │                    │                    │                    │
     │ ① 点击"升级"按钮    │                    │                    │
     ├───────────────────>│                    │                    │
     │                    │                    │                    │
     │                    │ ② MQTT下发升级通知  │                    │
     │                    ├───────────────────>│                    │
     │                    │ {version, url, md5}│                    │
     │                    │                    │                    │
     │                    │                    │ ③ HTTP GET下载固件  │
     │                    │                    ├───────────────────>│
     │                    │                    │                    │
     │                    │                    │ ④ 下载中 10%...    │
     │                    │ ⑤ MQTT上报进度     │                    │
     │                    │<───────────────────┤                    │
     │ ⑥ 轮询查询进度      │                    │                    │
     │<───────────────────┤                    │                    │
     │ 显示：下载中 45%    │                    │                    │
     │                    │                    │                    │
     │                    │                    │ ⑦ 下载完成，校验MD5 │
     │                    │ MQTT: verifying 95%│                    │
     │                    │<───────────────────┤                    │
     │                    │                    │                    │
     │                    │                    │ ⑧ 写入Flash，重启  │
     │                    │ MQTT: completed 100%                   │
     │                    │<───────────────────┤                    │
     │ 显示：升级成功 ✅   │                    │                    │
     │                    │                    │                    │
     │                    │                    │ ⑨ 启动新版本固件   │
     │                    │ MQTT: heartbeat    │                    │
     │                    │<───────────────────┤                    │
     │                    │ (firmwareVersion: 1.0.2)               │
```

---

## 3. 整体架构

### 3.1 系统架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        汉奇IoT平台                               │
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │   前端App   │    │  后端API    │    │  MQTT Broker│        │
│  │             │    │             │    │             │        │
│  │ - 显示版本  │◄──►│ - 固件管理  │◄──►│ - 消息转发  │        │
│  │ - 触发升级  │    │ - 任务调度  │    │ - 状态同步  │        │
│  │ - 显示进度  │    │ - 进度追踪  │    │             │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
│                            │                    │               │
│                            │                    │               │
│                     ┌──────┴──────┐      ┌──────┴──────┐       │
│                     │ MongoDB     │      │ Redis缓存   │       │
│                     │ - 固件版本  │      │ - 在线状态  │       │
│                     │ - 升级任务  │      │             │       │
│                     └─────────────┘      └─────────────┘       │
└─────────────────────────────────────────────────────────────────┘
                               │
                               │ MQTT + HTTP
                               ↓
                    ┌─────────────────────┐
                    │   网关设备 (ESP32)   │
                    │                     │
                    │ ota_0: v1.0.1 ⭐    │
                    │ ota_1: v1.0.2       │
                    └─────────────────────┘
```

### 3.2 技术栈

| 层级 | 技术 | 作用 |
|------|------|------|
| **前端** | React Native / Vue | 用户界面，触发升级，显示进度 |
| **后端** | NestJS + MongoDB | 固件管理，任务调度，API服务 |
| **消息队列** | MQTT (Aedes) | 实时通信，下发命令，接收进度 |
| **文件存储** | 本地文件系统 / OSS | 存储固件bin文件 |
| **固件** | ESP32-IDF / Arduino | OTA升级逻辑，HTTP下载，Flash写入 |

---

## 4. 三方职责分工

### 4.1 前端职责

**需要实现的功能：**

```typescript
// 1. 显示当前版本和最新版本
interface VersionInfo {
  currentVersion: string;  // 当前版本：1.0.1
  latestVersion: string;   // 最新版本：1.0.2
  needUpgrade: boolean;    // 是否需要升级
}

// 2. 触发升级
async function upgradeGateway(gatewayId: string) {
  const response = await fetch('/api/ota/upgrade/' + gatewayId, {
    method: 'POST',
    body: JSON.stringify({ version: '1.0.2' }),
  });
}

// 3. 轮询查询升级进度
async function pollUpgradeProgress(gatewayId: string) {
  const interval = setInterval(async () => {
    const response = await fetch('/api/ota/task/' + gatewayId);
    const task = await response.json();

    updateProgressBar(task.progress);  // 更新进度条

    if (task.status === 'completed') {
      clearInterval(interval);
      showSuccess('升级完成！');
    }
  }, 2000);  // 每2秒查询一次
}
```

**不需要前端做的：**
- ❌ 不需要处理固件文件
- ❌ 不需要了解MQTT协议
- ❌ 不需要关心底层Flash操作

### 4.2 后端职责（你的工作）

#### 📋 任务清单

**核心功能：**

```
☐ 1. 固件管理
     - 接收嵌入式团队上传的固件文件
     - 计算MD5校验和
     - 存储到文件系统或OSS
     - 管理版本号、发布状态

☐ 2. HTTP API
     - POST /ota/firmware/upload  (上传固件)
     - POST /ota/firmware/:version/release  (发布固件)
     - GET /ota/firmware/latest  (获取最新版本)
     - POST /ota/upgrade/:gatewayId  (触发升级)
     - GET /ota/task/:gatewayId  (查询升级进度)

☐ 3. MQTT通信
     - 下发升级命令到网关
     - 接收网关上报的升级进度
     - 更新数据库中的任务状态

☐ 4. 数据库管理
     - 固件版本表（firmwares）
     - 升级任务表（upgrade_tasks）
     - 记录升级历史

☐ 5. 静态文件服务
     - 提供HTTP下载固件的服务
     - 支持大文件传输
```

**数据流：**

```
嵌入式上传固件
    ↓
后端保存并生成下载URL
    ↓
前端触发升级
    ↓
后端通过MQTT下发命令
    ↓
网关从后端HTTP下载固件
    ↓
网关通过MQTT上报进度
    ↓
后端更新数据库
    ↓
前端轮询获取进度
```

### 4.3 固件端职责

**嵌入式团队（Williams）需要实现：**

```c
// 1. 订阅MQTT命令Topic
mqtt_subscribe("hanqi/gateway/{gatewayId}/command");

// 2. 接收OTA命令
void on_ota_command(char *payload) {
    // 解析JSON: {version, url, md5}
    char *url = parse_json(payload, "firmwareUrl");
    char *md5 = parse_json(payload, "md5");

    // 启动OTA任务
    start_ota_download(url, md5);
}

// 3. HTTP下载固件
void start_ota_download(char *url, char *md5) {
    // 发起HTTP GET请求
    // 循环读取数据，写入Flash
    // 每下载10%上报一次进度

    report_progress("downloading", 10);
    report_progress("downloading", 20);
    // ...
}

// 4. 校验和安装
void verify_and_install() {
    // 计算MD5
    // 对比校验和
    // 设置新分区为启动分区
    // 重启
}

// 5. 上报进度
void report_progress(char *state, int progress) {
    // 发布MQTT消息到 hanqi/gateway/{id}/report
    // {msgType: "ota_progress", data: {state, progress}}
}
```

**不需要固件端做的：**
- ❌ 不需要知道后端在哪里
- ❌ 不需要处理用户权限
- ❌ 只需要下载、校验、安装

---

## 5. 后端实现详解

### 5.1 数据库设计

#### 固件版本表（firmwares）

```typescript
{
  _id: ObjectId,
  version: "1.0.2",                    // 版本号（唯一）
  fileName: "gateway_v1.0.2.bin",      // 文件名
  fileUrl: "http://server.com/firmware/gateway_v1.0.2.bin",  // 下载地址
  fileSize: 1048576,                   // 文件大小（字节）
  md5: "5d41402abc4b2a76...",          // MD5校验和
  deviceType: "gateway",               // 设备类型
  description: "修复WiFi连接bug",      // 版本说明
  status: "released",                  // 状态：draft/testing/released/deprecated
  forceUpgrade: false,                 // 是否强制升级
  releaseDate: ISODate("2026-02-11"),
  createdAt: ISODate("2026-02-11"),
  updatedAt: ISODate("2026-02-11")
}
```

#### 升级任务表（upgrade_tasks）

```typescript
{
  _id: ObjectId,
  gatewayId: "HQ2026ABC123",           // 网关ID
  fromVersion: "1.0.1",                // 升级前版本
  toVersion: "1.0.2",                  // 目标版本
  firmwareUrl: "http://...",           // 固件下载地址
  md5: "5d41402abc...",                // MD5
  msgId: "ota_20260211_001",           // MQTT消息ID
  status: "downloading",               // pending/downloading/verifying/installing/completed/failed
  progress: 45,                        // 0-100
  errorCode: null,                     // 错误码
  errorMessage: null,                  // 错误信息
  startTime: ISODate("2026-02-11 10:00:00"),
  completeTime: null,
  createdAt: ISODate("2026-02-11"),
  updatedAt: ISODate("2026-02-11")
}
```

### 5.2 核心代码实现

#### Service层

```typescript
// src/modules/ota/ota.service.ts

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Firmware } from './schema/firmware.schema';
import { UpgradeTask } from './schema/upgrade-task.schema';
import { CommandSenderService } from '@/core/mqtt/services/commandSender.service';
import * as crypto from 'crypto';
import * as fs from 'fs';

@Injectable()
export class OtaService {
  constructor(
    @InjectModel(Firmware.name) private firmwareModel: Model<Firmware>,
    @InjectModel(UpgradeTask.name) private upgradeTaskModel: Model<UpgradeTask>,
    private commandSenderService: CommandSenderService,
  ) {}

  /**
   * 上传固件
   */
  async uploadFirmware(file: Express.Multer.File, version: string) {
    // 1. 计算MD5
    const md5 = crypto.createHash('md5').update(file.buffer).digest('hex');

    // 2. 保存文件
    const fileName = `gateway_v${version}.bin`;
    const filePath = `uploads/firmware/${fileName}`;

    if (!fs.existsSync('uploads/firmware')) {
      fs.mkdirSync('uploads/firmware', { recursive: true });
    }

    fs.writeFileSync(filePath, file.buffer);

    // 3. 生成下载URL
    const fileUrl = `${process.env.BASE_URL}/firmware/${fileName}`;

    // 4. 保存到数据库
    const firmware = await this.firmwareModel.create({
      version,
      fileName,
      fileUrl,
      fileSize: file.size,
      md5,
      deviceType: 'gateway',
      status: 'draft',
    });

    return firmware;
  }

  /**
   * 下发OTA升级命令
   */
  async upgradeGateway(gatewayId: string, version: string) {
    // 1. 查询固件信息
    const firmware = await this.firmwareModel.findOne({
      version,
      deviceType: 'gateway',
      status: 'released',
    });

    if (!firmware) {
      throw new Error('固件版本不存在或未发布');
    }

    // 2. 创建升级任务
    const msgId = `ota_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const task = await this.upgradeTaskModel.create({
      gatewayId,
      fromVersion: '1.0.1',  // TODO: 从gateway表获取
      toVersion: version,
      firmwareUrl: firmware.fileUrl,
      md5: firmware.md5,
      fileSize: firmware.fileSize,
      msgId,
      status: 'pending',
      startTime: new Date(),
    });

    // 3. 通过MQTT下发升级命令
    await this.commandSenderService.sendCommand(gatewayId, {
      msgType: 'ota_upgrade',
      msgId,
      uuid: gatewayId,
      timestamp: Math.floor(Date.now() / 1000),
      data: {
        version: firmware.version,
        firmwareUrl: firmware.fileUrl,
        md5: firmware.md5,
        fileSize: firmware.fileSize,
        forceUpgrade: false,
      },
    });

    return task;
  }

  /**
   * 处理升级进度上报
   */
  async handleUpgradeProgress(message: any) {
    const { msgId, data } = message;

    await this.upgradeTaskModel.findOneAndUpdate(
      { msgId },
      {
        status: data.state,
        progress: data.progress,
        errorCode: data.errorCode,
        errorMessage: data.errorMessage,
        completeTime: data.state === 'completed' ? new Date() : undefined,
      },
    );
  }
}
```

#### Controller层

```typescript
// src/modules/ota/ota.controller.ts

import { Controller, Post, Get, Param, Body, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OtaService } from './ota.service';

@Controller('ota')
export class OtaController {
  constructor(private readonly otaService: OtaService) {}

  /**
   * 上传固件
   * POST /api/ota/firmware/upload
   */
  @Post('firmware/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFirmware(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { version: string; description?: string },
  ) {
    return this.otaService.uploadFirmware(file, body.version);
  }

  /**
   * 升级指定网关
   * POST /api/ota/upgrade/:gatewayId
   */
  @Post('upgrade/:gatewayId')
  async upgradeGateway(
    @Param('gatewayId') gatewayId: string,
    @Body() body: { version: string },
  ) {
    return this.otaService.upgradeGateway(gatewayId, body.version);
  }

  /**
   * 查询升级任务状态
   * GET /api/ota/task/:gatewayId
   */
  @Get('task/:gatewayId')
  async getUpgradeTask(@Param('gatewayId') gatewayId: string) {
    return this.otaService.getUpgradeTask(gatewayId);
  }
}
```

#### MQTT消息处理

```typescript
// src/modules/ota/ota.mqtt.ts

import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AppEvents } from '@/shared/constants/events.constants';
import { OtaService } from './ota.service';

@Injectable()
export class OtaMqttHandler {
  constructor(private readonly otaService: OtaService) {}

  /**
   * 监听网关上报的OTA进度消息
   */
  @OnEvent(AppEvents.MQTT_GATEWAY_MESSAGE)
  async handleOtaProgress(message: any) {
    if (message.msgType === 'ota_progress') {
      await this.otaService.handleUpgradeProgress(message);
    }
  }
}
```

### 5.3 静态文件服务配置

```typescript
// src/main.ts

import { NestFactory } from '@nestjs/core';
import * as express from 'express';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 配置静态文件服务（固件下载）
  app.use('/firmware', express.static(path.join(__dirname, '..', 'uploads', 'firmware')));

  await app.listen(8018);
}
```

**访问：** `http://your-server.com:8018/firmware/gateway_v1.0.2.bin`

---

## 6. 完整开发流程

### 6.1 第一步：创建数据库模型

**已完成 ✅**（前面已创建）

```bash
src/modules/ota/schema/
├── firmware.schema.ts
└── upgrade-task.schema.ts
```

### 6.2 第二步：实现Service

**位置：** `src/modules/ota/ota.service.ts`

**需要实现的方法：**

```typescript
class OtaService {
  // 1. 固件管理
  uploadFirmware(file, version)         // 上传固件
  releaseFirmware(version)              // 发布固件
  getLatestVersion(deviceType)          // 获取最新版本

  // 2. 升级管理
  upgradeGateway(gatewayId, version)    // 触发升级
  handleUpgradeProgress(message)        // 处理进度上报
  getUpgradeTask(gatewayId)             // 查询升级任务
}
```

### 6.3 第三步：实现Controller

**位置：** `src/modules/ota/ota.controller.ts`

**API列表：**

```
POST   /api/ota/firmware/upload         上传固件
POST   /api/ota/firmware/:version/release  发布固件
GET    /api/ota/firmware/latest         获取最新版本
POST   /api/ota/upgrade/:gatewayId      触发升级
GET    /api/ota/task/:gatewayId         查询升级进度
```

### 6.4 第四步：实现MQTT消息处理

**位置：** `src/modules/ota/ota.mqtt.ts`

**监听消息：**

```typescript
@OnEvent(AppEvents.MQTT_GATEWAY_MESSAGE)
async handleOtaProgress(message) {
  if (message.msgType === 'ota_progress') {
    // 更新升级任务状态
  }
}
```

### 6.5 第五步：配置静态文件服务

**位置：** `src/main.ts`

```typescript
app.use('/firmware', express.static('uploads/firmware'));
```

### 6.6 第六步：测试

见下一章节。

---

## 7. 测试指南

### 7.1 开发环境测试

#### 测试1：上传固件

```bash
# 1. 准备一个测试固件文件（任意bin文件即可）
echo "test firmware" > test_v1.0.2.bin

# 2. 上传到后端
curl -X POST http://localhost:8018/api/ota/firmware/upload \
  -F "file=@test_v1.0.2.bin" \
  -F "version=1.0.2" \
  -F "description=测试固件"

# 预期返回：
{
  "status": true,
  "message": "Success",
  "data": {
    "version": "1.0.2",
    "fileName": "gateway_v1.0.2.bin",
    "fileUrl": "http://localhost:8018/firmware/gateway_v1.0.2.bin",
    "md5": "xxx..."
  }
}
```

#### 测试2：验证文件可下载

```bash
# 访问下载地址
curl -I http://localhost:8018/firmware/gateway_v1.0.2.bin

# 预期返回：
HTTP/1.1 200 OK
Content-Type: application/octet-stream
Content-Length: 15
```

#### 测试3：发布固件

```bash
curl -X POST http://localhost:8018/api/ota/firmware/1.0.2/release

# 预期返回：
{
  "status": true,
  "message": "Success",
  "data": {
    "version": "1.0.2",
    "status": "released",
    "releaseDate": "2026-02-11T10:00:00.000Z"
  }
}
```

#### 测试4：触发升级

```bash
# 假设有个网关ID：HQ2026TEST001
curl -X POST http://localhost:8018/api/ota/upgrade/HQ2026TEST001 \
  -H "Content-Type: application/json" \
  -d '{"version": "1.0.2"}'

# 预期：
# 1. 数据库创建升级任务
# 2. MQTT发送升级命令
# 3. 返回任务信息
```

#### 测试5：查询升级进度

```bash
curl http://localhost:8018/api/ota/task/HQ2026TEST001

# 预期返回：
{
  "status": true,
  "message": "Success",
  "data": {
    "gatewayId": "HQ2026TEST001",
    "status": "pending",
    "progress": 0,
    "fromVersion": "1.0.1",
    "toVersion": "1.0.2"
  }
}
```

### 7.2 真实硬件测试

**前提：** 嵌入式团队已经实现OTA功能

#### 测试流程

```
1. 上传真实固件（由嵌入式提供）
   ├─ 固件版本：1.0.2
   └─ 文件大小：~1MB

2. 发布固件
   └─ status: released

3. 网关连接到MQTT Broker
   └─ 确认在线状态

4. 触发升级
   └─ POST /api/ota/upgrade/{gatewayId}

5. 观察网关
   ├─ 开始下载（LED灯闪烁）
   ├─ 每10%上报一次进度
   ├─ 下载完成后校验MD5
   ├─ 写入Flash
   └─ 自动重启

6. 验证升级结果
   ├─ 网关重启后连接MQTT
   ├─ 心跳消息中包含新版本号
   └─ 升级任务状态：completed
```

### 7.3 模拟网关测试

如果没有真实硬件，可以用模拟器：

```javascript
// test/sim_gateway_ota.js

const mqtt = require('mqtt');
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');

class SimulatedGatewayOTA {
  constructor(gatewayId) {
    this.gatewayId = gatewayId;
    this.currentVersion = '1.0.1';
    this.mqttClient = null;
  }

  connect() {
    this.mqttClient = mqtt.connect('mqtt://localhost:1885');

    this.mqttClient.on('connect', () => {
      console.log('✅ 已连接到MQTT');

      // 订阅命令Topic
      this.mqttClient.subscribe(`hanqi/gateway/${this.gatewayId}/command`);
    });

    this.mqttClient.on('message', (topic, payload) => {
      const message = JSON.parse(payload.toString());

      if (message.msgType === 'ota_upgrade') {
        console.log('📥 收到OTA升级命令');
        this.startOTA(message);
      }
    });
  }

  async startOTA(message) {
    const { firmwareUrl, md5, msgId } = message.data;

    // 1. 上报开始下载
    this.reportProgress(msgId, 'downloading', 0);

    // 2. 模拟下载
    await this.downloadFirmware(firmwareUrl, msgId);

    // 3. 校验MD5
    this.reportProgress(msgId, 'verifying', 95);
    await this.sleep(2000);

    // 4. 模拟安装
    this.reportProgress(msgId, 'installing', 98);
    await this.sleep(3000);

    // 5. 完成
    this.reportProgress(msgId, 'completed', 100);

    // 6. 更新版本号
    this.currentVersion = message.data.version;

    console.log('✅ OTA升级完成！新版本：' + this.currentVersion);
  }

  async downloadFirmware(url, msgId) {
    console.log('📥 开始下载固件：' + url);

    // 模拟分段下载
    for (let i = 10; i <= 90; i += 10) {
      await this.sleep(1000);
      this.reportProgress(msgId, 'downloading', i);
    }
  }

  reportProgress(msgId, state, progress) {
    const message = {
      msgType: 'ota_progress',
      msgId,
      uuid: this.gatewayId,
      timestamp: Math.floor(Date.now() / 1000),
      data: {
        state,
        progress,
        currentVersion: this.currentVersion,
        targetVersion: '1.0.2',
      }
    };

    this.mqttClient.publish(
      `hanqi/gateway/${this.gatewayId}/report`,
      JSON.stringify(message)
    );

    console.log(`📤 上报进度: ${state} ${progress}%`);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 运行模拟器
const gateway = new SimulatedGatewayOTA('SIM_GATEWAY_001');
gateway.connect();

console.log('🚀 模拟网关已启动');
console.log('   网关ID: SIM_GATEWAY_001');
console.log('   当前版本: 1.0.1');
console.log('   等待升级命令...');
```

**运行：**
```bash
node test/sim_gateway_ota.js
```

**测试升级：**
```bash
curl -X POST http://localhost:8018/api/ota/upgrade/SIM_GATEWAY_001 \
  -H "Content-Type: application/json" \
  -d '{"version": "1.0.2"}'
```

---

## 8. 常见问题

### 8.1 Q: 升级失败了怎么办？

**A: 双分区保证安全**

```
升级失败的情况：
1. 下载中断 → 旧版本继续运行，未受影响
2. MD5校验失败 → 拒绝安装，继续运行旧版本
3. 新版本有bug → 重启3次失败后，自动回滚到旧版本
```

### 8.2 Q: 如何实现批量升级？

**A: 分批升级策略**

```typescript
// 灰度升级：先升级10%设备
async function grayScaleUpgrade(version: string, percentage: number) {
  const gateways = await this.gatewayModel.find({ firmwareVersion: '1.0.1' });

  const count = Math.ceil(gateways.length * percentage / 100);
  const selectedGateways = gateways.slice(0, count);

  for (const gateway of selectedGateways) {
    await this.otaService.upgradeGateway(gateway.gatewayId, version);
    await this.sleep(5000);  // 间隔5秒，避免并发过高
  }
}
```

### 8.3 Q: 固件文件很大（>10MB），如何优化？

**A: 使用差分升级**

```
完整升级：每次下载完整固件（1-2MB）
差分升级：只下载变化的部分（50-200KB）

实现方式：
1. 后端生成差分包（使用bsdiff算法）
2. 网关下载差分包
3. 网关应用差分包，生成新固件
4. 校验并安装

节省流量：80-90%
```

### 8.4 Q: 如何防止升级过程中断电？

**A: 断点续传 + 电量检测**

```c
// 固件端实现
void start_ota_download(char *url) {
    // 1. 检查电量
    if (battery_level < 20%) {
        report_error("BATTERY_LOW", "请充电后再升级");
        return;
    }

    // 2. 支持断点续传
    int downloaded_bytes = get_downloaded_size();
    http_set_header("Range", "bytes=" + downloaded_bytes + "-");

    // 3. 继续下载
    download_resume(url, downloaded_bytes);
}
```

### 8.5 Q: 如何监控OTA成功率？

**A: 添加统计功能**

```typescript
// 统计接口
@Get('ota/statistics')
async getOtaStatistics() {
  const total = await this.upgradeTaskModel.countDocuments();
  const completed = await this.upgradeTaskModel.countDocuments({ status: 'completed' });
  const failed = await this.upgradeTaskModel.countDocuments({ status: 'failed' });

  return {
    total,
    successRate: (completed / total * 100).toFixed(2) + '%',
    failureRate: (failed / total * 100).toFixed(2) + '%',
    avgDuration: await this.calculateAvgDuration(),
  };
}
```

---

## 9. 下一步计划

### 9.1 基础功能（本期）

```
☐ 固件上传和管理
☐ 单设备升级
☐ 升级进度追踪
☐ 升级历史记录
```

### 9.2 进阶功能（下期）

```
☐ 批量升级
☐ 灰度发布
☐ 定时升级
☐ 强制升级
☐ 差分升级
☐ 升级统计报表
```

---

## 10. 参考资源

### 10.1 涂鸦云文档

- [涂鸦IoT开发平台](https://developer.tuya.com/)
- [固件升级指南](https://developer.tuya.com/cn/docs/iot/firmware-upgrade)

### 10.2 ESP32 OTA文档

- [ESP-IDF OTA文档](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/system/ota.html)
- [Arduino OTA](https://arduino-esp8266.readthedocs.io/en/latest/ota_updates/readme.html)

### 10.3 MQTT协议

- [MQTT官方文档](https://mqtt.org/)
- [Aedes MQTT Broker](https://github.com/moscajs/aedes)

---

## 附录：完整文件清单

```
src/modules/ota/
├── dto/
│   ├── upload-firmware.dto.ts
│   ├── upgrade-device.dto.ts
│   └── firmware-response.dto.ts
├── schema/
│   ├── firmware.schema.ts
│   └── upgrade-task.schema.ts
├── ota.controller.ts
├── ota.service.ts
├── ota.mqtt.ts
├── ota.events.ts
└── ota.module.ts

test/
└── sim_gateway_ota.js

uploads/
└── firmware/
    ├── gateway_v1.0.1.bin
    └── gateway_v1.0.2.bin
```

---

## 总结

**OTA升级的核心：**

1. **控制用MQTT** → 实时推送升级命令
2. **下载用HTTP** → 高效传输大文件
3. **双分区机制** → 安全可靠，失败可回滚
4. **MD5校验** → 确保固件完整性
5. **进度实时反馈** → 用户体验好

**后端的核心工作：**

1. 管理固件版本
2. 提供HTTP下载服务
3. 通过MQTT下发升级命令
4. 接收并记录升级进度
5. 提供API供前端查询

**现在开始实现吧！** 🚀

如有问题，随时沟通。
