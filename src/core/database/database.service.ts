import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import mongoose from 'mongoose'
import { ConfigService } from '@nestjs/config'
import { LoggerService } from '../../common/logger/logger.service'

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private connection: typeof mongoose
  private readonly config: { host: string; options: any }
  constructor(
    private configService: ConfigService,
    private loggerService: LoggerService,
  ) {
    this.config = this.configService.get('database')!
  }
  async onModuleInit() {
    const { host, options } = this.config
    try {
      this.connection = await mongoose.connect(host, options)
      this.loggerService.mongodbConnect(host, options.dbName)
      mongoose.connection.on('error', error => {
        this.loggerService.mongodbConnectionError(host, options.dbName, error)
      })
      mongoose.connection.on('disconnected', () => {
        this.loggerService.mongodbDisconnect(host, options.dbName)
      })
    } catch (error) {
      this.loggerService.mongodbConnectionError(host, options.dbName, error)
      throw error
    }
  }

  async onModuleDestroy() {
    if (this.connection) {
      await mongoose.disconnect()
      const { host, options } = this.config
      this.loggerService.mongodbDisconnect(host, options.dbName)
    }
  }

  getConnection(): typeof mongoose {
    return this.connection
  }

  getMongoose() {
    return mongoose
  }
}
