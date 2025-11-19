// src/core/mqtt/aedes-broker.service.ts
import { Injectable, OnModuleInit, Logger } from '@nestjs/common'
import Aedes from 'aedes'
import { createServer } from 'net'
import { LoggerService } from '@/common/logger/logger.service'
import { MqttConnectionParameters } from '@/shared/constants/mqtt.constants'
import { LogMessages } from '@/shared/constants/log-messages.constants'
import * as tls from 'tls'
@Injectable()
export class AedesBrokerService implements OnModuleInit {
  constructor(private loggerService: LoggerService) {}
  private online = new Map<string, any>()
  private topicHandlers = new Map<string, any[]>()
  readonly PORT = process.env.MQTT_PORT ?? MqttConnectionParameters.PORT
  readonly PSK_PORT = process.env.MQTT_PSK_PORT ?? MqttConnectionParameters.PSK_PORT

  private aedes = new Aedes({
    id: MqttConnectionParameters.ID, // 使用枚举值，不是枚举本身
    connectTimeout: MqttConnectionParameters.CONNECT_TIME,
    heartbeatInterval: MqttConnectionParameters.HEART_BEAT_INTERVAL,
    authenticate: (client: any, username, password, callback) => {
      process.nextTick(() => {
        try {
          const usernameStr = username?.toString() || ''
          const passwordStr = password?.toString() || ''
          const whiteUsers = JSON.parse(process.env.MQTT_WHITELIST)
          if (!whiteUsers.length) {
            this.loggerService.warn(LogMessages.MQTT.WHITELIST_EMPTY)
            return callback(null, false)
          }
          const ok = usernameStr && passwordStr && whiteUsers.some(u => u.username == usernameStr && u.password == passwordStr)
          if (!ok) {
            this.loggerService.warn(LogMessages.MQTT.AUTHENTICATION_FAILED(usernameStr))
            const error: any = new Error('Authentication failed')
            error.returnCode = 4 // NOT_AUTHORIZED
            return callback(error, false)
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
          this.loggerService.error(LogMessages.MQTT.INTERNAL_ERROR)
          const authError: any = new Error('Internal authentication error')
          authError.returnCode = 4
          return callback(authError, false)
        }
      })
    },
  })
  private server = createServer(this.aedes.handle)
  private tlsServer = tls.createServer(
    {
      pskCallback: (socket, identity) => {
        return this.getPskKey(identity)
      },
      ciphers: 'PSK-AES128-CBC-SHA256:PSK-AES256-CBC-SHA384:PSK-AES128-GCM-SHA256:PSK-AES256-GCM-SHA384',
    },
    this.aedes.handle,
  )

  async onModuleInit() {
    this.aedes.on('client', c => this.online.set(c.id, c))
    this.aedes.on('clientDisconnect', c => this.online.delete(c.id))
    this.aedes.on('publish', (packet, client) => {
      if (client) {
        this.loggerService.info(LogMessages.MQTT.MESSAGE_PUBLISHED(client.id, packet.topic), packet.payload.toString())
        this.dispatchToHandlers(packet.topic, packet.payload, client?.id || '')
      }
    })

    // 启动TCP服务器（端口1883，使用用户名密码认证）
    await new Promise<void>(resolve =>
      this.server.listen(this.PORT, () => {
        Logger.log(LogMessages.MQTT.BROKER_START('TCP', this.PORT))
        resolve()
      }),
    )

    // 启动TLS-PSK服务器（端口8445，使用PSK认证）
    await new Promise<void>(resolve =>
      this.tlsServer.listen(this.PSK_PORT, () => {
        Logger.log(LogMessages.MQTT.BROKER_START('PSK', this.PSK_PORT))
        resolve()
      }),
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
      err => err && this.loggerService.mqttError(clientId, `[publish]${err}`),
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
      const pskWhitelist = JSON.parse(process.env.MQTT_PSK_WHITELIST || '[]')
      const entry = pskWhitelist.find((e: any) => e.identity === identity)
      if (!entry) {
        this.loggerService.warn(LogMessages.MQTT.AUTHENTICATION_FAILED(identity))
        return null
      }
      this.loggerService.mqttConnect(identity, identity)
      return Buffer.from(entry.key, 'hex')
    } catch (error) {
      this.loggerService.error(`PSK key lookup error: ${error}`)
      return null
    }
  }
}
