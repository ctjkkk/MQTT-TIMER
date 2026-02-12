import { ApiResponseStandard, ApiKeyFileUploadStandard, ApiKeyFileDownloadStandard } from '@/common/decorators/apiResponse.decorator'
import { Body, Controller, Get, Param, Post, UploadedFile, StreamableFile } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { OtaService } from './ota.service'
import { UploadFirmwareDto } from './dto/upload-firmware.dto'
import { FirmwareResponseDto } from './dto/firmware-response.dto'

@ApiTags('OTA')
@Controller('ota')
export class OtaController {
  constructor(private readonly otaService: OtaService) {}
  //前端请求升级接口，后端负责下发升级命令给网关
  @Post('/:gatewayId/upgrade')
  @ApiResponseStandard({
    summary: 'upgrade gateway firmware',
    responseDescription: 'Upgrade command sent successfully',
    message: 'Upgrade command sent',
  })
  async upgrade(@Param('gatewayId') gatewayId: string) {
    return await this.otaService.upgradeByGatewayId(gatewayId)
  }

  //固件端上传固件（管理员操作，在升级流程开始前）
  @Post('firmware/upload')
  @ApiKeyFileUploadStandard({
    summary: 'Upload firmware file',
    responseDescription: 'Firmware uploaded successfully',
    message: 'Firmware uploaded',
    statusCode: 200,
    requestType: UploadFirmwareDto,
    responseType: FirmwareResponseDto,
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedExtensions: ['bin', 'hex'],
  })
  async uploadFirmware(@UploadedFile() file: Express.Multer.File, @Body() body: UploadFirmwareDto) {
    return await this.otaService.uploadFirmware(file, body)
  }

  //网关下载固件（网关自动调用，需要 API Key）
  @Get('firmware/download/:firmwareId')
  @ApiKeyFileDownloadStandard({
    summary: 'Download firmware file by firmware ID',
    paramName: 'firmwareId',
    paramDescription: 'Firmware ID',
    paramExample: '65f1234567890abcdef12341',
  })
  async downloadFirmware(@Param('firmwareId') firmwareId: string): Promise<StreamableFile> {
    // 通过 ID 查询固件信息并下载
    return await this.otaService.downloadFirmwareById(firmwareId)
  }

  // 查询升级进度条（前端查询）
  @Get('/:gatewayId/upgrade/status')
  @ApiResponseStandard({
    summary: 'Get current upgrade status',
    responseDescription: 'Returns upgrade progress',
    message: 'Success',
  })
  async getUpgradeStatus(@Param('gatewayId') gatewayId: string) {
    return await this.otaService.getUpgradeStatusByGatewayId(gatewayId)
  }
}
