import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { GatewayModule } from './modules/gateway/gateway.module'
import { TimerModule } from './modules/timer/timer.module'
import { OutletModule } from './modules/outlet/outlet.module'
import { ScheduleModule } from './modules/schedule/schedule.module'
import { MqttModule } from './core/mqtt/mqtt.module'
import { DatabaseModule } from './core/database/database.module'
import { PskModule } from '@/auth/psk/psk.module'
import { mongodbConfig, redisConfig } from '@/core/database'
import mqttConfig from '@/core/config/mqtt.config'
import { LoggerMiddleware } from '@/core/logger/logger.middleware'
import { SyncModule } from '@/core/sync/sync.module'
import { UserModule } from './modules/user/user.module'

@Module({
  imports: [
    // 配置模块（全局）
    ConfigModule.forRoot({
      isGlobal: true,
      load: [mongodbConfig, redisConfig, mqttConfig],
      envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`],
    }),

    // 数据库模块（包含 MongoDB 和 Redis）
    DatabaseModule,

    // 事件驱动模块（全局）
    EventEmitterModule.forRoot({
      wildcard: true, // 支持通配符 'mqtt.*'
      delimiter: '.', // 事件名分隔符
      maxListeners: 20, // 每个事件最多20个监听器
      verboseMemoryLeak: true, // 内存泄漏警告
    }),

    // 业务模块
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
