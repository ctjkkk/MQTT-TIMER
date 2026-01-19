import { ApiProperty } from '@nestjs/swagger'

/**
 * 绑定网关响应 DTO
 */
export class BindGatewayResponseDto {
  @ApiProperty({ description: '网关ID', example: 'gateway_12345678' })
  gatewayId: string

  @ApiProperty({ description: '网关名称', example: '客厅网关' })
  name: string

  @ApiProperty({ description: '是否在线', example: true })
  isOnline: boolean

  @ApiProperty({ description: '提示消息', example: '网关绑定成功' })
  message: string
}

/**
 * 验证配网响应 DTO
 */
export class VerifyPairingResponseDto {
  @ApiProperty({ description: '网关ID', example: 'gateway_12345678' })
  gatewayId: string

  @ApiProperty({ description: '是否在线', example: true })
  isOnline: boolean

  @ApiProperty({ description: '提示消息', example: '网关已上线' })
  message: string
}

/**
 * 网关状态响应 DTO
 */
export class GatewayStatusResponseDto {
  @ApiProperty({ description: '网关ID', example: 'gateway_12345678' })
  gatewayId: string

  @ApiProperty({ description: '网关名称', example: '客厅网关', required: false })
  name?: string

  @ApiProperty({ description: '是否在线', example: true })
  isOnline: boolean

  @ApiProperty({ description: '最后在线时间', example: '2026-01-19T10:30:00.000Z', required: false })
  lastSeen?: Date

  @ApiProperty({ description: 'WiFi信号强度', example: -45, required: false })
  wifiRssi?: number

  @ApiProperty({ description: '固件版本', example: '1.0.5', required: false })
  firmwareVersion?: string
}

/**
 * 网关列表项 DTO
 */
export class GatewayListItemDto {
  @ApiProperty({ description: '数据库ID', example: '507f1f77bcf86cd799439011' })
  id: string

  @ApiProperty({ description: '网关ID', example: 'gateway_12345678' })
  gatewayId: string

  @ApiProperty({ description: '网关名称', example: '客厅网关' })
  name: string

  @ApiProperty({ description: '是否在线', example: 1 })
  isOnline: number

  @ApiProperty({ description: '最后在线时间', example: '2026-01-19T10:30:00.000Z', required: false })
  lastSeen?: Date

  @ApiProperty({ description: 'WiFi信号强度', example: -45, required: false })
  wifiRssi?: number

  @ApiProperty({ description: '固件版本', example: '1.0.5', required: false })
  firmwareVersion?: string

  @ApiProperty({ description: '创建时间', example: '2026-01-19T09:00:00.000Z', required: false })
  createdAt?: Date
}

/**
 * 网关列表响应 DTO
 */
export class GatewayListResponseDto {
  @ApiProperty({ type: [GatewayListItemDto], description: '网关列表' })
  data: GatewayListItemDto[]
}

/**
 * 解绑网关响应 DTO
 */
export class UnbindGatewayResponseDto {
  @ApiProperty({ description: '提示消息', example: '网关解绑成功' })
  message: string
}
