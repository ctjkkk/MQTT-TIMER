import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'

export type UserCacheDocument = HydratedDocument<UserCache>

/**
 * 用户缓存 Schema
 * 用于存储从主后端同步的用户数据
 */
@Schema({ collection: 'users_cache', timestamps: false })
export class UserCache {
  @Prop()
  name: string

  @Prop()
  phone: string

  @Prop()
  email: string

  @Prop()
  image: string

  @Prop({ type: Number })
  lat: number

  @Prop({ type: Number })
  lng: number

  @Prop({ type: Boolean })
  is_deleted: boolean

  @Prop()
  role: string

  @Prop({ type: Number })
  utc_offset_minutes: number

  @Prop()
  city: string

  @Prop()
  state: string

  @Prop()
  status: string

  @Prop({ type: Date })
  syncedAt: Date // 同步时间
}

export const UserCacheSchema = SchemaFactory.createForClass(UserCache)

// 添加索引
UserCacheSchema.index({ phone: 1 })
UserCacheSchema.index({ email: 1 })
