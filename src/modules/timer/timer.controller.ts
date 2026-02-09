import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common'
import { TimerService } from './timer.service'
import { ApiResponseStandard } from '@/common/decorators/apiResponse.decorator'
import { SubDeviceInfoResponseDto, SubDeviceListResponseDto } from './dto/timer.response.dto'
import { RenameSubDeviceDto } from './dto/update-subdevice.dto'
import { CheckOwnership } from '@/common/decorators/checkOwnership.decorator'

@Controller('timer')
export class TimerController {
  constructor(private readonly timerService: TimerService) {}

  //用户在App删除指定子设备
  @Delete('/:timerId')
  @CheckOwnership('timer', 'timerId')
  @ApiResponseStandard({
    summary: '删除单个子设备',
    responseDescription: '该子设备删除成功',
    msg: '删除成功',
  })
  deleteSubDevice(@Param('timerId') timerId: string) {
    return this.timerService.deleteSubDeviceById(timerId)
  }

  //获取指定子设备信息(包含该子设备下所有通道详情信息)
  @Get('/:timerId')
  @CheckOwnership('timer', 'timerId')
  @ApiResponseStandard({
    summary: '获取单个子设备详情',
    responseDescription: '返回子设备详情信息',
    msg: '查询成功',
    responseType: SubDeviceInfoResponseDto,
  })
  getSubDeviceInfo(@Param('timerId') timerId: string) {
    return this.timerService.getSubDeviceInfoByTimerId(timerId)
  }

  // 修改指定子设备名称
  @Post('/:timerId/rename')
  @CheckOwnership('timer', 'timerId')
  @ApiResponseStandard({
    summary: '子设备重命名',
    responseDescription: '子设备重命名成功',
    msg: '重命名成功',
    responseType: SubDeviceListResponseDto,
  })
  renameSubDevice(@Param('timerId') timerId: string, @Body() dto: RenameSubDeviceDto) {
    return this.timerService.renameSubDeviceById(timerId, dto.name)
  }
}
