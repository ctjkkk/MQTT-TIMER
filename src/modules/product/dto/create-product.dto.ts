import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString, IsNumber, IsUrl } from 'class-validator'
export class CreateProductDto {
  @ApiProperty({ description: '产品ID', example: 'fdekfvdlkmqyslqr' })
  @IsNotEmpty({ message: 'The PID cannot be empty.' })
  @IsString({ message: 'The PID must be a string.' })
  productId: string

  @ApiProperty({ description: '产品名称', example: 'HQ2026-3路433水阀' })
  @IsNotEmpty({ message: 'The name cannot be empty.' })
  @IsString({ message: 'The name must be a string.' })
  name: string

  @ApiProperty({ description: '产品图片URL' })
  @IsUrl({}, { message: 'The imageUrl must be a valid URL.' })
  imageUrl: string

  @ApiProperty({ description: '产品描述', example: '支持3个出水口的433智能水阀，适用于大型花园' })
  @IsString({ message: 'The description must be a string.' })
  description: string

  @ApiProperty({ description: '出水口数量', example: 3 })
  @IsNumber({}, { message: 'The channelCount must be a number.' })
  channelCount: number
}
