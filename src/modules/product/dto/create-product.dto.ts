import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString, IsNumber, IsUrl } from 'class-validator'
export class CreateProductDto {
  @ApiProperty({ description: 'Product ID', example: 'fdekfvdlkmqyslqr' })
  @IsNotEmpty({ message: 'The PID cannot be empty.' })
  @IsString({ message: 'The PID must be a string.' })
  productId: string

  @ApiProperty({ description: 'Product name', example: 'HQ2026-3 Channel 433 Valve' })
  @IsNotEmpty({ message: 'The name cannot be empty.' })
  @IsString({ message: 'The name must be a string.' })
  name: string

  @ApiProperty({ description: 'Product image URL' })
  @IsUrl({}, { message: 'The imageUrl must be a valid URL.' })
  imageUrl: string

  @ApiProperty({ description: 'Product description', example: 'Smart 433 valve with 3 outlets, suitable for large gardens' })
  @IsString({ message: 'The description must be a string.' })
  description: string

  @ApiProperty({ description: 'Number of outlets', example: 3 })
  @IsNumber({}, { message: 'The channelCount must be a number.' })
  channelCount: number
}
