import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { MqttModule } from '@/core/mqtt/mqtt.module'
import { SyncService } from './sync.service'
import { UserCache, UserCacheSchema } from './schema/user-cache.schema'
import { RoleCache, RoleCacheSchema } from './schema/role-cache.schema'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserCache.name, schema: UserCacheSchema },
      { name: RoleCache.name, schema: RoleCacheSchema },
    ]),
    MqttModule,
  ],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
