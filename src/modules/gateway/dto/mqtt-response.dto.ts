import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

/**
 * MQTT消息基础结构
 */
export class MqttMessageBaseDto {
  @ApiProperty({ description: '消息类型', example: 'heartbeat' })
  msgType: string

  @ApiProperty({ description: '消息ID', example: '1705734000_abc123' })
  msgId: string

  @ApiProperty({ description: '网关ID', example: 'HQ001' })
  deviceId: string

  @ApiProperty({ description: 'Unix时间戳（秒）', example: 1705734000 })
  timestamp: number
}

/**
 * 网关注册消息 - data部分
 */
export class GatewayRegisterDataDto {
  @ApiProperty({ description: '实体类型', example: 'gateway', enum: ['gateway'] })
  entityType: string

  @ApiProperty({ description: '操作类型', example: 'gateway_register' })
  action: string

  @ApiProperty({ description: '固件版本', example: '1.0.0' })
  firmwareVersion: string

  @ApiProperty({ description: 'MAC地址', example: 'AA:BB:CC:DD:EE:FF' })
  mac: string
}

/**
 * 网关注册完整消息
 */
export class GatewayRegisterMessageDto extends MqttMessageBaseDto {
  @ApiProperty({ type: GatewayRegisterDataDto })
  data: GatewayRegisterDataDto
}

/**
 * 心跳消息 - data部分
 */
export class HeartbeatDataDto {
  @ApiProperty({ description: '实体类型', example: 'gateway', enum: ['gateway'] })
  entityType: string
}

/**
 * 心跳完整消息
 */
export class HeartbeatMessageDto extends MqttMessageBaseDto {
  @ApiProperty({ type: HeartbeatDataDto })
  data: HeartbeatDataDto
}

/**
 * 网关状态上报 - data部分
 */
export class GatewayStatusDataDto {
  @ApiProperty({ description: '实体类型', example: 'gateway', enum: ['gateway'] })
  entityType: string

  @ApiProperty({ description: '是否在线', example: true })
  online: boolean

  @ApiProperty({ description: 'WiFi信号强度（dBm）', example: -45 })
  wifi_rssi: number

  @ApiProperty({ description: '固件版本', example: '1.0.0' })
  firmware: string

  @ApiPropertyOptional({ description: '内存使用率（%）', example: 45 })
  memory_usage?: number

  @ApiPropertyOptional({ description: 'CPU使用率（%）', example: 30 })
  cpu_usage?: number
}

/**
 * 网关状态完整消息
 */
export class GatewayStatusMessageDto extends MqttMessageBaseDto {
  @ApiProperty({ type: GatewayStatusDataDto })
  data: GatewayStatusDataDto
}

/**
 * 网关重启消息 - data部分
 */
export class GatewayRebootDataDto {
  @ApiProperty({ description: '实体类型', example: 'gateway', enum: ['gateway'] })
  entityType: string

  @ApiProperty({ description: '操作类型', example: 'gateway_reboot' })
  action: string

  @ApiPropertyOptional({ description: '重启原因', example: 'watchdog_reset' })
  reason?: string
}

/**
 * 网关重启完整消息
 */
export class GatewayRebootMessageDto extends MqttMessageBaseDto {
  @ApiProperty({ type: GatewayRebootDataDto })
  data: GatewayRebootDataDto
}
