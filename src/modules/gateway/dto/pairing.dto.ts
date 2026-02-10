import { IsString, IsNotEmpty, IsOptional } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

/**
 * Bind Gateway DTO (bind to user account after pairing)
 */
export class BindGatewayDto {
  @ApiProperty({
    description: 'Gateway ID (unique device identifier)',
    example: 'ABCDEF123456',
  })
  @IsString()
  @IsNotEmpty({ message: 'Gateway ID cannot be empty' })
  gatewayId: string

  @ApiProperty({
    description: 'Gateway name (user-defined, optional)',
    example: 'Living Room Gateway',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string
}

/**
 * Verify Pairing Status DTO
 */
export class VerifyPairingDto {
  @ApiProperty({
    description: 'Gateway ID',
    example: 'ABCDEF123456',
  })
  @IsString()
  @IsNotEmpty({ message: 'Gateway ID cannot be empty' })
  gatewayId: string
}

/**
 * Gateway Status Response DTO
 */
export class GatewayStatusDto {
  @ApiProperty({
    description: 'Gateway ID',
  })
  gatewayId: string

  @ApiProperty({
    description: 'Online status (1: online, 0: offline)',
    example: 1,
  })
  isOnline: number

  @ApiProperty({
    description: 'Last seen time',
    example: '2026-01-19T10:30:00.000Z',
  })
  lastSeen: Date

  @ApiProperty({
    description: 'WiFi signal strength',
    example: -45,
    required: false,
  })
  wifiRssi?: number

  @ApiProperty({
    description: 'Firmware version',
    example: '1.0.5',
    required: false,
  })
  firmwareVersion?: string
}
