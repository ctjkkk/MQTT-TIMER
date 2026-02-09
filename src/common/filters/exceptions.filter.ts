import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common'
import { Request, Response } from 'express'
import { Error as MongooseError } from 'mongoose'

export interface UnifiedResponse<T = any> {
  code: number // 业务码，非 HTTP 状态
  message: string
  data: T
  error: string
}

/**
 * 全局异常过滤器
 *
 * 捕获所有类型的异常：
 * - HttpException（NestJS 异常）
 * - Mongoose CastError（MongoDB ObjectId 格式错误）
 * - 其他未知异常
 */
@Catch()
export class HttpExceptionsFilter implements ExceptionFilter {
  catch(exception: HttpException | MongooseError.CastError | Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()

    let status = HttpStatus.INTERNAL_SERVER_ERROR
    let message = '服务器出错'
    let error = ''

    // 处理 HttpException（NestJS 标准异常）
    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const body = exception.getResponse()
      if (typeof body === 'string') {
        message = body
      } else if (typeof body === 'object' && body !== null) {
        const b = body as any
        message = Array.isArray(b.message) ? b.message.join(', ') : b.message || '请求失败'
        error = b.error || ''
      }
    }
    // 2. 处理 Mongoose CastError（无效的 ObjectId）
    else if (exception instanceof MongooseError.CastError) {
      status = HttpStatus.BAD_REQUEST
      message = `Invalid ${exception.kind}: '${exception.value}' is not a valid ObjectId`
      error = 'Bad Request'
    }
    // 3. 处理其他未知异常
    else if (exception instanceof Error) {
      message = exception.message || '服务器内部错误'
      error = 'Internal Server Error'
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
