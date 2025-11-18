import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common'
import mongoose from 'mongoose'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private connection: typeof mongoose
  private readonly config: { host: string; options: any }
  constructor(private configService: ConfigService) {
    this.config = this.configService.get('database')!
  }
  async onModuleInit() {
    const { host, options } = this.config
    try {
      this.connection = await mongoose.connect(host, options)
      Logger.log(`✅ MongoDB 连接成功 - 数据库: ${options.dbName}`)
      mongoose.connection.on('error', error => {
        Logger.error(`❌ MongoDB 连接错误: ${error.message}`)
      })
      mongoose.connection.on('disconnected', () => {
        Logger.warn('⚠️ MongoDB 已断开连接')
      })
    } catch (error) {
      Logger.error(`❌ MongoDB 连接失败: ${error.message}`)
      throw error
    }
  }

  async onModuleDestroy() {
    if (this.connection) {
      await mongoose.disconnect()
      const { host, options } = this.config
      Logger.log(`🛑 MongoDB 连接已关闭 - 数据库: ${options.dbName} 主机: ${host}`)
    }
  }

  getConnection(): typeof mongoose {
    return this.connection
  }

  getMongoose() {
    return mongoose
  }
}
