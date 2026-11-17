import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue"
import { message } from "ant-design-vue"
import { createProductAPI, getProductDegreeAPI, getProductPageAPI, updateProductAPI, type ProductSaveInput } from "@/api/product"
import { useColumnSetting, type SettingColumn } from "@/components/columnSetting"
import {
  CAT_TABS,
  EXPORT_FIELDS,
  buildCatalogTree,
  catalogColumns,
  csvCell,
  formatExportCell,
  matchProductTree,
  treeKeyOfRow,
  type CascaderOption,
  type CatalogTreeNode,
  type DegreeStockItem,
  type FilterOption,
  type ProductRow
} from "./productUi"

export type ExportForm = {
  enabled: string
  scoreMin: number | undefined
  scoreMax: number | undefined
  stockLoc: string | undefined
  tag: string | undefined
  supplier: string[]
}

function emptyExportFilters() {
  return Object.fromEntries(EXPORT_FIELDS.map((c) => [c.key, null as (string | number)[] | null]))
}

const QUERY_DEFAULT_KEY = "sg-product-query-default"

function readDefaultQuery() {
  try {
    return localStorage.getItem(QUERY_DEFAULT_KEY) || ""
  } catch {
    return ""
  }
}

export function useProductList() {
  const initialQ = readDefaultQuery()
  const q = ref(initialQ)
  const appliedQ = ref(initialQ)
  const catBrand = ref<string[][]>([])
  const priceMin = ref<number | null>(null)
  const priceMax = ref<number | null>(null)
  const activeCat = ref("all")
  const treeBrand = ref("")
  const treeSeries = ref("")
  const catalogTree = ref<CatalogTreeNode[]>(buildCatalogTree([]))
  const editingId = ref("")

  const tableColFilters = reactive<Record<string, string[] | null>>({})
  const tableColQueries = reactive<Record<string, string>>({})
  const draftColFilters = reactive<Record<string, string[] | null>>({})
  const draftColQueries = reactive<Record<string, string>>({})
  const thFilterOpen = ref("")
  const sortKey = ref("")
  const sortOrder = ref<"" | "asc" | "desc">("")

  const drawerOpen = ref(false)
  const drawerRecord = ref<ProductRow | null>(null)
  const degreeOpen = ref(false)
  const degreeRecord = ref<ProductRow | null>(null)
  const degreeList = ref<DegreeStockItem[]>([])

  const exportOpen = ref(false)
  const exportForm = reactive<ExportForm>({
    enabled: "all",
    scoreMin: undefined,
    scoreMax: undefined,
    stockLoc: undefined,
    tag: undefined,
    supplier: []
  })
  const exportColKeys = ref(EXPORT_FIELDS.map((c) => c.key))
  const exportColFilters = reactive(emptyExportFilters())
  const filterOpenKey = ref("")
  const filterQ = ref("")
  const exportKw = ref("")

  const createOpen = ref(false)
  const creating = ref(false)
  const editSeed = ref<ProductRow | null>(null)
  const editorKey = ref(0)
  const editorViewOnly = ref(false)

  const loading = ref(true)
  const rows = ref<ProductRow[]>([])
  const exportSource = ref<ProductRow[]>([])
  const page = ref(1)
  const pageSize = ref(50)
  const filteredTotal = ref(0)
  const counts = ref<{ catId: string; cat: string; total: number }[]>([])
  const catBrandOptions = ref<CascaderOption[]>([])
  const columnOptions = ref<Record<string, FilterOption[]>>({})
  let loadSeq = 0
  let loadTimer = 0
  let degreeSeq = 0

  const catTabs = computed(() => {
    const totals = new Map(counts.value.map((item) => [item.catId, item.total]))
    return CAT_TABS.map((tab) => ({ ...tab, total: totals.get(tab.catId) ?? 0 }))
  })

  function columnQueryPayload() {
    const prefix = `${activeCat.value}:`
    const columns: Record<string, string[]> = {}
    const columnQueries: Record<string, string> = {}
    for (const [key, value] of Object.entries(tableColFilters)) {
      if (!key.startsWith(prefix) || value == null) continue
      columns[key.slice(prefix.length)] = value
    }
    for (const [key, value] of Object.entries(tableColQueries)) {
      if (!key.startsWith(prefix)) continue
      const text = String(value || "").trim()
      if (text) columnQueries[key.slice(prefix.length)] = text
    }
    return { columns, columnQueries }
  }

  function listQuery(pageNum = page.value, size = pageSize.value) {
    return {
      cat: activeCat.value,
      catalog: true,
      q: appliedQ.value,
      brands: catBrand.value.map((path) => path.slice()),
      priceMin: priceMin.value,
      priceMax: priceMax.value,
      page: pageNum,
      pageSize: size,
      sortKey: sortKey.value,
      sortOrder: sortOrder.value,
      treeBrand: treeBrand.value,
      treeSeries: treeSeries.value,
      ...columnQueryPayload()
    }
  }

  async function load() {
    const seq = ++loadSeq
    loading.value = true
    try {
      const res = await getProductPageAPI(listQuery())
      if (seq !== loadSeq || !res.success) return
      rows.value = res.data.list
      filteredTotal.value = res.data.total
      counts.value = res.data.counts
      catBrandOptions.value = res.data.brandOptions
      columnOptions.value = res.data.columnOptions
      catalogTree.value = res.data.catalogTree
    } finally {
      if (seq === loadSeq) loading.value = false
    }
  }

  function scheduleLoad(resetPage = false) {
    if (resetPage) page.value = 1
    if (loadTimer) window.clearTimeout(loadTimer)
    loadTimer = window.setTimeout(() => {
      loadTimer = 0
      void load()
    }, 280)
  }

  function loadNow(resetPage = false) {
    if (resetPage) page.value = 1
    if (loadTimer) window.clearTimeout(loadTimer)
    loadTimer = 0
    void load()
  }

  watch([appliedQ, activeCat, treeBrand, treeSeries, catBrand, priceMin, priceMax, sortKey, sortOrder], () => scheduleLoad(true))

  onMounted(() => {
    void load()
  })

  onUnmounted(() => {
    if (loadTimer) window.clearTimeout(loadTimer)
    loadSeq += 1
    degreeSeq += 1
  })

  function thKey(colKey: string) {
    return `${activeCat.value}:${colKey}`
  }

  function appliedQuery(colKey: string) {
    return String(tableColQueries[thKey(colKey)] || "").trim()
  }

  function draftQuery(colKey: string) {
    return String(draftColQueries[thKey(colKey)] || "").trim()
  }

  function visibleThOptions(colKey: string) {
    const opts = columnOptions.value[colKey] || []
    const qv = draftQuery(colKey).toLowerCase()
    if (!qv) return opts
    return opts.filter((o) => o.label.toLowerCase().includes(qv) || String(o.value).toLowerCase().includes(qv))
  }

  function isThFilterActive(colKey: string) {
    return !!appliedQuery(colKey) || tableColFilters[thKey(colKey)] != null
  }

  function isThValueOn(colKey: string, val: string) {
    const selected = draftColFilters[thKey(colKey)]
    if (selected == null) return true
    return selected.includes(val)
  }

  function isThFilterAllChecked(colKey: string) {
    const visible = visibleThOptions(colKey)
    if (!visible.length) return false
    return visible.every((o) => isThValueOn(colKey, o.value))
  }

  function isThFilterIndeterminate(colKey: string) {
    const visible = visibleThOptions(colKey)
    if (!visible.length) return false
    const onCount = visible.filter((o) => isThValueOn(colKey, o.value)).length
    return onCount > 0 && onCount < visible.length
  }

  function allThValues(colKey: string) {
    return (columnOptions.value[colKey] || []).map((o) => o.value)
  }

  function sameValueSet(left: string[], right: string[]) {
    if (left.length !== right.length) return false
    const values = new Set(left)
    return right.every((value) => values.has(value))
  }

  function toggleThValue(colKey: string, val: string) {
    const key = thKey(colKey)
    const all = allThValues(colKey)
    const cur = draftColFilters[key] == null ? all.slice() : draftColFilters[key]!.slice()
    const at = cur.indexOf(val)
    if (at >= 0) cur.splice(at, 1)
    else cur.push(val)
    draftColFilters[key] = sameValueSet(cur, all) ? null : cur
  }

  function toggleAllThFilter(colKey: string) {
    const key = thKey(colKey)
    const all = allThValues(colKey)
    const visible = visibleThOptions(colKey).map((o) => o.value)
    const allOn = isThFilterAllChecked(colKey)
    const base = draftColFilters[key] == null ? all.slice() : draftColFilters[key]!.slice()
    const next = allOn ? base.filter((v) => !visible.includes(v)) : [...new Set([...base, ...visible])]
    draftColFilters[key] = sameValueSet(next, all) ? null : next
  }

  function filtersEqual(left: string[] | null | undefined, right: string[] | null | undefined) {
    if (left == null && right == null) return true
    if (left == null || right == null) return false
    return sameValueSet(left, right)
  }

  function applyThFilter(colKey: string) {
    const key = thKey(colKey)
    const nextQuery = draftQuery(colKey)
    const changed = nextQuery !== appliedQuery(colKey) || tableColFilters[key] != null
    draftColFilters[key] = null
    tableColFilters[key] = null
    tableColQueries[key] = nextQuery
    thFilterOpen.value = ""
    if (changed) loadNow(true)
  }

  function resetThFilter(colKey: string) {
    const key = thKey(colKey)
    const changed = tableColFilters[key] != null || !!appliedQuery(colKey) || !!draftQuery(colKey)
    draftColFilters[key] = null
    draftColQueries[key] = ""
    tableColFilters[key] = null
    tableColQueries[key] = ""
    thFilterOpen.value = ""
    if (changed) loadNow(true)
  }

  function toggleSort(colKey: string) {
    if (sortKey.value !== colKey) {
      sortKey.value = colKey
      sortOrder.value = "asc"
      return
    }
    if (sortOrder.value === "asc") {
      sortOrder.value = "desc"
      return
    }
    sortKey.value = ""
    sortOrder.value = ""
  }

  function confirmThFilter(colKey: string) {
    const key = thKey(colKey)
    const nextSelected = draftColFilters[key] == null ? null : draftColFilters[key]!.slice()
    const nextQuery = draftQuery(colKey)
    const changed = !filtersEqual(nextSelected, tableColFilters[key] ?? null) || nextQuery !== appliedQuery(colKey)
    tableColFilters[key] = nextSelected
    tableColQueries[key] = nextQuery
    thFilterOpen.value = ""
    if (changed) loadNow(true)
  }

  function clearThFilter(colKey: string) {
    const key = thKey(colKey)
    const changed = tableColFilters[key] != null || !!appliedQuery(colKey)
    draftColFilters[key] = null
    draftColQueries[key] = ""
    tableColFilters[key] = null
    tableColQueries[key] = ""
    thFilterOpen.value = ""
    if (changed) loadNow(true)
  }

  function onThFilterOpen(colKey: string, open: boolean) {
    const key = thKey(colKey)
    if (open) {
      const applied = tableColFilters[key]
      draftColFilters[key] = applied == null ? null : applied.slice()
      draftColQueries[key] = tableColQueries[key] || ""
      thFilterOpen.value = key
      return
    }
    thFilterOpen.value = ""
  }

  function resetTableColFilters() {
    for (const key of Object.keys(tableColFilters)) tableColFilters[key] = null
    for (const key of Object.keys(tableColQueries)) tableColQueries[key] = ""
    for (const key of Object.keys(draftColFilters)) draftColFilters[key] = null
    for (const key of Object.keys(draftColQueries)) draftColQueries[key] = ""
    thFilterOpen.value = ""
  }

  const tableRows = computed(() => rows.value)

  const columnDefaults: (SettingColumn & { filterable?: boolean })[] = catalogColumns().map((col) => ({
    key: String(col.key),
    title: String(col.key) === "pick" ? "勾选" : String(col.title ?? ""),
    dataIndex: String(col.dataIndex ?? col.key),
    width: Number(col.width || 80),
    ellipsis: col.ellipsis === true,
    align: col.align === "center" || col.align === "right" ? col.align : "left",
    filterable: !!col.filterable
  }))
  const ACTION_COL = {
    key: "action",
    title: "",
    dataIndex: "action",
    width: 56,
    align: "center" as const,
    fixed: "right" as const
  }
  const { columns, tableColumns: baseTableColumns, scrollX: baseScrollX, storageKey } = useColumnSetting("zyb_cols_product", columnDefaults)
  const tableColumns = computed(() => [...baseTableColumns.value, ACTION_COL])
  const scrollX = computed(() => Number(baseScrollX.value || 0) + ACTION_COL.width)

  function onPageChange(nextPage: number, nextSize: number) {
    if (nextSize !== pageSize.value) {
      pageSize.value = nextSize
      page.value = 1
    } else {
      page.value = nextPage
    }
    loadNow()
  }

  function search() {
    appliedQ.value = q.value.trim()
  }

  function openCreate() {
    editingId.value = ""
    editSeed.value = null
    editorViewOnly.value = false
    editorKey.value += 1
    createOpen.value = true
  }

  function openCopy(record: ProductRow) {
    editingId.value = ""
    editSeed.value = record
    editorViewOnly.value = false
    editorKey.value += 1
    createOpen.value = true
  }

  function openEdit(record: ProductRow) {
    editingId.value = record.id
    editSeed.value = record
    editorViewOnly.value = false
    editorKey.value += 1
    createOpen.value = true
  }

  function markEditorFresh() {
    editingId.value = ""
  }

  function closeCreate() {
    createOpen.value = false
    editorViewOnly.value = false
  }

  async function submitSave(input: ProductSaveInput, sync = false) {
    const editing = editingId.value
    creating.value = true
    try {
      const res = editing
        ? await updateProductAPI({ id: editing, ...input })
        : await createProductAPI(input)
      if (!res.success) {
        message.error(res.message || (editing ? "保存失败" : "新增失败"))
        return
      }
      message.success(sync ? "已保存并同步至 GSS" : editing ? "已保存商品" : "已新增商品")
      createOpen.value = false
      editorViewOnly.value = false
      if (!editing && !matchProductTree(res.data, activeCat.value)) {
        activeCat.value = treeKeyOfRow(res.data)
        treeBrand.value = ""
        treeSeries.value = ""
      } else if (treeBrand.value && res.data.brand !== treeBrand.value) {
        treeBrand.value = ""
        treeSeries.value = ""
      } else if (treeSeries.value && res.data.series !== treeSeries.value) {
        treeSeries.value = ""
      }
      q.value = input.name.trim()
      appliedQ.value = q.value
      editingId.value = ""
      editSeed.value = null
    } finally {
      creating.value = false
    }
  }

  function reload() {
    loadNow()
  }

  function reset() {
    q.value = ""
    appliedQ.value = ""
    catBrand.value = []
    priceMin.value = null
    priceMax.value = null
    sortKey.value = ""
    sortOrder.value = ""
    resetTableColFilters()
    loadNow(true)
  }

  function selectTree(node: { cat: string; brand?: string; series?: string }) {
    activeCat.value = node.cat || "all"
    treeBrand.value = node.brand || ""
    treeSeries.value = node.series || ""
    catBrand.value = []
    resetTableColFilters()
  }

  function onTabChange(key: string) {
    selectTree({ cat: key })
  }

  function openDetail(record: ProductRow) {
    editingId.value = record.id
    editSeed.value = record
    editorViewOnly.value = true
    editorKey.value += 1
    createOpen.value = true
  }

  function closeDetail() {
    drawerOpen.value = false
  }

  function openDegree(record: ProductRow) {
    const seq = ++degreeSeq
    degreeRecord.value = record
    void getProductDegreeAPI(record.id).then((res) => {
      if (seq !== degreeSeq || !res.success) return
      degreeList.value = res.data
      degreeOpen.value = true
    })
  }

  function closeDegree() {
    degreeSeq += 1
    degreeOpen.value = false
  }

  const exportAllChecked = computed(() => exportColKeys.value.length === EXPORT_FIELDS.length)
  const exportIndeterminate = computed(() => exportColKeys.value.length > 0 && !exportAllChecked.value)

  function optionValue(record: ProductRow, col: { dataIndex: string }) {
    const v = record[col.dataIndex as keyof ProductRow]
    if (v == null || v === "") return "__empty__"
    return v
  }

  function optionLabel(record: ProductRow, col: { key: string; dataIndex: string }) {
    if (col.key === "index" && (record.index === "—" || !record.index)) return "无折射率"
    const text = formatExportCell(record, col)
    if (!text) return "空"
    return String(text)
  }

  const colFilterOptionMap = computed(() => {
    const out: Record<string, FilterOption[]> = {}
    for (const col of EXPORT_FIELDS) {
      const map = new Map<string, string>()
      for (const r of exportSource.value) {
        const val = String(optionValue(r, col))
        if (!map.has(val)) map.set(val, optionLabel(r, col))
      }
      out[col.key] = [...map.entries()]
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => {
          if (a.value === "__empty__" || a.label === "无折射率" || a.label === "空") return 1
          if (b.value === "__empty__" || b.label === "无折射率" || b.label === "空") return -1
          return a.label.localeCompare(b.label, "zh", { numeric: true })
        })
    }
    return out
  })

  const exportFiltered = computed(() => {
    const f = exportForm
    const min = f.scoreMin == null ? null : Number(f.scoreMin)
    const max = f.scoreMax == null ? null : Number(f.scoreMax)
    const kw = exportKw.value.trim().toLowerCase()
    return exportSource.value.filter((r) => {
      if (kw) {
        const blob = `${r.name} ${r.brand} ${r.cat} ${r.model} ${r.spec} ${r.series} ${r.index} ${r.price}`.toLowerCase()
        if (!blob.includes(kw)) return false
      }
      for (const col of EXPORT_FIELDS) {
        const selected = exportColFilters[col.key]
        if (selected == null) continue
        if (!selected.map(String).includes(String(optionValue(r, col)))) return false
      }
      if (f.enabled === "1" && !r.enabled) return false
      if (f.enabled === "0" && r.enabled) return false
      if (min != null && !Number.isNaN(min) && Number(r.score) < min) return false
      if (max != null && !Number.isNaN(max) && Number(r.score) > max) return false
      if (f.stockLoc && r.stockLoc !== f.stockLoc) return false
      if (f.tag && !(r.tags || []).includes(f.tag)) return false
      if (f.supplier?.length && !f.supplier.includes(r.supplier)) return false
      return true
    })
  })

  const exportPreviewRows = computed(() => exportFiltered.value.slice(0, 8))
  const hasAnyColFilter = computed(() => EXPORT_FIELDS.some((c) => exportColFilters[c.key] != null) || !!exportKw.value)

  function visibleFilterOptions(key: string) {
    const opts = colFilterOptionMap.value[key] || []
    if (filterOpenKey.value !== key) return opts
    const query = filterQ.value.trim().toLowerCase()
    if (!query) return opts
    return opts.filter((o) => o.label.toLowerCase().includes(query) || String(o.value).toLowerCase().includes(query))
  }

  function isColFilterActive(key: string) {
    return exportColFilters[key] != null
  }

  function isColFilterAllChecked(key: string) {
    return exportColFilters[key] == null
  }

  function isColFilterIndeterminate(key: string) {
    return Array.isArray(exportColFilters[key]) && exportColFilters[key]!.length > 0
  }

  function isFilterValueOn(key: string, val: string) {
    if (exportColFilters[key] == null) return true
    return exportColFilters[key]!.map(String).includes(val)
  }

  function allFilterValues(key: string) {
    return (colFilterOptionMap.value[key] || []).map((o) => o.value)
  }

  function toggleFilterValue(key: string, val: string) {
    const all = allFilterValues(key)
    const cur = exportColFilters[key] == null ? all.slice() : exportColFilters[key]!.slice()
    const at = cur.map(String).indexOf(val)
    if (at >= 0) cur.splice(at, 1)
    else cur.push(val)
    exportColFilters[key] = cur.length === all.length ? null : cur
  }

  function toggleAllColFilter(key: string) {
    exportColFilters[key] = exportColFilters[key] == null ? [] : null
  }

  function clearColFilter(key: string) {
    exportColFilters[key] = null
    filterQ.value = ""
    filterOpenKey.value = ""
  }

  function clearAllColFilters() {
    for (const col of EXPORT_FIELDS) exportColFilters[col.key] = null
    exportKw.value = ""
    filterQ.value = ""
    filterOpenKey.value = ""
  }

  function setColFilterValues(key: string, values: string[]) {
    const uniq = [...new Set(values)].filter(Boolean)
    if (!uniq.length) {
      exportColFilters[key] = null
      return
    }
    const all = allFilterValues(key)
    const hit = uniq.filter((v) => all.includes(v))
    exportColFilters[key] = !hit.length || hit.length === all.length ? null : hit
  }

  function syncListFiltersToExport() {
    for (const col of EXPORT_FIELDS) exportColFilters[col.key] = null
    exportKw.value = appliedQ.value.trim()
    const paths = catBrand.value || []
    if (paths.length) {
      setColFilterValues("brand", paths.map((p) => p[0]).filter((v): v is string => !!v))
      setColFilterValues("series", paths.map((p) => p[1]).filter((v): v is string => !!v))
    }
  }

  function onFilterOpenChange(key: string, open: boolean) {
    filterOpenKey.value = open ? key : ""
    if (open) filterQ.value = ""
  }

  function isExportColOn(key: string) {
    return exportColKeys.value.includes(key)
  }

  function toggleExportCol(key: string) {
    const on = new Set(exportColKeys.value)
    if (on.has(key)) on.delete(key)
    else on.add(key)
    exportColKeys.value = EXPORT_FIELDS.map((c) => c.key).filter((k) => on.has(k))
  }

  function toggleAllExportCols() {
    exportColKeys.value = exportAllChecked.value ? [] : EXPORT_FIELDS.map((c) => c.key)
  }

  function openExport() {
    syncListFiltersToExport()
    if (!exportColKeys.value.length) exportColKeys.value = EXPORT_FIELDS.map((c) => c.key)
    exportOpen.value = true
    void getProductPageAPI(listQuery(1, Math.max(filteredTotal.value, 1))).then((res) => {
      if (res.success) exportSource.value = res.data.list
    })
  }

  function closeExport() {
    exportOpen.value = false
  }

  function exportList() {
    const cols = EXPORT_FIELDS.filter((c) => exportColKeys.value.includes(c.key))
    if (!cols.length) {
      message.warning("请至少勾选一列")
      return Promise.reject()
    }
    const list = exportFiltered.value.slice()
    if (!list.length) {
      message.warning("没有符合条件的商品")
      return Promise.reject()
    }
    const lines = [cols.map((c) => c.title).join(",")]
    for (const r of list) lines.push(cols.map((c) => csvCell(formatExportCell(r, c))).join(","))
    const blob = new Blob([`\uFEFF${lines.join("\n")}`], { type: "text/csv;charset=utf-8;" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `产品资料_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
    exportOpen.value = false
    message.success(`已导出 ${list.length} 条`)
  }

  return {
    q,
    catBrand,
    catBrandOptions,
    priceMin,
    priceMax,
    activeCat,
    treeBrand,
    treeSeries,
    catalogTree,
    selectTree,
    catTabs,
    page,
    pageSize,
    filteredTotal,
    onPageChange,
    columns,
    tableColumns,
    columnStorageKey: storageKey,
    tableRows,
    loading,
    scrollX,
    draftColQueries,
    thFilterOpen,
    thKey,
    sortKey,
    sortOrder,
    toggleSort,
    applyThFilter,
    resetThFilter,
    visibleThOptions,
    isThFilterActive,
    isThFilterAllChecked,
    isThFilterIndeterminate,
    isThValueOn,
    search,
    reset,
    openCreate,
    closeCreate,
    submitSave,
    createOpen,
    editorViewOnly,
    creating,
    editSeed,
    editorKey,
    markEditorFresh,
    editingId,
    openCopy,
    openEdit,
    reload,
    onTabChange,
    onThFilterOpen,
    toggleThValue,
    toggleAllThFilter,
    confirmThFilter,
    clearThFilter,
    drawerOpen,
    drawerRecord,
    openDetail,
    closeDetail,
    degreeOpen,
    degreeRecord,
    degreeList,
    openDegree,
    closeDegree,
    exportOpen,
    exportForm,
    exportColKeys,
    exportAllChecked,
    exportIndeterminate,
    exportPreviewRows,
    exportFiltered,
    exportKw,
    hasAnyColFilter,
    filterOpenKey,
    filterQ,
    openExport,
    closeExport,
    exportList,
    isExportColOn,
    toggleExportCol,
    toggleAllExportCols,
    visibleFilterOptions,
    isColFilterActive,
    isColFilterAllChecked,
    isColFilterIndeterminate,
    isFilterValueOn,
    onFilterOpenChange,
    toggleFilterValue,
    toggleAllColFilter,
    clearColFilter,
    clearAllColFilters
  }
}
