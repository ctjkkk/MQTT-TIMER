import { Injectable, NestMiddleware } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'
import { LoggerService } from './logger.service'
import { randomUUID } from 'crypto'

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(private readonly logger: LoggerService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now()
    const requestId = randomUUID()

    // 获取客户端 IP
    const ip = this.getClientIp(req)

    // 获取 User-Agent
    const userAgent = req.headers['user-agent'] || 'Unknown'

    // 在请求对象上附加 requestId，方便后续使用
    ;(req as any).requestId = requestId

    res.on('finish', () => {
      const { method, originalUrl } = req
      const { statusCode } = res
      const duration = Date.now() - start

      // 排除日志查看器自身的 API 请求，避免日志噪音
      if (originalUrl.startsWith('/logs/api/') || originalUrl === '/logs') {
        return
      }

      // 记录 HTTP 请求日志
      this.logger.httpRequest(method, originalUrl, statusCode, duration, ip, userAgent, requestId)
    })

    next() //继续执行下一个中间件
  }

  private getClientIp(req: Request): string {
    // 尝试从不同的 header 获取真实 IP
    const forwarded = req.headers['x-forwarded-for']
    if (forwarded) {
      return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim()
    }

    const realIp = req.headers['x-real-ip']
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp
    }

    return req.ip || req.socket.remoteAddress || 'Unknown'
  }
}
