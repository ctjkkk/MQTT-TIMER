import { Controller, Injectable } from '@nestjs/common'
import { Topic, Payload, Broker, ClientId } from '../../shared/decorators/mqtt.decorator'
import { AedesBrokerService } from '../../core/mqtt/mqtt-broker.service'
@Controller('gateway')
export class GatewayController {
  @Topic('hanqi/device/join')
  async join(@Payload() payload: Buffer, @Broker() broker: AedesBrokerService, @ClientId() clientId: string) {
    const params = JSON.parse(payload.toString())
    console.log(clientId)
    broker.publish(`hanqi/device/${params.mac}/join/response`, JSON.stringify({ status: 'success', deviceId: params.mac }))
  }
}
