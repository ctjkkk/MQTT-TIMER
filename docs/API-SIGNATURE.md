# HTTP API 签名验证说明

## 概述

为了保护HTTP接口不被未授权访问，本项目实现了基于HMAC-SHA256的请求签名机制。所有需要保护的接口都需要在请求头中携带签名和时间戳。

## 签名流程

### 1. 客户端生成签名

```
1. 获取当前时间戳（毫秒）
2. 构建待签名字符串：METHOD\nPATH\nTIMESTAMP\nBODY
3. 使用HMAC-SHA256算法，用SIGNATURE_SECRET对待签名字符串进行签名
4. 将签名转换为十六进制字符串
5. 在请求头中携带签名和时间戳
```

### 2. 服务端验证

```
1. 检查请求头中是否包含 X-Signature 和 X-Timestamp
2. 验证时间戳是否在有效期内（5分钟）
3. 使用相同的算法重新计算签名
4. 比对客户端签名和服务端签名是否一致
```

## 请求头要求

所有需要签名验证的接口都必须在请求头中包含：

- `X-Signature`: 请求签名（十六进制字符串）
- `X-Timestamp`: 时间戳（毫秒，字符串格式）
- `Content-Type`: application/json

## 防护机制

1. **防篡改**：任何对请求参数的修改都会导致签名验证失败
2. **防重放攻击**：时间戳验证确保请求在5分钟内有效
3. **密钥保护**：SIGNATURE_SECRET只有授权的客户端知道

## 客户端示例

### JavaScript/TypeScript

```typescript
import crypto from 'crypto'
import axios from 'axios'

const SIGNATURE_SECRET = 'dev-secret-key-change-in-production-12358221044'
const BASE_URL = 'http://127.0.0.1:8018/api'

/**
 * 生成请求签名
 */
function generateSignature(
  method: string,
  path: string,
  timestamp: string,
  body?: any
): string {
  const parts = [method.toUpperCase(), path, timestamp]

  if (body && Object.keys(body).length > 0) {
    parts.push(JSON.stringify(body))
  }

  const signString = parts.join('\n')
  return crypto.createHmac('sha256', SIGNATURE_SECRET)
    .update(signString)
    .digest('hex')
}

/**
 * 发送带签名的请求
 */
async function requestWithSignature(
  method: string,
  path: string,
  body?: any
) {
  const timestamp = Date.now().toString()
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

  return axios(config)
}

// 使用示例
async function main() {
  try {
    // 生成PSK
    const result = await requestWithSignature('POST', '/psk/generate', {
      mac: 'AA:BB:CC:DD:EE:FF',
    })
    console.log('生成PSK成功:', result.data)

    // 确认PSK
    const confirmResult = await requestWithSignature('POST', '/psk/confirm', {
      mac: 'AA:BB:CC:DD:EE:FF',
    })
    console.log('确认PSK成功:', confirmResult.data)
  } catch (error) {
    console.error('请求失败:', error.response?.data || error.message)
  }
}

main()
```

### Python

```python
import hmac
import hashlib
import time
import json
import requests

SIGNATURE_SECRET = 'dev-secret-key-change-in-production-12358221044'
BASE_URL = 'http://127.0.0.1:8018/api'

def generate_signature(method, path, timestamp, body=None):
    """生成请求签名"""
    parts = [method.upper(), path, str(timestamp)]

    if body:
        parts.append(json.dumps(body, separators=(',', ':')))

    sign_string = '\n'.join(parts)
    signature = hmac.new(
        SIGNATURE_SECRET.encode('utf-8'),
        sign_string.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

    return signature

def request_with_signature(method, path, body=None):
    """发送带签名的请求"""
    timestamp = str(int(time.time() * 1000))
    signature = generate_signature(method, path, timestamp, body)

    headers = {
        'Content-Type': 'application/json',
        'X-Signature': signature,
        'X-Timestamp': timestamp,
    }

    url = f'{BASE_URL}{path}'
    response = requests.request(method, url, json=body, headers=headers)
    return response.json()

# 使用示例
if __name__ == '__main__':
    try:
        # 生成PSK
        result = request_with_signature('POST', '/psk/generate', {
            'mac': 'AA:BB:CC:DD:EE:FF'
        })
        print('生成PSK成功:', result)

        # 确认PSK
        confirm_result = request_with_signature('POST', '/psk/confirm', {
            'mac': 'AA:BB:CC:DD:EE:FF'
        })
        print('确认PSK成功:', confirm_result)
    except Exception as e:
        print('请求失败:', str(e))
```

### cURL

```bash
#!/bin/bash

SIGNATURE_SECRET="dev-secret-key-change-in-production-12358221044"
BASE_URL="http://127.0.0.1:8018/api"

METHOD="POST"
PATH="/psk/generate"
TIMESTAMP=$(date +%s000)
BODY='{"mac":"AA:BB:CC:DD:EE:FF"}'

# 构建待签名字符串
SIGN_STRING="${METHOD}\n${PATH}\n${TIMESTAMP}\n${BODY}"

# 生成签名
SIGNATURE=$(echo -ne "${SIGN_STRING}" | openssl dgst -sha256 -hmac "${SIGNATURE_SECRET}" | cut -d' ' -f2)

# 发送请求
curl -X POST "${BASE_URL}${PATH}" \
  -H "Content-Type: application/json" \
  -H "X-Signature: ${SIGNATURE}" \
  -H "X-Timestamp: ${TIMESTAMP}" \
  -d "${BODY}"
```

## 常见错误

### 1. "缺少签名" / "缺少时间戳"
确保请求头中包含 `X-Signature` 和 `X-Timestamp`

### 2. "时间戳无效或已过期"
- 确保客户端时间与服务器时间同步
- 时间戳必须是毫秒级别的数字字符串
- 请求必须在生成签名后的5分钟内发送

### 3. "签名验证失败"
- 检查 SIGNATURE_SECRET 是否正确
- 确保待签名字符串的构建方式与服务端一致
- HTTP方法必须大写（GET, POST等）
- 路径必须与实际请求路径一致（包含路由前缀，如 /psk/generate）
- 如果有请求体，必须使用相同的JSON序列化方式（不含空格）

## 安全建议

1. **保护密钥**：SIGNATURE_SECRET 必须妥善保管，不要提交到版本控制系统
2. **使用HTTPS**：在生产环境中务必使用HTTPS，防止中间人攻击
3. **定期更换密钥**：建议定期更换SIGNATURE_SECRET
4. **不同环境使用不同密钥**：开发、测试、生产环境应使用不同的密钥

## 生成强密钥

可以使用以下命令生成安全的随机密钥：

```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# OpenSSL
openssl rand -hex 32

# Python
python -c "import secrets; print(secrets.token_hex(32))"
```
