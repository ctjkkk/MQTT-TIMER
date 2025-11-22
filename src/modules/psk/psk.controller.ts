import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common'
import { PskService } from './psk.service'
import { SignatureGuard } from '@/modules/psk/guards/signature'

/**
 * PSK认证Controller
 * 提供PSK生成和确认的HTTP接口
 * 使用签名验证保护接口安全
 */
@Controller('psk')
@UseGuards(SignatureGuard)
export class PskController {
  constructor(private readonly pskService: PskService) {}

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
