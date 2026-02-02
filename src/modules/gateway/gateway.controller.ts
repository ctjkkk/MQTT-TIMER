import { Controller, Get, Post, Body, Param } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { ApiResponseStandard } from '@/common/decorators/apiResponse.decorator'
import { GatewayService } from './gateway.service'
import { BindGatewayDto } from './dto/pairing.dto'
import {
  BindGatewayResponseDto,
  VerifyPairingResponseDto,
  GatewayStatusResponseDto,
  UnbindGatewayResponseDto,
} from './dto/http-response.dto'
import { CurrentUserId } from '@/common/decorators/paramExtractor.decorators'
import { SubDeviceListResponseDto } from '../timer/dto/http-response.dto'

/**
 * Gateway模块的HTTP Controller
 *
 * 职责：
 * - 提供网关配网和管理的 HTTP REST API
 * - 处理用户的网关绑定、查询、解绑等操作
 * - 调用 Service 执行业务逻辑
 *
 * 注意：
 * - MQTT消息处理已移至 gateway.mqtt.ts
 * - 事件监听已移至 gateway.events.ts
 * - 业务逻辑在 gateway.service.ts
 */
@ApiTags('Gateway')
@Controller('gateway')
export class GatewayController {
  constructor(private readonly gatewayService: GatewayService) {}
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
  async bindGateway(@CurrentUserId() userId: string, @Body() dto: BindGatewayDto) {
    return await this.gatewayService.bindGatewayToUser(userId, dto.gatewayId, dto.name)
  }

  /**
   * 验证网关在线状态和绑定状态（配网流程专用）
   * 用途：
   * - 配网完成后轮询检查网关是否上线
   * - 前端智能判断：检查网关是否已绑定，避免重复配网
   * 返回：
   * - isOnline: 网关是否在线
   * - isBound: 网关是否已绑定用户
   * - userId: 绑定的用户ID（如果已绑定）
   */
  @Post('/:gatewayId/verify')
  @ApiResponseStandard({
    summary: '验证配网状态',
    responseDescription: '返回网关在线状态和绑定状态',
    msg: '验证成功',
    responseType: VerifyPairingResponseDto,
  })
  async verifyGateway(@Param('gatewayId') gatewayId: string) {
    return await this.gatewayService.verifyGatewayForPairing(gatewayId)
  }

  /**
   * 获取网关状态（需要用户权限）
   */
  @Get('/:gatewayId/status')
  @ApiResponseStandard({
    summary: '获取网关信息',
    responseDescription: '返回网关详细信息',
    msg: '查询成功',
    responseType: GatewayStatusResponseDto,
  })
  async getGatewayStatus(@CurrentUserId() userId: string, @Param('gatewayId') gatewayId: string) {
    return await this.gatewayService.getGatewayStatus(gatewayId, userId)
  }

  /**
   * 解绑网关
   */
  @Post('/:gatewayId')
  @ApiResponseStandard({
    summary: '解绑网关',
    responseDescription: '解绑成功',
    msg: '解绑成功',
    responseType: UnbindGatewayResponseDto,
  })
  async unbindGateway(@CurrentUserId() userId: string, @Param('gatewayId') gatewayId: string) {
    return await this.gatewayService.unbindGateway(userId, gatewayId)
  }

  /**
   * 用户点击添加子设备后
   * 让网关进入配对子设备模式
   */
  @Post('/:gatewayId/pairing_start')
  @ApiResponseStandard({
    summary: '开始子设备配对',
    responseDescription: '网关进入配对模式',
    msg: '网关已进入子设备配对模式，等待子设备连接',
  })
  async startSubDevicePairing(@CurrentUserId() userId: string, @Param('gatewayId') gatewayId) {
    return await this.gatewayService.startSubDevicePairing(userId, gatewayId)
  }

  /**
   * 用户点击停止配对(扩展功能)
   */
  @Post(':gatewayId/pairing_stop')
  @ApiResponseStandard({
    summary: '停止配对子设备',
    responseDescription: '网关关闭配对模式',
    msg: '网关已关闭子设备配对模式',
  })
  async stopSubDevicePairing(@CurrentUserId() userId: string, @Param('gatewayId') gatewayId: string) {
    return await this.gatewayService.stopSubDevicePairing(userId, gatewayId)
  }
  /**
   * 获取网关下的子设备列表
   */
  @Get('/:gatewayId/devices')
  @ApiResponseStandard({
    summary: '获取子设备列表',
    responseDescription: '返回子设备列表',
    msg: '查询成功',
    responseType: [SubDeviceListResponseDto],
  })
  async getSubDevices(@CurrentUserId() userId: string, @Param('gatewayId') gatewayId: string) {
    return await this.gatewayService.getSubDevices(gatewayId, userId)
  }
}
