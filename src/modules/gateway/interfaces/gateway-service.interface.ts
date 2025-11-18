import type { UserDocument } from '@/shared/schemas/User'
export interface IGatewayServiceInterface {
  findUserByMacAddress(mac: string): Promise<UserDocument | null>
  disconnectDevice(mac: string): Promise<boolean>
}
