import { Injectable, Inject } from '@nestjs/common'
import { createLogger, format } from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import type { LoggerOptions } from './interfaces/logger-options.interface'
import { ClientId } from './../../shared/decorators/mqtt.decorator'

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

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
    this.info(`✅ ${ClientId} Authentication successful for user: ${username}`)
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
    const timestamp = new Date().toISOString()

    // 控制台输出
    const color = this.getColorForLevel(level)
    console.log(`\x1b[90m${timestamp}\x1b[0m ${color}${level.toUpperCase().padEnd(7)}\x1b[0m ${message}\n${logContext}`)
    if (data && this.options.enableConsole) {
      console.log('\x1b[90mData:\x1b[0m', data)
    }

    // 文件输出
    if (!this.options.enableFile) return
    const logger = this.createFileLogger(level, context)
    logger.log({
      level: level,
      message: message,
      timestamp: timestamp,
      context: logContext,
      ...data,
    })
  }

  private createFileLogger(level: string, context?: string) {
    const fileConfig = this.options.file || {}
    const dirname = fileConfig.dirname || 'logs'
    const datePattern = fileConfig.datePattern || 'YYYY-MM-DD'
    const maxSize = fileConfig.maxSize || '20m'
    let maxFiles = fileConfig.maxFiles || '14d'

    // 根据上下文和日志级别确定文件名
    let filename = this.getFilenameByContextAndLevel(level, context)

    // 设置不同日志类型的保留时间
    if (level === 'error') {
      maxFiles = '30d' // 错误日志保留30天
    } else if (context === 'MQTT' && level === 'debug') {
      maxFiles = '3d' // MQTT消息日志保留3天
    } else if (context === 'MongoDB') {
      maxFiles = '7d' // 数据库日志保留7天
    }

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
    // 根据上下文分类
    if (context === 'MQTT') {
      if (level === 'error') return 'mqtt-error-%DATE%.log'
      if (level === 'debug') return 'mqtt-message-%DATE%.log'
      return 'mqtt-%DATE%.log'
    }

    if (context === 'MongoDB') {
      if (level === 'error') return 'database-error-%DATE%.log'
      if (level === 'debug') return 'database-query-%DATE%.log'
      return 'database-%DATE%.log'
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
