import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { GatewayController } from './gateway.controller'
import { GatewayService } from './gateway.service'
import { GatewayEventsHandler } from './gateway.events'
import { GatewayMqttHandler } from './gateway.mqtt'
import { MqttModule } from '@/core/mqtt/mqtt.module'
import { UserModule } from '@/modules/user/user.module'
import { Gateway, GatewaySchema } from './schema/HanqiGateway.schema'
import { Timer, TimerSchema } from '@/modules/timer/schema/timer.schema'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Gateway.name, schema: GatewaySchema },
      { name: Timer.name, schema: TimerSchema },
    ]),
    MqttModule,
    UserModule,
  ],
  controllers: [GatewayController],
  providers: [
    GatewayService,
    GatewayEventsHandler,
    GatewayMqttHandler,
  ],
  exports: [GatewayService],
})
export class GatewayModule {}
