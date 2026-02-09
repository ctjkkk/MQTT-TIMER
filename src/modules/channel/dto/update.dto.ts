import { ApiProperty } from '@nestjs/swagger'
import { IsNumber, IsIn, IsString, MaxLength } from 'class-validator'

export class UpdateWeatherSkipDto {
  @ApiProperty({ description: '是否启用天气跳过', example: 1, enum: [0, 1] })
  @IsNumber()
  @IsIn([0, 1], { message: 'enabled必须是0或1' })
  enabled: number
}

export class UpdateZoneNameDto {
  @ApiProperty({ description: '区域名称', example: '前院' })
  @IsString()
  @MaxLength(50, { message: '区域名称不能超过50个字符' })
  zoneName: string
}

export class UpdateZoneImageDto {
  @ApiProperty({ description: '区域图片URL', example: 'https://example.com/image.jpg' })
  @IsString()
  @MaxLength(255, { message: '区域图片URL不能超过255个字符' })
  zoneImage: string
}
