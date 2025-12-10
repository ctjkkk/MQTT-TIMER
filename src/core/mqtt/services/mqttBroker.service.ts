// src/core/mqtt/aedes-broker.service.ts
import Aedes from 'aedes'
import * as tls from 'tls'
import { Injectable, OnModuleInit, Logger } from '@nestjs/common'
import { authError } from '@/common/utils/error'
import { createServer, Server as NetServer } from 'net'
import { LoggerService } from '@/core/logger/logger.service'
import { ConfigService } from '@nestjs/config'
import { LogMessages } from '@/shared/constants/log-messages.constants'
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
    this.aedes.on('clientDisconnect', c => this.clientManagerService.removeClient(c.id))
    this.aedes.on('publish', (packet, client) => {
      //当有客户端向 broker 发布消息时触发
      if (client) {
        this.loggerService.info(
          LogMessages.MQTT.MESSAGE_PUBLISHED(client.id, packet.topic),
          'MQTTPublish',
          packet.payload.toString(),
        )
        this.dispatchService.dispatch(packet.topic, packet.payload, client?.id || '')
      }
    })
  }

  private async listenPromisify(server: NetServer | tls.Server, port: number): Promise<void> {
    return new Promise<void>((resolve, _) => server.listen(port, resolve))
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
    await Promise.all([this.listenPromisify(this.tcpServer, TCP_MQTT_PORT), this.listenPromisify(this.tlsServer, PSK_MQTT_PORT)])

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
}
