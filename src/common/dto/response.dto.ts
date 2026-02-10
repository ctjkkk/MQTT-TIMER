import { ApiProperty } from '@nestjs/swagger'

/**
 * Generic Response Wrapper DTO (Base class for type definitions)
 * All API responses are wrapped in this structure by the Transform interceptor
 */
export class ApiResponse<T> {
  @ApiProperty({ description: 'Status code', example: 200 })
  code: number

  @ApiProperty({ description: 'Message', example: 'Success' })
  msg: string

  data: T
}
