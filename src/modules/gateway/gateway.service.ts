import { Injectable } from '@nestjs/common'
import Gateway from './schema/HanqiGateway.schema'
import User from '@/shared/schemas/User'
import type { UserDocument } from '@/shared/schemas/User'
import { IGatewayServiceInterface } from './interfaces/gateway-service.interface'
import { DeviceConnectionStatus } from '@/shared/constants/mqtt.constants'

@Injectable()
export class GatewayService implements IGatewayServiceInterface {
  constructor() {}
  async findUserByMacAddress(mac: string): Promise<UserDocument | null> {
    const gateway = await Gateway.findOne({ mac_address: mac })
    if (!gateway) return null
    const user = await User.findById(gateway.userId)
    if (!user) return null

    gateway.is_connected = DeviceConnectionStatus.CONNECTED
    await gateway.save()
    return user
  }

  async disconnectDevice(mac: string): Promise<boolean> {
    const gateway = await Gateway.findOne({ mac_address: mac })
    if (!gateway) return false
    gateway.is_connected = DeviceConnectionStatus.DISCONNECTED
    await gateway.save()
    return true
  }
}
