import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'

export type PskDocument = HydratedDocument<Psk>

@Schema({ timestamps: true, collection: 'psks' })
export class Psk {
  @Prop({ type: String, required: true, unique: true, trim: true })
  mac_address: string

  @Prop({ type: String, required: true, unique: true, trim: true })
  identity: string

  @Prop({ type: String, required: true, trim: true })
  key: string

  @Prop({ type: Number, required: true, default: 0 })
  status: number
}

export const PskSchema = SchemaFactory.createForClass(Psk)

// 添加索引
PskSchema.index({ mac_address: 1 }, { unique: true })
PskSchema.index({ identity: 1, key: 1 })
