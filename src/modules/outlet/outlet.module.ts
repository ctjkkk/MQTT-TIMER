import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { OutletController } from './outlet.controller'
import { OutletService } from './outlet.service'
import { Outlet, OutletSchema } from './schema/outlet.schema'

@Module({
  imports: [MongooseModule.forFeature([{ name: Outlet.name, schema: OutletSchema }])],
  controllers: [OutletController],
  providers: [OutletService],
  exports: [OutletService],
})
export class OutletModule {}
