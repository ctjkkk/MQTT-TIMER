import { Request } from 'express'

/**
 * 经过身份验证的请求类型
 * 说明：
 * - 当请求通过 JwtAuthGuard 后，request.user 会被注入 JWT payload
 * - 这个类型定义基于项目实际使用情况（见 CurrentUserId 装饰器）
 */
export interface AuthenticatedRequest extends Request {
  user: {
    /** 用户ID（从 CurrentUserId 装饰器确认，实际使用的是 id 字段） */
    id: string
    /** 其他可能的字段（根据实际 JWT payload 添加） */
    [key: string]: any
  }
}
