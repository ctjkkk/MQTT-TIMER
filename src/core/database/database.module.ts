import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { DatabaseService } from './database.service'
import mongoose from 'mongoose'
export const DATABASE_CONNECTION = Symbol('DATABASE_CONNECTION')
@Module({
  providers: [
    /* 异步提供者：等待原生连接 ready */
    {
      provide: DATABASE_CONNECTION,
      inject: [ConfigService],
      // Nest 在实例化任何消费者（PskService、DatabaseService…）之前，会先等待所有异步工厂的 Promise 完成。
      useFactory: async (configService: ConfigService) => {
        const { host, options } = configService.get('database')
        await mongoose.connect(host, options) // 先连库
        return mongoose.connection // 返回已就绪连接
      },
    },
    DatabaseService,
  ],
  exports: [DatabaseService, DATABASE_CONNECTION], // 导出服务供其他模块使用
})
export class DatabaseModule {}
