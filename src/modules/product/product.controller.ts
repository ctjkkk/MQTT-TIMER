import { ApiResponseStandard } from '@/common/decorators/apiResponse.decorator'
import { Body, Controller, Get, Param, Post } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { ProductService } from './product.service'
import { ProductHttpResponse, SingleProductHttpResponse } from './dto/product.response'
import { CreateProductDto } from './dto/create-product.dto'

@ApiTags('Product')
@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get('/get_products')
  @ApiResponseStandard({
    summary: '获取产品配置列表',
    responseDescription: '返回可用的产品类型',
    msg: '查询成功',
    responseType: [ProductHttpResponse],
  })
  getAllOfProductList() {
    return this.productService.findAllProducts()
  }

  @Get('/:productId')
  @ApiResponseStandard({
    summary: '根据PID查询单个产品配置',
    responseDescription: '根据PID查询单个产品配置',
    msg: '查询成功',
    responseType: SingleProductHttpResponse,
  })
  getProduct(@Param('productId') productId: string) {
    return this.productService.findByProductPID(productId)
  }

  @Post('/create_product')
  @ApiResponseStandard({
    summary: '创建产品配置',
    responseDescription: '创建产品配置',
    msg: '创建成功',
    responseType: SingleProductHttpResponse,
  })
  createSingleProduct(@Body() dto: CreateProductDto) {
    return this.productService.createProduct(dto)
  }

  @Post('/forbidden_product/:productId')
  @ApiResponseStandard({
    summary: '禁用产品配置',
    responseDescription: '禁用产品配置',
    msg: '禁用成功',
  })
  async forbiddenProduct(@Param('productId') productId: string) {
    return await this.productService.forbiddenProductById(productId)
  }
}
