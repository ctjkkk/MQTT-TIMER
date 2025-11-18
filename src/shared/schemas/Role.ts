import mongoose from 'mongoose'

export interface RoleDocument extends mongoose.Document {
  name: string
  status: number
  createdAt: Date
  updatedAt: Date
}

const roleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  status: { type: Number, required: true, default: 0 },
  timestamps: { type: Date, required: true },
})

const Role = mongoose.model<RoleDocument>('Role', roleSchema)
export default Role
