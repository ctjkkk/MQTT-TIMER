import { OtaModule } from './modules/OTA/ota.module'
import { OtaController } from './modules/OTA/ota.controller'
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { JwtModule } from '@nestjs/jwt'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { GatewayModule } from './modules/gateway/gateway.module'
import { TimerModule } from './modules/timer/timer.module'
import { ChannelModule } from './modules/channel/channel.module'
import { ScheduleModule } from './modules/schedule/schedule.module'
import { MqttModule } from './core/mqtt/mqtt.module'
import { DatabaseModule } from './core/database/database.module'
import { PskModule } from '@/auth/psk/psk.module'
import { mongodbConfig, redisConfig } from '@/core/database'
import mqttConfig from '@/core/config/mqtt.config'
import { LoggerMiddleware } from '@/core/logger/logger.middleware'
import { SyncModule } from '@/core/sync/sync.module'
import { UserModule } from './modules/user/user.module'
import { ProductModule } from './modules/product/product.module'
import { DpModule } from './modules/dp/dp.module'

@Module({
  imports: [
    // 配置模块（全局）
    ConfigModule.forRoot({
      isGlobal: true,
      load: [mongodbConfig, redisConfig, mqttConfig],
      envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`],
    }),

    // JWT 认证模块（全局）
    JwtModule.registerAsync({
      global: true, // 设置为全局模块，所有模块都可以使用 JwtService
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: '365d' },
      }),
      inject: [ConfigService],
    }),

    // 数据库模块（包含 MongoDB 和 Redis）
    DatabaseModule,

    // DP 模块（全局）- 管理涂鸦 DP 点配置
    DpModule,

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
    ChannelModule,
    ScheduleModule,
    PskModule,
    SyncModule,
    UserModule,
    ProductModule,
    OtaModule,
  ],
  controllers: [OtaController, AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*')
  }
}
