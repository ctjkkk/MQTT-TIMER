import { Module } from '@nestjs/common'
import { UserService } from './user.service'
import { UserController } from './user.controller'
import { UserCache, UserCacheSchema } from '@/core/sync/schema/user-cache.schema'
import { MongooseModule } from '@nestjs/mongoose'
@Module({
  imports: [MongooseModule.forFeature([{ name: UserCache.name, schema: UserCacheSchema }])],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
