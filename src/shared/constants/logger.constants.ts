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
    USER_CONNECTION_SUCCESSFUL: (ClientId: string, username: string) =>
      `${ClientId} Authentication successful for user: ${username}`,
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
    NO_SIGN_ENV_VAR: () => '警告:未配置SIGNATURE_SECRET环境变量,签名验证将无法正常工作',
    X_SIGN_IS_MISSING: () => '请求缺少签名头 X-Signature',
    X_TIME_IS_MISSING: () => '请求缺少时间戳头 X-Timestamp',
    X_TIME_IS_EXPIRED_OR_INVALID: (timestamp: string) => `时间戳已过期或无效: ${timestamp}`,
    X_SIGN_VERIFY_FAILED: (method: string, path: string, timestamp: string) =>
      `签名验证失败 - Method: ${method}, Path: ${path}, Timestamp: ${timestamp}`,
    X_SIGN_TIME_VERIFY_SCCUSS: (path: string) => `签名验证成功 - Path: ${path}`,
  },
  GATEWAY: {
    NOT_FOUND: (mac: string) => `📡 网关未找到: ${mac}`,
    USER_NOT_FOUND: (mac: string, userId: string) => `👤 用户未找到: 网关 ${mac}, 用户ID ${userId}`,
    CONNECTION_UPDATED: (mac: string, status: string) => `🔄 连接状态更新: ${mac} -> ${status}`,
    DEVICE_DISCONNECTED: (mac: string) => `🔌 设备断开: ${mac}`,
    UNKNOWN_ACTION: (action: string) => `未知的操作类型: ${action}`,
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
  },
  COMMON: {
    ERROR: (context: string, error: string) => `❌ ${context} 错误: ${error}`,
    WARN: (context: string, message: string) => `⚠️ ${context} 警告: ${message}`,
    INFO: (context: string, message: string) => `ℹ️ ${context} 信息: ${message}`,
  },
} as const
