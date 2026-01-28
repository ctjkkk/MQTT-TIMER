#!/usr/bin/env node

/**
 * 汉奇网关固件模拟器
 *
 * 模拟功能：
 * 1. MQTT连接（TCP或PSK-TLS）
 * 2. 发送注册消息
 * 3. 定时发送心跳
 * 4. 接收和响应控制命令
 */

const mqtt = require('mqtt')
const http = require('http')
const readline = require('readline')
const fs = require('fs')
const path = require('path')

// 读取.env文件
const envPath = path.join(__dirname, '.env')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const match = trimmed.match(/^([^=]+)=(.*)$/)
      if (match) {
        const key = match[1].trim()
        const value = match[2].trim()
        if (!process.env[key]) {
          process.env[key] = value
        }
      }
    }
  })
}

const CONFIG = {
  // 网关ID（模拟MAC地址）
  GATEWAY_ID: process.env.GATEWAY_ID || 'TEST_GATEWAY_001',

  // MQTT服务器配置
  MQTT_HOST: process.env.MQTT_HOST || '127.0.0.1',

  // 连接模式：'tcp' 或 'psk'
  MODE: process.env.MODE || 'tcp',

  // TCP模式配置
  TCP_PORT: 1885,
  TCP_USERNAME: 'hanqi',
  TCP_PASSWORD: '12358221044',

  // PSK模式配置（如果使用）
  PSK_PORT: 8445,
  PSK_IDENTITY: process.env.PSK_IDENTITY || process.env.GATEWAY_ID || 'TEST_GATEWAY_001',
  PSK_KEY: process.env.PSK_KEY || '', // 从后端生成的PSK密钥

  // 心跳间隔（毫秒）
  HEARTBEAT_INTERVAL: parseInt(process.env.HEARTBEAT_INTERVAL) || 30000, // 30秒

  // 固件版本
  FIRMWARE_VERSION: '1.0.0-simulator',
}

class GatewaySimulator {
  constructor(config) {
    this.config = config
    this.client = null
    this.heartbeatTimer = null
    this.isConnected = false
    this.wifiConfigured = false // WiFi是否已配置
    this.wifiConfig = null // WiFi配置信息

    this.setupReadline()
  }

  /**
   * 启动模拟器
   */
  start() {
    console.log('╔════════════════════════════════════════════════════════╗')
    console.log('║        汉奇网关固件模拟器 v1.0                        ║')
    console.log('╚════════════════════════════════════════════════════════╝')
    console.log('')
    console.log(`📱 网关ID: ${this.config.GATEWAY_ID}`)
    console.log(`🔌 连接模式: ${this.config.MODE.toUpperCase()}`)
    console.log(`🌐 MQTT服务器: ${this.config.MQTT_HOST}`)
    console.log('')

    // 启动BLE HTTP服务（模拟蓝牙扫描）
    this.startBLEService()

    console.log('⏳ 等待接收WiFi配置...')
    console.log('💡 提示: 前端配置WiFi后，网关将自动连接MQTT')
    console.log('')

    // 不立即连接MQTT，等待WiFi配置
    // this.connect()
  }

  /**
   * 启动BLE服务（HTTP模拟）
   */
  startBLEService() {
    const server = http.createServer((req, res) => {
      // CORS头部必须在所有响应中设置
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

      // 处理OPTIONS预检请求（必须返回200）
      if (req.method === 'OPTIONS') {
        res.writeHead(200, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        })
        res.end()
        return
      }

      // 获取网关信息（蓝牙扫描）
      if (req.url === '/bluetooth/info' && req.method === 'GET') {
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        })
        res.end(
          JSON.stringify({
            id: this.config.GATEWAY_ID,
            name: `HanQi_${this.config.GATEWAY_ID.slice(-6)}`,
            rssi: -45,
          }),
        )
      }
      // 接收WiFi配置（模拟蓝牙传输）
      else if (req.url === '/bluetooth/configure' && req.method === 'POST') {
        let body = ''
        req.on('data', chunk => {
          body += chunk.toString()
        })
        req.on('end', () => {
          try {
            const wifiConfig = JSON.parse(body)
            console.log('📩 收到WiFi配置:')
            console.log(`   SSID: ${wifiConfig.ssid}`)
            console.log(`   密码: ${'*'.repeat(wifiConfig.password.length)}`)
            console.log('')

            // 保存WiFi配置
            this.wifiConfig = wifiConfig
            this.wifiConfigured = true

            // 模拟连接WiFi并连接MQTT
            this.connectWiFiAndMQTT()

            res.writeHead(200, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            })
            res.end(
              JSON.stringify({
                success: true,
                message: 'WiFi配置已接收',
              }),
            )
          } catch (error) {
            res.writeHead(400, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            })
            res.end(
              JSON.stringify({
                success: false,
                message: '配置数据格式错误',
              }),
            )
          }
        })
      } else {
        res.writeHead(404, {
          'Access-Control-Allow-Origin': '*',
        })
        res.end()
      }
    })

    server.listen(3002, () => {
      console.log('📡 BLE服务: http://localhost:3002')
      console.log('')
    })
  }

  /**
   * 连接WiFi并连接MQTT（模拟真实流程）
   */
  async connectWiFiAndMQTT() {
    console.log('🔄 正在连接WiFi...')
    console.log(`   SSID: ${this.wifiConfig.ssid}`)

    // 模拟WiFi连接延迟
    await new Promise(resolve => setTimeout(resolve, 2000))

    console.log('✅ WiFi连接成功！')
    console.log(`   IP地址: 192.168.1.${Math.floor(Math.random() * 200 + 10)}`)
    console.log('')

    console.log('🔄 正在连接MQTT Broker...')

    // 连接MQTT
    this.connect()
  }

  /**
   * 连接MQTT服务器
   */
  connect() {
    const options = this.config.MODE === 'psk' ? this.getPskOptions() : this.getTcpOptions()

    console.log('🔄 正在连接MQTT Broker...')
    console.log(`   地址: ${options.host}:${options.port}`)

    this.client = mqtt.connect(options)

    this.client.on('connect', () => {
      this.isConnected = true
      console.log('✅ MQTT连接成功！')
      console.log('')

      // 订阅控制主题
      this.subscribe()

      // 发送注册消息
      this.sendRegisterMessage()

      // 启动心跳
      this.startHeartbeat()

      // 显示菜单
      this.showMenu()
    })

    this.client.on('error', error => {
      console.error('❌ MQTT连接错误:', error.message)
      this.isConnected = false
    })

    this.client.on('close', () => {
      console.log('⚠️  MQTT连接已断开')
      this.isConnected = false
      this.stopHeartbeat()
    })

    this.client.on('message', (topic, message) => {
      this.handleCommand(topic, message)
    })
  }

  /**
   * 获取TCP连接配置
   */
  getTcpOptions() {
    return {
      host: this.config.MQTT_HOST,
      port: this.config.TCP_PORT,
      protocol: 'mqtt',
      username: this.config.TCP_USERNAME,
      password: this.config.TCP_PASSWORD,
      clientId: `gateway_${this.config.GATEWAY_ID}`,
      clean: true,
      reconnectPeriod: 5000,
    }
  }

  /**
   * 获取PSK-TLS连接配置
   */
  getPskOptions() {
    if (!this.config.PSK_KEY) {
      console.error('❌ 错误: PSK_KEY 未配置')
      console.log('   请先生成PSK密钥，然后设置环境变量：')
      console.log('   export PSK_KEY=your_psk_key_here')
      process.exit(1)
    }

    return {
      host: this.config.MQTT_HOST,
      port: this.config.PSK_PORT,
      protocol: 'mqtts',
      clientId: `gateway_${this.config.GATEWAY_ID}`,
      clean: true,
      reconnectPeriod: 5000,
      rejectUnauthorized: false, // 开发环境
      pskCallback: () => {
        return {
          identity: this.config.PSK_IDENTITY,
          psk: Buffer.from(this.config.PSK_KEY, 'hex'),
        }
      },
    }
  }

  /**
   * 订阅控制主题
   */
  subscribe() {
    const commandTopic = `hanqi/gateway/${this.config.GATEWAY_ID}/command`

    this.client.subscribe(commandTopic, err => {
      if (err) {
        console.error('❌ 订阅失败:', err.message)
      } else {
        console.log(`📬 已订阅控制主题: ${commandTopic}`)
      }
    })
  }

  /**
   * 发送注册消息
   */
  sendRegisterMessage() {
    const message = {
      msgType: 'operate_devices',
      deviceId: this.config.GATEWAY_ID,
      data: {
        entityType: 'gateway',
        action: 'gateway_register',
        firmware: this.config.FIRMWARE_VERSION,
        model: 'HQ-GW-SIM',
        timestamp: Date.now(),
      },
    }

    this.publish('report', message)
    console.log('📝 已发送注册消息')
  }

  /**
   * 启动心跳
   */
  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        this.sendHeartbeat()
      }
    }, this.config.HEARTBEAT_INTERVAL)
  }

  /**
   * 停止心跳
   */
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  /**
   * 发送心跳
   */
  sendHeartbeat() {
    const message = {
      msgType: 'heartbeat',
      deviceId: this.config.GATEWAY_ID,
      timestamp: Date.now(),
      data: {
        entityType: 'gateway',
      },
    }

    this.publish('report', message)

    const now = new Date().toLocaleTimeString('zh-CN')
    console.log(`💓 [${now}] 心跳已发送`)
  }

  /**
   * 发布消息
   */
  publish(type, message) {
    const topic = `hanqi/gateway/${this.config.GATEWAY_ID}/${type}`
    const payload = JSON.stringify(message)

    this.client.publish(topic, payload, { qos: 0 }, err => {
      if (err) {
        console.error('❌ 发布失败:', err.message)
      }
    })
  }

  /**
   * 处理控制命令
   */
  handleCommand(topic, message) {
    try {
      const command = JSON.parse(message.toString())

      // 特别处理心跳响应
      if (command.msgType === 'heartbeat_ack') {
        const now = new Date().toLocaleTimeString('zh-CN')
        const bindStatus = command.data.status === 1 ? '✅ 已绑定' : '❌ 未绑定'
        const userId = command.data.userId ? `, 用户: ${command.data.userId}` : ''
        console.log(`💚 [${now}] 收到心跳响应: ${bindStatus}${userId}`)

        // 如果未绑定，发出警告
        if (command.data.status === 0) {
          console.log('   ⚠️  警告: 网关未绑定用户，请通过APP绑定网关')
        }
      } else {
        // 其他命令的处理
        console.log('')
        console.log('📩 收到控制命令:')
        console.log(JSON.parse(command, null, 2))
        console.log('')
      }

      // 这里可以添加更多命令处理逻辑
      // 例如：控制子设备、固件升级等
    } catch (error) {
      console.error('❌ 命令解析失败:', error.message)
    }
  }

  /**
   * 设置命令行交互
   */
  setupReadline() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '> ',
    })

    this.rl.on('line', line => {
      this.handleUserInput(line.trim())
      if (this.isConnected) {
        this.rl.prompt()
      }
    })

    this.rl.on('close', () => {
      this.cleanup()
      process.exit(0)
    })
  }

  /**
   * 显示菜单
   */
  showMenu() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('可用命令：')
    console.log('  register  - 发送注册消息')
    console.log('  heartbeat - 发送心跳')
    console.log('  status    - 显示状态')
    console.log('  help      - 显示帮助')
    console.log('  quit      - 退出程序')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('')
    this.rl.prompt()
  }

  /**
   * 处理用户输入
   */
  handleUserInput(input) {
    switch (input.toLowerCase()) {
      case 'register':
        this.sendRegisterMessage()
        break

      case 'heartbeat':
        this.sendHeartbeat()
        break

      case 'status':
        this.showStatus()
        break

      case 'help':
        this.showMenu()
        break

      case 'quit':
      case 'exit':
        console.log('👋 再见！')
        this.cleanup()
        process.exit(0)
        break

      default:
        if (input) {
          console.log(`❓ 未知命令: ${input}`)
          console.log('   输入 "help" 查看可用命令')
        }
    }
  }

  /**
   * 显示状态
   */
  showStatus() {
    console.log('')
    console.log('═══════════════════════════════════════════════════════')
    console.log('📊 网关状态')
    console.log('═══════════════════════════════════════════════════════')
    console.log(`  网关ID:        ${this.config.GATEWAY_ID}`)
    console.log(`  连接状态:      ${this.isConnected ? '🟢 在线' : '🔴 离线'}`)
    console.log(`  连接模式:      ${this.config.MODE.toUpperCase()}`)
    console.log(`  MQTT服务器:    ${this.config.MQTT_HOST}`)
    console.log(`  心跳间隔:      ${this.config.HEARTBEAT_INTERVAL / 1000}秒`)
    console.log(`  固件版本:      ${this.config.FIRMWARE_VERSION}`)
    console.log('═══════════════════════════════════════════════════════')
    console.log('')
  }

  /**
   * 清理资源
   */
  cleanup() {
    this.stopHeartbeat()

    if (this.client && this.isConnected) {
      console.log('🔌 正在断开MQTT连接...')
      this.client.end(true)
    }

    if (this.rl) {
      this.rl.close()
    }
  }
}

// ========== 启动程序 ==========

// 处理未捕获的异常
process.on('uncaughtException', error => {
  console.error('❌ 未捕获的异常:', error)
  process.exit(1)
})

process.on('SIGINT', () => {
  console.log('\n收到中断信号，正在退出...')
  process.exit(0)
})

// 创建并启动模拟器
const simulator = new GatewaySimulator(CONFIG)
simulator.start()
