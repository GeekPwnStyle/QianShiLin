<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from "vue"
import { DeleteOutlined, EditOutlined, EllipsisOutlined, ExclamationCircleFilled, FilterOutlined, HolderOutlined, PlusOutlined, QuestionCircleOutlined, SearchOutlined, UploadOutlined } from "@ant-design/icons-vue"
import { Modal, message } from "ant-design-vue"
import { getProductPageAPI } from "@/api/product"
import { tablePageSizeOptions, tableShowTotal } from "@/components/tablePagination"
import ColumnSetting from "@/components/ColumnSetting.vue"
import { useColumnSetting, type SettingColumn } from "@/components/columnSetting"
import type { ProductRow } from "@/views/product/productUi"
import {
  addMallGoodsIds,
  getMallGoodsIds,
  getMallGoodsMeta,
  removeMallGoodsIds,
  setMallPrice,
  setMallPromoPrice,
  setMallImage,
  setMallShelfOn,
  setPointsToRedeem,
  setPointsCash,
  setShelfOnAt,
  setShelfOffAt,
  getMallSeriesOrder,
  setMallSeriesOrder
} from "./mallGoodsStore"

const loading = ref(false)
const allProducts = ref<ProductRow[]>([])
const mallIds = ref<string[]>(getMallGoodsIds())
const q = ref("")
const page = ref(1)
const pageSize = ref(20)
const selectedKeys = ref<string[]>([])
const currentRowKey = ref("")
const rowMenuOpenKey = ref("")
const removePopKey = ref("")
const shelfOnAtPopKey = ref("")
const shelfOffAtPopKey = ref("")
const scheduleDraft = ref<string | undefined>(undefined)
const priceEditKey = ref("")
const priceEditKind = ref<"orig" | "promo" | "points" | "cash" | "">("")
const priceInputRef = ref<{ focus?: () => void } | null>(null)
const imageFileInputRef = ref<HTMLInputElement | null>(null)
const imageUploadTargetId = ref("")
const metaTick = ref(0)
const priceModalOpen = ref(false)
const priceModalLoading = ref(false)
const priceDraft = ref<number | undefined>(undefined)
const promoDraft = ref<number | undefined>(undefined)
const priceTargetId = ref("")
const priceBatchIds = ref<string[]>([])
const priceTargetName = ref("")
const scheduleModalOpen = ref(false)
const scheduleModalLoading = ref(false)
const scheduleModalKind = ref<"on" | "off">("on")
const previewOpen = ref(false)
const previewRow = ref<ProductRow | null>(null)
const scheduleBatchIds = ref<string[]>([])
const scheduleTargetName = ref("")

function refreshMeta() {
  metaTick.value += 1
}

function mallMeta(id: string) {
  void metaTick.value
  return getMallGoodsMeta(id)
}

function isShelfOn(id: string) {
  return mallMeta(id).shelfOn !== false
}

function mallPriceOf(id: string) {
  const v = mallMeta(id).mallPrice
  if (v != null && !Number.isNaN(Number(v))) return Number(v)
  const row = allProducts.value.find((r) => r.id === id)
  if (!row) return null
  const n = Number(row.price)
  return Number.isNaN(n) ? null : n
}

function asMallRow(row: ProductRow | Record<string, any>): ProductRow {
  return row as ProductRow
}

function productImageOf(row: ProductRow | Record<string, any>) {
  const r = asMallRow(row)
  const override = mallMeta(r.id).mallImage
  if (override) return String(override)
  const list = r.images
  if (!Array.isArray(list) || !list.length) return ""
  return String(list[0] || "").trim()
}

function pickProductImage(row: ProductRow | Record<string, any>) {
  currentRowKey.value = row.id
  imageUploadTargetId.value = row.id
  const el = imageFileInputRef.value
  if (!el) return
  el.value = ""
  el.click()
}

function onProductImageFileChange(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files && input.files[0]
  const id = imageUploadTargetId.value
  if (!file || !id) return
  if (!String(file.type || "").startsWith("image/")) {
    message.warning("请选择图片文件")
    return
  }
  if (file.size > 1.5 * 1024 * 1024) {
    message.warning("图片请小于 1.5MB")
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    const url = String(reader.result || "")
    if (!url) {
      message.warning("读取图片失败")
      return
    }
    setMallImage(id, url)
    refreshMeta()
    message.success("商品图片已更新")
  }
  reader.onerror = () => message.warning("读取图片失败")
  reader.readAsDataURL(file)
}

function formatMallPrice(id: string) {
  const v = mallPriceOf(id)
  return v == null ? "—" : v.toFixed(2)
}

function mallPromoPriceOf(id: string) {
  const v = mallMeta(id).mallPromoPrice
  if (v == null || Number.isNaN(Number(v))) return null
  return Number(v)
}

function formatMallPromoPrice(id: string) {
  const v = mallPromoPriceOf(id)
  return v == null ? "—" : v.toFixed(2)
}

function pointsToRedeemOf(id: string) {
  const v = mallMeta(id).pointsToRedeem
  if (v == null || Number.isNaN(Number(v))) return null
  return Number(v)
}

function pointsCashOf(id: string) {
  const v = mallMeta(id).pointsCash
  if (v == null || Number.isNaN(Number(v))) return null
  return Number(v)
}

function formatPointsCash(id: string) {
  const v = pointsCashOf(id)
  return v == null ? "—" : v.toFixed(2)
}

function shelfOnAtOf(id: string) {
  const v = mallMeta(id).shelfOnAt
  return v ? String(v) : undefined
}

function shelfOffAtOf(id: string) {
  const v = mallMeta(id).shelfOffAt
  return v ? String(v) : undefined
}

function formatShelfAt(id: string, kind: "on" | "off") {
  const v = kind === "on" ? shelfOnAtOf(id) : shelfOffAtOf(id)
  return v || "—"
}

function clearRowActionPops() {
  removePopKey.value = ""
  shelfOnAtPopKey.value = ""
  shelfOffAtPopKey.value = ""
}

function rowActionPopOpen(id: string) {
  return (
    removePopKey.value === id ||
    shelfOnAtPopKey.value === id ||
    shelfOffAtPopKey.value === id
  )
}

function popupToBody() {
  return document.body
}

function isSchedulePop(id: string) {
  return shelfOnAtPopKey.value === id || shelfOffAtPopKey.value === id
}

function rowPopOverlayClass(id: string) {
  return isSchedulePop(id) ? "sg-del-pop sg-schedule-pop" : "sg-del-pop"
}


type MallColumn = SettingColumn & {
  filterable?: boolean
}

const tableColQueries = reactive<Record<string, string>>({})
const draftColQueries = reactive<Record<string, string>>({})
const thFilterOpen = ref("")
const pickerColQueries = reactive<Record<string, string>>({})
const pickerDraftColQueries = reactive<Record<string, string>>({})
const pickerThFilterOpen = ref("")

/** 品类多选：null=不过滤；string[]=所选值（空串用 __empty__） */
const mainCatFilter = ref<string[] | null>(null)
const pickerCatFilter = ref<string[] | null>(null)
const draftCatValues = ref<string[] | null>(null)

function catOptionRows(scope: "main" | "picker") {
  return scope === "main" ? mallRows.value : pickerSource.value
}

function catFilterOptions(scope: "main" | "picker") {
  const map = new Map<string, string>()
  for (const row of catOptionRows(scope)) {
    const raw = String(row.cat || "").trim()
    const value = raw || "__empty__"
    if (!map.has(value)) map.set(value, raw || "(空白)")
  }
  return [...map.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "zh", { numeric: true }))
}

function appliedCatFilter(scope: "main" | "picker") {
  return scope === "main" ? mainCatFilter.value : pickerCatFilter.value
}

function isCatFilterActive(scope: "main" | "picker") {
  return appliedCatFilter(scope) != null
}

function matchCatFilter(row: ProductRow, scope: "main" | "picker") {
  const selected = appliedCatFilter(scope)
  if (selected == null) return true
  const raw = String(row.cat || "").trim()
  const value = raw || "__empty__"
  return selected.map(String).includes(value)
}

function isDraftCatValueOn(val: string) {
  if (draftCatValues.value == null) return true
  return draftCatValues.value.map(String).includes(val)
}


function toggleDraftCatValue(scope: "main" | "picker", val: string) {
  const all = catFilterOptions(scope).map((o) => o.value)
  const cur = draftCatValues.value == null ? all.slice() : draftCatValues.value.slice()
  const at = cur.map(String).indexOf(val)
  if (at >= 0) cur.splice(at, 1)
  else cur.push(val)
  draftCatValues.value = cur.length === all.length ? null : cur
}

function confirmCatFilter(scope: "main" | "picker") {
  const next = draftCatValues.value == null ? null : draftCatValues.value.slice()
  if (scope === "main") {
    mainCatFilter.value = next
    thFilterOpen.value = ""
    page.value = 1
    selectedKeys.value = []
  } else {
    pickerCatFilter.value = next
    pickerThFilterOpen.value = ""
    pickerPage.value = 1
  }
}

function cancelCatFilter(scope: "main" | "picker") {
  if (scope === "main") thFilterOpen.value = ""
  else pickerThFilterOpen.value = ""
}

function thKey(scope: "main" | "picker", colKey: string) {
  return `${scope}:${colKey}`
}

function cellText(row: ProductRow, colKey: string) {
  if (colKey === "price") return Number(row.price || 0).toFixed(2)
  if (colKey === "mallPrice") {
    const v = mallPriceOf(row.id)
    return v == null ? "" : v.toFixed(2)
  }
  if (colKey === "pointsCombo") {
    const pts = pointsToRedeemOf(row.id)
    const cash = pointsCashOf(row.id)
    const a = pts == null ? "" : String(pts)
    const b = cash == null ? "" : cash.toFixed(2)
    return [a, b].filter(Boolean).join(" ")
  }
  if (colKey === "shelfOn") return isShelfOn(row.id) ? "上架" : "下架"
  const value = (row as Record<string, unknown>)[colKey]
  return value == null ? "" : String(value)
}

function matchColQueries(row: ProductRow, queries: Record<string, string>, scope: "main" | "picker") {
  const prefix = `${scope}:`
  for (const [key, raw] of Object.entries(queries)) {
    if (!key.startsWith(prefix)) continue
    const text = String(raw || "").trim().toLowerCase()
    if (!text) continue
    const colKey = key.slice(prefix.length)
    if (!cellText(row, colKey).toLowerCase().includes(text)) return false
  }
  return true
}

function isThFilterActive(scope: "main" | "picker", colKey: string) {
  if (colKey === "cat") return isCatFilterActive(scope)
  const queries = scope === "main" ? tableColQueries : pickerColQueries
  return !!String(queries[thKey(scope, colKey)] || "").trim()
}

function onThFilterOpen(scope: "main" | "picker", colKey: string, open: boolean) {
  const key = thKey(scope, colKey)
  const applied = scope === "main" ? tableColQueries : pickerColQueries
  const draft = scope === "main" ? draftColQueries : pickerDraftColQueries
  if (open) {
    if (colKey === "cat") {
      const cur = appliedCatFilter(scope)
      draftCatValues.value = cur == null ? null : cur.slice()
    } else {
      draft[key] = applied[key] || ""
    }
    if (scope === "main") thFilterOpen.value = key
    else pickerThFilterOpen.value = key
    return
  }
  if (scope === "main") thFilterOpen.value = ""
  else pickerThFilterOpen.value = ""
}

function applyThFilter(scope: "main" | "picker", colKey: string) {
  const key = thKey(scope, colKey)
  const draft = scope === "main" ? draftColQueries : pickerDraftColQueries
  const applied = scope === "main" ? tableColQueries : pickerColQueries
  applied[key] = String(draft[key] || "").trim()
  if (scope === "main") {
    thFilterOpen.value = ""
    page.value = 1
    selectedKeys.value = []
  } else {
    pickerThFilterOpen.value = ""
    pickerPage.value = 1
  }
}

function resetThFilter(scope: "main" | "picker", colKey: string) {
  const key = thKey(scope, colKey)
  const draft = scope === "main" ? draftColQueries : pickerDraftColQueries
  const applied = scope === "main" ? tableColQueries : pickerColQueries
  draft[key] = ""
  applied[key] = ""
  if (scope === "main") {
    thFilterOpen.value = ""
    page.value = 1
    selectedKeys.value = []
  } else {
    pickerThFilterOpen.value = ""
    pickerPage.value = 1
  }
}

function clearScopeQueries(scope: "main" | "picker") {
  const prefix = `${scope}:`
  const applied = scope === "main" ? tableColQueries : pickerColQueries
  const draft = scope === "main" ? draftColQueries : pickerDraftColQueries
  for (const key of Object.keys(applied)) {
    if (key.startsWith(prefix)) applied[key] = ""
  }
  for (const key of Object.keys(draft)) {
    if (key.startsWith(prefix)) draft[key] = ""
  }
  if (scope === "main") {
    mainCatFilter.value = null
    thFilterOpen.value = ""
  } else {
    pickerCatFilter.value = null
    pickerThFilterOpen.value = ""
  }
}

const pickerOpen = ref(false)
const pickerLoading = ref(false)
const pickerQ = ref("")

const pickerSelected = ref<string[]>([])
const pickerPage = ref(1)
const pickerPageSize = ref(10)
const seriesOrderOpen = ref(false)
const seriesOrderDraft = ref<string[]>([])
const seriesDragName = ref("")
const seriesDragOver = ref("")

async function loadCatalog(silent = false) {
  if (!silent) loading.value = true
  try {
    const res = await getProductPageAPI({
      cat: "all",
      catalog: true,
      page: 1,
      pageSize: 9999
    })
    allProducts.value = res.data.list
  } finally {
    if (!silent) loading.value = false
  }
}

function refreshMallIds() {
  mallIds.value = getMallGoodsIds()
}

const productById = computed(() => {
  const map = new Map<string, ProductRow>()
  for (const row of allProducts.value) map.set(row.id, row)
  return map
})

const mallRows = computed(() => {
  const rows: ProductRow[] = []
  for (const id of mallIds.value) {
    const row = productById.value.get(id)
    if (row) rows.push(row)
  }
  return rows
})

const filteredRows = computed(() => {
  const keyword = q.value.trim().toLowerCase()
  return mallRows.value.filter((row) => {
    if (keyword) {
      const blob = [row.cat, row.brand, row.sku, row.name, row.series, row.model, row.attr, row.spec]
        .join(" ")
        .toLowerCase()
      if (!blob.includes(keyword)) return false
    }
    if (!matchCatFilter(row, "main")) return false
    return matchColQueries(row, tableColQueries, "main")
  })
})

const pagedRows = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredRows.value.slice(start, start + pageSize.value)
})

watch([q, () => filteredRows.value.length], () => {
  page.value = 1
  selectedKeys.value = []
})

const SEQ_COL: MallColumn = { title: "序号", key: "seq", width: 58, align: "center" as const }
const ACTION_COL: MallColumn = {
  title: "",
  key: "action",
  dataIndex: "action",
  width: 64,
  fixed: "right" as const,
  align: "center" as const
}

const mallColumnDefaults: MallColumn[] = [
  { title: "品类", dataIndex: "cat", key: "cat", width: 88, ellipsis: true, filterable: true },
  { title: "产品图片", key: "productImage", width: 72, align: "center" as const },
  { title: "产品名称", dataIndex: "name", key: "name", width: 220, ellipsis: true, filterable: true },
  { title: "品牌", dataIndex: "brand", key: "brand", width: 100, ellipsis: true, filterable: true },
  { title: "系列", dataIndex: "series", key: "series", width: 120, ellipsis: true, filterable: true },
  { title: "型号", dataIndex: "model", key: "model", width: 110, ellipsis: true, filterable: true },
  { title: "色号", dataIndex: "spec", key: "spec", width: 100, ellipsis: true, filterable: true, visible: false },
  { title: "材质", dataIndex: "material", key: "material", width: 96, ellipsis: true, filterable: true, visible: false },
  { title: "折射率", dataIndex: "index", key: "index", width: 88, ellipsis: true, filterable: true, visible: false },
  { title: "产品标签", dataIndex: "attr", key: "attr", width: 110, ellipsis: true, filterable: true, visible: false },
  { title: "零售价", dataIndex: "price", key: "price", width: 90, align: "right" as const },
  { title: "商城原价", key: "mallPrice", width: 120, align: "right" as const, filterable: true },
  { title: "商城优惠价", key: "mallPromoPrice", width: 120, align: "right" as const, filterable: true },
  { title: "积分+现金", key: "pointsCombo", width: 240, align: "right" as const },
  { title: "上架状态", key: "shelfOn", width: 96, align: "center" as const, filterable: true },
  { title: "上架时间", key: "shelfOnAt", width: 168, ellipsis: true, visible: false },
  { title: "下架时间", key: "shelfOffAt", width: 168, ellipsis: true, visible: false }
]

const {
  columns,
  tableColumns: baseTableColumns,
  scrollX: baseScrollX,
  storageKey: columnStorageKey,
  columnDefaults
} = useColumnSetting("zyb_cols_mall_goods_v5", mallColumnDefaults)

const tableColumns = computed(() => [SEQ_COL, ...baseTableColumns.value, ACTION_COL])
const scrollX = computed(
  () => Number(baseScrollX.value || 0) + Number(SEQ_COL.width || 0) + Number(ACTION_COL.width || 0)
)

const pageKeys = computed(() => pagedRows.value.map((row) => row.id))
const allPageChecked = computed(
  () => pageKeys.value.length > 0 && pageKeys.value.every((key) => selectedKeys.value.includes(key))
)
const pageIndeterminate = computed(
  () => !allPageChecked.value && pageKeys.value.some((key) => selectedKeys.value.includes(key))
)
const hasPicked = computed(() => selectedKeys.value.length > 0)

function toggleAllPage() {
  if (allPageChecked.value) {
    const drop = new Set(pageKeys.value)
    selectedKeys.value = selectedKeys.value.filter((key) => !drop.has(key))
    return
  }
  selectedKeys.value = [...new Set([...selectedKeys.value, ...pageKeys.value])]
}

function toggleCheck(id: string) {
  if (selectedKeys.value.includes(id)) {
    selectedKeys.value = selectedKeys.value.filter((key) => key !== id)
    return
  }
  selectedKeys.value = [...selectedKeys.value, id]
}

function onPageChange(p: number, ps: number) {
  page.value = p
  pageSize.value = ps
}

function removeIds(ids: string[]) {
  if (!ids.length) return
  Modal.confirm({
    title: "移出商城",
    content: `确认将选中的 ${ids.length} 个商品从商城列表中移除？不会删除产品资料。`,
    okText: "移除",
    okType: "danger",
    cancelText: "取消",
    onOk: () => {
      removeMallGoodsIds(ids)
      refreshMallIds()
      refreshMeta()
      selectedKeys.value = selectedKeys.value.filter((key) => !ids.includes(key))
      message.success("已移出商城")
    }
  })
}

function onBatchRemove() {
  removeIds([...selectedKeys.value])
}

function onBatchShelfOn() {
  const ids = [...selectedKeys.value]
  if (!ids.length) return
  for (const id of ids) setMallShelfOn(id, true)
  refreshMeta()
  message.success(`已上架 ${ids.length} 个商品`)
}

function onBatchShelfOff() {
  const ids = [...selectedKeys.value]
  if (!ids.length) return
  for (const id of ids) setMallShelfOn(id, false)
  refreshMeta()
  message.success(`已下架 ${ids.length} 个商品`)
}

function onRemoveRow(row: ProductRow | Record<string, any>) {
  currentRowKey.value = row.id
  clearRowActionPops()
  removePopKey.value = row.id
  rowMenuOpenKey.value = ""
}

function cancelRowRemove() {
  clearRowActionPops()
  rowMenuOpenKey.value = ""
}

function onShelfOnAtRow(row: ProductRow | Record<string, any>) {
  currentRowKey.value = row.id
  clearRowActionPops()
  shelfOnAtPopKey.value = row.id
  scheduleDraft.value = shelfOnAtOf(row.id)
  rowMenuOpenKey.value = ""
}

function onShelfOffAtRow(row: ProductRow | Record<string, any>) {
  currentRowKey.value = row.id
  clearRowActionPops()
  shelfOffAtPopKey.value = row.id
  scheduleDraft.value = shelfOffAtOf(row.id)
  rowMenuOpenKey.value = ""
}

function cancelSchedulePop() {
  clearRowActionPops()
  scheduleDraft.value = undefined
  rowMenuOpenKey.value = ""
}

function confirmSchedulePop(row: ProductRow | Record<string, any>) {
  const raw = scheduleDraft.value
  const at = raw == null || String(raw).trim() === "" ? null : String(raw).trim()
  if (!at) {
    message.warning("请选择时间")
    return
  }
  if (shelfOnAtPopKey.value === row.id) {
    setShelfOnAt(row.id, at)
    message.success("上架时间已保存")
  } else if (shelfOffAtPopKey.value === row.id) {
    setShelfOffAt(row.id, at)
    message.success("下架时间已保存")
  } else {
    return
  }
  refreshMeta()
  clearRowActionPops()
  rowMenuOpenKey.value = ""
}

function confirmRowRemove(row: ProductRow | Record<string, any>) {
  removeMallGoodsIds([row.id])
  refreshMallIds()
  refreshMeta()
  selectedKeys.value = selectedKeys.value.filter((key) => key !== row.id)
  if (currentRowKey.value === row.id) currentRowKey.value = ""
  clearRowActionPops()
  rowMenuOpenKey.value = ""
  message.success("已移出商城")
}

function onRowMenuOpen(row: ProductRow | Record<string, any>, open: boolean) {
  if (open) {
    if (removePopKey.value && removePopKey.value !== row.id) removePopKey.value = ""
    if (shelfOnAtPopKey.value && shelfOnAtPopKey.value !== row.id) shelfOnAtPopKey.value = ""
    if (shelfOffAtPopKey.value && shelfOffAtPopKey.value !== row.id) shelfOffAtPopKey.value = ""
    rowMenuOpenKey.value = row.id
    currentRowKey.value = row.id
    return
  }
  // Menu closes independently of row action popovers (移出 / 上下架时间).
  if (rowMenuOpenKey.value === row.id) rowMenuOpenKey.value = ""
}

function startPriceEdit(
  row: ProductRow | Record<string, any>,
  kind: "orig" | "promo" | "points" | "cash" = "orig"
) {
  currentRowKey.value = row.id
  priceEditKey.value = row.id
  priceEditKind.value = kind
  const draft =
    kind === "promo"
      ? mallPromoPriceOf(row.id)
      : kind === "points"
        ? pointsToRedeemOf(row.id)
        : kind === "cash"
          ? pointsCashOf(row.id)
          : mallPriceOf(row.id)
  priceDraft.value = draft ?? undefined
  clearRowActionPops()
  rowMenuOpenKey.value = ""
  nextTick(() => {
    priceInputRef.value?.focus?.()
  })
}

function cancelPriceEdit() {
  priceEditKey.value = ""
  priceEditKind.value = ""
}


function savePriceEdit(id: string) {
  if (priceEditKey.value !== id) return
  const kind =
    priceEditKind.value === "promo"
      ? "promo"
      : priceEditKind.value === "points"
        ? "points"
        : priceEditKind.value === "cash"
          ? "cash"
          : "orig"
  const meta = getMallGoodsMeta(id)
  const prev =
    kind === "promo"
      ? meta.mallPromoPrice
      : kind === "points"
        ? meta.pointsToRedeem
        : kind === "cash"
          ? meta.pointsCash
          : meta.mallPrice
  const prevN = prev == null || Number.isNaN(Number(prev)) ? null : Number(prev)
  const raw = priceDraft.value
  let price: number | null = null
  if (raw != null && String(raw) !== "") {
    const n = Number(raw)
    const invalid =
      Number.isNaN(n) ||
      n < 0 ||
      (kind === "points" && !Number.isInteger(n))
    if (invalid) {
      message.warning(
        kind === "promo"
          ? "请输入有效的商城优惠价"
          : kind === "points"
            ? "请输入有效的积分（非负整数）"
            : kind === "cash"
              ? "请输入有效的现金"
              : "请输入有效的商城原价"
      )
      priceDraft.value =
        (kind === "promo"
          ? mallPromoPriceOf(id)
          : kind === "points"
            ? pointsToRedeemOf(id)
            : kind === "cash"
              ? pointsCashOf(id)
              : mallPriceOf(id)) ?? undefined
      nextTick(() => priceInputRef.value?.focus?.())
      return
    }
    price = n
  }
  priceEditKey.value = ""
  priceEditKind.value = ""
  if (prevN === price || (prevN == null && price == null)) return
  if (kind === "promo") setMallPromoPrice(id, price)
  else if (kind === "points") setPointsToRedeem(id, price)
  else if (kind === "cash") setPointsCash(id, price)
  else setMallPrice(id, price)
  refreshMeta()
  message.success(
    kind === "promo"
      ? "商城优惠价已保存"
      : kind === "points"
        ? "积分已保存"
        : kind === "cash"
          ? "现金已保存"
          : "商城原价已保存"
  )
}
function onBatchSetPrice() {
  if (!selectedKeys.value.length) {
    message.warning("请先选择商品")
    return
  }
  priceEditKey.value = ""
  clearRowActionPops()
  rowMenuOpenKey.value = ""
  priceTargetId.value = ""
  priceBatchIds.value = [...selectedKeys.value]
  priceTargetName.value = `已选 ${priceBatchIds.value.length} 个商品`
  priceDraft.value = undefined
  promoDraft.value = undefined
  scheduleModalOpen.value = false
  priceModalOpen.value = true
}

function openBatchSchedule(kind: "on" | "off") {
  if (!selectedKeys.value.length) {
    message.warning("请先选择商品")
    return
  }
  priceEditKey.value = ""
  clearRowActionPops()
  rowMenuOpenKey.value = ""
  priceModalOpen.value = false
  scheduleModalKind.value = kind
  scheduleBatchIds.value = [...selectedKeys.value]
  scheduleTargetName.value = `已选 ${scheduleBatchIds.value.length} 个商品`
  scheduleDraft.value = undefined
  scheduleModalOpen.value = true
}

function onBatchSetShelfOnAt() {
  openBatchSchedule("on")
}

function onBatchSetShelfOffAt() {
  openBatchSchedule("off")
}

function onScheduleModalOk() {
  const ids = [...scheduleBatchIds.value]
  if (!ids.length) return Promise.reject()
  const raw = scheduleDraft.value
  const at = raw == null || String(raw).trim() === "" ? null : String(raw).trim()
  if (!at) {
    message.warning("请选择时间")
    return Promise.reject()
  }
  const kind = scheduleModalKind.value
  for (const id of ids) {
    if (kind === "on") setShelfOnAt(id, at)
    else setShelfOffAt(id, at)
  }
  refreshMeta()
  scheduleModalOpen.value = false
  scheduleBatchIds.value = []
  message.success(kind === "on"
    ? `已为 ${ids.length} 个商品设置上架时间`
    : `已为 ${ids.length} 个商品设置下架时间`)
}

function onPriceModalOk() {
  const ids = priceBatchIds.value.length
    ? priceBatchIds.value
    : priceTargetId.value
      ? [priceTargetId.value]
      : []
  if (!ids.length) return Promise.reject()

  const parsePrice = (raw: number | null | undefined, label: string) => {
    if (raw == null || raw === ("" as any)) return null
    const n = Number(raw)
    if (Number.isNaN(n) || n < 0) {
      message.warning(`请输入有效的${label}`)
      throw new Error("invalid")
    }
    return n
  }

  let orig: number | null
  let promo: number | null
  try {
    orig = parsePrice(priceDraft.value, "商城原价")
    promo = parsePrice(promoDraft.value, "商城优惠价")
  } catch {
    return Promise.reject()
  }

  if (priceBatchIds.value.length && orig == null && promo == null) {
    message.warning("请至少填写商城原价或商城优惠价")
    return Promise.reject()
  }

  for (const id of ids) {
    if (orig != null) setMallPrice(id, orig)
    if (promo != null) setMallPromoPrice(id, promo)
  }
  refreshMeta()
  priceModalOpen.value = false
  priceBatchIds.value = []
  message.success(ids.length > 1 ? `已为 ${ids.length} 个商品设置商城价格` : "商城价格已保存")
}
function onShelfOn(row: ProductRow | Record<string, any>) {
  if (isShelfOn(row.id)) {
    message.info("已是上架状态")
    return
  }
  setMallShelfOn(row.id, true)
  refreshMeta()
  message.success("已上架")
}

function onShelfOff(row: ProductRow | Record<string, any>) {
  if (!isShelfOn(row.id)) {
    message.info("已是下架状态")
    return
  }
  setMallShelfOn(row.id, false)
  refreshMeta()
  message.success("已下架")
}

function previewPriceText(row: ProductRow | Record<string, any>) {
  const promo = mallPromoPriceOf(row.id)
  if (promo != null) return promo.toFixed(2)
  const orig = mallPriceOf(row.id)
  if (orig != null) return orig.toFixed(2)
  const n = Number(row.price || 0)
  return Number.isNaN(n) ? "0.00" : n.toFixed(2)
}

function openPreview(row: ProductRow | Record<string, any>) {
  previewRow.value = asMallRow(row)
  previewOpen.value = true
  clearRowActionPops()
  rowMenuOpenKey.value = ""
}

function onRowMenuClick(info: { key: string | number }, row: ProductRow | Record<string, any>) {
  const key = String(info.key)
  currentRowKey.value = row.id
  if (key === "preview") {
    openPreview(row)
    return
  }
  if (key === "remove") {
    onRemoveRow(row)
    return
  }
  if (key === "shelfOnAt") {
    onShelfOnAtRow(row)
    return
  }
  if (key === "shelfOffAt") {
    onShelfOffAtRow(row)
    return
  }
  clearRowActionPops()
  rowMenuOpenKey.value = ""
  if (key === "shelfOn") onShelfOn(row)
  else if (key === "shelfOff") onShelfOff(row)
}

/** 产品资料中尚未加入商城的商品 */
const pickerSource = computed(() => {
  const inMall = new Set(mallIds.value)
  return allProducts.value.filter((row) => !inMall.has(row.id) && row.enabled !== false)
})

const pickerFiltered = computed(() => {
  const keyword = pickerQ.value.trim().toLowerCase()
  return pickerSource.value.filter((row) => {
    if (keyword) {
      const blob = [row.cat, row.brand, row.sku, row.name, row.series, row.model, row.attr]
        .join(" ")
        .toLowerCase()
      if (!blob.includes(keyword)) return false
    }
    if (!matchCatFilter(row, "picker")) return false
    return matchColQueries(row, pickerColQueries, "picker")
  })
})

const pickerPaged = computed(() => {
  const start = (pickerPage.value - 1) * pickerPageSize.value
  return pickerFiltered.value.slice(start, start + pickerPageSize.value)
})

watch(pickerQ, () => {
  pickerPage.value = 1
})

const pickerColumns: MallColumn[] = [
  { title: "品类", dataIndex: "cat", key: "cat", width: 80, ellipsis: true, filterable: true },
  { title: "产品名称", dataIndex: "name", key: "name", width: 180, ellipsis: true, filterable: true },
  { title: "产品代号", dataIndex: "sku", key: "sku", width: 100, ellipsis: true, filterable: true },
  { title: "品牌", dataIndex: "brand", key: "brand", width: 90, ellipsis: true, filterable: true },
  { title: "系列", dataIndex: "series", key: "series", width: 110, ellipsis: true, filterable: true },
  { title: "型号", dataIndex: "model", key: "model", width: 100, ellipsis: true, filterable: true },
  { title: "产品标签", dataIndex: "attr", key: "attr", width: 100, ellipsis: true, filterable: true },
  { title: "零售价", dataIndex: "price", key: "price", width: 80, align: "right" as const }
]

async function openPicker() {
  pickerOpen.value = true
  pickerQ.value = ""
  pickerSelected.value = []
  pickerPage.value = 1
  clearScopeQueries("picker")
  pickerLoading.value = true
  try {
    await loadCatalog(true)
  } finally {
    pickerLoading.value = false
  }
}

function onPickerOk() {
  if (!pickerSelected.value.length) {
    message.warning("请先选择要添加的商品")
    return Promise.reject()
  }
  const mallPriceById: Record<string, number | null> = {}
  for (const id of pickerSelected.value) {
    const row = productById.value.get(id)
    if (!row) {
      mallPriceById[id] = null
      continue
    }
    const n = Number(row.price)
    mallPriceById[id] = Number.isNaN(n) ? null : n
  }
  const added = addMallGoodsIds(pickerSelected.value, mallPriceById)
  refreshMallIds()
  refreshMeta()
  if (added > 0) message.success(`已添加 ${added} 个商品到商城`)
  else message.info("所选商品已在商城中")
  pickerSelected.value = []
  pickerOpen.value = false
}

function search() {
  page.value = 1
}

function reset() {
  q.value = ""
  clearScopeQueries("main")
  page.value = 1
  selectedKeys.value = []
}


function collectMallSeries(): string[] {
  const seen = new Set<string>()
  const list: string[] = []
  for (const row of mallRows.value) {
    const name = String(row.series || "").trim()
    if (!name || seen.has(name)) continue
    seen.add(name)
    list.push(name)
  }
  return list
}

function mergeSeriesOrder(saved: string[], current: string[]) {
  const currentSet = new Set(current)
  const ordered = saved.filter((name) => currentSet.has(name))
  const orderedSet = new Set(ordered)
  for (const name of current) {
    if (!orderedSet.has(name)) ordered.push(name)
  }
  return ordered
}

function openSeriesOrderModal() {
  seriesOrderDraft.value = mergeSeriesOrder(getMallSeriesOrder(), collectMallSeries())
  seriesDragName.value = ""
  seriesDragOver.value = ""
  seriesOrderOpen.value = true
}

function onSeriesDragStart(name: string, ev: DragEvent) {
  seriesDragName.value = name
  try {
    ev.dataTransfer?.setData("text/plain", name)
    if (ev.dataTransfer) ev.dataTransfer.effectAllowed = "move"
  } catch {
    /* ignore */
  }
}

function onSeriesDragOver(name: string, ev: DragEvent) {
  ev.preventDefault()
  if (seriesDragOver.value !== name) seriesDragOver.value = name
}

function onSeriesDrop(target: string) {
  const from = seriesDragName.value
  seriesDragName.value = ""
  seriesDragOver.value = ""
  if (!from || from === target) return
  const list = [...seriesOrderDraft.value]
  const fromIdx = list.indexOf(from)
  const toIdx = list.indexOf(target)
  if (fromIdx < 0 || toIdx < 0) return
  list.splice(fromIdx, 1)
  list.splice(toIdx, 0, from)
  seriesOrderDraft.value = list
}

function onSeriesDragEnd() {
  seriesDragName.value = ""
  seriesDragOver.value = ""
}

function onSeriesOrderOk() {
  setMallSeriesOrder(seriesOrderDraft.value)
  seriesOrderOpen.value = false
  message.success("系列展示顺序已保存")
}

onMounted(() => {
  refreshMallIds()
  refreshMeta()
  loadCatalog()
})
</script>

<template>
  <div class="sg-page mall-goods">
    <div class="mall-goods-tip">
      添加商品后系统默认将商城价与零售价同步，如需调整商城价，可进行修改
    </div>

    <div class="sg-actbar">
      <div class="sg-actbar-left">
        <button type="button" class="sg-act" @click="openPicker">
          <PlusOutlined /> 添加商品
        </button>
        <button type="button" class="sg-act" @click="openSeriesOrderModal">
          调整商城系列展示顺序
        </button>
        <span class="sg-act-sep"></span>
        <button type="button" class="sg-act" :disabled="!hasPicked" @click="onBatchShelfOn">
          批量上架
        </button>
        <button type="button" class="sg-act" :disabled="!hasPicked" @click="onBatchShelfOff">
          批量下架
        </button>
        <button type="button" class="sg-act" :disabled="!hasPicked" @click="onBatchSetShelfOnAt">
          批量设置上架时间
        </button>
        <button type="button" class="sg-act" :disabled="!hasPicked" @click="onBatchSetShelfOffAt">
          批量设置下架时间
        </button>
        <button type="button" class="sg-act" :disabled="!hasPicked" @click="onBatchSetPrice">
          批量设置商城价格
        </button>
        <button type="button" class="sg-act" :disabled="!hasPicked" @click="onBatchRemove">
          <DeleteOutlined /> 批量移出
        </button>
      </div>
      <div class="sg-actbar-right">
        <a-input
          v-model:value="q"
          allow-clear
          class="sg-query-input"
          placeholder="品类/品牌/产品代号/产品名称/系列/型号/产品标签"
          @press-enter="search"
        >
          <template #prefix><SearchOutlined /></template>
        </a-input>
        <a-button type="primary" class="sg-query-solid" @click="search">查询</a-button>
        <a-button class="sg-ol" @click="reset">重置</a-button>
      </div>
    </div>

    <div class="mall-goods-table-host">
      <a-table
        class="sg-catalog-table"
        size="small"
        :columns="tableColumns"
        :data-source="pagedRows"
        :loading="loading"
        row-key="id"
        :pagination="{
          current: page,
          pageSize,
          total: filteredRows.length,
          showSizeChanger: true,
          showQuickJumper: true,
          pageSizeOptions: tablePageSizeOptions,
          showTotal: tableShowTotal,
          onChange: onPageChange
        }"
        :scroll="{ x: scrollX, y: 'calc(100vh - 280px)' }"
        :custom-row="(record: ProductRow) => ({
          class: currentRowKey === record.id ? 'row-current' : '',
          onClick: () => { currentRowKey = record.id }
        })"
      >
        <template #headerCell="{ column }">
          <template v-if="column.key === 'seq'">
            <a-checkbox
              :checked="allPageChecked"
              :indeterminate="pageIndeterminate"
              @change="toggleAllPage"
            />
          </template>
          <template v-else-if="column.key === 'action'">
            <ColumnSetting
              v-model="columns"
              :storage-key="columnStorageKey"
              :defaults="columnDefaults"
              icon-only
            />
          </template>
          <span v-else-if="column.key === 'pointsCombo'" class="sg-th-points">
            <span class="sg-th-name">积分+现金</span>
            <a-tooltip title="积分+现金可以兑换小程序商城上面的该商品">
              <QuestionCircleOutlined class="sg-th-tip" />
            </a-tooltip>
          </span>
          <span v-else-if="(column as MallColumn).filterable" class="sg-th-filter">
            <span class="sg-th-name">{{ column.title }}</span>
            <a-dropdown
              :open="thFilterOpen === thKey('main', String(column.key))"
              :trigger="['hover']"
              overlay-class-name="sg-excel-filter-overlay"
              @open-change="(open: boolean) => onThFilterOpen('main', String(column.key), open)"
            >
              <button
                type="button"
                class="sg-excel-filter-btn"
                :class="{ on: isThFilterActive('main', String(column.key)) }"
                :title="'筛选' + column.title"
                @click.stop
              ><FilterOutlined /></button>
              <template #overlay>
                <div v-if="column.key === 'cat'" class="sg-excel-filter-panel" @click.stop>
                  <div class="sg-excel-filter-list">
                    <label
                      v-for="opt in catFilterOptions('main')"
                      :key="String(opt.value)"
                      class="sg-excel-filter-item"
                    >
                      <a-checkbox
                        :checked="isDraftCatValueOn(opt.value)"
                        @click.prevent="toggleDraftCatValue('main', opt.value)"
                      />
                      {{ opt.label }}
                    </label>
                    <div v-if="!catFilterOptions('main').length" class="sg-excel-filter-empty">无匹配项</div>
                  </div>
                  <div class="sg-col-filter-actions">
                    <button type="button" @click="cancelCatFilter('main')">取消</button>
                    <button type="button" class="sg-col-filter-ok" @click="confirmCatFilter('main')">确定</button>
                  </div>
                </div>
                <div v-else class="sg-col-filter" @click.stop>
                  <a-input
                    :value="draftColQueries[thKey('main', String(column.key))]"
                    allow-clear
                    size="small"
                    placeholder="按回车筛选"
                    @update:value="draftColQueries[thKey('main', String(column.key))] = String($event || '')"
                    @press-enter="applyThFilter('main', String(column.key))"
                  />
                  <div class="sg-col-filter-actions">
                    <button type="button" @click="applyThFilter('main', String(column.key))">筛选</button>
                    <button type="button" @click="resetThFilter('main', String(column.key))">重置</button>
                  </div>
                </div>
              </template>
            </a-dropdown>
          </span>
        </template>
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'seq'">
            <a-checkbox
              :checked="selectedKeys.includes(record.id)"
              @click.stop
              @change="toggleCheck(record.id)"
            />
            <span class="mall-seq">{{ (page - 1) * pageSize + index + 1 }}</span>
          </template>
          <template v-else-if="column.key === 'productImage'">
            <button
              type="button"
              class="sg-product-thumb-btn"
              :title="productImageOf(record) ? '点击更换图片' : '点击上传图片'"
              @click.stop="pickProductImage(record)"
            >
              <img
                v-if="productImageOf(record)"
                :src="productImageOf(record)"
                alt=""
                class="sg-product-thumb"
              />
              <span v-else class="sg-product-thumb sg-product-thumb-upload">
                <UploadOutlined />
              </span>
            </button>
          </template>
          <template v-else-if="column.key === 'price'">
            {{ Number(record.price || 0).toFixed(2) }}
          </template>
          <template v-else-if="column.key === 'mallPrice'">
            <div class="sg-mall-price-cell" @click.stop>
              <a-input-number
                v-if="priceEditKey === record.id && priceEditKind === 'orig'"
                ref="priceInputRef"
                v-model:value="priceDraft"
                :min="0"
                :precision="2"
                :step="1"
                size="small"
                class="sg-mall-price-input"
                @blur="savePriceEdit(record.id)"
                @pressEnter="savePriceEdit(record.id)"
                @keydown.esc.prevent="cancelPriceEdit"
              />
              <template v-else>
                <span class="sg-mall-price-text">{{ formatMallPrice(record.id) }}</span>
                <button
                  type="button"
                  class="sg-mall-price-edit"
                  title="编辑商城原价"
                  @click="startPriceEdit(record, 'orig')"
                >
                  <EditOutlined />
                </button>
              </template>
            </div>
          </template>
          <template v-else-if="column.key === 'mallPromoPrice'">
            <div class="sg-mall-price-cell" @click.stop>
              <a-input-number
                v-if="priceEditKey === record.id && priceEditKind === 'promo'"
                ref="priceInputRef"
                v-model:value="priceDraft"
                :min="0"
                :precision="2"
                :step="1"
                size="small"
                class="sg-mall-price-input"
                @blur="savePriceEdit(record.id)"
                @pressEnter="savePriceEdit(record.id)"
                @keydown.esc.prevent="cancelPriceEdit"
              />
              <template v-else>
                <span class="sg-mall-price-text">{{ formatMallPromoPrice(record.id) }}</span>
                <button
                  type="button"
                  class="sg-mall-price-edit"
                  title="编辑商城优惠价"
                  @click="startPriceEdit(record, 'promo')"
                >
                  <EditOutlined />
                </button>
              </template>
            </div>
          </template>
          <template v-else-if="column.key === 'pointsCombo'">
            <div class="sg-points-combo" @click.stop>
              <div class="sg-points-combo-part is-points">
                <span class="sg-points-combo-label">积分</span>
                <div class="sg-mall-price-cell">
                  <a-input-number
                    v-if="priceEditKey === record.id && priceEditKind === 'points'"
                    ref="priceInputRef"
                    v-model:value="priceDraft"
                    :min="0"
                    :precision="0"
                    :step="1"
                    size="small"
                    class="sg-mall-price-input"
                    @blur="savePriceEdit(record.id)"
                    @pressEnter="savePriceEdit(record.id)"
                    @keydown.esc.prevent="cancelPriceEdit"
                  />
                  <template v-else>
                    <span class="sg-mall-price-text">{{ pointsToRedeemOf(record.id) == null ? "—" : pointsToRedeemOf(record.id) }}</span>
                    <button
                      type="button"
                      class="sg-mall-price-edit"
                      title="编辑积分"
                      @click="startPriceEdit(record, 'points')"
                    >
                      <EditOutlined />
                    </button>
                  </template>
                </div>
              </div>
              <span class="sg-points-combo-sep">+</span>
              <div class="sg-points-combo-part is-cash">
                <span class="sg-points-combo-label">现金</span>
                <div class="sg-mall-price-cell">
                  <a-input-number
                    v-if="priceEditKey === record.id && priceEditKind === 'cash'"
                    ref="priceInputRef"
                    v-model:value="priceDraft"
                    :min="0"
                    :precision="2"
                    :step="1"
                    size="small"
                    class="sg-mall-price-input"
                    @blur="savePriceEdit(record.id)"
                    @pressEnter="savePriceEdit(record.id)"
                    @keydown.esc.prevent="cancelPriceEdit"
                  />
                  <template v-else>
                    <span class="sg-mall-price-text">{{ formatPointsCash(record.id) }}</span>
                    <button
                      type="button"
                      class="sg-mall-price-edit"
                      title="编辑现金"
                      @click="startPriceEdit(record, 'cash')"
                    >
                      <EditOutlined />
                    </button>
                  </template>
                </div>
              </div>
            </div>
          </template>
          <template v-else-if="column.key === 'shelfOn'">
            <a-tag :color="isShelfOn(record.id) ? 'success' : 'default'">{{ isShelfOn(record.id) ? "上架" : "下架" }}</a-tag>
          </template>
          <template v-else-if="column.key === 'shelfOnAt'">
            <span class="sg-shelf-at">{{ formatShelfAt(record.id, 'on') }}</span>
          </template>
          <template v-else-if="column.key === 'shelfOffAt'">
            <span class="sg-shelf-at">{{ formatShelfAt(record.id, 'off') }}</span>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-popover
              :open="rowActionPopOpen(record.id)"
              placement="leftTop"
              :trigger="[]"
              :overlay-class-name="rowPopOverlayClass(record.id)"
              :get-popup-container="popupToBody"
            >
              <template #title>
                <span v-if="removePopKey === record.id" class="sg-del-pop-title">
                  <ExclamationCircleFilled />
                  移出确认
                </span>
              </template>
              <template #content>
                <template v-if="removePopKey === record.id">
                  <div class="sg-del-pop-body">
                    确认移出该商品「{{ record.name || record.sku || record.id }}」吗？不会删除产品资料。
                  </div>
                  <div class="sg-del-pop-ft">
                    <button type="button" class="sg-del-cancel" @click.stop="cancelRowRemove">取消</button>
                    <button type="button" class="sg-del-ok" @click.stop="confirmRowRemove(record)">确定</button>
                  </div>
                </template>
                <template v-else>
                  <div class="sg-schedule-pop-body">
                    <div class="sg-schedule-pop-label">{{ shelfOnAtPopKey === record.id ? '请选择上架时间' : '请选择下架时间' }}</div>
                    <a-date-picker
                      v-model:value="scheduleDraft"
                      show-time
                      value-format="YYYY-MM-DD HH:mm:ss"
                      placeholder="请选择时间"
                      style="width: 190px"
                      :get-popup-container="popupToBody"
                      :popup-style="{ zIndex: 2100 }"
                    />
                  </div>
                  <div class="sg-del-pop-ft">
                    <button type="button" class="sg-del-cancel" @click.stop="cancelSchedulePop">取消</button>
                    <button type="button" class="sg-del-ok" @click.stop="confirmSchedulePop(record)">确定</button>
                  </div>
                </template>
              </template>
              <a-dropdown
                :open="rowMenuOpenKey === record.id"
                :trigger="['hover']"
                placement="bottomRight"
                overlay-class-name="sg-row-more-overlay"
                @openChange="(open: boolean) => onRowMenuOpen(record, open)"
              >
                <button type="button" class="sg-row-more" title="更多操作" @click.stop="currentRowKey = record.id">
                  <EllipsisOutlined />
                </button>
                <template #overlay>
                  <a-menu @click="(info: { key: string | number }) => onRowMenuClick(info, record)">
                    <a-menu-item key="preview">预览</a-menu-item>
                    <a-menu-item key="shelfOn" :disabled="isShelfOn(record.id)">立即上架</a-menu-item>
                    <a-menu-item key="shelfOff" :disabled="!isShelfOn(record.id)">立即下架</a-menu-item>
                    <a-menu-item key="shelfOnAt" :disabled="isShelfOn(record.id)">设置上架时间</a-menu-item>
                    <a-menu-item key="shelfOffAt" :disabled="!isShelfOn(record.id)">设置下架时间</a-menu-item>
                    <a-menu-item key="remove" danger>移出</a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown>
            </a-popover>
          </template>
        </template>
      </a-table>
    </div>

        <input
      ref="imageFileInputRef"
      type="file"
      accept="image/*"
      class="sg-product-image-input"
      @change="onProductImageFileChange"
    />

    <a-modal
      v-model:open="pickerOpen"
      title="从产品资料添加商品到商城"
      width="1080px"
      ok-text="添加到商城"
      cancel-text="取消"
      :confirm-loading="pickerLoading"
      destroy-on-close
      @ok="onPickerOk"
    >
      <div class="mall-picker-bar">
        <a-input
          v-model:value="pickerQ"
          allow-clear
          placeholder="品类/品牌/代号/名称/系列/型号/产品标签"
          style="max-width: 280px"
        >
          <template #prefix><SearchOutlined /></template>
        </a-input>
        <span class="mall-picker-hint">已选 {{ pickerSelected.length }}，可选 {{ pickerFiltered.length }}</span>
      </div>
      <div class="mall-picker-tip">只能添加商品的时候只能选择已启用的商品  未启用的商品不会出现</div>
      <a-table
        size="small"
        :columns="pickerColumns"
        :data-source="pickerPaged"
        :loading="pickerLoading"
        row-key="id"
        :row-selection="{
          selectedRowKeys: pickerSelected,
          onChange: (keys: (string | number)[]) => { pickerSelected = keys.map(String) }
        }"
        :pagination="{
          current: pickerPage,
          pageSize: pickerPageSize,
          total: pickerFiltered.length,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50'],
          showTotal: tableShowTotal,
          onChange: (p: number, ps: number) => { pickerPage = p; pickerPageSize = ps }
        }"
        :scroll="{ x: 900, y: 420 }"
      >
        <template #headerCell="{ column }">
          <span v-if="(column as MallColumn).filterable" class="sg-th-filter">
            <span class="sg-th-name">{{ column.title }}</span>
            <a-dropdown
              :open="pickerThFilterOpen === thKey('picker', String(column.key))"
              :trigger="['hover']"
              overlay-class-name="sg-excel-filter-overlay"
              @open-change="(open: boolean) => onThFilterOpen('picker', String(column.key), open)"
            >
              <button
                type="button"
                class="sg-excel-filter-btn"
                :class="{ on: isThFilterActive('picker', String(column.key)) }"
                :title="'筛选' + column.title"
                @click.stop
              ><FilterOutlined /></button>
              <template #overlay>
                <div v-if="column.key === 'cat'" class="sg-excel-filter-panel" @click.stop>
                  <div class="sg-excel-filter-list">
                    <label
                      v-for="opt in catFilterOptions('picker')"
                      :key="String(opt.value)"
                      class="sg-excel-filter-item"
                    >
                      <a-checkbox
                        :checked="isDraftCatValueOn(opt.value)"
                        @click.prevent="toggleDraftCatValue('picker', opt.value)"
                      />
                      {{ opt.label }}
                    </label>
                    <div v-if="!catFilterOptions('picker').length" class="sg-excel-filter-empty">无匹配项</div>
                  </div>
                  <div class="sg-col-filter-actions">
                    <button type="button" @click="cancelCatFilter('picker')">取消</button>
                    <button type="button" class="sg-col-filter-ok" @click="confirmCatFilter('picker')">确定</button>
                  </div>
                </div>
                <div v-else class="sg-col-filter" @click.stop>
                  <a-input
                    :value="pickerDraftColQueries[thKey('picker', String(column.key))]"
                    allow-clear
                    size="small"
                    placeholder="按回车筛选"
                    @update:value="pickerDraftColQueries[thKey('picker', String(column.key))] = String($event || '')"
                    @press-enter="applyThFilter('picker', String(column.key))"
                  />
                  <div class="sg-col-filter-actions">
                    <button type="button" @click="applyThFilter('picker', String(column.key))">筛选</button>
                    <button type="button" @click="resetThFilter('picker', String(column.key))">重置</button>
                  </div>
                </div>
              </template>
            </a-dropdown>
          </span>
        </template>
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'price'">
            {{ Number(record.price || 0).toFixed(2) }}
          </template>
          <template v-else-if="column.key === 'enabled'">
            {{ record.enabled ? "是" : "否" }}
          </template>
        </template>
      </a-table>
    </a-modal>


    <a-modal
      v-model:open="seriesOrderOpen"
      title="调整商城系列展示顺序"
      ok-text="保存"
      cancel-text="取消"
      destroy-on-close
      :width="420"
      @ok="onSeriesOrderOk"
    >
      <div class="sg-series-order-tip">拖拽调整系列在商城中的展示顺序（来自当前商城商品的系列）</div>
      <div v-if="!seriesOrderDraft.length" class="sg-series-order-empty">暂无系列，请先添加带系列的商品</div>
      <ul v-else class="sg-series-order-list">
        <li
          v-for="name in seriesOrderDraft"
          :key="name"
          class="sg-series-order-item"
          :class="{
            dragging: seriesDragName === name,
            over: seriesDragOver === name && seriesDragName && seriesDragName !== name
          }"
          draggable="true"
          @dragstart="onSeriesDragStart(name, $event)"
          @dragover="onSeriesDragOver(name, $event)"
          @drop.prevent="onSeriesDrop(name)"
          @dragend="onSeriesDragEnd"
        >
          <span class="sg-series-order-handle"><HolderOutlined /></span>
          <span class="sg-series-order-name">{{ name }}</span>
        </li>
      </ul>
    </a-modal>

    <a-modal
      v-model:open="priceModalOpen"
      title="批量设置商城价格"
      ok-text="保存"
      cancel-text="取消"
      :confirm-loading="priceModalLoading"
      destroy-on-close
      @ok="onPriceModalOk"
    >
      <div class="mall-price-form">
        <div class="mall-price-name">{{ priceTargetName }}</div>
        <div class="mall-price-field">
          <div class="mall-price-label">商城原价</div>
          <a-input-number
            v-model:value="priceDraft"
            :min="0"
            :precision="2"
            :step="1"
            style="width: 100%"
            placeholder="请输入商城原价，可留空表示不修改"
          />
        </div>
        <div class="mall-price-field">
          <div class="mall-price-label">商城优惠价</div>
          <a-input-number
            v-model:value="promoDraft"
            :min="0"
            :precision="2"
            :step="1"
            style="width: 100%"
            placeholder="请输入商城优惠价，可留空表示不修改"
          />
        </div>
      </div>
    </a-modal>

    <a-modal
      v-model:open="previewOpen"
      :footer="null"
      :closable="true"
      centered
      width="320px"
      destroy-on-close
      wrap-class-name="sg-preview-modal"
      :title="null"
    >
      <div v-if="previewRow" class="sg-phone">
        <div class="sg-phone-bezel">
          <div class="sg-phone-notch" aria-hidden="true" />
          <div class="sg-phone-screen">
            <div class="sg-phone-hero">
              <img
                v-if="productImageOf(previewRow)"
                :src="productImageOf(previewRow)"
                alt=""
                class="sg-phone-hero-img"
              />
              <div v-else class="sg-phone-hero-empty">
                <UploadOutlined />
              </div>
            </div>
            <div class="sg-phone-info">
              <div class="sg-phone-name">{{ previewRow.name || "—" }}</div>
              <div class="sg-phone-price">¥{{ previewPriceText(previewRow) }}</div>
              <div class="sg-phone-code">{{ previewRow.sku || previewRow.id || "" }}</div>
            </div>
          </div>
        </div>
      </div>
    </a-modal>

    <a-modal
      v-model:open="scheduleModalOpen"
      :title="scheduleModalKind === 'on' ? '批量设置上架时间' : '批量设置下架时间'"
      ok-text="保存"
      cancel-text="取消"
      :confirm-loading="scheduleModalLoading"
      destroy-on-close
      @ok="onScheduleModalOk"
    >
      <div class="mall-price-form">
        <div class="mall-price-name">{{ scheduleTargetName }}</div>
        <a-date-picker
          v-model:value="scheduleDraft"
          show-time
          value-format="YYYY-MM-DD HH:mm:ss"
          placeholder="请选择时间"
          style="width: 100%"
          :get-popup-container="popupToBody"
        />
      </div>
    </a-modal>
  </div>
</template>

<style scoped>
.mall-goods {
  position: absolute;
  inset: 16px 24px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: #fff;
  border: 1px solid #eceff1;
  overflow: hidden;
}
.mall-goods-tip {
  flex-shrink: 0;
  padding: 8px 12px;
  background: #fffbe6;
  border-bottom: 1px solid #ffe58f;
  color: #ad6800;
  font-size: 13px;
  line-height: 1.5;
}
.sg-actbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 40px;
  padding: 8px 12px;
  border-bottom: 1px solid #eceff1;
  flex-shrink: 0;
}
.sg-actbar-left,
.sg-actbar-right {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.sg-act-sep {
  width: 1px;
  height: 16px;
  background: #e0e5e4;
  margin: 0 2px;
}
.sg-act {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 30px;
  padding: 0 12px;
  border: 1px solid #13c2c2;
  border-radius: 4px;
  background: #fff;
  color: #13c2c2;
  font-size: 13px;
  cursor: pointer;
}
.sg-act:hover:not(:disabled) {
  background: #e8faf6;
}
.sg-act:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.sg-querybar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid #eceff1;
  flex-shrink: 0;
}
.sg-query-input {
  width: 320px;
  max-width: 42vw;
}
.sg-query-solid.ant-btn-primary {
  background: #13c2c2;
  border-color: #13c2c2;
}
.sg-query-solid.ant-btn-primary:hover {
  background: #36cfc9;
  border-color: #36cfc9;
}
.sg-ol {
  border-color: #13c2c2;
  color: #13c2c2;
}
.mall-goods-count {
  font-size: 13px;
  color: #667;
}
.mall-goods-table-host {
  flex: 1;
  min-height: 0;
  padding: 0 8px 8px;
  overflow: hidden;
}
.mall-seq {
  margin-left: 6px;
  color: #889;
  font-size: 12px;
}
.mall-picker-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.mall-picker-hint {
  font-size: 13px;
  color: #667;
}
:deep(.sg-catalog-table .ant-table-tbody > tr.row-current > td) {
  background: #f0fffc !important;
}

.sg-th-filter {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  max-width: 100%;
}
.sg-th-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sg-excel-filter-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  margin-left: 2px;
  border: 0;
  border-radius: 2px;
  background: transparent;
  color: #6b7572;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
}
.sg-excel-filter-btn:hover,
.sg-excel-filter-btn.on {
  background: #02bfa1;
  color: #fff;
}
:deep(.sg-act-link.ant-btn-link) {
  padding: 0 4px;
}
.sg-row-more {
  width: 28px;
  height: 28px;
  padding: 0;
  border-radius: 6px;
  border: 1px solid #13c2c2;
  background: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #13c2c2;
  line-height: 1;
  transition: background 0.15s, color 0.15s;
}
.sg-row-more:hover,
.sg-row-more.ant-dropdown-open,
:deep(.ant-dropdown-open > .sg-row-more) {
  background: #13c2c2;
  border-color: #13c2c2;
  color: #fff;
}
:deep(.sg-catalog-table .ant-table-cell:has(.sg-row-more)) {
  padding-left: 8px !important;
  padding-right: 8px !important;
}
.mall-price-form {
  padding: 8px 0 4px;
}
.mall-price-name {
  margin-bottom: 10px;
  color: #333;
  font-size: 13px;
}

.sg-points-combo {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  width: 100%;
}
.sg-points-combo-part {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}
.sg-points-combo-label {
  font-size: 12px;
  line-height: 1;
  flex: none;
  font-weight: 500;
}
.sg-points-combo-part.is-points .sg-points-combo-label,
.sg-points-combo-part.is-points .sg-mall-price-text {
  color: #0d9488;
}
.sg-points-combo-part.is-cash .sg-points-combo-label,
.sg-points-combo-part.is-cash .sg-mall-price-text {
  color: #ea580c;
}
.sg-points-combo-part.is-points .sg-mall-price-edit {
  color: #0d9488;
}
.sg-points-combo-part.is-cash .sg-mall-price-edit {
  color: #ea580c;
}
.sg-points-combo-sep {
  color: #94a3b8;
  font-size: 12px;
  flex: none;
  line-height: 1;
}
.sg-points-combo .sg-mall-price-cell {
  min-width: 0;
}
.sg-th-points {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.sg-th-tip {
  color: #8aa19d;
  font-size: 13px;
  cursor: help;
}
.sg-th-tip:hover {
  color: #02bfa1;
}
</style>
<style>
.sg-excel-filter-overlay {
  --sg: #02bfa1;
  --sg-deep: #018a74;
}
.sg-row-more-overlay .ant-dropdown-menu-item-danger,
.sg-row-more-overlay .ant-dropdown-menu-item.ant-dropdown-menu-item-danger {
  color: #ff4d4f;
}
.sg-excel-filter-overlay .sg-col-filter {
  width: 196px;
  padding: 10px;
  background: #fff;
  border: 1px solid #e6e6e6;
  border-radius: 4px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}
.sg-excel-filter-overlay .sg-excel-filter-panel {
  width: 220px;
  padding: 10px;
  background: #fff;
  border: 1px solid #e6e6e6;
  border-radius: 4px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}
.sg-excel-filter-overlay .sg-excel-filter-list {
  max-height: 180px;
  overflow: auto;
  margin: 6px 0;
  border: 1px solid #ececec;
  padding: 4px 0;
}
.sg-excel-filter-overlay .sg-excel-filter-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  font-size: 12px;
  color: #2c3533;
  cursor: pointer;
}
.sg-excel-filter-overlay .sg-excel-filter-item.all {
  font-weight: 600;
  margin-top: 6px;
}
.sg-excel-filter-overlay .sg-excel-filter-item:hover {
  background: #f3f8f6;
}
.sg-excel-filter-overlay .sg-excel-filter-empty {
  padding: 12px 8px;
  text-align: center;
  color: #8a9390;
  font-size: 12px;
}
.sg-excel-filter-overlay .sg-col-filter-ok {
  background: #02bfa1 !important;
  border-color: #02bfa1 !important;
  color: #fff !important;
}
.sg-excel-filter-overlay .sg-col-filter-ok:hover {
  background: #018a74 !important;
  border-color: #018a74 !important;
  color: #fff !important;
}
.sg-excel-filter-overlay .sg-col-filter-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.sg-excel-filter-overlay .sg-col-filter-actions button {
  flex: 1;
  height: 28px;
  border: 1px solid #ececec;
  border-radius: 2px;
  background: #f7f7f7;
  color: #8c8c8c;
  font-size: 13px;
  cursor: pointer;
}
.sg-excel-filter-overlay .sg-col-filter-actions button:hover {
  color: #595959;
  border-color: #d9d9d9;
}
.sg-mall-price-cell {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  width: 100%;
  min-height: 24px;
}
.sg-mall-price-text {
  font-variant-numeric: tabular-nums;
}
.sg-mall-price-edit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: #8c8c8c;
  font-size: 12px;
  cursor: pointer;
  opacity: 0.7;
}
.sg-mall-price-edit:hover {
  color: #13c2c2;
  background: #e6fffb;
  opacity: 1;
}
.sg-mall-price-input {
  width: 100%;
  max-width: 108px;
}

/* 行移出确认 popover */
.sg-del-pop .ant-popover-inner {
  padding: 12px 14px 12px;
  border-radius: 6px;
}
.sg-del-pop .ant-popover-title {
  padding: 0 0 8px;
  border-bottom: none;
  min-height: auto;
  font-weight: 600;
  color: #333;
}
.sg-del-pop-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}
.sg-del-pop-title .anticon {
  color: #faad14;
  font-size: 16px;
}
.sg-del-pop .ant-popover-inner-content {
  padding: 0;
}
.sg-del-pop-body {
  color: #f04438;
  font-size: 13px;
  line-height: 1.5;
  max-width: 280px;
  margin-bottom: 12px;
}
.sg-points-pop-body {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  min-width: max-content;
  color: #333;
  font-size: 13px;
  line-height: 1.5;
  max-width: 280px;
  margin-bottom: 12px;
}
.sg-points-pop-inline {
  color: #666;
  white-space: nowrap;
  flex: none;
}
.sg-points-pop-input {
  width: 64px !important;
  flex: none;
}
.sg-del-pop:has(.sg-points-pop-body) .ant-popover-inner-content,
.sg-points-line-pop .ant-popover-inner-content {
  min-width: 320px;
}

.sg-points-pop-label {
  margin-bottom: 8px;
  color: #666;
}
/* Schedule pop: sit above row dropdown (antd dropdown z=1050 > popover 1030),
   so 确定 is not covered; never rely on min-width alone (overlay max-width clips). */
.sg-del-pop.ant-popover {
  z-index: 2000 !important;
}
.sg-schedule-pop.ant-popover {
  z-index: 2000 !important;
  max-width: none !important;
}
.sg-schedule-pop .ant-popover-content {
  width: auto;
  max-width: none !important;
}
.sg-schedule-pop .ant-popover-inner {
  width: 100%;
  min-width: 0;
  max-width: none !important;
  overflow: visible;
  padding: 12px 16px 14px;
  box-sizing: border-box;
}
.sg-schedule-pop .ant-popover-inner-content {
  overflow: visible;
  max-width: none !important;
}
.sg-schedule-pop-body {
  color: #333;
  font-size: 13px;
  line-height: 1.5;
  width: 100%;
  min-width: 0;
  margin-bottom: 14px;
  box-sizing: border-box;
}
.sg-schedule-pop-label {
  margin-bottom: 8px;
  color: #666;
}
/* No title for schedule pops */
.sg-schedule-pop .ant-popover-title {
  display: none;
}
/* Footer: 取消 / 确定 side by side */
.sg-schedule-pop .sg-del-pop-ft {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  width: 100%;
}
.sg-schedule-pop .sg-del-cancel,
.sg-schedule-pop .sg-del-ok {
  width: auto;
  text-align: center;
}
.sg-del-pop-ft {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  flex-wrap: nowrap;
  white-space: nowrap;
  min-height: 28px;
}
.sg-del-cancel,
.sg-del-ok {
  height: 28px;
  padding: 0 14px;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  line-height: 26px;
  flex-shrink: 0;
  white-space: nowrap;
}
.sg-del-cancel {
  border: 1px solid #d9d9d9;
  background: #fff;
  color: #333;
}
.sg-del-cancel:hover {
  border-color: #13c2c2;
  color: #13c2c2;
}
.sg-del-ok {
  border: 1px solid #13c2c2;
  background: #13c2c2;
  color: #fff;
}
.sg-del-ok:hover {
  background: #36cfc9;
  border-color: #36cfc9;
}
.sg-shelf-at {
  font-size: 12px;
  color: #333;
  white-space: nowrap;
}

.mall-price-field {
  margin-top: 12px;
}
.mall-price-label {
  margin-bottom: 6px;
  color: #666;
  font-size: 13px;
}

.sg-product-thumb-btn {
  display: inline-flex;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  line-height: 0;
}
.sg-product-thumb-btn:hover .sg-product-thumb {
  border-color: #02bfa1;
  box-shadow: 0 0 0 2px rgba(2, 191, 161, 0.15);
}
.sg-product-thumb {
  width: 36px;
  height: 36px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid #e8eeec;
  background: #f7faf9;
  vertical-align: middle;
}
.sg-product-thumb-upload {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #02bfa1;
  font-size: 18px;
  background: #eef8f6;
  border-style: dashed;
  border-color: #9ad9cd;
}
.sg-product-thumb-btn:hover .sg-product-thumb-upload {
  color: #018a74;
  border-color: #02bfa1;
  background: #e4f6f2;
}
.sg-product-image-input {
  display: none;
}

/* mall goods phone preview */
.sg-preview-modal .ant-modal-header {
  display: none !important;
}
.sg-preview-modal .ant-modal-content {
  background: transparent !important;
  box-shadow: none !important;
  padding: 0 !important;
  border-radius: 0 !important;
}
.sg-preview-modal .ant-modal-body {
  padding: 8px 0 16px !important;
}
.sg-preview-modal .ant-modal-close {
  top: 0;
  inset-inline-end: 0;
  width: 32px;
  height: 32px;
  color: rgba(255, 255, 255, 0.92);
  background: rgba(0, 0, 0, 0.35);
  border-radius: 50%;
}
.sg-preview-modal .ant-modal-close:hover {
  color: #fff;
  background: rgba(0, 0, 0, 0.5);
}
.sg-phone {
  display: flex;
  justify-content: center;
  padding: 8px 0;
}
.sg-phone-bezel {
  position: relative;
  width: 268px;
  padding: 10px;
  border-radius: 28px;
  background: linear-gradient(160deg, #2a2a2a 0%, #111 55%, #0a0a0a 100%);
  box-shadow:
    0 2px 0 rgba(255, 255, 255, 0.08) inset,
    0 16px 40px rgba(0, 0, 0, 0.35);
}
.sg-phone-notch {
  position: absolute;
  top: 16px;
  left: 50%;
  z-index: 2;
  width: 72px;
  height: 8px;
  margin-left: -36px;
  border-radius: 999px;
  background: #0a0a0a;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.04);
  pointer-events: none;
}
.sg-phone-screen {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 20px;
  background: #fff;
  min-height: 420px;
}
.sg-phone-hero {
  flex: none;
  width: 100%;
  aspect-ratio: 1 / 1;
  background: #f3f5f4;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
  isolation: isolate;
}
.sg-phone-hero-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
  display: block;
  background: #f3f5f4;
  position: relative;
  z-index: 0;
}
.sg-phone-hero-empty {
  color: #02bfa1;
  font-size: 32px;
  opacity: 0.85;
}
.sg-phone-info {
  flex: 1;
  padding: 16px 16px 22px;
  background: #fff;
  position: relative;
  z-index: 1;
}
.sg-phone-name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f1f1f;
  line-height: 1.45;
  word-break: break-word;
}
.sg-phone-price {
  margin-top: 10px;
  font-size: 22px;
  font-weight: 700;
  color: #e91e63;
  line-height: 1.2;
  letter-spacing: 0.2px;
}
.sg-phone-code {
  margin-top: 18px;
  font-size: 13px;
  color: #8c8c8c;
  line-height: 1.4;
  word-break: break-all;
}

.mall-picker-tip {
  margin: 0 0 10px;
  color: #ff4d4f;
  font-size: 13px;
  line-height: 1.5;
}

.sg-series-order-tip {
  margin-bottom: 12px;
  color: #64748b;
  font-size: 13px;
  line-height: 1.5;
}
.sg-series-order-empty {
  padding: 24px 0;
  text-align: center;
  color: #94a3b8;
  font-size: 13px;
}
.sg-series-order-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 420px;
  overflow: auto;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}
.sg-series-order-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid #f1f5f9;
  background: #fff;
  cursor: grab;
  user-select: none;
}
.sg-series-order-item:last-child {
  border-bottom: none;
}
.sg-series-order-item.dragging {
  opacity: 0.55;
}
.sg-series-order-item.over {
  background: #ecfeff;
  box-shadow: inset 0 2px 0 #14b8a6;
}
.sg-series-order-handle {
  color: #94a3b8;
  display: inline-flex;
  font-size: 14px;
}
.sg-series-order-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #0f172a;
  font-size: 13px;
}
</style>
