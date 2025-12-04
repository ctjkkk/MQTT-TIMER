import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { Logger } from '@nestjs/common'
import { LogMessages } from '@/shared/constants/log-messages.constants'
import { buildSwagger } from './config/swagger.config'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.setGlobalPrefix('/api') // 访问控制器添加公共前缀 127.0.0.1:8018/api
  app.enableCors() // 启用跨域
  buildSwagger(app)
  Logger.log(LogMessages.SERVER.LOCAL_SERVER(Number(process.env.APP_PORT)))
  await app.listen(process.env.APP_PORT ?? 8018)
}
bootstrap()
