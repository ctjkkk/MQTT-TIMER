import { ApiProperty } from '@nestjs/swagger'

/**
 * 通道响应DTO
 * 用于API返回通道信息
 */
export class ChannelResponseDto {
  @ApiProperty({ description: '用户自定义区域名称', example: '前院' })
  zone_name: string

  @ApiProperty({ description: '当前开关状态（0=关闭，1=运行）', example: 0, enum: [0, 1] })
  is_running: number

  @ApiProperty({ description: '工作状态', enum: ['manual', 'timing', 'spray', 'idle'], example: 'idle' })
  work_state: string

  @ApiProperty({ description: '剩余运行倒计时（秒）', example: 0 })
  remaining_countdown: number

  @ApiProperty({ description: '设置的灌溉时长（秒）', example: 300 })
  irrigation_duration: number

  @ApiProperty({ description: '下次定时运行时间', example: '2026-02-09T06:00:00Z', required: false, nullable: true })
  next_run_time: Date | null

  @ApiProperty({ description: '定时任务配置（原始DP数据）', example: '', required: false })
  timer_config: string

  @ApiProperty({ description: '是否启用天气跳过（0=禁用，1=启用）', example: 0, enum: [0, 1] })
  weather_skip_enabled: number
}
