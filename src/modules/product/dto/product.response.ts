import { ApiProperty } from '@nestjs/swagger'

export class ProductHttpResponse {
  @ApiProperty({ description: '产品ID', example: 'fdekfvdlkmqyslqr' })
  productId: string

  @ApiProperty({ description: '产品名称', example: 'HQ2026-3路433水阀' })
  name: string

  @ApiProperty({ description: '产品图片URL' })
  imageUrl: string

  @ApiProperty({ description: '产品描述', example: '支持3个出水口的433智能水阀，适用于大型花园' })
  description: string

  @ApiProperty({ description: '出水口数量', example: 3 })
  outletCount: number

  @ApiProperty({ description: '默认固件版本', example: '1.0.0' })
  defaultFirmwareVersion: string

  @ApiProperty({ description: '默认电池电量百分比', example: 100 })
  defaultBatteryLevel: number
}

export class SingleProductHttpResponse extends ProductHttpResponse {
  @ApiProperty({ description: '是否启用 (1:启用/0:弃用)', example: 1 })
  enabled: number
}
