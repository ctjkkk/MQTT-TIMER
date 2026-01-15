import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { MongooseModule } from '@nestjs/mongoose'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { GatewayModule } from './modules/gateway/gateway.module'
import { TimerModule } from './modules/timer/timer.module'
import { OutletModule } from './modules/outlet/outlet.module'
import { ScheduleModule } from './modules/schedule/schedule.module'
import { MqttModule } from './core/mqtt/mqtt.module'
import { PskModule } from '@/auth/psk/psk.module'
import databaseConfig from '@/core/config/database.config'
import mqttConfig from '@/core/config/mqtt.config'
import { LoggerMiddleware } from '@/core/logger/logger.middleware'
import { SyncModule } from '@/core/sync/sync.module'
import { UserModule } from './modules/user/user.module';

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
    // 事件驱动模块（全局）
    EventEmitterModule.forRoot({
      wildcard: true, // 支持通配符 'mqtt.*'
      delimiter: '.', // 事件名分隔符
      maxListeners: 20, // 每个事件最多20个监听器
      verboseMemoryLeak: true, // 内存泄漏警告
    }),

    MqttModule,
    GatewayModule,
    TimerModule,
    OutletModule,
    ScheduleModule,
    PskModule,
    SyncModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*')
  }
}
