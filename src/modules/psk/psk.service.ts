import { Injectable, BadRequestException, NotFoundException, OnModuleInit } from '@nestjs/common'
import { randomBytes } from 'crypto'
import HanqiPsk from './schema/psk.schema'
import { LoggerService } from '@/common/logger/logger.service'
import { LogMessages } from '@/shared/constants/log-messages.constants'
/**
 * PSK认证服务
 * 处理网关PSK的生成和确认
 */
@Injectable()
export class PskService implements OnModuleInit {
  /** identity -> key （只存 status=1） */
  private readonly cache = new Map<string, string>()
  constructor(private readonly loggerService: LoggerService) {}

  async onModuleInit() {
    const confirmed = await HanqiPsk.find({ status: 1 })
    confirmed.forEach(p => this.cache.set(p.identity, p.key))
    this.loggerService.info(LogMessages.PSK.LOAD(this.cache.size), 'PSK')
  }
  async generatePsk(macAddress: string) {
    const existingPsk = await HanqiPsk.findOne({ mac_address: macAddress })
    if (existingPsk) {
      // 如果已经确认过，不允许重新生成
      if (existingPsk.status === 1) {
        throw new BadRequestException('该网关已经完成PSK烧录，不能重新生成')
      }
      // 如果是待确认状态，返回之前生成的PSK
      return { identity: existingPsk.identity, key: existingPsk.key }
    }

    const identity = macAddress
    // 生成64字节的随机key（128位十六进制字符串）
    const key = randomBytes(64).toString('hex')
    // 写入数据库，status=0表示待确认
    await HanqiPsk.create({ mac_address: macAddress, identity, key, status: 0 })
    this.loggerService.info(LogMessages.PSK.GENERATED(identity, key), 'PSK')
    return { identity, key }
  }

  // 确认PSK烧录成功
  async confirmPsk(macAddress: string) {
    // 查找待确认的PSK记录
    const psk = await HanqiPsk.findOne({ mac_address: macAddress })
    if (!psk) {
      throw new NotFoundException('未找到该MAC地址的PSK记录，请先调用生成接口')
    }
    if (psk.status) {
      return { success: true, message: 'PSK已经确认过' }
    }
    // 更新status为1，表示烧录成功
    psk.status = 1
    await psk.save()
    this.cache.set(psk.identity, psk.key)
    return { success: true, message: 'PSK烧录确认成功' }
  }

  // 供 TLS 回调同步获取
  getKeySync(identity: string): Buffer | null {
    const key = this.cache.get(identity)
    return key ? Buffer.from(key, 'hex') : null
  }
}
