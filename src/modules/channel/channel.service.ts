import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { Channel, ChannelDocument } from './schema/channel.schema'
import { LoggerService } from '@/core/logger/logger.service'
import { LogMessages, LogContext } from '@/shared/constants/logger.constants'
import { OnEvent } from '@nestjs/event-emitter'
import { AppEvents } from '@/shared/constants/events.constants'

/**
 * Channel模块的Service
 *
 * 职责：
 * 1. 在Timer添加时自动创建通道（根据channel_count）
 * 2. 根据DP点更新通道状态
 * 3. 提供通道查询和更新功能
 * 4. 通道不能单独删除，只能随Timer一起删除
 */
@Injectable()
export class ChannelService {
  constructor(
    @InjectModel(Channel.name) private readonly channelModel: Model<ChannelDocument>,
    private readonly logger: LoggerService,
  ) {}
  /**
   * 监听 Timer 创建事件，自动创建通道
   * @param timerId Timer设备ID
   * @param userId 用户ID
   * @param outletCount 出水口数量（1-4）
   */
  @OnEvent(AppEvents.SUBDEVICE_ADDED)
  async createChannelsForTimer(data: { timerId: string; userId: string; channelCount: number }): Promise<void> {
    const { timerId, userId, channelCount } = data
    const existingChannels = await this.channelModel.find({ timerId })
    if (existingChannels.length) return
    // 批量创建通道
    const channels = Array.from({ length: channelCount }, (_, i) => ({
      timerId,
      userId,
      channel_number: i + 1,
      zone_name: '',
      is_running: 0,
      work_state: 'idle',
      remaining_countdown: 0,
      irrigation_duration: 0,
      next_run_time: null,
      timer_config: '',
      weather_skip_enabled: 0,
      total_irrigation_time: 0,
      last_run_time: null,
      last_dp_update: null,
    }))
    await this.channelModel.insertMany(channels)
    this.logger.info(LogMessages.CHANNEL.BATCH_CREATED(timerId, channelCount), LogContext.CHANNEL_SERVICE)
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
    return await this.channelModel.find({ timerId }).sort({ channel_number: 1 }).lean()
  }

  // 根据通道ID查询通道详情（权限已由 Guard 验证）
  async findChannelById(channelId: string): Promise<Channel> {
    return await this.channelModel.findById(channelId).lean()
  }

  // 更新通道区域名称（权限已由 Guard 验证）
  async updateZoneName(channelId: string, zoneName: string): Promise<void> {
    await this.channelModel.updateOne({ _id: channelId }, { $set: { zone_name: zoneName } })
    this.logger.info(LogMessages.CHANNEL.ZONE_NAME_UPDATED(channelId, zoneName), LogContext.CHANNEL_SERVICE)
  }

  // 更新通道天气跳过设置（权限已由 Guard 验证）
  async updateWeatherSkip(channelId: string, enabled: number): Promise<void> {
    await this.channelModel.updateOne({ _id: channelId }, { $set: { weather_skip_enabled: enabled } })
    this.logger.info(LogMessages.CHANNEL.WEATHER_SKIP_UPDATED(channelId, enabled), LogContext.CHANNEL_SERVICE)
  }

  // 更新通道区域图片（权限已由 Guard 验证）
  async updateZoneImage(channelId: string, zoneImage: string): Promise<void> {
    await this.channelModel.updateOne({ _id: channelId }, { $set: { zone_image: zoneImage } })
    this.logger.info(LogMessages.CHANNEL.ZONE_IMAGE_UPDATED(channelId), LogContext.CHANNEL_SERVICE)
  }
}
