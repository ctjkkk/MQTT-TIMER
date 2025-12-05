import { MiddlewareConsumer, Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { MongooseModule } from '@nestjs/mongoose'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { GatewayModule } from './modules/gateway/gateway.module'
import { TimerModule } from './modules/timer/timer.module'
import { OutletModule } from './modules/outlet/outlet.module'
import { ScheduleModule } from './modules/schedule/schedule.module'
import { MqttModule } from './core/mqtt/mqtt.module'
import { PskModule } from './modules/psk/psk.module'
import databaseConfig from './config/database.config'
import mqttConfig from './config/mqtt.config'
import { LoggerMiddleware } from '@/common/logger/logger.middleware'
import { SyncModule } from './modules/sync/sync.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, mqttConfig],
      envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`],
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const { host, options } = configService.get('database')
        return {
          uri: host,
          ...options,
        }
      },
    }),
    MqttModule,
    GatewayModule,
    TimerModule,
    OutletModule,
    ScheduleModule,
    PskModule,
    SyncModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*path') // 监控所有路由
  }
}
