import { registerAs } from '@nestjs/config'
export default registerAs('database', () => ({
  host: process.env.MONGO_HOST ?? '',
  options: {
    dbName: 'hanqi_smart_irrigation',
    maxPoolSize: 10, // 连接池中最大连接数
    serverSelectionTimeoutMS: 5000, // 服务器选择超时时间（毫秒）
    socketTimeoutMS: 45000, // Socket 操作超时时间（毫秒）
    connectTimeoutMS: 10000, // 连接建立超时时间（毫秒）
    bufferCommands: false, // 是否缓冲数据库命令
  },
}))
