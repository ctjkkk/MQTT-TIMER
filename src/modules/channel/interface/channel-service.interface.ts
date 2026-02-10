import { Channel } from '../schema/channel.schema'

export interface IChannelService {
  /**
   * 删除Timer的所有通道（由TimerService在删除Timer时调用）
   * @param timerId Timer设备ID
   */
  deleteChannelsByTimerId(timerId: string): Promise<void>

  /**
   * 根据DP点数据更新通道状态
   * @param timerId Timer设备ID
   * @param dps DP点数据
   */
  updateChannelsByDp(timerId: string, dps: Record<string, any>): Promise<void>

  // ============ HTTP接口方法（权限已由 Guard 验证） ============

  /**
   * 根据Timer ID查询通道列表
   * @param timerId Timer设备ID
   * @returns 通道列表
   */
  findChannelsByTimerId(timerId: string): Promise<Channel[]>

  /**
   * 根据通道ID查询通道详情
   * @param channelId 通道ID
   * @returns 通道详情
   */
  findChannelById(channelId: string): Promise<Channel>

  /**
   * 更新通道区域名称
   * @param channelId 通道ID
   * @param zoneName 区域名称
   * @returns 更新后的通道数据
   */
  updateZoneName(channelId: string, zoneName: string): Promise<Channel>

  /**
   * 更新通道天气跳过设置
   * @param channelId 通道ID
   * @param enabled 是否启用（0=禁用，1=启用）
   * @returns 更新后的通道数据
   */
  updateWeatherSkip(channelId: string, enabled: number): Promise<Channel>

  /**
   * 更新通道区域图片
   * @param channelId 通道ID
   * @param zoneImage 区域图片URL
   * @returns 更新后的通道数据
   */
  updateZoneImage(channelId: string, zoneImage: string): Promise<Channel>
}
