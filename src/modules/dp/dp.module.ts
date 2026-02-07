import { Global, Module } from '@nestjs/common'
import { DpService } from './dp.service'
import { ParseDpReportPipe } from './pipes/parse-dp-report.pipe'

/**
 * DP 模块
 *
 * 职责：
 * - 管理涂鸦 DP 点的配置和定义（DpConfigService）
 * - 解析和验证 MQTT 上报数据（ParseDpReportPipe）
 * - 构建和验证 MQTT 下发命令（DpConfigService.buildCommand）
 *
 * 设计理念：
 * - Service：配置查询 + 命令构建
 * - Pipe：上报解析 + 验证
 * - 简洁高效，符合 NestJS 风格
 */
@Global()
@Module({
  providers: [
    DpService, // DP 配置 + 命令构建
    ParseDpReportPipe, // 上报解析
  ],
  exports: [DpService, ParseDpReportPipe],
})
export class DpModule {}
