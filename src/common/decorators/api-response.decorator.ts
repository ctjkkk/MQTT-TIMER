// src/common/decorators/common-api.decorator.ts
import { applyDecorators, UseFilters, UseGuards, UseInterceptors } from '@nestjs/common'
import { ApiHeader, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { HttpExceptionsFilter } from '../filters/exceptions.filter'
import { Transform } from '../interceptor/transform.interceptor'
import { ApiKeyGuard } from '../guards/api-key.guard'
import { SignatureGuard } from '@/modules/psk/guards/signature'

// gateway等模块 需要请求头中apikey的公共装饰器工厂函数
export const ApiResponseStandard = (summary: string, msg = '操作成功', code = 200) => {
  // applyDecorators 把多个装饰器打包成一条，省行数、好复用
  return applyDecorators(
    ApiOperation({ summary }),
    ApiResponse({ status: code, description: summary }),
    UseGuards(ApiKeyGuard),
    UseFilters(HttpExceptionsFilter),
    UseInterceptors(Transform(code, msg)),
  )
}

// psk 模块 需要signture和timestamp请求头参数的公共装饰器工厂函数
export const PskApiResponseStandard = (summary: string, responseDescription: string, msg = '操作成功', code = 200) => {
  return applyDecorators(
    ApiOperation({ summary }),
    ApiResponse({ status: code, description: responseDescription }),
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
