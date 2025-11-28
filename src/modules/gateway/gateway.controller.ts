import { Controller } from '@nestjs/common'
import { MqttSubscribe, MqttPayload, MqttBroker, MqttClientId } from '@/shared/decorators/mqtt.decorator'
import { AedesBrokerService } from '@/core/mqtt/mqtt-broker.service'
import { GatewayService } from './gateway.service'
import { TimerService } from '../timer/timer.service'
import { OutletService } from '../outlet/outlet.service'
import { ScheduleService } from '../schedule/schedule.service'
import { HanqiMqttTopic, MqttMessageType } from '@/shared/constants/hanqi-mqtt-topic.constants'
import { isGatewayMessage, isSubDeviceMessage, parseMqttMessage } from './utils/gateway.utils'
/**
 * Gateway模块的Controller
 *
 * 职责：
 * 1. 唯一的MQTT消息入口
 * 2. 订阅所有网关的上报消息
 * 3. 根据msgType和subDeviceId分发到对应的Service
 * 4. 不处理具体业务逻辑
 */
@Controller('gateway')
export class GatewayController {
  constructor(
    private readonly gatewayService: GatewayService,
    private readonly timerService: TimerService,
    private readonly outletService: OutletService,
    private readonly scheduleService: ScheduleService,
  ) {}

  /**
   * 处理设备加入请求（网关首次上线）
   * 这是特殊的Topic，用于设备注册
   */
  @MqttSubscribe('hanqi/device/join')
  async handleDeviceJoin(
    @MqttPayload() payload: Buffer,
    @MqttBroker() broker: AedesBrokerService,
    @MqttClientId() clientId: string,
  ) {
    const params = JSON.parse(payload.toString())
    const user = await this.gatewayService.findUserByMacAddress(params.mac)
    if (user) {
      broker.publish(HanqiMqttTopic.deviceJoinResponse(params.mac), {
        status: 'success',
        deviceId: params.mac,
        user: {
          userId: user._id,
          name: user.name,
          email: user.email,
        },
      })
    } else {
      broker.publish(HanqiMqttTopic.deviceJoinResponse(params.mac), {
        status: 'error',
        message: '未找到关联的用户',
      })
    }
  }

  /**
   * ========== 核心：唯一的MQTT消息入口 ==========
   *
   * 订阅所有网关的数据上报
   * 这是云端最重要的MQTT订阅点
   *
   * 消息流程：
   * 1. 网关上报消息到 hanqi/gateway/{gatewayId}/report
   * 2. 云端解析消息，检查 msgType 和 subDeviceId
   * 3. 根据消息类型分发到对应的 Service 处理
   */
  @MqttSubscribe(HanqiMqttTopic.allGatewayReport())
  async handleGatewayReport(@MqttPayload() payload: Buffer) {
    // 解析消息
    const message = parseMqttMessage(payload)
    if (!message) {
      console.warn('[GatewayController] 消息解析失败')
      return
    }

    console.log(
      `[GatewayController] 收到消息 - msgType: ${message.msgType}, ` +
        `gatewayId: ${message.deviceId}, ` +
        `subDeviceId: ${message.subDeviceId || '(网关自身)'}`,
    )

    try {
      // ===== 1. 判断是网关自身的消息还是子设备的消息 =====
      if (isGatewayMessage(message)) {
        // 网关自身的消息
        await this.handleGatewayOwnMessage(message)
      } else if (isSubDeviceMessage(message)) {
        // 子设备的消息
        await this.handleSubDeviceMessage(message)
      }
    } catch (error) {
      console.error('[GatewayController] 处理消息失败:', error)
    }
  }

  /**
   * 处理网关自身的消息（没有 subDeviceId）
   */
  private async handleGatewayOwnMessage(message: any) {
    switch (message.msgType) {
      case MqttMessageType.GATEWAY_STATUS:
        // 网关状态上报
        await this.gatewayService.handleGatewayStatus(message)
        break

      case MqttMessageType.SUB_DEVICES:
        // 子设备列表上报
        await this.gatewayService.handleSubDeviceList(message)
        break

      case MqttMessageType.HEARTBEAT:
        // 心跳（网关）
        await this.gatewayService.handleHeartbeat(message)
        break

      default:
        console.warn('[GatewayController] 未知的网关消息类型:', message.msgType)
    }
  }

  /**
   * 处理子设备的消息（有 subDeviceId）
   */
  private async handleSubDeviceMessage(message: any) {
    switch (message.msgType) {
      // ===== Timer设备相关消息 =====
      case MqttMessageType.DP_REPORT:
        // DP点数据上报 → TimerService
        await this.timerService.handleDpReport(message)
        break

      case MqttMessageType.DEVICE_INFO:
        // 设备信息上报 → TimerService
        await this.timerService.handleDeviceInfo(message)
        break

      // ===== Outlet相关消息 =====
      case MqttMessageType.IRRIGATION_RECORD:
        // 灌溉记录上报 → OutletService
        await this.outletService.handleIrrigationRecord(message)
        break

      // ===== 定时任务相关消息 =====
      case MqttMessageType.SCHEDULE_SYNC:
        // 定时任务同步响应 → ScheduleService
        await this.scheduleService.handleScheduleSyncResponse(message)
        break

      // ===== 通用消息 =====
      case MqttMessageType.EVENT_REPORT:
        // 事件上报（告警、故障等）
        await this.timerService.handleEventReport(message)
        break

      case MqttMessageType.HEARTBEAT:
        // 心跳（子设备）
        await this.timerService.handleHeartbeat(message)
        break

      default:
        console.warn('[GatewayController] 未知的子设备消息类型:', message.msgType)
    }
  }
}
