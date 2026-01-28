import { SubDeviceTypeResponseDto } from '../dto/http-response.dto'

/**
 * 所有可用的子设备类型
 */
export const SUB_DEVICE_TYPES: SubDeviceTypeResponseDto[] = [
  {
    type: 'valve_single',
    outletCount: 1,
    name: 'One-way Hose timer',
    image: '/images/timer/valve-single.png',
  },
  {
    type: 'valve_dual',
    outletCount: 2,
    name: 'Two-way Hose timer',
    image: '/images/timer/valve_dual.png',
  },
  {
    type: 'valve_triple',
    outletCount: 3,
    name: 'Three-way Hose timer',
    image: '/images/timer/valve_triple.png',
  },
  {
    type: 'valve_quad',
    outletCount: 4,
    name: 'Four-way Hose timer',
    image: '/images/timer/valve_quad.png',
  },
]
