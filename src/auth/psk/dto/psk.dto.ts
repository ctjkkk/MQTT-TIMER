import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString, Length } from 'class-validator'
export class GeneratePskDto {
  @ApiProperty({
    description: 'Device MAC address/unique identifier',
    example: 'A1B2C3D4E5F6',
    minLength: 6,
    maxLength: 32,
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 32)
  mac: string
}

export class ConfirmPskDto {
  @ApiProperty({
    description: 'MAC address after successful burning',
    example: 'A1B2C3D4E5F6',
    minLength: 6,
    maxLength: 32,
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 32)
  mac: string
}
