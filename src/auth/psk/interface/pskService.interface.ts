export interface IPskServiceInterface {
  generatePsk(macAddress: string)
  confirmPsk(macAddress: string)
  exists(identity: string): boolean
  isActive(identity: string): boolean
}
