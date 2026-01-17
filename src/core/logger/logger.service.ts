import { Injectable, Inject } from '@nestjs/common'
import { createLogger, format, transports } from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import type { LoggerOptions } from './interface/logger.interface'
import { LogMessages, LogContext } from '@/shared/constants/logger.constants'
import moment from 'moment'
import { AsyncLocalStorage } from 'async_hooks'

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

// 请求上下文
export interface RequestContext {
  requestId?: string
  userId?: string
  ip?: string
  method?: string
  url?: string
}

// AsyncLocalStorage 用于存储请求上下文
export const requestContextStorage = new AsyncLocalStorage<RequestContext>()

@Injectable()
export class LoggerService {
  private context = 'Application'

  constructor(@Inject('LOGGER_OPTIONS') private options: LoggerOptions) {}

  // MongoDB 连接相关日志
  mongodbConnect(host: string, dbName: string, connectionId?: string) {
    this.info(`MongoDB连接成功`, 'MongoDB', {
      host,
      dbName,
      connectionId,
      timestamp: new Date().toISOString(),
    })
  }

  mongodbDisconnect(host: string, dbName: string, reason?: string) {
    this.warn(`MongoDB连接断开`, 'MongoDB', {
      host,
      dbName,
      reason,
      timestamp: new Date().toISOString(),
    })
  }

  mongodbConnectionError(host: string, dbName: string, error: any) {
    this.error(`MongoDB连接错误`, 'MongoDB', {
      host,
      dbName,
      error: error.message,
      errorCode: error.code,
      timestamp: new Date().toISOString(),
    })
  }

  mongodbReconnect(host: string, dbName: string, attempt: number) {
    this.info(`MongoDB重新连接中...`, 'MongoDB', {
      host,
      dbName,
      attempt,
      timestamp: new Date().toISOString(),
    })
  }

  mongodbQuery(operation: string, collection: string, duration: number, documentCount?: number) {
    this.debug(`MongoDB查询操作`, 'MongoDB', {
      operation,
      collection,
      duration: `${duration}ms`,
      documentCount,
      timestamp: new Date().toISOString(),
    })
  }

  // MQTT 连接相关日志
  mqttConnect(username?: string, ClientId?: string) {
    this.info(LogMessages.MQTT.USER_CONNECTION_SUCCESSFUL(ClientId, username), LogContext.MQTT_CONNECTION)
  }

  mqttDisconnect(clientId: string, reason?: string) {
    this.warn(`MQTT客户端断开: ${clientId}`, 'MQTT', { clientId, reason })
  }

  mqttMessage(topic: string, clientId: string, payloadSize: number) {
    this.debug(`MQTT消息接收 [${topic}]`, 'MQTT', { topic, clientId, payloadSize })
  }

  mqttError(clientId: string, error: string) {
    this.error(`MQTT错误: ${error}`, 'MQTT', { clientId, error })
  }

  // HTTP 请求相关日志
  httpRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    ip?: string,
    userAgent?: string,
    requestId?: string,
  ) {
    const isError = statusCode >= 400
    const level = isError ? LogLevel.WARN : LogLevel.INFO
    const message = `${method} ${url} ${statusCode} +${duration}ms`

    const data = {
      method,
      url,
      statusCode,
      duration: `${duration}ms`,
      ip,
      userAgent,
      requestId,
      timestamp: new Date().toISOString(),
    }

    this.log(level, message, 'HTTP', data)
  }

  httpError(method: string, url: string, statusCode: number, duration: number, error: any, ip?: string, requestId?: string) {
    this.error(`${method} ${url} ${statusCode} +${duration}ms - ${error.message}`, 'HTTP', {
      method,
      url,
      statusCode,
      duration: `${duration}ms`,
      error: error.message,
      stack: error.stack,
      ip,
      requestId,
      timestamp: new Date().toISOString(),
    })
  }

  // 通用日志方法
  error(message: string, context?: string, data?: any) {
    this.log(LogLevel.ERROR, message, context, data)
  }

  warn(message: string, context?: string, data?: any) {
    this.log(LogLevel.WARN, message, context, data)
  }

  info(message: string, context?: string, data?: any) {
    this.log(LogLevel.INFO, message, context, data)
  }

  debug(message: string, context?: string, data?: any) {
    this.log(LogLevel.DEBUG, message, context, data)
  }

  private log(level: LogLevel, message: string, context?: string, data?: any) {
    const logContext = context || this.context
    const now = new Date()
    const pid = process.pid
    const timestampStr = moment().format('YYYY/MM/DD HH:mm:ss')
    const color = this.getColorForLevel(level)
    const levelText = level.toUpperCase().padEnd(1) // 保持 7 字符宽
    const levelBlock = logContext ? `${levelText} [${logContext}]` : levelText
    console.log(`\x1b[90m[Self] ${pid}  - ${timestampStr}\x1b[0m ` + `${color}${levelBlock}\x1b[0m ${color}${message}`)
    if (data && this.options.enableConsole) {
      console.log(`\x1b[90mData:\x1b[0m`, data)
    }
    if (!this.options.enableFile) return
    const fileLogger = this.createFileLogger(level, context)
    fileLogger.log({
      level,
      message,
      timestamp: now.toISOString(),
      context: logContext,
      data,
    })
  }

  private createFileLogger(level: string, context?: string) {
    const fileConfig = this.options.file || {}
    const dirname = fileConfig.dirname || 'logs'
    const datePattern = fileConfig.datePattern || 'YYYY-MM-DD'
    const maxSize = fileConfig.maxSize || '20m'
    const maxFiles = '30d' // 统一保留30天，长期存储通过 Graylog 实现

    // 根据上下文和日志级别确定文件名
    let filename = this.getFilenameByContextAndLevel(level, context)

    return createLogger({
      level: level,
      transports: [
        new DailyRotateFile({
          dirname,
          filename,
          datePattern,
          maxSize,
          maxFiles,
          format: format.combine(format.timestamp(), format.json()),
          zippedArchive: true,
        }),
      ],
    })
  }

  private getFilenameByContextAndLevel(level: string, context?: string): string {
    // 根据上下文分类 - 使用 startsWith 支持更灵活的命名
    if (context?.startsWith('MQTT')) {
      if (level === 'error') return 'mqtt-error-%DATE%.log'
      if (level === 'debug') return 'mqtt-message-%DATE%.log'
      return 'mqtt-%DATE%.log'
    }

    if (context === LogContext.MONGODB) {
      if (level === 'error') return 'database-error-%DATE%.log'
      if (level === 'debug') return 'database-query-%DATE%.log'
      return 'database-%DATE%.log'
    }

    if (context === LogContext.HTTP) {
      if (level === 'error') return 'http-error-%DATE%.log'
      if (level === 'warn') return 'http-warn-%DATE%.log'
      return 'http-%DATE%.log'
    }

    if (context === LogContext.SYNC) {
      if (level === 'error') return 'sync-error-%DATE%.log'
      return 'sync-%DATE%.log'
    }

    // 通用日志根据级别分类
    if (level === 'error') return 'error-%DATE%.log'
    if (level === 'warn') return 'warn-%DATE%.log'
    if (level === 'info') return 'info-%DATE%.log'
    if (level === 'debug') return 'debug-%DATE%.log'

    // 默认
    return 'app-%DATE%.log'
  }

  private getColorForLevel(level: LogLevel): string {
    switch (level) {
      case LogLevel.ERROR:
        return '\x1b[31m' // 红色
      case LogLevel.WARN:
        return '\x1b[33m' // 黄色
      case LogLevel.INFO:
        return '\x1b[32m' // 绿色
      case LogLevel.DEBUG:
        return '\x1b[36m' // 青色
      default:
        return '\x1b[0m' // 默认
    }
  }
}
