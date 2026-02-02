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
  TCP_PORT: 11885,
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
    this.wifiConfigFile = path.join(__dirname, '.wifi-config.json') // 模拟Flash存储

    // 🆕 子设备配对相关
    this.isPairingMode = false // 是否处于配对模式
    this.pairingTimeout = null // 配对超时定时器
    this.subDevices = [] // 已配对的子设备列表
    this.scanningDevices = [] // 扫描中临时存储的子设备（扫描完成后一次性上报）
    this.scanDuration = 15000 // 扫描持续时间（15秒）
    this.scanTimer = null // 扫描完成定时器

    // 启动时加载已保存的WiFi配置
    this.loadWiFiConfig()
    this.setupReadline()
  }

  /**
   * 加载已保存的WiFi配置（模拟从Flash读取）
   */
  loadWiFiConfig() {
    try {
      if (fs.existsSync(this.wifiConfigFile)) {
        const configData = fs.readFileSync(this.wifiConfigFile, 'utf-8')
        this.wifiConfig = JSON.parse(configData)
        this.wifiConfigured = true
        console.log('📂 检测到已保存的WiFi配置')
        console.log(`   SSID: ${this.wifiConfig.ssid}`)
        console.log('')
      }
    } catch (error) {
      console.error('⚠️  读取WiFi配置失败:', error.message)
      this.wifiConfigured = false
    }
  }

  /**
   * 保存WiFi配置到文件（模拟写入Flash）
   */
  saveWiFiConfig(wifiConfig) {
    try {
      fs.writeFileSync(this.wifiConfigFile, JSON.stringify(wifiConfig, null, 2), 'utf-8')
      console.log('💾 WiFi配置已保存到本地存储')
    } catch (error) {
      console.error('⚠️  保存WiFi配置失败:', error.message)
    }
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

    // 检查是否已有WiFi配置
    if (this.wifiConfigured && this.wifiConfig) {
      console.log('✅ 检测到已保存的WiFi配置，自动连接中...')
      console.log('')
      // 模拟WiFi连接和MQTT连接（真实固件的流程）
      this.connectWiFiAndMQTT()
    } else {
      console.log('⏳ 等待接收WiFi配置...')
      console.log('💡 提示: 前端配置WiFi后，网关将自动连接MQTT')
      console.log('💡 提示: 输入 "reset" 可清除已保存的WiFi配置')
      console.log('')
    }
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

            // 保存WiFi配置到内存
            this.wifiConfig = wifiConfig
            this.wifiConfigured = true

            // 持久化保存WiFi配置（模拟写入Flash）
            this.saveWiFiConfig(wifiConfig)

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
      // 处理不同类型的 message（兼容不同的 MQTT 库）
      let command
      if (typeof message === 'object' && message !== null && !Buffer.isBuffer(message)) {
        // 如果已经是对象（某些 MQTT 库会自动解析 JSON）
        command = message
      } else if (Buffer.isBuffer(message)) {
        // 如果是 Buffer，转为字符串再解析
        command = JSON.parse(message.toString())
      } else if (typeof message === 'string') {
        // 如果是字符串，直接解析
        command = JSON.parse(message)
      } else {
        throw new Error(`未知的消息类型: ${typeof message}`)
      }

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
        return
      }

      // 🆕 处理配对相关命令
      if (command.msgType === 'operate_devices' && command.data) {
        if (command.data.action === 'start_pairing') {
          this.handleStartPairing(command.data)
          return
        }

        if (command.data.action === 'stop_pairing') {
          this.handleStopPairing(command.data)
          return
        }
      }

      // 其他命令的处理
      console.log('')
      console.log('📩 收到控制命令:')
      console.log(JSON.stringify(command, null, 2))
      console.log('')
    } catch (error) {
      console.error('❌ 命令解析失败:', error.message)
    }
  }

  /**
   * 🆕 处理开始配对命令
   */
  handleStartPairing(data) {
    console.log('')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📡 收到开始配对子设备命令')
    console.log(`⏱️  配对超时: ${data.timeout || 60}秒`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('')

    this.isPairingMode = true
    console.log('🔓 网关已进入配对模式')
    console.log('🔍 开始扫描周围的蓝牙/Zigbee子设备...')
    console.log(`⏱️  扫描持续时间: ${this.scanDuration / 1000}秒`)
    console.log('💡 扫描完成后将一次性上报所有发现的子设备')
    console.log('💡 也可以手动输入 "pair" 添加子设备')
    console.log('💡 输入 "cancel" 取消配对')
    console.log('')

    // 设置超时（默认60秒）
    const timeout = (data.timeout || 60) * 1000
    this.pairingTimeout = setTimeout(() => {
      if (this.isPairingMode) {
        console.log('⏰ 配对超时，自动退出配对模式')
        this.exitPairingMode()
      }
    }, timeout)

    // 🆕 自动扫描子设备（模拟真实固件行为）
    this.startAutoScanning()
  }

  /**
   * 🆕 处理停止配对命令
   */
  handleStopPairing(data) {
    console.log('')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🛑 收到停止配对子设备命令')
    console.log(`📝 原因: ${this.getPairingStopReason(data.reason)}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('')

    this.exitPairingMode()
  }

  /**
   * 🆕 退出配对模式
   */
  exitPairingMode() {
    this.isPairingMode = false

    if (this.pairingTimeout) {
      clearTimeout(this.pairingTimeout)
      this.pairingTimeout = null
    }

    // 停止扫描定时器
    if (this.scanTimer) {
      clearTimeout(this.scanTimer)
      this.scanTimer = null
    }

    // 清空扫描中的临时设备列表
    this.scanningDevices = []

    console.log('🔒 网关已退出配对模式')
    console.log('')
  }

  /**
   * 🆕 获取停止配对原因描述
   */
  getPairingStopReason(reason) {
    const reasons = {
      success: '配对成功',
      user_cancel: '用户取消',
      timeout: '配对超时',
      manual: '手动停止',
    }
    return reasons[reason] || reason || '未知原因'
  }

  /**
   * 🆕 手动模拟子设备配对（可选操作）
   * 用户可以通过输入 "pair" 命令手动添加子设备
   * 注意：手动添加也是添加到扫描列表，需要等待扫描完成后一起上报
   */
  simulateSubDevicePairing() {
    if (!this.isPairingMode) {
      console.log('❌ 网关未处于配对模式')
      console.log('💡 请先在APP中点击"添加子设备"')
      return
    }

    console.log('')
    console.log('🔍 手动搜索子设备...')

    // 模拟搜索延迟
    setTimeout(() => {
      // 生成随机子设备
      const subDeviceId = `SUB_${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      const capabilities = Math.floor(Math.random() * 4) // 0-3 (1-4路)
      const outletCount = capabilities + 1

      const subDevice = {
        uuid: subDeviceId,
        deviceType: 1,
        capabilities: capabilities,
        productId: 1001,
        firmwareVersion: '1.0.5',
        online: true,
      }

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('✅ 手动添加：发现子设备！')
      console.log(`   ID: ${subDeviceId}`)
      console.log(`   类型: ${outletCount}路水阀`)
      console.log(`   固件版本: ${subDevice.firmwareVersion}`)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('')

      // 添加到扫描中的临时列表（不立即上报）
      this.scanningDevices.push(subDevice)
      console.log(`📋 已添加到扫描列表 (当前: ${this.scanningDevices.length} 个)`)
      console.log('💡 扫描完成后将一起上报到云端')
      console.log('')
    }, 2000)
  }

  /**
   * 🆕 上报子设备信息
   */
  reportSubDevices(subDevices) {
    const message = {
      msgType: 'operate_devices',
      deviceId: this.config.GATEWAY_ID,
      timestamp: Math.floor(Date.now() / 1000),
      data: {
        entityType: 'subDevice',
        action: 'subdevice_add',
        subDevices: subDevices,
      },
    }

    this.publish('report', message)
  }

  /**
   * 🆕 开始自动扫描子设备（模拟真实固件行为）
   * 模拟网关通过蓝牙/Zigbee等协议扫描周围的子设备
   * 扫描完成后一次性上报所有发现的子设备
   */
  startAutoScanning() {
    // 清空之前的扫描结果
    this.scanningDevices = []

    console.log('🔍 启动自动扫描模式...')
    console.log('💡 正在扫描周围的蓝牙/Zigbee子设备...')
    console.log('')

    // 模拟扫描到的子设备数量（1-3个）
    const deviceCount = Math.floor(Math.random() * 3) + 1
    console.log(`📡 扫描模式启动，预计扫描时间 ${this.scanDuration / 1000} 秒...`)
    console.log('')

    // 在扫描期间，每隔几秒发现一个新子设备
    for (let i = 0; i < deviceCount; i++) {
      const delay = (i + 1) * (3000 + Math.random() * 3000) // 3-6秒间隔

      setTimeout(() => {
        if (!this.isPairingMode) {
          // 如果已退出配对模式，停止扫描
          return
        }

        // 发现子设备
        this.discoverSubDevice()
      }, delay)
    }

    // 扫描完成后，一次性上报所有子设备
    this.scanTimer = setTimeout(() => {
      if (!this.isPairingMode) {
        return
      }

      this.completeScan()
    }, this.scanDuration)
  }

  /**
   * 🆕 发现新的子设备（扫描过程中）
   * 注意：只是添加到临时数组，不立即上报
   */
  discoverSubDevice() {
    if (!this.isPairingMode) {
      return
    }

    // 生成随机子设备
    const subDeviceId = `SUB_${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    const capabilities = Math.floor(Math.random() * 4) // 0-3 (1-4路)
    const outletCount = capabilities + 1

    const subDevice = {
      uuid: subDeviceId,
      deviceType: 1,
      capabilities: capabilities,
      productId: 1001,
      firmwareVersion: '1.0.5',
      online: true,
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ 扫描发现新的子设备！')
    console.log(`   ID: ${subDeviceId}`)
    console.log(`   类型: ${outletCount}路水阀`)
    console.log(`   固件版本: ${subDevice.firmwareVersion}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('')

    // 添加到扫描中的临时列表（不立即上报）
    this.scanningDevices.push(subDevice)
    console.log(`📋 已添加到扫描列表 (当前: ${this.scanningDevices.length} 个)`)
    console.log('')
  }

  /**
   * 🆕 完成扫描，一次性上报所有发现的子设备
   */
  completeScan() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ 扫描完成！')
    console.log(`📊 共发现 ${this.scanningDevices.length} 个子设备`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('')

    if (this.scanningDevices.length === 0) {
      console.log('⚠️  未发现任何子设备')
      console.log('💡 可以手动输入 "pair" 添加测试设备')
      console.log('')
      return
    }

    // 显示扫描结果
    console.log('📋 扫描到的子设备列表：')
    this.scanningDevices.forEach((device, index) => {
      const outletCount = (device.capabilities & 0x03) + 1
      console.log(`   ${index + 1}. ${device.uuid} - ${outletCount}路水阀`)
    })
    console.log('')

    // 一次性上报所有子设备
    console.log('📤 正在上报所有子设备到云端...')
    this.reportSubDevices(this.scanningDevices)

    // 将扫描到的设备添加到已配对列表
    this.subDevices.push(...this.scanningDevices)

    // 清空扫描中的临时列表
    this.scanningDevices = []

    console.log('✅ 上报完成，等待云端响应...')
    console.log('')
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
    console.log('  pair      - 🆕 手动添加子设备到扫描列表')
    console.log('  finish    - 🆕 完成扫描并立即上报')
    console.log('  cancel    - 🆕 取消配对')
    console.log('  devices   - 🆕 查看已配对的子设备')
    console.log('  status    - 显示状态')
    console.log('  reset     - 清除WiFi配置（恢复出厂）')
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

      case 'pair':
        this.simulateSubDevicePairing()
        break

      case 'finish':
        if (this.isPairingMode) {
          console.log('🔚 用户手动结束扫描')
          // 清除扫描定时器
          if (this.scanTimer) {
            clearTimeout(this.scanTimer)
            this.scanTimer = null
          }
          // 立即完成扫描并上报
          this.completeScan()
        } else {
          console.log('❌ 当前未处于配对模式')
        }
        break

      case 'cancel':
        if (this.isPairingMode) {
          console.log('🛑 用户取消配对')
          this.exitPairingMode()
        } else {
          console.log('❌ 当前未处于配对模式')
        }
        break

      case 'devices':
        this.showSubDevices()
        break

      case 'status':
        this.showStatus()
        break

      case 'reset':
        this.resetWiFiConfig()
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
   * 🆕 显示已配对的子设备
   */
  showSubDevices() {
    console.log('')
    console.log('═══════════════════════════════════════════════════════')
    console.log('📋 已配对的子设备列表')
    console.log('═══════════════════════════════════════════════════════')

    if (this.subDevices.length === 0) {
      console.log('  暂无子设备')
    } else {
      this.subDevices.forEach((device, index) => {
        const outletCount = (device.capabilities & 0x03) + 1
        console.log(`  ${index + 1}. ID: ${device.uuid}`)
        console.log(`     类型: ${outletCount}路水阀`)
        console.log(`     固件: ${device.firmwareVersion}`)
        console.log(`     状态: ${device.online ? '在线' : '离线'}`)
        console.log('')
      })
    }

    console.log('═══════════════════════════════════════════════════════')
    console.log('')
  }

  /**
   * 重置WiFi配置（模拟恢复出厂设置）
   */
  resetWiFiConfig() {
    console.log('')
    console.log('⚠️  正在清除WiFi配置...')

    try {
      // 删除配置文件
      if (fs.existsSync(this.wifiConfigFile)) {
        fs.unlinkSync(this.wifiConfigFile)
      }

      // 清除内存中的配置
      this.wifiConfig = null
      this.wifiConfigured = false

      // 断开MQTT连接
      if (this.isConnected) {
        this.cleanup()
      }

      console.log('✅ WiFi配置已清除')
      console.log('💡 请重新启动程序以进入配网模式')
      console.log('')

    } catch (error) {
      console.error('❌ 清除配置失败:', error.message)
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
    console.log(`  WiFi配置:      ${this.wifiConfigured ? '✅ 已配置' : '❌ 未配置'}`)
    if (this.wifiConfigured && this.wifiConfig) {
      console.log(`  WiFi SSID:     ${this.wifiConfig.ssid}`)
    }
    console.log(`  配对模式:      ${this.isPairingMode ? '🔓 开启' : '🔒 关闭'}`)
    console.log(`  子设备数量:    ${this.subDevices.length} 个`)
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
