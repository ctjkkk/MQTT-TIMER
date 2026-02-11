import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { Request } from 'express'
import { LogMessages, LogContext } from '@/shared/constants/logger.constants'
import { LoggerService } from '@/core/logger/logger.service'

/**
 * API Key认证守卫（简化版）
 * 用于工厂烧录PSK等场景，只需要提供简单的API Key即可
 *
 * 客户端需要在请求头中提供：
 * - X-API-Key: API密钥
 *
 * 使用方法：
 * 1. 在环境变量中设置 FACTORY_API_KEY
 * 2. 请求时在请求头添加：X-API-Key: {你的密钥}
 */
@Injectable()
export class SignatureGuard implements CanActivate {
  private readonly apiKey: string

  constructor(private readonly logger: LoggerService) {
    // 从环境变量获取API Key，如果没有设置则使用默认值
    this.apiKey = process.env.FACTORY_API_KEY
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>()

    // 从请求头获取API Key
    const apiKeyFromHeader = request.headers['x-api-key'] as string

    // 检查是否提供了API Key
    if (!apiKeyFromHeader) {
      this.logger.warn(LogMessages.API_KEY.MISSING(), LogContext.PSK)
      throw new UnauthorizedException('API Key is missing. Please add X-API-Key in the request header.')
    }

    // 验证API Key是否正确
    if (apiKeyFromHeader !== this.apiKey) {
      this.logger.warn(LogMessages.API_KEY.VERIFY_FAILED(apiKeyFromHeader), LogContext.PSK)
      throw new UnauthorizedException('API Key error')
    }

    this.logger.debug(LogMessages.API_KEY.VERIFY_SUCCESS(request.path), LogContext.PSK)
    return true
  }
}
