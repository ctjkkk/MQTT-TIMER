import { forwardRef, Module } from '@nestjs/common'
import { ScheduleService } from './schedule.service'
import { GatewayModule } from '../gateway/gateway.module'

@Module({
  imports: [forwardRef(() => GatewayModule)],
  providers: [ScheduleService],
  exports: [ScheduleService],
})
export class ScheduleModule {}
