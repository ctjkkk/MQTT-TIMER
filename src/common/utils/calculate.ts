import * as crypto from 'crypto'

// 计算文件的 MD5 哈希值(弃用)
export function calculateMD5(buffer: Buffer): string {
  return crypto.createHash('md5').update(buffer).digest('hex')
}

// 计算文件的 SHA256 哈希值（更安全）
export function calculateSHA256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}
