import { ApiProperty } from '@nestjs/swagger'
import { IsString, MaxLength } from 'class-validator'

export class UpdateZoneNameDto {
  @ApiProperty({ description: '区域名称', example: '前院' })
  @IsString()
  @MaxLength(50, { message: '区域名称不能超过50个字符' })
  zoneName: string
}
