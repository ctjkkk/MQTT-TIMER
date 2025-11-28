import { forwardRef, Module } from '@nestjs/common'
import { TimerService } from './timer.service'
import { GatewayModule } from '../gateway/gateway.module'
import { OutletModule } from '../outlet/outlet.module'

@Module({
  imports: [forwardRef(() => GatewayModule), OutletModule],
  providers: [TimerService],
  exports: [TimerService],
})
export class TimerModule {}
