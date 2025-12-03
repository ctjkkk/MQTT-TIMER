import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common'
import { Request, Response } from 'express'

export interface UnifiedResponse<T = any> {
  code: number // 业务码，非 HTTP 状态
  message: string
  data: T
  error: string
}

@Catch(HttpException)
export class HttpExceptionsFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const status = exception.getStatus()
    const body = exception.getResponse()
    let message = '服务器出错'
    let error = ''
    if (typeof body === 'string') {
      message = body
    } else if (typeof body === 'object' && body !== null) {
      const b = body as any
      message = Array.isArray(b.message) ? b.message.join(', ') : b.message || '请求失败'
      error = b.error || ''
    }
    const unified: UnifiedResponse = {
      code: status,
      message,
      data: null,
      error,
    }
    response.status(status).json(unified)
  }
}
