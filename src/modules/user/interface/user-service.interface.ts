import { WeekWeatherResponseDto } from '../dto'

export interface IUserService {
  /**
   * 获取用户一周的天气数据
   * @param userId 用户ID
   * @returns 一周天气数据
   */
  getWeekWeather(userId: string): Promise<WeekWeatherResponseDto>

  /**
   * 通过userId获取该用户的所有子设备列表
   * @param userId 用户ID
   * @returns 子设备列表
   */
  getSubDeviceListByUserId(userId: string): Promise<any[]>
}
