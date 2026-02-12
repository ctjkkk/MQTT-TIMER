import { ApiProperty } from '@nestjs/swagger'

/**
 * Firmware Upload Response DTO
 */
export class FirmwareResponseDto {
  @ApiProperty({
    description: 'Firmware unique identifier',
    example: '65f1234567890abcdef12345',
  })
  firmwareId: string

  @ApiProperty({
    description: 'Firmware version number',
    example: '1.0.3',
  })
  version: string

  @ApiProperty({
    description: 'Target device type',
    enum: ['gateway', 'subdevice'],
    example: 'gateway',
  })
  deviceType: string

  @ApiProperty({
    description: 'Firmware file name',
    example: 'gateway_v1.0.3_1707123456789.bin',
  })
  fileName: string

  @ApiProperty({
    description: 'HTTP download URL for gateway',
    example: 'http://127.0.0.1:8018/ota/firmware/download/65f1234567890abcdef12345',
  })
  fileUrl: string

  @ApiProperty({
    description: 'Firmware file size in bytes',
    example: 2048000,
  })
  fileSize: number

  @ApiProperty({
    description: 'SHA256 hash for integrity verification',
    example: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  })
  sha256: string

  @ApiProperty({
    description: 'Optional firmware description or changelog',
    example: 'Fixed WiFi connection bug and improved battery life',
    required: false,
  })
  description?: string

  @ApiProperty({
    description: 'Current firmware status',
    enum: ['draft', 'testing', 'released', 'deprecated'],
    example: 'draft',
  })
  status: string

  @ApiProperty({
    description: 'Firmware creation timestamp',
    example: '2024-02-05T10:30:45.123Z',
  })
  createdAt: Date
}
