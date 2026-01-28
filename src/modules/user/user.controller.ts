import { Controller, Get } from '@nestjs/common'
import { UserService } from './user.service'
import { ApiResponseStandard } from '@/common/decorators/apiResponse.decorator'
import { WeekWeatherResponseDto } from './dto/index'
import { CurrentUserId } from '@/common/decorators/paramExtractor.decorators'

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // 获取该用户从今天开始未来七天的天气数据
  @Get('/week_weather_list')
  @ApiResponseStandard({
    summary: '获取用户一周天气信息',
    responseDescription: '返回用户一周天气信息',
    msg: '查询成功',
    responseType: WeekWeatherResponseDto,
  })
  getWeekWeather(@CurrentUserId() userId: string) {
    return this.userService.getWeekWeather(userId)
  }

  //根据用户id返回该用户的所有子设备列表
  @Get('/subDevice_list')
  @ApiResponseStandard({
    summary: '获取用户所有子设备列表',
    responseDescription: '返回用户子设备列表',
    msg: '查询成功',
  })
  getSubDeviceListByUserId(@CurrentUserId() userId: string) {
    return this.userService.getSubDeviceListByUserId(userId)
  }
}
