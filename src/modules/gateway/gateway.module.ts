import { Module } from '@nestjs/common'
import { GatewayController } from './gateway.controller'
import { GatewayService } from './gateway.service'
import { MqttModule } from '../../core/mqtt/mqtt.module' // 关键 - 确保正确导入MQTT模块

@Module({
  imports: [MqttModule],
  controllers: [GatewayController],
  providers: [GatewayService],
})
export class GatewayModule {}
