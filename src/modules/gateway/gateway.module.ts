import { forwardRef, Module } from '@nestjs/common'
import { GatewayController } from './gateway.controller'
import { GatewayService } from './gateway.service'
import { MqttModule } from '@/core/mqtt/mqtt.module'
import { TimerModule } from '@/modules/timer/timer.module'
import { ScheduleModule } from '@/modules/schedule/schedule.module'
import { OutletModule } from '@/modules/outlet/outlet.module'
@Module({
  imports: [MqttModule, forwardRef(() => TimerModule), forwardRef(() => ScheduleModule), OutletModule],
  controllers: [GatewayController],
  providers: [GatewayService],
  exports: [GatewayService],
})
export class GatewayModule {}
