import { Module } from '@nestjs/common';
import { OutletController } from './outlet.controller';

@Module({
  controllers: [OutletController]
})
export class OutletModule {}
