import { Module } from '@nestjs/common'
import { GatewayController } from './gateway.controller'
import { GatewayService } from './gateway.service'
import { MqttModule } from '@/core/mqtt/mqtt.module'
@Module({
  imports: [MqttModule],
  controllers: [GatewayController],
  providers: [GatewayService],
})
export class GatewayModule {}
