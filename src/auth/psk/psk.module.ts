import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { PskService } from './psk.service'
import { PskController } from './psk.controller'
import { LoggerModule } from '@/core/logger/logger.module'
import { LogLevel } from '@/core/logger/logger.service'
import { Psk, PskSchema } from './schema/psk.schema'

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Psk.name, schema: PskSchema }]),
    LoggerModule.forRoot({
      level: LogLevel.DEBUG, // 根据环境变量设置
      enableFile: true,
      enableConsole: false,
    }),
  ],
  controllers: [PskController],
  providers: [PskService],
  exports: [PskService],
})
export class PskModule {}
