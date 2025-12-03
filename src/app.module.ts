import { MiddlewareConsumer, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { GatewayModule } from './modules/gateway/gateway.module'
import { TimerModule } from './modules/timer/timer.module'
import { OutletModule } from './modules/outlet/outlet.module'
import { ScheduleModule } from './modules/schedule/schedule.module'
import { DatabaseModule } from './core/database/database.module'
import { MqttModule } from './core/mqtt/mqtt.module'
import { PskModule } from './modules/psk/psk.module'
import databaseConfig from './config/database.config'
import mqttConfig from './config/mqtt.config'
import { LoggerMiddleware } from '@/common/logger/logger.middleware'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, mqttConfig],
      envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`],
    }),
    MqttModule,
    GatewayModule,
    TimerModule,
    OutletModule,
    ScheduleModule,
    DatabaseModule,
    PskModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*') // 监控所有路由
  }
}
