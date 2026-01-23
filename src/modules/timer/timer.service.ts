import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { GatewayService } from '../gateway/gateway.service'
import { OutletService } from '../outlet/outlet.service'
import type { MqttUnifiedMessage, DpReportData } from '@/shared/constants/mqtt-topic.constants'
import { MqttMessageType } from '@/shared/constants/mqtt-topic.constants'
import { Timer, TimerDocument } from './schema/timer.schema'
import { SUB_DEVICE_TYPES } from './constants/timerTypes.constants'

/**
 * Timer设备模块的Service
 *
 * 职责：
 * 1. 处理Timer设备的业务逻辑
 * 2. 解析DP点数据并更新数据库
 * 3. 提供Timer设备控制方法（通过GatewayService）
 *
 * 设计理念：
 * - 不监听事件，只提供纯业务方法
 * - 由TimerEventsHandler调用
 */
@Injectable()
export class TimerService {
  constructor(
    @InjectModel(Timer.name) private readonly TimerModel: Model<TimerDocument>,
    private readonly gatewayService: GatewayService,
    private readonly outletService: OutletService,
  ) {}

  // ========== MQTT消息处理方法（由EventsHandler调用） ==========

  /**
   * 处理Timer设备的DP点上报
   * 由TimerEventsHandler调用
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


  // 获取所有水阀的类型(一个出水口的，多个出水口的等)
  async getSubDeviceTypes() {
    return SUB_DEVICE_TYPES
  }
}
