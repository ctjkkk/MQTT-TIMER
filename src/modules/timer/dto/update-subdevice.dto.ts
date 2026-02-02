import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

export class RenameSubDeviceDto {
  @ApiProperty({
    description: '子设备ID',
    example: 'SUB_A3F2E1',
  })
  @IsNotEmpty({ message: '子设备ID不能为空' })
  @IsString({ message: '子设备ID必须是字符串' })
  timerId: string

  @ApiProperty({
    description: '新的子设备名称',
    example: '客厅水阀',
  })
  @IsNotEmpty({ message: '名称不能为空' })
  @IsString({ message: '名称必须是字符串' })
  name: string
}
