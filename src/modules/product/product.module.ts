import { Global, Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { Product, ProductSchema } from './schema/product.schema'
import { ProductService } from './product.service'

/**
 * 产品配置模块
 */
@Global()
@Module({
  imports: [MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }])],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
