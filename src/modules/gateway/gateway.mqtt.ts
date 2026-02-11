import { Injectable } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { MqttSubscribe, MqttPayload } from '@/common/decorators/mqtt.decorator'
import { MqttTopic } from '@/shared/constants/topic.constants'
import { AppEvents } from '@/shared/constants/events.constants'
import { LoggerService } from '@/core/logger/logger.service'
import { LogMessages, LogContext } from '@/shared/constants/logger.constants'
import { parseMqttMessage, isGatewayMessage, isSubDeviceMessage } from './utils/gateway.utils'

/**
 * Gateway MQTT消息入口
 *
 * 职责：
 * - 订阅MQTT topic，接收网关和子设备的消息
 * - 解析和验证MQTT消息格式
 * - 将消息转换为系统事件并发布
 * - 不包含业务逻辑，只负责消息的接收和分发
 *
 * 设计理念：
 * - 这是MQTT消息的唯一入口
 * - 解析成功后发布事件，由EventsHandler处理
 * - 解耦MQTT协议和业务逻辑
 */
@Injectable()
export class GatewayMqttHandler {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {}

  /**
   * 订阅所有网关上报的消息
   * Topic格式: soildrop/gateway/+/report
   *
   * 消息来源：
   * 1. 网关心跳消息
   * 2. 网关生命周期消息（注册、重启等）
   * 3. 子设备消息（通过网关转发）
   */
  @MqttSubscribe(MqttTopic.allGatewayReport())
  async handleGatewayReport(@MqttPayload() payload: Buffer) {
    // 解析MQTT消息
    const message = parseMqttMessage(payload)
    if (!message) {
      this.logger.error(LogMessages.MQTT.PARSE_ERROR('payload parsed error'), LogContext.GATEWAY_SERVICE)
      return
    }
    this.logger.debug(`收到MQTT消息: ${message.uuid}, 类型: ${message.msgType}`, LogContext.GATEWAY_SERVICE)
    // 根据消息类型发布不同的事件
    isGatewayMessage(message) && (await this.eventEmitter.emitAsync(AppEvents.MQTT_GATEWAY_MESSAGE, message))
    isSubDeviceMessage(message) && (await this.eventEmitter.emitAsync(AppEvents.MQTT_SUBDEVICE_MESSAGE, message))
  }
}
