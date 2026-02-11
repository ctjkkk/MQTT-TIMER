import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { OtaService } from './ota.service'
import { Firmware, FirmwareSchema } from './schemas/firmware.schema'
import { UpgradeTask, UpgradeTaskSchema } from './schemas/upgrade-task.schema'

@Module({
  imports: [
    // 注册数据库模型
    MongooseModule.forFeature([
      { name: Firmware.name, schema: FirmwareSchema },
      { name: UpgradeTask.name, schema: UpgradeTaskSchema },
    ]),
  ],
  controllers: [],
  providers: [OtaService],
  exports: [OtaService], // 导出Service，让其他模块可以使用
})
export class OtaModule {}
