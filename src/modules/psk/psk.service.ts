import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { randomBytes } from 'crypto'
import HanqiPsk from './schema/psk.schema'
import { LoggerService } from '@/common/logger/logger.service'
/**
 * PSK认证服务
 * 处理网关PSK的生成和确认
 */
@Injectable()
export class PskService {
  /**
   * 生成PSK
   * @param macAddress 网关MAC地址
   * @returns 返回生成的PSK信息（identity和key）
   */
  constructor(private readonly loggerService: LoggerService) {}
  async generatePsk(macAddress: string) {
    // 检查该MAC地址是否已经存在
    const existingPsk = await HanqiPsk.findOne({ mac_address: macAddress })
    if (existingPsk) {
      // 如果已经确认过，不允许重新生成
      if (existingPsk.status === 1) {
        throw new BadRequestException('该网关已经完成PSK烧录，不能重新生成')
      }
      // 如果是待确认状态，返回之前生成的PSK
      return {
        identity: existingPsk.identity,
        key: existingPsk.key,
      }
    }

    const identity = macAddress
    // 生成64字节的随机key（128位十六进制字符串）
    const key = randomBytes(64).toString('hex')
    // 写入数据库，status=0表示待确认
    await HanqiPsk.create({
      mac_address: macAddress,
      identity,
      key,
      status: 0,
    })

    this.loggerService.info(`[PskService] PSK identity: ${identity}, key: ${key} 已生成并写入数据库，状态: 待确认`)
    return {
      identity,
      key,
    }
  }

  /**
   * 确认PSK烧录成功
   * @param macAddress 网关MAC地址
   * @returns 是否确认成功
   */
  async confirmPsk(macAddress: string) {
    // 查找待确认的PSK记录
    const psk = await HanqiPsk.findOne({ mac_address: macAddress })
    if (!psk) {
      throw new NotFoundException('未找到该MAC地址的PSK记录，请先调用生成接口')
    }

    if (psk.status === 1) {
      return {
        success: true,
        message: 'PSK已经确认过',
      }
    }

    // 更新status为1，表示烧录成功
    psk.status = 1
    await psk.save()
    return {
      success: true,
      message: 'PSK烧录确认成功',
    }
  }

  /**
   * 根据identity查找PSK（用于MQTT认证）
   * @param identity PSK identity
   * @returns PSK key，如果未找到或未确认则返回null
   */
  async findPskByIdentity(identity: string): Promise<string | null> {
    const psk = await HanqiPsk.findOne({ identity, status: 1 })
    if (!psk) return null
    return psk.key
  }

  /**
   * 根据MAC地址查找PSK
   * @param macAddress MAC地址
   * @returns PSK记录
   */
  async findPskByMac(macAddress: string) {
    return HanqiPsk.findOne({ mac_address: macAddress })
  }
}
