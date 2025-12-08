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
  @PskApiResponseStandard('生成设备 PSK', '返回 PSK 与密钥', 'key生成成功!云端已保存该条记录!', 200)
  async generatePsk(@Body() body: { mac: string }) {
    return this.pskService.generatePsk(body?.mac)
  }

  @Post('confirm')
  @ApiBody({ type: ConfirmPskDto })
  @PskApiResponseStandard('确认mac地址烧录成功!', '返回 PSK 与密钥', 'Psk烧录成功!云端已将该网关激活', 200)
  async confirmPsk(@Body() body: { mac: string }) {
    return this.pskService.confirmPsk(body?.mac)
  }
}
