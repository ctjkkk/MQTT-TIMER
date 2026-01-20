import Aedes from 'aedes'
import * as tls from 'tls'
import { Injectable, OnModuleInit, Logger } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { authError } from '@/common/utils/error'
import { createServer, Server as NetServer } from 'net'
import { LoggerService } from '@/core/logger/logger.service'
import { ConfigService } from '@nestjs/config'
import { LogMessages, LogContext } from '@/shared/constants/logger.constants'
import { AppEvents } from '@/shared/constants/events.constants'
import { AuthErrorCode, PSK_CIPHERS } from '@/shared/constants/mqtt.constants'
import { MqttDispatchService } from './mqttDispatch.service'
import { PskAuthStrategy } from '../authentication/psk.strategy'
import { TcpAuthStrategy } from '../authentication/tcp.strategy'
import { MqttClientManagerService } from './mqttClientManager.service'
import { MqttPublishService } from './mqttPublish.service'
@Injectable()
export class MqttBrokerService implements OnModuleInit {
  private readonly logger = new Logger(MqttBrokerService.name)
  constructor(
    private readonly loggerService: LoggerService,
    private readonly configService: ConfigService,
    private readonly dispatchService: MqttDispatchService,
    private readonly pskAuthStrategy: PskAuthStrategy,
    private readonly tcpAuthStrategy: TcpAuthStrategy,
    private readonly clientManagerService: MqttClientManagerService,
    private readonly publishService: MqttPublishService,
    private readonly eventEmitter: EventEmitter2,
  ) {}
  private aedes: Aedes
  private tcpServer: NetServer
  private tlsServer: tls.Server

  async onModuleInit() {
    await this.initMqttBroker() //启动服务
    this.registerMqttEvents() //注册事件
  }

  private registerMqttEvents() {
    this.aedes.on('client', c => this.clientManagerService.addClient(c.id, c))
    this.aedes.on('clientDisconnect', c => {
      this.clientManagerService.removeClient(c.id) //从缓存中移除
      this.handleClientDisconnect(c.id) //处理真正的断开连接逻辑(发布事件到网关服务模块进行处理)
    })
    this.aedes.on('publish', (packet, client) => {
      //当有客户端向 broker 发布消息时触发
      if (client) {
        this.dispatchService.dispatch(packet.topic, packet.payload, client?.id || '')

        if (packet.topic.startsWith('sync/')) return
        this.loggerService.info(
          LogMessages.MQTT.MESSAGE_PUBLISHED(client.id, packet.topic),
          LogContext.MQTT_PUBLISH,
          packet.payload.toString(),
        )
      }
    })
  }

  private async initMqttBroker(): Promise<void> {
    const { ID, CONNECT_TIME, HEART_BEAT_INTERVAL, TCP_MQTT_PORT, PSK_MQTT_PORT } = this.configService.get('mqtt')
    this.aedes = new Aedes({
      id: ID,
      connectTimeout: CONNECT_TIME,
      heartbeatInterval: HEART_BEAT_INTERVAL,
      authenticate: this.authenticate.bind(this),
    })

    this.tcpServer = createServer(this.aedes.handle)
    this.tlsServer = tls.createServer(
      {
        pskCallback: (socket: any, identity) => {
          const key = this.pskAuthStrategy.getPskKey(identity)
          if (!key) return
          //等 Aedes 把 socket 包装成 client 后再挂标记
          socket.once('secure', () => {
            // secure 事件触发时，aedes.handle 已经内部实例化了 client
            const client = socket.client ?? socket.aedesClient
            if (client) {
              client['isPSK'] = true
              client['pskIdentity'] = identity
            }
          })
          return key
        },
        // broker 支持的加密算法白名单
        ciphers: PSK_CIPHERS,
      },
      this.aedes.handle,
    )

    // 统一监听启动
    await Promise.all([
      new Promise<void>(resolve => this.tcpServer.listen(TCP_MQTT_PORT, resolve)),
      new Promise<void>(resolve => this.tlsServer.listen(PSK_MQTT_PORT, resolve)),
    ])
    this.logger.log(LogMessages.MQTT.BROKER_START('TCP', TCP_MQTT_PORT))
    this.logger.log(LogMessages.MQTT.BROKER_START('PSK', PSK_MQTT_PORT))
  }

  private async authenticate(client: any, username: string, password: Buffer, callback: any) {
    process.nextTick(async () => {
      try {
        if (client.isPSK) {
          const ok = await this.pskAuthStrategy.validate(client)
          if (!ok) return callback(authError('PSK authentication failed', AuthErrorCode.NOT_AUTHORIZED), false)
          this.loggerService.mqttConnect(client.pskIdentity, client.id)
          return callback(null, true)
        }

        // TCP 分支
        const ok = await this.tcpAuthStrategy.validate(client, username?.toString(), password)
        if (!ok) return callback(authError('Authentication failed', AuthErrorCode.NOT_AUTHORIZED), false)

        this.loggerService.mqttConnect(username!.toString(), client.id)
        client.will = {
          topic: 'last/will',
          payload: 'Client disconnected unexpectedly',
          qos: 1,
          retain: false,
        }
        return callback(null, true)
      } catch (e) {
        this.loggerService.error(LogMessages.MQTT.INTERNAL_ERROR, 'authentication')
        return callback(authError('Internal authentication error', AuthErrorCode.NOT_AUTHORIZED), false)
      }
    })
  }

  publish(topic: string, payload: string | object, qos: 0 | 1 = 0): void {
    this.publishService.publish(this.aedes, topic, payload, qos)
  }

  publishToClient(clientId: string, topic: string, payload: string | Buffer): void {
    this.publishService.publishToClient(clientId, topic, payload)
  }

  /**
   * 处理客户端断开连接
   * 从clientId中提取gatewayId并发布离线事件
   */
  private handleClientDisconnect(clientId: string): void {
    try {
      if (clientId.startsWith('gateway_')) {
        const parts = clientId.split('_')
        if (parts.length >= 2) {
          const gatewayId = parts[1]

          this.loggerService.info(`网关断开连接: ${gatewayId}`, LogContext.MQTT_BROKER)

          // 发布网关离线事件
          this.eventEmitter.emit(AppEvents.GATEWAY_OFFLINE, {
            gatewayId,
            clientId,
            timestamp: new Date(),
          })
        }
      }
    } catch (error) {
      this.loggerService.error(`处理客户端断开连接失败: ${error.message}`, LogContext.MQTT_BROKER)
    }
  }
}
