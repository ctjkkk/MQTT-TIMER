import { Controller, Post, Body } from '@nestjs/common'
import { PskService } from './psk.service'
import { ApiBody, ApiTags, ApiHeader } from '@nestjs/swagger'
import { GeneratePskDto, ConfirmPskDto } from './dto/psk.dto'
import { GeneratePskResponseDto, ConfirmPskResponseDto } from './dto/http-response.dto'
import { PskApiResponseStandard } from '@/common/decorators/apiResponse.decorator'

/**
 * PSK认证Controller
 * 提供PSK生成和确认的HTTP接口
 * 使用API Key保护接口安全
 *
 * 使用方法：
 * 1. 在环境变量中设置 FACTORY_API_KEY
 * 2. 请求时在请求头添加：X-API-Key: {你的密钥}
 * 3. 请求体只需要提供 macAddress
 *
 * MQTT连接说明：
 * 1. 调用 /psk/generate 接口获取 identity 和 key
 * 2. 使用 identity 作为MQTT用户名
 * 3. 使用 key 作为MQTT密码
 * 4. 连接到PSK端口：8445
 * 5. 连接成功后调用 /psk/confirm 接口确认烧录成功
 */

@ApiTags('Psk')
@Controller('psk')
export class PskController {
  constructor(private readonly pskService: PskService) {}
  @Post('generate')
  @ApiBody({ type: GeneratePskDto })
  @PskApiResponseStandard({
    summary: 'Generate device PSK',
    responseDescription: 'Returns PSK and key',
    message: 'Key generated successfully! Record saved in cloud!',
    responseType: GeneratePskResponseDto,
  })
  async generatePsk(@Body() body: { mac: string }) {
    return this.pskService.generatePsk(body?.mac)
  }

  @Post('confirm')
  @ApiBody({ type: ConfirmPskDto })
  @PskApiResponseStandard({
    summary: 'Confirm MAC address burned successfully',
    responseDescription: 'Returns confirmation result',
    message: 'PSK burned successfully! Gateway activated in cloud',
    responseType: ConfirmPskResponseDto,
  })
  async confirmPsk(@Body() body: { mac: string }) {
    return this.pskService.confirmPsk(body?.mac)
  }
}
