/**
 * 应用事件常量定义
 * 使用事件驱动架构解耦模块间通信
 */

export const AppEvents = {
  // ===== MQTT 相关事件 =====
  /**
   * MQTT 网关消息事件
   * 当网关自身发送消息时触发（无 subDeviceId）
   */
  MQTT_GATEWAY_MESSAGE: 'mqtt.gateway.message',

  /**
   * MQTT 子设备消息事件
   * 当子设备发送消息时触发（有 subDeviceId）
   */
  MQTT_SUBDEVICE_MESSAGE: 'mqtt.subdevice.message',

  /**
   * MQTT 连接断开事件
   */
  MQTT_CONNECTION_LOST: 'mqtt.connection.lost',

  // ===== 网关相关事件 =====
  /**
   * 网关上线事件
   */
  GATEWAY_ONLINE: 'gateway.online',

  /**
   * 网关离线事件
   */
  GATEWAY_OFFLINE: 'gateway.offline',

  /**
   * 网关注册事件
   */
  GATEWAY_REGISTERED: 'gateway.registered',

  // ===== 设备相关事件 =====
  /**
   * 设备 DP 点更新事件
   */
  DEVICE_DP_UPDATED: 'device.dp.updated',

  /**
   * 设备添加、删除、更新子设备事件
   */
  SUBDEVICE_ADDED: 'subdevice.added',
  SUBDEVICE_DELETED: 'subdevice.deleted',
  SUBDEVICE_UPDATED: 'subdevice.updated',
  /**
   * 设备事件上报
   */
  DEVICE_EVENT_REPORTED: 'device.event.reported',

  /**
   * 设备心跳事件
   */
  DEVICE_HEARTBEAT: 'device.heartbeat',

  /**
   * 设备生命周期事件（上线/离线/绑定/解绑）
   */
  DEVICE_LIFECYCLE: 'device.lifecycle',

  // ===== 用户相关事件 =====
  /**
   * 用户登录事件
   */
  USER_LOGIN: 'user.login',

  /**
   * 用户登出事件
   */
  USER_LOGOUT: 'user.logout',
} as const

// 事件名称类型（用于 TypeScript 类型检查）
export type AppEventName = (typeof AppEvents)[keyof typeof AppEvents]
