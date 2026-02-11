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
    summary: 'Get product configuration list',
    responseDescription: 'Returns available product types',
    message: 'Success',
    responseType: [ProductHttpResponse],
  })
  getAllOfProductList() {
    return this.productService.findAllProducts()
  }

  @Get('/:productId')
  @ApiResponseStandard({
    summary: 'Get product configuration by PID',
    responseDescription: 'Returns product configuration by PID',
    message: 'Success',
    responseType: SingleProductHttpResponse,
  })
  getProduct(@Param('productId') productId: string) {
    return this.productService.findByProductPID(productId)
  }

  @Post('/create_product')
  @ApiResponseStandard({
    summary: 'Create product configuration',
    responseDescription: 'Creates product configuration',
    message: 'Created successfully',
    responseType: SingleProductHttpResponse,
  })
  createSingleProduct(@Body() dto: CreateProductDto) {
    return this.productService.createProduct(dto)
  }

  @Post('/forbidden_product/:productId')
  @ApiResponseStandard({
    summary: 'Disable product configuration',
    responseDescription: 'Disables product configuration',
    message: 'Disabled successfully',
  })
  async forbiddenProduct(@Param('productId') productId: string) {
    return await this.productService.forbiddenProductById(productId)
  }
}
