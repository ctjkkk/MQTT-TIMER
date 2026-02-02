/**
 * PSK 服务接口（负责数据库和 Redis 同步）
 */
export interface IPskServiceInterface {
  /**
   * 生成 PSK（更新数据库和 Redis）
   */
  generatePsk(macAddress: string)

  /**
   * 确认 PSK（更新数据库和 Redis）
   */
  confirmPsk(macAddress: string)

  /**
   * 手动触发同步
   */
  manualSync(): Promise<{ redisCount: number }>

  /**
   * 清空所有 PSK 缓存
   */
  clearAllCache(): Promise<void>
}
