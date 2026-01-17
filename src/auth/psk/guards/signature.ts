import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common'
import { Request } from 'express'
import { SignatureUtil } from '../utils/signature'
import { LogMessages, LogContext } from '@/shared/constants/logger.constants'
import { LoggerService } from '@/core/logger/logger.service'
/**
 * 签名验证守卫
 * 验证HTTP请求的签名和时间戳，防止请求被篡改和重放攻击
 *
 * 客户端需要在请求头中提供：
 * - X-Signature: 请求签名
 * - X-Timestamp: 时间戳（毫秒）
 *
 * 签名算法：
 * 1. 构建待签名字符串：METHOD\nPATH\nTIMESTAMP\nBODY（可选）
 * 2. 使用HMAC-SHA256对待签名字符串进行签名
 * 3. 将签名转为十六进制字符串
 */
@Injectable()
export class SignatureGuard implements CanActivate {
  private readonly signatureSecret: string
  constructor(private readonly logger: LoggerService) {
    // 从环境变量获取签名密钥
    this.signatureSecret = process.env.SIGNATURE_SECRET ?? ''
    if (!this.signatureSecret) {
      this.logger.warn(LogMessages.SERVER.NO_SIGN_ENV_VAR(), LogContext.PSK)
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>()
    // 从请求头获取签名和时间戳
    const signature = request.headers['x-signature'] as string
    const timestamp = request.headers['x-timestamp'] as string
    // 检查必需的请求头
    if (!signature) {
      this.logger.warn(LogMessages.SERVER.X_SIGN_IS_MISSING(), LogContext.PSK)
      throw new UnauthorizedException('缺少签名')
    }
    if (!timestamp) {
      this.logger.warn(LogMessages.SERVER.X_TIME_IS_MISSING(), LogContext.PSK)
      throw new UnauthorizedException('缺少时间戳')
    }
    // 验证时间戳是否在有效期内（5分钟）
    if (!SignatureUtil.verifyTimestamp(timestamp)) {
      this.logger.warn(LogMessages.SERVER.X_TIME_IS_EXPIRED_OR_INVALID(timestamp), LogContext.PSK)
      throw new UnauthorizedException('时间戳无效或已过期')
    }
    // 验证签名
    const { method, body } = request
    const path = request.path.replace(/^\/api/, '')
    const isValid = SignatureUtil.verifySignature(signature, method, path, timestamp, this.signatureSecret, body)
    if (!isValid) {
      this.logger.warn(LogMessages.SERVER.X_SIGN_VERIFY_FAILED(method, path, timestamp), LogContext.PSK)
      throw new UnauthorizedException('签名验证失败')
    }
    this.logger.debug(LogMessages.SERVER.X_SIGN_TIME_VERIFY_SCCUSS(path), LogContext.PSK)
    return true
  }
}
