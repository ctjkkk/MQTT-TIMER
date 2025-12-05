import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { GatewayService } from '../gateway/gateway.service'
import { OutletService } from '../outlet/outlet.service'
import { MqttUnifiedMessage, DpReportData, MqttMessageType, OperateAction } from '@/shared/constants/mqtt-topic.constants'
import { HanqiTimer, HanqiTimerDocument } from './schema/timer.schema'
import { LogMessages } from '@/shared/constants/log-messages.constants'
import { LoggerService } from '@/common/logger/logger.service'

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
    @InjectModel(HanqiTimer.name) private readonly hanqiTimerModel: Model<HanqiTimerDocument>,
    private readonly gatewayService: GatewayService,
    private readonly outletService: OutletService,
    private readonly loggerServer: LoggerService,
  ) {}

  // ========== MQTT消息处理 ==========

  /**
   * 处理Timer设备的DP点上报
   * 由GatewayController调用
   */
  async handleDpReport(message: MqttUnifiedMessage<DpReportData>) {
    const { deviceId } = message
    const { dps } = message.data

    console.log(`[TimerService] 处理DP点上报: ${deviceId}`)

    // 查找Timer设备
    const timer = await this.hanqiTimerModel.findOne({ timerId: deviceId })
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

      await this.hanqiTimerModel.updateOne({ _id: timer._id }, { $set: updates })

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

    await this.hanqiTimerModel.updateOne(
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
    await this.hanqiTimerModel.updateOne({ timerId: message.deviceId }, { $set: { last_seen: new Date() } })
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
      this.loggerServer.error(LogMessages.DEVICE.UNKNOWN_ACTION(action), 'GATEWAY')
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
