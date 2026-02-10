import { ApiProperty } from '@nestjs/swagger'

/**
 * Generate PSK Response DTO
 */
export class GeneratePskResponseDto {
  @ApiProperty({
    description: 'MQTT connection username (PSK identity, i.e., MAC address)',
    example: 'A1B2C3D4E5F6',
  })
  identity: string

  @ApiProperty({
    description: 'MQTT connection password (PSK key, 128-bit hexadecimal string)',
    example: 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890ab',
  })
  key: string
}

/**
 * Confirm PSK Response DTO
 */
export class ConfirmPskResponseDto {
  @ApiProperty({
    description: 'Message',
    example: 'PSK burning confirmed successfully',
  })
  tip: string
}
