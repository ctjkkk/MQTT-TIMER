import mongoose from 'mongoose'

export interface HanqiPskDocument extends mongoose.Document {
  mac_address: string
  identity: string
  key: string
  status: number
}

export const HanqiPskSchema = new mongoose.Schema(
  {
    mac_address: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    identity: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    key: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
)

HanqiPskSchema.index({ mac_address: 1 }, { unique: true })
HanqiPskSchema.index({ identity: 1, key: 1 })

export default mongoose.model<HanqiPskDocument>('HanqiPsk', HanqiPskSchema)
