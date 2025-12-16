import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Request } from 'express'

/**
 * API Key 守卫
 * 用于保护查询类接口
 * 客户端需要在请求头中提供：
 * - X-API-Key: your-api-key
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 检查是否标记为公开
    const isPublic = this.reflector.get<boolean>('isPublic', context.getHandler())
    if (isPublic) {
      return true
    }

    const request = context.switchToHttp().getRequest<Request>()
    const apiKey = request.headers['x-api-key'] as string
    if (!apiKey) {
      throw new UnauthorizedException('缺少 API Key')
    }

    const validApiKeys = (process.env.VALID_API_KEYS || '').split(',')

    if (!validApiKeys.includes(apiKey)) {
      throw new UnauthorizedException('无效的 API Key')
    }

    return true
  }
}
