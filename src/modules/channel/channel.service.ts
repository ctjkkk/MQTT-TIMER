import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Channel, ChannelDocument } from './schema/channel.schema'
import { LoggerService } from '@/core/logger/logger.service'
import { LogMessages, LogContext } from '@/shared/constants/logger.constants'
import { IChannelService } from './interface/channel-service.interface'

/**
 * Channel模块的Service
 *
 * 职责：
 * 1. 根据DP点更新通道状态
 * 2. 提供通道查询和更新功能
 * 3. 通道不能单独删除，只能随Timer一起删除
 */
@Injectable()
export class ChannelService implements IChannelService {
  constructor(
    @InjectModel(Channel.name) private readonly channelModel: Model<ChannelDocument>,
    private readonly logger: LoggerService,
  ) {}

  /**
   * 删除Timer的所有通道（由TimerService在删除Timer时调用）
   */
  async deleteChannelsByTimerId(timerId: string): Promise<void> {
    await this.channelModel.deleteMany({ timerId })
  }

  /**
   * 根据DP点数据更新通道状态
   * @param timerId Timer设备ID
   * @param dps DP点数据
   */
  async updateChannelsByDp(timerId: string, dps: Record<string, any>): Promise<void> {
    const channels = await this.channelModel.find({ timerId })
    for (const channel of channels) {
      const channelNumber = channel.channel_number
      const updates: any = {}
      const updatedFields: string[] = []

      // DP1-4: 开关状态
      const switchDp = dps[String(channelNumber)]
      if (switchDp !== undefined) {
        updates.is_running = switchDp ? 1 : 0
        updatedFields.push(`is_running=${updates.is_running}`)
      }

      // DP17-20: 灌溉时长（秒）
      const durationDp = dps[String(16 + channelNumber)]
      if (durationDp !== undefined) {
        updates.irrigation_duration = durationDp
        updatedFields.push(`irrigation_duration=${durationDp}`)
      }

      // DP105-108: 剩余倒计时（秒）
      const countdownDp = dps[String(104 + channelNumber)]
      if (countdownDp !== undefined) {
        updates.remaining_countdown = countdownDp
        updatedFields.push(`remaining_countdown=${countdownDp}`)
      }

      // DP119-122: 工作状态（0=idle, 1=manual, 2=timing, 3=spray）
      const workStateDp = dps[String(118 + channelNumber)]
      if (workStateDp !== undefined) {
        const stateMap = { 0: 'idle', 1: 'manual', 2: 'timing', 3: 'spray' }
        updates.work_state = stateMap[workStateDp] || 'idle'
        updatedFields.push(`work_state=${updates.work_state}`)
      }

      // DP131-134: 累计灌溉时长（分钟）
      const totalTimeDp = dps[String(130 + channelNumber)]
      if (totalTimeDp !== undefined) {
        updates.total_irrigation_time = totalTimeDp
        updatedFields.push(`total_irrigation_time=${totalTimeDp}`)
      }
      // 如果有数据需要更新
      if (Object.keys(updates).length > 0) {
        updates.last_dp_update = new Date()
        // 如果从关闭变为运行，记录最后运行时间
        if (updates.is_running === 1 && channel.is_running === 0) {
          updates.last_run_time = new Date()
          updatedFields.push('last_run_time')
        }
        await this.channelModel.updateOne({ _id: channel._id }, { $set: updates })
        this.logger.info(LogMessages.CHANNEL.DP_UPDATED(timerId, channelNumber, updatedFields.join(', ')), LogContext.CHANNEL_SERVICE)
      }
    }
  }

  // 根据Timer ID查询通道列表（权限已由 Guard 验证）
  async findChannelsByTimerId(timerId: string): Promise<Channel[]> {
    const channels = await this.channelModel.find({ timerId: timerId }).sort({ channel_number: 1 }).lean()
    return channels.map(channel => {
      const { _id, __v, ...rest } = channel
      return { channelId: _id.toString(), ...rest }
    })
  }

  // 根据通道ID查询通道详情（权限已由 Guard 验证）
  async findChannelById(channelId: string): Promise<Channel> {
    const channel = await this.channelModel.findById(channelId).lean()
    const { _id, ...rest } = channel
    return { channelId: _id.toString(), ...rest }
  }

  // 更新通道区域名称（权限已由 Guard 验证）
  async updateZoneName(channelId: string, zoneName: string): Promise<Channel> {
    const updated = await this.channelModel.findByIdAndUpdate(channelId, { $set: { zone_name: zoneName } }, { new: true, lean: true })
    this.logger.info(LogMessages.CHANNEL.ZONE_NAME_UPDATED(channelId, zoneName), LogContext.CHANNEL_SERVICE)
    const { _id, __v, ...rest } = updated
    return { channelId: _id.toString(), ...rest }
  }

  // 更新通道天气跳过设置（权限已由 Guard 验证）
  async updateWeatherSkip(channelId: string, enabled: number): Promise<Channel> {
    const updated = await this.channelModel.findByIdAndUpdate(
      channelId,
      { $set: { weather_skip_enabled: enabled } },
      { new: true, lean: true },
    )
    this.logger.info(LogMessages.CHANNEL.WEATHER_SKIP_UPDATED(channelId, enabled), LogContext.CHANNEL_SERVICE)
    const { _id, __v, ...rest } = updated
    return { channelId: _id.toString(), ...rest }
  }

  // 更新通道区域图片（权限已由 Guard 验证）
  async updateZoneImage(channelId: string, zoneImage: string): Promise<Channel> {
    const updated = await this.channelModel.findByIdAndUpdate(channelId, { $set: { zone_image: zoneImage } }, { new: true, lean: true })
    this.logger.info(LogMessages.CHANNEL.ZONE_IMAGE_UPDATED(channelId), LogContext.CHANNEL_SERVICE)
    const { _id, __v, ...rest } = updated
    return { channelId: _id.toString(), ...rest }
  }
}
