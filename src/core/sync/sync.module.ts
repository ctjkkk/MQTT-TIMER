import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { RabbitmqModule } from '@/core/rabbitmq/rabbitmq.module'
import { SyncService } from './sync.service'
import { UserCache, UserCacheSchema } from './schema/user-cache.schema'
import { RoleCache, RoleCacheSchema } from './schema/role-cache.schema'
import { WeatherCache, WeatherCacheSchema } from './schema/weather-cache.schema'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserCache.name, schema: UserCacheSchema },
      { name: RoleCache.name, schema: RoleCacheSchema },
      { name: WeatherCache.name, schema: WeatherCacheSchema },
    ]),
    RabbitmqModule,
  ],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
