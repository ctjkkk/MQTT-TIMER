import { Injectable } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { AppEvents } from '@/shared/constants/events.constants'
import { MqttMessageType } from '@/shared/constants/mqtt-topic.constants'
import type { MqttUnifiedMessage } from '@/shared/constants/mqtt-topic.constants'
import { LoggerService } from '@/core/logger/logger.service'
import { LogContext } from '@/shared/constants/logger.constants'
import { TimerService } from './timer.service'

/**
 * Timer事件处理器
 *
 * 职责：
 * - 监听子设备MQTT消息事件
 * - 将事件分发到Service的对应业务方法
 * - 不包含业务逻辑，只负责事件路由
 *
 * 设计理念：
 * - Controller: 处理HTTP请求（入口层）
 * - EventsHandler: 监听事件，调用Service（事件处理层）
 * - Service: 纯业务逻辑，不监听事件（业务逻辑层）
 */
@Injectable()
export class TimerEventsHandler {
  constructor(
    private readonly timerService: TimerService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * 监听子设备MQTT上报消息事件
   * 根据消息类型分发到Service的对应方法
   */
  @OnEvent(AppEvents.MQTT_SUBDEVICE_MESSAGE)
  async handleSubDeviceMessage(message: MqttUnifiedMessage) {
    this.logger.debug(`收到子设备MQTT消息: ${message.deviceId}, 类型: ${message.msgType}`, LogContext.TIMER_SERVICE)
    console.log('分发到了子设备MQTT消息:', message)
    switch (message.msgType) {
      case MqttMessageType.DP_REPORT:
        // DP点数据上报
        await this.timerService.handleDpReport(message)
        break
      case MqttMessageType.HEARTBEAT:
        // 上报心跳（子设备）
        await this.timerService.handleHeartbeat(message)
        break
      case MqttMessageType.OPERATE_DEVICE:
        // 上报子设备生命周期操作（添加、删除、更新）
        await this.timerService.handleOperateDevice(message)
        break
      case MqttMessageType.DEVICE_STATUS:
        // 批量上报子设备状态
        await this.timerService.handleDeviceStatus(message)
        break
      default:
        this.logger.warn(`未知的子设备消息类型: ${message.msgType}`, LogContext.TIMER_SERVICE)
    }
  }
}
