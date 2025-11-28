/**
 * 网关状态数据
 */
export interface GatewayStatusData {
  /** 是否在线 */
  online: boolean

  /** WiFi信号强度 */
  wifi_rssi?: number

  /** 固件版本 */
  firmware?: string

  /** 内存使用率 */
  memory_usage?: number

  /** CPU使用率 */
  cpu_usage?: number
}
