import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { PskService } from './psk.service'
import { PskController } from './psk.controller'
import { LoggerModule } from '../../common/logger/logger.module'
import { LogLevel } from '@/common/logger/logger.service'
import { HanqiPsk, HanqiPskSchema } from './schema/psk.schema'

@Module({
  imports: [
    MongooseModule.forFeature([{ name: HanqiPsk.name, schema: HanqiPskSchema }]),
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
