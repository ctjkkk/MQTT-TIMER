import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common'
import { TimerService } from './timer.service'
import { ApiResponseStandard } from '@/common/decorators/apiResponse.decorator'
import { SubDeviceInfoResponseDto, SubDeviceListResponseDto } from './dto/timer.response.dto'
import { RenameSubDeviceDto } from './dto/update-subdevice.dto'
import { CheckOwnership } from '@/common/decorators/checkOwnership.decorator'

@Controller('timer')
export class TimerController {
  constructor(private readonly timerService: TimerService) {}

  // Delete specified sub-device
  @Delete('/:timerId')
  @CheckOwnership('timer', 'timerId')
  @ApiResponseStandard({
    summary: 'Delete sub-device',
    responseDescription: 'Sub-device deleted successfully',
    msg: 'Deleted successfully',
  })
  deleteSubDevice(@Param('timerId') timerId: string) {
    return this.timerService.deleteSubDeviceById(timerId)
  }

  // Get specified sub-device information (including all channel details)
  @Get('/:timerId')
  @CheckOwnership('timer', 'timerId')
  @ApiResponseStandard({
    summary: 'Get sub-device details',
    responseDescription: 'Returns sub-device details',
    msg: 'Success',
    responseType: SubDeviceInfoResponseDto,
  })
  getSubDeviceInfo(@Param('timerId') timerId: string) {
    return this.timerService.getSubDeviceInfoByTimerId(timerId)
  }

  // Rename specified sub-device
  @Post('/:timerId/rename')
  @CheckOwnership('timer', 'timerId')
  @ApiResponseStandard({
    summary: 'Rename sub-device',
    responseDescription: 'Sub-device renamed successfully',
    msg: 'Renamed successfully',
    responseType: SubDeviceListResponseDto,
  })
  renameSubDevice(@Param('timerId') timerId: string, @Body() dto: RenameSubDeviceDto) {
    return this.timerService.renameSubDeviceById(timerId, dto.name)
  }
}
