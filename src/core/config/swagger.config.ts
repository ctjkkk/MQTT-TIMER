import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger'
import { knife4jSetup } from 'nest-knife4j'
import { INestApplication } from '@nestjs/common'

export const buildSwagger = (app: INestApplication): OpenAPIObject => {
  const config = new DocumentBuilder()
    .setTitle('设备接口管理')
    .setDescription('设备 PSK 生成、确认、网关等 API')
    .setVersion('1.0')
    .setContact('Jams Williams', '', '2283025597@qq.com')
    .addServer('http://3.216.169.117:8018', '生产环境')
    .addTag('设备管理')
    .build()

  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('swagger', app, document) // 纯 swagger-ui

  knife4jSetup(app, [
    {
      name: '汉奇设备',
      url: '/swagger-json',
      swaggerVersion: '3.0',
      location: '/swagger-json',
    },
  ])

  return document
}
