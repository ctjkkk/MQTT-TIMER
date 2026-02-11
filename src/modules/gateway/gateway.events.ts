import { Injectable } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { AppEvents } from '@/shared/constants/events.constants'
import { MqttMessageType } from '@/shared/constants/topic.constants'
import type { MqttUnifiedMessage } from '@/shared/constants/topic.constants'
import { LoggerService } from '@/core/logger/logger.service'
import { LogContext } from '@/shared/constants/logger.constants'
import { GatewayService } from './gateway.service'

/**
 * Gateway事件处理器
 *
 * 职责：
 * - 监听MQTT事件和系统事件
 * - 将事件分发到Service的对应业务方法
 * - 不包含业务逻辑，只负责事件路由
 *
 * 设计理念：
 * - Controller: 处理HTTP请求 + MQTT订阅（入口层）
 * - EventsHandler: 监听事件，调用Service（事件处理层）
 * - Service: 纯业务逻辑，不监听事件（业务逻辑层）
 */
@Injectable()
export class GatewayEventsHandler {
  constructor(
    private readonly gatewayService: GatewayService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * 监听网关MQTT消息事件
   * 根据消息类型分发到Service的对应方法
   */
  @OnEvent(AppEvents.MQTT_GATEWAY_MESSAGE)
  async handleGatewayMessage(message: MqttUnifiedMessage) {
    switch (message.msgType) {
      case MqttMessageType.HEARTBEAT:
        await this.gatewayService.processHeartbeat(message)
        break
      case MqttMessageType.OPERATE_DEVICE:
        await this.gatewayService.processGatewayLifecycle(message)
        break
      default:
        this.logger.warn(`未知的网关消息类型: ${message.msgType}`, LogContext.GATEWAY_SERVICE)
    }
  }

  /**
   * 监听网关离线事件
   * 当网关MQTT连接断开时触发
   */
  @OnEvent(AppEvents.GATEWAY_OFFLINE)
  async handleGatewayOffline(payload: { gatewayId: string; clientId: string; timestamp: Date }) {
    this.logger.info(`收到网关离线事件: ${payload.gatewayId}`, LogContext.GATEWAY_SERVICE)
    await this.gatewayService.markGatewayOffline(payload.gatewayId, payload.timestamp)
  }

  /**
   * 监听网关注册事件（预留扩展点）
   * 可以在这里添加注册后的业务逻辑，比如：
   * - 发送通知给管理员
   * - 记录审计日志
   * - 触发其他业务流程
   */
  @OnEvent(AppEvents.GATEWAY_REGISTERED)
  async handleGatewayRegistered(payload: { gatewayId: string; timestamp: Date }) {
    this.logger.info(`收到网关注册事件: ${payload.gatewayId}`, LogContext.GATEWAY_SERVICE)
    // 预留扩展点
    // 例如：
    // - await this.notificationService.notifyAdminNewGateway(payload.gatewayId)
    // - await this.auditService.logGatewayRegistration(payload)
  }
}
