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

  // ==================== 基础设施 ====================
  /** 数据库操作 */
  MONGODB: 'MongoDB',
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
  /** 调度模块 */
  SCHEDULE: 'Schedule',
  /** 消息分发服务 */
  DISPATCH_SERVICE: 'DispatchService',

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
    BROKER_START: (way: string, port: string | number) => `${way} 模式成功连接到 MQTT 代理，端口：${port}`,
    BROKER_STOP: '🛑 MQTT Broker 已停止',
    CLIENT_CONNECTED: (clientId: string) => `🔗 客户端连接: ${clientId}`,
    CLIENT_DISCONNECTED: (clientId: string) => `🔌 客户端断开: ${clientId}`,
    MESSAGE_PUBLISHED: (clientId: string, topic: string) => `📨 Message published from ${clientId} to topic ${topic}`,
    SUBSCRIPTION_ADDED: (topic: string) => `📝 订阅主题: ${topic}`,
    AUTHENTICATION_FAILED: (username: string) => `❌ 认证失败: ${username}`,
    AUTHENTICATION_SUCCESS: (username: string) => `✅ 认证成功: ${username}`,
    WHITELIST_EMPTY: '⚠️ MQTT_WHITELIST 为空或未设置，禁止所有用户连接',
    INTERNAL_ERROR: '🚨 内部认证错误',
    PUBLISH_ERROR: (error: string) => `📤 发布错误: ${error}`,
    SCANNING_PROCESSOR: () => '开始扫描 MQTT 处理器...',
    REGISTER_PROCESSOR: (topic: string, controllerName: string, methodName: string) =>
      `注册处理器: ${topic} -> ${controllerName}.${methodName}`,
    SCANNING_PROCESSOR_SCCUSS: (handlerCount: number) => `MQTT 处理器扫描完成，共找到 ${handlerCount} 个处理器`,
    PARSE_ERROR: (error?: string) => `MQTT 消息解析错误: ${error}`,
  },
  DATABASE: {
    CONNECT_SCCUSS: (dbName: string) => `MongoDB 连接成功 - 数据库: ${dbName}`,
    CONNECT_ERROR: (errMsg: string) => `❌ MongoDB 连接错误: ${errMsg}`,
    CONNECT_FAIL: (errMsg: string) => `❌ MongoDB 连接失败: ${errMsg}`,
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
    ONLINE: (gatewayId: string) => `✅ 网关上线: ${gatewayId}`,
    OFFLINE: (gatewayId: string) => `❌ 网关离线: ${gatewayId}`,
    REGISTERED: (gatewayId: string) => `📝 网关注册: ${gatewayId}`,
    REBOOT: (gatewayId: string) => `🔄 网关重启: ${gatewayId}`,
    BIND_SUCCESS: (gatewayId: string, userId: string) => `网关绑定成功: ${gatewayId}, 用户: ${userId}`,
    BIND_UPDATE: (gatewayId: string, userId: string) => ` 网关绑定更新: ${gatewayId}, 用户: ${userId}`,
    UNBIND: (gatewayId: string, userId: string) => `网关解绑: ${gatewayId}, 用户: ${userId}`,
    HEARTBEAT_UNKNOWN: (deviceId: string) => `⚠️ 收到未知网关的心跳: ${deviceId}`,
    HEARTBEAT_ACK_SENT: (deviceId: string, isBound: boolean) =>
      `心跳响应已发送: ${deviceId}, 用户绑定状态: ${isBound ? '已绑定' : '未绑定'}`,
    ONLINE_UNBOUND: (deviceId: string) => `网关 ${deviceId} 上线但未绑定用户`,
    STATUS_UPDATED: (deviceId: string, online: boolean) => `📊 网关状态已更新: ${deviceId}, 在线: ${online}`,
    UNHANDLED_OPERATION: (action: string) => `⚠️ 未处理的网关操作: ${action}`,
    COMMAND_SENT: (gatewayId: string, msgType: string, message: any) =>
      `发送网关命令: ${gatewayId}, 类型: ${msgType}, 消息: ${JSON.stringify(message)}`,
    SUBDEVICE_COMMAND_SENT: (gatewayId: string, subDeviceId: string, msgType: string) =>
      `📤 发送子设备命令: 网关=${gatewayId}, 设备=${subDeviceId}, 类型=${msgType}`,
  },
  TIMER: {
    ADDED_SUCCESS: (count: number) => `批量添加子设备完成: ${count} 个成功`,
    UNKONWN_DEVICE_TYPE: (deviceType: string) => `未知的子设备操作: ${deviceType}`,
    DELETED_SUCCESS: (timerId: string) => `子设备删除成功: ${timerId}`,
  },
  SYNC: {
    SUBSCRIBED: (tableCount: number) => `已订阅 ${tableCount} 个表的同步消息`,
    SYNC_FAILED: (collection: string, error: string) => `❌ 同步失败 [${collection}]: ${error}`,
    UNSUPPORTED_OPERATION: (operation: string) => `不支持的操作: ${operation}`,
    INSERT_SUCCESS: (collection: string, key: any) => `插入数据 [${collection}] key: ${key}`,
    UPDATE_SUCCESS: (collection: string, key: any) => `更新数据 [${collection}] key: ${key}`,
    REPLACE_SUCCESS: (collection: string, key: any) => `替换数据 [${collection}] key: ${key}`,
    DELETE_SUCCESS: (collection: string, key: any) => ` 删除数据 [${collection}] key: ${key}`,
  },
  DEVICE: {
    UNKNOWN_ACTION: (action: string) => `未知的操作类型: ${action}`,
  },
  PSK: {
    LOAD: (size: number) => `[PskService] 缓存预热完成，已加载 ${size} 条已确认 PSK`,
    GENERATED: (identity: string, key: string) => `PSK identity: ${identity}, key: ${key} 已生成并写入数据库，状态: 待确认`,
    AUTH_FAILED_DETAIL: (clientId: string, identity: string, exists: boolean, isActive: boolean, cacheSize: number) =>
      `PSK认证失败 - ClientID: ${clientId}, Identity: ${identity}, 存在: ${exists}, 已激活: ${isActive}, 缓存数量: ${cacheSize}`,
    KEY_NOT_FOUND: (identity: string, cacheSize: number, cacheKeys: string) =>
      `PSK密钥未找到 - Identity: ${identity}, 缓存数量: ${cacheSize}, 缓存Keys: [${cacheKeys}]`,
    KEY_EMPTY: (identity: string) => `PSK密钥为空 - Identity: ${identity}`,
    KEY_FOUND: (identity: string) => `PSK密钥查找成功 - Identity: ${identity}`,
    KEY_ERROR: (identity: string, error: string) => `PSK密钥查找异常 - Identity: ${identity}, Error: ${error}`,
  },
  COMMON: {
    ERROR: (context: string, error: string) => `❌ ${context} 错误: ${error}`,
    WARN: (context: string, message: string) => `⚠️ ${context} 警告: ${message}`,
    INFO: (context: string, message: string) => `ℹ️ ${context} 信息: ${message}`,
  },
} as const
