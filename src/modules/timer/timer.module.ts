import { forwardRef, Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { TimerService } from './timer.service'
import { TimerController } from './timer.controller'
import { TimerEventsHandler } from './timer.events'
import { GatewayModule } from '../gateway/gateway.module'
import { ChannelModule } from '../channel/channel.module'
import { ProductModule } from '../product/product.module'
import { Timer, TimerSchema } from './schema/timer.schema'
import { Gateway, GatewaySchema } from '../gateway/schema/HanqiGateway.schema'
import { Channel, ChannelSchema } from '../channel/schema/channel.schema'
import { SecurityModule } from '@/common/security/security.module'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Timer.name, schema: TimerSchema },
      { name: Gateway.name, schema: GatewaySchema },
      { name: Channel.name, schema: ChannelSchema },
    ]),
    forwardRef(() => GatewayModule),
    ChannelModule,
    ProductModule,
    SecurityModule, // 显式导入安全模块
  ],
  controllers: [TimerController],
  providers: [TimerService, TimerEventsHandler],
  exports: [TimerService],
})
export class TimerModule {}
