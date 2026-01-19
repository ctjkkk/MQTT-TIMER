import { Controller, Get, Post, Body, Param, Request, Delete, UseGuards } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { ApiTags } from '@nestjs/swagger'
import { MqttSubscribe, MqttPayload } from '@/common/decorators/mqtt.decorator'
import { MqttTopic } from '@/shared/constants/mqtt-topic.constants'
import { AppEvents } from '@/shared/constants/events.constants'
import { isGatewayMessage, isSubDeviceMessage, parseMqttMessage } from './utils/gateway.utils'
import { LoggerService } from '@/core/logger/logger.service'
import { ApiResponseStandard } from '@/common/decorators/apiResponse.decorator'
import { UserService } from './../user/user.service'
import { GatewayService } from './gateway.service'
import { LogMessages } from '@/shared/constants/logger.constants'
import { BindGatewayDto } from './dto/pairing.dto'
import {
  BindGatewayResponseDto,
  VerifyPairingResponseDto,
  GatewayStatusResponseDto,
  GatewayListItemDto,
  UnbindGatewayResponseDto,
} from './dto/response.dto'

/**
 * Gateway模块的Controller
 * 职责：
 * 1. 唯一的MQTT消息入口
 * 2. 订阅所有网关的上报消息
 * 3. 提供配网和网关管理的 HTTP API
 * 4. 使用事件驱动模式发布消息，解耦模块间依赖
 */
@ApiTags('Gateway')
@Controller('gateway')
export class GatewayController {
  constructor(
    private readonly gatewayService: GatewayService,
    private readonly userService: UserService,
    private readonly eventEmitter: EventEmitter2,
    private readonly loggerService: LoggerService,
  ) {}

  // 唯一的MQTT消息入口
  @MqttSubscribe(MqttTopic.allGatewayReport())
  async handleGatewayReport(@MqttPayload() payload: Buffer) {
    const message = parseMqttMessage(payload)
    if (!message) {
      this.loggerService.error(LogMessages.MQTT.PARSE_ERROR('payload parsed error'), 'MQTT-report')
      return
    }
    isGatewayMessage(message) && (await this.eventEmitter.emitAsync(AppEvents.MQTT_GATEWAY_MESSAGE, message))
    isSubDeviceMessage(message) && (await this.eventEmitter.emitAsync(AppEvents.MQTT_SUBDEVICE_MESSAGE, message))
  }

  // ========== 配网相关 API ==========
  /**
   * 绑定网关到用户账号（严格模式）
   *
   * 完整配网流程：
   * 1. App通过蓝牙连接网关，获取 gatewayId
   * 2. App通过蓝牙配置WiFi信息（SSID + 密码）
   * 3. 网关连接WiFi并连接MQTT Broker
   * 4. 网关自动注册（handleGatewayRegister），创建未绑定的网关记录
   * 5. App轮询 /gateway/:gatewayId/verify 检查网关是否在线
   * 6. 确认在线后，调用此接口绑定网关到用户账号
   *
   * 安全限制：
   * - 网关必须已通过MQTT注册（防止绑定虚假设备）
   * - 网关必须在线（防止绑定失效设备）
   * - 一个用户只能绑定一个网关（如需更换网关，请先解绑）
   * - 网关只能绑定一个用户（防止重复绑定）
   */
  @Post('/bind')
  @ApiResponseStandard({
    summary: '绑定网关到用户账号',
    responseDescription: '绑定成功',
    msg: '绑定成功',
    responseType: BindGatewayResponseDto,
  })
  async bindGateway(@Request() req: any, @Body() dto: BindGatewayDto) {
    const userId = req.user.id
    return await this.gatewayService.bindGatewayToUser(userId, dto.gatewayId, dto.name)
  }

  /**
   * 验证网关是否在线（配网完成后轮询调用）
   */
  @Post('/:gatewayId/verify')
  @ApiResponseStandard({
    summary: '验证配网状态',
    responseDescription: '返回网关在线状态',
    msg: '查询成功',
    responseType: VerifyPairingResponseDto,
  })
  async verifyPairing(@Param('gatewayId') gatewayId: string) {
    const isOnline = await this.gatewayService.verifyGatewayOnline(gatewayId)
    return {
      gatewayId,
      isOnline,
      message: isOnline ? '网关已上线' : '网关未上线，请稍候重试',
    }
  }

  /**
   * 获取网关状态
   */
  @Get('/:gatewayId/status')
  @ApiResponseStandard({
    summary: '获取网关状态',
    responseDescription: '返回网关详细状态',
    msg: '查询成功',
    responseType: GatewayStatusResponseDto,
  })
  async getGatewayStatus(@Param('gatewayId') gatewayId: string) {
    return await this.gatewayService.getGatewayStatus(gatewayId)
  }

  /**
   * 获取用户的所有网关
   */
  @Get('/list')
  @ApiResponseStandard({
    summary: '获取用户的网关列表',
    responseDescription: '返回网关列表',
    msg: '查询成功',
    responseType: [GatewayListItemDto],
  })
  async getUserGateways(@Request() req: any) {
    const userId = req.user.id
    return await this.gatewayService.getUserGateways(userId)
  }

  /**
   * 解绑网关
   */
  @Delete('/:gatewayId')
  @ApiResponseStandard({
    summary: '解绑网关',
    responseDescription: '解绑成功',
    msg: '解绑成功',
    responseType: UnbindGatewayResponseDto,
  })
  async unbindGateway(@Request() req: any, @Param('gatewayId') gatewayId: string) {
    const userId = req.user.id
    return await this.gatewayService.unbindGateway(userId, gatewayId)
  }

  /**
   * 获取网关下的子设备列表
   */
  @Get('/:gatewayId/devices')
  @ApiResponseStandard({
    summary: '获取子设备列表',
    responseDescription: '返回子设备列表',
    msg: '查询成功',
  })
  async getSubDevices(@Param('gatewayId') gatewayId: string) {
    return await this.gatewayService.getSubDevices(gatewayId)
  }

  /**
   * 测试接口
   */
  @Get('/test/protected')
  @ApiResponseStandard({
    summary: '测试受保护的接口',
    responseDescription: '返回用户信息',
    msg: '请求成功',
  })
  async testProtectedEndpoint(@Request() req: any) {
    return await this.userService.findOne(req.user.id)
  }
}
