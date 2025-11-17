import { LogLevel } from '../logger.service'

export interface LoggerOptions {
  level: LogLevel
  enableConsole?: boolean
  enableFile?: boolean
  file?: {
    dirname?: string
    filename?: string
    maxSize?: string
    maxFiles?: string
    datePattern?: string
  }
}
