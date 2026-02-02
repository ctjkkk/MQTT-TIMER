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
  logger.log(LogMessages.SERVER.LOCAL_SERVER(Number(process.env.APP_PORT)))
  logger.log(`Application is running on: http://localhost:${port}`)
  logger.log(`Knife4j UI: http://localhost:${port}/doc.html`)
  logger.log(`RedisInsight UI: http://localhost:5540`)
  // 在编译后的代码中，静态资源路径应该是 dist/core/logger/loggerViewer
  app.useStaticAssets(join(__dirname, './core/logger/', 'loggerViewer'), { prefix: '/logs' })
  await app.listen(process.env.APP_PORT ?? 8018)
}
bootstrap()
