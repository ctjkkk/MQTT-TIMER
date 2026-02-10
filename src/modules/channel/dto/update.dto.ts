import { ApiProperty } from '@nestjs/swagger'
import { IsNumber, IsIn, IsString, MaxLength } from 'class-validator'

export class UpdateWeatherSkipDto {
  @ApiProperty({ description: 'Enable weather skip', example: 1, enum: [0, 1] })
  @IsNumber()
  @IsIn([0, 1], { message: 'enabled must be 0 or 1' })
  enabled: number
}

export class UpdateZoneNameDto {
  @ApiProperty({ description: 'Zone name', example: 'Front Yard' })
  @IsString()
  @MaxLength(50, { message: 'Zone name cannot exceed 50 characters' })
  zoneName: string
}

export class UpdateZoneImageDto {
  @ApiProperty({ description: 'Zone image URL', example: 'https://example.com/image.jpg' })
  @IsString()
  @MaxLength(255, { message: 'Zone image URL cannot exceed 255 characters' })
  zoneImage: string
}
