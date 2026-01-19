import { Controller, Post, Body } from '@nestjs/common'
import { PskService } from './psk.service'
import { ApiBody, ApiTags } from '@nestjs/swagger'
import { GeneratePskDto, ConfirmPskDto } from './dto/psk.dto'
import { PskApiResponseStandard } from '@/common/decorators/apiResponse.decorator'

/**
 * PSK认证Controller
 * 提供PSK生成和确认的HTTP接口
 * 使用签名验证保护接口安全
 */

@ApiTags('Psk')
@Controller('psk')
export class PskController {
  constructor(private readonly pskService: PskService) {}
  @Post('generate')
  @ApiBody({ type: GeneratePskDto })
  @PskApiResponseStandard({
    summary: '生成设备 PSK',
    responseDescription: '返回 PSK 与密钥',
    msg: 'key生成成功!云端已保存该条记录!',
  })
  async generatePsk(@Body() body: { mac: string }) {
    return this.pskService.generatePsk(body?.mac)
  }

  @Post('confirm')
  @ApiBody({ type: ConfirmPskDto })
  @PskApiResponseStandard({
    summary: '确认mac地址烧录成功!',
    responseDescription: '返回 PSK 与密钥',
    msg: 'Psk烧录成功!云端已将该网关激活',
  })
  async confirmPsk(@Body() body: { mac: string }) {
    return this.pskService.confirmPsk(body?.mac)
  }
}
