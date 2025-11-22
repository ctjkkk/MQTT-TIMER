# TIMER-MQTT 项目架构文档

> **项目名称**: TIMER-MQTT 智能灌溉定时控制系统
> **文档版本**: 1.0.0
> **更新日期**: 2025-11-22

---

## 目录

1. [项目概述](#1-项目概述)
2. [项目目录结构](#2-项目目录结构)
3. [系统架构图](#3-系统架构图)
4. [数据模型设计](#4-数据模型设计)
5. [MQTT架构设计](#5-mqtt架构设计)
6. [DP点设计与数据库字段映射](#6-dp点设计与数据库字段映射)
7. [Topic设计方案](#7-topic设计方案)
8. [服务层架构](#8-服务层架构)
9. [认证与安全机制](#9-认证与安全机制)
10. [日志系统](#10-日志系统)
11. [核心业务流程](#11-核心业务流程)
12. [技术栈](#12-技术栈)
13. [配置说明](#13-配置说明)

---

## 1. 项目概述

### 1.1 项目简介

**TIMER-MQTT** 是一个基于AI Soildrops的微服务，使用NestJS + MQTT + MongoDB等技术栈。该项目实现了完整的IoT应用架构，包括：

- **MQTT消息代理**：基于 Aedes，支持 TCP 和 TLS-PSK 认证
- **DP点管理系统**：参考涂鸦IoT平台设计，统一数据点管理
- **设备管理**：支持汉奇网关和 Timer 设备的接入与管理
- **灌溉调度**：支持定时任务、手动控制、喷雾模式等多种灌溉方式
- **数据记录**：完整的灌溉记录和统计功能

### 1.2 核心特性

| 特性 | 描述 |
|------|------|
| MQTT消息代理 | 基于Aedes，支持TCP(1884)和TLS-PSK(8445) |
| DP点数据管理 | 类涂鸦IoT的数据点标准化管理 |
| 灌溉定时任务 | 支持一次性、每日、每周、自定义任务类型 |
| 出水口控制 | 支持2-4个出水口的独立控制和监测 |
| PSK身份认证 | 支持设备级别的PSK密钥认证 |
| 数据持久化 | MongoDB云数据库存储 |
| 日志系统 | 基于Winston的分级日志记录 |

---

## 2. 项目目录结构

```
TIMER-MQTT/
├── src/
│   ├── main.ts                          # 应用入口
│   ├── app.module.ts                    # 根模块
│   ├── app.service.ts                   # 应用服务
│   ├── app.controller.ts                # 应用控制器
│   │
│   ├── config/
│   │   └── database.config.ts           # 数据库配置常量
│   │
│   ├── core/                            # 核心模块
│   │   ├── mqtt/
│   │   │   ├── mqtt.module.ts           # MQTT模块定义
│   │   │   ├── mqtt-broker.service.ts   # Aedes MQTT Broker服务
│   │   │   └── mqtt-scanner.service.ts  # MQTT处理器扫描器
│   │   │
│   │   └── database/
│   │       ├── database.module.ts       # 数据库模块定义
│   │       └── database.service.ts      # MongoDB连接管理
│   │
│   ├── modules/                         # 业务模块
│   │   ├── gateway/                     # 网关模块
│   │   │   ├── gateway.module.ts
│   │   │   ├── gateway.service.ts
│   │   │   ├── gateway.controller.ts
│   │   │   ├── schema/
│   │   │   │   └── HanqiGateway.schema.ts
│   │   │   └── interfaces/
│   │   │       └── gateway-service.interface.ts
│   │   │
│   │   ├── timer/                       # Timer设备模块
│   │   │   ├── timer.module.ts
│   │   │   ├── timer.service.ts
│   │   │   ├── timer.controller.ts
│   │   │   └── schema/
│   │   │       └── timer.schema.ts
│   │   │
│   │   ├── outlet/                      # 出水口模块
│   │   │   ├── outlet.module.ts
│   │   │   ├── outlet.service.ts
│   │   │   ├── outlet.controller.ts
│   │   │   └── schema/
│   │   │       └── outlet.schema.ts
│   │   │
│   │   ├── schedule/                    # 定时任务模块
│   │   │   ├── schedule.module.ts
│   │   │   ├── schedule.service.ts
│   │   │   ├── schedule.controller.ts
│   │   │   └── schema/
│   │   │       └── schedule.schema.ts
│   │   │
│   │   ├── psk/                         # PSK认证模块
│   │   │   ├── psk.module.ts
│   │   │   ├── psk.service.ts
│   │   │   ├── psk.controller.ts
│   │   │   └── schema/
│   │   │       └── psk.schema.ts
│   │   │
│   │   └── irrigation-record/           # 灌溉记录模块
│   │       └── schema/
│   │           └── irrigation-record.schema.ts
│   │
│   ├── shared/                          # 共享模块
│   │   ├── constants/                   # 常量定义
│   │   │   ├── mqtt.constants.ts        # MQTT基础常量
│   │   │   ├── hanqi-mqtt-topic.constants.ts  # Topic设计
│   │   │   ├── hanqi-dp.constants.ts    # DP点定义
│   │   │   ├── database.constans.ts     # 数据库常量
│   │   │   └── log-messages.constants.ts # 日志消息
│   │   │
│   │   ├── decorators/
│   │   │   └── mqtt.decorator.ts        # MQTT装饰器
│   │   │
│   │   ├── services/
│   │   │   └── dp.service.ts            # DP点处理服务
│   │   │
│   │   ├── schemas/                     # 共享Schema
│   │   │   ├── User.ts
│   │   │   └── Role.ts
│   │   │
│   │   └── utils/
│   │       └── hash.ts                  # 密码哈希工具
│   │
│   └── common/                          # 通用模块
│       └── logger/
│           ├── logger.module.ts
│           ├── logger.service.ts        # Winston日志服务
│           └── interfaces/
│               └── logger-options.interface.ts
│
├── docs/                                # 文档目录
├── logs/                                # 日志输出目录
├── package.json                         # 项目依赖
├── tsconfig.json                        # TypeScript配置
├── .env.development                     # 开发环境变量
└── .env.production                      # 生产环境变量
```

---

## 3. 系统架构图

### 3.1 整体架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           外部设备层                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │
│  │   汉奇网关       │  │   Timer设备      │  │  其他IoT设备（扩展）    │  │
│  │  (Gateway)      │  │   (2-4出水口)    │  │                        │  │
│  └────────┬────────┘  └────────┬────────┘  └────────────┬───────────┘  │
└───────────┼────────────────────┼────────────────────────┼───────────────┘
            │ MQTT              │ MQTT                    │
            │ (TCP/TLS-PSK)     │ (via Gateway)           │
            ▼                   ▼                         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         MQTT Broker 层                                   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Aedes MQTT Broker                             │   │
│  │  ┌──────────────────┐  ┌──────────────────┐                     │   │
│  │  │  TCP Server      │  │  TLS-PSK Server  │                     │   │
│  │  │  (Port: 1884)    │  │  (Port: 8445)    │                     │   │
│  │  └──────────────────┘  └──────────────────┘                     │   │
│  │                                                                  │   │
│  │  认证: Username/Password | PSK Identity/Key                      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │ Message Dispatch
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         应用服务层                                       │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    MQTT Scanner & Router                         │   │
│  │           (扫描 @MqttSubscribe 装饰器，注册处理器)                │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │
│  ┌──────────────┬─────────────────┼──────────────┬─────────────────┐   │
│  │              │                 │              │                 │   │
│  ▼              ▼                 ▼              ▼                 ▼   │
│  ┌────────┐  ┌────────┐    ┌────────┐    ┌────────┐    ┌────────┐   │
│  │Gateway │  │ Timer  │    │ Outlet │    │Schedule│    │  PSK   │   │
│  │Service │  │Service │    │Service │    │Service │    │Service │   │
│  └────┬───┘  └────┬───┘    └────┬───┘    └────┬───┘    └────┬───┘   │
│       │           │             │             │              │       │
│       └───────────┴──────┬──────┴─────────────┴──────────────┘       │
│                          │                                            │
│                    ┌─────▼─────┐                                     │
│                    │ DpService │  (DP点数据处理)                     │
│                    └─────┬─────┘                                     │
└──────────────────────────┼──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         数据持久层                                       │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Mongoose ODM                                  │   │
│  │                                                                  │   │
│  │  Collections:                                                    │   │
│  │  ├── users              # 用户表                                │   │
│  │  ├── roles              # 角色表                                │   │
│  │  ├── hanqigateways      # 网关表                                │   │
│  │  ├── hanqitimers        # Timer设备表                           │   │
│  │  ├── hanqioutlets       # 出水口表                              │   │
│  │  ├── hanqischedules     # 定时任务表                            │   │
│  │  ├── hanqiirrigationrecords  # 灌溉记录表                       │   │
│  │  └── hanqipsks          # PSK认证表                             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
│                                    ▼                                    │
│                         ┌──────────────────┐                           │
│                         │  MongoDB Atlas   │                           │
│                         │  (Cloud Cluster) │                           │
│                         └──────────────────┘                           │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 模块依赖关系

```
                    ┌─────────────────┐
                    │   AppModule     │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  MqttModule   │  │ DatabaseModule  │  │  LoggerModule   │
│   (Global)    │  │    (Global)     │  │    (Global)     │
└───────┬───────┘  └────────┬────────┘  └─────────────────┘
        │                   │
        │  ┌────────────────┴────────────────────────────┐
        │  │                                              │
        ▼  ▼                                              │
┌───────────────┐  ┌───────────────┐  ┌───────────────┐  │
│ GatewayModule │  │  TimerModule  │  │ OutletModule  │◄─┤
└───────────────┘  └───────────────┘  └───────────────┘  │
        │                  │                  │           │
        ▼                  ▼                  ▼           │
┌───────────────┐  ┌───────────────┐  ┌───────────────┐  │
│ScheduleModule │  │   PskModule   │  │IrrigationRecord│◄┘
└───────────────┘  └───────────────┘  └───────────────┘
```

---

## 4. 数据模型设计

### 4.1 实体关系图 (ER Diagram)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              数据模型关系图                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│    ┌─────────────┐         ┌─────────────────┐                               │
│    │    User     │         │      Role       │                               │
│    ├─────────────┤         ├─────────────────┤                               │
│    │ _id (PK)    │────────►│ _id (PK)        │                               │
│    │ name        │   role  │ name            │                               │
│    │ email       │         │ status          │                               │
│    │ phone       │         └─────────────────┘                               │
│    │ password    │                                                           │
│    │ address     │                                                           │
│    │ lat, lng    │                                                           │
│    │ status      │                                                           │
│    │ ...         │                                                           │
│    └──────┬──────┘                                                           │
│           │                                                                   │
│           │ userId (1:N)                                                     │
│           ▼                                                                   │
│    ┌─────────────────┐                                                       │
│    │  HanqiGateway   │                                                       │
│    ├─────────────────┤                                                       │
│    │ _id (PK)        │                                                       │
│    │ gatewayId (UK)  │                                                       │
│    │ userId (FK)     │                                                       │
│    │ name            │                                                       │
│    │ is_connected    │                                                       │
│    │ last_seen       │                                                       │
│    │ mac_address     │                                                       │
│    │ ...             │                                                       │
│    └────────┬────────┘                                                       │
│             │                                                                 │
│             │ gatewayId (1:N)                                                │
│             ▼                                                                 │
│    ┌─────────────────┐       ┌─────────────────────┐                         │
│    │   HanqiTimer    │       │     HanqiPsk        │                         │
│    ├─────────────────┤       ├─────────────────────┤                         │
│    │ _id (PK)        │       │ _id (PK)            │                         │
│    │ timerId (UK)    │       │ mac_address (UK)    │                         │
│    │ gatewayId (FK)  │       │ identity (UK)       │                         │
│    │ userId (FK)     │       │ key                 │                         │
│    │ outlet_count    │       │ status              │                         │
│    │ dp_data (Map)   │       └─────────────────────┘                         │
│    │ battery_level   │                                                       │
│    │ ...             │                                                       │
│    └────────┬────────┘                                                       │
│             │                                                                 │
│             │ timerId (1:N)                                                  │
│             ▼                                                                 │
│    ┌─────────────────┐                                                       │
│    │   HanqiOutlet   │                                                       │
│    ├─────────────────┤                                                       │
│    │ _id (PK)        │                                                       │
│    │ outletId (UK)   │                                                       │
│    │ timerId (FK)    │                                                       │
│    │ userId (FK)     │                                                       │
│    │ outlet_number   │  ◄── (timerId, outlet_number) 复合唯一                │
│    │ current_status  │                                                       │
│    │ flow_rate       │                                                       │
│    │ dp_data (Map)   │                                                       │
│    │ ...             │                                                       │
│    └────────┬────────┘                                                       │
│             │                                                                 │
│   ┌─────────┴──────────┐                                                     │
│   │                    │                                                     │
│   │ outletId (1:N)     │ outletId (1:N)                                     │
│   ▼                    ▼                                                     │
│  ┌─────────────────┐  ┌─────────────────────────┐                           │
│  │ HanqiSchedule   │  │ HanqiIrrigationRecord   │                           │
│  ├─────────────────┤  ├─────────────────────────┤                           │
│  │ _id (PK)        │  │ _id (PK)                │                           │
│  │ scheduleId (UK) │  │ recordId (UK)           │                           │
│  │ outletId (FK)   │  │ outletId (FK)           │                           │
│  │ userId (FK)     │  │ scheduleId (FK, 可空)   │                           │
│  │ schedule_type   │  │ userId (FK)             │                           │
│  │ start_time      │  │ start_time              │                           │
│  │ duration        │  │ duration                │                           │
│  │ repeat_days[]   │  │ water_used              │                           │
│  │ spray_mode{}    │  │ trigger_type            │                           │
│  │ ...             │  │ ...                     │                           │
│  └─────────────────┘  └─────────────────────────┘                           │
│                                                                               │
│  图例: PK=主键, UK=唯一键, FK=外键, 1:N=一对多关系                           │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 数据模型详细定义

#### 4.2.1 User（用户模型）

**集合名称**: `users`
**文件位置**: `src/shared/schemas/User.ts`

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| `_id` | ObjectId | 是 | 自动 | 主键 |
| `name` | String | 是 | - | 用户名 |
| `email` | String | 是 | - | 邮箱（唯一） |
| `phone` | String | 否 | - | 电话号码 |
| `password` | String | 是 | - | 密码（bcrypt加密） |
| `address` | String | 否 | - | 地址 |
| `image` | String | 否 | - | 用户头像URL |
| `lat` | String | 否 | - | 纬度 |
| `lng` | String | 否 | - | 经度 |
| `status` | Number | 否 | 1 | 用户状态 |
| `is_ota` | Number | 否 | 0 | OTA升级开关 |
| `firmware_version` | String | 否 | - | 固件版本 |
| `utc_offset_minutes` | String | 否 | - | UTC时区偏移（分钟） |
| `role` | ObjectId | 是 | - | 关联角色ID |
| `createdAt` | Date | 是 | 自动 | 创建时间 |
| `updatedAt` | Date | 是 | 自动 | 更新时间 |

#### 4.2.2 HanqiGateway（网关模型）

**集合名称**: `hanqigateways`
**文件位置**: `src/modules/gateway/schema/HanqiGateway.schema.ts`

| 字段名 | 类型 | 必填 | 默认值 | 索引 | 说明 |
|--------|------|------|--------|------|------|
| `_id` | ObjectId | 是 | 自动 | - | 主键 |
| `gatewayId` | String | 是 | - | unique | 网关设备ID |
| `name` | String | 否 | - | - | 网关名称 |
| `userId` | ObjectId | 是 | - | index | 所属用户ID |
| `status` | Number | 否 | 1 | index | 状态标志 |
| `is_connected` | Number | 否 | 0 | index | 连接状态（0-离线，1-在线） |
| `last_seen` | Date | 否 | - | index | 最后通信时间 |
| `hanqi_product_key` | String | 否 | - | - | 汉奇产品密钥 |
| `hanqi_device_secret` | String | 否 | - | - | 汉奇设备密钥 |
| `firmware_version` | String | 否 | "1.0.0" | - | 固件版本 |
| `mac_address` | String | 否 | - | - | MAC地址 |
| `createdAt` | Date | 是 | 自动 | - | 创建时间 |
| `updatedAt` | Date | 是 | 自动 | - | 更新时间 |

#### 4.2.3 HanqiTimer（Timer设备模型）

**集合名称**: `hanqitimers`
**文件位置**: `src/modules/timer/schema/timer.schema.ts`

| 字段名 | 类型 | 必填 | 默认值 | 索引 | 说明 |
|--------|------|------|--------|------|------|
| `_id` | ObjectId | 是 | 自动 | - | 主键 |
| `timerId` | String | 是 | - | unique | Timer设备ID |
| `name` | String | 否 | - | - | 设备名称 |
| `userId` | ObjectId | 是 | - | index | 所属用户ID |
| `gatewayId` | ObjectId | 是 | - | index | 所属网关ID |
| `hanqi_device_id` | String | 否 | - | - | 汉奇设备ID |
| `outlet_count` | Number | 否 | 2 | - | 出水口数量（2-4） |
| `status` | Number | 否 | 1 | index | 设备状态 |
| `is_connected` | Number | 否 | 0 | index | 连接状态 |
| `last_seen` | Date | 否 | - | index | 最后通信时间 |
| `firmware_version` | String | 否 | - | - | 固件版本 |
| `mac_address` | String | 否 | - | - | MAC地址 |
| `battery_level` | Number | 否 | - | - | 电池电量（0-100%） |
| `signal_strength` | Number | 否 | - | - | 信号强度（0-100%） |
| `dp_data` | Map | 否 | {} | - | DP点数据存储 |
| `last_dp_update` | Date | 否 | - | - | 最后DP点更新时间 |
| `createdAt` | Date | 是 | 自动 | - | 创建时间 |
| `updatedAt` | Date | 是 | 自动 | - | 更新时间 |

#### 4.2.4 HanqiOutlet（出水口模型）

**集合名称**: `hanqioutlets`
**文件位置**: `src/modules/outlet/schema/outlet.schema.ts`

| 字段名 | 类型 | 必填 | 默认值 | 索引 | 说明 |
|--------|------|------|--------|------|------|
| `_id` | ObjectId | 是 | 自动 | - | 主键 |
| `outletId` | String | 是 | - | unique | 出水口唯一标识 |
| `name` | String | 否 | - | - | 出水口名称 |
| `timerId` | ObjectId | 是 | - | compound | 所属Timer ID |
| `userId` | ObjectId | 是 | - | index | 所属用户ID |
| `outlet_number` | Number | 是 | - | compound | 出水口编号（1-4） |
| `zone_name` | String | 否 | - | - | 区域名称 |
| `is_enabled` | Boolean | 否 | true | index | 是否启用 |
| `current_status` | Number | 否 | 0 | index | 当前状态 |
| `flow_rate` | Number | 否 | 0 | - | 流速（升/分钟） |
| `pressure` | Number | 否 | 0 | - | 水压（bar） |
| `total_water_used` | Number | 否 | 0 | - | 累计用水量（升） |
| `remaining_time` | Number | 否 | 0 | - | 剩余运行时间（秒） |
| `dp_data` | Map | 否 | {} | - | DP点数据 |
| `last_dp_update` | Date | 否 | - | - | 最后更新时间 |
| `createdAt` | Date | 是 | 自动 | - | 创建时间 |
| `updatedAt` | Date | 是 | 自动 | - | 更新时间 |

**复合索引**: `(timerId, outlet_number)` - 确保同一Timer下出水口编号唯一

**current_status 状态值**:
- `0`: 关闭
- `1`: 运行中
- `2`: 暂停
- `3`: 故障

#### 4.2.5 HanqiSchedule（定时任务模型）

**集合名称**: `hanqischedules`
**文件位置**: `src/modules/schedule/schema/schedule.schema.ts`

| 字段名 | 类型 | 必填 | 默认值 | 索引 | 说明 |
|--------|------|------|--------|------|------|
| `_id` | ObjectId | 是 | 自动 | - | 主键 |
| `scheduleId` | String | 是 | - | unique | 定时任务ID |
| `name` | String | 否 | - | - | 任务名称 |
| `outletId` | ObjectId | 是 | - | index | 所属出水口ID |
| `userId` | ObjectId | 是 | - | index | 所属用户ID |
| `schedule_type` | String | 是 | - | - | 任务类型 |
| `is_enabled` | Boolean | 否 | true | compound | 是否启用 |
| `start_time` | String | 是 | - | compound | 开始时间 (HH:mm) |
| `end_time` | String | 否 | - | - | 结束时间 |
| `duration` | Number | 是 | - | - | 运行时长（秒） |
| `repeat_days` | [Number] | 否 | [] | - | 重复天数（0-6） |
| `spray_mode` | Object | 否 | {} | - | 喷雾模式配置 |
| `priority` | Number | 否 | 0 | - | 优先级 |
| `next_run_time` | Date | 否 | - | compound | 下次运行时间 |
| `last_run_time` | Date | 否 | - | - | 最后运行时间 |
| `run_count` | Number | 否 | 0 | - | 运行次数统计 |
| `status` | Number | 否 | 1 | - | 任务状态 |
| `createdAt` | Date | 是 | 自动 | - | 创建时间 |
| `updatedAt` | Date | 是 | 自动 | - | 更新时间 |

**schedule_type 类型值**:
- `once`: 一次性任务
- `daily`: 每日重复
- `weekly`: 每周重复
- `custom`: 自定义

**spray_mode 结构**:
```json
{
  is_enabled: boolean       // 是否启用喷雾模式
  eco_mode: boolean         // 是否启用省水模式
  spray_pattern: string     // 喷雾模式: continuous | interval | pulse
  interval_on: number       // 间隔开启时间（秒）
  interval_off: number      // 间隔关闭时间（秒）
}
```

#### 4.2.6 HanqiIrrigationRecord（灌溉记录模型）

**集合名称**: `hanqiirrigationrecords`
**文件位置**: `src/modules/irrigation-record/schema/irrigation-record.schema.ts`

| 字段名 | 类型 | 必填 | 默认值 | 索引 | 说明 |
|--------|------|------|--------|------|------|
| `_id` | ObjectId | 是 | 自动 | - | 主键 |
| `recordId` | String | 是 | - | unique | 记录ID |
| `outletId` | ObjectId | 是 | - | compound | 出水口ID |
| `scheduleId` | ObjectId | 否 | - | - | 定时任务ID（可选） |
| `userId` | ObjectId | 是 | - | compound | 用户ID |
| `start_time` | Date | 是 | - | compound | 开始时间 |
| `duration` | Number | 是 | - | - | 实际运行时长（秒） |
| `planned_duration` | Number | 否 | - | - | 计划运行时长（秒） |
| `water_used` | Number | 否 | 0 | - | 用水量（升） |
| `status` | Number | 是 | - | index | 状态 |
| `trigger_type` | String | 是 | - | index | 触发方式 |
| `temperature` | Number | 否 | - | - | 当时温度（℃） |
| `weather_condition` | String | 否 | - | - | 天气状况 |
| `error_code` | String | 否 | - | - | 错误代码 |
| `error_message` | String | 否 | - | - | 错误信息 |
| `notes` | String | 否 | - | - | 备注 |
| `createdAt` | Date | 是 | 自动 | - | 创建时间 |
| `updatedAt` | Date | 是 | 自动 | - | 更新时间 |

**status 状态值**:
- `0`: 进行中
- `1`: 完成
- `2`: 手动停止
- `3`: 异常终止
- `4`: 超时

**trigger_type 触发方式**:
- `scheduled`: 定时触发
- `manual`: 手动触发
- `api`: API调用触发
- `sensor`: 传感器触发

#### 4.2.7 HanqiPsk（PSK认证模型）

**集合名称**: `hanqipsks`
**文件位置**: `src/modules/psk/schema/psk.schema.ts`

| 字段名 | 类型 | 必填 | 默认值 | 索引 | 说明 |
|--------|------|------|--------|------|------|
| `_id` | ObjectId | 是 | 自动 | - | 主键 |
| `mac_address` | String | 是 | - | unique | MAC地址 |
| `identity` | String | 是 | - | unique | PSK标识 |
| `key` | String | 是 | - | compound | PSK密钥（128位hex） |
| `status` | Number | 否 | 0 | - | 状态 |
| `createdAt` | Date | 是 | 自动 | - | 创建时间 |
| `updatedAt` | Date | 是 | 自动 | - | 更新时间 |

**status 状态值**:
- `0`: 待确认（已生成但未烧录）
- `1`: 已确认（已烧录到设备）

---

## 5. MQTT架构设计

### 5.1 MQTT Broker 配置

```typescript
// 连接参数
const MqttConnectionParameters = {
  ID: 'HANQI_MQTT_Broker',          // Broker标识
  CONNECT_TIME: 30000,              // 连接超时（ms）
  HEART_BEAT_INTERVAL: 60000,       // 心跳间隔（ms）
  PORT: 1883,                       // TCP默认端口
  PSK_PORT: 8445,                   // PSK默认端口
}

// QoS配置
const MQTT_MESSAGE_CONFIG = {
  DEFAULT_QOS: 1,                   // 默认QoS
  STATUS_QOS: 1,                    // 状态消息QoS
  COMMAND_QOS: 1,                   // 控制命令QoS
  REPORT_QOS: 0,                    // 数据上报QoS
  RETAIN: false,                    // 不保留消息
}
```

### 5.2 双认证模式

```
┌─────────────────────────────────────────────────────────────┐
│                    MQTT认证架构                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────┐    ┌──────────────────────┐       │
│  │   TCP认证模式         │    │   TLS-PSK认证模式    │       │
│  │   (Port: 1884)       │    │   (Port: 8445)       │       │
│  ├──────────────────────┤    ├──────────────────────┤       │
│  │                      │    │                      │       │
│  │  认证方式:           │    │  认证方式:           │       │
│  │  Username + Password │    │  PSK Identity + Key  │       │
│  │                      │    │                      │       │
│  │  配置项:             │    │  配置项:             │       │
│  │  MQTT_TCP_WHITELIST  │    │  MQTT_PSK_WHITELIST  │       │
│  │                      │    │                      │       │
│  │  适用场景:           │    │  适用场景:           │       │
│  │  - 测试环境          │    │  - 生产环境          │       │
│  │  - 管理后台          │    │  - 设备端连接        │       │
│  │  - 调试工具          │    │  - 安全要求高        │       │
│  └──────────────────────┘    └──────────────────────┘       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 消息类型枚举

```typescript
enum MqttMessageType {
  DP_REPORT = 'dp_report',              // DP点数据上报
  DP_COMMAND = 'dp_command',            // DP点命令下发
  DEVICE_STATUS = 'device_status',      // 设备状态上报
  IRRIGATION_RECORD = 'irrigation_record',  // 灌溉记录上报
  SCHEDULE_SYNC = 'schedule_sync',      // 定时任务同步
  DEVICE_INFO = 'device_info',          // 设备信息上报
  SUB_DEVICES = 'sub_devices',          // 子设备列表上报
  OTA_UPGRADE = 'ota_upgrade',          // OTA升级
  OTA_PROGRESS = 'ota_progress',        // OTA进度
  EVENT_REPORT = 'event_report',        // 事件上报
  HEARTBEAT = 'heartbeat',              // 心跳
}
```

### 5.4 统一消息格式

```typescript
// MQTT统一消息格式
interface MqttUnifiedMessage<T = any> {
  msgType: MqttMessageType | string   // 消息类型（区分数据）
  msgId?: string                       // 消息ID（用于请求响应匹配）
  deviceId: string                     // 设备ID
  timestamp: number                    // 时间戳（秒）
  data: T                              // 消息数据
}

// 示例消息
{
  "msgType": "dp_report",
  "msgId": "1234567_abc123",
  "deviceId": "timer_001",
  "timestamp": 1700000000,
  "data": {
    "dps": {
      "1": true,
      "4": 85,
      "21": true
    }
  }
}
```

---

## 6. DP点设计与数据库字段映射

### 6.1 DP点概述

DP点（Data Point）是物联网设备数据的标准化表示方式，参考涂鸦IoT平台设计。每个DP点包含：

- **dpId**: 数据点ID（唯一标识）
- **value**: 数据值
- **type**: 数据类型
- **mode**: 访问模式

### 6.2 DP点类型和访问模式

```typescript
// 数据类型
enum DpType {
  BOOL = 'bool',      // 布尔型
  VALUE = 'value',    // 数值型
  ENUM = 'enum',      // 枚举型
  STRING = 'string',  // 字符串型
  RAW = 'raw',        // 透传型（用于JSON）
}

// 访问模式
enum DpMode {
  RW = 'rw',          // 可读可写
  RO = 'ro',          // 只读
  WO = 'wo',          // 只写
}
```

### 6.3 DP点ID分配方案

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DP点ID分配方案                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  DP ID范围        用途                    说明                       │
│  ─────────────────────────────────────────────────────────────────  │
│  1-20            设备基础功能             开关、状态、电池等          │
│  21-40           出水口1控制              开关、流速、水压等          │
│  41-60           出水口2控制              同上                       │
│  61-80           出水口3控制              同上                       │
│  81-100          出水口4控制              同上                       │
│  101-120         定时任务相关             任务数据、同步请求等        │
│  121-140         统计和记录               用水量统计、灌溉记录        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.4 DP点定义详表

#### 基础功能DP点（1-20）

| DP ID | 名称 | 类型 | 模式 | 取值范围 | 数据库字段映射 |
|-------|------|------|------|----------|----------------|
| 1 | device_switch | bool | rw | true/false | HanqiTimer.status |
| 2 | device_online | bool | ro | true/false | HanqiTimer.is_connected |
| 3 | device_reset | bool | wo | true | - (命令) |
| 4 | battery_level | value | ro | 0-100 | HanqiTimer.battery_level |
| 5 | signal_strength | value | ro | 0-100 | HanqiTimer.signal_strength |
| 6 | firmware_version | string | ro | - | HanqiTimer.firmware_version |
| 7 | outlet_count | value | ro | 2-4 | HanqiTimer.outlet_count |
| 8 | device_fault | enum | ro | 0-5 | HanqiTimer.dp_data['8'] |
| 9 | longitude | string | rw | - | User.lng |
| 10 | latitude | string | rw | - | User.lat |

#### 出水口DP点（以出水口1为例，基础ID=21）

| DP ID | 名称 | 类型 | 模式 | 取值范围 | 数据库字段映射 |
|-------|------|------|------|----------|----------------|
| 21 | outlet_1_switch | bool | rw | true/false | HanqiOutlet.current_status |
| 22 | outlet_1_status | enum | ro | 0-3 | HanqiOutlet.current_status |
| 23 | outlet_1_manual_duration | value | wo | 0-86400 | - (命令) |
| 24 | outlet_1_remaining_time | value | ro | 0-86400 | HanqiOutlet.remaining_time |
| 25 | outlet_1_flow_rate | value | ro | 0-1000 | HanqiOutlet.flow_rate |
| 26 | outlet_1_pressure | value | ro | 0-100 | HanqiOutlet.pressure |
| 27 | outlet_1_total_water | value | ro | 0-999999 | HanqiOutlet.total_water_used |
| 28 | outlet_1_zone_name | string | rw | - | HanqiOutlet.zone_name |
| 29 | outlet_1_enabled | bool | rw | true/false | HanqiOutlet.is_enabled |

**出水口DP点ID计算公式**:
```
DP_ID = BASE_DP_ID + (outlet_number - 1) * 20

出水口1: 21-40 (BASE=21)
出水口2: 41-60 (BASE=41)
出水口3: 61-80 (BASE=61)
出水口4: 81-100 (BASE=81)
```

#### 定时任务DP点（101-120）

| DP ID | 名称 | 类型 | 模式 | 说明 | 数据库字段映射 |
|-------|------|------|------|------|----------------|
| 101 | schedule_data | raw | rw | 定时任务JSON | HanqiSchedule.* |
| 102 | schedule_sync | bool | wo | 任务同步请求 | - (命令) |
| 103 | schedule_conflict | string | ro | 任务冲突告警 | - |

#### 统计记录DP点（121-140）

| DP ID | 名称 | 类型 | 模式 | 说明 | 数据库字段映射 |
|-------|------|------|------|------|----------------|
| 121 | today_total_water | value | ro | 今日用水量 | 计算值 |
| 122 | week_total_water | value | ro | 本周用水量 | 计算值 |
| 123 | month_total_water | value | ro | 本月用水量 | 计算值 |
| 124 | irrigation_record | raw | ro | 灌溉记录JSON | HanqiIrrigationRecord.* |

### 6.5 DP点与数据库字段映射关系图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     DP点与数据库字段映射关系                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   MQTT DP消息                              MongoDB集合                       │
│   ┌─────────────────┐                     ┌─────────────────────┐           │
│   │ dps: {          │                     │ HanqiTimer          │           │
│   │   "1": true,    │ ──────────────────► │   status: 1         │           │
│   │   "4": 85,      │ ──────────────────► │   battery_level: 85 │           │
│   │   "5": 72,      │ ──────────────────► │   signal_strength   │           │
│   │   "6": "1.2.0", │ ──────────────────► │   firmware_version  │           │
│   │   "7": 4        │ ──────────────────► │   outlet_count: 4   │           │
│   │ }               │                     │   dp_data: {...}    │           │
│   └─────────────────┘                     └─────────────────────┘           │
│                                                                              │
│   ┌─────────────────┐                     ┌─────────────────────┐           │
│   │ dps: {          │                     │ HanqiOutlet         │           │
│   │   "21": true,   │ ──────────────────► │   current_status: 1 │           │
│   │   "24": 1800,   │ ──────────────────► │   remaining_time    │           │
│   │   "25": 12.5,   │ ──────────────────► │   flow_rate: 12.5   │           │
│   │   "26": 25,     │ ──────────────────► │   pressure: 2.5     │           │
│   │   "27": 1500    │ ──────────────────► │   total_water_used  │           │
│   │ }               │                     │   dp_data: {...}    │           │
│   └─────────────────┘                     └─────────────────────┘           │
│                                                                              │
│   ┌─────────────────┐                     ┌─────────────────────┐           │
│   │ dps: {          │                     │ HanqiSchedule       │           │
│   │   "101": {      │                     │   scheduleId        │           │
│   │     "id": "...",│ ──────────────────► │   start_time        │           │
│   │     "start":    │                     │   duration          │           │
│   │       "08:00",  │                     │   repeat_days       │           │
│   │     "duration": │                     │   spray_mode: {     │           │
│   │       1800,     │                     │     is_enabled,     │           │
│   │     ...         │                     │     eco_mode,       │           │
│   │   }             │                     │     ...             │           │
│   │ }               │                     │   }                 │           │
│   └─────────────────┘                     └─────────────────────┘           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.6 DP消息处理流程

```typescript
// DpService 核心方法

// 1. 解析MQTT消息中的DP点数据
parseDpMessage(payload: Buffer | string): DpMessage | null

// 2. 提取特定DP值
getDpValue<T>(message: DpMessage, dpId: number): T | undefined

// 3. 提取出水口数据（根据出水口编号计算DP偏移）
getOutletData(message: DpMessage, outletNumber: number): OutletDpData

// 4. 构建控制指令
buildOutletControlCommand(outletNumber: number, switch_: boolean, duration?: number): DpData[]

// 5. 更新数据库
// 在Service层根据DP数据更新对应的MongoDB文档
async handleOutletDpUpdate(message: MqttUnifiedMessage): Promise<void> {
  const dps = message.data.dps

  // 更新Timer基础信息
  if (dps['4']) timer.battery_level = dps['4']
  if (dps['5']) timer.signal_strength = dps['5']

  // 更新各出水口信息
  for (let i = 1; i <= timer.outlet_count; i++) {
    const baseId = 21 + (i - 1) * 20
    const outlet = outlets.find(o => o.outlet_number === i)

    if (dps[baseId]) outlet.current_status = dps[baseId] ? 1 : 0
    if (dps[baseId + 4]) outlet.flow_rate = dps[baseId + 4]
    if (dps[baseId + 5]) outlet.pressure = dps[baseId + 5] / 10
    if (dps[baseId + 6]) outlet.total_water_used = dps[baseId + 6]
  }
}
```

---

## 7. Topic设计方案

### 7.1 设计原则

1. **统一Topic，通过msgType区分数据类型**
2. **便于网关扩展新类型子设备，无需云端迭代**
3. **参考涂鸦IoT平台和MQTT最佳实践**
4. **支持通配符订阅，便于批量处理**

### 7.2 Topic结构

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Topic设计方案                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  前缀: hanqi/                                                        │
│                                                                      │
│  设备相关Topic:                                                      │
│  ├── hanqi/device/{deviceId}/report   # 设备数据上报                │
│  ├── hanqi/device/{deviceId}/command  # 设备命令下发                │
│  └── hanqi/device/{deviceId}/status   # 设备状态变更                │
│                                                                      │
│  网关相关Topic:                                                      │
│  ├── hanqi/gateway/{gatewayId}/report   # 网关数据上报              │
│  └── hanqi/gateway/{gatewayId}/command  # 网关命令下发              │
│                                                                      │
│  特殊Topic（固定）:                                                  │
│  ├── hanqi/device/join         # 设备加入请求                       │
│  └── hanqi/device/disconnect   # 设备断开请求                       │
│                                                                      │
│  通配符订阅:                                                         │
│  ├── hanqi/device/+/report     # 所有设备上报                       │
│  ├── hanqi/device/+/status     # 所有设备状态                       │
│  └── hanqi/gateway/+/report    # 所有网关上报                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 7.3 Topic Helper类

```typescript
// 文件: src/shared/constants/hanqi-mqtt-topic.constants.ts

class HanqiMqttTopic {
  // 设备Topic
  static deviceReport(deviceId: string): string {
    return `hanqi/device/${deviceId}/report`
  }

  static deviceCommand(deviceId: string): string {
    return `hanqi/device/${deviceId}/command`
  }

  static deviceStatus(deviceId: string): string {
    return `hanqi/device/${deviceId}/status`
  }

  // 网关Topic
  static gatewayReport(gatewayId: string): string {
    return `hanqi/gateway/${gatewayId}/report`
  }

  static gatewayCommand(gatewayId: string): string {
    return `hanqi/gateway/${gatewayId}/command`
  }

  // 通配符Topic
  static allDeviceReport(): string {
    return 'hanqi/device/+/report'
  }

  static allDeviceStatus(): string {
    return 'hanqi/device/+/status'
  }

  static allGatewayReport(): string {
    return 'hanqi/gateway/+/report'
  }
}
```

### 7.4 消息流向示意图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MQTT消息流向                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  设备 → 云端（上行）                                                        │
│  ─────────────────                                                          │
│                                                                              │
│  Timer设备                                                                   │
│     │                                                                        │
│     ├──► hanqi/device/{timerId}/report                                      │
│     │    msgType: dp_report | irrigation_record | device_info              │
│     │                                                                        │
│     └──► hanqi/device/{timerId}/status                                      │
│          msgType: device_status | heartbeat                                 │
│                                                                              │
│  网关设备                                                                    │
│     │                                                                        │
│     ├──► hanqi/gateway/{gatewayId}/report                                   │
│     │    msgType: sub_devices | device_status                               │
│     │                                                                        │
│     └──► hanqi/device/join                                                  │
│          设备首次上线请求                                                   │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  云端 → 设备（下行）                                                        │
│  ─────────────────                                                          │
│                                                                              │
│  云端服务                                                                    │
│     │                                                                        │
│     ├──► hanqi/device/{timerId}/command                                     │
│     │    msgType: dp_command | schedule_sync | ota_upgrade                 │
│     │                                                                        │
│     └──► hanqi/gateway/{gatewayId}/command                                  │
│          msgType: dp_command | device_info                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. 服务层架构

### 8.1 服务层分层设计

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            服务层架构                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Controller层                                  │   │
│  │  处理MQTT消息路由，调用Service层处理业务逻辑                        │   │
│  │                                                                      │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐ │   │
│  │  │ Gateway      │ │ Timer        │ │ Outlet       │ │ Schedule   │ │   │
│  │  │ Controller   │ │ Controller   │ │ Controller   │ │ Controller │ │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│                                      ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Service层                                    │   │
│  │  处理业务逻辑，调用数据访问层                                       │   │
│  │                                                                      │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐ │   │
│  │  │ Gateway      │ │ Timer        │ │ Outlet       │ │ Schedule   │ │   │
│  │  │ Service      │ │ Service      │ │ Service      │ │ Service    │ │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘ │   │
│  │                                                                      │   │
│  │  ┌──────────────┐ ┌──────────────────────────────────────────────┐ │   │
│  │  │ PSK Service  │ │             DpService（共享）                 │ │   │
│  │  └──────────────┘ │  - DP点解析/构建                              │ │   │
│  │                   │  - 数据验证                                    │ │   │
│  │                   │  - 格式转换                                    │ │   │
│  │                   └──────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│                                      ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        数据访问层                                    │   │
│  │  Mongoose Model + Schema                                            │   │
│  │                                                                      │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐ │   │
│  │  │ Gateway      │ │ Timer        │ │ Outlet       │ │ Schedule   │ │   │
│  │  │ Schema       │ │ Schema       │ │ Schema       │ │ Schema     │ │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘ │   │
│  │                                                                      │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                │   │
│  │  │ PSK Schema   │ │ Irrigation   │ │ User/Role    │                │   │
│  │  │              │ │ Record Schema│ │ Schema       │                │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 核心服务说明

#### GatewayService

```typescript
@Injectable()
export class GatewayService {
  // 设备加入 - 根据MAC查找用户
  async findUserByMacAddress(mac: string): Promise<UserDocument | null>

  // 设备断开处理
  async disconnectDevice(mac: string): Promise<boolean>

  // 处理子设备列表上报
  async handleSubDevices(message: MqttUnifiedMessage): Promise<void>

  // 处理网关状态上报
  async handleGatewayStatus(message: MqttUnifiedMessage): Promise<void>
}
```

#### OutletService

```typescript
@Injectable()
export class OutletService {
  // 处理灌溉记录上报
  async handleIrrigationRecord(message: MqttUnifiedMessage): Promise<void>

  // 处理出水口DP点更新
  async handleOutletDpUpdate(message: MqttUnifiedMessage): Promise<void>
}
```

#### PskService

```typescript
@Injectable()
export class PskService {
  // 生成PSK密钥对
  async generatePsk(macAddress: string): Promise<{identity: string, key: string}>

  // 确认PSK烧录完成
  async confirmPsk(macAddress: string): Promise<{success: boolean, message: string}>

  // 根据identity查询PSK（用于认证）
  async findPskByIdentity(identity: string): Promise<string | null>
}
```

---

## 9. 认证与安全机制

### 9.1 MQTT认证流程

#### TCP认证（用户名/密码）

```
┌────────────────────────────────────────────────────────────────────┐
│                    TCP认证流程                                      │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Client                              Broker                         │
│    │                                   │                            │
│    │  1. CONNECT                       │                            │
│    │     username: "hanqi"             │                            │
│    │     password: "12358221044"       │                            │
│    │ ─────────────────────────────────►│                            │
│    │                                   │                            │
│    │                          2. authenticate callback              │
│    │                             验证 MQTT_TCP_WHITELIST            │
│    │                                   │                            │
│    │  3. CONNACK                       │                            │
│    │     returnCode: 0 (Accepted)      │                            │
│    │ ◄─────────────────────────────────│                            │
│    │                                   │                            │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

#### TLS-PSK认证

```
┌────────────────────────────────────────────────────────────────────┐
│                    TLS-PSK认证流程                                  │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Client                              Broker (TLS)                   │
│    │                                   │                            │
│    │  1. ClientHello                   │                            │
│    │     psk_identity: "device001"     │                            │
│    │ ─────────────────────────────────►│                            │
│    │                                   │                            │
│    │                          2. pskCallback                        │
│    │                             查询 MQTT_PSK_WHITELIST            │
│    │                             返回 Buffer.from(key, 'hex')       │
│    │                                   │                            │
│    │  3. ServerHello                   │                            │
│    │     TLS连接建立                   │                            │
│    │ ◄─────────────────────────────────│                            │
│    │                                   │                            │
│    │  4. CONNECT (无需用户名密码)      │                            │
│    │ ─────────────────────────────────►│                            │
│    │                                   │                            │
│    │  5. CONNACK                       │                            │
│    │ ◄─────────────────────────────────│                            │
│    │                                   │                            │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### 9.2 PSK密钥生成与烧录

```
┌────────────────────────────────────────────────────────────────────┐
│                    PSK生成与烧录流程                                │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. 生成PSK                                                        │
│     POST /psk/generate                                              │
│     Body: {"mac": "AA:BB:CC:DD:EE:FF"}                             │
│                                                                     │
│     Response:                                                       │
│     {                                                               │
│       "success": true,                                              │
│       "data": {                                                     │
│         "identity": "AA:BB:CC:DD:EE:FF",                           │
│         "key": "0123456789abcdef..."  // 64字符hex                 │
│       }                                                             │
│     }                                                               │
│                                                                     │
│  2. 烧录到设备                                                      │
│     设备将 identity 和 key 写入固件                                 │
│                                                                     │
│  3. 确认烧录完成                                                    │
│     POST /psk/confirm                                               │
│     Body: {"mac": "AA:BB:CC:DD:EE:FF"}                             │
│                                                                     │
│     Response:                                                       │
│     {                                                               │
│       "success": true,                                              │
│       "message": "PSK烧录确认成功"                                  │
│     }                                                               │
│                                                                     │
│  4. 设备使用PSK连接MQTT                                            │
│     连接到端口8445，使用TLS-PSK握手                                 │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### 9.3 密码加密

```typescript
// 用户密码使用bcrypt加密
// src/shared/utils/hash.ts

class Hash {
  // 加密密码
  static async make(password: string): Promise<string> {
    return bcrypt.hash(password, 10)
  }

  // 验证密码
  static async verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  }
}

// User Schema 中的pre-save hook
userSchema.pre('save', async function () {
  if (this.password && this.isModified('password')) {
    this.password = await Hash.make(this.password)
  }
})
```

---

## 10. 日志系统

### 10.1 日志架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            日志系统架构                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  LoggerService (基于Winston)                                                │
│  │                                                                          │
│  ├─► Console Transport                                                      │
│  │   └─ 带颜色的格式化输出                                                 │
│  │                                                                          │
│  └─► File Transport (Daily Rotate)                                          │
│      │                                                                      │
│      ├─ logs/mqtt-%DATE%.log              # MQTT一般日志                   │
│      ├─ logs/mqtt-error-%DATE%.log        # MQTT错误                       │
│      ├─ logs/mqtt-message-%DATE%.log      # MQTT消息debug                  │
│      ├─ logs/database-%DATE%.log          # 数据库一般日志                 │
│      ├─ logs/database-error-%DATE%.log    # 数据库错误                     │
│      ├─ logs/database-query-%DATE%.log    # 数据库查询debug                │
│      ├─ logs/error-%DATE%.log             # 应用错误                       │
│      ├─ logs/warn-%DATE%.log              # 应用警告                       │
│      ├─ logs/info-%DATE%.log              # 应用信息                       │
│      └─ logs/debug-%DATE%.log             # 应用debug                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 10.2 日志配置

```typescript
// MQTT模块日志配置示例
LoggerModule.forRoot({
  level: LogLevel.DEBUG,        // 日志级别
  enableFile: true,             // 启用文件输出
  enableConsole: false,         // 禁用控制台（生产环境）
  file: {
    dirname: 'logs',            // 日志目录
    datePattern: 'YYYY-MM-DD',  // 日期格式
    maxSize: '20m',             // 单文件最大20MB
    maxFiles: '3d',             // 保留3天
    zippedArchive: true         // 压缩归档
  }
})
```

### 10.3 日志方法

```typescript
// 通用日志方法
loggerService.error(message, context?, data?)
loggerService.warn(message, context?, data?)
loggerService.info(message, context?, data?)
loggerService.debug(message, context?, data?)

// 数据库专用方法
loggerService.mongodbConnect(host, dbName, connectionId?)
loggerService.mongodbDisconnect(host, dbName, reason?)
loggerService.mongodbConnectionError(host, dbName, error)
loggerService.mongodbReconnect(host, dbName, attempt)
loggerService.mongodbQuery(operation, collection, duration, documentCount?)

// MQTT专用方法
loggerService.mqttConnect(username?, clientId?)
loggerService.mqttDisconnect(clientId, reason?)
loggerService.mqttMessage(topic, clientId, payloadSize)
loggerService.mqttError(clientId, error)
```

---

## 11. 核心业务流程

### 11.1 设备注册流程

```
┌────────────────────────────────────────────────────────────────────────────┐
│                          设备注册流程                                       │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  设备                           服务端                       数据库         │
│    │                              │                            │           │
│    │  1. 发送加入请求             │                            │           │
│    │     Topic: hanqi/device/join │                            │           │
│    │     Payload: {mac: "..."}    │                            │           │
│    │ ────────────────────────────►│                            │           │
│    │                              │                            │           │
│    │                              │  2. 查询网关               │           │
│    │                              │     (mac_address匹配)      │           │
│    │                              │ ──────────────────────────►│           │
│    │                              │                            │           │
│    │                              │  3. 查询用户               │           │
│    │                              │     (userId匹配)           │           │
│    │                              │ ──────────────────────────►│           │
│    │                              │                            │           │
│    │                              │  4. 更新网关状态           │           │
│    │                              │     is_connected=1         │           │
│    │                              │     last_seen=now          │           │
│    │                              │ ──────────────────────────►│           │
│    │                              │                            │           │
│    │  5. 返回响应                 │                            │           │
│    │     Topic: hanqi/device/{mac}/join/response               │           │
│    │     Payload: {status, user}  │                            │           │
│    │ ◄────────────────────────────│                            │           │
│    │                              │                            │           │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

### 11.2 DP数据上报流程

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         DP数据上报流程                                      │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  设备                           服务端                       数据库         │
│    │                              │                            │           │
│    │  1. 发送DP上报               │                            │           │
│    │     Topic: hanqi/device/{timerId}/report                  │           │
│    │     Payload: {               │                            │           │
│    │       msgType: "dp_report",  │                            │           │
│    │       data: {dps: {...}}     │                            │           │
│    │     }                        │                            │           │
│    │ ────────────────────────────►│                            │           │
│    │                              │                            │           │
│    │                              │  2. 解析消息               │           │
│    │                              │     DpService.parseDpMessage()         │
│    │                              │                            │           │
│    │                              │  3. 查询Timer              │           │
│    │                              │ ──────────────────────────►│           │
│    │                              │                            │           │
│    │                              │  4. 查询Outlets            │           │
│    │                              │ ──────────────────────────►│           │
│    │                              │                            │           │
│    │                              │  5. 映射DP到字段           │           │
│    │                              │     - DP4 → battery_level  │           │
│    │                              │     - DP21 → current_status │          │
│    │                              │     - DP25 → flow_rate     │           │
│    │                              │                            │           │
│    │                              │  6. 更新文档               │           │
│    │                              │     - HanqiTimer           │           │
│    │                              │     - HanqiOutlet[]        │           │
│    │                              │ ──────────────────────────►│           │
│    │                              │                            │           │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

### 11.3 灌溉记录上报流程

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        灌溉记录上报流程                                     │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  设备                           服务端                       数据库         │
│    │                              │                            │           │
│    │  1. 灌溉完成，发送记录       │                            │           │
│    │     Topic: hanqi/device/{timerId}/report                  │           │
│    │     Payload: {               │                            │           │
│    │       msgType: "irrigation_record",                       │           │
│    │       data: {                │                            │           │
│    │         outletNumber: 1,     │                            │           │
│    │         startTime: ...,      │                            │           │
│    │         duration: 90,        │                            │           │
│    │         waterUsed: 45.5,     │                            │           │
│    │         triggerType: "scheduled"                          │           │
│    │       }                      │                            │           │
│    │     }                        │                            │           │
│    │ ────────────────────────────►│                            │           │
│    │                              │                            │           │
│    │                              │  2. 查询Timer              │           │
│    │                              │ ──────────────────────────►│           │
│    │                              │                            │           │
│    │                              │  3. 查询Outlet             │           │
│    │                              │     (timerId + outlet_number)          │
│    │                              │ ──────────────────────────►│           │
│    │                              │                            │           │
│    │                              │  4. 创建灌溉记录           │           │
│    │                              │     HanqiIrrigationRecord  │           │
│    │                              │ ──────────────────────────►│           │
│    │                              │                            │           │
│    │                              │  5. 更新出水口统计         │           │
│    │                              │     total_water_used += waterUsed      │
│    │                              │ ──────────────────────────►│           │
│    │                              │                            │           │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

### 11.4 定时任务下发流程

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        定时任务下发流程                                     │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  API/Web                        服务端                       设备          │
│    │                              │                            │           │
│    │  1. 创建/更新定时任务        │                            │           │
│    │     POST /schedule           │                            │           │
│    │ ────────────────────────────►│                            │           │
│    │                              │                            │           │
│    │                              │  2. 保存到数据库           │           │
│    │                              │     HanqiSchedule          │           │
│    │                              │                            │           │
│    │                              │  3. 构建DP命令             │           │
│    │                              │     DpService.buildScheduleData()      │
│    │                              │                            │           │
│    │                              │  4. 发送MQTT命令           │           │
│    │                              │     Topic: hanqi/device/{timerId}/command
│    │                              │     Payload: {             │           │
│    │                              │       msgType: "dp_command",           │
│    │                              │       data: {dps: {"101": {...}}}      │
│    │                              │     }                      │           │
│    │                              │ ──────────────────────────►│           │
│    │                              │                            │           │
│    │                              │  5. 设备确认               │           │
│    │                              │ ◄──────────────────────────│           │
│    │                              │                            │           │
│    │  6. 返回结果                 │                            │           │
│    │ ◄────────────────────────────│                            │           │
│    │                              │                            │           │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 12. 技术栈

| 层级 | 技术 | 版本 | 用途 |
|-----|------|------|------|
| **框架** | NestJS | ^11.0.1 | 后端框架 |
| **MQTT** | Aedes | ^0.51.3 | MQTT消息代理 |
| **MQTT客户端** | mqtt | ^5.14.1 | MQTT客户端库 |
| **数据库** | MongoDB | - | 文档数据库 |
| **ORM** | Mongoose | 7.1.1 | MongoDB驱动 |
| **配置管理** | @nestjs/config | ^4.0.2 | 配置管理 |
| **日志** | Winston | ^3.18.3 | 日志库 |
| **日志转轮** | winston-daily-rotate-file | ^5.0.0 | 日志文件轮转 |
| **密码加密** | bcrypt | ^6.0.0 | 密码安全 |
| **时间处理** | moment | ^2.30.1 | 时间处理 |
| **验证** | class-validator | ^0.14.2 | 数据验证 |
| **转换** | class-transformer | ^0.5.1 | 数据转换 |
| **反射** | reflect-metadata | ^0.2.2 | 反射API |
| **响应式编程** | rxjs | ^7.8.1 | 响应式库 |

---

## 13. 配置说明

### 13.1 环境变量

#### 开发环境 (.env.development)

```bash
# 应用配置
NODE_ENV=development
APP_HOST=127.0.0.1
APP_PORT=4000

# MQTT服务
MQTT_HOST=127.0.0.1
MQTT_PORT=1884
MQTT_PSK_PORT=8445
MQTT_USERNAME=hanqi
MQTT_PASSWORD=12358221044
MQTT_TCP_WHITELIST=[{"username":"hanqi","password":"12358221044"}]
MQTT_PSK_WHITELIST=[{"identity":"device001","key":"0123456789abcdef..."}]

# 数据库
MONGO_HOST=mongodb+srv://smart_irrigation:xxx@cluster0.xxx.mongodb.net/...
```

#### 生产环境 (.env.production)

```bash
# 应用配置
NODE_ENV=production
APP_HOST=
APP_PORT=

# MQTT服务
MQTT_HOST=3.216.169.117
MQTT_PORT=8445
MQTT_USERNAME=hanqi
MQTT_PASSWORD=12358221044
MQTT_WHITELIST=[{"username":"hanqi","password":"12358221044"}]
MQTT_PSK_WHITELIST=[{"identity":"device001","key":"0123456789abcdef..."}]

# 数据库
MONGO_HOST=mongodb+srv://soildrops:xxx@cluster0.xxx.mongodb.net/
```

### 13.2 关键端口

| 服务 | 端口 | 协议 | 说明 |
|-----|------|------|------|
| 应用API | 4000 | HTTP | REST API端口 |
| MQTT TCP | 1884 | TCP | 用户名/密码认证 |
| MQTT PSK | 8445 | TLS-PSK | PSK密钥认证 |

### 13.3 关键文件位置速查

| 功能模块 | 文件路径 |
|---------|---------|
| MQTT Broker | `src/core/mqtt/mqtt-broker.service.ts` |
| MQTT处理器扫描 | `src/core/mqtt/mqtt-scanner.service.ts` |
| MQTT装饰器 | `src/shared/decorators/mqtt.decorator.ts` |
| MQTT常量 | `src/shared/constants/mqtt.constants.ts` |
| Topic设计 | `src/shared/constants/hanqi-mqtt-topic.constants.ts` |
| DP点定义 | `src/shared/constants/hanqi-dp.constants.ts` |
| DP点服务 | `src/shared/services/dp.service.ts` |
| 网关服务 | `src/modules/gateway/gateway.service.ts` |
| 出水口服务 | `src/modules/outlet/outlet.service.ts` |
| PSK服务 | `src/modules/psk/psk.service.ts` |
| 数据库服务 | `src/core/database/database.service.ts` |
| 日志服务 | `src/common/logger/logger.service.ts` |

---

## 附录

### A. 快速启动

```bash
# 安装依赖
pnpm install

# 开发模式启动
pnpm run start:dev

# 生产模式启动
pnpm run start:prod

# 编译项目
pnpm run build
```

### B. 常用操作示例

**生成PSK密钥**:
```bash
curl -X POST http://localhost:4000/psk/generate \
  -H "Content-Type: application/json" \
  -d '{"mac": "AA:BB:CC:DD:EE:FF"}'
```

**确认PSK烧录**:
```bash
curl -X POST http://localhost:4000/psk/confirm \
  -H "Content-Type: application/json" \
  -d '{"mac": "AA:BB:CC:DD:EE:FF"}'
```

---

**文档生成时间**: 2025-11-22
**项目版本**: 0.0.1
**框架版本**: NestJS 11.0+
