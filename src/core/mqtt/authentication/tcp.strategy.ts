import { Injectable } from '@nestjs/common'
import { MqttClient } from '../types/mqtt.type'
import { LoggerService } from '@/core/logger/logger.service'
import { LogMessages, LogContext } from '@/shared/constants/logger.constants'
import { IAuthStrategy } from '../types/mqtt.type'

@Injectable()
export class TcpAuthStrategy implements IAuthStrategy {
  constructor(private logger: LoggerService) {}
  async validate(client: MqttClient, username?: string, password?: Buffer): Promise<boolean> {
    const whiteUsers = JSON.parse(process.env.MQTT_TCP_WHITELIST || '[]')
    const ok = whiteUsers.some((x: any) => x.username === username && x.password === password?.toString())
    if (!ok) this.logger.warn(LogMessages.MQTT.AUTHENTICATION_FAILED(username), LogContext.MQTT_AUTH)
    return ok
  }
}
