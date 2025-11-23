import { Module } from '@nestjs/common'
import { PskService } from './psk.service'
import { PskController } from './psk.controller'
import { LoggerModule } from '../../common/logger/logger.module'
import { LogLevel } from '@/common/logger/logger.service'
import { DatabaseModule } from '@/core/database/database.module'

@Module({
  imports: [
    LoggerModule.forRoot({
      level: LogLevel.DEBUG, // 根据环境变量设置
      enableFile: true,
      enableConsole: false,
    }),
    DatabaseModule,
  ],
  controllers: [PskController],
  providers: [PskService],
  exports: [PskService],
})
export class PskModule {}
