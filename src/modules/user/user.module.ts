import { Module } from '@nestjs/common'
import { UserService } from './user.service'
import { UserController } from './user.controller'
import { UserCache, UserCacheSchema } from '@/core/sync/schema/user-cache.schema'
import { WeatherCache, WeatherCacheSchema } from '@/core/sync/schema/weather-cache.schema'
import { Gateway, GatewaySchema } from '@/modules/gateway/schema/HanqiGateway.schema'
import { Timer, TimerSchema } from '@/modules/timer/schema/timer.schema'
import { MongooseModule } from '@nestjs/mongoose'
import { JwtModule } from '@nestjs/jwt'
import { ConfigModule, ConfigService } from '@nestjs/config'
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserCache.name, schema: UserCacheSchema },
      { name: WeatherCache.name, schema: WeatherCacheSchema },
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
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
