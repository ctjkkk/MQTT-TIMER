import { forwardRef, Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { ScheduleService } from './schedule.service'
import { GatewayModule } from '../gateway/gateway.module'
import { HanqiSchedule, HanqiScheduleSchema } from './schema/schedule.schema'

@Module({
  imports: [
    MongooseModule.forFeature([{ name: HanqiSchedule.name, schema: HanqiScheduleSchema }]),
    forwardRef(() => GatewayModule),
  ],
  providers: [ScheduleService],
  exports: [ScheduleService],
})
export class ScheduleModule {}
