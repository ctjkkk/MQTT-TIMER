import { Injectable, BadRequestException, NotFoundException, OnModuleInit } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { randomBytes } from 'crypto'
import { Psk, PskDocument } from './schema/psk.schema'
import { LoggerService } from '@/core/logger/logger.service'
import { LogMessages, LogContext } from '@/shared/constants/logger.constants'
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
    @InjectModel(Psk.name) private readonly hanqiPskModel: Model<PskDocument>,
    private readonly loggerService: LoggerService,
  ) {}

  async onModuleInit() {
    // 此时连接已 ready，可以安全查询
    const activeList = await this.hanqiPskModel.find({ status: 1 }).lean()
    activeList.forEach(d => this.pskCacheMap.set(d.identity, { key: d.key, status: d.status }))
    this.loggerService.info(LogMessages.PSK.LOAD(this.pskCacheMap.size), LogContext.PSK)
  }

  async generatePsk(macAddress: string) {
    const existingPsk = await this.hanqiPskModel.findOne({ mac_address: macAddress })
    // 如果旧PSK存在，直接删除缓存（因为要生成新key）
    existingPsk && this.pskCacheMap.delete(existingPsk.identity)
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
    // 同步更新缓存，允许设备立即尝试连接
    this.pskCacheMap.set(identity, { key, status: 0 })
    this.loggerService.info(LogMessages.PSK.GENERATED(identity, key), LogContext.PSK)
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
    // 🔧 同步更新缓存状态
    this.pskCacheMap.set(psk.identity, { key: psk.key, status: 1 })
    this.loggerService.info(`PSK 已确认并激活: ${psk.identity}`, LogContext.PSK)
    return { tip: 'PSK烧录确认成功' }
  }

  public exists(identity: string): boolean {
    const result = this.pskCacheMap.get(identity)
    return result ? true : false
  }

  public isActive(identity: string): boolean {
    const mate = this.pskCacheMap.get(identity)
    return mate && mate.status ? true : false
  }
}
