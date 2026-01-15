import { Injectable } from '@nestjs/common'
import { UserCache, UserCacheDocument } from '@/core/sync/schema/user-cache.schema'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
@Injectable()
export class UserService {
  constructor(@InjectModel(UserCache.name) private userModel: Model<UserCacheDocument>) {}
  async findOne(id: string) {
    return await this.userModel.findById(id).exec()
  }
}
