import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

/**
 * MQTT Message Base Structure
 */
export class MqttMessageBaseDto {
  @ApiProperty({ description: 'Message type', example: 'heartbeat' })
  msgType: string

  @ApiProperty({ description: 'Message ID', example: '1705734000_abc123' })
  msgId: string

  @ApiProperty({ description: 'Gateway ID', example: 'HQ001' })
  deviceId: string

  @ApiProperty({ description: 'Unix timestamp (seconds)', example: 1705734000 })
  timestamp: number
}

/**
 * Gateway Register Message - data part
 */
export class GatewayRegisterDataDto {
  @ApiProperty({ description: 'Entity type', example: 'gateway', enum: ['gateway'] })
  entityType: string

  @ApiProperty({ description: 'Action type', example: 'gateway_register' })
  action: string

  @ApiProperty({ description: 'Firmware version', example: '1.0.0' })
  firmwareVersion: string

  @ApiProperty({ description: 'MAC address', example: 'AA:BB:CC:DD:EE:FF' })
  mac: string
}

/**
 * Gateway Register Complete Message
 */
export class GatewayRegisterMessageDto extends MqttMessageBaseDto {
  @ApiProperty({ type: GatewayRegisterDataDto })
  data: GatewayRegisterDataDto
}

/**
 * Heartbeat Message - data part
 */
export class HeartbeatDataDto {
  @ApiProperty({ description: 'Entity type', example: 'gateway', enum: ['gateway'] })
  entityType: string
}

/**
 * Heartbeat Complete Message
 */
export class HeartbeatMessageDto extends MqttMessageBaseDto {
  @ApiProperty({ type: HeartbeatDataDto })
  data: HeartbeatDataDto
}

/**
 * Gateway Status Report - data part
 */
export class GatewayStatusDataDto {
  @ApiProperty({ description: 'Entity type', example: 'gateway', enum: ['gateway'] })
  entityType: string

  @ApiProperty({ description: 'Online status', example: true })
  online: boolean

  @ApiProperty({ description: 'WiFi signal strength (dBm)', example: -45 })
  wifi_rssi: number

  @ApiProperty({ description: 'Firmware version', example: '1.0.0' })
  firmware: string

  @ApiPropertyOptional({ description: 'Memory usage (%)', example: 45 })
  memory_usage?: number

  @ApiPropertyOptional({ description: 'CPU usage (%)', example: 30 })
  cpu_usage?: number
}

/**
 * Gateway Status Complete Message
 */
export class GatewayStatusMessageDto extends MqttMessageBaseDto {
  @ApiProperty({ type: GatewayStatusDataDto })
  data: GatewayStatusDataDto
}

/**
 * Gateway Reboot Message - data part
 */
export class GatewayRebootDataDto {
  @ApiProperty({ description: 'Entity type', example: 'gateway', enum: ['gateway'] })
  entityType: string

  @ApiProperty({ description: 'Action type', example: 'gateway_reboot' })
  action: string

  @ApiPropertyOptional({ description: 'Reboot reason', example: 'watchdog_reset' })
  reason?: string
}

/**
 * 网关重启完整消息
 */
export class GatewayRebootMessageDto extends MqttMessageBaseDto {
  @ApiProperty({ type: GatewayRebootDataDto })
  data: GatewayRebootDataDto
}
