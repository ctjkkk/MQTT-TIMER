import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common'
import { OwnershipGuard } from '@/common/guards/ownership.guard'

/**
 * 资源所有权检查装饰器（组合装饰器）
 *
 * 功能：
 * - 自动应用 OwnershipGuard
 * - 设置资源类型和参数名的元数据
 * - 无需手动添加 @UseGuards(OwnershipGuard)
 *
 * @param resourceType - 资源类型（'channel' | 'timer' | 'gateway'）
 * @param resourceIdParam - 资源 ID 参数名（在路由参数或查询参数中的名称）
 *
 * @example
 * ```typescript
 * // 验证 channelId 参数（Guard 自动应用）
 * @Get(':channelId')
 * @CheckOwnership('channel', 'channelId')
 * async getChannelById(@Param('channelId') channelId: string) {
 *   return this.channelService.findChannelById(channelId)
 * }
 *
 * // 验证 timerId 查询参数（Guard 自动应用）
 * @Get('list')
 * @CheckOwnership('timer', 'timerId')
 * async getChannelsByTimerId(@Query('timerId') timerId: string) {
 *   return this.channelService.findChannelsByTimerId(timerId)
 * }
 * ```
 */
export const CheckOwnership = (resourceType: string, resourceIdParam: string) => {
  return applyDecorators(
    UseGuards(OwnershipGuard),
    SetMetadata('resourceType', resourceType),
    SetMetadata('resourceIdParam', resourceIdParam),
  )
}
