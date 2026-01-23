import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { JwtModule } from '@nestjs/jwt'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { GatewayController } from './gateway.controller'
import { GatewayService } from './gateway.service'
import { GatewayEventsHandler } from './gateway.events'
import { GatewayMqttHandler } from './gateway.mqtt'
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
        signOptions: { expiresIn: '365d' },
      }),
      inject: [ConfigService],
    }),
    MqttModule,
    UserModule,
  ],
  controllers: [GatewayController],
  providers: [
    GatewayService,
    GatewayEventsHandler, // 事件处理器
    GatewayMqttHandler, // MQTT消息入口
  ],
  exports: [GatewayService],
})
export class GatewayModule {}
