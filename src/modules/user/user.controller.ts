import { Controller, Get } from '@nestjs/common'
import { UserService } from './user.service'
import { ApiResponseStandard } from '@/common/decorators/apiResponse.decorator'
import { WeekWeatherResponseDto } from './dto/index'
import { CurrentUserId } from '@/common/decorators/paramExtractor.decorators'

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // Get user's weather data for the next 7 days starting from today
  @Get('/week_weather_list')
  @ApiResponseStandard({
    summary: 'Get user weekly weather information',
    responseDescription: 'Returns user weekly weather information',
    msg: 'Success',
    responseType: WeekWeatherResponseDto,
  })
  getWeekWeather(@CurrentUserId() userId: string) {
    return this.userService.getWeekWeather(userId)
  }

  // Get all sub-devices for the user by user ID
  @Get('/subDevice_list')
  @ApiResponseStandard({
    summary: 'Get all user sub-devices',
    responseDescription: 'Returns user sub-device list',
    msg: 'Success',
  })
  getSubDeviceListByUserId(@CurrentUserId() userId: string) {
    return this.userService.getSubDeviceListByUserId(userId)
  }
}
