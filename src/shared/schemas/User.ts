import mongoose from 'mongoose'
import { Hash } from '../utils/hash'
import { RoleDocument } from './Role'
import moment from 'moment'

export interface UserDocument extends mongoose.Document {
  name: string
  email: string
  phone: string
  password: string
  address: string
  image?: string
  lat: string
  lng: string
  status: number
  is_ota: number
  firmware_version: string
  utc_offset_minutes: string
  role: RoleDocument['_id']
  createdAt: Date
  updatedAt: Date
}

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, lowercase: true, unique: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  address: { type: String, required: true },
  image: { type: String },
  lat: { type: String },
  lng: { type: String },
  is_deleted: { type: Boolean },
  token: { type: String },
  status: { type: Number, required: true, default: 0 },
  is_ota: { type: Number, default: 1 },
  firmware_version: { type: String, required: false, default: '1.0' },
  utc_offset_minutes: { type: String },
  role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
  createdAt: { type: Date, default: Date.now },
})

userSchema.pre('save', async function () {
  if ((this as UserDocument).password && this.isModified('password') === true) {
    ;(this as UserDocument).password = await Hash.make((this as UserDocument).password)
  }
})

userSchema.virtual('formattedCreatedAt').get(function () {
  return moment(this.createdAt).format('YYYY-MM-DD HH:mm A')
})
userSchema.set('toObject', { getters: true })
const User = mongoose.model<UserDocument>('User', userSchema)

export default User
