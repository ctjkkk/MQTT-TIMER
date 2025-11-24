// src/core/mqtt/aedes-broker.service.ts
import { Injectable, OnModuleInit, Logger } from '@nestjs/common'
import Aedes from 'aedes'
import { authError } from '@/shared/utils/error'
import { createServer, Server as NetServer } from 'net'
import { LoggerService } from '@/common/logger/logger.service'
import { ConfigService } from '@nestjs/config'
import { LogMessages } from '@/shared/constants/log-messages.constants'
import { PskService } from '@/modules/psk/psk.service'
import { AuthErrorCode } from '@/shared/constants/mqtt.constants'

import * as tls from 'tls'
@Injectable()
export class AedesBrokerService implements OnModuleInit {
  private readonly logger = new Logger(AedesBrokerService.name)
  constructor(
    private readonly loggerService: LoggerService,
    private readonly configService: ConfigService,
    private readonly pskService: PskService,
  ) {}
  private online = new Map<string, any>()
  private topicHandlers = new Map<string, any[]>()
  private PORT: number
  private PSK_PORT: number
  private aedes: Aedes
  private tcpServer: NetServer
  private tlsServer: tls.Server

  async onModuleInit() {
    this.mqttAuthentication() //先建立连接
    this.aedes.on('client', c => this.online.set(c.id, c))
    this.aedes.on('clientDisconnect', c => this.online.delete(c.id))
    this.aedes.on('publish', (packet, client) => {
      if (client) {
        this.loggerService.info(
          LogMessages.MQTT.MESSAGE_PUBLISHED(client.id, packet.topic),
          'MQTTPublish',
          packet.payload.toString(),
        )
        this.dispatchToHandlers(packet.topic, packet.payload, client?.id || '')
      }
    })

    // 启动TCP服务器（端口1883，使用用户名密码认证）
    await new Promise<void>(resolve =>
      this.tcpServer.listen(this.PORT, () => {
        this.logger.log(LogMessages.MQTT.BROKER_START('TCP', this.PORT))
        resolve()
      }),
    )

    // 启动TLS-PSK服务器（端口8445，使用PSK认证）
    await new Promise<void>(resolve =>
      this.tlsServer.listen(this.PSK_PORT, () => {
        this.logger.log(LogMessages.MQTT.BROKER_START('PSK', this.PSK_PORT))
        resolve()
      }),
    )
  }

  mqttAuthentication() {
    const { ID, CONNECT_TIME, HEART_BEAT_INTERVAL, PORT, PSK_PORT } = this.configService.get('mqtt')
    this.aedes = new Aedes({
      id: ID, // 使用枚举值，不是枚举本身
      connectTimeout: CONNECT_TIME,
      heartbeatInterval: HEART_BEAT_INTERVAL,
      authenticate: (client: any, username, password, callback) => {
        process.nextTick(() => {
          try {
            // 如果底层是 TLS-PSK，直接放行；测试工具: mosquitto
            if (client.isPSK) {
              const identity = client.pskIdentity
              if (!this.pskService.exists(identity)) {
                return callback(authError('Unknown PSK identity', AuthErrorCode.NOT_AUTHORIZED), false)
              }
              if (!this.pskService.isActive(identity)) {
                return callback(authError('PSK identity inactive', AuthErrorCode.NOT_AUTHORIZED), false)
              }
              this.loggerService.mqttConnect(identity, client.id)
              return callback(null, true)
            }
            //否则底层是 TCP; 测试工具: MQTTX
            const usernameStr = username?.toString() || ''
            const passwordStr = password?.toString() || ''
            const whiteUsers = JSON.parse(process.env.MQTT_TCP_WHITELIST)
            if (!whiteUsers.length) {
              this.loggerService.warn(LogMessages.MQTT.WHITELIST_EMPTY, 'TcpAuthentication')
              return callback(null, false)
            }
            const ok =
              usernameStr &&
              passwordStr &&
              whiteUsers.some(
                (u: { username: string; password: string }) => u.username == usernameStr && u.password == passwordStr,
              )
            if (!ok) {
              this.loggerService.warn(LogMessages.MQTT.AUTHENTICATION_FAILED(usernameStr), 'TcpAuthentication')
              return callback(authError('Authentication failed', AuthErrorCode.NOT_AUTHORIZED), false)
            }
            this.loggerService.mqttConnect(usernameStr, client.id)
            client.will = {
              topic: 'last/will',
              payload: 'Client disconnected unexpectedly',
              qos: 1,
              retain: false,
            }
            return callback(null, true)
          } catch (error) {
            this.loggerService.mqttError(username, error)
            this.loggerService.error(LogMessages.MQTT.INTERNAL_ERROR, 'authentication')
            return callback(authError('Internal authentication error', AuthErrorCode.NOT_AUTHORIZED), false)
          }
        })
      },
    })

    this.PORT = PORT
    this.PSK_PORT = PSK_PORT
    this.tcpServer = createServer(this.aedes.handle)
    this.tlsServer = tls.createServer(
      {
        pskCallback: (socket: any, identity) => {
          const key = this.getPskKey(identity)
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
        ciphers: 'PSK-AES128-CBC-SHA256:PSK-AES256-CBC-SHA384:PSK-AES128-GCM-SHA256:PSK-AES256-GCM-SHA384',
      },
      this.aedes.handle,
    )
  }

  private dispatchToHandlers(topic: string, payload: string | Buffer, clientId: string): void {
    for (const [registeredTopic, handlers] of this.topicHandlers) {
      if (this.topicMatches(topic, registeredTopic)) {
        handlers.forEach(h => this.invokeHandler(h, topic, payload, clientId))
      }
    }
  }

  private async invokeHandler(handler: any, topic: string, payload: string | Buffer, clientId: string): Promise<void> {
    const params = Reflect.getMetadata('MQTT_PARAM_METADATA', handler.instance, handler.methodName) || []
    const args = new Array(params.length)

    params.forEach((p: any) => {
      switch (p.type) {
        case 'payload':
          // ensure payload passed to handlers is a Buffer
          args[p.index] = Buffer.isBuffer(payload) ? payload : Buffer.from(String(payload))
          break
        case 'clientId':
          args[p.index] = clientId
          break
        case 'topic':
          args[p.index] = topic
          break
        case 'broker':
          args[p.index] = this // 当前 AedesBrokerService 实例
          break
      }
    })

    try {
      await handler.instance[handler.methodName](...args)
    } catch (err) {
      this.loggerService.error(err)
    }
  }

  subscribe(topic: string, handler: any) {
    const list = this.topicHandlers.get(topic) ?? []
    list.push(handler)
    this.topicHandlers.set(topic, list)
  }

  publish(topic: string, payload: string | object, qos: 0 | 1 = 0): void {
    this.aedes.publish(
      {
        topic,
        payload: Buffer.from(JSON.stringify(payload)),
        qos,
        retain: false,
        cmd: 'publish',
        dup: false,
      },
      err => err && console.error('[publish]', err),
    )
  }

  publishToClient(clientId: string, topic: string, payload: string | Buffer): void {
    const client = this.online.get(clientId)
    if (!client) return
    client.publish(
      { topic, payload, qos: 0, retain: false },
      (err: any) => err && this.loggerService.mqttError(clientId, `[publish]${err}`),
    )
  }

  get clients(): Map<string, any> {
    const map = new Map<string, any>()
    for (const [id, client] of this.online.entries()) {
      map.set(id, { id, connected: true, clientId: id })
    }
    return map
  }

  private topicMatches(pubTopic: string, subTopic: string): boolean {
    const pubParts = pubTopic.split('/')
    const subParts = subTopic.split('/')
    for (let i = 0; i < Math.max(pubParts.length, subParts.length); i++) {
      const sub = subParts[i]
      if (sub === '#') return true
      if (sub === '+') continue
      if (pubParts[i] !== sub) return false
    }
    return true
  }

  private getPskKey(identity: string): Buffer | null {
    try {
      const { key } = this.pskService.pskCacheMap.get(identity)
      if (!key) {
        this.loggerService.warn(LogMessages.MQTT.AUTHENTICATION_FAILED(identity), 'PskAuthentication')
        return null
      }
      return Buffer.from(key, 'hex')
    } catch (error) {
      this.loggerService.error(`PSK key lookup error: ${error}`, 'PskAuthentication')
      return null
    }
  }
}
