import { Module } from '@nestjs/common'

import { DatabaseService } from './database.service'
import { LoggerModule } from 'src/common/logger/logger.module'
import { LogLevel } from 'src/common/logger/logger.service'
@Module({
  imports: [
    LoggerModule.forRoot({
      level: LogLevel.DEBUG, // 根据环境变量设置
      enableFile: false,
      enableConsole: false,
    }),
  ],
  providers: [DatabaseService],
  exports: [DatabaseService], // 导出服务供其他模块使用
})
export class DatabaseModule {}
