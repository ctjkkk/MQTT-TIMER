import { ApiProperty } from '@nestjs/swagger'

/**
 * Generic Response Wrapper DTO (Base class for type definitions)
 * All API responses are wrapped in this structure by the Transform interceptor
 * Format: { status: true/false, message: "", data: {} }
 */
export class ApiResponse<T> {
  @ApiProperty({ description: 'Success status', example: true })
  status: boolean

  @ApiProperty({ description: 'Response message', example: 'Success' })
  message: string

  @ApiProperty({ description: 'Response data' })
  data: T
}
