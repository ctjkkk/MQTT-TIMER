/**
 * 数据同步表配置（TIMER-MQTT 端）
 *
 * 配置说明：
 * - tableName: 主后端的表名（必须与主后端一致）
 * - topic: MQTT 主题（必须与主后端一致）
 * - localCollection: 本地集合名称（可以自定义）
 * - fields: 需要接收的字段（可以是主后端 fields 的子集）
 * - keyField: 主键字段，默认为 _id
 *
 * 重要：
 * - tableName 和 topic 必须与主后端配置完全一致
 * - fields 可以少于主后端，但不能包含主后端没有的字段
 */

export interface SyncTableConfig {
  tableName: string // 源表名（与主后端一致）
  topic: string // MQTT 主题（与主后端一致）
  localCollection: string // 本地集合名
  fields: string[] // 需要接收的字段
  keyField?: string // 主键字段
}
/**
 * 配置需要接收的表
 */
export const SYNC_TABLES: SyncTableConfig[] = [
  {
    tableName: 'users',
    topic: 'sync/users',
    localCollection: 'users_cache',
    fields: [
      '_id',
      'name',
      'phone',
      'email',
      'image',
      'lat',
      'lng',
      'is_deleted',
      'role',
      'utc_offset_minutes',
      'city',
      'state',
      'status',
    ],
    keyField: '_id',
  },
  {
    tableName: 'roles',
    topic: 'sync/roles',
    localCollection: 'roles_cache',
    fields: ['_id', 'name', 'role', 'status'],
    keyField: '_id',
  },
  // 后期添加新表，确保与主后端配置对应
]
/**
 * 获取指定表的本地配置
 */
export function getLocalSyncConfig(tableName: string): SyncTableConfig | undefined {
  return SYNC_TABLES.find(config => config.tableName === tableName)
}
