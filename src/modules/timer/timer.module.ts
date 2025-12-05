import { forwardRef, Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { TimerService } from './timer.service'
import { GatewayModule } from '../gateway/gateway.module'
import { OutletModule } from '../outlet/outlet.module'
import { HanqiTimer, HanqiTimerSchema } from './schema/timer.schema'

@Module({
  imports: [
    MongooseModule.forFeature([{ name: HanqiTimer.name, schema: HanqiTimerSchema }]),
    forwardRef(() => GatewayModule),
    OutletModule,
  ],
  providers: [TimerService],
  exports: [TimerService],
})
export class TimerModule {}
