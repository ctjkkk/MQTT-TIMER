import { UploadFirmwareDto } from '../dto/upload-firmware.dto'
import { FirmwareResponseDto } from '../dto/firmware-response.dto'
import type { Response } from 'express'
import { StreamableFile } from '@nestjs/common'

export interface IOtaServiceInterface {
  upgradeByGatewayId(gatewayId: string): Promise<void>
  uploadFirmware(file: Express.Multer.File, body: UploadFirmwareDto): Promise<FirmwareResponseDto>
  getUpgradeStatusByGatewayId(gatewayId: string): Promise<any>
  downloadFirmwareById(id: string): Promise<StreamableFile>
  downloadFirmware(filename: string, res: Response): Promise<void> // 兼容旧版
}
