import { ApiProperty } from '@nestjs/swagger'

/**
 * Bind Gateway Response DTO
 */
export class BindGatewayResponseDto {
  @ApiProperty({ description: 'Gateway ID', example: 'gateway_12345678' })
  gatewayId: string

  @ApiProperty({ description: 'Gateway name', example: 'Living Room Gateway' })
  name: string

  @ApiProperty({ description: 'Online status', example: 1 })
  isOnline: number

  @ApiProperty({ description: 'Message', example: 'Gateway bound successfully' })
  message: string
}

/**
 * Verify Pairing Response DTO
 */
export class VerifyPairingResponseDto {
  @ApiProperty({ description: 'Gateway exists', example: true })
  exists: boolean

  @ApiProperty({ description: 'Online status', example: true })
  isOnline: string

  @ApiProperty({ description: 'Bound to user', example: true })
  isBound: boolean

  @ApiProperty({ description: 'User ID bound to this gateway', example: '68ec5cd4cdeec7e3e926ae25' })
  userId: string

  @ApiProperty({ description: 'Gateway name', example: 'Living Room Gateway' })
  name: string
}

/**
 * Gateway Status Response DTO
 */
export class GatewayStatusResponseDto {
  @ApiProperty({ description: 'Gateway ID', example: 'gateway_12345678' })
  gatewayId: string

  @ApiProperty({ description: 'Gateway name', example: 'Living Room Gateway', required: false })
  name?: string

  @ApiProperty({ description: 'Online status', example: 1 })
  isOnline: number

  @ApiProperty({ description: 'Bound to user', example: 1 })
  isBind: number

  @ApiProperty({ description: 'Last seen time', example: '2026-01-19T10:30:00.000Z', required: false })
  lastSeen?: Date

  @ApiProperty({ description: 'WiFi signal strength', example: -45, required: false })
  wifiRssi?: number

  @ApiProperty({ description: 'Firmware version', example: '1.0.5', required: false })
  firmwareVersion?: string
}

/**
 * Unbind Gateway Response DTO
 */
export class UnbindGatewayResponseDto {
  @ApiProperty({ description: 'Message', example: 'Gateway unbound successfully' })
  message: string
}
