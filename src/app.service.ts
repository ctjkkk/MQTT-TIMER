import { Injectable } from '@nestjs/common'

@Injectable()
export class AppService {
  getRootPage(): Object {
    return {
      name: 'device-api',
      version: '1.0.0',
      status: 'ok',
      docs: 'http://3.216.169.117:8018/docs.html',
    }
  }
}
