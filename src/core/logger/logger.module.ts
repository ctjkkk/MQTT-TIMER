import { Module, Global, DynamicModule } from '@nestjs/common'
import { LoggerService } from './logger.service'
import { LoggerOptions } from './interface/logger.interface'
import { LogsViewerController } from './logs-viewer.controller'
import { LogsViewerService } from './logs-viewer.service'

@Global()
@Module({})
export class LoggerModule {
  static forRoot(options: LoggerOptions): DynamicModule {
    return {
      module: LoggerModule,
      controllers: [LogsViewerController],
      providers: [
        {
          provide: 'LOGGER_OPTIONS',
          useValue: options,
        },
        LoggerService,
        LogsViewerService,
      ],
      exports: [LoggerService, LogsViewerService],
    }
  }
}
