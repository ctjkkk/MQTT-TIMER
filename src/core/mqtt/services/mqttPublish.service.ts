import { Injectable } from '@nestjs/common'
import Aedes from 'aedes'
import { LoggerService } from '@/core/logger/logger.service'
import { MqttClientManagerService } from './mqttClientManager.service'

@Injectable()
export class MqttPublishService {
  constructor(
    private readonly loggerService: LoggerService,
    private readonly clientManager: MqttClientManagerService,
  ) {}

  publish(aedes: Aedes, topic: string, payload: string | object, qos: 0 | 1 = 0): void {
    aedes.publish(
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
    const client = this.clientManager.getClient(clientId)
    if (!client) return
    client.publish(
      {
        topic,
        payload,
        qos: 0,
        retain: false,
        cmd: 'publish',
        dup: false,
      },
      (err: any) => err && this.loggerService.mqttError(clientId, `[publish]${err}`),
    )
  }
}
