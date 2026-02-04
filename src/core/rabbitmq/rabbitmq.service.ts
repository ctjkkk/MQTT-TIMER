import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as amqp from 'amqplib'

@Injectable()
export class RabbitmqService implements OnModuleInit, OnModuleDestroy {
  private connection: amqp.ChannelModel = null
  private channel: amqp.Channel = null
  private readonly logger = new Logger(RabbitmqService.name)

  private readonly EXCHANGE_NAME = 'db_sync'
  private readonly QUEUE_NAME = 'timer_sync_queue'

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.connect()
  }

  async onModuleDestroy() {
    await this.channel?.close()
    await this.connection?.close()
  }

  private async connect() {
    const url = this.configService.get('RABBITMQ_URL')
    try {
      this.connection = await amqp.connect(url)
      this.channel = await this.connection.createChannel()

      // 声明 Exchange（如果不存在）
      await this.channel.assertExchange(this.EXCHANGE_NAME, 'topic', { durable: true })

      // 声明队列
      await this.channel.assertQueue(this.QUEUE_NAME, { durable: true })

      // 绑定到 Exchange，监听所有 sync/* 消息
      await this.channel.bindQueue(this.QUEUE_NAME, this.EXCHANGE_NAME, 'sync/#')

      this.logger.log('Connected to RabbitMQ')

      this.connection.on('error', err => {
        this.logger.error(`RabbitMQ connection error: ${err.message}`)
      })

      this.connection.on('close', () => {
        this.logger.warn('RabbitMQ connection closed')
        this.channel = null
        this.connection = null
      })
    } catch (error) {
      this.logger.error(`Failed to connect to RabbitMQ: ${error.message}`)
    }
  }

  // 消费消息
  async consume(handler: (routingKey: string, content: Buffer) => Promise<void>) {
    if (!this.channel) {
      this.logger.error('Cannot consume: RabbitMQ channel not available')
      return
    }

    await this.channel.consume(this.QUEUE_NAME, async (msg: amqp.ConsumeMessage | null) => {
      if (!msg) return
      try {
        await handler(msg.fields.routingKey, msg.content)
        this.channel?.ack(msg) // 确认消息
      } catch (error) {
        this.logger.error(`Message handling failed: ${error.message}`)
        this.channel?.nack(msg, false, true) // 重新入队
      }
    })
  }
}
