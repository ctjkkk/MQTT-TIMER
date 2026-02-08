import { ApiProperty } from '@nestjs/swagger'
import { IsNumber, IsIn } from 'class-validator'

export class UpdateWeatherSkipDto {
  @ApiProperty({ description: '是否启用天气跳过', example: 1, enum: [0, 1] })
  @IsNumber()
  @IsIn([0, 1], { message: 'enabled必须是0或1' })
  enabled: number
}
