import * as crypto from 'crypto'

/**
 * 签名工具类
 * 提供HMAC-SHA256签名生成和验证功能
 */
export class SignatureUtil {
  /**
   * 生成HMAC-SHA256签名
   * @param data 要签名的数据
   * @param secret 签名密钥
   * @returns 十六进制格式的签名字符串
   */
  static generateSignature(data: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(data).digest('hex')
  }

  /**
   * 构建待签名字符串
   * @param method HTTP方法
   * @param path 请求路径
   * @param timestamp 时间戳
   * @param body 请求体（可选）
   * @returns 待签名的字符串
   */
  static buildSignString(method: string, path: string, timestamp: string, body?: any): string {
    const parts = [method.toUpperCase(), path, timestamp]

    // 如果有请求体，将其序列化后加入签名
    if (body && Object.keys(body).length > 0) {
      parts.push(JSON.stringify(body))
    }

    return parts.join('\n')
  }

  /**
   * 验证签名是否有效
   * @param signature 客户端提供的签名
   * @param method HTTP方法
   * @param path 请求路径
   * @param timestamp 时间戳
   * @param secret 签名密钥
   * @param body 请求体（可选）
   * @returns 签名是否有效
   */
  static verifySignature(
    signature: string,
    method: string,
    path: string,
    timestamp: string,
    secret: string,
    body?: any,
  ): boolean {
    const signString = this.buildSignString(method, path, timestamp, body)
    const expectedSignature = this.generateSignature(signString, secret)
    return signature === expectedSignature
  }

  /**
   * 验证时间戳是否在有效期内
   * @param timestamp 客户端提供的时间戳（秒）
   * @param maxAge 最大有效期（秒），默认5分钟
   * @returns 时间戳是否有效
   */
  static verifyTimestamp(timestamp: string, maxAge: number = 5 * 60): boolean {
    const now = Math.floor(Date.now() / 1000) // 秒
    const requestTime = parseInt(timestamp, 10)

    if (isNaN(requestTime)) return false

    // 检查时间戳是否在合理范围内（防止重放攻击）
    return Math.abs(now - requestTime) <= maxAge
  }
}
