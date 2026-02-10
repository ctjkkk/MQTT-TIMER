import { applyDecorators, UseFilters, UseGuards, UseInterceptors, Type } from '@nestjs/common'
import { ApiHeader, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { HttpExceptionsFilter } from '../filters/exceptions.filter'
import { Transform } from '../interceptors/transform.interceptor'
import { SignatureGuard } from '@/auth/psk/guards/signature'
import { JwtAuthGuard } from '../guards/jwtAuth.guard'

interface ApiResponseStandardOptions {
  /** API summary */
  summary: string
  /** Response description */
  responseDescription: string
  /** Success message */
  msg?: string
  /** HTTP status code */
  code?: number
  /** Response data type (DTO class) */
  responseType?: Type<any> | [Type<any>]
}

interface PskApiResponseStandardOptions {
  /** API summary */
  summary: string
  /** Response description */
  responseDescription: string
  /** Success message */
  msg?: string
  /** HTTP status code */
  code?: number
  /** Response data type (DTO class) */
  responseType?: Type<any> | [Type<any>]
}

// Common decorator factory for gateway and other modules requiring API key in request header
export const ApiResponseStandard = (options: ApiResponseStandardOptions) => {
  const { summary, responseDescription, msg = 'Success', code = 200, responseType } = options

  const decorators = [
    ApiOperation({ summary }),
    ApiResponse({
      status: code,
      description: responseDescription,
      ...(responseType && { type: responseType }),
    }),
    ApiHeader({
      name: 'authorization',
      description: 'User authentication token, format: Bearer <token>',
      required: true,
    }),
    UseGuards(JwtAuthGuard),
    UseFilters(HttpExceptionsFilter),
    UseInterceptors(Transform(code, msg)),
  ]

  return applyDecorators(...decorators)
}

// Common decorator factory for PSK module requiring signature and timestamp in request header
export const PskApiResponseStandard = (options: PskApiResponseStandardOptions) => {
  const { summary, responseDescription, msg = 'Success', code = 200, responseType } = options

  return applyDecorators(
    ApiOperation({ summary }),
    ApiResponse({
      status: code,
      description: responseDescription,
      ...(responseType && { type: responseType }),
    }),

    ApiHeader({
      name: 'x-api-key',
      description: 'PSK module request signature key',
      required: true,
    }),
    UseGuards(SignatureGuard),
    UseFilters(HttpExceptionsFilter),
    UseInterceptors(Transform(code, msg)),
  )
}
