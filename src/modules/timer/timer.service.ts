import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { OutletService } from '../outlet/outlet.service'
import { ProductService } from '../product/product.service' // ← 新增
import type { MqttUnifiedMessage, DpReportData } from '@/shared/constants/mqtt-topic.constants'
import { OperateAction } from '@/shared/constants/mqtt-topic.constants'
import { Timer, TimerDocument } from './schema/timer.schema'
import { Gateway, GatewayDocument } from '@/modules/gateway/schema/HanqiGateway.schema'
import { SUB_DEVICE_TYPES } from './constants/timerTypes.constants'
import { LoggerService } from '@/core/logger/logger.service'
import { LogContext, LogMessages } from '@/shared/constants/logger.constants'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { CommandSenderService } from '@/core/mqtt/services/commandSender.service'
import { SubDeviceListResponseDto } from './dto/http-response.dto'
/**
 * Timer设备模块的Service
 * 职责：
 * 1. 处理Timer设备的业务逻辑
 * 2. 解析DP点数据并更新数据库
 */
@Injectable()
export class TimerService {
  constructor(
    @InjectModel(Timer.name) private readonly timerModel: Model<TimerDocument>,
    @InjectModel(Gateway.name) private readonly gatewayModel: Model<GatewayDocument>,
    @Inject(CommandSenderService) private readonly commandSenderService: CommandSenderService,
    private readonly outletService: OutletService,
    private readonly productService: ProductService, // ← 新增：注入产品服务
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
    const { uuid } = message
    const { dps } = message.data
    // 查找Timer设备
    const timer = await this.timerModel.findOne({ timerId: uuid })
    if (!timer) {
      console.warn(`[TimerService] Timer不存在: ${uuid}`)
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
    }
    // 调用OutletService更新出水口数据
    await this.outletService.updateOutletsByDp(timer._id, dps)
  }

  /**
   * 处理子设备心跳
   */
  async handleHeartbeat(message: MqttUnifiedMessage) {
    await this.timerModel.updateOne({ timerId: message.uuid }, { $set: { last_seen: new Date() } })
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
        await this.addSubDevices(message.uuid, message.data.subDevices)
        break
      case OperateAction.SUBDEVICE_DELETE:
        // 子设备删除（MQTT消息使用uuid）
        await this.deleteSubDeviceByGateway(message.uuid, message.data.uuid)
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
    const { uuid: gatewayId } = message
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
   * 逻辑：存在则覆盖，不存在则创建（upsert模式）
   * - 网关只上报 uuid 和 productId
   * - 所有其他字段从产品配置表获取
   * @param gatewayId 网关ID
   * @param subDevices 子设备列表，每个设备只包含 { uuid, productId }
   */
  async addSubDevices(gatewayId: string, subDevices: any[]) {
    const gateway = await this.gatewayModel.findOne({ gatewayId })
    if (!gateway) throw new Error('Gateway not found.')
    if (!gateway.userId) throw new Error('Gateway is not bound to any user.')
    const stats = { added: 0, updated: 0, failed: 0 }
    for (const device of subDevices) {
      const { uuid: subDeviceId, productId } = device
      if (!subDeviceId || !productId) {
        this.loggerService.warn(`子设备添加失败：缺少必填字段 (uuid: ${subDeviceId}, productId: ${productId})`, LogContext.TIMER_SERVICE)
        stats.failed++
        continue
      }
      // 查询产品配置（所有产品信息从这里获取）
      const productConfig = await this.productService.getProductConfig(productId)
      if (!productConfig) {
        this.loggerService.warn(
          `子设备添加失败：产品配置不存在 (productId: ${productId}, subDeviceId: ${subDeviceId})`,
          LogContext.TIMER_SERVICE,
        )
        stats.failed++
        continue
      }
      //从产品配置获取所有属性
      const { name: productName, deviceType, defaultFirmwareVersion, defaultBatteryLevel } = productConfig
      // 检查设备是否已存在
      const exists = await this.timerModel.findOne({ timerId: subDeviceId })
      if (exists) {
        // 已存在：更新
        await this.timerModel.updateOne(
          { timerId: subDeviceId },
          {
            $set: {
              userId: gateway.userId,
              gatewayId,
              productId,
              deviceType, // ← 从产品配置获取
              last_seen: new Date(),
            },
          },
        )
        stats.updated++
        this.loggerService.debug(`子设备已更新: ${subDeviceId}`, LogContext.TIMER_SERVICE)
      } else {
        // 不存在：创建
        await this.timerModel.create({
          timerId: subDeviceId,
          userId: gateway.userId,
          gatewayId,
          name: productName, // 从产品配置获取
          productId,
          deviceType, // 从产品配置获取
          firmware_version: defaultFirmwareVersion, // 从产品配置获取
          online: true, // 默认在线
          battery_level: defaultBatteryLevel, // 从产品配置获取
          createdAt: new Date(),
        })
        stats.added++
        this.loggerService.debug(`子设备已创建: ${subDeviceId}, 产品: ${productName}`, LogContext.TIMER_SERVICE)
      }
    }
    this.loggerService.info(
      `批量添加子设备完成: 新增 ${stats.added} 个, 更新 ${stats.updated} 个, 失败 ${stats.failed} 个`,
      LogContext.TIMER_SERVICE,
    )
    if (stats.added || stats.updated) {
      this.commandSenderService.sendStopPairingCommand(gatewayId, 'success')
      this.loggerService.info(`配对成功，已下发关闭配对命令给网关: ${gatewayId}`, LogContext.TIMER_SERVICE)
    }
  }

  /**
   * 删除子设备（网关主动上报删除）
   * 场景：用户长按设备触发删除，网关物理删除后通知云端同步
   * @param gatewayId 网关ID（来自MQTT消息的uuid字段）
   * @param subDeviceId 子设备ID（来自data.uuid字段）
   */
  async deleteSubDeviceByGateway(gatewayId: string, subDeviceId: string) {
    //  验证子设备是否存在
    const timer = await this.timerModel.findOne({ timerId: subDeviceId })
    if (!timer) {
      this.loggerService.warn(
        `网关上报删除失败：子设备不存在 (gatewayId: ${gatewayId}, subDeviceId: ${subDeviceId})`,
        LogContext.TIMER_SERVICE,
      )
      return
    }
    // 验证网关是否存在
    const gateway = await this.gatewayModel.findOne({ gatewayId })
    if (!gateway) {
      this.loggerService.warn(
        `网关上报删除失败：网关不存在 (gatewayId: ${gatewayId}, subDeviceId: ${subDeviceId})`,
        LogContext.TIMER_SERVICE,
      )
      return
    }
    // 验证子设备是否属于该网关（防止越权删除）
    if (timer.gatewayId !== gatewayId) {
      this.loggerService.error(
        `网关越权删除子设备！网关 ${gatewayId} 尝试删除不属于自己的子设备 ${subDeviceId} (实际属于网关: ${timer.gatewayId})`,
        LogContext.TIMER_SERVICE,
      )
      return
    }
    // 删除子设备记录
    await this.timerModel.deleteOne({ timerId: subDeviceId })
    this.loggerService.info(`网关上报删除子设备成功: 网关=${gatewayId}, 子设备=${subDeviceId}`, LogContext.TIMER_SERVICE)
  }

  /**
   * 更新子设备信息
   */
  async updateSubDevice(data: any) {
    const { uuid: subDeviceId, ...updates } = data
    await this.timerModel.updateOne({ timerId: subDeviceId }, { $set: updates })
    this.loggerService.info(`子设备信息已更新: ${subDeviceId}`, LogContext.TIMER_SERVICE)
  }

  /**
   * 根据子设备ID查找它所属的网关
   */
  async findGatewayBySubDeviceId(subDeviceId: string) {
    const timer = await this.timerModel.findOne({ timerId: subDeviceId })
    if (!timer) return null
    const gateway = await this.gatewayModel.findOne({ gatewayId: timer.gatewayId })
    return gateway
  }

  // 获取所有水阀的类型(一个出水口的，多个出水口的等)
  async getSubDeviceTypes() {
    return SUB_DEVICE_TYPES
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

  //通过ID修改指定子设备名称
  async renameSubDeviceById(userId: string, timerId: string, newName: string): Promise<SubDeviceListResponseDto> {
    const timer = await this.timerModel.findOne({ timerId }).lean()
    if (!timer) throw new NotFoundException('The Timer device does not exist.')
    const gateway = await this.gatewayModel.findOne({ gatewayId: timer.gatewayId })
    if (!gateway) throw new NotFoundException('The gateway associated with this Timer does not exist.')
    if (gateway.userId?.toString() !== userId) throw new BadRequestException('You do not have the authority to rename this Timer.')
    await this.timerModel.updateOne({ timerId }, { $set: { name: newName } })
    this.loggerService.info(LogMessages.TIMER.RENAMED_SUCCESS(timerId, newName), LogContext.TIMER_SERVICE)
    return {
      userId: timer.userId?.toString(),
      gatewayId: timer.gatewayId?.toString(),
      timerId: timer.timerId?.toString(),
      name: newName,
      status: timer.status,
      lastSeen: timer.last_seen,
      online: timer.online,
    }
  }
}
