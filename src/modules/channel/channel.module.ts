import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { ChannelController } from './channel.controller'
import { ChannelService } from './channel.service'
import { Channel, ChannelSchema } from './schema/channel.schema'
import { LoggerModule } from '@/core/logger/logger.module'

@Module({
  imports: [MongooseModule.forFeature([{ name: Channel.name, schema: ChannelSchema }]), LoggerModule],
  controllers: [ChannelController],
  providers: [ChannelService],
  exports: [ChannelService],
})
export class ChannelModule {}
