import { createParamDecorator, ExecutionContext } from '@nestjs/common'

/**
 * 从请求中提取当前用户ID
 *
 * 使用示例:
 * @Get('/:gatewayId/devices_list')
 * getSubDevicesList(@CurrentUserId() userId: string, @Param('gatewayId') gatewayId: string) {
 *   return this.timerService.getSubDevicesListByGatewayId(userId, gatewayId)
 * }
 */
export const CurrentUserId = createParamDecorator((data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest()
  return request.user?.id
})

/**
 * 从请求中提取完整的当前用户对象
 *
 * 使用示例:
 * @Get('/profile')
 * getProfile(@CurrentUser() user: any) {
 *   return user
 * }
 */
export const CurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext): any => {
  const request = ctx.switchToHttp().getRequest()
  return request.user
})

/**
 * 从请求中提取用户对象的特定字段
 *
 * 使用示例:
 * @Get('/settings')
 * getSettings(@CurrentUser('username') username: string) {
 *   return { username }
 * }
 */
export const CurrentUserField = createParamDecorator((field: string, ctx: ExecutionContext): any => {
  const request = ctx.switchToHttp().getRequest()
  return request.user?.[field]
})
