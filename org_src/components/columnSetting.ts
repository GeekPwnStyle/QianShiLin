import { computed, ref } from "vue"

/** 传给设置列的列。多出来的字段会原样交给表格，比如 align、sorter */
export interface SettingColumn {
  key: string
  title: string
  dataIndex?: string
  width?: number
  visible?: boolean
  ellipsis?: boolean
  fixed?: "left" | "right"
  align?: "left" | "center" | "right"
}

export function cloneColumns(list: SettingColumn[]): SettingColumn[] {
  return list.map((item) => ({ ...item }))
}

export function normalizeColumns(list: SettingColumn[]): SettingColumn[] {
  return list.map((item) => ({
    ...item,
    dataIndex: item.dataIndex ?? item.key,
    width: item.width && item.width > 0 ? item.width : 120,
    visible: item.visible !== false
  }))
}

/** 按上次保存的顺序、显隐和列宽还原；新增列插回默认位置 */
export function loadColumnSetting(storageKey: string, defaults: SettingColumn[]): SettingColumn[] {
  const base = normalizeColumns(defaults)
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey) || "null") as
      | { key?: string; width?: number; visible?: boolean }[]
      | null
    if (!Array.isArray(raw)) return base
    const map = new Map(base.map((item) => [item.key, item]))
    const next: SettingColumn[] = []
    for (const item of raw) {
      if (!item?.key) continue
      const found = map.get(item.key)
      if (!found) continue
      const width = Number(item.width)
      if (width > 0) found.width = width
      found.visible = item.visible !== false
      next.push(found)
      map.delete(item.key)
    }
    base.forEach((item, index) => {
      if (!map.has(item.key)) return
      let insertAt = next.length
      for (let i = index - 1; i >= 0; i -= 1) {
        const prev = next.findIndex((col) => col.key === base[i].key)
        if (prev >= 0) {
          insertAt = prev + 1
          break
        }
      }
      next.splice(insertAt, 0, item)
    })
    return next
  } catch {
    return base
  }
}

export function saveColumnSetting(storageKey: string, columns: SettingColumn[]) {
  localStorage.setItem(
    storageKey,
    JSON.stringify(columns.map(({ key, width, visible }) => ({ key, width, visible })))
  )
}

export function toTableColumns(columns: SettingColumn[]) {
  return columns
    .filter((item) => item.visible !== false)
    .map(({ visible: _visible, ...column }) => column)
}

/**
 * 列表页共用的表头状态。
 * 页面里配合 ColumnSetting 使用，并把 tableColumns、scrollX 传给 a-table。
 */
export function useColumnSetting(storageKey: string, defaults: SettingColumn[]) {
  const columnDefaults = normalizeColumns(defaults)
  const columns = ref(loadColumnSetting(storageKey, columnDefaults))
  const tableColumns = computed(() => toTableColumns(columns.value))
  const scrollX = computed(() => tableColumns.value.reduce((sum, item) => sum + Number(item.width ?? 0), 0))
  return { columns, tableColumns, scrollX, storageKey, columnDefaults }
}
