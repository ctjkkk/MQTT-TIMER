import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common'
import { PskService } from './psk.service'

/**
 * PSK认证Controller
 * 提供PSK生成和确认的HTTP接口
 */
@Controller('psk')
export class PskController {
  constructor(private readonly pskService: PskService) {}

  /**
   * 生成PSK
   * POST /psk/generate
   * Body: { mac: string }
   * Response: { identity: string, key: string }
   */
  @Post('generate')
  @HttpCode(HttpStatus.OK)
  async generatePsk(@Body() body: { mac: string }) {
    const { mac } = body

    if (!mac) {
      return {
        success: false,
        message: 'MAC地址不能为空',
      }
    }

    try {
      const result = await this.pskService.generatePsk(mac)
      return {
        success: true,
        data: result,
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      }
    }
  }

  /**
   * 确认PSK烧录成功
   * POST /psk/confirm
   * Body: { mac: string }
   * Response: { success: boolean, message: string }
   */
  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  async confirmPsk(@Body() body: { mac: string }) {
    const { mac } = body
    if (!mac) {
      return {
        success: false,
        message: 'MAC地址不能为空',
      }
    }

    try {
      const result = await this.pskService.confirmPsk(mac)
      return result
    } catch (error) {
      return {
        success: false,
        message: error.message,
      }
    }
  }
}
