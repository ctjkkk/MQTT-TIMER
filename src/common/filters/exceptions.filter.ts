import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common'
import { Request, Response } from 'express'
import { Error as MongooseError } from 'mongoose'

export interface UnifiedResponse<T = any> {
  status: boolean // 请求是否成功
  message: string // 消息
  data: T // 数据
}

/**
 * 全局异常过滤器
 *
 * 捕获所有类型的异常：
 * - HttpException（NestJS 异常）
 * - Mongoose CastError（MongoDB ObjectId 格式错误）
 * - 其他未知异常
 *
 * 返回统一格式：{ status: false, message: "错误信息", data: null }
 */
@Catch()
export class HttpExceptionsFilter implements ExceptionFilter {
  catch(exception: HttpException | MongooseError.CastError | Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()

    let status = HttpStatus.INTERNAL_SERVER_ERROR
    let message = 'Server error'

    // 处理 HttpException（NestJS 标准异常）
    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const body = exception.getResponse()
      if (typeof body === 'string') {
        message = body
      } else if (typeof body === 'object' && body !== null) {
        const b = body as any
        message = Array.isArray(b.message) ? b.message.join(', ') : b.message || 'Request failed'
      }
    }
    // 2. 处理 Mongoose CastError（类型转换错误）
    // 通常发生在：使用 findById() 传入无效的 ObjectId 格式
    else if (exception instanceof MongooseError.CastError) {
      status = HttpStatus.BAD_REQUEST
      const fieldName = exception.path || 'parameter'

      if (exception.kind === 'ObjectId') {
        // 只有当错误发生在 _id 字段时才返回错误
        // 如果是自定义字段（timerId, gatewayId 等），说明代码错误使用了 findById()
        if (fieldName === '_id') {
          message = `Invalid ID format: '${exception.value}' is not a valid identifier`
        } else {
          // 自定义字段抛出 CastError 通常是代码问题（误用了 findById）
          message = `Resource not found: invalid ${fieldName} value`
          status = HttpStatus.NOT_FOUND
        }
      } else {
        // 其他类型转换错误（如数字、日期等）
        message = `Invalid ${fieldName}: expected ${exception.kind}, received '${exception.value}'`
      }
    }
    // 3. 处理其他未知异常
    else if (exception instanceof Error) {
      message = exception.message || 'Internal server error'
    }

    const unified: UnifiedResponse = {
      status: false, // 所有异常都返回 false
      message,
      data: null,
    }
    response.status(status).json(unified)
  }
}
