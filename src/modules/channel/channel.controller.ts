import { Controller, Get, Param, Body, Patch } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { ChannelService } from './channel.service'
import { UpdateWeatherSkipDto, UpdateZoneImageDto, UpdateZoneNameDto } from './dto/update.dto'
import { ApiResponseStandard } from '@/common/decorators/apiResponse.decorator'
import { CheckOwnership } from '@/common/decorators/checkOwnership.decorator'

@ApiTags('Channel')
@Controller('channel')
export class ChannelController {
  constructor(private readonly channelService: ChannelService) {}

  @Get('list')
  @CheckOwnership('timer', 'timerId')
  @ApiResponseStandard({
    summary: '查询子设备通道列表',
    responseDescription: '返回子设备通道列表',
    msg: '查询成功',
  })
  async getChannelsByTimerId(@Param('timerId') timerId: string) {
    return await this.channelService.findChannelsByTimerId(timerId)
  }

  @Get(':channelId')
  @CheckOwnership('channel', 'channelId')
  @ApiResponseStandard({
    summary: '查询子设备查询通道详情',
    responseDescription: '返回子设备通道详情',
    msg: '查询成功',
  })
  async getChannelById(@Param('channelId') channelId: string) {
    return await this.channelService.findChannelById(channelId)
  }

  @Patch(':channelId/zone_name')
  @CheckOwnership('channel', 'channelId')
  @ApiResponseStandard({
    summary: '更新通道区域名称',
    responseDescription: '返回更新后的通道信息',
    msg: '更新成功',
  })
  async updateZoneName(@Param('channelId') channelId: string, @Body() dto: UpdateZoneNameDto) {
    return await this.channelService.updateZoneName(channelId, dto.zoneName)
  }

  @Patch(':channelId/weather_skip')
  @CheckOwnership('channel', 'channelId')
  @ApiResponseStandard({
    summary: '更新天气跳过设置',
    responseDescription: '返回更新后的通道信息',
    msg: '更新成功',
  })
  async updateWeatherSkip(@Param('channelId') channelId: string, @Body() dto: UpdateWeatherSkipDto) {
    return this.channelService.updateWeatherSkip(channelId, dto.enabled)
  }

  @Patch(':channelId/zone_image')
  @CheckOwnership('channel', 'channelId')
  @ApiResponseStandard({
    summary: '更新区域图片',
    responseDescription: '返回更新后的通道信息',
    msg: '更新成功',
  })
  async updateZoneImage(@Param('channelId') channelId: string, @Body() dto: UpdateZoneImageDto) {
    return this.channelService.updateZoneImage(channelId, dto.zoneImage)
  }
}
