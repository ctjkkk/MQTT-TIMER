import { forwardRef, Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { TimerService } from './timer.service'
import { TimerController } from './timer.controller'
import { TimerEventsHandler } from './timer.events'
import { GatewayModule } from '../gateway/gateway.module'
import { OutletModule } from '../outlet/outlet.module'
import { ProductModule } from '../product/product.module' // ← 新增：导入产品模块
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
    ProductModule, // ← 新增：导入产品模块，以便 TimerService 可以使用 ProductService
  ],
  controllers: [TimerController],
  providers: [
    TimerService,
    TimerEventsHandler, // 事件处理器
  ],
  exports: [TimerService],
})
export class TimerModule {}
