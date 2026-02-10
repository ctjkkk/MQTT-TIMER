import { ProductDocument } from '../schema/product.schema'
import { ProductHttpResponse, SingleProductHttpResponse } from '../dto/product.response'
import { CreateProductDto } from '../dto/create-product.dto'

/**
 * 产品配置服务接口
 *
 * 职责：
 * - 定义产品配置相关的业务逻辑接口
 * - 提供统一的服务契约，便于测试和依赖注入
 *
 * 为什么需要 Interface？
 * 1. 提高可测试性：可以创建 Mock 实现用于单元测试
 * 2. 依赖倒置原则：依赖抽象而不是具体实现
 * 3. 代码解耦：便于切换不同的实现（如从 MongoDB 切换到其他数据库）
 */
export interface IProductService {
  /**
   * 根据 productId 获取产品配置（用于内部业务逻辑）
   * 使用场景：
   * - 网关上报新子设备时验证 productId
   * - 其他服务需要获取产品配置信息
   * @param productId 产品ID
   * @returns 产品配置对象，如果不存在或已禁用返回 null
   */
  getProductConfig(productId: string): Promise<ProductDocument | null>

  /**
   * 查询所有启用的产品配置列表（HTTP 响应格式）
   * 使用场景：
   * - App 显示产品选择列表
   * - 管理后台显示产品列表
   * @returns 产品配置列表
   */
  findAllProducts(): Promise<ProductHttpResponse[]>

  /**
   * 根据 productId 查询单个产品配置（HTTP 响应格式）
   * 使用场景：
   * - App 显示产品详情页面
   * - 管理后台编辑产品时查询详情
   * @param productId 产品ID
   * @returns 产品配置详情
   */
  findByProductPID(productId: string): Promise<SingleProductHttpResponse>

  /**
   * 创建新产品配置
   * 使用场景：
   * - 汉奇推出新型号水阀时，通过管理后台添加
   * - 不需要修改代码和重启服务
   * @param data 产品配置数据
   * @returns 创建的产品配置
   */
  createProduct(data: CreateProductDto): Promise<ProductDocument>

  /**
   * 禁用产品（软删除）
   * 使用场景：
   * - 某个型号停产，不再支持新设备添加
   * - 已添加的设备仍可正常使用
   * @param productId 产品ID
   */
  forbiddenProductById(productId: string): Promise<void>
}
