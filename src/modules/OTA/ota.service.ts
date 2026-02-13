import { Injectable, BadRequestException, InternalServerErrorException, NotFoundException, StreamableFile } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { IOtaServiceInterface } from './interfaces/ota-service.interface'
import { UploadFirmwareDto } from './dto/upload-firmware.dto'
import { FirmwareResponseDto } from './dto/firmware-response.dto'
import { Firmware, FirmwareDocument } from './schemas/firmware.schema'
import { UpgradeTask, UpgradeTaskDocument } from './schemas/upgrade-task.schema'
import { Gateway, GatewayDocument } from '@/modules/gateway/schema/gateway.schema'
import { CommandSenderService } from '@/core/mqtt/services/commandSender.service'
import { calculateSHA256 } from '@/common/utils/calculate'
import * as fs from 'fs'
import * as path from 'path'
import { UpgradeStatusResponseDto } from './dto/upgrade-response.dto'

@Injectable()
export class OtaService implements IOtaServiceInterface {
  private readonly uploadDir = path.join(process.cwd(), 'uploads', 'firmwares')
  constructor(
    @InjectModel(Firmware.name) private firmwareModel: Model<FirmwareDocument>,
    @InjectModel(UpgradeTask.name) private upgradeTaskModel: Model<UpgradeTaskDocument>,
    @InjectModel(Gateway.name) private gatewayModel: Model<GatewayDocument>,
    private readonly commandSender: CommandSenderService,
  ) {
    // 确保上传目录存在
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true })
    }
  }

  async upgradeByGatewayId(gatewayId: string): Promise<void> {
    // 查询网关信息
    const gateway = await this.gatewayModel.findOne({ gatewayId }).lean()
    if (!gateway) throw new NotFoundException(`Gateway ${gatewayId} not found`)

    // 查询最新的已发布固件
    const latestFirmware = await this.firmwareModel
      .findOne({
        deviceType: 'gateway',
        status: 'released', // 只查询已发布的固件
      })
      .sort({ createdAt: -1 }) // 按创建时间倒序

    if (!latestFirmware) throw new NotFoundException('No available firmware for upgrade')

    // 检查是否需要升级(拿当前版本和已发布的最新版本作比较)
    const currentVersion = gateway.firmware_version
    if (currentVersion === latestFirmware.version) {
      throw new BadRequestException(`Gateway is already on version ${currentVersion}`)
    }

    // 生成升级任务
    const msgId = `upgrade_${gatewayId}_${Date.now()}`
    await this.upgradeTaskModel.create({
      gatewayId,
      fromVersion: currentVersion,
      toVersion: latestFirmware.version,
      firmwareUrl: latestFirmware.fileUrl,
      sha256: latestFirmware.sha256,
      fileSize: latestFirmware.fileSize,
      msgId,
      status: 'pending',
    })

    // 通过 MQTT 下发升级通知给指定的网关
    this.commandSender.sendUpgradeCommand(gatewayId, {
      version: latestFirmware.version,
      downloadUrl: latestFirmware.fileUrl,
      sha256: latestFirmware.sha256,
      fileSize: latestFirmware.fileSize,
    })
  }

  async uploadFirmware(file: Express.Multer.File, body: UploadFirmwareDto): Promise<FirmwareResponseDto> {
    // 验证文件是否存在
    if (!file) throw new BadRequestException('No file uploaded')
    const { version, deviceType, description } = body

    // 检查版本是否已存在
    const existingFirmware = await this.firmwareModel.findOne({ version, deviceType })
    if (existingFirmware) throw new BadRequestException(`Firmware version ${version} for ${deviceType} already exists`)

    const sha256 = calculateSHA256(file.buffer) // 更安全的哈希算法

    // 生成唯一文件名（避免文件名冲突）
    const fileExtension = path.extname(file.originalname) // .bin 或 .hex
    const fileName = `${deviceType}_v${version}_${Date.now()}${fileExtension}`
    const filePath = path.join(this.uploadDir, fileName)

    // 保存文件到磁盘
    try {
      fs.writeFileSync(filePath, file.buffer)
    } catch (error) {
      throw new InternalServerErrorException(`Failed to save file: ${error.message}`)
    }

    // 提前生成 ObjectId，这样就可以在创建时直接使用正确的 URL
    const firmwareId = new Types.ObjectId()
    const fileUrl = `http://${process.env.APP_HOST}:${process.env.APP_PORT}/ota/firmware/download/${firmwareId}`

    // 创建固件记录（使用预生成的 ID 和正确的 URL）
    const firmware = await this.firmwareModel.create({
      _id: firmwareId,
      version,
      fileName,
      fileUrl,
      fileSize: file.size,
      sha256, // 使用 SHA256 作为主要校验方式
      deviceType,
      description,
      status: 'draft', // 默认为草稿状态
    })
    return {
      firmwareId: firmware._id,
      version: firmware.version,
      deviceType: firmware.deviceType,
      fileName: firmware.fileName,
      fileUrl: firmware.fileUrl,
      fileSize: firmware.fileSize,
      sha256: firmware.sha256,
      description: firmware.description,
      status: firmware.status,
      createdAt: firmware.createdAt,
    }
  }

  /**
   * 查询网关当前的升级状态
   * 用途：前端轮询升级进度条
   * @param gatewayId 网关ID
   * @returns 返回最新的升级任务状态
   */
  async getUpgradeStatusByGatewayId(gatewayId: string): Promise<UpgradeStatusResponseDto> {
    // 查询该网关最新的升级任务（按创建时间倒序）
    const latestTask = await this.upgradeTaskModel
      .findOne({ gatewayId })
      .sort({ createdAt: -1 }) // 最新的任务
      .lean()

    // 如果没有升级任务，返回未升级状态
    if (!latestTask) {
      return {
        hasTask: false,
        message: '暂无升级任务',
      }
    }

    // 计算耗时（如果已完成）
    let duration = latestTask.duration
    if (!duration && latestTask.startTime) {
      const endTime = latestTask.completeTime || new Date()
      duration = Math.floor((endTime.getTime() - latestTask.startTime.getTime()) / 1000)
    }

    // 返回升级状态详情
    return {
      hasTask: true,
      taskId: latestTask._id,
      gatewayId: latestTask.gatewayId,
      fromVersion: latestTask.fromVersion,
      toVersion: latestTask.toVersion,
      status: latestTask.status,
      progress: latestTask.progress,
      startTime: latestTask.startTime,
      completeTime: latestTask.completeTime,
      duration,
      errorCode: latestTask.errorCode,
      errorMessage: latestTask.errorMessage,
      retryCount: latestTask.retryCount,
      createdAt: latestTask.createdAt,
      updatedAt: latestTask.updatedAt,
    }
  }

  async downloadFirmwareById(id: string): Promise<StreamableFile> {
    // 查询固件信息
    const firmware = await this.firmwareModel.findById(id)
    if (!firmware) throw new NotFoundException('Firmware not found')

    // 检查文件是否存在
    const filePath = path.join(this.uploadDir, firmware.fileName)
    if (!fs.existsSync(filePath)) throw new NotFoundException('Firmware file not found on disk')

    // 创建文件流并返回 StreamableFile
    const fileStream = fs.createReadStream(filePath)
    return new StreamableFile(fileStream, {
      type: 'application/octet-stream',
      disposition: `attachment; filename="${firmware.fileName}"`,
      length: firmware.fileSize,
    })
  }
}
