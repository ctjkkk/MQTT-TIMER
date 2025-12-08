import { forwardRef, Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { TimerService } from './timer.service'
import { GatewayModule } from '../gateway/gateway.module'
import { OutletModule } from '../outlet/outlet.module'
import { Timer, TimerSchema } from './schema/timer.schema'

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Timer.name, schema: TimerSchema }]),
    forwardRef(() => GatewayModule),
    OutletModule,
  ],
  providers: [TimerService],
  exports: [TimerService],
})
export class TimerModule {}
