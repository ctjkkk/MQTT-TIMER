import { CallHandler, ExecutionContext, mixin, NestInterceptor } from '@nestjs/common'
import { map } from 'rxjs'

/**
 * 统一响应格式拦截器
 * @param message 成功消息，默认 "Success"
 * @returns 格式化后的响应：{ status: true/false, message: "", data: {} }
 */
export const Transform = (message = 'Success') =>
  mixin(
    class implements NestInterceptor {
      intercept(context: ExecutionContext, next: CallHandler) {
        return next.handle().pipe(
          map(data => {
            // 获取HTTP响应对象
            const response = context.switchToHttp().getResponse()
            const statusCode = response.statusCode
            const status = statusCode >= 200 && statusCode < 300
            return {
              status, // true 或 false
              message, // 消息
              data, // 数据（可以是对象或数组）
            }
          }),
        )
      }
    },
  )

/** 日志模块专用响应包装 */
export const LogsResponse = (message = 'Success') =>
  mixin(
    class implements NestInterceptor {
      intercept(context: ExecutionContext, next: CallHandler) {
        const req = context.switchToHttp().getRequest()
        const response = context.switchToHttp().getResponse()
        const url: string = req.url

        // 只拦截 /logs/api/* ，页面和静态资源直接跳过
        if (!url.startsWith('/logs/api')) return next.handle()

        return next.handle().pipe(
          map(data => {
            const statusCode = response.statusCode
            const status = statusCode >= 200 && statusCode < 300
            return {
              status,
              message,
              data,
            }
          }),
        )
      }
    },
  )
