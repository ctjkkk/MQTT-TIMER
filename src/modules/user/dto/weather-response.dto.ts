import { ApiProperty } from '@nestjs/swagger'

/**
 * 24小时数据 DTO
 */
class HourlyDataDto {
  @ApiProperty({ description: '00:00时的数据', example: 0 })
  '00:00': number

  @ApiProperty({ description: '01:00时的数据', example: 0 })
  '01:00': number

  @ApiProperty({ description: '02:00时的数据', example: 0 })
  '02:00': number

  @ApiProperty({ description: '03:00时的数据', example: 0 })
  '03:00': number

  @ApiProperty({ description: '04:00时的数据', example: 0 })
  '04:00': number

  @ApiProperty({ description: '05:00时的数据', example: 0 })
  '05:00': number

  @ApiProperty({ description: '06:00时的数据', example: 0 })
  '06:00': number

  @ApiProperty({ description: '07:00时的数据', example: 0 })
  '07:00': number

  @ApiProperty({ description: '08:00时的数据', example: 0 })
  '08:00': number

  @ApiProperty({ description: '09:00时的数据', example: 0 })
  '09:00': number

  @ApiProperty({ description: '10:00时的数据', example: 0 })
  '10:00': number

  @ApiProperty({ description: '11:00时的数据', example: 0 })
  '11:00': number

  @ApiProperty({ description: '12:00时的数据', example: 0 })
  '12:00': number

  @ApiProperty({ description: '13:00时的数据', example: 0 })
  '13:00': number

  @ApiProperty({ description: '14:00时的数据', example: 0 })
  '14:00': number

  @ApiProperty({ description: '15:00时的数据', example: 0 })
  '15:00': number

  @ApiProperty({ description: '16:00时的数据', example: 0 })
  '16:00': number

  @ApiProperty({ description: '17:00时的数据', example: 0 })
  '17:00': number

  @ApiProperty({ description: '18:00时的数据', example: 0 })
  '18:00': number

  @ApiProperty({ description: '19:00时的数据', example: 0 })
  '19:00': number

  @ApiProperty({ description: '20:00时的数据', example: 0 })
  '20:00': number

  @ApiProperty({ description: '21:00时的数据', example: 0 })
  '21:00': number

  @ApiProperty({ description: '22:00时的数据', example: 0 })
  '22:00': number

  @ApiProperty({ description: '23:00时的数据', example: 0 })
  '23:00': number
}

/**
 * 24小时天气描述 DTO
 */
class HourlyWeatherDescriptionDto {
  @ApiProperty({ description: '00:00时的天气描述', example: 'Partly cloudy' })
  '00:00': string

  @ApiProperty({ description: '01:00时的天气描述', example: 'Clear' })
  '01:00': string

  @ApiProperty({ description: '02:00时的天气描述', example: 'Clear' })
  '02:00': string

  @ApiProperty({ description: '03:00时的天气描述', example: 'Clear' })
  '03:00': string

  @ApiProperty({ description: '04:00时的天气描述', example: 'Clear' })
  '04:00': string

  @ApiProperty({ description: '05:00时的天气描述', example: 'Clear' })
  '05:00': string

  @ApiProperty({ description: '06:00时的天气描述', example: 'Partly cloudy' })
  '06:00': string

  @ApiProperty({ description: '07:00时的天气描述', example: 'Partly cloudy' })
  '07:00': string

  @ApiProperty({ description: '08:00时的天气描述', example: 'Cloudy' })
  '08:00': string

  @ApiProperty({ description: '09:00时的天气描述', example: 'Overcast' })
  '09:00': string

  @ApiProperty({ description: '10:00时的天气描述', example: 'Overcast' })
  '10:00': string

  @ApiProperty({ description: '11:00时的天气描述', example: 'Overcast' })
  '11:00': string

  @ApiProperty({ description: '12:00时的天气描述', example: 'Light rain' })
  '12:00': string

  @ApiProperty({ description: '13:00时的天气描述', example: 'Light rain' })
  '13:00': string

  @ApiProperty({ description: '14:00时的天气描述', example: 'Rain' })
  '14:00': string

  @ApiProperty({ description: '15:00时的天气描述', example: 'Rain' })
  '15:00': string

  @ApiProperty({ description: '16:00时的天气描述', example: 'Partly cloudy' })
  '16:00': string

  @ApiProperty({ description: '17:00时的天气描述', example: 'Partly cloudy' })
  '17:00': string

  @ApiProperty({ description: '18:00时的天气描述', example: 'Clear' })
  '18:00': string

  @ApiProperty({ description: '19:00时的天气描述', example: 'Clear' })
  '19:00': string

  @ApiProperty({ description: '20:00时的天气描述', example: 'Clear' })
  '20:00': string

  @ApiProperty({ description: '21:00时的天气描述', example: 'Clear' })
  '21:00': string

  @ApiProperty({ description: '22:00时的天气描述', example: 'Clear' })
  '22:00': string

  @ApiProperty({ description: '23:00时的天气描述', example: 'Clear' })
  '23:00': string
}

/**
 * 天气数据单位 DTO
 */
class WeatherUnitsDto {
  @ApiProperty({ description: '时间单位', example: 'iso8601' })
  time: string

  @ApiProperty({ description: '天气代码单位', example: 'wmo code' })
  weather_code: string

  @ApiProperty({ description: '降雪量单位', example: 'mm' })
  snow: string

  @ApiProperty({ description: '风速单位', example: 'm/s' })
  wind_speed_10m: string

  @ApiProperty({ description: '风向单位', example: '°' })
  wind_direction_10m: string

  @ApiProperty({ description: '温度单位', example: '°C' })
  temperature_2m: string

  @ApiProperty({ description: '相对湿度单位', example: '%' })
  relative_humidity_2m: string

  @ApiProperty({ description: '降水量单位', example: 'mm' })
  precipitation: string

  @ApiProperty({ description: '降水概率单位', example: '%' })
  precipitation_probability: string

  @ApiProperty({ description: '气压单位', example: 'hPa' })
  surface_pressure: string

  @ApiProperty({ description: '土壤温度单位', example: '°C' })
  soil_temperature_0cm: string

  @ApiProperty({ description: '蒸散量单位', example: 'mm' })
  et0_fao_evapotranspiration: string

  @ApiProperty({ description: '蒸汽压差单位', example: 'kPa' })
  vapour_pressure_deficit: string
}

/**
 * 单日天气数据响应 DTO
 */
export class WeatherDataResponseDto {
  @ApiProperty({ description: '天气数据ID', example: '507f1f77bcf86cd799439011' })
  _id: string

  @ApiProperty({ description: '用户ID', example: '507f1f77bcf86cd799439012' })
  userId: string

  @ApiProperty({ description: '日期', example: '2026-01-27' })
  date: string

  @ApiProperty({ description: '24小时天气描述', type: HourlyWeatherDescriptionDto })
  weather_description: HourlyWeatherDescriptionDto

  @ApiProperty({ description: '24小时降雪量 (mm)', type: HourlyDataDto })
  snow: HourlyDataDto

  @ApiProperty({ description: '24小时风速 (m/s)', type: HourlyDataDto })
  wind: HourlyDataDto

  @ApiProperty({ description: '24小时风向 (度)', type: HourlyDataDto })
  wind_direction_10m: HourlyDataDto

  @ApiProperty({ description: '24小时温度 (°C)', type: HourlyDataDto })
  temperature: HourlyDataDto

  @ApiProperty({ description: '24小时湿度 (%)', type: HourlyDataDto })
  humidity: HourlyDataDto

  @ApiProperty({ description: '24小时降水量 (mm)', type: HourlyDataDto })
  precipitation: HourlyDataDto

  @ApiProperty({ description: '24小时降水概率 (%)', type: HourlyDataDto })
  precipitation_probability: HourlyDataDto

  @ApiProperty({ description: '24小时气压 (hPa)', type: HourlyDataDto })
  pressure: HourlyDataDto

  @ApiProperty({ description: '24小时土壤温度 (°C)', type: HourlyDataDto })
  soil_temperature: HourlyDataDto

  @ApiProperty({ description: '24小时蒸散量 (mm)', type: HourlyDataDto })
  et0_hourly: HourlyDataDto

  @ApiProperty({ description: '24小时蒸汽压差 (kPa)', type: HourlyDataDto })
  vpd: HourlyDataDto

  @ApiProperty({ description: '数据来源', example: 'open-meteo-professional' })
  source: string

  @ApiProperty({ description: '数据处理时间', example: '2026-01-27T08:00:00.000Z' })
  processed_at: Date

  @ApiProperty({ description: '数据单位', type: WeatherUnitsDto })
  units: WeatherUnitsDto

  @ApiProperty({ description: '创建时间', example: '2026-01-27T08:00:00.000Z' })
  createdAt: Date

  @ApiProperty({ description: '更新时间', example: '2026-01-27T08:00:00.000Z' })
  updatedAt: Date

  @ApiProperty({ description: '同步时间', example: '2026-01-27T08:00:00.000Z', required: false })
  syncedAt?: Date
}

/**
 * 一周天气数据响应 DTO
 */
export class WeekWeatherResponseDto {
  @ApiProperty({ description: '用户ID', example: '507f1f77bcf86cd799439012' })
  userId: string

  @ApiProperty({
    description: '一周天气数据列表',
    type: [WeatherDataResponseDto],
    example: [
      {
        _id: '507f1f77bcf86cd799439011',
        userId: '507f1f77bcf86cd799439012',
        date: '2026-01-27',
        weather_description: {
          '00:00': 'Clear',
          '01:00': 'Clear',
          '02:00': 'Clear',
          '03:00': 'Clear',
          '04:00': 'Clear',
          '05:00': 'Clear',
          '06:00': 'Partly cloudy',
          '07:00': 'Partly cloudy',
          '08:00': 'Cloudy',
          '09:00': 'Cloudy',
          '10:00': 'Overcast',
          '11:00': 'Overcast',
          '12:00': 'Light rain',
          '13:00': 'Light rain',
          '14:00': 'Rain',
          '15:00': 'Rain',
          '16:00': 'Partly cloudy',
          '17:00': 'Partly cloudy',
          '18:00': 'Clear',
          '19:00': 'Clear',
          '20:00': 'Clear',
          '21:00': 'Clear',
          '22:00': 'Clear',
          '23:00': 'Clear',
        },
        snow: {
          '00:00': 0,
          '01:00': 0,
          '02:00': 0,
          '03:00': 0,
          '04:00': 0,
          '05:00': 0,
          '06:00': 0,
          '07:00': 0,
          '08:00': 0,
          '09:00': 0,
          '10:00': 0,
          '11:00': 0,
          '12:00': 0,
          '13:00': 0,
          '14:00': 0,
          '15:00': 0,
          '16:00': 0,
          '17:00': 0,
          '18:00': 0,
          '19:00': 0,
          '20:00': 0,
          '21:00': 0,
          '22:00': 0,
          '23:00': 0,
        },
        wind: {
          '00:00': 2.5,
          '01:00': 2.3,
          '02:00': 2.1,
          '03:00': 2.0,
          '04:00': 1.8,
          '05:00': 1.9,
          '06:00': 2.2,
          '07:00': 2.6,
          '08:00': 3.1,
          '09:00': 3.5,
          '10:00': 4.0,
          '11:00': 4.3,
          '12:00': 4.5,
          '13:00': 4.8,
          '14:00': 5.0,
          '15:00': 4.7,
          '16:00': 4.2,
          '17:00': 3.8,
          '18:00': 3.3,
          '19:00': 3.0,
          '20:00': 2.8,
          '21:00': 2.6,
          '22:00': 2.5,
          '23:00': 2.4,
        },
        wind_direction_10m: {
          '00:00': 180,
          '01:00': 185,
          '02:00': 190,
          '03:00': 195,
          '04:00': 200,
          '05:00': 200,
          '06:00': 205,
          '07:00': 210,
          '08:00': 215,
          '09:00': 220,
          '10:00': 225,
          '11:00': 230,
          '12:00': 235,
          '13:00': 240,
          '14:00': 245,
          '15:00': 240,
          '16:00': 235,
          '17:00': 230,
          '18:00': 225,
          '19:00': 220,
          '20:00': 215,
          '21:00': 210,
          '22:00': 200,
          '23:00': 190,
        },
        temperature: {
          '00:00': 15.2,
          '01:00': 14.8,
          '02:00': 14.5,
          '03:00': 14.2,
          '04:00': 14.0,
          '05:00': 13.8,
          '06:00': 14.5,
          '07:00': 16.2,
          '08:00': 18.5,
          '09:00': 20.8,
          '10:00': 22.5,
          '11:00': 23.8,
          '12:00': 24.5,
          '13:00': 24.8,
          '14:00': 24.5,
          '15:00': 23.8,
          '16:00': 22.5,
          '17:00': 20.8,
          '18:00': 19.2,
          '19:00': 18.0,
          '20:00': 17.2,
          '21:00': 16.5,
          '22:00': 16.0,
          '23:00': 15.5,
        },
        humidity: {
          '00:00': 75,
          '01:00': 77,
          '02:00': 78,
          '03:00': 80,
          '04:00': 82,
          '05:00': 83,
          '06:00': 80,
          '07:00': 75,
          '08:00': 68,
          '09:00': 62,
          '10:00': 58,
          '11:00': 55,
          '12:00': 60,
          '13:00': 65,
          '14:00': 70,
          '15:00': 68,
          '16:00': 65,
          '17:00': 68,
          '18:00': 72,
          '19:00': 75,
          '20:00': 77,
          '21:00': 78,
          '22:00': 79,
          '23:00': 80,
        },
        precipitation: {
          '00:00': 0,
          '01:00': 0,
          '02:00': 0,
          '03:00': 0,
          '04:00': 0,
          '05:00': 0,
          '06:00': 0,
          '07:00': 0,
          '08:00': 0,
          '09:00': 0,
          '10:00': 0,
          '11:00': 0,
          '12:00': 0.5,
          '13:00': 1.2,
          '14:00': 2.5,
          '15:00': 3.8,
          '16:00': 1.5,
          '17:00': 0.5,
          '18:00': 0,
          '19:00': 0,
          '20:00': 0,
          '21:00': 0,
          '22:00': 0,
          '23:00': 0,
        },
        precipitation_probability: {
          '00:00': 0,
          '01:00': 0,
          '02:00': 0,
          '03:00': 0,
          '04:00': 0,
          '05:00': 0,
          '06:00': 5,
          '07:00': 10,
          '08:00': 15,
          '09:00': 20,
          '10:00': 30,
          '11:00': 45,
          '12:00': 60,
          '13:00': 75,
          '14:00': 85,
          '15:00': 90,
          '16:00': 70,
          '17:00': 50,
          '18:00': 30,
          '19:00': 20,
          '20:00': 10,
          '21:00': 5,
          '22:00': 0,
          '23:00': 0,
        },
        pressure: {
          '00:00': 1013.2,
          '01:00': 1013.0,
          '02:00': 1012.8,
          '03:00': 1012.6,
          '04:00': 1012.5,
          '05:00': 1012.4,
          '06:00': 1012.6,
          '07:00': 1012.8,
          '08:00': 1013.0,
          '09:00': 1013.2,
          '10:00': 1013.5,
          '11:00': 1013.8,
          '12:00': 1014.0,
          '13:00': 1014.2,
          '14:00': 1014.0,
          '15:00': 1013.8,
          '16:00': 1013.5,
          '17:00': 1013.2,
          '18:00': 1013.0,
          '19:00': 1012.8,
          '20:00': 1012.6,
          '21:00': 1012.5,
          '22:00': 1012.8,
          '23:00': 1013.0,
        },
        soil_temperature: {
          '00:00': 16.5,
          '01:00': 16.3,
          '02:00': 16.1,
          '03:00': 16.0,
          '04:00': 15.9,
          '05:00': 15.8,
          '06:00': 16.0,
          '07:00': 16.5,
          '08:00': 17.2,
          '09:00': 18.0,
          '10:00': 18.8,
          '11:00': 19.5,
          '12:00': 20.0,
          '13:00': 20.3,
          '14:00': 20.5,
          '15:00': 20.3,
          '16:00': 20.0,
          '17:00': 19.5,
          '18:00': 19.0,
          '19:00': 18.5,
          '20:00': 18.0,
          '21:00': 17.5,
          '22:00': 17.0,
          '23:00': 16.8,
        },
        et0_hourly: {
          '00:00': 0.05,
          '01:00': 0.04,
          '02:00': 0.04,
          '03:00': 0.03,
          '04:00': 0.03,
          '05:00': 0.03,
          '06:00': 0.08,
          '07:00': 0.15,
          '08:00': 0.25,
          '09:00': 0.35,
          '10:00': 0.42,
          '11:00': 0.48,
          '12:00': 0.52,
          '13:00': 0.55,
          '14:00': 0.53,
          '15:00': 0.48,
          '16:00': 0.4,
          '17:00': 0.3,
          '18:00': 0.2,
          '19:00': 0.12,
          '20:00': 0.08,
          '21:00': 0.06,
          '22:00': 0.05,
          '23:00': 0.05,
        },
        vpd: {
          '00:00': 0.5,
          '01:00': 0.4,
          '02:00': 0.4,
          '03:00': 0.4,
          '04:00': 0.3,
          '05:00': 0.3,
          '06:00': 0.5,
          '07:00': 0.7,
          '08:00': 1.0,
          '09:00': 1.3,
          '10:00': 1.6,
          '11:00': 1.8,
          '12:00': 1.7,
          '13:00': 1.5,
          '14:00': 1.3,
          '15:00': 1.4,
          '16:00': 1.4,
          '17:00': 1.2,
          '18:00': 0.9,
          '19:00': 0.7,
          '20:00': 0.6,
          '21:00': 0.5,
          '22:00': 0.5,
          '23:00': 0.5,
        },
        source: 'open-meteo-professional',
        processed_at: '2026-01-27T08:00:00.000Z',
        units: {
          time: 'iso8601',
          weather_code: 'wmo code',
          snow: 'mm',
          wind_speed_10m: 'm/s',
          wind_direction_10m: '°',
          temperature_2m: '°C',
          relative_humidity_2m: '%',
          precipitation: 'mm',
          precipitation_probability: '%',
          surface_pressure: 'hPa',
          soil_temperature_0cm: '°C',
          et0_fao_evapotranspiration: 'mm',
          vapour_pressure_deficit: 'kPa',
        },
        createdAt: '2026-01-27T08:00:00.000Z',
        updatedAt: '2026-01-27T08:00:00.000Z',
        syncedAt: '2026-01-27T08:05:00.000Z',
      },
    ],
  })
  data: WeatherDataResponseDto[]

  @ApiProperty({ description: '数据总数', example: 7 })
  total: number
}
