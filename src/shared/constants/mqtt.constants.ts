export const MqttConnectionParameters = {
  ID: 'HANQI_MQTT_Broker',
  CONNECT_TIME: 30000,
  HEART_BEAT_INTERVAL: 60000,
  PORT: 1883,
} as const

export enum DeviceConnectionStatus {
  DISCONNECTED = 0,
  CONNECTED = 1,
}

export const MQTT_TOPIC_METADATA = 'MQTT_TOPIC_METADATA',
  MQTT_PARAM_METADATA = 'MQTT_PARAM_METADATA'
