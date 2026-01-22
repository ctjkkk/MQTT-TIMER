import { ApiProperty } from '@nestjs/swagger'

/**
 * 生成PSK响应 DTO
 */
export class GeneratePskResponseDto {
  @ApiProperty({
    description: 'MQTT连接用户名 (PSK身份标识，即MAC地址)',
    example: 'A1B2C3D4E5F6',
  })
  identity: string

  @ApiProperty({
    description: 'MQTT连接密码 (PSK密钥，128位十六进制字符串)',
    example: 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890ab',
  })
  key: string
}

/**
 * 确认PSK响应 DTO
 */
export class ConfirmPskResponseDto {
  @ApiProperty({
    description: '提示信息',
    example: 'PSK烧录确认成功',
  })
  tip: string
}
