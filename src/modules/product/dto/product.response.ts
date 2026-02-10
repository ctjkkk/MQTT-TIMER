import { ApiProperty } from '@nestjs/swagger'

export class ProductHttpResponse {
  @ApiProperty({ description: 'Product ID', example: 'fdekfvdlkmqyslqr' })
  productId: string

  @ApiProperty({ description: 'Product name', example: 'HQ2026-3 Channel 433 Valve' })
  name: string

  @ApiProperty({ description: 'Product image URL' })
  imageUrl: string

  @ApiProperty({ description: 'Product description', example: 'Smart 433 valve with 3 outlets, suitable for large gardens' })
  description: string

  @ApiProperty({ description: 'Number of outlets', example: 3 })
  channelCount: number

  @ApiProperty({ description: 'Default firmware version', example: '1.0.0' })
  defaultFirmwareVersion: string

  @ApiProperty({ description: 'Default battery level (percentage)', example: 100 })
  defaultBatteryLevel: number
}

export class SingleProductHttpResponse extends ProductHttpResponse {
  @ApiProperty({ description: 'Enabled status (1: enabled, 0: disabled)', example: 1 })
  enabled: number
}
