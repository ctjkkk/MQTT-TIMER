import { ApiProperty } from '@nestjs/swagger'

/**
 * 通用响应包装 DTO（基类，仅用于类型定义）
 * 所有接口响应都会被 Transform 拦截器包装成这个结构
 */
export class ApiResponse<T> {
  @ApiProperty({ description: '状态码', example: 200 })
  code: number

  @ApiProperty({ description: '消息', example: '操作成功' })
  msg: string

  data: T
}
