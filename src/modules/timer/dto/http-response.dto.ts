import { ApiProperty } from '@nestjs/swagger'

/**
 * 子设备类型响应DTO
 * 用于前端展示可选的水阀类型
 */
export class SubDeviceTypeResponseDto {
  @ApiProperty({ description: '类型标识符', example: 'valve_dual' })
  type: string

  @ApiProperty({ description: '出水口数量', example: 2 })
  outletCount: number

  @ApiProperty({ description: '类型名称', example: '双出水口水阀' })
  name: string

  @ApiProperty({ description: '图标标识(约定目录/图片名称)', example: '/images/timer/valve_triple.png' })
  image?: string
}
