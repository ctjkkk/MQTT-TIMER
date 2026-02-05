/**
 * DP 模块统一导出
 */

// 模块
export { DpModule } from './dp.module'

// Service
export { DpConfigService } from './dp.service'

// Pipe
export { ParseDpReportPipe } from './pipes/parse-dp-report.pipe'
export type { ParsedDpReport } from './pipes/parse-dp-report.pipe'

// DTO
export * from './dto/dp-report.dto'

// Types
export * from './types/dp.types'
export * from './constants/product.schemas'
