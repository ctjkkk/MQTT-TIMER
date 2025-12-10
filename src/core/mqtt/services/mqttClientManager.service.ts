import { Injectable } from '@nestjs/common'
import { MqttClient } from '../types/mqtt.type'

@Injectable()
export class MqttClientManagerService {
  private online = new Map<string, MqttClient>()

  addClient(clientId: string, client: MqttClient): void {
    this.online.set(clientId, client)
  }

  removeClient(clientId: string): void {
    this.online.delete(clientId)
  }

  getClient(clientId: string): MqttClient | undefined {
    return this.online.get(clientId)
  }

  get clients(): Map<string, any> {
    const map = new Map<string, any>()
    for (const [id, client] of this.online.entries()) {
      map.set(id, { id, connected: true, clientId: id })
    }
    return map
  }

  hasClient(clientId: string): boolean {
    return this.online.has(clientId)
  }
}
