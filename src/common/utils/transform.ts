import { Types } from 'mongoose'
//反序列化函数
export function deserialize(value: any): any {
  if (value === null || value === undefined) return value

  if (value && typeof value === 'object' && value.$oid) return new Types.ObjectId(value.$oid)

  if (value && typeof value === 'object' && value.$date) return new Date(value.$date)

  if (Array.isArray(value)) return value.map(item => deserialize(item))

  if (typeof value === 'object' && value.constructor === Object) {
    const result: any = {}
    for (const key in value) {
      if (value.hasOwnProperty(key)) {
        result[key] = deserialize(value[key]) // 递归！
      }
    }
    return result
  }
  // 原样返回基本类型（string, number, boolean）
  return value
}
