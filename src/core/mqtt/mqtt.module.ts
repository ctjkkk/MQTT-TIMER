import { Global, Module } from '@nestjs/common'
import { AedesBrokerService } from './mqtt-broker.service'
import { MqttScannerService } from './mqtt-scanner.service'
import { LoggerModule } from '../../common/logger/logger.module'
import { LogLevel } from 'src/common/logger/logger.service'
import { PskModule } from '@/modules/psk/psk.module'

@Global()
@Module({
  imports: [
    LoggerModule.forRoot({
      level: LogLevel.DEBUG, // 根据环境变量设置
      enableFile: true,
      enableConsole: false,
    }),

    PskModule,
  ],
  providers: [AedesBrokerService, MqttScannerService],
  exports: [AedesBrokerService, MqttScannerService],
})
export class MqttModule {}
