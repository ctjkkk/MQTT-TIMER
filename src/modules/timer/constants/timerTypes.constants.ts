import { SubDeviceType } from '../interface/timer.interface'

/**
 * 所有可用的子设备类型
 */
export const SUB_DEVICE_TYPES: SubDeviceType[] = [
  {
    type: 'valve_single',
    outletCount: 1,
    name: '单出水口水阀',
    image: '',
  },
  {
    type: 'valve_dual',
    outletCount: 2,
    name: '双出水口水阀',
    image: '',
  },
  {
    type: 'valve_triple',
    outletCount: 3,
    name: '三出水口水阀',
    image: '',
  },
  {
    type: 'valve_quad',
    outletCount: 4,
    name: '四出水口水阀',
    image: '',
  },
]
