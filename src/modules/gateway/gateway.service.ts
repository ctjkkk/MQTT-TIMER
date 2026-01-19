import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter'
import { Model } from 'mongoose'
import { MqttBrokerService } from '@/core/mqtt/services/mqttBroker.service'
import type { MqttUnifiedMessage } from '@/shared/constants/mqtt-topic.constants'
import { MqttTopic, MqttMessageType, OperateAction } from '@/shared/constants/mqtt-topic.constants'
import { AppEvents } from '@/shared/constants/events.constants'
import { Gateway, GatewayDocument } from './schema/HanqiGateway.schema'
import { Timer, TimerDocument } from '@/modules/timer/schema/timer.schema'
import { buildGatewayMessage, buildSubDeviceMessage } from './utils/gateway.utils'
import type { GatewayStatusData } from './types/gateway.type'
import { LoggerService } from '@/core/logger/logger.service'
import { LogMessages, LogContext } from '@/shared/constants/logger.constants'

/**
 * Gateway模块的Service
 *
 * 职责：
 * 1. 处理网关MQTT消息（心跳、状态上报、生命周期）
 * 2. 管理网关的用户绑定关系（配网）
 * 3. 提供通过网关控制子设备的能力
 * 4. 发布网关业务事件供其他模块监听
 */
@Injectable()
export class GatewayService {
  constructor(
    @InjectModel(Gateway.name) private readonly gatewayModel: Model<GatewayDocument>,
    @InjectModel(Timer.name) private readonly timerModel: Model<TimerDocument>,
    @Inject(MqttBrokerService) private readonly broker: MqttBrokerService,
    private readonly logger: LoggerService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ========== MQTT 消息处理（事件监听器）==========

  /**
   * 监听网关MQTT消息事件
   * 根据消息类型分发到对应的处理方法
   */
  @OnEvent(AppEvents.MQTT_GATEWAY_MESSAGE)
  async handleGatewayMessage(message: MqttUnifiedMessage) {
    switch (message.msgType) {
      case MqttMessageType.HEARTBEAT:
        await this.handleHeartbeat(message)
        break
      case MqttMessageType.OPERATE_DEVICE:
        await this.handleGatewayLifecycle(message)
        break
      default:
        this.logger.warn(`未知的网关消息类型: ${message.msgType}`, LogContext.GATEWAY_SERVICE)
    }
  }

  /**
   * 处理网关心跳
   * 更新在线状态，检测状态变化并发布事件
   */
  private async handleHeartbeat(message: MqttUnifiedMessage) {
    const { deviceId } = message

    // 查询当前网关状态
    const gateway = await this.gatewayModel.findOne({ gatewayId: deviceId })
    if (!gateway) {
      this.logger.warn(LogMessages.GATEWAY.HEARTBEAT_UNKNOWN(deviceId), LogContext.GATEWAY_SERVICE)
      return
    }

    const wasOffline = gateway.is_connected === 0

    // 更新心跳时间和在线状态
    await this.gatewayModel.updateOne(
      { gatewayId: deviceId },
      {
        $set: {
          last_seen: new Date(),
          is_connected: 1, // 收到心跳说明在线
        },
      },
    )

    // 如果从离线变为在线，发布网关上线事件
    if (wasOffline) {
      this.logger.info(LogMessages.GATEWAY.ONLINE(deviceId), LogContext.GATEWAY_SERVICE)
      await this.eventEmitter.emitAsync(AppEvents.GATEWAY_ONLINE, {
        gatewayId: deviceId,
        timestamp: new Date(),
      })
    }
  }

  /**
   * 处理网关状态上报（WiFi信号、固件版本等）
   */
  async handleGatewayStatus(message: MqttUnifiedMessage<GatewayStatusData>) {
    const { deviceId } = message
    const { online, wifi_rssi, firmware, memory_usage, cpu_usage } = message.data

    await this.gatewayModel.updateOne(
      { gatewayId: deviceId },
      {
        $set: {
          is_connected: online ? 1 : 0,
          wifi_rssi,
          firmware_version: firmware,
          last_seen: new Date(),
        },
      },
    )

    this.logger.debug(LogMessages.GATEWAY.STATUS_UPDATED(deviceId, online), LogContext.GATEWAY_SERVICE)
  }

  /**
   * 处理网关生命周期消息（注册、重启、升级等）
   */
  private async handleGatewayLifecycle(message: MqttUnifiedMessage) {
    const { data, deviceId: gatewayId } = message
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

    // 发布网关注册事件
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

  // ========== 配网相关业务方法 ==========

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
    // 1. 检查用户是否已经绑定了其他网关（一个用户只能绑定一个网关）
    const existingGateway = await this.gatewayModel.findOne({ userId })

    if (existingGateway && existingGateway.gatewayId !== gatewayId) {
      this.logger.warn(
        `绑定失败: 用户 ${userId} 已绑定网关 ${existingGateway.gatewayId}，尝试绑定 ${gatewayId}`,
        LogContext.GATEWAY_SERVICE,
      )
      throw new BadRequestException(
        `您已绑定网关 ${existingGateway.name} (${existingGateway.gatewayId})，一个用户只能绑定一个网关，请先解绑后再绑定新网关`,
      )
    }

    // 2. 检查网关是否已注册（通过MQTT上线注册）
    const gateway = await this.gatewayModel.findOne({ gatewayId })

    if (!gateway) {
      // 网关不存在 = 从未连接过MQTT或ID错误
      this.logger.warn(
        `绑定失败: 网关 ${gatewayId} 未找到，用户: ${userId}`,
        LogContext.GATEWAY_SERVICE,
      )
      throw new NotFoundException('网关未找到，请确认设备已上线或检查网关ID是否正确')
    }

    // 3. 检查网关是否在线
    const isOnline = gateway.is_connected === 1
    const isRecentlySeen = gateway.last_seen && Date.now() - gateway.last_seen.getTime() < 60000 // 1分钟内

    if (!isOnline || !isRecentlySeen) {
      this.logger.warn(
        `绑定失败: 网关 ${gatewayId} 离线，用户: ${userId}`,
        LogContext.GATEWAY_SERVICE,
      )
      throw new BadRequestException('网关当前离线，请确保设备已连接网络后重试')
    }

    // 4. 检查是否已被其他用户绑定
    if (gateway.userId && gateway.userId.toString() !== userId) {
      this.logger.warn(
        `绑定失败: 网关 ${gatewayId} 已被其他用户绑定，用户: ${userId}`,
        LogContext.GATEWAY_SERVICE,
      )
      throw new BadRequestException('该网关已被其他用户绑定')
    }

    // 5. 检查是否已绑定到当前用户（避免重复绑定）
    if (gateway.userId && gateway.userId.toString() === userId) {
      // 只更新名称
      await this.gatewayModel.updateOne(
        { gatewayId },
        {
          $set: {
            name: gatewayName || gateway.name,
            updatedAt: new Date(),
          },
        },
      )

      this.logger.info(LogMessages.GATEWAY.BIND_UPDATE(gatewayId, userId), LogContext.GATEWAY_SERVICE)

      return {
        gatewayId,
        name: gatewayName || gateway.name,
        isOnline: true,
        message: '网关信息已更新',
      }
    }

    // 6. 绑定到用户
    await this.gatewayModel.updateOne(
      { gatewayId },
      {
        $set: {
          userId,
          name: gatewayName || `网关-${gatewayId.slice(-6)}`,
          updatedAt: new Date(),
        },
      },
    )

    this.logger.info(LogMessages.GATEWAY.BIND_SUCCESS(gatewayId, userId), LogContext.GATEWAY_SERVICE)

    return {
      gatewayId,
      name: gatewayName || `网关-${gatewayId.slice(-6)}`,
      isOnline: true,
      message: '网关绑定成功',
    }
  }

  /**
   * 获取网关状态（用于验证配网是否成功）
   */
  async getGatewayStatus(gatewayId: string) {
    const gateway = await this.gatewayModel.findOne({ gatewayId })

    if (!gateway) {
      throw new NotFoundException('网关不存在')
    }

    return {
      gatewayId: gateway.gatewayId,
      name: gateway.name,
      isOnline: gateway.is_connected === 1,
      lastSeen: gateway.last_seen,
      wifiRssi: gateway.wifi_rssi,
      firmwareVersion: gateway.firmware_version,
    }
  }

  /**
   * 验证网关是否在线（配网完成后轮询调用）
   * 返回 true 表示配网成功，网关已连接
   */
  async verifyGatewayOnline(gatewayId: string): Promise<boolean> {
    const gateway = await this.gatewayModel.findOne({ gatewayId })

    if (!gateway) {
      return false
    }

    // 检查是否在线且最后在线时间在 1 分钟内
    const isOnline = gateway.is_connected === 1
    const isRecent = gateway.last_seen && Date.now() - gateway.last_seen.getTime() < 60000

    return isOnline && isRecent
  }

  /**
   * 获取用户的所有网关列表
   */
  async getUserGateways(userId: string) {
    const gateways = await this.gatewayModel.find({ userId }).sort({ createdAt: -1 }).lean().exec()

    return gateways.map((gateway) => ({
      id: gateway._id,
      gatewayId: gateway.gatewayId,
      name: gateway.name,
      isOnline: gateway.is_connected === 1,
      lastSeen: gateway.last_seen,
      wifiRssi: gateway.wifi_rssi,
      firmwareVersion: gateway.firmware_version,
      createdAt: (gateway as any).createdAt, // timestamps 自动生成的字段
    }))
  }

  /**
   * 解绑网关
   */
  async unbindGateway(userId: string, gatewayId: string) {
    const gateway = await this.gatewayModel.findOne({ gatewayId })

    if (!gateway) {
      throw new NotFoundException('网关不存在')
    }

    if (gateway.userId?.toString() !== userId) {
      throw new BadRequestException('无权操作此网关')
    }

    // 删除网关及其子设备
    await this.gatewayModel.deleteOne({ gatewayId })
    await this.timerModel.deleteMany({ gatewayId })

    this.logger.info(LogMessages.GATEWAY.UNBIND(gatewayId, userId), LogContext.GATEWAY_SERVICE)

    return { message: '网关解绑成功' }
  }

  // ========== 子设备管理 ==========

  /**
   * 获取网关下的所有子设备
   */
  async getSubDevices(gatewayId: string): Promise<TimerDocument[]> {
    const gateway = await this.gatewayModel.findOne({ gatewayId })
    if (!gateway) {
      throw new NotFoundException('该网关不存在')
    }

    const timers = await this.timerModel.find({ gatewayId }).exec()
    return timers
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

  // ========== MQTT 命令发送 ==========

  /**
   * 向网关发送命令
   */
  async sendGatewayCommand(gatewayId: string, msgType: MqttMessageType | string, data: any): Promise<void> {
    const message = buildGatewayMessage(msgType, gatewayId, data)
    const topic = MqttTopic.gatewayCommand(gatewayId)

    this.broker.publish(topic, message)
    this.logger.debug(LogMessages.GATEWAY.COMMAND_SENT(gatewayId, msgType), LogContext.GATEWAY_SERVICE)
  }

  /**
   * 通过网关向子设备发送命令
   * 这是核心方法，其他Service通过此方法控制子设备
   */
  async sendSubDeviceCommand(
    gatewayId: string,
    subDeviceId: string,
    msgType: MqttMessageType | string,
    data: any,
  ): Promise<void> {
    const message = buildSubDeviceMessage(msgType, gatewayId, data)
    const topic = MqttTopic.gatewayCommand(gatewayId)

    this.broker.publish(topic, message)
    this.logger.debug(LogMessages.GATEWAY.SUBDEVICE_COMMAND_SENT(gatewayId, subDeviceId, msgType), LogContext.GATEWAY_SERVICE)
  }
}
