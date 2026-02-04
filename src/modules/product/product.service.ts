import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Product, ProductDocument, PREDEFINED_PRODUCTS } from './schema/product.schema'
import { LoggerService } from '@/core/logger/logger.service'
import { LogContext } from '@/shared/constants/logger.constants'

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
export class ProductService implements OnModuleInit {
  // NestJS 自带的系统日志（只输出到控制台，不写入文件）
  private readonly systemLogger = new Logger(ProductService.name)

  constructor(
    @InjectModel(Product.name)
    private readonly productConfigModel: Model<ProductDocument>,
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
    const stats = { created: 0, existed: 0 }
    for (const product of PREDEFINED_PRODUCTS) {
      const exists = await this.productConfigModel.findOne({ productId: product.productId })
      if (!exists) {
        await this.productConfigModel.create(product)
        this.systemLogger.log(`初始化产品配置: ${product.name} (productId: ${product.productId})`)
        stats.created++
      } else {
        stats.existed++
      }
    }
    this.systemLogger.log(`Product configuration initialized: ${stats.created} created, ${stats.existed} existed`)
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
    const config = await this.productConfigModel.findOne({ productId, enabled: true }).lean()
    return config as ProductDocument | null
  }

  /**
   * 获取所有启用的产品配置
   * 使用场景：
   * - App 显示"选择产品型号"页面（用户手动添加设备时）
   * - 管理后台显示产品列表
   */
  async getAllProducts(): Promise<ProductDocument[]> {
    return this.productConfigModel.find({ enabled: true }).sort({ productId: 1 }).lean()
  }

  /**
   * 添加新产品配置
   * 使用场景：
   * - 汉奇推出新型号水阀时，通过管理后台添加
   * - 不需要修改代码和重启服务
   */
  async createProduct(data: Partial<Product>): Promise<ProductDocument> {
    const product = await this.productConfigModel.create(data)
    this.logger.info(`创建新产品配置: ${data.name} (productId: ${data.productId})`, LogContext.TIMER_SERVICE)
    return product
  }

  /**
   * 更新产品配置
   * 使用场景：
   * - 修改产品名称、描述、图片等
   * - 甚至可以修改出水口数量（如果硬件升级了）
   */
  async updateProduct(productId: string, updates: Partial<Product>): Promise<ProductDocument | null> {
    const product = await this.productConfigModel.findOneAndUpdate({ productId }, { $set: updates }, { new: true })
    if (product) {
      this.logger.info(`更新产品配置: ${product.name} (productId: ${productId})`, LogContext.TIMER_SERVICE)
    }
    return product
  }

  /**
   * 禁用产品（软删除）
   * 使用场景：
   * - 某个型号停产，不再支持新设备添加
   * - 已添加的设备仍可正常使用
   */
  async disableProduct(productId: string): Promise<void> {
    await this.productConfigModel.updateOne({ productId }, { $set: { enabled: false } })
    this.logger.info(`禁用产品配置: productId=${productId}`, LogContext.TIMER_SERVICE)
  }
}
