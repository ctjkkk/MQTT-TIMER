import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { ConfigService } from '@nestjs/config'

/**
 * MongoDB 数据库模块
 * 封装 Mongoose 连接配置
 */
@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const { host, options } = configService.get('mongodb')
        return {
          uri: host,
          ...options,
        }
      },
    }),
  ],
})
export class MongodbModule {}
