import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { OwnershipGuard } from '@/common/guards/ownership.guard'
import { Channel, ChannelSchema } from '@/modules/channel/schema/channel.schema'
import { Timer, TimerSchema } from '@/modules/timer/schema/timer.schema'
import { Gateway, GatewaySchema } from '@/modules/gateway/schema/HanqiGateway.schema'

/**
 * 安全模块（非全局）
 *
 * 设计理念：
 * - 不使用 @Global() 装饰器，保持依赖显式
 * - 需要使用 OwnershipGuard 的模块显式导入此模块
 * - 集中管理权限验证相关的依赖
 *
 * 为什么不用 @Global()？
 * 1. NestJS 官方推荐：显式依赖优于隐式依赖
 * 2. 更好的测试性：依赖关系清晰
 * 3. 避免循环依赖问题
 * 4. 符合模块化设计原则
 *
 * 使用方式：
 * ```typescript
 * @Module({
 *   imports: [SecurityModule],  // 显式导入
 *   controllers: [ChannelController],
 * })
 * export class ChannelModule {}
 * ```
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Channel.name, schema: ChannelSchema },
      { name: Timer.name, schema: TimerSchema },
      { name: Gateway.name, schema: GatewaySchema },
    ]),
  ],
  providers: [OwnershipGuard],
  exports: [
    OwnershipGuard,
    MongooseModule, // 必须导出 MongooseModule，让其他模块可以访问这些 Models
  ],
})
export class SecurityModule {}
