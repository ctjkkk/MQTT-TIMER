import { Injectable } from '@nestjs/common'
import { MqttSubscribe, MqttPayload } from '@/common/decorators/mqtt.decorator'
import { MqttTopic } from '@/shared/constants/topic.constants'
import { LoggerService } from '@/core/logger/logger.service'
import { LogMessages, LogContext } from '@/shared/constants/logger.constants'
import { OtaService } from './ota.service'
import { parseOtaMqttMessage, OtaMessageType, OtaProgressData, OtaResultData } from './utils/ota.utils'

/**
 * OTA MQTT消息入口
 *
 * 职责：
 * - 订阅MQTT topic，接收网关的OTA上报消息
 * - 解析和验证MQTT消息格式
 * - 根据消息类型调用Service的对应业务方法
 * 设计理念：
 * - 这是OTA MQTT消息的唯一入口
 * - 解析成功后直接调用Service处理（不需要EventEmitter，避免循环依赖）
 * - 独立模块，不与其他模块交互
 */
@Injectable()
export class OtaMqttMonitor {
  constructor(
    private readonly otaService: OtaService,
    private readonly logger: LoggerService,
  ) {}
  @MqttSubscribe(MqttTopic.allGatewayOtaReport())
  async handleOtaReport(@MqttPayload() payload: Buffer) {
    const message = parseOtaMqttMessage(payload)
    if (!message) {
      this.logger.error(LogMessages.MQTT.PARSE_ERROR(LogMessages.OTA.MESSAGE_PARSE_ERROR()), LogContext.OTA_SERVICE)
      return
    }
    const { msgType, uuid, msgId, data } = message
    // OTA消息记录到日志文件
    this.logger.info(LogMessages.OTA.MESSAGE_RECEIVED(uuid, msgType), LogContext.OTA_SERVICE, data)
    try {
      switch (msgType) {
        case OtaMessageType.PROGRESS:
          await this.otaService.updateUpgradeProgress(msgId, data as OtaProgressData)
          break
        case OtaMessageType.RESULT:
          await this.otaService.handleUpgradeResult(msgId, data as OtaResultData, uuid)
          break
        default:
          this.logger.warn(LogMessages.OTA.UNKNOWN_MESSAGE_TYPE(msgType), LogContext.OTA_SERVICE)
      }
    } catch (error) {
      this.logger.error(LogMessages.OTA.HANDLE_ERROR(error.message), LogContext.OTA_SERVICE, error.stack)
    }
  }
}
