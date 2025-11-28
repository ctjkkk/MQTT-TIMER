import { Injectable } from '@nestjs/common'
import { GatewayService } from '../gateway/gateway.service'
import {
  MqttUnifiedMessage,
  MqttMessageType,
  ScheduleData,
} from '@/shared/constants/hanqi-mqtt-topic.constants'
import HanqiSchedule from './schema/schedule.schema'
import HanqiTimer from '../timer/schema/timer.schema'

/**
 * Schedule模块的Service
 *
 * 职责：
 * 1. 处理定时任务的业务逻辑
 * 2. 同步定时任务到网关/设备
 * 3. 管理任务的启用/禁用
 */
@Injectable()
export class ScheduleService {
  constructor(private readonly gatewayService: GatewayService) {}

  /**
   * 处理定时任务同步响应
   */
  async handleScheduleSyncResponse(message: MqttUnifiedMessage) {
    console.log(`[ScheduleService] 定时任务同步响应: ${message.subDeviceId}`)
    // TODO: 实现定时任务同步逻辑
  }

  /**
   * 创建定时任务并同步到设备
   */
  async createSchedule(scheduleData: any): Promise<void> {
    // TODO: 实现创建定时任务逻辑
    console.log(`[ScheduleService] 创建定时任务`)
  }
}
