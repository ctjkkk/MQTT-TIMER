import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose'

export type GatewayDocument = HydratedDocument<Gateway>

@Schema({ timestamps: true, collection: 'gateways' })
export class Gateway {
  @Prop({ type: String, required: true, unique: true, trim: true, comment: 'Hanqi gateway device ID' })
  gatewayId: string

  @Prop({ type: String, required: true, trim: true, comment: 'Gateway name' })
  name: string

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', comment: 'User ID' })
  userId: MongooseSchema.Types.ObjectId

  @Prop({ type: Number, comment: 'Status (deprecated)', default: 1, enum: [0, 1] })
  status: number

  @Prop({ type: Number, comment: 'Heartbeat status (connection status)', enum: [0, 1] })
  is_connected: number

  @Prop({ type: Date, default: null, comment: 'Last communication time' })
  last_seen: Date

  @Prop({ type: String, trim: true, comment: 'Hanqi product key' })
  product_key: string

  @Prop({ type: String, trim: true, comment: 'Hanqi device secret' })
  device_secret: string

  @Prop({ type: String, default: '1.0.0', trim: true, comment: 'Firmware version' })
  firmware_version: string

  @Prop({ type: String, trim: true })
  mac_address: string

  @Prop({ type: Number, comment: 'WiFi signal strength (dBm)' })
  wifi_rssi: number
}

export const GatewaySchema = SchemaFactory.createForClass(Gateway)

// Add indexes
GatewaySchema.index({ userId: 1 })
GatewaySchema.index({ status: 1 })
GatewaySchema.index({ last_seen: 1 })
GatewaySchema.index({ gatewayId: 1 }, { unique: true })
