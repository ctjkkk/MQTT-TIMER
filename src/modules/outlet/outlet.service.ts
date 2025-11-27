import { Injectable } from '@nestjs/common'
import { MqttUnifiedMessage } from '@/shared/constants/hanqi-mqtt-topic.constants'
import HanqiOutlet from './schema/outlet.schema'
import HanqiTimer from '../timer/schema/timer.schema'

/**
 * Outlet模块的Service
 * 处理出水口相关的业务逻辑
 */
@Injectable()
export class OutletService {
  /**
   * 处理灌溉记录上报
   */
  async handleIrrigationRecord(message: MqttUnifiedMessage) {
    console.log(`[OutletService] 处理灌溉记录: ${message.deviceId}`)

    const { outletNumber, startTime, endTime, duration, waterUsed, triggerType, temperature, weatherCondition } = message.data

    // 先找到Timer设备
    const timer = await HanqiTimer.findOne({ timerId: message.deviceId })
    if (!timer) {
      console.warn(`设备不存在: ${message.deviceId}`)
      return
    }

    // 查找出水口
    const outlet = await HanqiOutlet.findOne({
      timerId: timer._id,
      outlet_number: outletNumber,
    })

    if (!outlet) {
      console.warn(`出水口不存在: ${message.deviceId} outlet ${outletNumber}`)
      return
    }

    // 更新出水口的累计用水量
    await HanqiOutlet.updateOne(
      { _id: outlet._id },
      {
        $inc: { total_water_used: waterUsed || 0 },
        $set: { last_dp_update: new Date() },
      },
    )

    console.log(`[OutletService] 灌溉记录已保存: ${outletNumber}`)
  }

  /**
   * 处理出水口相关的DP点更新
   */
  async handleOutletDpUpdate(message: MqttUnifiedMessage) {
    console.log(`[OutletService] 处理出水口DP点: ${message.deviceId}`)

    const { dps } = message.data

    // 查找Timer设备
    const timer = await HanqiTimer.findOne({ timerId: message.deviceId })
    if (!timer) return

    // 查找该Timer的所有出水口
    const outlets = await HanqiOutlet.find({ timerId: timer._id })

    // 更新每个出水口的DP点数据
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

      if (dps[String(baseDpId + 1)] !== undefined) {
        updates.current_status = dps[String(baseDpId + 1)]
      }
      if (dps[String(baseDpId + 3)] !== undefined) {
        updates.remaining_time = dps[String(baseDpId + 3)]
      }
      if (dps[String(baseDpId + 4)] !== undefined) {
        updates.flow_rate = dps[String(baseDpId + 4)]
      }
      if (dps[String(baseDpId + 5)] !== undefined) {
        updates.pressure = dps[String(baseDpId + 5)] / 10 // 转换回bar
      }
      if (dps[String(baseDpId + 6)] !== undefined) {
        updates.total_water_used = dps[String(baseDpId + 6)]
      }
      if (dps[String(baseDpId + 7)] !== undefined) {
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
}
