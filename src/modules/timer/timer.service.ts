import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { GatewayService } from '../gateway/gateway.service'
import { OutletService } from '../outlet/outlet.service'
import type { MqttUnifiedMessage, DpReportData } from '@/shared/constants/mqtt-topic.constants'
import { OperateAction } from '@/shared/constants/mqtt-topic.constants'
import { Timer, TimerDocument } from './schema/timer.schema'
import { Gateway, GatewayDocument } from '@/modules/gateway/schema/HanqiGateway.schema'
import { SUB_DEVICE_TYPES } from './constants/timerTypes.constants'
import { LoggerService } from '@/core/logger/logger.service'
import { LogContext, LogMessages } from '@/shared/constants/logger.constants'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { CommandSenderService } from '@/core/mqtt/services/commandSender.service'
/**
 * Timer设备模块的Service
 *
 * 职责：
 * 1. 处理Timer设备的业务逻辑
 * 2. 解析DP点数据并更新数据库
 *
 */
@Injectable()
export class TimerService {
  constructor(
    @InjectModel(Timer.name) private readonly timerModel: Model<TimerDocument>,
    @InjectModel(Gateway.name) private readonly gatewayModel: Model<GatewayDocument>,
    @Inject(CommandSenderService) private readonly commandSenderService: CommandSenderService,
    private readonly gatewayService: GatewayService,
    private readonly outletService: OutletService,
    private readonly loggerService: LoggerService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
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
    const timer = await this.timerModel.findOne({ timerId: deviceId })
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

      await this.timerModel.updateOne({ _id: timer._id }, { $set: updates })

      console.log(`[TimerService] Timer基础信息已更新: ${deviceId}`)
    }

    // 调用OutletService更新出水口数据
    await this.outletService.updateOutletsByDp(timer._id, dps)
  }

  /**
   * 处理子设备心跳
   */
  async handleHeartbeat(message: MqttUnifiedMessage) {
    await this.timerModel.updateOne({ timerId: message.deviceId }, { $set: { last_seen: new Date() } })
  }

  /**
   * 处理子设备生命周期操作
   * 由TimerEventsHandler调用
   */
  async handleOperateDevice(message: MqttUnifiedMessage) {
    const { action } = message.data
    switch (action) {
      case OperateAction.SUBDEVICE_ADD:
        // 网关配对到新的子设备
        await this.addSubDevices(message.deviceId, message.data.subDevices)
        break
      case OperateAction.SUBDEVICE_DELETE:
        // 子设备删除（MQTT消息使用uuid）
        await this.deleteSubDevice(message.data.uuid)
        break
      case OperateAction.SUBDEVICE_UPDATE:
        // 子设备信息更新
        await this.updateSubDevice(message.data)
        break
      default:
        this.loggerService.warn(LogMessages.TIMER.UNKONWN_DEVICE_TYPE(action), LogContext.TIMER_SERVICE)
    }
  }

  /**
   * 批量处理子设备状态上报
   */
  async handleDeviceStatus(message: MqttUnifiedMessage) {
    const { deviceId: gatewayId } = message
    const { subDevices } = message.data
    if (!Array.isArray(subDevices) || !subDevices.length) {
      this.logger.warn(LogMessages.TIMER.SUBDEVICE_EMPTY(gatewayId), LogContext.TIMER_SERVICE)
      return
    }
    this.logger.info(LogMessages.TIMER.SUBDEVICE_STATUS_RECEIVED(subDevices.length), LogContext.TIMER_SERVICE)
    const stats = { updated: 0, skipped: 0 }

    for (const [index, device] of subDevices.entries()) {
      const success = await this.updateSubDeviceStatus(device, gatewayId, index + 1)
      success ? stats.updated++ : stats.skipped++
    }
    this.logger.info(LogMessages.TIMER.SUBDEVICE_STATUS_UPDATED_SUCCESS(stats.updated, stats.skipped), LogContext.TIMER_SERVICE)
  }

  /**
   * 更新单个子设备状态
   */
  private async updateSubDeviceStatus(device: any, gatewayId: string, index: number): Promise<boolean> {
    // MQTT消息使用uuid，内部逻辑使用flashId
    const { uuid, online, signal_strength, battery_level } = device
    if (!uuid) {
      this.logger.warn(LogMessages.TIMER.SUBDEVICE_FIELD_MISSING(gatewayId, index, 'uuid'), LogContext.TIMER_SERVICE)
      return false
    }
    if (online == null) {
      this.logger.warn(LogMessages.TIMER.SUBDEVICE_FIELD_MISSING(gatewayId, index, 'online'), LogContext.TIMER_SERVICE)
      return false
    }
    // 查找并更新
    const result = await this.timerModel.updateOne(
      { timerId: uuid },
      {
        $set: {
          online,
          battery_level,
          signal_strength,
          last_seen: new Date(),
        },
      },
    )
    // 检查是否更新成功
    if (!result.matchedCount) {
      this.logger.warn(LogMessages.TIMER.SUBDEVICE_MISSING(uuid), LogContext.TIMER_SERVICE)
      return false
    }
    return true
  }
  /**
   * 添加子设备（网关配对成功后调用）
   *
   * 逻辑：存在则覆盖，不存在则创建（upsert模式）
   *
   * @param gatewayId 网关ID
   * @param subDevices 子设备列表
   */
  async addSubDevices(gatewayId: string, subDevices: any[]) {
    const gateway = await this.gatewayModel.findOne({ gatewayId })
    if (!gateway) throw new Error('Gateway not found.')
    if (!gateway.userId) throw new Error('Gateway is not bound to any user.')
    const stats = { added: 0, updated: 0 }
    for (const device of subDevices) {
      // MQTT消息使用uuid，内部逻辑使用subDeviceId
      const { uuid: subDeviceId, deviceType, capabilities, productId, firmwareVersion, online } = device
      // 判断水阀类型
      const valveType = this.determineValveType(deviceType, capabilities)
      // 检查设备是否已存在
      const exists = await this.timerModel.findOne({ timerId: subDeviceId })

      if (exists) {
        // 已存在：覆盖更新
        await this.timerModel.updateOne(
          { timerId: subDeviceId },
          {
            $set: {
              gatewayId,
              type: valveType,
              deviceType,
              capabilities,
              productId,
              firmwareVersion,
              online,
              last_seen: new Date(),
            },
          },
        )
        stats.updated++
        this.loggerService.debug(`子设备已更新: ${subDeviceId}`, LogContext.TIMER_SERVICE)
      } else {
        // 不存在：创建新设备
        await this.timerModel.create({
          timerId: subDeviceId,
          gatewayId,
          name: `水阀-${subDeviceId.slice(-4)}`,
          type: valveType,
          deviceType,
          capabilities,
          productId,
          firmwareVersion,
          online,
          battery: 100,
          createdAt: new Date(),
        })
        stats.added++
        this.loggerService.debug(`子设备已创建: ${subDeviceId}`, LogContext.TIMER_SERVICE)
      }
    }

    this.loggerService.info(`批量添加子设备完成: 新增 ${stats.added} 个, 更新 ${stats.updated} 个`, LogContext.TIMER_SERVICE)
    // 如果有设备处理（新增或更新），下发停止配对命令
    if (stats.added || stats.updated) {
      this.commandSenderService.sendStopPairingCommand(gatewayId, 'success')
      this.loggerService.info(`配对成功，已下发关闭配对命令给网关: ${gatewayId}`, LogContext.TIMER_SERVICE)
    }
  }

  /**
   * 根据 deviceType 和 capabilities 确定水阀类型
   */
  private determineValveType(deviceType: number, capabilities: number): string {
    if (deviceType === 1) {
      // capabilities 低2位表示出水口数量
      const outletCount = (capabilities & 0x03) + 1 // 0->1, 1->2, 2->3, 3->4
      switch (outletCount) {
        case 1:
          return 'valve_single'
        case 2:
          return 'valve_dual'
        case 3:
          return 'valve_triple'
        case 4:
          return 'valve_quad'
        default:
          return 'valve_single'
      }
    }

    return 'valve_single' // 默认单路
  }

  /**
   * 用户长按设备删除子设备
   */
  async deleteSubDevice(subDeviceId: string) {
    await this.timerModel.deleteOne({ timerId: subDeviceId })
  }

  /**
   * 更新子设备信息
   */
  async updateSubDevice(data: any) {
    // MQTT消息使用uuid，内部逻辑使用subDeviceId
    const { uuid: subDeviceId, ...updates } = data
    await this.timerModel.updateOne({ timerId: subDeviceId }, { $set: updates })
    this.loggerService.info(`子设备信息已更新: ${subDeviceId}`, LogContext.TIMER_SERVICE)
  }

  // ========== Timer设备控制方法 ==========

  /**
   * 控制出水口开关
   * 通过GatewayService发送命令
   *
   * @param timerId Timer设备ID
   * @param outletNumber 出水口编号（1-4）
   * @param switchOn 开关状态
   * @param duration 运行时长
   */
  async controlOutlet(timerId: string, outletNumber: number, switchOn: boolean, duration?: number): Promise<void> {
    // 查找Timer所属的网关
    const gateway = await this.gatewayService.findGatewayBySubDeviceId(timerId)
    if (!gateway) throw new Error(`未找到Timer所属的网关: ${timerId}`)

    // 计算DP点ID
    const baseDpId = [0, 21, 41, 61, 81][outletNumber]
    if (!baseDpId) throw new Error(`出水口编号无效: ${outletNumber}`)

    // 构建DP命令
    const dps: Record<string, any> = {
      [baseDpId]: switchOn, // 开关
    }

    // 如果指定了时长
    if (duration !== undefined) {
      dps[baseDpId + 2] = duration // 手动运行时长
    }

    // 发送命令给网关
  }

  // 获取所有水阀的类型(一个出水口的，多个出水口的等)
  async getSubDeviceTypes() {
    return SUB_DEVICE_TYPES
  }

  //获取该用户指定网关下的所有子设备列表
  async getSubDevicesListByGatewayId(userId: string, gatewayId: string) {
    const gateway = await this.gatewayModel.findOne({ gatewayId })
    if (!gateway) throw new NotFoundException('The gateway does not exist.')
    if (gateway.userId?.toString() !== userId) throw new BadRequestException('You do not have the authority to operate this Timer.')
    return this.timerModel.find({ gatewayId })
  }

  //通过ID删除指定子设备
  async deleteSubDeviceById(userId: string, timerId: string) {
    const timer = await this.timerModel.findOne({ timerId })
    if (!timer) throw new NotFoundException('The Timer device does not exist.')
    const gateway = await this.gatewayModel.findOne({ gatewayId: timer.gatewayId })
    if (!gateway) throw new NotFoundException('The gateway associated with this Timer does not exist.')
    if (gateway.userId?.toString() !== userId) throw new BadRequestException('You do not have the authority to delete this Timer.')
    await this.timerModel.deleteOne({ timerId })
    //下发删除命令给网关
    this.commandSenderService.sendDeleteSubDeviceCommand(gateway.gatewayId, timerId)
    this.loggerService.info(LogMessages.TIMER.DELETED_SUCCESS(timerId), LogContext.TIMER_SERVICE)
  }
}
