import { SyncTableConfig } from '@/config/syncTables.config'
// 过滤掉数据同步时主后端传输过来的不需要的字段
export function filterFields(data: Record<string, any>, config: SyncTableConfig): Record<string, any> {
  const filtered: Record<string, any> = {}
  const allowedFields = new Set(config.fields)
  for (const key in data) {
    if (allowedFields.has(key)) {
      filtered[key] = data[key]
    }
  }
  return filtered
}
