import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Product, ProductDocument, PREDEFINED_PRODUCTS } from './schema/product.schema'
import { LoggerService } from '@/core/logger/logger.service'
import { LogContext, LogMessages } from '@/shared/constants/logger.constants'
import { ProductHttpResponse, SingleProductHttpResponse } from './dto/product.response'
import { CreateProductDto } from './dto/create-product.dto'
import { IProductService } from './interfaces/product.service.interface'

/**
 * 产品配置服务
 *
 * 职责：
 * 1. 提供根据 productId 查询产品配置的方法（改造核心）
 * 2. 系统启动时自动初始化预定义产品配置
 * 3. 管理产品配置的增删改查
 *
 * 为什么需要这个服务？
 * - 产品信息集中管理，新产品上线不需要改代码
 */
@Injectable()
export class ProductService implements IProductService, OnModuleInit {
  // NestJS 自带的系统日志（只输出到控制台，不写入文件）
  private readonly systemLogger = new Logger(ProductService.name)

  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    private readonly logger: LoggerService,
  ) {}

  /**
   * 模块初始化时执行
   * 说明：
   * - NestJS 启动时会自动调用这个方法
   * - 用于初始化预定义的产品配置
   * 为什么在这里初始化？
   * - 汉奇水阀有固定的几种型号（单路、双路、三路、四路）
   * - 系统第一次部署时，需要把这些标准产品写入数据库
   * - 后续启动时，如果已存在则跳过
   */
  async onModuleInit() {
    await this.initPredefinedProducts()
  }

  /**
   * 初始化预定义产品配置
   * 执行时机：系统启动时自动执行
   * 逻辑：
   * - 遍历 PREDEFINED_PRODUCTS 数组
   * - 检查数据库中是否已存在该 productId
   * - 不存在则插入，存在则跳过
   */
  private async initPredefinedProducts() {
    const stats = { created: 0, updated: 0, unchanged: 0 }
    for (const product of PREDEFINED_PRODUCTS) {
      const result = await this.productModel.updateOne({ productId: product.productId }, { $set: product }, { upsert: true })
      const { upsertedCount, modifiedCount } = result
      const status = upsertedCount ? 'created' : modifiedCount ? 'updated' : 'unchanged'
      stats[status]++
      upsertedCount && this.systemLogger.log(LogMessages.PRODUCT.INIT_SINGLE(product.name, product.productId))
      modifiedCount && this.systemLogger.log(LogMessages.PRODUCT.UPDATED(product.name, product.productId))
    }
    this.systemLogger.log(LogMessages.PRODUCT.INIT_COMPLETE(stats.created, stats.updated, stats.unchanged))
  }

  /**
   * 根据 productId 获取产品配置
   * 这是整个改造的核心方法！
   * 使用场景：
   * - 网关上报新子设备时：
   *     config = await productService.getProductConfig(productId)
   * - App 显示产品信息时：
   *     productConfig = await productService.getProductConfig(productId)
   *     显示：productConfig.name, productConfig.imageUrl, productConfig.description
   * @param productId 产品ID（网关上报的）
   * @returns 产品配置对象，如果不存在或已禁用返回 null
   */
  async getProductConfig(productId: string): Promise<ProductDocument | null> {
    const config = await this.productModel.findOne({ productId, enabled: 1 }).lean()
    return config as ProductDocument | null
  }

  /**
   * 禁用产品（软删除）
   * 使用场景：
   * - 某个型号停产，不再支持新设备添加
   * - 已添加的设备仍可正常使用
   */
  async forbiddenProductById(productId: string): Promise<void> {
    await this.productModel.updateOne({ productId }, { $set: { enabled: 0 } })
    this.logger.info(LogMessages.PRODUCT.DISABLED(productId), LogContext.PRODUCT_SERVICE)
  }

  /**
   * 查询所有启用的产品配置列表（HTTP 响应格式）
   * 使用场景：App 或管理后台获取产品列表
   */
  async findAllProducts(): Promise<ProductHttpResponse[]> {
    return (await this.productModel.find({ enabled: 1 }).lean()).map(item => ({
      productId: item.productId,
      name: item.name,
      description: item.description,
      imageUrl: item.imageUrl,
      outletCount: item.outletCount,
      defaultFirmwareVersion: item.defaultFirmwareVersion,
      defaultBatteryLevel: item.defaultBatteryLevel,
    }))
  }

  /**
   * 根据 productId 查询单个产品配置（HTTP 响应格式）
   * 使用场景：App 或管理后台获取产品详情
   * @param productId 产品ID
   */
  async findByProductPID(productId: string): Promise<SingleProductHttpResponse> {
    return await this.productModel
      .findOne({ productId })
      .select({
        productId: 1,
        name: 1,
        description: 1,
        imageUrl: 1,
        outletCount: 1,
        enabled: 1,
        defaultFirmwareVersion: 1,
        defaultBatteryLevel: 1,
        _id: 0,
      })
      .lean()
  }

  /**
   * 添加新产品配置
   * 使用场景：
   * - 汉奇推出新型号水阀时，通过管理后台添加
   * - 不需要修改代码和重启服务
   */
  async createProduct(data: CreateProductDto): Promise<ProductDocument> {
    const product = await this.productModel.create(data)
    this.logger.info(LogMessages.PRODUCT.CREATED(data.name, data.productId), LogContext.PRODUCT_SERVICE)
    return product
  }
}
