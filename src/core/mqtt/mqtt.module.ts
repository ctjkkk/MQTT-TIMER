import { Global, Module } from '@nestjs/common'
import { AedesBrokerService } from './mqtt-broker.service'
import { MqttScannerService } from './mqtt-scanner.service'
import { LoggerModule } from '@/core/logger/logger.module'
import { LogLevel } from '@/core/logger/logger.service'
import { PskModule } from '@/auth/psk/psk.module'

@Global()
@Module({
  imports: [
    LoggerModule.forRoot({
      level: LogLevel.DEBUG, // 根据环境变量设置
      enableFile: true,
      enableConsole: true,
    }),
    PskModule,
  ],
  providers: [AedesBrokerService, MqttScannerService],
  exports: [AedesBrokerService, MqttScannerService],
})
export class MqttModule {}
