import { ChannelResponseDto } from '@/modules/channel/dto/channel.response.dto'
import { ApiProperty } from '@nestjs/swagger'

export class SubDeviceListResponseDto {
  @ApiProperty({ description: '子设备名称', example: '' })
  name: string

  @ApiProperty({ description: '子设备id', example: 'SUB_YSWDVQ' })
  timerId: string

  @ApiProperty({ description: '用户id', example: '68ec5cd4cdeec7e3e926ae25' })
  userId: string

  @ApiProperty({ description: '网关id', example: '30eda00a0e38' })
  gatewayId: string

  @ApiProperty({ description: '在线状态，1为在线，0为离线', example: 1 })
  online: number

  @ApiProperty({ description: '子设备是否可用', example: 1 })
  status: number

  @ApiProperty({ description: '最后在线时间的ISO字符串', example: '2026-02-02T06:04:02.398+00:00' })
  last_seen: Date
}

// 子设备详情响应DTO（包含通道信息）
export class SubDeviceInfoResponseDto extends SubDeviceListResponseDto {
  @ApiProperty({ description: '通道数量', example: 2, minimum: 1, maximum: 4 })
  channel_count: number

  @ApiProperty({ description: '固件版本', example: '1.0.0' })
  firmware_version: string

  @ApiProperty({ description: '电池电量（百分比）', example: 85, minimum: 0, maximum: 100 })
  battery_level: number

  @ApiProperty({ description: '信号强度（dBm）', example: -65 })
  signal_strength: number

  @ApiProperty({ description: '最后一次DP更新时间', example: '2026-02-08T16:30:00Z', nullable: true })
  last_dp_update: Date

  @ApiProperty({ description: '通道列表', type: [ChannelResponseDto], isArray: true })
  channels: ChannelResponseDto[]
}
