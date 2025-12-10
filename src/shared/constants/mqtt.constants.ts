export enum DeviceConnectionStatus {
  DISCONNECTED = 0,
  CONNECTED = 1,
}

export const MQTT_TOPIC_METADATA = 'MQTT_TOPIC_METADATA',
  MQTT_PARAM_METADATA = 'MQTT_PARAM_METADATA' as const

export const AuthErrorCode = {
  UNACCEPTABLE_PROTOCOL_VERSION: 1, // 不支持的协议版本（客户端 MQTT 版本号与服务端不匹配）
  IDENTIFIER_REJECTED: 2, // 客户端标识符被拒绝（通常因为 ID 包含非法字符或长度超限）
  SERVER_UNAVAILABLE: 3, // 服务端不可用（例如服务端资源耗尽、临时停机）
  NOT_AUTHORIZED: 4, // 最常见，用户名/密码或 PSK 不对
  USERNAME_PASSWORD_ERROR: 4, // 与 NOT_AUTHORIZED 同值，仅作别名，便于代码里一眼看出是账号密码错
  NOT_AUTHORIZED_5: 5, //  MQTT 5 专用“未授权”码；MQTT 3.x 客户端不会收到该值
}

// psk支持的加密算法白名单
export const PSK_CIPHERS = 'PSK-AES128-CBC-SHA256:PSK-AES256-CBC-SHA384:PSK-AES128-GCM-SHA256:PSK-AES256-GCM-SHA384' as const
