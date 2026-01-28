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
    const exists = this.psk.exists(id)
    const isActive = exists ? this.psk.isActive(id) : false

    if (!exists || !isActive) {
      this.logger.warn(
        LogMessages.PSK.AUTH_FAILED_DETAIL(client.id, id, exists, isActive, this.psk.pskCacheMap.size),
        LogContext.MQTT_AUTH,
      )
      return false
    }
    return true
  }

  getPskKey(identity: string): Buffer | null {
    try {
      const pskData = this.psk.pskCacheMap.get(identity)

      // 检查PSK数据是否存在
      if (!pskData) {
        const cacheKeys = Array.from(this.psk.pskCacheMap.keys()).join(', ')
        this.logger.warn(LogMessages.PSK.KEY_NOT_FOUND(identity, this.psk.pskCacheMap.size, cacheKeys), LogContext.MQTT_AUTH)
        return null
      }

      const { key } = pskData
      if (!key) {
        this.logger.warn(LogMessages.PSK.KEY_EMPTY(identity), LogContext.MQTT_AUTH)
        return null
      }

      this.logger.info(LogMessages.PSK.KEY_FOUND(identity), LogContext.MQTT_AUTH)
      return Buffer.from(key, 'hex')
    } catch (error) {
      this.logger.error(LogMessages.PSK.KEY_ERROR(identity, String(error)), LogContext.MQTT_AUTH)
      return null
    }
  }
}
