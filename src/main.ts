import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { Logger } from '@nestjs/common'
import { LogMessages } from '@/shared/constants/log-messages.constants'
import { buildSwagger } from '@/core/config/swagger.config'
import { join } from 'path'
import { NestExpressApplication } from '@nestjs/platform-express'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)
  app.setGlobalPrefix('/api', {
    exclude: ['logs', 'logs/*path'], // 排除日志查看器路径
  })
  app.enableCors() // 启用跨域
  buildSwagger(app)
  Logger.log(LogMessages.SERVER.LOCAL_SERVER(Number(process.env.APP_PORT)))
  // 在编译后的代码中，静态资源路径应该是 dist/core/logger/loggerViewer
  app.useStaticAssets(join(__dirname, './core/logger/', 'loggerViewer'), { prefix: '/logs' })
  await app.listen(process.env.APP_PORT ?? 8018)
}
bootstrap()
