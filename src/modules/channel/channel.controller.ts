import { Controller, Get, Put, Param, Body, Query } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { ChannelService } from './channel.service'
import { UpdateZoneNameDto } from './dto/update-zone-name.dto'
import { UpdateWeatherSkipDto } from './dto/update-weather-skip.dto'
import { CurrentUserId } from '@/common/decorators/paramExtractor.decorators'
import { Types } from 'mongoose'

@ApiTags('Channel')
@Controller('channel')
export class ChannelController {
  constructor(private readonly channelService: ChannelService) {}

  @Get('list')
  @ApiOperation({ summary: '查询子设备通道列表' })
  async getChannelsByTimerId(@Query('timerId') timerId: string) {
    const channels = await this.channelService.findChannelsByTimerId(timerId)
    return {
      code: 200,
      message: '查询成功',
      data: channels,
    }
  }

  @Get(':channelId')
  @ApiOperation({ summary: '查询通道详情' })
  async getChannelById(@Param('channelId') channelId: string) {
    const channel = await this.channelService.findChannelById(channelId)
    return {
      code: 200,
      message: '查询成功',
      data: channel,
    }
  }

  @Put(':channelId/zone-name')
  @ApiOperation({ summary: '更新通道区域名称' })
  async updateZoneName(@Param('channelId') channelId: string, @Body() dto: UpdateZoneNameDto) {
    await this.channelService.updateZoneName(channelId, dto.zoneName)
    return {
      code: 200,
      message: '更新成功',
    }
  }

  @Put(':channelId/weather-skip')
  @ApiOperation({ summary: '更新天气跳过设置' })
  async updateWeatherSkip(@Param('channelId') channelId: string, @Body() dto: UpdateWeatherSkipDto) {
    await this.channelService.updateWeatherSkip(channelId, dto.enabled)
    return {
      code: 200,
      message: '更新成功',
    }
  }
}
