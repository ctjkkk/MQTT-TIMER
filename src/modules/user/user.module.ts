import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { UserService } from './user.service'
import { UserController } from './user.controller'
import { UserCache, UserCacheSchema } from '@/core/sync/schema/user-cache.schema'
import { WeatherCache, WeatherCacheSchema } from '@/core/sync/schema/weather-cache.schema'
import { Gateway, GatewaySchema } from '@/modules/gateway/schema/HanqiGateway.schema'
import { Timer, TimerSchema } from '@/modules/timer/schema/timer.schema'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserCache.name, schema: UserCacheSchema },
      { name: WeatherCache.name, schema: WeatherCacheSchema },
      { name: Gateway.name, schema: GatewaySchema },
      { name: Timer.name, schema: TimerSchema },
    ]),
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
