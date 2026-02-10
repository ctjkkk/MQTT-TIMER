import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

export class RenameSubDeviceDto {
  @ApiProperty({
    description: 'Sub-device ID',
    example: 'SUB_A3F2E1',
  })
  @IsNotEmpty({ message: 'Sub-device ID cannot be empty' })
  @IsString({ message: 'Sub-device ID must be a string' })
  timerId: string

  @ApiProperty({
    description: 'New sub-device name',
    example: 'Living Room Valve',
  })
  @IsNotEmpty({ message: 'Name cannot be empty' })
  @IsString({ message: 'Name must be a string' })
  name: string
}
