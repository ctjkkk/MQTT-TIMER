import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common'
import { AppService } from './app.service'
import { ApiExcludeController } from '@nestjs/swagger'

@ApiExcludeController()
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello()
  }

  @Get('health')
  @HttpCode(HttpStatus.OK)
  health(): { status: string; timestamp: string } {
    return { status: 'ok', timestamp: new Date().toISOString() }
  }
}
