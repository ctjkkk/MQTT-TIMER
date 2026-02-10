import { ForbiddenException, Inject, Injectable } from '@nestjs/common'
import { InjectModel, InjectConnection } from '@nestjs/mongoose'
import { Model, Connection } from 'mongoose'
import { ChannelService } from '../channel/channel.service'
import { ProductService } from '../product/product.service'
import type { MqttUnifiedMessage, DpReportData } from '@/shared/constants/topic.constants'
import { OperateAction } from '@/shared/constants/topic.constants'
import { Timer, TimerDocument } from './schema/timer.schema'
import { Gateway, GatewayDocument } from '@/modules/gateway/schema/gateway.schema'
import { Channel, ChannelDocument } from '@/modules/channel/schema/channel.schema'
import { LoggerService } from '@/core/logger/logger.service'
import { LogContext, LogMessages } from '@/shared/constants/logger.constants'
import { CommandSenderService } from '@/core/mqtt/services/commandSender.service'
import { SubDeviceInfoResponseDto, SubDeviceListResponseDto } from './dto/timer.response.dto'
import { ITimerService } from './interface/timer-service.interface'
/**
 * Timer设备模块的Service
 * 职责：
 * 1. 处理Timer设备的业务逻辑
 * 2. 解析DP点数据并更新数据库
 */
@Injectable()
export class TimerService implements ITimerService {
  constructor(
    @InjectModel(Timer.name) private readonly timerModel: Model<TimerDocument>,
    @InjectModel(Gateway.name) private readonly gatewayModel: Model<GatewayDocument>,
    @InjectModel(Channel.name) private readonly channelModel: Model<ChannelDocument>,
    @InjectConnection() private readonly connection: Connection,
    @Inject(CommandSenderService) private readonly commandSenderService: CommandSenderService,
    private readonly channelService: ChannelService,
    private readonly productService: ProductService,
    private readonly loggerService: LoggerService,
    private readonly logger: LoggerService,
  ) {}

  // ========== MQTT消息处理方法（由EventsHandler调用） ==========

  /**
   * 处理Timer设备的DP点上报
   * 由TimerEventsHandler调用
   */
  async handleDpReport(message: MqttUnifiedMessage<DpReportData>) {
    const { uuid } = message
    const { dps } = message.data
    // 查找Timer设备
    const timer = await this.timerModel.findOne({ timerId: uuid })
    if (!timer) {
      this.logger.warn(LogMessages.TIMER.NOT_FOUND(uuid), LogContext.TIMER_SERVICE)
      return
    }
    // 更新Timer基础信息
    const updates: any = {}
    // DP点映射（基础功能 1-20）
    if (dps['1'] !== undefined) updates.status = dps['1'] ? 1 : 0 // 设备开关
    if (dps['4'] !== undefined) updates.battery_level = dps['4'] // 电池电量
    if (dps['5'] !== undefined) updates.signal_strength = dps['5'] // 信号强度
    if (dps['6'] !== undefined) updates.firmware_version = dps['6'] // 固件版本
    if (dps['7'] !== undefined) updates.outlet_count = dps['7'] // 出水口数量

    // 如果有更新
    if (Object.keys(updates).length > 0) {
      updates.dp_data = dps
      updates.last_dp_update = new Date()
      updates.last_seen = new Date()
      await this.timerModel.updateOne({ _id: timer._id }, { $set: updates })
    }
    // 调用ChannelService更新通道数据
    await this.channelService.updateChannelsByDp(timer.timerId, dps)
  }

  /**
   * 处理子设备心跳
   */
  async handleHeartbeat(message: MqttUnifiedMessage) {
    await this.timerModel.updateOne({ timerId: message.uuid }, { $set: { last_seen: new Date() } })
  }

  /**
   * 处理子设备生命周期操作
   * 由TimerEventsHandler调用
   */
  async handleOperateDevice(message: MqttUnifiedMessage) {
    const { action } = message.data
    switch (action) {
      case OperateAction.SUBDEVICE_ADD:
        // 网关配对到新的子设备
        await this.addSubDevices(message.uuid, message.data.subDevices)
        break
      case OperateAction.SUBDEVICE_DELETE:
        // 子设备删除（MQTT消息使用uuid）
        await this.deleteSubDeviceByGateway(message.uuid, message.data.uuid)
        break
      case OperateAction.SUBDEVICE_UPDATE:
        // 子设备信息更新
        await this.updateSubDevice(message.data)
        break
      default:
        this.loggerService.warn(LogMessages.TIMER.UNKONWN_DEVICE_TYPE(action), LogContext.TIMER_SERVICE)
    }
  }

  // 批量处理子设备状态上报
  async handleDeviceStatus(message: MqttUnifiedMessage) {
    const { uuid: gatewayId } = message
    const { subDevices } = message.data
    if (!Array.isArray(subDevices) || !subDevices.length) {
      this.logger.warn(LogMessages.TIMER.SUBDEVICE_EMPTY(gatewayId), LogContext.TIMER_SERVICE)
      return
    }
    this.logger.info(LogMessages.TIMER.SUBDEVICE_STATUS_RECEIVED(subDevices.length), LogContext.TIMER_SERVICE)
    const stats = { updated: 0, skipped: 0 }

    for (const [index, device] of subDevices.entries()) {
      const success = await this.updateSubDeviceStatus(device, gatewayId, index + 1)
      success ? stats.updated++ : stats.skipped++
    }
    this.logger.info(LogMessages.TIMER.SUBDEVICE_STATUS_UPDATED_SUCCESS(stats.updated, stats.skipped), LogContext.TIMER_SERVICE)
  }

  // 更新单个子设备状态
  private async updateSubDeviceStatus(device: any, gatewayId: string, index: number): Promise<boolean> {
    // MQTT消息使用uuid，内部逻辑使用flashId
    const { uuid, online, signal_strength, battery_level } = device
    if (!uuid) {
      this.logger.warn(LogMessages.TIMER.SUBDEVICE_FIELD_MISSING(gatewayId, index, 'uuid'), LogContext.TIMER_SERVICE)
      return false
    }
    if (online == null) {
      this.logger.warn(LogMessages.TIMER.SUBDEVICE_FIELD_MISSING(gatewayId, index, 'online'), LogContext.TIMER_SERVICE)
      return false
    }
    // 查找并更新
    const result = await this.timerModel.updateOne(
      { timerId: uuid },
      {
        $set: {
          online,
          battery_level,
          signal_strength,
          last_seen: new Date(),
        },
      },
    )
    // 检查是否更新成功
    if (!result.matchedCount) {
      this.logger.warn(LogMessages.TIMER.SUBDEVICE_MISSING(uuid), LogContext.TIMER_SERVICE)
      return false
    }
    return true
  }
  /**
   * 添加子设备（网关配对成功后调用）
   * 逻辑：存在则覆盖，不存在则创建（upsert模式）
   * - 网关只上报 uuid 和 productId
   * - 所有其他字段从产品配置表获取
   * @param gatewayId 网关ID
   * @param subDevices 子设备列表，每个设备只包含 { uuid, productId }
   */
  async addSubDevices(gatewayId: string, subDevices: any[]) {
    const gateway = await this.gatewayModel.findOne({ gatewayId })
    if (!gateway) throw new Error('Gateway not found.')
    if (!gateway.userId) throw new Error('Gateway is not bound to any user.')
    const stats = { added: 0, updated: 0, failed: 0 }
    for (const device of subDevices) {
      const { uuid: subDeviceId, productId } = device
      if (!subDeviceId || !productId) {
        this.loggerService.warn(LogMessages.TIMER.ADD_MISSING_FIELD(subDeviceId, productId), LogContext.TIMER_SERVICE)
        stats.failed++
        continue
      }
      // 查询产品配置（所有产品信息从这里获取）
      const productConfig = await this.productService.getProductConfig(productId)
      if (!productConfig) {
        this.loggerService.warn(LogMessages.TIMER.ADD_PRODUCT_NOT_FOUND(productId, subDeviceId), LogContext.TIMER_SERVICE)
        stats.failed++
        continue
      }
      // 从产品配置获取所有属性
      const { name: productName, deviceType, defaultFirmwareVersion, defaultBatteryLevel, channel_count } = productConfig
      // 检查设备是否已存在
      const exists = await this.timerModel.findOne({ timerId: subDeviceId })
      // 使用事务保证Timer和Channel的数据一致性
      const session = await this.connection.startSession()
      try {
        await session.withTransaction(async () => {
          if (exists) {
            // 已存在：只更新Timer（不重复创建Channel）
            await this.timerModel.updateOne(
              { timerId: subDeviceId },
              {
                $set: {
                  userId: gateway.userId,
                  gatewayId,
                  productId,
                  deviceType,
                  channel_count,
                  last_seen: new Date(),
                },
              },
              { session },
            )
            stats.updated++
            this.loggerService.debug(LogMessages.TIMER.SUBDEVICE_UPDATED(subDeviceId), LogContext.TIMER_SERVICE)
          } else {
            // 不存在：创建Timer和Channel
            await this.timerModel.create(
              [
                {
                  timerId: subDeviceId,
                  userId: gateway.userId,
                  gatewayId,
                  name: productName,
                  channel_count,
                  productId,
                  deviceType,
                  firmware_version: defaultFirmwareVersion,
                  online: 1,
                  battery_level: defaultBatteryLevel,
                  createdAt: new Date(),
                },
              ],
              { session },
            )
            // 在同一个事务中创建通道
            const channels = Array.from({ length: channel_count }, (_, i) => ({
              timerId: subDeviceId,
              userId: gateway.userId,
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
            await this.channelModel.insertMany(channels, { session })
            stats.added++
            this.loggerService.debug(LogMessages.TIMER.SUBDEVICE_CREATED(subDeviceId, productName), LogContext.TIMER_SERVICE)
          }
        })
      } catch (error) {
        this.loggerService.error(LogMessages.TIMER.ADD_FAILED(subDeviceId, error.message), LogContext.TIMER_SERVICE)
        stats.failed++
      } finally {
        session.endSession()
      }
    }
    this.loggerService.info(LogMessages.TIMER.BATCH_ADD_COMPLETE(stats.added, stats.updated, stats.failed), LogContext.TIMER_SERVICE)
    if (stats.added || stats.updated) {
      this.commandSenderService.sendStopPairingCommand(gatewayId, 'success')
      this.loggerService.info(LogMessages.TIMER.PAIRING_SUCCESS_COMMAND_SENT(gatewayId), LogContext.TIMER_SERVICE)
    }
  }

  /**
   * 删除子设备（网关主动上报删除）
   * 场景：用户长按设备触发删除，网关物理删除后通知云端同步
   * @param gatewayId 网关ID（来自MQTT消息的uuid字段）
   * @param subDeviceId 子设备ID（来自data.uuid字段）
   */
  async deleteSubDeviceByGateway(gatewayId: string, subDeviceId: string) {
    //  验证子设备是否存在
    const timer = await this.timerModel.findOne({ timerId: subDeviceId })
    if (!timer) {
      this.loggerService.warn(LogMessages.TIMER.DELETE_BY_GATEWAY_NOT_FOUND(gatewayId, subDeviceId), LogContext.TIMER_SERVICE)
      return
    }
    // 验证网关是否存在
    const gateway = await this.gatewayModel.findOne({ gatewayId })
    if (!gateway) {
      this.loggerService.warn(LogMessages.TIMER.DELETE_BY_GATEWAY_GATEWAY_NOT_FOUND(gatewayId, subDeviceId), LogContext.TIMER_SERVICE)
      return
    }
    // 验证子设备是否属于该网关（防止越权删除）
    if (timer.gatewayId !== gatewayId) {
      this.loggerService.error(
        LogMessages.TIMER.DELETE_BY_GATEWAY_UNAUTHORIZED(gatewayId, subDeviceId, timer.gatewayId),
        LogContext.TIMER_SERVICE,
      )
      return
    }
    const session = await this.connection.startSession()
    await session.withTransaction(async () => {
      // 删除该Timer记录
      await this.timerModel.deleteOne({ timerId: subDeviceId }).session(session)
      // 删除该Timer的所有通道
      await this.channelModel.deleteMany({ timerId: subDeviceId }).session(session)
    })
    session.endSession()
    this.loggerService.info(LogMessages.TIMER.DELETE_BY_GATEWAY_SUCCESS(gatewayId, subDeviceId), LogContext.TIMER_SERVICE)
  }

  /**
   * 更新子设备信息
   */
  async updateSubDevice(data: any) {
    const { uuid: subDeviceId, ...updates } = data
    await this.timerModel.updateOne({ timerId: subDeviceId }, { $set: updates })
    this.loggerService.info(LogMessages.TIMER.INFO_UPDATED(subDeviceId), LogContext.TIMER_SERVICE)
  }

  /**
   * 根据子设备ID查找它所属的网关
   */
  async findGatewayBySubDeviceId(subDeviceId: string) {
    const timer = await this.timerModel.findOne({ timerId: subDeviceId })
    if (!timer) return null
    const gateway = await this.gatewayModel.findOne({ gatewayId: timer.gatewayId })
    return gateway
  }

  //通过ID删除指定子设备（权限已由 Guard 验证）
  async deleteSubDeviceById(timerId: string) {
    const timer = await this.timerModel.findOne({ timerId })
    const gateway = await this.gatewayModel.findOne({ gatewayId: timer.gatewayId })
    const session = await this.connection.startSession()
    await session.withTransaction(async () => {
      // 删除该Timer记录
      await this.timerModel.deleteOne({ timerId }).session(session)
      // 删除该Timer的所有通道
      await this.channelModel.deleteMany({ timerId }).session(session)
    })
    session.endSession()
    //下发删除命令给网关
    this.commandSenderService.sendDeleteSubDeviceCommand(gateway.gatewayId, timerId)
    this.loggerService.info(LogMessages.TIMER.DELETED_SUCCESS(timerId), LogContext.TIMER_SERVICE)
  }

  //通过ID修改指定子设备名称（权限已由 Guard 验证）
  async renameSubDeviceById(timerId: string, newName: string): Promise<SubDeviceListResponseDto> {
    const timer = await this.timerModel.findOne({ timerId }).lean()
    await this.timerModel.updateOne({ timerId }, { $set: { name: newName } })
    this.loggerService.info(LogMessages.TIMER.RENAMED_SUCCESS(timerId, newName), LogContext.TIMER_SERVICE)
    return {
      userId: timer.userId?.toString(),
      gatewayId: timer.gatewayId?.toString(),
      timerId: timer.timerId?.toString(),
      name: newName,
      status: timer.status,
      last_seen: timer.last_seen,
      online: timer.online,
    }
  }

  //通过子设备id查询该子设备的所有信息，包含通道详情列表（权限已由 Guard 验证）
  async getSubDeviceInfoByTimerId(timerId: string): Promise<SubDeviceInfoResponseDto> {
    const timer = await this.timerModel.findOne({ timerId, status: 1 }).lean()
    if (!timer) {
      throw new ForbiddenException('This device has been disabled.')
    }
    const channels = await this.channelModel.find({ timerId }).lean()
    return {
      name: timer.name,
      userId: timer.userId?.toString(),
      gatewayId: timer.gatewayId?.toString(),
      timerId: timer.timerId?.toString(),
      status: timer.status,
      online: timer.online,
      channel_count: timer.channel_count,
      firmware_version: timer.firmware_version,
      battery_level: timer.battery_level,
      signal_strength: timer.signal_strength,
      last_seen: timer.last_seen,
      last_dp_update: timer.last_dp_update,
      channels: channels.map(channel => ({
        zone_name: channel.zone_name,
        is_running: channel.is_running,
        work_state: channel.work_state,
        remaining_countdown: channel.remaining_countdown,
        irrigation_duration: channel.irrigation_duration,
        next_run_time: channel.next_run_time,
        timer_config: channel.timer_config,
        weather_skip_enabled: channel.weather_skip_enabled,
      })),
    }
  }
}
