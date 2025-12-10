import type { Client as AedesClient } from 'aedes'
export interface MqttClient extends AedesClient {
  isPSK?: boolean
  pskIdentity?: string
}

export type TopicHandler = (payload: Buffer, topic: string, clientId: string) => void | Promise<void>

export interface HandlerMetadata {
  instance: any
  methodName: string
}

export type Handler = HandlerMetadata | Function

export interface IAuthStrategy {
  validate(client: MqttClient, username?: string, password?: Buffer): Promise<boolean>
}
