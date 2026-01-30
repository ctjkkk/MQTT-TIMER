import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger'
import { knife4jSetup } from 'nestjs-knife4j-plus'
import { INestApplication } from '@nestjs/common'

export const buildSwagger = (app: INestApplication): OpenAPIObject => {
  const options = new DocumentBuilder()
    .setTitle('Host Timer')
    .setDescription('Device PSK generation, verification, gateway and other APIs')
    .setVersion('1.0')
    .setContact('Jams Williams', '', '2283025597@qq.com')
    .addServer('http://35.172.194.174:8018', '生产环境')
    .build()

  const document = SwaggerModule.createDocument(app, options)

  // 设置 Swagger UI（必须在 knife4j 之前）
  SwaggerModule.setup('api', app, document)
  knife4jSetup(app, [
    {
      name: '1.0 version',
      url: `/api-json`,
    },
  ])

  return document
}
