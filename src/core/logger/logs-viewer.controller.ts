import { Controller, Get, Query, Res, UseInterceptors } from '@nestjs/common'
import { LogsViewerService } from './logs-viewer.service'
import type { Response } from 'express'
import { LogsResponse } from '@/common/interceptors/transform.interceptor'
import { ApiExcludeController } from '@nestjs/swagger'

@Controller('logs')
@ApiExcludeController()
@UseInterceptors(LogsResponse()) // 使用自定义响应拦截器统一处理响应格式
export class LogsViewerController {
  constructor(private readonly logsViewerService: LogsViewerService) {}

  @Get()
  async getLogsPage(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    return res.redirect('/logs/index.html')
  }

  @Get('api/files')
  async getLogFiles() {
    return this.logsViewerService.getLogFiles()
  }

  @Get('api/file')
  async readLogFile(@Query('filename') filename: string, @Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.logsViewerService.readLogFile(filename, limit ? parseInt(limit) : 500, offset ? parseInt(offset) : 0)
  }

  @Get('api/recent')
  async getRecentLogs(@Query('type') type?: string, @Query('limit') limit?: string) {
    return this.logsViewerService.getRecentLogs(type, limit ? parseInt(limit) : 100)
  }

  @Get('api/search')
  async searchLogs(@Query('keyword') keyword: string, @Query('type') type?: string, @Query('limit') limit?: string) {
    return this.logsViewerService.searchLogs(keyword, type, limit ? parseInt(limit) : 100)
  }

  @Get('api/stats')
  async getLogStats() {
    return this.logsViewerService.getLogStats()
  }
}
