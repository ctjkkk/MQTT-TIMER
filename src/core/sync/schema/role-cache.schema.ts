import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'

export type RoleCacheDocument = HydratedDocument<RoleCache>

/**
 * 角色缓存 Schema
 * 用于存储从主后端同步的角色数据
 */
@Schema({ collection: 'roles_cache', timestamps: false })
export class RoleCache {
  @Prop()
  name: string

  @Prop()
  role: string

  @Prop()
  status: string

  @Prop({ type: Date })
  syncedAt: Date // 同步时间
}

export const RoleCacheSchema = SchemaFactory.createForClass(RoleCache)

// 添加索引
RoleCacheSchema.index({ role: 1 })
