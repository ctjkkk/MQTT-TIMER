import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common'
import { TimerService } from './timer.service'
import { ApiResponseStandard } from '@/common/decorators/apiResponse.decorator'
import { SubDeviceListResponseDto } from './dto/timer.response.dto'
import { CurrentUserId } from '@/common/decorators/paramExtractor.decorators'
import { RenameSubDeviceDto } from './dto/update-subdevice.dto'
@Controller('timer')
export class TimerController {
  constructor(private readonly timerService: TimerService) {}

  //用户在App删除指定子设备
  @Delete('/:timerId')
  @ApiResponseStandard({
    summary: '删除单个子设备',
    responseDescription: '该子设备删除成功',
    msg: '删除成功',
  })
  deleteSubDevice(@CurrentUserId() userId: string, @Param('timerId') timerId: string) {
    return this.timerService.deleteSubDeviceById(userId, timerId)
  }

  //获取指定子设备信息
  @Get('/:timerId')
  @ApiResponseStandard({
    summary: '获取单个子设备详情',
    responseDescription: '返回子设备详情信息',
    msg: '查询成功',
  })
  getSubDeviceInfo(@CurrentUserId() userId: string, @Param('timerId') timerId: string) {}

  // 修改指定子设备名称
  @Post('/rename')
  @ApiResponseStandard({
    summary: '子设备重命名',
    responseDescription: '子设备重命名成功',
    msg: '重命名成功',
    responseType: SubDeviceListResponseDto,
  })
  renameSubDevice(@CurrentUserId() userId: string, @Body() dto: RenameSubDeviceDto) {
    return this.timerService.renameSubDeviceById(userId, dto.timerId, dto.name)
  }
}
