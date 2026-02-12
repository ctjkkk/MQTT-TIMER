import { applyDecorators, UseFilters, UseGuards, UseInterceptors, Type } from '@nestjs/common'
import { ApiHeader, ApiOperation, ApiResponse, ApiConsumes, ApiBody, ApiParam } from '@nestjs/swagger'
import { HttpExceptionsFilter } from '../filters/exceptions.filter'
import { Transform } from '../interceptors/transform.interceptor'
import { JwtAuthGuard } from '../guards/jwtAuth.guard'
import { ApiKeyGuard } from '../guards/apiKey.guard'
import { FileInterceptor } from '@nestjs/platform-express'

interface ApiResponseStandardOptions {
  /** API summary */
  summary: string
  /** Response description */
  responseDescription: string
  /** Success message */
  message?: string
  /** HTTP status code (for Swagger documentation only) */
  statusCode?: number
  /** Response data type (DTO class) */
  responseType?: Type<any> | [Type<any>]
}

interface PskApiResponseStandardOptions {
  /** API summary */
  summary: string
  /** Response description */
  responseDescription: string
  /** Success message */
  message?: string
  /** HTTP status code (for Swagger documentation only) */
  statusCode?: number
  /** Response data type (DTO class) */
  responseType?: Type<any> | [Type<any>]
}

interface ApiKeyApiResponseStandardOptions {
  /** API summary */
  summary: string
  /** Response description */
  responseDescription: string
  /** Success message */
  message?: string
  /** HTTP status code (for Swagger documentation only) */
  statusCode?: number
  /** Response data type (DTO class) */
  responseType?: Type<any> | [Type<any>]
}

interface ApiKeyFileUploadOptions {
  /** API summary */
  summary: string
  /** Response description */
  responseDescription: string
  /** Success message */
  message?: string
  /** HTTP status code (for Swagger documentation only) */
  statusCode?: number
  /** Response data type (DTO class for request body) */
  requestType: Type<any>
  /** Response data type (DTO class for response) */
  responseType?: Type<any> | [Type<any>]
  /** File field name */
  fieldName?: string
  /** Max file size in bytes */
  maxFileSize?: number
  /** Allowed file extensions (e.g., ['bin', 'hex']) */
  allowedExtensions?: string[]
}

interface ApiKeyFileDownloadOptions {
  /** API summary */
  summary: string
  /** Path parameter name (default: 'filename') */
  paramName?: string
  /** Path parameter description */
  paramDescription?: string
  /** Path parameter example value */
  paramExample?: string
}

// Common decorator factory for gateway and other modules requiring API key in request header
export const ApiResponseStandard = (options: ApiResponseStandardOptions) => {
  const { summary, responseDescription, message = 'Success', statusCode = 200, responseType } = options

  const decorators = [
    ApiOperation({ summary }),
    ApiResponse({
      status: statusCode,
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
    UseInterceptors(Transform(message)),
  ]

  return applyDecorators(...decorators)
}

// Common decorator factory for PSK module requiring API key in request header
export const PskApiResponseStandard = (options: PskApiResponseStandardOptions) => {
  const { summary, responseDescription, message = 'Success', statusCode = 200, responseType } = options

  return applyDecorators(
    ApiOperation({ summary }),
    ApiResponse({
      status: statusCode,
      description: responseDescription,
      ...(responseType && { type: responseType }),
    }),

    ApiHeader({
      name: 'x-api-key',
      description: 'API key for authentication',
      required: true,
    }),
    UseGuards(ApiKeyGuard),
    UseFilters(HttpExceptionsFilter),
    UseInterceptors(Transform(message)),
  )
}

// Common decorator factory for OTA module requiring API key in request header
export const ApiKeyApiResponseStandard = (options: ApiKeyApiResponseStandardOptions) => {
  const { summary, responseDescription, message = 'Success', statusCode = 200, responseType } = options

  return applyDecorators(
    ApiOperation({ summary }),
    ApiResponse({
      status: statusCode,
      description: responseDescription,
      ...(responseType && { type: responseType }),
    }),
    ApiHeader({
      name: 'x-api-key',
      description: 'API key for authentication',
      required: true,
    }),
    UseGuards(ApiKeyGuard),
    UseFilters(HttpExceptionsFilter),
    UseInterceptors(Transform(message)),
  )
}

// Decorator factory for file upload with API key authentication
export const ApiKeyFileUploadStandard = (options: ApiKeyFileUploadOptions) => {
  const {
    summary,
    responseDescription,
    message = 'Success',
    statusCode = 200,
    responseType,
    fieldName = 'file', // 文件字段名（默认 'file'）
    maxFileSize = 50 * 1024 * 1024, // 最大文件大小（默认 50MB）
    allowedExtensions = ['bin', 'hex'], // 默认允许 .bin 和 .hex
  } = options

  // 构建文件验证规则
  const extensionPattern = allowedExtensions.map(ext => `\\.${ext}`).join('|')
  const extensionList = allowedExtensions.map(ext => `.${ext}`).join(', ')

  return applyDecorators(
    ApiOperation({ summary }),
    ApiResponse({
      status: statusCode,
      description: responseDescription,
      ...(responseType && { type: responseType }),
    }),
    ApiConsumes('multipart/form-data'), // 声明使用 form-data 格式
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          file: {
            type: 'string',
            format: 'binary', // 文件类型
            description: `Firmware file (${extensionList})`,
          },
          version: {
            type: 'string',
            description: 'Firmware version (e.g., 1.0.2)',
            example: '1.0.2',
          },
          description: {
            type: 'string',
            description: 'Firmware description or changelog',
            example: 'Fixed WiFi connection bug',
          },
          deviceType: {
            type: 'string',
            enum: ['gateway', 'subdevice'],
            description: 'Device type',
            example: 'gateway',
          },
        },
        required: ['file', 'version', 'deviceType'], // 必填字段
      },
    }),
    ApiHeader({
      name: 'x-api-key',
      description: 'API key for authentication',
      required: true,
    }),
    UseGuards(ApiKeyGuard),
    UseInterceptors(
      FileInterceptor(fieldName, {
        limits: {
          fileSize: maxFileSize, // 限制文件大小
        },
        fileFilter: (req, file, cb) => {
          const regex = new RegExp(`(${extensionPattern})$`)
          if (file.originalname.match(regex)) {
            cb(null, true) // 文件类型合法
          } else {
            cb(new Error(`Only ${extensionList} files are allowed`), false)
          }
        },
      }),
    ),
    UseFilters(HttpExceptionsFilter),
    UseInterceptors(Transform(message)),
  )
}

// Decorator factory for file download with API key authentication
export const ApiKeyFileDownloadStandard = (options: ApiKeyFileDownloadOptions) => {
  const { summary, paramName = 'filename', paramDescription = 'File name', paramExample = 'example_file.bin' } = options

  return applyDecorators(
    ApiOperation({ summary }),

    ApiHeader({
      name: 'x-api-key',
      description: 'API key for authentication',
      required: true,
    }),
    ApiParam({
      name: paramName,
      description: paramDescription,
      example: paramExample,
    }),
    UseGuards(ApiKeyGuard),
  )
}
