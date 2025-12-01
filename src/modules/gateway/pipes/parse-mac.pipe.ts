// parse-mac.pipe.ts
import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common'
import validator from 'validator'

@Injectable()
export class ParseMacPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!validator.isMACAddress(value)) {
      throw new BadRequestException('MAC 地址格式错误')
    }
    return value
  }
}
