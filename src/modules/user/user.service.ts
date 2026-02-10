import { Injectable } from '@nestjs/common'
import { UserCache, UserCacheDocument } from '@/core/sync/schema/user-cache.schema'
import { WeatherCache, WeatherCacheDocument } from '@/core/sync/schema/weather-cache.schema'
import { Gateway, GatewayDocument } from '@/modules/gateway/schema/gateway.schema'
import { Timer, TimerDocument } from '@/modules/timer/schema/timer.schema'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { WeekWeatherResponseDto, WeatherDataResponseDto } from './dto'
import { IUserService } from './interface/user-service.interface'
import dayjs from 'dayjs'

@Injectable()
export class UserService implements IUserService {
  constructor(
    @InjectModel(UserCache.name) private userModel: Model<UserCacheDocument>,
    @InjectModel(WeatherCache.name) private weatherModel: Model<WeatherCacheDocument>,
    @InjectModel(Gateway.name) private gatewayModel: Model<GatewayDocument>,
    @InjectModel(Timer.name) private timerModel: Model<TimerDocument>,
  ) {}

  /**
   * 获取用户一周的天气数据
   * @param userId 用户ID
   * @returns 一周天气数据
   */
  async getWeekWeather(userId: string): Promise<WeekWeatherResponseDto> {
    const todayStr = dayjs().format('YYYY-MM-DD')
    const futureDateStr = dayjs().add(7, 'day').format('YYYY-MM-DD')
    // 查询该用户未来7天的天气数据
    const weatherData = await this.weatherModel
      .find({
        userId,
        date: {
          $gte: todayStr, // 大于等于（Greater Than or Equal）今天
          $lte: futureDateStr, // 小于等于（Less Than or Equal）未来日期
        },
      })
      .sort({ date: 1 }) // 按日期升序排序
      .lean()
      .exec()

    // 转换为响应DTO
    const data: WeatherDataResponseDto[] = weatherData.map((weather: any) => ({
      _id: weather._id.toString(),
      userId: weather.userId.toString(),
      date: weather.date,
      weather_description: weather.weather_description,
      snow: weather.snow,
      wind: weather.wind,
      wind_direction_10m: weather.wind_direction_10m,
      temperature: weather.temperature,
      humidity: weather.humidity,
      precipitation: weather.precipitation,
      precipitation_probability: weather.precipitation_probability,
      pressure: weather.pressure,
      soil_temperature: weather.soil_temperature,
      et0_hourly: weather.et0_hourly,
      vpd: weather.vpd,
      source: weather.source,
      processed_at: weather.processed_at,
      units: weather.units,
      createdAt: weather.createdAt,
      updatedAt: weather.updatedAt,
      syncedAt: weather.syncedAt,
    }))

    return {
      userId,
      data,
      total: data.length,
    }
  }

  /**
   *  通过userId获取该用户的所有子设备列表
   * @param userId 用户ID
   * @returns 子设备列表
   */
  async getSubDeviceListByUserId(userId: string) {
    const gateway = await this.gatewayModel.findOne({ userId }).lean()
    if (!gateway) throw new Error('You have not yet bound the gateway.')
    const timers = await this.timerModel.find({ gatewayId: gateway._id }).lean()
    return timers
  }
}
