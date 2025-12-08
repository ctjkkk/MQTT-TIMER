import { Module, Global, DynamicModule } from '@nestjs/common'
import { LoggerService } from './logger.service'
import { LoggerOptions } from './interface/logger.interface'

@Global()
@Module({})
export class LoggerModule {
  static forRoot(options: LoggerOptions): DynamicModule {
    return {
      module: LoggerModule,
      providers: [
        {
          provide: 'LOGGER_OPTIONS',
          useValue: options,
        },
        LoggerService,
      ],
      exports: [LoggerService],
    }
  }
}
