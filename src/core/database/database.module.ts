import { Module } from '@nestjs/common'

import { DatabaseService } from './database.service'

@Module({
  providers: [DatabaseService],
  exports: [DatabaseService], // 导出服务供其他模块使用
})
export class DatabaseModule {}
