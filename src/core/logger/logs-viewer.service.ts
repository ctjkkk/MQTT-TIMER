import { Injectable } from '@nestjs/common'
import * as fs from 'fs'
import * as path from 'path'
import { promisify } from 'util'
import * as readline from 'readline'

const readdir = promisify(fs.readdir)
const stat = promisify(fs.stat)

export interface LogEntry {
  timestamp: string
  level: string
  message: string
  context?: string
  data?: any
}

export interface LogFile {
  name: string
  size: number
  modified: Date
  path: string
}

@Injectable()
export class LogsViewerService {
  private readonly logsDir = path.join(process.cwd(), 'logs')

  constructor() {
    // 确保 logs 目录存在
    this.ensureLogsDirExists()
  }

  private ensureLogsDirExists() {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true })
      console.log('已创建 logs 目录:', this.logsDir)
    }
  }

  async getLogFiles(): Promise<LogFile[]> {
    try {
      this.ensureLogsDirExists()

      const files = await readdir(this.logsDir)
      const logFiles: LogFile[] = []

      for (const file of files) {
        if (file.endsWith('.log')) {
          const filePath = path.join(this.logsDir, file)
          const stats = await stat(filePath)
          logFiles.push({
            name: file,
            size: stats.size,
            modified: stats.mtime,
            path: filePath,
          })
        }
      }

      return logFiles.sort((a, b) => b.modified.getTime() - a.modified.getTime())
    } catch (error) {
      console.error('读取日志文件列表失败:', error)
      return []
    }
  }

  async readLogFile(filename: string, limit: number = 500, offset: number = 0): Promise<LogEntry[]> {
    try {
      this.ensureLogsDirExists()

      const filePath = path.join(this.logsDir, filename)

      if (!filePath.startsWith(this.logsDir)) {
        throw new Error('Invalid file path')
      }

      if (!fs.existsSync(filePath)) {
        console.warn(`日志文件不存在: ${filename}`)
        return []
      }

      const logs: LogEntry[] = []
      const fileStream = fs.createReadStream(filePath)
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      })

      let lineNumber = 0
      for await (const line of rl) {
        if (lineNumber >= offset && logs.length < limit) {
          try {
            const logEntry = JSON.parse(line)
            logs.push(logEntry)
          } catch (e) {
            logs.push({
              timestamp: new Date().toISOString(),
              level: 'info',
              message: line,
            })
          }
        }
        lineNumber++
        if (logs.length >= limit) break
      }

      return logs.reverse()
    } catch (error) {
      console.error('读取日志文件失败:', error)
      return []
    }
  }

  async getRecentLogs(type?: string, limit: number = 100): Promise<LogEntry[]> {
    try {
      const files = await this.getLogFiles()
      const allLogs: LogEntry[] = []

      let targetFiles = files
      if (type === 'http') {
        targetFiles = files.filter(f => f.name.startsWith('http-'))
      } else if (type === 'mqtt') {
        targetFiles = files.filter(f => f.name.startsWith('mqtt-'))
      } else if (type === 'sync') {
        targetFiles = files.filter(f => f.name.startsWith('sync-'))
      } else if (type === 'error') {
        targetFiles = files.filter(f => f.name.includes('error'))
      }

      for (const file of targetFiles.slice(0, 5)) {
        const logs = await this.readLogFile(file.name, 200)
        allLogs.push(...logs)
      }

      return allLogs
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit)
    } catch (error) {
      console.error('获取最近日志失败:', error)
      return []
    }
  }

  async searchLogs(keyword: string, type?: string, limit: number = 100): Promise<LogEntry[]> {
    try {
      const recentLogs = await this.getRecentLogs(type, 1000)
      const searchResults = recentLogs.filter(log => {
        const messageMatch = log.message?.toLowerCase().includes(keyword.toLowerCase())
        const dataMatch = JSON.stringify(log.data || {})
          .toLowerCase()
          .includes(keyword.toLowerCase())
        return messageMatch || dataMatch
      })

      return searchResults.slice(0, limit)
    } catch (error) {
      console.error('搜索日志失败:', error)
      return []
    }
  }

  async getLogStats(): Promise<any> {
    try {
      this.ensureLogsDirExists()

      const files = await this.getLogFiles()
      const stats = {
        totalFiles: files.length,
        totalSize: files.reduce((sum, f) => sum + f.size, 0),
        httpFiles: files.filter(f => f.name.startsWith('http-')).length,
        mqttFiles: files.filter(f => f.name.startsWith('mqtt-')).length,
        syncFiles: files.filter(f => f.name.startsWith('sync-')).length,
        errorFiles: files.filter(f => f.name.includes('error')).length,
        latestUpdate: files.length > 0 ? files[0].modified : null,
      }
      return stats
    } catch (error) {
      console.error('获取日志统计失败:', error)
      return {
        totalFiles: 0,
        totalSize: 0,
        httpFiles: 0,
        mqttFiles: 0,
        syncFiles: 0,
        errorFiles: 0,
        latestUpdate: null,
      }
    }
  }
}
