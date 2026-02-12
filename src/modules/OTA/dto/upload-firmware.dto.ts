import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator'

export class UploadFirmwareDto {
  @ApiProperty({
    description: 'Firmware file (.bin or .hex)',
    type: 'string',
    format: 'binary',
  })
  file: any

  @ApiProperty({
    description: 'Firmware version (e.g., 1.0.2)',
    example: '1.0.2',
  })
  @IsString()
  @IsNotEmpty()
  version: string

  @ApiProperty({
    description: 'Firmware description or changelog',
    example: 'Fixed WiFi connection bug and improved battery life',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string

  @ApiProperty({
    description: 'Device type',
    enum: ['gateway', 'subdevice'],
    example: 'gateway',
  })
  @IsEnum(['gateway', 'subdevice'])
  @IsNotEmpty()
  deviceType: 'gateway' | 'subdevice'
}
