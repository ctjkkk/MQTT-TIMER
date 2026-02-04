import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { Logger } from '@nestjs/common'
import { LogMessages } from '@/shared/constants/logger.constants'
import { buildSwagger } from '@/core/config/swagger.config'
import { join } from 'path'
import { NestExpressApplication } from '@nestjs/platform-express'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)
  const logger = new Logger('Bootstrap')
  app.setGlobalPrefix('/api', {
    exclude: ['logs', 'logs/*path', 'doc.html', 'api-json'],
  })
  app.enableCors() // 启用跨域
  buildSwagger(app)

  const port = process.env.APP_PORT ?? 8018
  const host = process.env.APP_HOST ?? '0.0.0.0' // Docker 容器必须监听 0.0.0.0 才能接受外部连接

  // 在编译后的代码中，静态资源路径应该是 dist/core/logger/loggerViewer
  app.useStaticAssets(join(__dirname, './core/logger/', 'loggerViewer'), { prefix: '/logs' })

  await app.listen(port, host)

  logger.log(LogMessages.SERVER.LOCAL_SERVER(Number(port)))
  logger.log(`Application is running on: http://${host}:${port}`)
  logger.log(`Knife4j API Docs: http://${host}:${port}/doc.html`)
  logger.log(`Logs Viewer: http://${host}:${port}/logs/index.html`)
  logger.log(`RabbitMQ Viewer: http://${host}:15672`)
}
bootstrap()
