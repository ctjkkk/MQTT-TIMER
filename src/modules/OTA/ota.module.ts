import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { OtaService } from './ota.service'
import { OtaMqttMonitor } from './ota.mqtt'
import { Firmware, FirmwareSchema } from './schemas/firmware.schema'
import { UpgradeTask, UpgradeTaskSchema } from './schemas/upgrade-task.schema'
import { Gateway, GatewaySchema } from '@/modules/gateway/schema/gateway.schema'
import { OtaController } from './ota.controller'
import { MqttModule } from '@/core/mqtt/mqtt.module'

@Module({
  imports: [
    // 注册数据库模型
    MongooseModule.forFeature([
      { name: Firmware.name, schema: FirmwareSchema },
      { name: UpgradeTask.name, schema: UpgradeTaskSchema },
      { name: Gateway.name, schema: GatewaySchema },
    ]),
    // 导入 MQTT 模块（用于发送升级命令）
    MqttModule,
  ],
  controllers: [OtaController],
  providers: [OtaService, OtaMqttMonitor],
  exports: [OtaService],
})
export class OtaModule {}
