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
import { SubDeviceListResponseDto } from '../timer/dto/timer.response.dto'
import { CheckOwnership } from '@/common/decorators/checkOwnership.decorator'

/**
 * Gateway模块的HTTP Controller
 *
 * 职责：
 * - 提供网关配网和管理的 HTTP REST API
 * - 处理用户的网关绑定、查询、解绑等操作
 * - 调用 Service 执行业务逻辑
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
    summary: 'Bind gateway to user account',
    responseDescription: 'Gateway bound successfully',
    message: 'Bound successfully',
    responseType: BindGatewayResponseDto,
  })
  async bindGateway(@CurrentUserId() userId: string, @Body() dto: BindGatewayDto) {
    return await this.gatewayService.bindGatewayToUser(userId, dto.gatewayId, dto.name)
  }

  /**
   * Verify gateway online status and binding status (for pairing process)
   * Purpose:
   * - Poll to check if gateway is online after pairing
   * - Smart check: determine if gateway is already bound to avoid duplicate pairing
   * Returns:
   * - isOnline: Whether gateway is online
   * - isBound: Whether gateway is bound to a user
   * - userId: Bound user ID (if bound)
   */
  @Post('/:gatewayId/verify')
  @ApiResponseStandard({
    summary: 'Verify pairing status',
    responseDescription: 'Returns gateway online and binding status',
    message: 'Verified successfully',
    responseType: VerifyPairingResponseDto,
  })
  async verifyGateway(@Param('gatewayId') gatewayId: string) {
    return await this.gatewayService.verifyGatewayForPairing(gatewayId)
  }

  /**
   * Get gateway status (requires user permission)
   */
  @Get('/:gatewayId/status')
  @CheckOwnership('gateway', 'gatewayId')
  @ApiResponseStandard({
    summary: 'Get gateway information',
    responseDescription: 'Returns gateway detailed information',
    message: 'Success',
    responseType: GatewayStatusResponseDto,
  })
  async getGatewayStatus(@Param('gatewayId') gatewayId: string) {
    return await this.gatewayService.getGatewayStatus(gatewayId)
  }

  /**
   * Unbind gateway
   */
  @Post('/:gatewayId')
  @CheckOwnership('gateway', 'gatewayId')
  @ApiResponseStandard({
    summary: 'Unbind gateway',
    responseDescription: 'Gateway unbound successfully',
    message: 'Unbound successfully',
    responseType: UnbindGatewayResponseDto,
  })
  async unbindGateway(@Param('gatewayId') gatewayId: string) {
    return await this.gatewayService.unbindGateway(gatewayId)
  }

  /**
   * Start sub-device pairing mode
   * User clicks to add sub-device, gateway enters pairing mode
   */
  @Post('/:gatewayId/pairing_start')
  @CheckOwnership('gateway', 'gatewayId')
  @ApiResponseStandard({
    summary: 'Start sub-device pairing',
    responseDescription: 'Gateway enters pairing mode',
    message: 'Gateway has entered sub-device pairing mode, waiting for sub-device connection',
  })
  async startSubDevicePairing(@Param('gatewayId') gatewayId: string) {
    return await this.gatewayService.startSubDevicePairing(gatewayId)
  }

  /**
   * Stop pairing (extended feature)
   * User clicks to stop pairing
   */
  @Post(':gatewayId/pairing_stop')
  @CheckOwnership('gateway', 'gatewayId')
  @ApiResponseStandard({
    summary: 'Stop sub-device pairing',
    responseDescription: 'Gateway exits pairing mode',
    message: 'Gateway has exited sub-device pairing mode',
  })
  async stopSubDevicePairing(@Param('gatewayId') gatewayId: string) {
    return await this.gatewayService.stopSubDevicePairing(gatewayId)
  }
  /**
   * Get sub-device list under gateway
   */
  @Get('/:gatewayId/devices')
  @CheckOwnership('gateway', 'gatewayId')
  @ApiResponseStandard({
    summary: 'Get sub-device list',
    responseDescription: 'Returns sub-device list',
    message: 'Success',
    responseType: [SubDeviceListResponseDto],
  })
  async getSubDevices(@Param('gatewayId') gatewayId: string) {
    return await this.gatewayService.getSubDevices(gatewayId)
  }
}
