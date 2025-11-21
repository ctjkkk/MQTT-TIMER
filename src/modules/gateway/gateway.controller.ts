import { Controller } from '@nestjs/common'
import { MqttSubscribe, MqttPayload, MqttBroker, MqttClientId } from '@/shared/decorators/mqtt.decorator'
import { AedesBrokerService } from '@/core/mqtt/mqtt-broker.service'
import { GatewayService } from './gateway.service'
import { HanqiMqttTopic, MqttMessageType, parseMqttMessage } from '@/shared/constants/hanqi-mqtt-topic.constants'

/**
 * Gateway模块的Controller
 * 负责订阅MQTT Topic并路由到Service
 */
@Controller('gateway')
export class GatewayController {
  constructor(private readonly gatewayService: GatewayService) {}

  /**
   * 处理设备加入请求
   */
  @MqttSubscribe('hanqi/device/join')
  async join(@MqttPayload() payload: Buffer, @MqttBroker() broker: AedesBrokerService, @MqttClientId() clientId: string) {
    console.log('[Gateway] 收到设备加入请求，客户端:', clientId)

    const params = JSON.parse(payload.toString())
    const res = await this.gatewayService.findUserByMacAddress(params.mac)

    if (res) {
      broker.publish(`hanqi/device/${params.mac}/join/response`, {
        status: 'success',
        deviceId: params.mac,
        user: res,
      })
      console.log('[Gateway] 加入响应已发送')
    }
  }

  /**
   * 处理设备断开请求
   */
  @MqttSubscribe('hanqi/device/disconnect')
  async disconnect(@MqttPayload() payload: Buffer, @MqttBroker() broker: AedesBrokerService, @MqttClientId() clientId: string) {
    console.log('[Gateway] 收到设备断开请求，客户端:', clientId)

    const params = JSON.parse(payload.toString())
    const res = await this.gatewayService.disconnectDevice(params.mac)

    if (res) {
      broker.publish(`hanqi/device/${params.mac}/disconnect/response`, {
        status: 'Connection disconnected successfully',
        deviceId: params.mac,
      })
      console.log('[Gateway] 断开响应已发送')
    }
  }

  /**
   * 订阅所有网关的数据上报
   * 只处理Gateway模块关心的消息类型
   */
  @MqttSubscribe(HanqiMqttTopic.allGatewayReport())
  async handleGatewayReport(@MqttPayload() payload: Buffer) {
    const message = parseMqttMessage(payload)
    if (!message) return

    // 根据msgType路由到对应的Service方法
    switch (message.msgType) {
      case MqttMessageType.SUB_DEVICES:
        await this.gatewayService.handleSubDevices(message)
        break

      case MqttMessageType.DEVICE_STATUS:
        await this.gatewayService.handleGatewayStatus(message)
        break

      // 其他msgType由其他模块处理
    }
  }
}
