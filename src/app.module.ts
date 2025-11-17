import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { GatewayModule } from './modules/gateway/gateway.module'
import { TimerService } from './modules/timer/timer.service'
import { TimerController } from './modules/timer/timer.controller'
import { TimerModule } from './modules/timer/timer.module'
import { OutletController } from './modules/outlet/outlet.controller'
import { OutletModule } from './modules/outlet/outlet.module'
import { ScheduleController } from './modules/schedule/schedule.controller'
import { ScheduleModule } from './modules/schedule/schedule.module'
import { DatabaseService } from './core/database/database.service'
import { DatabaseModule } from './core/database/database.module'
import { MqttModule } from './core/mqtt/mqtt.module'
import databaseConfig from './config/database.config'
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
      envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`],
    }),
    MqttModule,
    GatewayModule,
    TimerModule,
    OutletModule,
    ScheduleModule,
    DatabaseModule,
  ],
  controllers: [AppController, TimerController, OutletController, ScheduleController],
  providers: [AppService, TimerService, DatabaseService],
})
export class AppModule {}
