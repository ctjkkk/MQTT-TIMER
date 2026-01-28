import { Controller, Delete, Get, Param, Request } from '@nestjs/common'
import { TimerService } from './timer.service'
import { ApiResponseStandard } from '@/common/decorators/apiResponse.decorator'
import { SubDeviceTypeResponseDto } from './dto/http-response.dto'
import { CurrentUserId } from '@/common/decorators/paramExtractor.decorators'
@Controller('timer')
export class TimerController {
  constructor(private readonly timerService: TimerService) {}

  @Get('/get_timer_types')
  @ApiResponseStandard({
    summary: '获取子设备类型列表',
    responseDescription: '返回可用的子设备类型',
    msg: '查询成功',
    responseType: SubDeviceTypeResponseDto,
  })
  getSubDeviceTypes() {
    return this.timerService.getSubDeviceTypes()
  }

  //获取指定网关下的所有子设备列表
  @Get('/:gatewayId/devices_list')
  @ApiResponseStandard({
    summary: '获取指定网关下的所有子设备列表',
    responseDescription: '返回可用的子设备列表',
    msg: '查询成功',
  })
  getSubDevicesList(@CurrentUserId() userId: string, @Param('gatewayId') gatewayId: string) {
    return this.timerService.getSubDevicesListByGatewayId(userId, gatewayId)
  }

  //用户在App删除指定子设备
  @Delete('/:timerId')
  @ApiResponseStandard({
    summary: '子设备删除',
    responseDescription: '子设备删除成功',
    msg: '删除成功',
  })
  deleteSubDevice(@CurrentUserId() userId: string, @Param('timerId') timerId: string) {
    return this.timerService.deleteSubDeviceById(userId, timerId)
  }
}
