import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { Logger } from '@nestjs/common'
import { LogMessages } from '@/shared/constants/log-messages.constants'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const config = new DocumentBuilder()
    .setTitle('MQTT 设备管理接口')
    .setDescription('设备 PSK 生成、确认等 API')
    .setVersion('1.0')
    .addTag('设备管理')
    .build()
  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('/doc', app, document) // swagger 监听127.0.0.1:8018/api/doc
  app.setGlobalPrefix('/api') // 访问控制器添加公共前缀 127.0.0.1:8018/api
  app.enableCors() // 启用跨域
  Logger.log(LogMessages.SERVER.LOCAL_SERVER(Number(process.env.APP_PORT)))
  await app.listen(process.env.APP_PORT ?? 8018)
}
bootstrap()
