import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { OutletController } from './outlet.controller'
import { OutletService } from './outlet.service'
import { HanqiOutlet, HanqiOutletSchema } from './schema/outlet.schema'

@Module({
  imports: [MongooseModule.forFeature([{ name: HanqiOutlet.name, schema: HanqiOutletSchema }])],
  controllers: [OutletController],
  providers: [OutletService],
  exports: [OutletService],
})
export class OutletModule {}
