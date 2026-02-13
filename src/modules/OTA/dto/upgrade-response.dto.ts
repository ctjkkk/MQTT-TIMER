import { ApiProperty } from '@nestjs/swagger'

/**
 * Upgrade Status Response DTO
 */
export class UpgradeStatusResponseDto {
  @ApiProperty({ description: 'Whether there is an upgrade task', example: true })
  hasTask: boolean

  @ApiProperty({ description: 'Message', example: 'No upgrade task available', required: false })
  message?: string

  @ApiProperty({ description: 'Task ID', example: '65f1234567890abcdef12345', required: false })
  taskId?: string

  @ApiProperty({ description: 'Gateway ID', example: 'HQ2026ABC123', required: false })
  gatewayId?: string

  @ApiProperty({ description: 'Version before upgrade', example: '1.0.1', required: false })
  fromVersion?: string

  @ApiProperty({ description: 'Target version', example: '1.0.2', required: false })
  toVersion?: string

  @ApiProperty({
    description: 'Upgrade status',
    enum: ['pending', 'downloading', 'verifying', 'installing', 'completed', 'failed'],
    example: 'downloading',
    required: false,
  })
  status?: string

  @ApiProperty({ description: 'Upgrade progress (0-100)', example: 45, minimum: 0, maximum: 100, required: false })
  progress?: number

  @ApiProperty({ description: 'Start time', example: '2026-02-08T10:30:00Z', required: false })
  startTime?: Date

  @ApiProperty({ description: 'Complete time', example: '2026-02-08T10:35:00Z', required: false, nullable: true })
  completeTime?: Date

  @ApiProperty({ description: 'Duration in seconds', example: 300, required: false })
  duration?: number

  @ApiProperty({ description: 'Error code', example: 'MD5_MISMATCH', required: false })
  errorCode?: string

  @ApiProperty({ description: 'Error message', example: 'Firmware MD5 verification failed', required: false })
  errorMessage?: string

  @ApiProperty({ description: 'Retry count', example: 0, required: false })
  retryCount?: number

  @ApiProperty({ description: 'Creation time', example: '2026-02-08T10:30:00Z', required: false })
  createdAt?: Date

  @ApiProperty({ description: 'Last update time', example: '2026-02-08T10:32:00Z', required: false })
  updatedAt?: Date
}
