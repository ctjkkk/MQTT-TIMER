export const LogMessages = {
  MQTT: {
    BROKER_START: (way: string, port: string | number) => `✅ ${way} 模式成功连接到 MQTT 代理，端口：${port}`,
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
