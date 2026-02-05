import { ApiProperty } from '@nestjs/swagger'

export class SubDeviceListResponseDto {
  @ApiProperty({ description: '网关id' })
  gatewayId: string

  @ApiProperty({ description: '用户id' })
  userId: string

  @ApiProperty({ description: '子设备id' })
  timerId: string

  @ApiProperty({ description: '子设备名称' })
  name: string

  @ApiProperty({ description: '子设备状态' })
  status: number

  @ApiProperty({ description: '最后在线时间的ISO字符串' })
  lastSeen: Date

  @ApiProperty({ description: '在线状态，1为在线，0为离线' })
  online: number
}
