import { Controller } from '@nestjs/common'
import { MqttSubscribe, MqttPayload, MqttBroker, MqttClientId, MqttTopic } from '@/shared/decorators/mqtt.decorator'
import { AedesBrokerService } from '@/core/mqtt/mqtt-broker.service'
import { HanqiMqttTopic } from '@/shared/constants/hanqi-mqtt-topic.constants'

/**
 * HanqiMqttTopic 使用示例
 *
 * 两种使用方式：
 * 1. 订阅（@MqttSubscribe）：使用通配符Topic方法，如 HanqiMqttTopic.allDeviceDpReport()
 * 2. 发布（broker.publish）：使用具体Topic方法，如 HanqiMqttTopic.deviceDpCommand('timer_001')
 */
@Controller('hanqi-example')
export class HanqiExampleController {
  /**
   * 示例1: 订阅所有设备的上报
   *
   */
  @MqttSubscribe(HanqiMqttTopic.allDeviceReport())
  async handleAllDeviceReports(
    @MqttPayload() payload: Buffer,
    @MqttTopic() topic: string,
    @MqttClientId() clientId: string,
    @MqttBroker() broker: AedesBrokerService,
  ) {
    console.log('收到设备上报，Topic:', topic)

    // 从topic中解析设备ID
    const deviceId = HanqiMqttTopic.parseDeviceId(topic)
    console.log('设备ID:', deviceId)

    // 处理数据...
    const data = JSON.parse(payload.toString())

    // 发送控制指令到该设备（使用具体的deviceId）
    if (deviceId) {
      const commandTopic = HanqiMqttTopic.deviceCommand(deviceId)
      broker.publish(commandTopic, {
        command: 'ack',
        timestamp: Date.now(),
      })
      console.log('已发送命令到:', commandTopic)
    }
  }

  /**
   * 示例2: 订阅所有设备的状态
   *
   */
  @MqttSubscribe(HanqiMqttTopic.allDeviceStatus())
  async handleDeviceOnline(@MqttTopic() topic: string, @MqttClientId() clientId: string) {
    const deviceId = HanqiMqttTopic.parseDeviceId(topic)
    console.log(`设备上线: ${deviceId}, 客户端: ${clientId}`)
  }
}

/**
 * 总结：HanqiMqttTopic的所有方法
 *
 * === 订阅用（返回通配符Topic）===
 * HanqiMqttTopic.allDeviceDpReport()        -> '/hanqi/device/+/dp/report'
 * HanqiMqttTopic.allGatewayDpReport()       -> '/hanqi/gateway/+/dp/report'
 * HanqiMqttTopic.allDeviceOnline()          -> '/hanqi/device/+/online'
 * HanqiMqttTopic.allDeviceOffline()         -> '/hanqi/device/+/offline'
 * HanqiMqttTopic.allIrrigationRecord()      -> '/hanqi/device/+/irrigation/record'
 *
 * === 发布用（需要传入具体ID）===
 * HanqiMqttTopic.deviceDpReport('timer_001')        -> '/hanqi/device/timer_001/dp/report'
 * HanqiMqttTopic.deviceDpCommand('timer_001')       -> '/hanqi/device/timer_001/dp/command'
 * HanqiMqttTopic.deviceStatus('timer_001')          -> '/hanqi/device/timer_001/status'
 * HanqiMqttTopic.deviceOnline('timer_001')          -> '/hanqi/device/timer_001/online'
 * HanqiMqttTopic.deviceOffline('timer_001')         -> '/hanqi/device/timer_001/offline'
 * HanqiMqttTopic.gatewayDpReport('gw_001')          -> '/hanqi/gateway/gw_001/dp/report'
 * HanqiMqttTopic.gatewayDpCommand('gw_001')         -> '/hanqi/gateway/gw_001/dp/command'
 * HanqiMqttTopic.gatewaySubDevices('gw_001')        -> '/hanqi/gateway/gw_001/subdevices'
 * HanqiMqttTopic.scheduleSync('timer_001')          -> '/hanqi/device/timer_001/schedule/sync'
 * HanqiMqttTopic.irrigationRecord('timer_001')      -> '/hanqi/device/timer_001/irrigation/record'
 * HanqiMqttTopic.otaUpgrade('timer_001')            -> '/hanqi/device/timer_001/ota/upgrade'
 * HanqiMqttTopic.otaProgress('timer_001')           -> '/hanqi/device/timer_001/ota/progress'
 *
 * === 工具方法 ===
 * HanqiMqttTopic.parseDeviceId(topic)       -> 从topic中提取设备ID
 * HanqiMqttTopic.parseGatewayId(topic)      -> 从topic中提取网关ID
 * HanqiMqttTopic.isDeviceReport(topic)      -> 判断是否为设备上报
 * HanqiMqttTopic.isDeviceCommand(topic)     -> 判断是否为设备命令
 */
