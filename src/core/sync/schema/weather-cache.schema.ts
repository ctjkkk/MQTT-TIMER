import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose'

export type WeatherCacheDocument = HydratedDocument<WeatherCache>

/**
 * 24小时数值数据类型（温度、湿度、降水等）
 */
export interface HourlyData {
  '00:00': number
  '01:00': number
  '02:00': number
  '03:00': number
  '04:00': number
  '05:00': number
  '06:00': number
  '07:00': number
  '08:00': number
  '09:00': number
  '10:00': number
  '11:00': number
  '12:00': number
  '13:00': number
  '14:00': number
  '15:00': number
  '16:00': number
  '17:00': number
  '18:00': number
  '19:00': number
  '20:00': number
  '21:00': number
  '22:00': number
  '23:00': number
}

/**
 * 24小时天气描述类型
 */
export interface HourlyWeatherDescription {
  '00:00': string
  '01:00': string
  '02:00': string
  '03:00': string
  '04:00': string
  '05:00': string
  '06:00': string
  '07:00': string
  '08:00': string
  '09:00': string
  '10:00': string
  '11:00': string
  '12:00': string
  '13:00': string
  '14:00': string
  '15:00': string
  '16:00': string
  '17:00': string
  '18:00': string
  '19:00': string
  '20:00': string
  '21:00': string
  '22:00': string
  '23:00': string
}

/**
 * 天气数据单位
 */
export interface WeatherUnits {
  time: string
  weather_code: string
  snow: string
  wind_speed_10m: string
  wind_direction_10m: string
  temperature_2m: string
  relative_humidity_2m: string
  precipitation: string
  precipitation_probability: string
  surface_pressure: string
  soil_temperature_0cm: string
  et0_fao_evapotranspiration: string
  vapour_pressure_deficit: string
}

/**
 * 天气数据缓存 Schema
 * 用于存储从主后端同步的天气数据
 */
@Schema({ collection: 'weathers_cache', timestamps: true })
export class WeatherCache {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'UserCache', required: true })
  userId: MongooseSchema.Types.ObjectId

  @Prop({ type: String, required: true })
  date: string // "YYYY-MM-DD" format only

  @Prop({
    type: Object,
    default: {
      '00:00': '',
      '01:00': '',
      '02:00': '',
      '03:00': '',
      '04:00': '',
      '05:00': '',
      '06:00': '',
      '07:00': '',
      '08:00': '',
      '09:00': '',
      '10:00': '',
      '11:00': '',
      '12:00': '',
      '13:00': '',
      '14:00': '',
      '15:00': '',
      '16:00': '',
      '17:00': '',
      '18:00': '',
      '19:00': '',
      '20:00': '',
      '21:00': '',
      '22:00': '',
      '23:00': '',
    },
  })
  weather_description: HourlyWeatherDescription // time with weather description

  @Prop({
    type: Object,
    default: {
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
  })
  snow: HourlyData // mm per hour (converted from cm)

  @Prop({
    type: Object,
    default: {
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
  })
  wind: HourlyData // m/s per hour

  @Prop({
    type: Object,
    default: {
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
  })
  wind_direction_10m: HourlyData // degrees per hour

  @Prop({
    type: Object,
    default: {
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
  })
  temperature: HourlyData // °C per hour

  @Prop({
    type: Object,
    default: {
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
  })
  humidity: HourlyData // % per hour

  @Prop({
    type: Object,
    default: {
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
  })
  precipitation: HourlyData // mm per hour

  @Prop({
    type: Object,
    default: {
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
  })
  precipitation_probability: HourlyData // % per hour

  @Prop({
    type: Object,
    default: {
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
  })
  pressure: HourlyData // hPa per hour

  @Prop({
    type: Object,
    default: {
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
  })
  soil_temperature: HourlyData // °C per hour

  @Prop({
    type: Object,
    default: {
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
  })
  et0_hourly: HourlyData // mm per hour (蒸散量)

  @Prop({
    type: Object,
    default: {
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
  })
  vpd: HourlyData // kPa per hour (蒸汽压差)

  // 元数据
  @Prop({ type: String, default: 'open-meteo-professional' })
  source: string

  @Prop({ type: Date, default: Date.now })
  processed_at: Date

  @Prop({
    type: Object,
    default: {},
  })
  units: WeatherUnits

  @Prop({ type: Date })
  syncedAt: Date // 同步时间
}

export const WeatherCacheSchema = SchemaFactory.createForClass(WeatherCache)

// 添加复合唯一索引
WeatherCacheSchema.index({ userId: 1, date: 1 }, { unique: true })
