import { forwardRef, Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { GatewayController } from './gateway.controller'
import { GatewayService } from './gateway.service'
import { MqttModule } from '@/core/mqtt/mqtt.module'
import { TimerModule } from '@/modules/timer/timer.module'
import { ScheduleModule } from '@/modules/schedule/schedule.module'
import { OutletModule } from '@/modules/outlet/outlet.module'
import { HanqiGateway, HanqiGatewaySchema } from './schema/HanqiGateway.schema'
import { HanqiTimer, HanqiTimerSchema } from '@/modules/timer/schema/timer.schema'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: HanqiGateway.name, schema: HanqiGatewaySchema },
      { name: HanqiTimer.name, schema: HanqiTimerSchema },
    ]),
    MqttModule,
    forwardRef(() => TimerModule),
    forwardRef(() => ScheduleModule),
    OutletModule,
  ],
  controllers: [GatewayController],
  providers: [GatewayService],
  exports: [GatewayService],
})
export class GatewayModule {}
