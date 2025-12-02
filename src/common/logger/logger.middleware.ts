import { Injectable, NestMiddleware, Logger } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP') // 日志前缀

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now()
    res.on('close', () => {
      const { method, originalUrl } = req
      const { statusCode } = res
      const cost = Date.now() - start
      this.logger.log(`${method} ${originalUrl} ${statusCode} +${cost}ms`)
    })
    next()
  }
}
