import { ChannelResponseDto } from '@/modules/channel/dto/channel.response.dto'
import { ApiProperty } from '@nestjs/swagger'

export class SubDeviceListResponseDto {
  @ApiProperty({ description: 'Sub-device name', example: '' })
  name: string

  @ApiProperty({ description: 'Sub-device ID', example: 'SUB_YSWDVQ' })
  timerId: string

  @ApiProperty({ description: 'User ID', example: '68ec5cd4cdeec7e3e926ae25' })
  userId: string

  @ApiProperty({ description: 'Gateway ID', example: '30eda00a0e38' })
  gatewayId: string

  @ApiProperty({ description: 'Online status (1: online, 0: offline)', example: 1 })
  online: number

  @ApiProperty({ description: 'Sub-device availability status', example: 1 })
  status: number

  @ApiProperty({ description: 'Last seen time (ISO string)', example: '2026-02-02T06:04:02.398+00:00' })
  last_seen: Date
}

// Sub-device details response DTO (includes channel information)
export class SubDeviceInfoResponseDto extends SubDeviceListResponseDto {
  @ApiProperty({ description: 'Number of channels', example: 2, minimum: 1, maximum: 4 })
  channel_count: number

  @ApiProperty({ description: 'Firmware version', example: '1.0.0' })
  firmware_version: string

  @ApiProperty({ description: 'Battery level (percentage)', example: 85, minimum: 0, maximum: 100 })
  battery_level: number

  @ApiProperty({ description: 'Signal strength (dBm)', example: -65 })
  signal_strength: number

  @ApiProperty({ description: 'Last DP update time', example: '2026-02-08T16:30:00Z', nullable: true })
  last_dp_update: Date

  @ApiProperty({ description: 'Channel list', type: [ChannelResponseDto], isArray: true })
  channels: ChannelResponseDto[]
}
