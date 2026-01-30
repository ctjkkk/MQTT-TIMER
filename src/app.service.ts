import { Injectable } from '@nestjs/common'

@Injectable()
export class AppService {
  getRootPage(): Object {
    return {
      name: 'device-api',
      version: '1.0.0',
      status: 'ok',
      docs: 'http://35.172.194.174:8018/docs.html',
    }
  }
}
