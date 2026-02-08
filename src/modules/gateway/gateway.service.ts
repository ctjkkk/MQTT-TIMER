import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { Model } from 'mongoose'
import { CommandSenderService } from '@/core/mqtt/services/commandSender.service'
import type { MqttUnifiedMessage } from '@/shared/constants/topic.constants'
import { OperateAction } from '@/shared/constants/topic.constants'
import { AppEvents } from '@/shared/constants/events.constants'
import { Gateway, GatewayDocument } from './schema/HanqiGateway.schema'
import { Timer, TimerDocument } from '@/modules/timer/schema/timer.schema'
import type { GatewayStatusData } from './types/gateway.type'
import { LoggerService } from '@/core/logger/logger.service'
import { LogMessages, LogContext } from '@/shared/constants/logger.constants'
import type { IGatewayServiceInterface } from './interfaces/gateway-service.interface'
import { SubDeviceListResponseDto } from '../timer/dto/timer.response.dto'
@Injectable()
export class GatewayService implements IGatewayServiceInterface {
  constructor(
    @InjectModel(Gateway.name) private readonly gatewayModel: Model<GatewayDocument>,
    @InjectModel(Timer.name) private readonly timerModel: Model<TimerDocument>,
    @Inject(CommandSenderService) private readonly commandSenderService: CommandSenderService,
    private readonly logger: LoggerService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ============ MQTT消息处理方法（被EventsHandler调用）============

  /**
   * 处理网关心跳
   * 更新在线状态，检测状态变化并发布事件
   * 返回心跳响应，携带绑定状态
   * 调用者：GatewayEventsHandler.handleGatewayMessage
   */
  async processHeartbeat(message: MqttUnifiedMessage) {
    const { uuid } = message
    const gateway = await this.gatewayModel.findOne({ gatewayId: uuid })
    if (!gateway) {
      this.logger.warn(LogMessages.GATEWAY.HEARTBEAT_UNKNOWN(uuid), LogContext.GATEWAY_SERVICE)
      return
    }
    const wasOffline = gateway.is_connected === 0
    const isBound = gateway.userId !== null && gateway.userId !== undefined
    await this.gatewayModel.updateOne(
      { gatewayId: uuid },
      {
        $set: {
          last_seen: new Date(),
          is_connected: 1, // 收到心跳说明在线
        },
      },
    )
    // 下发心跳响应给网关
    this.commandSenderService.sendHeartbeatResponse(uuid, isBound, gateway.userId.toString())
    // 如果从离线变为在线，发布网关上线事件
    if (wasOffline) {
      this.logger.info(LogMessages.GATEWAY.ONLINE(uuid), LogContext.GATEWAY_SERVICE)
      await this.eventEmitter.emitAsync(AppEvents.GATEWAY_ONLINE, {
        gatewayId: uuid,
        timestamp: new Date(),
      })
      // 如果上线时发现未绑定，额外记录警告日志
      if (!isBound) {
        this.logger.warn(LogMessages.GATEWAY.ONLINE_UNBOUND(uuid), LogContext.GATEWAY_SERVICE)
      }
    }
  }

  /**
   * 处理网关状态上报（WiFi信号、固件版本等）
   */
  async handleGatewayStatus(message: MqttUnifiedMessage<GatewayStatusData>) {
    const { uuid } = message
    const { online, wifi_rssi, firmware, memory_usage, cpu_usage } = message.data

    await this.gatewayModel.updateOne(
      { gatewayId: uuid },
      {
        $set: {
          is_connected: online ? 1 : 0,
          wifi_rssi,
          firmware_version: firmware,
          last_seen: new Date(),
        },
      },
    )

    this.logger.debug(LogMessages.GATEWAY.STATUS_UPDATED(uuid, online), LogContext.GATEWAY_SERVICE)
  }

  /**
   * 处理网关生命周期消息（注册、重启、升级等）
   * 调用者：GatewayEventsHandler.handleGatewayMessage
   */
  async processGatewayLifecycle(message: MqttUnifiedMessage) {
    const { data, uuid: gatewayId } = message
    const { action } = data
    // 使用 Map 实现策略模式
    const actionHandlers = new Map<OperateAction, () => Promise<void>>([
      [OperateAction.GATEWAY_REGISTER, () => this.handleGatewayRegister(gatewayId, data)],
      [OperateAction.GATEWAY_REBOOT, () => this.handleGatewayReboot(gatewayId, data)],
    ])

    const handler = actionHandlers.get(action)
    if (!handler) {
      this.logger.warn(LogMessages.GATEWAY.UNHANDLED_OPERATION(action), LogContext.GATEWAY_SERVICE)
      return
    }

    await handler()
  }

  /**
   * 处理网关注册（首次连接）
   * 网关通过MQTT连接后自动注册，创建未绑定用户的网关记录
   * 用户后续通过 bindGatewayToUser 接口绑定网关
   */
  private async handleGatewayRegister(gatewayId: string, data: any) {
    this.logger.info(LogMessages.GATEWAY.REGISTERED(gatewayId), LogContext.GATEWAY_SERVICE)
    // 检查网关是否已存在
    const existingGateway = await this.gatewayModel.findOne({ gatewayId })
    if (!existingGateway) {
      // 创建未绑定用户的网关记录
      await this.gatewayModel.create({
        gatewayId,
        userId: null, // 未绑定用户
        name: `网关-${gatewayId.slice(-6)}`, // 默认名称
        is_connected: 1, // 在线
        createdAt: new Date(),
        last_seen: new Date(),
      })
      this.logger.info(`网关 ${gatewayId} 已注册，等待用户绑定`, LogContext.GATEWAY_SERVICE)
    } else {
      // 网关已存在，只更新在线状态
      await this.gatewayModel.updateOne(
        { gatewayId },
        {
          $set: {
            is_connected: 1,
            last_seen: new Date(),
          },
        },
      )
      this.logger.info(`网关 ${gatewayId} 重新上线`, LogContext.GATEWAY_SERVICE)
    }
    // 发布网关注册事件(为以后统计分析模块、通知模块等做准备)
    await this.eventEmitter.emitAsync(AppEvents.GATEWAY_REGISTERED, {
      gatewayId,
      timestamp: new Date(),
    })
  }

  /**
   * 处理网关重启
   */
  private async handleGatewayReboot(gatewayId: string, data: any) {
    this.logger.info(LogMessages.GATEWAY.REBOOT(gatewayId), LogContext.GATEWAY_SERVICE)
    // TODO: 记录重启日志
  }

  /**
   * 标记网关为离线状态
   * 当网关MQTT连接断开时调用
   *
   * 调用者：GatewayEventsHandler.handleGatewayOffline
   */
  async markGatewayOffline(gatewayId: string, timestamp: Date) {
    // 更新数据库中的网关状态为离线
    const result = await this.gatewayModel.updateOne(
      { gatewayId },
      {
        $set: {
          is_connected: 0,
          last_seen: timestamp,
        },
      },
    )

    if (result.modifiedCount > 0) {
      this.logger.info(`网关 ${gatewayId} 状态已更新为离线`, LogContext.GATEWAY_SERVICE)
    } else {
      this.logger.warn(`网关 ${gatewayId} 不存在或状态未改变`, LogContext.GATEWAY_SERVICE)
    }
  }

  // ============ HTTP接口方法（被Controller调用）============

  /**
   * 绑定网关到用户账号（严格模式）
   * 配网流程：App蓝牙配置WiFi → 网关MQTT上线并注册 → 调用此接口绑定
   *
   * 安全策略：
   * 1. 网关必须先通过MQTT连接并注册后才能被绑定
   * 2. 防止用户绑定虚假或不存在的网关ID
   * 3. 确保网关在线才能绑定
   */
  async bindGatewayToUser(userId: string, gatewayId: string, gatewayName?: string) {
    // 检查用户是否已经绑定了其他网关（一个用户只能绑定一个网关）
    const existingGateway = await this.gatewayModel.findOne({ userId })
    if (existingGateway && existingGateway.gatewayId !== gatewayId) {
      this.logger.warn(
        `绑定失败: 用户 ${userId} 已绑定网关 ${existingGateway.gatewayId}，尝试绑定 ${gatewayId}`,
        LogContext.GATEWAY_SERVICE,
      )
      throw new BadRequestException(
        `You have already bound the gateway ${existingGateway.name} (${existingGateway.gatewayId}). Each user can only bind one gateway. Please unbind the current gateway before binding the new one.`,
      )
    }
    // 检查网关是否已注册（通过MQTT上线注册）
    const gateway = await this.gatewayModel.findOne({ gatewayId })
    if (!gateway) {
      // 网关不存在 = 从未连接过MQTT或ID错误
      this.logger.warn(`绑定失败: 网关 ${gatewayId} 未找到，用户: ${userId}`, LogContext.GATEWAY_SERVICE)
      throw new NotFoundException('Gateway not found. Please confirm that the device is online or check if the gateway ID is correct.')
    }
    //  检查网关是否在线
    const isOnline = gateway.is_connected === 1
    const isRecentlySeen = gateway.last_seen && Date.now() - gateway.last_seen.getTime() < 60000
    if (!isOnline || !isRecentlySeen) {
      this.logger.warn(`绑定失败: 网关 ${gatewayId} 离线，用户: ${userId}`, LogContext.GATEWAY_SERVICE)
      throw new BadRequestException(
        'The gateway is currently offline. Please ensure that the device is connected to the network and try again.',
      )
    }
    // 检查是否已被其他用户绑定
    if (gateway.userId && gateway.userId.toString() !== userId) {
      this.logger.warn(`绑定失败: 网关 ${gatewayId} 已被其他用户绑定，用户: ${userId}`, LogContext.GATEWAY_SERVICE)
      throw new BadRequestException('This gateway has been bound by other users.')
    }
    // 检查是否已绑定到当前用户（避免重复绑定）
    if (gateway.userId && gateway.userId.toString() === userId) {
      // 只更新名称
      await this.gatewayModel.updateOne(
        { gatewayId },
        {
          $set: {
            name: gatewayName ?? gateway.name,
            updatedAt: new Date(),
          },
        },
      )
      this.logger.info(LogMessages.GATEWAY.BIND_UPDATE(gatewayId, userId), LogContext.GATEWAY_SERVICE)
      return {
        gatewayId,
        name: gatewayName ?? gateway.name,
        isOnline: true,
        message: 'Gateway information has been updated.',
      }
    }
    //  绑定到用户
    await this.gatewayModel.updateOne(
      { gatewayId },
      {
        $set: {
          userId,
          name: gatewayName || `gateway-${gatewayId.slice(-6)}`,
          updatedAt: new Date(),
        },
      },
    )
    this.logger.info(LogMessages.GATEWAY.BIND_SUCCESS(gatewayId, userId), LogContext.GATEWAY_SERVICE)
    return {
      gatewayId,
      name: gatewayName || `gateway-${gatewayId.slice(-6)}`,
      isOnline: true,
      message: 'Gateway binding successful',
    }
  }

  /**
   * 获取网关状态（用于验证配网是否成功）
   */
  async getGatewayStatus(gatewayId: string, userId: string) {
    const gateway = await this.gatewayModel.findOne({ gatewayId })
    if (!gateway) throw new NotFoundException('The gateway does not exist.')

    if (!gateway.userId || gateway.userId.toString() !== userId)
      throw new BadRequestException('You have no right to view the status of this gateway.')
    return {
      gatewayId: gateway.gatewayId,
      name: gateway.name,
      isOnline: gateway.is_connected === 1,
      isBind: gateway.userId !== null && gateway.userId !== undefined,
      lastSeen: gateway.last_seen,
      wifiRssi: gateway.wifi_rssi,
      firmwareVersion: gateway.firmware_version,
    }
  }

  /**
   * 验证网关是否在线（配网完成后轮询调用）
   * 返回 true 表示配网成功，网关已连接
   * 真正在线: 连接标志为在线 && 最近1分钟内有心跳
   */
  async verifyGatewayOnline(gatewayId: string): Promise<boolean> {
    const gateway = await this.gatewayModel.findOne({ gatewayId })
    if (!gateway) return false
    // 检查是否在线且最后在线时间在 1 分钟内
    const isOnline = gateway.is_connected === 1
    const isRecent = gateway.last_seen && Date.now() - gateway.last_seen.getTime() < 60000
    return isOnline && isRecent
  }

  /**
   * 验证网关状态（配网流程专用）
   *
   * 用于前端智能判断：
   * - 检查网关是否在线
   * - 检查网关是否已绑定用户
   * - 返回绑定的用户ID（如果已绑定）
   *
   * @param gatewayId 网关ID
   * @returns 网关状态信息
   */
  async verifyGatewayForPairing(gatewayId: string) {
    const gateway = await this.gatewayModel.findOne({ gatewayId })
    if (!gateway) {
      // 网关不存在
      return {
        exists: false,
        isOnline: false,
        isBound: false,
        userId: null,
        name: null,
      }
    }
    // 检查是否在线（连接标志为在线 && 最近1分钟内有心跳）
    const isOnline = gateway.is_connected === 1
    const isRecent = gateway.last_seen && Date.now() - gateway.last_seen.getTime() < 60000
    // 检查是否已绑定用户
    const isBound = gateway.userId !== null && gateway.userId !== undefined
    return {
      exists: true,
      isOnline: isOnline && isRecent,
      isBound: isBound,
      userId: isBound ? gateway.userId.toString() : null,
      name: gateway.name,
    }
  }

  /**
   * 通知网关处理启动子设备配网请求
   */
  async startSubDevicePairing(userId: string, gatewayId: string): Promise<void> {
    const gateway = await this.gatewayModel.findOne({ gatewayId })
    if (!gateway) throw new NotFoundException('The gateway does not exist.')
    if (gateway.userId?.toString() !== userId) throw new BadRequestException('You do not have the authority to operate this gateway.')
    // 发送MQTT命令让网关进入子设备配对模式
    this.commandSenderService.sendStartPairingCommand(gatewayId)
  }

  /**
   * 通知网关处理停止子设备配网请求
   */
  async stopSubDevicePairing(userId: string, gatewayId: string): Promise<void> {
    const gateway = await this.gatewayModel.findOne({ gatewayId })
    if (!gateway) throw new NotFoundException('The gateway does not exist.')
    if (gateway.userId?.toString() !== userId) throw new BadRequestException('You do not have the authority to operate this gateway.')
    this.commandSenderService.sendStopPairingCommand(gatewayId, 'manual')
  }
  /**
   * 解绑网关
   */
  async unbindGateway(userId: string, gatewayId: string) {
    const gateway = await this.gatewayModel.findOne({ gatewayId })
    if (!gateway) throw new NotFoundException('The gateway does not exist.')
    if (gateway.userId?.toString() !== userId) throw new BadRequestException('You do not have the authority to operate this gateway.')
    // 只解绑用户，保留网关和子设备
    await this.gatewayModel.updateOne({ gatewayId }, { $set: { userId: null } })
    this.logger.info(LogMessages.GATEWAY.UNBIND(gatewayId, userId), LogContext.GATEWAY_SERVICE)
    return { message: 'Gateway unbinding successful' }
  }

  /**
   * 获取网关下的所有子设备
   */
  async getSubDevices(gatewayId: string, userId: string): Promise<SubDeviceListResponseDto[]> {
    const gateway = await this.gatewayModel.findOne({ gatewayId })
    if (!gateway) throw new NotFoundException('This gateway does not exist.')
    if (!gateway.userId || gateway.userId.toString() !== userId)
      throw new BadRequestException('You have no right to view the sub-devices under this gateway.')
    const timers = await this.timerModel.find({ gatewayId }).lean()

    return timers.map(timer => ({
      userId: timer.userId?.toString(),
      gatewayId: timer.gatewayId?.toString(),
      timerId: timer.timerId?.toString(),
      name: timer.name,
      status: timer.status,
      last_seen: timer.last_seen,
      online: timer.online,
    }))
  }
}
