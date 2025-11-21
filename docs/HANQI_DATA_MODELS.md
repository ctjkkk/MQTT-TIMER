# 汉奇智能灌溉系统数据模型设计

## 概述

本系统为汉奇公司设计的智能灌溉系统，采用分层架构设计，参考涂鸦IoT平台的数据模型设计模式。

## 数据模型层级关系

```
User (用户)
  └── HanqiGateway (网关)
        └── HanqiTimer (Timer设备/水阀)
              └── HanqiOutlet (出水口)
                    ├── HanqiSchedule (定时任务)
                    └── HanqiIrrigationRecord (灌溉记录)
```

## 数据模型详细说明

### 1. HanqiGateway (网关)

**位置**: `src/modules/gateway/schema/HanqiGateway.schema.ts`

**功能**: 管理网关设备，一个网关可以连接多个Timer设备

**核心字段**:

- `gatewayId`: 网关唯一标识
- `name`: 网关名称
- `userId`: 所属用户
- `status`: 设备状态
- `is_connected`: 连接状态
- `last_seen`: 最后通信时间
- `hanqi_product_key`: 汉奇产品密钥
- `hanqi_device_secret`: 汉奇设备密钥

### 2. HanqiTimer (Timer设备/水阀)

**位置**: `src/modules/timer/schema/timer.schema.ts`

**功能**: 水阀设备，每个Timer有2-4个出水口

**核心字段**:

- `timerId`: Timer唯一标识
- `name`: Timer名称
- `userId`: 所属用户
- `gatewayId`: 所属网关
- `outlet_count`: 出水口数量（2-4个）
- `battery_level`: 电池电量
- `signal_strength`: 信号强度
- `firmware_version`: 固件版本

**特性**:

- 支持2-4个出水口配置
- 支持地理位置（GeoJSON格式，可在地图上显示）
- 支持2dsphere地理索引，便于位置查询

### 3. HanqiOutlet (出水口)

**位置**: `src/modules/outlet/schema/outlet.schema.ts`

**功能**: 出水口，每个出水口对应现实中的一个灌溉区域

**核心字段**:

- `outletId`: 出水口唯一标识
- `name`: 出水口名称
- `timerId`: 所属Timer
- `outlet_number`: 出水口编号（1-4）
- `zone_name`: 区域名称（可自定义，如"前院"、"后院"等）
- `is_enabled`: 是否启用
- `current_status`: 当前状态（关闭/运行/暂停/故障）
- `flow_rate`: 当前流速
- `pressure`: 当前水压
- `total_water_used`: 累计用水量

**特性**:

- 每个出水口可独立命名和管理
- 记录实时运行状态和参数
- 统计累计用水量

### 4. HanqiSchedule (定时任务)

**位置**: `src/modules/schedule/schema/schedule.schema.ts`

**功能**: 为出水口设置定时灌溉任务和喷雾模式

**核心字段**:

- `scheduleId`: 定时任务唯一标识
- `name`: 任务名称
- `outletId`: 所属出水口
- `schedule_type`: 定时类型（once/daily/weekly/custom）
- `is_enabled`: 是否启用
- `start_time`: 开始时间（HH:mm格式）
- `end_time`: 结束时间
- `duration`: 运行时长（秒）
- `repeat_days`: 重复日期（周日-周六）
- `spray_mode`: 喷雾模式配置
  - `is_enabled`: 是否启用喷雾模式
  - `eco_mode`: ECO节水模式
  - `spray_pattern`: 喷雾模式（continuous/interval/pulse）
  - `interval_on`: 间隔喷水时间
  - `interval_off`: 间隔停止时间
- `priority`: 优先级（处理任务冲突）
- `next_run_time`: 下次执行时间
- `last_run_time`: 最后执行时间

**特性**:

- 支持多种定时类型（单次、每日、每周、自定义）
- 支持喷雾模式配置（连续、间隔、脉冲）
- 支持ECO节水模式
- 支持优先级和冲突检测
- 自动计算下次执行时间

### 5. HanqiIrrigationRecord (灌溉记录)

**位置**: `src/modules/irrigation-record/schema/irrigation-record.schema.ts`

**功能**: 记录每次灌溉的详细信息

**核心字段**:

- `recordId`: 记录唯一标识
- `outletId`: 出水口ID
- `scheduleId`: 定时任务ID（手动触发时为空）
- `start_time`: 开始时间
- `end_time`: 结束时间
- `duration`: 实际运行时长（秒）
- `planned_duration`: 计划运行时长（秒）
- `water_used`: 用水量（升）
- `status`: 执行状态（进行中/正常完成/手动停止/异常中断/超时）
- `trigger_type`: 触发方式（scheduled/manual/api/sensor）
- `flow_rate_avg`: 平均流速
- `pressure_avg`: 平均水压
- `temperature`: 当时温度
- `weather_condition`: 天气状况
- `error_code`: 错误代码
- `error_message`: 错误信息

**特性**:

- 记录完整的灌溉过程数据
- 支持多种触发方式
- 记录环境参数（温度、天气）
- 记录异常情况和错误信息
- 支持按时间倒序查询

## 索引设计

所有模型都包含以下索引优化：

1. **唯一性索引**:
   - 所有主键字段（gatewayId, timerId, outletId等）
   - 组合唯一索引（如timerId + outlet_number）

2. **查询优化索引**:
   - userId索引（快速查询用户的所有设备）
   - 状态字段索引（status, is_connected等）
   - 时间字段索引（last_seen, start_time等）
   - 关联关系索引（gatewayId, timerId, outletId等）

3. **特殊索引**:
   - Timer的location字段使用2dsphere索引（支持地理位置查询）
   - IrrigationRecord使用复合索引（outletId + start_time）优化历史记录查询

## 业务功能支持

### 1. 设备管理

- 用户可以添加多个网关
- 每个网关下可以添加多个Timer
- 每个Timer自动创建2-4个出水口

### 2. 定时灌溉

- 每个出水口可以设置多个定时任务
- 支持单次、每日、每周等多种定时模式
- 支持喷雾模式（连续、间隔、脉冲）
- 支持ECO节水模式

### 3. 任务冲突检测

- 通过priority字段处理同一出水口的任务冲突
- 通过start_time和duration计算任务重叠

### 4. 灌溉记录

- 自动记录每次灌溉的详细数据
- 支持查看历史记录
- 统计用水量和运行时长

### 5. 地图定位

- Timer支持GPS定位
- 可在地图上显示所有设备位置
- 支持按地理位置搜索设备

### 6. 实时监控

- 记录设备在线状态
- 记录最后通信时间
- 记录实时水压、流速等参数

## 数据流程示例

### 添加新设备流程

```
1. 创建HanqiGateway
2. 创建HanqiTimer（关联gatewayId）
3. 自动创建HanqiOutlet（根据outlet_count创建2-4个）
```

### 设置定时任务流程

```
1. 选择HanqiOutlet
2. 创建HanqiSchedule（设置时间、时长、喷雾模式等）
3. 系统自动计算next_run_time
```

### 执行灌溉流程

```
1. 定时触发或手动触发
2. 创建HanqiIrrigationRecord（记录start_time）
3. 执行灌溉任务
4. 更新HanqiIrrigationRecord（记录end_time、duration、water_used等）
5. 更新HanqiOutlet的total_water_used
6. 更新HanqiSchedule的last_run_time和next_run_time
```

## 注意事项

1. **数据一致性**: 删除上级数据时需要级联处理下级数据
2. **时区处理**: 所有时间字段建议使用UTC时间存储，显示时根据用户时区转换
3. **并发控制**: 同一出水口的多个任务需要做并发控制
4. **错误处理**: 异常情况需要记录到IrrigationRecord的error字段
5. **性能优化**: 大量历史记录建议定期归档

## 扩展性

该数据模型设计具有良好的扩展性，便于后续添加：

- 传感器数据（土壤湿度、光照等）
- 天气集成
- 智能推荐（根据天气和土壤数据自动调整灌溉计划）
- 用水统计和报表
- 设备分组管理
- 多用户权限管理
