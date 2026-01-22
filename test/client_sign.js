import crypto from 'crypto'
import axios from 'axios'

const SIGNATURE_SECRET = '5b1b0c323b9201cc716e61f590ba8f32d06a32512bc86abcda427663ee08b2f1'
const BASE_URL = 'http://35.172.194.174:8018/api'

/**
 * 生成请求签名
 */
function generateSignature(method, path, timestamp, body) {
  const parts = [method.toUpperCase(), path, timestamp]
  if (body && Object.keys(body).length > 0) {
    parts.push(JSON.stringify(body))
  }
  const signString = parts.join('\n')
  return crypto.createHmac('sha256', SIGNATURE_SECRET).update(signString).digest('hex')
}

/**
 * 发送带签名的请求
 */
async function requestWithSignature(method, path, body) {
  const timestamp = Math.floor(Date.now() / 1000).toString() //秒
  const signature = generateSignature(method, path, timestamp, body)

  const config = {
    method,
    url: `${BASE_URL}${path}`,
    headers: {
      'Content-Type': 'application/json',
      'X-Signature': signature,
      'X-Timestamp': timestamp,
    },
    data: body,
  }
  console.log(signature)
  console.log(timestamp)
  return axios(config)
}

// 使用示例
async function main() {
  try {
    // 生成PSK
    const result = await requestWithSignature('POST', '/psk/generate', {
      mac: 'ABCDEF654321',
    })
    console.log('生成PSK成功:', result.data)

    // 确认PSK
    const confirmResult = await requestWithSignature('POST', '/psk/confirm', {
      mac: 'ABCDEF654321',
    })
    console.log('确认PSK成功:', confirmResult.data)
  } catch (error) {
    console.error('请求失败:', error.response?.data || error.message)
  }
}

main()
