import { Injectable } from '@nestjs/common'
import { IAuthStrategy } from '../types/mqtt.type'
import { PskService } from '@/auth/psk/psk.service'
import { LoggerService } from '@/core/logger/logger.service'
import { MqttClient } from '../types/mqtt.type'
import { LogMessages, LogContext } from '@/shared/constants/logger.constants'

@Injectable()
export class PskAuthStrategy implements IAuthStrategy {
  constructor(
    private psk: PskService,
    private logger: LoggerService,
  ) {}
  async validate(client: MqttClient): Promise<boolean> {
    const id = client.pskIdentity!
    if (!this.psk.exists(id) || !this.psk.isActive(id)) {
      this.logger.warn(LogMessages.MQTT.AUTHENTICATION_FAILED(id), LogContext.MQTT_AUTH)
      return false
    }
    return true
  }

  getPskKey(identity: string): Buffer | null {
    try {
      const { key } = this.psk.pskCacheMap.get(identity)
      if (!key) {
        this.logger.warn(LogMessages.MQTT.AUTHENTICATION_FAILED(identity), LogContext.MQTT_AUTH)
        return null
      }
      return Buffer.from(key, 'hex')
    } catch (error) {
      this.logger.error(`PSK key lookup error: ${error}`, LogContext.MQTT_AUTH)
      return null
    }
  }
}
