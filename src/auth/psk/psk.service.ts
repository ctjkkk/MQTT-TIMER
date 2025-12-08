import { Injectable, BadRequestException, NotFoundException, OnModuleInit } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { randomBytes } from 'crypto'
import { HanqiPsk, HanqiPskDocument } from './schema/psk.schema'
import { LoggerService } from '@/core/logger/logger.service'
import { LogMessages } from '@/shared/constants/log-messages.constants'
import type { PskMeta } from './types/psk'
import { IPskServiceInterface } from './interface/pskService.interface'

/**
 * PSK认证服务
 * 处理网关PSK的生成和确认
 */
@Injectable()
export class PskService implements OnModuleInit, IPskServiceInterface {
  public pskCacheMap = new Map<string, PskMeta>()

  constructor(
    @InjectModel(HanqiPsk.name) private readonly hanqiPskModel: Model<HanqiPskDocument>,
    private readonly loggerService: LoggerService,
  ) {}

  async onModuleInit() {
    // 此时连接已 ready，可以安全查询
    const activeList = await this.hanqiPskModel.find({ status: 1 }).lean()
    activeList.forEach(d => this.pskCacheMap.set(d.identity, { key: d.key, status: d.status }))
  }

  async generatePsk(macAddress: string) {
    const existingPsk = await this.hanqiPskModel.findOne({ mac_address: macAddress })
    if (existingPsk && existingPsk.status) {
      throw new BadRequestException('该网关已经完成PSK烧录，不能重新生成')
    }
    const identity = macAddress
    // 生成64字节的随机key（128位十六进制字符串）
    const key = randomBytes(64).toString('hex')
    // 有则覆盖，无则新增
    await this.hanqiPskModel.findOneAndUpdate(
      { mac_address: macAddress },
      {
        $set: {
          identity,
          key,
          status: 0,
        },
      },
      {
        upsert: true, // 没有就插入
        new: true, // 返回更新后的文档
        runValidators: true, // 触发 schema 校验
      },
    )
    this.loggerService.info(LogMessages.PSK.GENERATED(identity, key), 'PSK')
    return { identity, key }
  }

  // 确认PSK烧录成功
  async confirmPsk(macAddress: string) {
    // 查找待确认的PSK记录
    const psk = await this.hanqiPskModel.findOne({ mac_address: macAddress })
    if (!psk) {
      throw new NotFoundException('未找到该MAC地址的PSK记录，请先调用生成接口')
    }
    if (psk.status) {
      return { tip: 'PSK已经确认过' }
    }
    // 更新status为1，表示烧录成功
    psk.status = 1
    await psk.save()
    return { tip: 'PSK烧录确认成功' }
  }

  public exists(identity: string): boolean {
    const result = this.pskCacheMap.get(identity)
    return result ? true : false
  }

  public isActive(identity: string): boolean {
    const mate = this.pskCacheMap.get(identity)
    return mate.status ? true : false
  }
}
