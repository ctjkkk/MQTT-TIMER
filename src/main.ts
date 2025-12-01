import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { Logger } from '@nestjs/common'
import { LogMessages } from '@/shared/constants/log-messages.constants'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { knife4jSetup } from 'nest-knife4j'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.setGlobalPrefix('/api') // 访问控制器添加公共前缀 127.0.0.1:8018/api
  app.enableCors() // 启用跨域
  const config = new DocumentBuilder()
    .setTitle('MQTT 设备管理接口')
    .setDescription('设备 PSK 生成、确认、网关等 API')
    .setVersion('1.0')
    .setContact('Jams Williams', '', '2283025597@qq.com')
    .addServer('http://3.216.169.117:8018', '生产环境')
    .addTag('设备管理')
    .build()
  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('swagger', app, document) // swagger 监听127.0.0.1:8018/api/doc
  knife4jSetup(app, [
    {
      name: '汉奇设备',
      url: '/swagger-json',
      swaggerVersion: '3.0',
      location: '/swagger-json',
    },
  ])
  Logger.log(LogMessages.SERVER.LOCAL_SERVER(Number(process.env.APP_PORT)))
  await app.listen(process.env.APP_PORT ?? 8018)
}
bootstrap()
