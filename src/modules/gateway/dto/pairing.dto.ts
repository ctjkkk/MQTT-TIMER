import { IsString, IsNotEmpty, IsOptional } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

/**
 * 绑定网关 DTO（配网后绑定到用户账号）
 */
export class BindGatewayDto {
  @ApiProperty({
    description: '网关ID（设备唯一标识）',
  })
  @IsString()
  @IsNotEmpty({ message: '网关ID不能为空' })
  gatewayId: string

  @ApiProperty({
    description: '网关名称（用户自定义，可选）',
    example: '客厅网关',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string
}

/**
 * 验证配网状态 DTO
 */
export class VerifyPairingDto {
  @ApiProperty({
    description: '网关ID',
  })
  @IsString()
  @IsNotEmpty({ message: '网关ID不能为空' })
  gatewayId: string
}

/**
 * 网关状态响应 DTO
 */
export class GatewayStatusDto {
  @ApiProperty({
    description: '网关ID',
  })
  gatewayId: string

  @ApiProperty({
    description: '是否在线（1:在线, 0:离线）',
    example: 1,
  })
  isOnline: number

  @ApiProperty({
    description: '最后在线时间',
    example: '2026-01-19T10:30:00.000Z',
  })
  lastSeen: Date

  @ApiProperty({
    description: 'WiFi信号强度',
    example: -45,
    required: false,
  })
  wifiRssi?: number

  @ApiProperty({
    description: '固件版本',
    example: '1.0.5',
    required: false,
  })
  firmwareVersion?: string
}
