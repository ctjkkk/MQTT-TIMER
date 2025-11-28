import { Injectable } from '@nestjs/common'
import {
  MqttUnifiedMessage,
  IrrigationRecordData,
} from '@/shared/constants/hanqi-mqtt-topic.constants'
import HanqiOutlet from './schema/outlet.schema'
import HanqiTimer from '../timer/schema/timer.schema'
import { Types } from 'mongoose'

/**
 * Outlet模块的Service
 *
 * 职责：
 * 1. 处理出水口相关的业务逻辑
 * 2. 根据DP点更新出水口状态
 * 3. 处理灌溉记录
 * 4. 提供用水统计功能
 */
@Injectable()
export class OutletService {
  // ========== MQTT消息处理 ==========

  /**
   * 处理灌溉记录上报
   * 由GatewayController调用
   */
  async handleIrrigationRecord(message: MqttUnifiedMessage<IrrigationRecordData>) {
    const { subDeviceId } = message
    const { outletNumber, startTime, endTime, duration, waterUsed, triggerType, temperature, weatherCondition } =
      message.data

    console.log(`[OutletService] 处理灌溉记录: ${subDeviceId}, 出水口: ${outletNumber}`)

    // 查找Timer设备
    const timer = await HanqiTimer.findOne({ timerId: subDeviceId })
    if (!timer) {
      console.warn(`[OutletService] Timer不存在: ${subDeviceId}`)
      return
    }

    // 查找出水口
    const outlet = await HanqiOutlet.findOne({
      timerId: timer._id,
      outlet_number: outletNumber,
    })

    if (!outlet) {
      console.warn(`[OutletService] 出水口不存在: ${subDeviceId}, outlet: ${outletNumber}`)
      return
    }

    // 更新出水口的累计用水量
    await HanqiOutlet.updateOne(
      { _id: outlet._id },
      {
        $inc: { total_water_used: waterUsed || 0 },
        $set: { last_dp_update: new Date() },
      }
    )

    // TODO: 保存灌溉记录到 HanqiIrrigationRecord 集合
    console.log(`[OutletService] 灌溉记录已保存: ${outletNumber}, 用水: ${waterUsed}升`)
  }

  /**
   * 根据DP点数据更新出水口状态
   * 由TimerService调用
   */
  async updateOutletsByDp(timerId: Types.ObjectId, dps: Record<string, any>): Promise<void> {
    // 查找该Timer的所有出水口
    const outlets = await HanqiOutlet.find({ timerId })

    for (const outlet of outlets) {
      const outletNumber = outlet.outlet_number
      const baseDpId = [0, 21, 41, 61, 81][outletNumber]

      if (!baseDpId) continue

      const updates: any = {}

      // DP点映射
      // baseDpId+0: 开关
      // baseDpId+1: 状态
      // baseDpId+3: 剩余时间
      // baseDpId+4: 流速
      // baseDpId+5: 水压
      // baseDpId+6: 累计用水量
      // baseDpId+7: 区域名称

      if (dps[String(baseDpId)] !== undefined) {
        // 开关
        updates.current_status = dps[String(baseDpId)] ? 1 : 0
      }
      if (dps[String(baseDpId + 1)] !== undefined) {
        // 状态
        updates.current_status = dps[String(baseDpId + 1)]
      }
      if (dps[String(baseDpId + 3)] !== undefined) {
        // 剩余时间
        updates.remaining_time = dps[String(baseDpId + 3)]
      }
      if (dps[String(baseDpId + 4)] !== undefined) {
        // 流速
        updates.flow_rate = dps[String(baseDpId + 4)]
      }
      if (dps[String(baseDpId + 5)] !== undefined) {
        // 水压（转换回bar）
        updates.pressure = dps[String(baseDpId + 5)] / 10
      }
      if (dps[String(baseDpId + 6)] !== undefined) {
        // 累计用水量
        updates.total_water_used = dps[String(baseDpId + 6)]
      }
      if (dps[String(baseDpId + 7)] !== undefined) {
        // 区域名称
        updates.zone_name = dps[String(baseDpId + 7)]
      }

      // 如果有数据需要更新
      if (Object.keys(updates).length > 0) {
        updates.dp_data = dps
        updates.last_dp_update = new Date()

        await HanqiOutlet.updateOne({ _id: outlet._id }, { $set: updates })

        console.log(`[OutletService] 出水口${outletNumber}数据已更新`)
      }
    }
  }

  // ========== 数据查询方法 ==========

  /**
   * 根据Timer ID查询出水口列表
   */
  async findOutletsByTimerId(timerId: Types.ObjectId) {
    return await HanqiOutlet.find({ timerId }).sort({ outlet_number: 1 })
  }

  /**
   * 查询出水口详情
   */
  async findOutletById(outletId: string) {
    return await HanqiOutlet.findById(outletId)
  }

  // TODO: 添加用水统计方法
  // async getWaterUsageStats(outletId, startDate, endDate) { }
}
