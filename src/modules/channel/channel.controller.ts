import { Controller, Get, Param, Body, Patch } from '@nestjs/common'
import { ApiTags, ApiParam } from '@nestjs/swagger'
import { ChannelService } from './channel.service'
import { UpdateWeatherSkipDto, UpdateZoneImageDto, UpdateZoneNameDto } from './dto/update.dto'
import { ApiResponseStandard } from '@/common/decorators/apiResponse.decorator'
import { CheckOwnership } from '@/common/decorators/checkOwnership.decorator'

@ApiTags('Channel')
@Controller('channel')
export class ChannelController {
  constructor(private readonly channelService: ChannelService) {}

  @Get(':timerId/list')
  @CheckOwnership('timer', 'timerId')
  @ApiResponseStandard({
    summary: 'Get channel list by timer ID',
    responseDescription: 'Returns list of channels for the timer',
    message: 'Success',
  })
  async getChannelsByTimerId(@Param('timerId') timerId: string) {
    return await this.channelService.findChannelsByTimerId(timerId)
  }

  @Get(':channelId')
  @CheckOwnership('channel', 'channelId')
  @ApiResponseStandard({
    summary: 'Get channel details',
    responseDescription: 'Returns channel details',
    message: 'Success',
  })
  async getChannelById(@Param('channelId') channelId: string) {
    return await this.channelService.findChannelById(channelId)
  }

  @Patch(':channelId/zone_name')
  @CheckOwnership('channel', 'channelId')
  @ApiResponseStandard({
    summary: 'Update zone name',
    responseDescription: 'Returns updated channel information',
    message: 'Updated successfully',
  })
  async updateZoneName(@Param('channelId') channelId: string, @Body() dto: UpdateZoneNameDto) {
    return await this.channelService.updateZoneName(channelId, dto.zoneName)
  }

  @Patch(':channelId/weather_skip')
  @CheckOwnership('channel', 'channelId')
  @ApiResponseStandard({
    summary: 'Update weather skip setting',
    responseDescription: 'Returns updated channel information',
    message: 'Updated successfully',
  })
  async updateWeatherSkip(@Param('channelId') channelId: string, @Body() dto: UpdateWeatherSkipDto) {
    return this.channelService.updateWeatherSkip(channelId, dto.enabled)
  }

  @Patch(':channelId/zone_image')
  @CheckOwnership('channel', 'channelId')
  @ApiResponseStandard({
    summary: 'Update zone image',
    responseDescription: 'Returns updated channel information',
    message: 'Updated successfully',
  })
  async updateZoneImage(@Param('channelId') channelId: string, @Body() dto: UpdateZoneImageDto) {
    return this.channelService.updateZoneImage(channelId, dto.zoneImage)
  }
}
