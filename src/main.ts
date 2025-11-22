import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { Logger } from '@nestjs/common'
import { LogMessages } from '@/shared/constants/log-messages.constants'
async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.setGlobalPrefix('api/') //添加公共前缀
  app.enableCors() // 启用跨域
  Logger.log(LogMessages.SERVER.LOCAL_SERVER(Number(process.env.APP_PORT)))
  await app.listen(process.env.APP_PORT ?? 8018)
}
bootstrap()
