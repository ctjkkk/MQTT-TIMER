import { ApiProperty } from '@nestjs/swagger'

/**
 * Channel Response DTO
 * Used for API channel information responses
 */
export class ChannelResponseDto {
  @ApiProperty({ description: 'User-defined zone name', example: 'Front Yard' })
  zone_name: string

  @ApiProperty({ description: 'Current switch status (0: off, 1: running)', example: 0, enum: [0, 1] })
  is_running: number

  @ApiProperty({ description: 'Work state', enum: ['manual', 'timing', 'spray', 'idle'], example: 'idle' })
  work_state: string

  @ApiProperty({ description: 'Remaining countdown (seconds)', example: 0 })
  remaining_countdown: number

  @ApiProperty({ description: 'Irrigation duration (seconds)', example: 300 })
  irrigation_duration: number

  @ApiProperty({ description: 'Next scheduled run time', example: '2026-02-09T06:00:00Z', required: false, nullable: true })
  next_run_time: Date | null

  @ApiProperty({ description: 'Timer configuration (raw DP data)', example: '', required: false })
  timer_config: string

  @ApiProperty({ description: 'Weather skip enabled (0: disabled, 1: enabled)', example: 0, enum: [0, 1] })
  weather_skip_enabled: number
}
