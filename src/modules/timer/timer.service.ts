import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { OnEvent } from '@nestjs/event-emitter'
import { Model } from 'mongoose'
import { GatewayService } from '../gateway/gateway.service'
import { OutletService } from '../outlet/outlet.service'
import type { MqttUnifiedMessage, DpReportData } from '@/shared/constants/mqtt-topic.constants'
import { MqttMessageType, OperateAction } from '@/shared/constants/mqtt-topic.constants'
import { AppEvents } from '@/shared/constants/events.constants'
import { Timer, TimerDocument } from './schema/timer.schema'
import { LogMessages, LogContext } from '@/shared/constants/logger.constants'
import { LoggerService } from '@/core/logger/logger.service'

/**
 * Timer设备模块的Service
 *
 * 职责：
 * 1. 处理Timer设备的业务逻辑
 * 2. 解析DP点数据并更新数据库
 * 3. 提供Timer设备控制方法（通过GatewayService）
 * 4. 处理Timer相关事件
 */
@Injectable()
export class TimerService {
  constructor(
    @InjectModel(Timer.name) private readonly TimerModel: Model<TimerDocument>,
    private readonly gatewayService: GatewayService,
    private readonly outletService: OutletService,
    private readonly loggerServer: LoggerService,
  ) {}

  // ========== 事件监听器 ==========

  /**
   * 监听子设备MQTT消息事件
   * 根据消息类型分发到对应的处理方法
   */
  @OnEvent(AppEvents.MQTT_SUBDEVICE_MESSAGE)
  async handleSubDeviceMessage(message: MqttUnifiedMessage) {
    // 这里可以根据 deviceType 或其他字段判断是否是 Timer 设备
    // 暂时处理所有子设备消息

    switch (message.msgType) {
      case MqttMessageType.DP_REPORT:
        // DP点数据上报
        await this.handleDpReport(message)
        break
      case MqttMessageType.EVENT_REPORT:
        // 事件上报（告警、故障等）
        await this.handleEventReport(message)
        break
      case MqttMessageType.HEARTBEAT:
        // 心跳（子设备）
        await this.handleHeartbeat(message)
        break
      case MqttMessageType.OPERATE_DEVICE:
        // 设备生命周期
        await this.handleLifecycle(message)
        break
      default:
        this.loggerServer.warn(`未知的子设备消息类型: ${message.msgType}`, LogContext.TIMER_SERVICE)
    }
  }

  // ========== MQTT消息处理 ==========

  /**
   * 处理Timer设备的DP点上报
   * 通过事件监听器自动触发
   */
  async handleDpReport(message: MqttUnifiedMessage<DpReportData>) {
    const { deviceId } = message
    const { dps } = message.data

    console.log(`[TimerService] 处理DP点上报: ${deviceId}`)

    // 查找Timer设备
    const timer = await this.TimerModel.findOne({ timerId: deviceId })
    if (!timer) {
      console.warn(`[TimerService] Timer不存在: ${deviceId}`)
      return
    }

    // 更新Timer基础信息
    const updates: any = {}

    // DP点映射（基础功能 1-20）
    if (dps['1'] !== undefined) updates.status = dps['1'] ? 1 : 0 // 设备开关
    if (dps['4'] !== undefined) updates.battery_level = dps['4'] // 电池电量
    if (dps['5'] !== undefined) updates.signal_strength = dps['5'] // 信号强度
    if (dps['6'] !== undefined) updates.firmware_version = dps['6'] // 固件版本
    if (dps['7'] !== undefined) updates.outlet_count = dps['7'] // 出水口数量

    // 如果有更新
    if (Object.keys(updates).length > 0) {
      updates.dp_data = dps
      updates.last_dp_update = new Date()
      updates.last_seen = new Date()

      await this.TimerModel.updateOne({ _id: timer._id }, { $set: updates })

      console.log(`[TimerService] Timer基础信息已更新: ${deviceId}`)
    }

    // 调用OutletService更新出水口数据
    await this.outletService.updateOutletsByDp(timer._id, dps)
  }

  /**
   * 处理设备信息上报
   */
  async handleDeviceInfo(message: MqttUnifiedMessage) {
    const { deviceId } = message
    const { firmware, battery, signal, outletCount } = message.data

    await this.TimerModel.updateOne(
      { timerId: deviceId },
      {
        $set: {
          firmware_version: firmware,
          battery_level: battery,
          signal_strength: signal,
          outlet_count: outletCount,
          last_seen: new Date(),
        },
      },
    )

    console.log(`[TimerService] 设备信息已更新: ${deviceId}`)
  }

  /**
   * 处理事件上报（告警、故障等）
   */
  async handleEventReport(message: MqttUnifiedMessage) {
    const { deviceId } = message
    const { eventType, eventCode, eventMessage } = message.data

    console.log(`[TimerService] 事件上报: ${deviceId}, 类型: ${eventType}, 代码: ${eventCode}`)

    // TODO: 保存事件到数据库或发送通知
  }

  /**
   * 处理子设备心跳
   */
  async handleHeartbeat(message: MqttUnifiedMessage) {
    await this.TimerModel.updateOne({ timerId: message.deviceId }, { $set: { last_seen: new Date() } })
  }

  // ========== Timer设备控制方法 ==========

  /**
   * 控制出水口开关
   * 通过GatewayService发送命令
   *
   * @param timerId Timer设备ID
   * @param outletNumber 出水口编号（1-4）
   * @param switchOn 开关状态
   * @param duration 运行时长（秒，可选）
   */
  async controlOutlet(timerId: string, outletNumber: number, switchOn: boolean, duration?: number): Promise<void> {
    // 查找Timer所属的网关
    const gateway = await this.gatewayService.findGatewayBySubDeviceId(timerId)
    if (!gateway) {
      throw new Error(`未找到Timer所属的网关: ${timerId}`)
    }

    // 计算DP点ID
    const baseDpId = [0, 21, 41, 61, 81][outletNumber]
    if (!baseDpId) {
      throw new Error(`出水口编号无效: ${outletNumber}`)
    }

    // 构建DP命令
    const dps: Record<string, any> = {
      [baseDpId]: switchOn, // 开关
    }

    // 如果指定了时长
    if (duration !== undefined) {
      dps[baseDpId + 2] = duration // 手动运行时长
    }

    // 通过网关发送命令
    await this.gatewayService.sendSubDeviceCommand(gateway.gatewayId as string, timerId, MqttMessageType.DP_COMMAND, { dps })

    console.log(
      `[TimerService] 已发送出水口控制命令: ` +
        `timerId: ${timerId}, ` +
        `outlet: ${outletNumber}, ` +
        `switch: ${switchOn}, ` +
        `duration: ${duration || 'N/A'}`,
    )
  }

  /**
   * 查询Timer设备状态
   * 通过网关请求设备上报最新状态
   */
  async queryDeviceStatus(timerId: string): Promise<void> {
    const gateway = await this.gatewayService.findGatewayBySubDeviceId(timerId)
    if (!gateway) {
      throw new Error(`未找到Timer所属的网关: ${timerId}`)
    }
    await this.gatewayService.sendSubDeviceCommand(gateway.gatewayId as string, timerId, 'query_status', {})
  }

  /**
   * 设备复位（重启）
   */
  async resetDevice(timerId: string): Promise<void> {
    const gateway = await this.gatewayService.findGatewayBySubDeviceId(timerId)
    if (!gateway) {
      throw new Error(`未找到Timer所属的网关: ${timerId}`)
    }

    const dps = { '3': true } // DP3: 设备复位
    await this.gatewayService.sendSubDeviceCommand(gateway.gatewayId as string, timerId, MqttMessageType.DP_COMMAND, { dps })
  }

  async handleLifecycle(message: MqttUnifiedMessage) {
    const { subDeviceId, deviceId: gatewayId } = message
    const { data } = message
    const { action } = data
    const actionHandlers = new Map<OperateAction, () => Promise<void>>([
      // ========== 单个子设备操作 ==========
      [OperateAction.SUBDEVICE_ADD, () => this.handleSubDeviceAdd(gatewayId, subDeviceId, data)],
      [OperateAction.SUBDEVICE_DELETE, () => this.handleSubDeviceDelete(gatewayId, subDeviceId, data)],
      [OperateAction.SUBDEVICE_UPDATE, () => this.handleSubDeviceUpdate(gatewayId, subDeviceId, data)],
    ])
    const handler = actionHandlers.get(action)
    if (!handler) {
      this.loggerServer.error(LogMessages.DEVICE.UNKNOWN_ACTION(action), LogContext.GATEWAY)
      throw new NotFoundException('无效的action!')
    }
    await handler()
  }

  /**
   * 添加单个子设备
   * @param gatewayId 网关ID
   * @param subDeviceId 子设备ID
   * @param data 包含 deviceType, outletCount 等
   */
  private async handleSubDeviceAdd(gatewayId: string, subDeviceId: string, data: any): Promise<void> {}

  /**
   * 删除单个子设备
   */
  private async handleSubDeviceDelete(gatewayId: string, subDeviceId: string, data: any): Promise<void> {}

  /**
   * 更新单个子设备信息
   */
  private async handleSubDeviceUpdate(gatewayId: string, subDeviceId: string, data: any): Promise<void> {}
}
