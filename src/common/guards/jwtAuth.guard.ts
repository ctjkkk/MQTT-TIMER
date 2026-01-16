import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { IS_PUBLIC_KEY } from '@/shared/constants/userAuth.constants'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(), //从路由函数上去读取
      context.getClass(), //从类上去读
    ])
    if (isPublic) {
      // 公共接口:登录注册接口不需要带token
      return true
    }

    // 如果不是公共接口，需要检验客户端请求头中传递的token信息
    const request = context.switchToHttp().getRequest()
    const token = JwtAuthGuard.extractTokenFromHeaders(request)
    if (!token) {
      //如果没登录，抛异常
      throw new UnauthorizedException('Please log in...')
    }

    // 如果已登录，需要去jwt去验证该token可用性，然后将token解析出来
    try {
      const payload = await this.jwtService.verifyAsync(token) //验证token是否过期，是否正确，并得到解析过后的身份信息
      //将解析出来的用户信息放到每个请求中，以后接受到任意请求只要用户请求头带了token，都可以拿到该用户的信息
      request['user'] = payload
    } catch (e) {
      throw new UnauthorizedException('Token invalid or expired.')
    }
    return true //如果上面的异步操作都执行成功了，才会执行这行代码，放行
  }

  private static extractTokenFromHeaders(request: any) {
    const [type, token] = request.headers?.authorization?.split(' ') ?? []
    return type == 'Bearer' ? token : undefined
  }
}
