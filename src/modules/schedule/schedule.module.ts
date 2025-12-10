import { forwardRef, Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { ScheduleService } from './schedule.service'
import { GatewayModule } from '../gateway/gateway.module'
import { Schedule, ScheduleSchema } from './schema/schedule.schema'

@Module({
  imports: [MongooseModule.forFeature([{ name: Schedule.name, schema: ScheduleSchema }]), forwardRef(() => GatewayModule)],
  providers: [ScheduleService],
  exports: [ScheduleService],
})
export class ScheduleModule {}
