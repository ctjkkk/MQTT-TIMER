import { Global, Module } from '@nestjs/common'
import { MqttBrokerService } from './services/mqttBroker.service'
import { MqttScannerService } from './services/mqttScanner.service'
import { LoggerModule } from '@/core/logger/logger.module'
import { LogLevel } from '@/core/logger/logger.service'
import { PskModule } from '@/auth/psk/psk.module'
import { MqttDispatchService } from './services/mqttDispatch.service'
import { PskAuthStrategy } from './authentication/psk.strategy'
import { TcpAuthStrategy } from './authentication/tcp.strategy'
import { MqttClientManagerService } from './services/mqttClientManager.service'
import { MqttPublishService } from './services/mqttPublish.service'
import { CommandSenderService } from './services/commandSender.service'

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
  providers: [
    MqttBrokerService,
    MqttScannerService,
    MqttDispatchService,
    PskAuthStrategy,
    TcpAuthStrategy,
    MqttClientManagerService,
    MqttPublishService,
    CommandSenderService,
  ],
  exports: [MqttBrokerService, MqttScannerService, MqttDispatchService, CommandSenderService],
})
export class MqttModule {}
