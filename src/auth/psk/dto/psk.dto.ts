import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString, Length } from 'class-validator'
export class GeneratePskDto {
  @ApiProperty({
    description: '设备 MAC 地址/唯一标识',
    example: 'A1B2C3D4E5F6',
    minLength: 6,
    maxLength: 32,
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 32)
  mac: string
}

export class ConfirmPskDto {
  @ApiProperty({
    description: '烧录成功后的mac地址',
    example: 'A1B2C3D4E5F6',
    minLength: 6,
    maxLength: 32,
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 32)
  mac: string
}
