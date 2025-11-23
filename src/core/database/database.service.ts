import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common'
import mongoose from 'mongoose'
import { ConfigService } from '@nestjs/config'
import { LogMessages } from '@/shared/constants/log-messages.constants'

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private connection: typeof mongoose
  private readonly config: { host: string; options: any }
  private readonly logger = new Logger(DatabaseService.name)

  constructor(private configService: ConfigService) {
    this.config = this.configService.get('database')!
  }
  async onModuleInit() {
    const { options } = this.config
    try {
      this.logger.log(LogMessages.DATABASE.CONNECT_SCCUSS(options.dbName))
      mongoose.connection.on('error', error => {
        this.logger.error(LogMessages.DATABASE.CONNECT_ERROR(error.message))
      })
      mongoose.connection.on('disconnected', () => {
        this.logger.warn(LogMessages.DATABASE.DISCONNECTED())
      })
    } catch (error) {
      this.logger.error(LogMessages.DATABASE.CONNECT_FAIL(error.message))
      throw error
    }
  }

  async onModuleDestroy() {
    if (this.connection) {
      await mongoose.disconnect()
      const { host, options } = this.config
      this.logger.log(LogMessages.DATABASE.CONNECTION_CLOSE(options.dbName, host))
    }
  }

  getConnection(): typeof mongoose {
    return this.connection
  }

  getMongoose() {
    return mongoose
  }
}
