/**
 * 日志上下文常量
 * 用于统一管理日志的 context 参数，避免硬编码字符串
 *
 * 命名规范：
 * - MQTT 相关：以 MQTT_ 开头（会被归类到 mqtt-*.log）
 * - 其他模块：使用清晰的模块名
 */
export const LogContext = {
  // ==================== MQTT 相关 ====================
  /** MQTT 认证（TCP + PSK） */
  MQTT_AUTH: 'MQTTAuth',
  /** MQTT 连接成功 */
  MQTT_CONNECTION: 'MQTTConnection',
  /** MQTT 消息发布 */
  MQTT_PUBLISH: 'MQTTPublish',
  /** MQTT 消息分发 */
  MQTT_DISPATCH: 'MQTTDispatch',
  /** MQTT 扫描器 */
  MQTT_SCANNER: 'MQTTScanner',
  // 网关断开连接
  MQTT_BROKER: 'MQTTBroker',

  // ==================== 认证/安全 ====================
  /** PSK 认证和签名验证 */
  PSK: 'PSK',
  /** API Key 认证 */
  API_KEY: 'APIKey',

  // ==================== 基础设施 ====================
  /** 数据库操作（通用） */
  DATABASE: 'Database',
  /** MongoDB 操作 */
  MONGODB: 'MongoDB',
  /** Redis 操作 */
  REDIS: 'Redis',
  /** HTTP 请求 */
  HTTP: 'HTTP',
  /** 数据同步 */
  SYNC: 'Sync',

  // ==================== 业务模块 ====================
  /** 网关模块 */
  GATEWAY: 'Gateway',
  /** 网关服务 */
  GATEWAY_SERVICE: 'GatewayService',
  /** 定时器模块 */
  TIMER: 'Timer',
  /** 定时器服务 */
  TIMER_SERVICE: 'TimerService',
  /** 出水口模块 */
  OUTLET: 'Outlet',
  /** 通道模块 */
  CHANNEL: 'Channel',
  /** 通道服务 */
  CHANNEL_SERVICE: 'ChannelService',
  /** 调度模块 */
  SCHEDULE: 'Schedule',
  /** 消息分发服务 */
  DISPATCH_SERVICE: 'DispatchService',
  /** 产品配置模块 */
  PRODUCT: 'Product',
  /** 产品配置服务 */
  PRODUCT_SERVICE: 'ProductService',
  /** OTA升级模块 */
  OTA: 'OTA',
  /** OTA升级服务 */
  OTA_SERVICE: 'OTAService',

  // ==================== 通用 ====================
  /** 应用程序通用日志 */
  APPLICATION: 'Application',
} as const

// 导出类型，用于 TypeScript 类型检查
export type LogContextType = (typeof LogContext)[keyof typeof LogContext]

/**
 * 日志消息模板常量
 * 用于统一管理日志消息格式
 */
export const LogMessages = {
  MQTT: {
    USER_CONNECTION_SUCCESSFUL: (ClientId: string, username: string) => `${ClientId} Authentication successful for user: ${username}`,
    BROKER_START: (way: string, port: string | number) => `${way} mode successfully connected to MQTT broker on port ${port}`,
    BROKER_STOP: 'MQTT Broker 已停止',
    CLIENT_CONNECTED: (clientId: string) => `客户端连接: ${clientId}`,
    CLIENT_DISCONNECTED: (clientId: string) => `🔌 客户端断开: ${clientId}`,
    MESSAGE_PUBLISHED: (clientId: string, topic: string) => `📨 Message published from ${clientId} to topic ${topic}`,
    SUBSCRIPTION_ADDED: (topic: string) => `订阅主题: ${topic}`,
    AUTHENTICATION_FAILED: (username: string) => `认证失败: ${username}`,
    AUTHENTICATION_SUCCESS: (username: string) => `认证成功: ${username}`,
    WHITELIST_EMPTY: '⚠️ MQTT_WHITELIST 为空或未设置，禁止所有用户连接',
    INTERNAL_ERROR: '🚨 内部认证错误',
    PUBLISH_ERROR: (error: string) => `发布错误: ${error}`,
    SCANNING_PROCESSOR: () => 'Starting to scan MQTT handlers...',
    REGISTER_PROCESSOR: (topic: string, controllerName: string, methodName: string) =>
      `Registered monitor: ${topic} -> ${controllerName}.${methodName}`,
    SCANNING_PROCESSOR_SCCUSS: (handlerCount: number) => `MQTT handler scanning complete, found ${handlerCount} handler(s)`,
    PARSE_ERROR: (error?: string) => `MQTT 消息解析错误: ${error}`,
  },
  DATABASE: {
    CONNECT_SCCUSS: (dbName: string) => `MongoDB 连接成功 - 数据库: ${dbName}`,
    CONNECT_ERROR: (errMsg: string) => ` MongoDB 连接错误: ${errMsg}`,
    CONNECT_FAIL: (errMsg: string) => `MongoDB 连接失败: ${errMsg}`,
    DISCONNECTED: () => `⚠️ MongoDB 已断开连接`,
    CONNECTION_CLOSE: (dbName: string, host: string) => `🛑 MongoDB 连接已关闭 - 数据库: ${dbName} 主机: ${host}`,
  },
  SERVER: {
    LOCAL_SERVER: (port: number) => `The local server has been started and is listening on port ${port}`,
  },
  API_KEY: {
    MISSING: () => '缺少API Key',
    VERIFY_FAILED: (apiKey: string) => `API Key验证失败: ${apiKey}`,
    VERIFY_SUCCESS: (path: string) => `API Key验证成功: ${path}`,
  },
  GATEWAY: {
    NOT_FOUND: (mac: string) => `📡 网关未找到: ${mac}`,
    USER_NOT_FOUND: (mac: string, userId: string) => `👤 用户未找到: 网关 ${mac}, 用户ID ${userId}`,
    CONNECTION_UPDATED: (mac: string, status: string) => `🔄 连接状态更新: ${mac} -> ${status}`,
    DEVICE_DISCONNECTED: (mac: string) => `🔌 设备断开: ${mac}`,
    UNKNOWN_ACTION: (action: string) => `未知的操作类型: ${action}`,
    // 配网相关
    ONLINE: (gatewayId: string) => `网关上线: ${gatewayId}`,
    OFFLINE: (gatewayId: string) => `网关离线: ${gatewayId}`,
    REGISTERED: (gatewayId: string) => `网关注册: ${gatewayId}`,
    REBOOT: (gatewayId: string) => `网关重启: ${gatewayId}`,
    BIND_SUCCESS: (gatewayId: string, userId: string) => `网关绑定成功: ${gatewayId}, 用户: ${userId}`,
    BIND_UPDATE: (gatewayId: string, userId: string) => ` 网关绑定更新: ${gatewayId}, 用户: ${userId}`,
    UNBIND: (gatewayId: string, userId: string) => `网关解绑: ${gatewayId}, 用户: ${userId}`,
    HEARTBEAT_UNKNOWN: (deviceId: string) => `收到未知网关的心跳: ${deviceId}`,
    HEARTBEAT_ACK_SENT: (deviceId: string, isBound: boolean) =>
      `心跳响应已发送: ${deviceId}, 用户绑定状态: ${isBound ? '已绑定' : '未绑定'}`,
    ONLINE_UNBOUND: (deviceId: string) => `网关 ${deviceId} 上线但未绑定用户`,
    STATUS_UPDATED: (deviceId: string, online: boolean) => `📊 网关状态已更新: ${deviceId}, 在线: ${online}`,
    UNHANDLED_OPERATION: (action: string) => `未处理的网关操作: ${action}`,
    COMMAND_SENT: (gatewayId: string, msgType: string, message: any) =>
      `发送网关命令: ${gatewayId}, 类型: ${msgType}, 消息: ${JSON.stringify(message)}`,
    SUBDEVICE_COMMAND_SENT: (gatewayId: string, subDeviceId: string, msgType: string) =>
      `📤 发送子设备命令: 网关=${gatewayId}, 设备=${subDeviceId}, 类型=${msgType}`,
    DP_COMMAND_VALIDATION_FAILED: (gatewayId: string, subDeviceId: string, productId: string, error: string) =>
      `DP验证失败 - 网关: ${gatewayId}, 子设备: ${subDeviceId}, 产品: ${productId}, 错误: ${error}`,
    DP_COMMAND_SENT: (gatewayId: string, subDeviceId: string) => `DP命令已发送 - 网关: ${gatewayId}, 子设备: ${subDeviceId}`,
  },
  TIMER: {
    // ========== 基础查询 ==========
    NOT_FOUND: (timerId: string) => `[TimerService] Timer不存在: ${timerId}`,

    // ========== 子设备添加 ==========
    ADD_MISSING_FIELD: (subDeviceId: string, productId: string) =>
      `子设备添加失败：缺少必填字段 (uuid: ${subDeviceId}, productId: ${productId})`,
    ADD_PRODUCT_NOT_FOUND: (productId: string, subDeviceId: string) =>
      `子设备添加失败：产品配置不存在 (productId: ${productId}, subDeviceId: ${subDeviceId})`,
    SUBDEVICE_UPDATED: (subDeviceId: string) => `子设备已更新: ${subDeviceId}`,
    SUBDEVICE_CREATED: (subDeviceId: string, productName: string) => `子设备已创建: ${subDeviceId}, 产品: ${productName}`,
    ADD_FAILED: (subDeviceId: string, error: string) => `添加子设备失败: ${subDeviceId}, 错误: ${error}`,
    BATCH_ADD_COMPLETE: (added: number, updated: number, failed: number) =>
      `批量添加子设备完成: 新增 ${added} 个, 更新 ${updated} 个, 失败 ${failed} 个`,
    PAIRING_SUCCESS_COMMAND_SENT: (gatewayId: string) => `配对成功，已下发关闭配对命令给网关: ${gatewayId}`,

    // ========== 子设备删除（网关上报） ==========
    DELETE_BY_GATEWAY_NOT_FOUND: (gatewayId: string, subDeviceId: string) =>
      `网关上报删除失败：子设备不存在 (gatewayId: ${gatewayId}, subDeviceId: ${subDeviceId})`,
    DELETE_BY_GATEWAY_GATEWAY_NOT_FOUND: (gatewayId: string, subDeviceId: string) =>
      `网关上报删除失败：网关不存在 (gatewayId: ${gatewayId}, subDeviceId: ${subDeviceId})`,
    DELETE_BY_GATEWAY_UNAUTHORIZED: (gatewayId: string, subDeviceId: string, actualGatewayId: string) =>
      `网关越权删除子设备！网关 ${gatewayId} 尝试删除不属于自己的子设备 ${subDeviceId} (实际属于网关: ${actualGatewayId})`,
    DELETE_BY_GATEWAY_SUCCESS: (gatewayId: string, subDeviceId: string) =>
      `网关上报删除子设备成功: 网关=${gatewayId}, 子设备=${subDeviceId}`,

    // ========== 子设备更新 ==========
    INFO_UPDATED: (subDeviceId: string) => `子设备信息已更新: ${subDeviceId}`,

    // ========== 操作类型 ==========
    UNKONWN_DEVICE_TYPE: (deviceType: string) => `未知的子设备操作: ${deviceType}`,

    // ========== 子设备删除（用户操作） ==========
    DELETED_SUCCESS: (timerId: string) => `子设备删除成功: ${timerId}`,

    // ========== 子设备重命名 ==========
    RENAMED_SUCCESS: (timerId: string, newName: string) => `子设备重命名成功: ${timerId} 新名称: ${newName}`,

    // ========== 子设备状态批量更新 ==========
    SUBDEVICE_FIELD_MISSING: (gatewayId: string, index: number, missingField: string) =>
      `网关 ${gatewayId} 上报的子设备状态列表中第 ${index} 个子设备状态缺少 ${missingField}，跳过该子设备状态更新`,
    SUBDEVICE_MISSING: (timerId: string) => `子设备不存在: ${timerId}，跳过更新`,
    SUBDEVICE_EMPTY: (gatewayId: string) => `网关 ${gatewayId} 上报的子设备状态列表为空，跳过更新`,
    SUBDEVICE_STATUS_UPDATED_SUCCESS: (updatedCount: number, skippedCount: number) =>
      `子设备状态批量更新完成: 成功 ${updatedCount} 个, 跳过 ${skippedCount} 个`,
    SUBDEVICE_STATUS_RECEIVED: (count: number) => `收到 ${count} 个子设备状态更新`,
  },
  SYNC: {
    SUBSCRIBED: (tableCount: number) => `已订阅 ${tableCount} 个表的同步消息`,
    SYNC_FAILED: (collection: string, error: string) => `同步失败 [${collection}]: ${error}`,
    UNSUPPORTED_OPERATION: (operation: string) => `不支持的操作: ${operation}`,
    INSERT_SUCCESS: (collection: string, key: any) => `插入数据 [${collection}] key: ${key}`,
    UPDATE_SUCCESS: (collection: string, key: any) => `更新数据 [${collection}] key: ${key}`,
    REPLACE_SUCCESS: (collection: string, key: any) => `替换数据 [${collection}] key: ${key}`,
    DELETE_SUCCESS: (collection: string, key: any) => ` 删除数据 [${collection}] key: ${key}`,
  },
  DEVICE: {
    UNKNOWN_ACTION: (action: string) => `未知的操作类型: ${action}`,
  },
  REDIS: {
    CONNECT_SUCCESS: () => 'Redis connected successfully',
    CONNECT_ERROR: (error: string) => `Redis connection error: ${error}`,
    CONNECT_CLOSED: () => 'Redis connection closed',
    RECONNECTING: () => 'Redis reconnecting...',
    INIT_FAILED: (error: string) => `Redis initialization failed: ${error}`,
    DISCONNECT: () => 'Redis disconnected',
  },
  PSK: {
    LOAD: (size: number) => `[PskService] 缓存预热完成，已加载 ${size} 条已确认 PSK`,
    SYNC_COMPLETE: (count: number) => `PSK sync complete, ${count} record(s) in Redis`,
    SYNC_FAILED: (error: string) => `PSK sync failed: ${error}`,
    SYNC_FROM_DATABASE: (count: number) => `Loaded ${count} PSK(s) from database and synced to Redis`,
    REDIS_REMOVED: (identity: string) => `PSK 已从 Redis 移除: ${identity}`,
    GENERATED: (identity: string, key: string) => `PSK identity: ${identity}, key: ${key} 已生成并写入数据库，状态: 待确认`,
    CONFIRMED: (identity: string) => `PSK 已确认并激活: ${identity}`,
    CACHE_CLEARED: () => '所有 PSK 缓存已从 Redis 清空',
    AUTH_STRATEGY_INIT: (count: number) => `PSK authentication strategy initialized, cached ${count} record(s)`,
    LOAD_FROM_REDIS: (count: number) => `Loaded ${count} PSK(s) from Redis to memory cache`,
    LOAD_FROM_REDIS_FAILED: (error: string) => `Failed to load PSK from Redis: ${error}`,
    AUTH_FAILED_DETAIL: (clientId: string, identity: string, exists: boolean, isActive: boolean, cacheSize: number) =>
      `PSK认证失败 - ClientID: ${clientId}, Identity: ${identity}, 存在: ${exists}, 已激活: ${isActive}, 缓存数量: ${cacheSize}`,
    KEY_NOT_FOUND: (identity: string, cacheSize: number, cacheKeys: string) =>
      `PSK密钥未找到 - Identity: ${identity}, 缓存数量: ${cacheSize}, 缓存Keys: [${cacheKeys}]`,
    KEY_EMPTY: (identity: string) => `PSK密钥为空 - Identity: ${identity}`,
    KEY_FOUND: (identity: string) => `PSK密钥查找成功 - Identity: ${identity}`,
    KEY_ERROR: (identity: string, error: string) => `PSK密钥查找异常 - Identity: ${identity}, Error: ${error}`,
  },
  PRODUCT: {
    INIT_SINGLE: (name: string, productId: string) => `初始化产品配置: ${name} (productId: ${productId})`,
    INIT_COMPLETE: (created: number, updated: number, unchanged: number) =>
      `Product configuration synced: ${created} created, ${updated} updated, ${unchanged} unchanged`,
    CREATED: (name: string, productId: string) => `创建新产品配置: ${name} (productId: ${productId})`,
    UPDATED: (name: string, productId: string) => `Update product configuration: ${name} (product ID: ${productId})`,
    DISABLED: (productId: string) => `禁用产品配置: productId=${productId}`,
  },
  CHANNEL: {
    BATCH_CREATED: (timerId: string, count: number) => `批量创建通道: Timer=${timerId}, 数量=${count}`,
    DP_UPDATED: (timerId: string, channelNumber: number, updatedFields: string) =>
      `通道DP更新: Timer=${timerId}, 编号=${channelNumber}, 字段=[${updatedFields}]`,
    NOT_FOUND: (channelId: string) => `通道未找到: ${channelId}`,
    ZONE_NAME_UPDATED: (channelId: string, zoneName: string) => `通道区域名称已更新: ${channelId}, 名称="${zoneName}"`,
    WEATHER_SKIP_UPDATED: (channelId: string, enabled: number) => `通道天气跳过已更新: ${channelId}, 启用=${enabled === 1 ? '是' : '否'}`,
    ZONE_IMAGE_UPDATED: (channelId: string) => `通道区域图片已更新: ${channelId}`,
  },
  OTA: {
    // ========== MQTT 消息接收 ==========
    MESSAGE_RECEIVED: (uuid: string, msgType: string) => `收到OTA消息: ${uuid}, 类型: ${msgType}`,
    MESSAGE_PARSE_ERROR: () => `OTA payload parsed error`,
    UNKNOWN_MESSAGE_TYPE: (msgType: string) => `未知的OTA消息类型: ${msgType}`,
    HANDLE_ERROR: (error: string) => `处理OTA消息失败: ${error}`,

    // ========== 升级进度 ==========
    PROGRESS_UPDATED: (uuid: string, status: string, progress: number) => `网关 ${uuid} OTA进度: ${status} ${progress}%`,

    // ========== 升级结果 ==========
    UPGRADE_SUCCESS: (uuid: string, version?: string) => `网关 ${uuid} OTA升级成功${version ? `: ${version}` : ''}`,
    UPGRADE_FAILED: (uuid: string, errorMessage?: string) => `网关 ${uuid} OTA升级失败${errorMessage ? `: ${errorMessage}` : ''}`,

    // ========== 任务管理 ==========
    TASK_NOT_FOUND: (msgId: string) => `升级任务未找到: ${msgId}`,
  },
  COMMON: {
    ERROR: (context: string, error: string) => ` ${context} 错误: ${error}`,
    WARN: (context: string, message: string) => ` ${context} 警告: ${message}`,
    INFO: (context: string, message: string) => ` ${context} 信息: ${message}`,
  },
} as const
