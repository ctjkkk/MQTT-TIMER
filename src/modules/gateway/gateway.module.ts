import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { JwtModule } from '@nestjs/jwt'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { GatewayController } from './gateway.controller'
import { GatewayService } from './gateway.service'
import { MqttModule } from '@/core/mqtt/mqtt.module'
import { UserModule } from '@/modules/user/user.module'
import { Gateway, GatewaySchema } from './schema/HanqiGateway.schema'
import { Timer, TimerSchema } from '@/modules/timer/schema/timer.schema'
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Gateway.name, schema: GatewaySchema },
      { name: Timer.name, schema: TimerSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
    MqttModule,
    UserModule,
    // ✅ 使用事件驱动后，不再需要导入 TimerModule 和 ScheduleModule
    // ✅ 消除了循环依赖问题
  ],
  controllers: [GatewayController],
  providers: [GatewayService],
  exports: [GatewayService],
})
export class GatewayModule {}
