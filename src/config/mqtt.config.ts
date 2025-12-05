import { registerAs } from '@nestjs/config'

export default registerAs('mqtt', () => ({
  ID: 'HANQI_MQTT_Broker',
  CONNECT_TIME: 30000,
  HEART_BEAT_INTERVAL: 60000,
  TCP_MQTT_PORT: process.env.PORT ?? 1885,
  PSK_MQTT_PORT: process.env.MQTT_PSK_PORT ?? 8445,
}))
