import { ApiProperty } from '@nestjs/swagger'

/**
 * 绑定网关响应 DTO
 */
export class BindGatewayResponseDto {
  @ApiProperty({ description: '网关ID', example: 'gateway_12345678' })
  gatewayId: string

  @ApiProperty({ description: '网关名称', example: '客厅网关' })
  name: string

  @ApiProperty({ description: '是否在线', example: 1 })
  isOnline: number

  @ApiProperty({ description: '提示消息', example: '网关绑定成功' })
  message: string
}

/**
 * 验证配网响应 DTO
 */
export class VerifyPairingResponseDto {
  @ApiProperty({ description: '网关是否存在', example: true })
  exists: boolean

  @ApiProperty({ description: '是否在线', example: true })
  isOnline: string

  @ApiProperty({ description: '是否绑定用户', example: true })
  isBound: boolean

  @ApiProperty({ description: '该网关绑定的用户id', example: '68ec5cd4cdeec7e3e926ae25' })
  userId: string

  @ApiProperty({ description: '网关名称', example: '客厅网关' })
  name: string
}

/**
 * 网关状态响应 DTO
 */
export class GatewayStatusResponseDto {
  @ApiProperty({ description: '网关ID', example: 'gateway_12345678' })
  gatewayId: string

  @ApiProperty({ description: '网关名称', example: '客厅网关', required: false })
  name?: string

  @ApiProperty({ description: '是否在线', example: 1 })
  isOnline: number

  @ApiProperty({ description: '是否绑定用户', example: 1 })
  isBind: number

  @ApiProperty({ description: '最后在线时间', example: '2026-01-19T10:30:00.000Z', required: false })
  lastSeen?: Date

  @ApiProperty({ description: 'WiFi信号强度', example: -45, required: false })
  wifiRssi?: number

  @ApiProperty({ description: '固件版本', example: '1.0.5', required: false })
  firmwareVersion?: string
}

/**
 * 解绑网关响应 DTO
 */
export class UnbindGatewayResponseDto {
  @ApiProperty({ description: '提示消息', example: '网关解绑成功' })
  message: string
}
