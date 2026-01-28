import { forwardRef, Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { TimerService } from './timer.service'
import { TimerController } from './timer.controller'
import { TimerEventsHandler } from './timer.events'
import { GatewayModule } from '../gateway/gateway.module'
import { OutletModule } from '../outlet/outlet.module'
import { Timer, TimerSchema } from './schema/timer.schema'
import { Gateway, GatewaySchema } from '../gateway/schema/HanqiGateway.schema'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Timer.name, schema: TimerSchema },
      { name: Gateway.name, schema: GatewaySchema },  // 导入 Gateway Model
    ]),
    forwardRef(() => GatewayModule),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: '365d' },
      }),
      inject: [ConfigService],
    }),
    OutletModule,
  ],
  controllers: [TimerController],
  providers: [
    TimerService,
    TimerEventsHandler, // 事件处理器
  ],
  exports: [TimerService],
})
export class TimerModule {}
