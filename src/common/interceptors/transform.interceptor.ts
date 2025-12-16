import { CallHandler, ExecutionContext, mixin, NestInterceptor } from '@nestjs/common'
import { map } from 'rxjs'

export const Transform = (code = 200, msg = '成功') =>
  mixin(
    // mixin 会给这个匿名类生成一个内部唯一标识，让 @UseInterceptors() 认得它
    class implements NestInterceptor {
      intercept(_: ExecutionContext, next: CallHandler) {
        // next.handle() = “继续走，拿到控制器的结果流”  .pipe(map(...)) = “等流里的值出来后，替我包一层壳再发给前端”
        return next.handle().pipe(map(v => ({ code, data: v, msg })))
      }
    },
  )

/** 日志模块专用响应包装 */
export const LogsResponse = (code = 200, msg = 'success') =>
  mixin(
    class implements NestInterceptor {
      intercept(context: ExecutionContext, next: CallHandler) {
        const req = context.switchToHttp().getRequest()
        const url: string = req.url

        // 只拦截 /logs/api/* ，页面和静态资源直接跳过
        if (!url.startsWith('/logs/api')) return next.handle()

        return next.handle().pipe(map(data => ({ code, data, msg })))
      }
    },
  )
