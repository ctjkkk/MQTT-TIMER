import { Controller, Get, Param } from '@nestjs/common'
import { MqttSubscribe, MqttPayload, MqttBroker, MqttClientId } from '@/common/decorators/mqtt.decorator'
import { GatewayService } from './gateway.service'
import { TimerService } from '../timer/timer.service'
import { HanqiMqttTopic, MqttMessageType } from '@/shared/constants/mqtt-topic.constants'
import { isGatewayMessage, isSubDeviceMessage, parseMqttMessage } from './utils/gateway.utils'
import { ApiHeader, ApiTags } from '@nestjs/swagger'
import { ParseMacPipe } from './pipe/parse-mac.pipe'
import { ApiResponseStandard } from '@/common/decorators/api-response.decorator'
/**
 * Gateway模块的Controller
 * 职责：
 * 1. 唯一的MQTT消息入口
 * 2. 订阅所有网关的上报消息
 * 3. 根据msgType和subDeviceId分发到对应的Service
 * 4. 不处理具体业务逻辑
 */
@ApiHeader({
  name: 'x-api-key',
  description: 'Api 密钥',
  required: true,
})
@ApiTags('Gateway')
@Controller('gateway')
export class GatewayController {
  constructor(
    private readonly gatewayService: GatewayService,
    private readonly timerService: TimerService,
  ) {}

  // 核心：唯一的MQTT消息入口
  @MqttSubscribe(HanqiMqttTopic.allGatewayReport())
  async handleGatewayReport(@MqttPayload() payload: Buffer) {
    // 解析消息
    const message = parseMqttMessage(payload)
    if (!message) {
      console.warn('[GatewayController] 消息解析失败')
      return
    }
    // 网关自身的消息
    if (isGatewayMessage(message)) {
      await this.handleGatewayOwnMessage(message)
      // 子设备的消息
    } else if (isSubDeviceMessage(message)) {
      await this.handleSubDeviceMessage(message)
    }
  }

  // 网关发送http请求从云端获取该网关下所有子设备
  @Get('/sub_device_list/:mac')
  @ApiResponseStandard('获取子设备列表', '查询成功!', 200)
  async fetchGatewayAllOfSubDevice(@Param('mac', ParseMacPipe) macAddress: string) {
    return await this.gatewayService.findAllOfSubDevice(macAddress)
  }

  // 处理网关自身的消息
  private async handleGatewayOwnMessage(message: any) {
    switch (message.msgType) {
      case MqttMessageType.HEARTBEAT:
        // 心跳（网关）
        await this.gatewayService.handleHeartbeat(message)
        break
      case MqttMessageType.OPERATE_DEVICE:
        //处理网关自身的生命周期
        await this.gatewayService.handleGatewayLifecycle(message)
        break
      default:
        console.warn('[GatewayController] 未知的网关消息类型:', message.msgType)
    }
  }

  //处理子设备的消息（有 subDeviceId）
  private async handleSubDeviceMessage(message: any) {
    switch (message.msgType) {
      // ===== Timer设备相关消息 =====
      case MqttMessageType.DP_REPORT:
        // DP点数据上报 → TimerService
        await this.timerService.handleDpReport(message)
        break

      // ===== 通用消息 =====
      case MqttMessageType.EVENT_REPORT:
        // 事件上报（告警、故障等）
        await this.timerService.handleEventReport(message)
        break

      case MqttMessageType.HEARTBEAT:
        // 心跳（子设备）
        await this.timerService.handleHeartbeat(message)
        break
      case MqttMessageType.OPERATE_DEVICE:
        await this.timerService.handleLifecycle(message)
        break
      default:
        console.warn('[GatewayController] 未知的子设备消息类型:', message.msgType)
    }
  }
}
