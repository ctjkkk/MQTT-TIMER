import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, UseFilters } from '@nestjs/common'
import { PskService } from './psk.service'
import { SignatureGuard } from '@/modules/psk/guards/signature'
import { ApiBody, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { GeneratePskDto, ConfirmPskDto } from './dto/psk.dto'
import { HttpExceptionsFilter } from '@/common/filters/exceptions.filter'

/**
 * PSK认证Controller
 * 提供PSK生成和确认的HTTP接口
 * 使用签名验证保护接口安全
 */

@ApiHeader({
  name: 'x-timestamp',
  description: 'Unix 时间戳（秒），与 x-signature 一起使用，须为 5 分钟内',
  required: true,
})
@ApiHeader({
  name: 'x-signature',
  description: 'Psk 模块签名，有效期 5 分钟',
  required: true,
})
@ApiTags('Psk')
@Controller('psk')
@UseGuards(SignatureGuard)
@UseFilters(HttpExceptionsFilter)
export class PskController {
  constructor(private readonly pskService: PskService) {}
  @Post('generate')
  @ApiOperation({ summary: '生成设备 PSK' })
  @ApiBody({ type: GeneratePskDto })
  @ApiResponse({ status: 200, description: '返回 PSK 与密钥' })
  @HttpCode(HttpStatus.OK)
  async generatePsk(@Body() body: { mac: string }) {
    const { mac } = body
    if (!mac) {
      return { success: false, message: 'MAC地址不能为空' }
    }
    const result = await this.pskService.generatePsk(mac)
    return { success: true, data: result }
  }

  @Post('confirm')
  @ApiOperation({ summary: '确认mac地址烧录成功!' })
  @ApiBody({ type: ConfirmPskDto })
  @ApiResponse({ status: 200, description: '返回 PSK 与密钥' })
  @HttpCode(HttpStatus.OK)
  async confirmPsk(@Body() body: { mac: string }) {
    const { mac } = body
    if (!mac) {
      return { success: false, message: 'MAC地址不能为空' }
    }
    const result = await this.pskService.confirmPsk(mac)
    return result
  }
}
