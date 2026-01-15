import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { MqttSubscribe, MqttPayload } from '@/common/decorators/mqtt.decorator'
import { GatewayService } from './gateway.service'
import { MqttTopic } from '@/shared/constants/mqtt-topic.constants'
import { AppEvents } from '@/shared/constants/events.constants'
import { isGatewayMessage, isSubDeviceMessage, parseMqttMessage } from './utils/gateway.utils'
import { ApiHeader, ApiTags } from '@nestjs/swagger'
import { LoggerService } from '@/core/logger/logger.service'
import { ApiResponseStandard } from '@/common/decorators/apiResponse.decorator'
import { UserService } from './../user/user.service'
import { LogMessages } from '@/shared/constants/log-messages.constants'

/**
 * Gateway模块的Controller
 * 职责：
 * 1. 唯一的MQTT消息入口
 * 2. 订阅所有网关的上报消息
 * 3. 使用事件驱动模式发布消息，解耦模块间依赖
 * 4. 不处理具体业务逻辑
 */
@ApiHeader({
  name: 'authorization',
  description: 'JWT认证token',
  required: true,
})
@ApiTags('Gateway')
@Controller('gateway')
export class GatewayController {
  constructor(
    private readonly userService: UserService,
    private readonly eventEmitter: EventEmitter2,
    private readonly loggerService: LoggerService,
  ) {}

  // 唯一的MQTT消息入口
  @MqttSubscribe(MqttTopic.allGatewayReport())
  async handleGatewayReport(@MqttPayload() payload: Buffer) {
    const message = parseMqttMessage(payload)
    if (!message) {
      this.loggerService.error(LogMessages.MQTT.PARSE_ERROR('payload parsed error'), 'MQTT-report')
      return
    }
    isGatewayMessage(message) && (await this.eventEmitter.emitAsync(AppEvents.MQTT_GATEWAY_MESSAGE, message))
    isSubDeviceMessage(message) && (await this.eventEmitter.emitAsync(AppEvents.MQTT_SUBDEVICE_MESSAGE, message))
  }

  // 测试接口：需要JWT认证才能访问
  @Get('/test/protected')
  @ApiResponseStandard('测试受保护的接口', '请求成功', 200)
  async testProtectedEndpoint(@Request() req: any) {
    return await this.userService.findOne(req.user.id)
  }
}
