import { Injectable, CanActivate, ExecutionContext, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Channel } from '@/modules/channel/schema/channel.schema'
import { Timer } from '@/modules/timer/schema/timer.schema'
import { Gateway } from '@/modules/gateway/schema/gateway.schema'
import { AuthenticatedRequest } from '@/common/types/request.types'

/**
 * 资源所有权验证守卫（Authorization）
 *
 * 前置条件：
 * - 必须在 JwtAuthGuard 之后执行（Authentication 已完成）
 * - request.user 已被 JwtAuthGuard 注入
 *
 * 职责：
 * - 验证用户是否有权访问特定资源
 * - 支持 Channel、Timer、Gateway 三种资源类型
 * - 自动从路由参数或查询参数中提取资源 ID
 *
 * 使用方式：
 * ```typescript
 * @Get(':channelId')
 * @UseGuards(OwnershipGuard)
 * @CheckOwnership('channel', 'channelId')
 * async getChannelById(@Param('channelId') channelId: string) {
 *   // Guard 已验证权限，这里只需要执行业务逻辑
 *   return await this.channelService.findChannelById(channelId)
 * }
 * ```
 *
 * 验证逻辑：
 * - Channel: 验证 channel.userId === 当前用户ID
 * - Timer: 验证 timer -> gateway -> gateway.userId === 当前用户ID
 * - Gateway: 验证 gateway.userId === 当前用户ID
 */
@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectModel(Channel.name) private readonly channelModel: Model<Channel>,
    @InjectModel(Timer.name) private readonly timerModel: Model<Timer>,
    @InjectModel(Gateway.name) private readonly gatewayModel: Model<Gateway>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 使用类型安全的 AuthenticatedRequest
    // JwtAuthGuard 已确保 request.user 存在，所以这里不需要额外检查
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const userId = request.user.id
    // 从装饰器获取元数据
    const resourceType = this.reflector.get<string>('resourceType', context.getHandler())
    const resourceIdParam = this.reflector.get<string>('resourceIdParam', context.getHandler())

    // 如果没有标记资源类型，跳过验证
    if (!resourceType || !resourceIdParam) {
      return true
    }
    // 从路由参数或查询参数中获取资源 ID
    const resourceId = this.extractResourceId(request, resourceIdParam)
    if (!resourceId) {
      throw new NotFoundException(`Resource ID parameter '${resourceIdParam}' not found`)
    }
    // 根据资源类型验证所有权
    await this.verifyOwnership(resourceType, resourceId, userId)
    return true
  }

  /**
   * 从请求中提取资源 ID（处理类型转换）
   * @private
   */
  private extractResourceId(request: AuthenticatedRequest, paramName: string): string | null {
    // 先从路由参数中查找
    const paramValue = request.params[paramName]
    if (paramValue && typeof paramValue === 'string') {
      return paramValue
    }
    // 再从查询参数中查找
    const queryValue = request.query[paramName]
    if (queryValue) {
      // query 参数可能是数组，取第一个
      if (Array.isArray(queryValue)) {
        const firstValue = queryValue[0]
        return typeof firstValue === 'string' ? firstValue : null
      }
      // 如果是字符串直接返回
      if (typeof queryValue === 'string') {
        return queryValue
      }
    }

    return null
  }

  /**
   * 根据资源类型分发验证逻辑
   */
  private async verifyOwnership(resourceType: string, resourceId: string, userId: string): Promise<void> {
    switch (resourceType.toLowerCase()) {
      case 'channel':
        await this.verifyChannelOwnership(resourceId, userId)
        break
      case 'timer':
        await this.verifyTimerOwnership(resourceId, userId)
        break
      case 'gateway':
        await this.verifyGatewayOwnership(resourceId, userId)
        break
      default:
        throw new Error(`Unknown resource type: ${resourceType}`)
    }
  }

  /**
   * 验证 Channel 所有权
   * 逻辑：channel.userId === 当前用户ID
   */
  private async verifyChannelOwnership(channelId: string, userId: string): Promise<void> {
    const channel = await this.channelModel.findById(channelId).lean()
    if (!channel) {
      throw new NotFoundException('The Channel does not exist.')
    }
    if (channel.userId?.toString() !== userId) {
      throw new ForbiddenException('You do not have the authority to access this channel.')
    }
  }

  /**
   * 验证 Timer 所有权
   * 逻辑：timer -> gateway -> gateway.userId === 当前用户ID
   */
  private async verifyTimerOwnership(timerId: string, userId: string): Promise<void> {
    const timer = await this.timerModel.findOne({ timerId }).lean()
    if (!timer) {
      throw new NotFoundException('The Timer device does not exist.')
    }
    const gateway = await this.gatewayModel.findOne({ gatewayId: timer.gatewayId }).lean()
    if (!gateway) {
      throw new NotFoundException('The gateway associated with this Timer does not exist.')
    }
    if (gateway.userId?.toString() !== userId) {
      throw new ForbiddenException('You do not have the authority to access this Timer.')
    }
  }

  /**
   * 验证 Gateway 所有权
   * 逻辑：gateway.userId === 当前用户ID
   */
  private async verifyGatewayOwnership(gatewayId: string, userId: string): Promise<void> {
    const gateway = await this.gatewayModel.findOne({ gatewayId }).lean()
    if (!gateway) {
      throw new NotFoundException('The Gateway does not exist.')
    }
    if (gateway.userId?.toString() !== userId) {
      throw new ForbiddenException('You do not have the authority to access this gateway.')
    }
  }
}
