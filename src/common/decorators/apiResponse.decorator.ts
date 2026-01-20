import { applyDecorators, UseFilters, UseGuards, UseInterceptors, Type } from '@nestjs/common'
import { ApiHeader, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { HttpExceptionsFilter } from '../filters/exceptions.filter'
import { Transform } from '../interceptors/transform.interceptor'
import { SignatureGuard } from '@/auth/psk/guards/signature'
import { JwtAuthGuard } from '../guards/jwtAuth.guard'

interface ApiResponseStandardOptions {
  /** 接口摘要说明 */
  summary: string
  /** 响应描述 */
  responseDescription: string
  /** 成功消息 */
  msg?: string
  /** HTTP状态码 */
  code?: number
  /** 响应数据类型（DTO类） */
  responseType?: Type<any> | [Type<any>]
}

interface PskApiResponseStandardOptions {
  /** 接口摘要说明 */
  summary: string
  /** 响应描述 */
  responseDescription: string
  /** 成功消息 */
  msg?: string
  /** HTTP状态码 */
  code?: number
  /** 响应数据类型（DTO类） */
  responseType?: Type<any> | [Type<any>]
}

// gateway等模块 需要请求头中apikey的公共装饰器工厂函数
export const ApiResponseStandard = (options: ApiResponseStandardOptions) => {
  const { summary, responseDescription, msg = '操作成功', code = 200, responseType } = options

  const decorators = [
    ApiOperation({ summary }),
    ApiResponse({
      status: code,
      description: responseDescription,
      ...(responseType && { type: responseType }), // 如果提供了 responseType，添加到 ApiResponse
    }),
    ApiHeader({
      name: 'authorization',
      description: '用户身份验证令牌，格式为 Bearer <token>',
      required: true,
    }),
    UseGuards(JwtAuthGuard),
    UseFilters(HttpExceptionsFilter),
    UseInterceptors(Transform(code, msg)),
  ]

  return applyDecorators(...decorators)
}

// psk 模块 需要signture和timestamp请求头参数的公共装饰器工厂函数
export const PskApiResponseStandard = (options: PskApiResponseStandardOptions) => {
  const { summary, responseDescription, msg = '操作成功', code = 200, responseType } = options

  return applyDecorators(
    ApiOperation({ summary }),
    ApiResponse({
      status: code,
      description: responseDescription,
      ...(responseType && { type: responseType }),
    }),
    ApiHeader({
      name: 'x-timestamp',
      description: 'Unix 时间戳（秒），与 x-signature 一起使用，须为 5 分钟内',
      required: true,
    }),
    ApiHeader({
      name: 'x-signature',
      description: 'PSK 模块签名，有效期 5 分钟',
      required: true,
    }),
    UseGuards(SignatureGuard),
    UseFilters(HttpExceptionsFilter),
    UseInterceptors(Transform(code, msg)),
  )
}
