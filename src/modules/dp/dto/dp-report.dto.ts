import { IsString, IsObject, IsOptional, IsNumber, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

/**
 * MQTT 上报消息 DTO
 *
 * 对应涂鸦标准的设备上报格式
 */
export class DpReportDto {
  @IsOptional()
  @IsString()
  msgId?: string

  @IsString()
  deviceId: string

  @IsOptional()
  @IsNumber()
  t?: number

  @IsObject()
  dps: Record<string, any> | Array<{ dpId: number; value: any }>

  // 内部字段（由管道注入）
  productId?: string
}

/**
 * 单个 DP 数据 DTO
 */
export class SingleDpDto {
  @IsNumber()
  dpId: number

  value: any
}

/**
 * DP 命令 DTO（下发给设备）
 */
export class DpCommandDto {
  @IsString()
  msgId: string

  @IsString()
  deviceId: string

  @IsNumber()
  t: number

  @IsObject()
  dps: Record<string, any>
}
