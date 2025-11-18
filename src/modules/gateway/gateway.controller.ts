import { Controller } from '@nestjs/common'
import { Topic, Payload, Broker, ClientId } from '@/shared/decorators/mqtt.decorator'
import { AedesBrokerService } from '@/core/mqtt/mqtt-broker.service'
import { GatewayService } from './gateway.service'
@Controller('gateway')
export class GatewayController {
  constructor(private readonly gatewayService: GatewayService) {}
  @Topic('hanqi/device/join')
  async join(@Payload() payload: Buffer, @Broker() broker: AedesBrokerService, @ClientId() clientId: string) {
    const params = JSON.parse(payload.toString())
    const res = await this.gatewayService.findUserByMacAddress(params.mac)
    res && broker.publish(`hanqi/device/${params.mac}/join/response`, { status: 'success', deviceId: params.mac, user: res })
  }

  @Topic('hanqi/device/disconnect')
  async disconnect(@Payload() payload: Buffer, @Broker() broker: AedesBrokerService) {
    const params = JSON.parse(payload.toString())
    const res = await this.gatewayService.disconnectDevice(params.mac)
    if (res) {
      broker.publish(`hanqi/device/${params.mac}/disconnect/response`, {
        status: 'Connection disconnected successfully',
        deviceId: params.mac,
      })
    }
  }
}
