/**
 * 产品资料：列、详情、导出与光度表。结构对齐 gssPost 门店商品页。
 */
import type { TableColumnType } from "ant-design-vue"

export type ProductRow = {
  id: string
  sku: string
  catId: string
  cat: string
  brand: string
  name: string
  spec: string
  model: string
  series: string
  index: string
  price: number
  discount: number
  stockQty: number
  stockLoc: string
  rowKey: string
  material: string
  frameType: string
  coating: string
  polarized?: string
  focalType: string
  addPower?: string
  channel?: string
  eyeSide: string
  sph: string
  cyl: string
  period: string
  dia: string
  packSpec: string
  func: string
  volume: string
  color: string
  degree: string
  promoPrice: number | string
  inboundAt: string
  createdAt?: string
  tags: string[]
  supplier: string
  enabled: boolean
  clType: string
  clExpireDate?: string
  shelfLifeYears?: string
  waterContent?: string
  baseCurve?: string
  centerThickness?: string
  clMaterial?: string
  udiCode?: string
  warnDays?: string
  diCode?: string
  packageLevel?: string
  regCertNo?: string
  regCertExpire?: string
  registrant?: string
  filer?: string
  manufacturer?: string
  creditCode?: string
  produceLicense?: string
  filingNo?: string
  origin?: string
  produceLicenseExpire?: string
  year: string
  axis: string
  isCustomLens: string
  score: number
  lensSurcharge: number
  lensKind: string
  /** 左侧品类树的键，如 frame / sun */
  typeKey?: string
  yearFlag?: boolean
  settleLoc?: string
  externalCode?: string
  supplierPrice?: string
  homeProcess?: boolean
  style?: string
  attr?: string
  unit?: string
  /** 产品规格 */
  gauge?: string
  size?: string
  supplierModel?: string
  supplierColor?: string
  barcode?: string
  specialPrice?: boolean
  customMade?: boolean
  isGift?: boolean
  detail?: string
  purchasePrice?: number
  wholesalePrice?: number
  employeePrice?: number
  maxStock?: number
  minStock?: number
  images?: string[]
  designImages?: string[]
  /** 镜片光度范围（球镜/柱镜区间及对应价格） */
  powerRanges?: PowerRangeItem[]
  /** 镜片各光度点的库存预警（最大/最小） */
  lensStockWarn?: LensStockWarnItem[]
}

export type PowerRangeItem = {
  sphMin: number | undefined
  sphMax: number | undefined
  cylMin: number | undefined
  cylMax: number | undefined
  combinedPower: number | undefined
  purchasePrice: number | undefined
  retailPrice: number | undefined
  wholesalePrice: number | undefined
  employeePrice: number | undefined
}

/** 镜片库存预警：每个球镜/柱镜交叉点的最大、最小库存 */
export type LensStockWarnItem = {
  sph: number
  cyl: number
  max: number | null
  min: number | null
}

export type DegreeStockItem = { sph: number; cyl: number; qty: number }

export type CatKeyTuple = [title: string, key: string, width: number, filterable?: boolean]

export type CatSection = { cat: string; keys: CatKeyTuple[] }

export type ProductColumn = TableColumnType<ProductRow> & { filterable?: boolean }

export type CascaderOption = { label: string; value: string; children?: CascaderOption[] }

export type FilterOption = { value: string; label: string }

export type CatTab = { catId: string; cat: string }

export type CatLayout = "frame" | "lens" | "cl" | "read" | "care" | "acc" | "service" | "pkg"

const FRAME_KEYS: CatKeyTuple[] = [
  ["品牌", "brand", 110, true],
  ["系列", "series", 110, true],
  ["型号", "model", 110, true],
  ["色号", "spec", 110, true],
  ["材质", "material", 96, true],
  ["零售价", "price", 88],
  ["折扣", "discount", 72],
  ["折后价", "afterPrice", 88],
  ["库存", "stockQty", 64]
]
const LENS_KEYS: CatKeyTuple[] = [
  ["品牌", "brand", 110, true],
  ["系列", "series", 110, true],
  ["折射率", "index", 88, true],
  ["镀膜", "coating", 130, true],
  ["焦型", "focalType", 72, true],
  ["左右眼", "eyeSide", 72],
  ["零售价", "price", 88],
  ["折扣", "discount", 72],
  ["折后价", "afterPrice", 88],
  ["库存", "stockQty", 64]
]
const CL_KEYS: CatKeyTuple[] = [
  ["品牌", "brand", 110, true],
  ["系列", "series", 110, true],
  ["周期", "period", 88, true],
  ["DIA", "dia", 64],
  ["包装规格", "packSpec", 96],
  ["零售价", "price", 88],
  ["折扣", "discount", 72],
  ["折后价", "afterPrice", 88],
  ["库存", "stockQty", 64]
]
const READ_KEYS: CatKeyTuple[] = [
  ["品牌", "brand", 110, true],
  ["型号", "model", 110, true],
  ["焦型", "focalType", 88, true],
  ["度数", "degree", 80],
  ["色号", "spec", 100],
  ["材质", "material", 80],
  ["零售价", "price", 88],
  ["折扣", "discount", 72],
  ["折后价", "afterPrice", 88]
]
const CARE_KEYS: CatKeyTuple[] = [
  ["品牌", "brand", 96, true],
  ["型号", "model", 110, true],
  ["系列", "series", 110, true],
  ["色号", "spec", 110, true],
  ["零售价", "price", 88]
]
const ACC_KEYS: CatKeyTuple[] = [
  ["配件名称", "name", 180, true],
  ["品牌", "brand", 96],
  ["颜色", "color", 80],
  ["零售价", "price", 88]
]
const SERVICE_KEYS: CatKeyTuple[] = [
  ["服务名称", "name", 220, true],
  ["零售价", "price", 88]
]
const PKG_KEYS: CatKeyTuple[] = [
  ["套餐名称", "name", 360, true],
  ["零售价", "price", 88]
]

const CAT_LAYOUTS: Record<CatLayout, CatKeyTuple[]> = {
  frame: FRAME_KEYS,
  lens: LENS_KEYS,
  cl: CL_KEYS,
  read: READ_KEYS,
  care: CARE_KEYS,
  acc: ACC_KEYS,
  service: SERVICE_KEYS,
  pkg: PKG_KEYS
}

/** 商品资料页左侧分类。只有这 8 种，不再保留护理液、加工工艺等旧品类。 */
export const PRODUCT_CAT_CHILDREN: { key: string; title: string }[] = [
  { key: "frame", title: "光学架" },
  { key: "sun", title: "太阳镜" },
  { key: "lens", title: "镜片" },
  { key: "cl", title: "隐形眼镜" },
  { key: "read", title: "老花镜" },
  { key: "kit", title: "套镜" },
  { key: "case", title: "眼镜盒" },
  { key: "gift", title: "赠品" },
  { key: "other", title: "其他" }
]

const PRODUCT_TREE_KEYS = new Set(["all", ...PRODUCT_CAT_CHILDREN.map((item) => item.key)])

export function isProductTreeKey(key: string) {
  return PRODUCT_TREE_KEYS.has(key)
}

function isCase(row: ProductRow) {
  return row.cat === "眼镜盒" || (row.cat === "配件" && row.name.includes("盒"))
}

function isOther(row: ProductRow) {
  return row.cat === "其他" || row.cat === "护理产品" || row.cat === "服务" || (row.cat === "配件" && !row.name.includes("盒"))
}

export function matchProductTree(row: ProductRow, key: string) {
  if (!key || key === "all") return true
  if (row.typeKey) return row.typeKey === key
  if (key === "frame") return row.cat === "镜架"
  if (key === "lens") return row.cat === "镜片"
  if (key === "cl") return row.cat === "隐形眼镜"
  if (key === "read") return row.cat === "老花镜"
  if (key === "kit") return row.cat === "套餐" || row.cat === "套镜"
  if (key === "case") return isCase(row)
  if (key === "gift") return row.cat === "赠品" || row.typeKey === "gift"
  if (key === "other") return isOther(row)
  return false
}

export function catalogCatLabel(row: ProductRow) {
  if (row.typeKey) {
    const hit = PRODUCT_CAT_CHILDREN.find((item) => item.key === row.typeKey)
    if (hit) return hit.title
  }
  if (row.cat === "镜架") return "光学架"
  if (row.cat === "套餐" || row.cat === "套镜") return "套镜"
  if (isCase(row)) return "眼镜盒"
  if (isOther(row)) return "其他"
  return row.cat
}

export function createCatOfTree(key: string) {
  const map: Record<string, string> = {
    frame: "镜架",
    sun: "镜架",
    lens: "镜片",
    cl: "隐形眼镜",
    read: "老花镜",
    kit: "套镜",
    case: "眼镜盒",
    gift: "赠品",
    other: "其他"
  }
  return map[key] || "镜架"
}

export function treeKeyOfRow(row: ProductRow) {
  return PRODUCT_CAT_CHILDREN.find((item) => matchProductTree(row, item.key))?.key || "all"
}

export type CatalogTreeNode = {
  key: string
  title: string
  cat: string
  brand: string
  series: string
  children: CatalogTreeNode[]
}

function treeLabel(value: string) {
  const text = String(value || "").trim()
  if (!text || text === "—") return ""
  return text
}

/** 左侧树：品类 → 品牌 → 系列 */
export function buildCatalogTree(rows: ProductRow[]): CatalogTreeNode[] {
  return PRODUCT_CAT_CHILDREN.map((cat) => {
    const brands = new Map<string, Set<string>>()
    for (const row of rows) {
      if (!matchProductTree(row, cat.key)) continue
      const brand = treeLabel(row.brand)
      if (!brand) continue
      const seriesSet = brands.get(brand) ?? new Set<string>()
      brands.set(brand, seriesSet)
      const series = treeLabel(row.series)
      if (series) seriesSet.add(series)
    }
    const children = [...brands.entries()]
      .sort(([a], [b]) => a.localeCompare(b, "zh"))
      .map(([brand, seriesSet]) => ({
        key: `${cat.key}|${brand}`,
        title: brand,
        cat: cat.key,
        brand,
        series: "",
        children: [...seriesSet]
          .sort((a, b) => a.localeCompare(b, "zh"))
          .map((series) => ({
            key: `${cat.key}|${brand}|${series}`,
            title: series,
            cat: cat.key,
            brand,
            series,
            children: []
          }))
      }))
    return { key: cat.key, title: cat.title, cat: cat.key, brand: "", series: "", children }
  })
}

function filledText(value: unknown) {
  if (value == null || value === "" || value === "—") return ""
  return String(value)
}

export function colorCodeOf(row: ProductRow) {
  const spec = filledText(row.spec)
  const color = filledText(row.color)
  if (spec && color && !spec.includes(color)) return `${spec}/${color}`
  return spec || color
}

export function varietyOf(row: ProductRow) {
  return filledText(row.lensKind) || filledText(row.focalType) || filledText(row.clType) || filledText(row.period)
}

export function formatCreatedAt(value?: string) {
  if (!value) return ""
  const m = String(value).match(/(\d{4}-\d{2}-\d{2})/)
  return m ? m[1] : String(value).slice(0, 10)
}
export function catalogCellText(row: ProductRow, key: string) {
  if (key === "createdAt") return formatCreatedAt(row.createdAt)
  if (key === "cat") return catalogCatLabel(row)
  if (key === "spec") return colorCodeOf(row)
  if (key === "lensKind") return varietyOf(row)
  return filledText(row[key as keyof ProductRow])
}

export const CATALOG_KEYS: CatKeyTuple[] = [
  ["序号", "seq", 58],
  ["", "pick", 42],
  ["品类", "cat", 88, true],
  ["品牌", "brand", 100, true],
  ["产品代号", "sku", 110, true],
  ["系列", "series", 120, true],
  ["产品名称", "name", 240, true],
  ["型号", "model", 110, true],
  ["色号", "spec", 120, true],
  ["材质", "material", 88, true],
  ["折射率", "index", 80, true],
  ["品种", "lensKind", 96, true],
  ["框镜类型", "frameType", 96, true],
  ["创建日期", "createdAt", 120]
]

export function catalogColumns(): ProductColumn[] {
  return CATALOG_KEYS.map(([title, key, width, filterable]) => ({
    title,
    dataIndex: key,
    key,
    width,
    ellipsis: key !== "seq" && key !== "pick",
    filterable: !!filterable,
    align: key === "seq" || key === "pick" ? "center" : "left"
  }))
}

export const CAT_TABS: CatTab[] = [
  { catId: "镜架", cat: "镜架" },
  { catId: "镜片", cat: "镜片" },
  { catId: "隐形眼镜", cat: "隐形眼镜" },
  { catId: "老花镜", cat: "老花镜" },
  { catId: "护理产品", cat: "护理产品" },
  { catId: "配件", cat: "配件" },
  { catId: "服务", cat: "服务" },
  { catId: "套餐", cat: "套餐" }
]

export function catLayoutOf(catId?: string, cat?: string): CatLayout {
  const n = String(cat || catId || "").trim()
  if (n.includes("套餐") || n.includes("套镜")) return "pkg"
  if (n.includes("服务") || n.includes("加工")) return "service"
  if (n.includes("配件")) return "acc"
  if (n.includes("护理")) return "care"
  if (n.includes("老花")) return "read"
  if (n.includes("隐形")) return "cl"
  if (n.includes("镜片")) return "lens"
  return "frame"
}

export function sectionFor(catId: string, cat: string): CatSection {
  return { cat, keys: CAT_LAYOUTS[catLayoutOf(catId, cat)] }
}

export const EXPORT_FIELDS = [
  { title: "品类", dataIndex: "cat", key: "cat" },
  { title: "商品名称", dataIndex: "name", key: "name" },
  { title: "品牌", dataIndex: "brand", key: "brand" },
  { title: "型号", dataIndex: "model", key: "model" },
  { title: "色号", dataIndex: "spec", key: "spec" },
  { title: "系列", dataIndex: "series", key: "series" },
  { title: "材质", dataIndex: "material", key: "material" },
  { title: "框型", dataIndex: "frameType", key: "frameType" },
  { title: "折射率", dataIndex: "index", key: "index" },
  { title: "镀膜", dataIndex: "coating", key: "coating" },
  { title: "焦型", dataIndex: "focalType", key: "focalType" },
  { title: "左右眼", dataIndex: "eyeSide", key: "eyeSide" },
  { title: "球镜S", dataIndex: "sph", key: "sph" },
  { title: "柱镜C", dataIndex: "cyl", key: "cyl" },
  { title: "周期", dataIndex: "period", key: "period" },
  { title: "DIA", dataIndex: "dia", key: "dia" },
  { title: "包装规格", dataIndex: "packSpec", key: "packSpec" },
  { title: "功能", dataIndex: "func", key: "func" },
  { title: "容量", dataIndex: "volume", key: "volume" },
  { title: "度数", dataIndex: "degree", key: "degree" },
  { title: "颜色", dataIndex: "color", key: "color" },
  { title: "零售价", dataIndex: "price", key: "price", align: "right" as const },
  { title: "折扣", dataIndex: "discount", key: "discount", align: "right" as const },
  { title: "折后价", dataIndex: "afterPrice", key: "afterPrice", align: "right" as const },
  { title: "库存", dataIndex: "stockQty", key: "stockQty", align: "right" as const }
].map((c, i) => ({ ...c, letter: String.fromCharCode(65 + i) }))

export const LOCS = ["前柜 A3", "前柜 B1", "后仓 L-02", "冷柜 C1", "配件柜", "前柜 S2"]
export const TAGS = ["热销", "联营", "医保", "团购", "学生", "老花"]
export const SUPPLIERS = ["华东光学仓", "蔡司官方", "依视路直供", "强生视康", "门店统采", "区域经销"]

export const locOptions = LOCS.map((v) => ({ label: v, value: v }))
export const tagOptions = TAGS.map((v) => ({ label: v, value: v }))
export const supplierOptions = SUPPLIERS.map((v) => ({ label: v, value: v }))

export function afterPriceOf(price: number, discount?: number) {
  const p = Number(price)
  const d = Number(discount)
  if (!Number.isFinite(p)) return 0
  if (!Number.isFinite(d)) return p
  return Math.round((p * d) / 10)
}

export function formatMoney(n: number) {
  return "¥" + Number(n || 0).toLocaleString("zh-CN")
}

export type DetailFieldDef = {
  key: keyof ProductRow
  label: string
  span?: 2
  kind?: "text" | "money" | "promo" | "enabled" | "score"
}

const F = {
  cat: { key: "cat", label: "品类" },
  brand: { key: "brand", label: "品牌" },
  model: { key: "model", label: "型号" },
  spec: { key: "spec", label: "色号" },
  series: { key: "series", label: "系列" },
  material: { key: "material", label: "材质" },
  frameType: { key: "frameType", label: "框型" },
  color: { key: "color", label: "颜色" },
  year: { key: "year", label: "年份" },
  index: { key: "index", label: "折射率" },
  coating: { key: "coating", label: "镀膜" },
  focalType: { key: "focalType", label: "焦型" },
  eyeSide: { key: "eyeSide", label: "左右眼" },
  sph: { key: "sph", label: "球镜S" },
  cyl: { key: "cyl", label: "柱镜C" },
  axis: { key: "axis", label: "轴位" },
  lensKind: { key: "lensKind", label: "镜片类型" },
  isCustomLens: { key: "isCustomLens", label: "定制镜片" },
  period: { key: "period", label: "周期" },
  dia: { key: "dia", label: "DIA" },
  packSpec: { key: "packSpec", label: "包装规格" },
  clType: { key: "clType", label: "隐形类型" },
  degree: { key: "degree", label: "度数" },
  func: { key: "func", label: "功能" },
  volume: { key: "volume", label: "容量" },
  price: { key: "price", label: "零售价", kind: "money" },
  promo: { key: "promoPrice", label: "活动价", kind: "promo" },
  inboundAt: { key: "inboundAt", label: "入库日期" },
  enabled: { key: "enabled", label: "是否启用", kind: "enabled" },
  stockQty: { key: "stockQty", label: "当前库存" },
  lensSurcharge: { key: "lensSurcharge", label: "镜片附加费", kind: "money" },
  score: { key: "score", label: "积分规则", kind: "score" },
  sku: { key: "sku", label: "商品代号", span: 2 }
} satisfies Record<string, DetailFieldDef>

const DETAIL_HEAD: DetailFieldDef[] = [
  { key: "name", label: "商品名称", span: 2 },
  F.sku,
  F.score,
  F.stockQty
]

const DETAIL_BY_LAYOUT: Record<CatLayout, { base: DetailFieldDef[]; extra: DetailFieldDef[] }> = {
  frame: {
    base: [F.cat, F.brand, F.model, F.spec, F.series, F.material, F.frameType, F.color, F.year, F.price, F.promo, F.inboundAt, F.enabled],
    extra: []
  },
  lens: {
    base: [F.cat, F.brand, F.series, F.model, F.index, F.coating, F.focalType, F.eyeSide, F.sph, F.cyl, F.axis, F.lensKind, F.isCustomLens, F.price, F.promo, F.inboundAt, F.enabled],
    extra: [F.lensSurcharge]
  },
  cl: {
    base: [F.cat, F.brand, F.series, F.period, F.clType, F.dia, F.packSpec, F.spec, F.axis, F.price, F.promo, F.inboundAt, F.enabled],
    extra: []
  },
  read: {
    base: [F.cat, F.brand, F.model, F.focalType, F.degree, F.spec, F.material, F.price, F.promo, F.inboundAt, F.enabled],
    extra: []
  },
  care: {
    base: [F.cat, F.brand, F.model, F.series, F.spec, F.price, F.promo, F.inboundAt, F.enabled],
    extra: []
  },
  acc: {
    base: [F.cat, F.brand, F.color, F.price, F.promo, F.inboundAt, F.enabled],
    extra: []
  },
  service: {
    base: [F.cat, F.brand, F.price, F.inboundAt, F.enabled],
    extra: []
  },
  pkg: {
    base: [F.cat, F.brand, F.series, F.price, F.promo, F.inboundAt, F.enabled],
    extra: []
  }
}

export function detailSections(cat: string, catId = "") {
  const layout = DETAIL_BY_LAYOUT[catLayoutOf(catId, cat)]
  return { base: [...DETAIL_HEAD, ...layout.base], extra: layout.extra }
}

export function formatDetailValue(record: ProductRow, field: DetailFieldDef) {
  if (field.kind === "money") {
    const n = field.key === "lensSurcharge" ? record.lensSurcharge : Number(record[field.key] ?? 0)
    return formatMoney(n)
  }
  if (field.kind === "promo") {
    const v = record.promoPrice
    if (v === "—" || v == null || v === "") return "—"
    return formatMoney(Number(v))
  }
  if (field.kind === "enabled") return record.enabled ? "启用" : "停用"
  if (field.kind === "score") return `消耗 ${record.score} 元奖励 1 积分`
  const v = record[field.key]
  if (v == null || v === "") return "—"
  return String(v)
}

function moneyCol(key: string) {
  return key === "price" || key === "afterPrice"
}

export function columnsFor(section: CatSection, catId = ""): ProductColumn[] {
  const cols: ProductColumn[] = section.keys.map((item) => {
    const [title, key, width, filterable] = item
    const col: ProductColumn = {
      title,
      dataIndex: key,
      key,
      width,
      ellipsis: true,
      filterable: !!filterable,
      align: moneyCol(key) || key === "discount" || key === "stockQty" ? "right" : "left"
    }
    return col
  })
  const lens = catLayoutOf(catId, section.cat) === "lens"
  cols.push({ title: "操作", key: "action", width: lens ? 112 : 72, className: "sg-act-col" })
  return cols
}

export function sortProductRows(list: ProductRow[]) {
  return list.slice().sort((a, b) => {
    const brandCmp = String(a.brand || "").localeCompare(String(b.brand || ""), "zh")
    if (brandCmp) return brandCmp
    return String(a.name || "").localeCompare(String(b.name || ""), "zh")
  })
}

export function matchCatPath(record: ProductRow, paths: string[][]) {
  if (!paths?.length) return true
  return paths.some((path) => {
    const [brand, series] = path
    if (brand && record.brand !== brand) return false
    if (series && record.series !== series) return false
    return true
  })
}

export function buildCatBrandOptions(rows: ProductRow[]): CascaderOption[] {
  const brands: Record<string, Set<string>> = {}
  for (const r of rows) {
    const brand = r.brand || "—"
    const seriesSet = brands[brand] ?? (brands[brand] = new Set())
    if (r.series && r.series !== "—") seriesSet.add(r.series)
  }
  return Object.entries(brands)
    .sort(([a], [b]) => a.localeCompare(b, "zh"))
    .map(([brand, series]) => ({
      label: brand,
      value: brand,
      children: [...series].sort((a, b) => a.localeCompare(b, "zh")).map((s) => ({ label: s, value: s }))
    }))
}

export function cellValue(record: ProductRow, colKey: string) {
  if (colKey === "spec") return colorCodeOf(record) || "__empty__"
  if (colKey === "lensKind") return varietyOf(record) || "__empty__"
  const v = record[colKey as keyof ProductRow]
  if (v == null || v === "" || v === "—") return "__empty__"
  return v
}

export function cellLabel(record: ProductRow, colKey: string) {
  if (colKey === "createdAt") return formatCreatedAt(record.createdAt)
  if (colKey === "cat") return catalogCatLabel(record)
  if (colKey === "spec") return colorCodeOf(record) || "空"
  if (colKey === "lensKind") return varietyOf(record) || "空"
  const v = record[colKey as keyof ProductRow]
  if (v == null || v === "" || v === "—") return "空"
  return String(v)
}

export function formatExportCell(record: ProductRow, col: { key: string; dataIndex: string }) {
  const v = record[col.dataIndex as keyof ProductRow]
  if (col.key === "createdAt" || col.dataIndex === "createdAt") return formatCreatedAt(v == null ? undefined : String(v))
  if (col.key === "price") return formatMoney(Number(v))
  if (col.key === "afterPrice") return formatMoney(afterPriceOf(record.price, record.discount))
  if (col.key === "promoPrice") return v === "—" || v == null || v === "" ? "—" : formatMoney(Number(v))
  if (col.key === "discount") return v == null || v === "" ? "—" : `${v} 折`
  return v == null ? "" : String(v)
}

export function searchBlob(r: ProductRow) {
  return `${catalogCatLabel(r)} ${r.sku} ${r.name} ${r.brand} ${r.cat} ${r.model} ${r.spec} ${r.series} ${r.index} ${r.material}`.toLowerCase()
}

export function csvCell(v: unknown) {
  const s = v == null ? "" : String(v)
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function showDegreeStockLink(record: ProductRow) {
  return catLayoutOf(record.catId, record.cat) === "lens"
}

export const DEGREE_SIGN_OPTIONS = [
  { value: "-/-", label: "-/-" },
  { value: "+/+", label: "+/+" },
  { value: "+/-", label: "+/-" },
  { value: "-/+", label: "-/+" }
] as const

export type DegreeSignPair = (typeof DEGREE_SIGN_OPTIONS)[number]["value"]

const DEGREE_SPH_ABS = 8
const DEGREE_CYL_ABS = 4

export function formatDegree(v: number | string) {
  const n = Number(v)
  if (!Number.isFinite(n) || n === 0) return "0.00"
  const abs = Math.abs(n).toFixed(2)
  return n > 0 ? `+${abs}` : `-${abs}`
}

function diopterSteps(from: number, to: number, step = 0.25) {
  const out: string[] = []
  const n = Math.round(Math.abs(to - from) / step)
  const dir = to >= from ? 1 : -1
  for (let i = 0; i <= n; i++) out.push((from + dir * i * step).toFixed(2))
  return out
}

function degreeSignParts(pair: DegreeSignPair) {
  const [a, b] = pair.split("/")
  return { sph: (a === "+" ? 1 : -1) as 1 | -1, cyl: (b === "+" ? 1 : -1) as 1 | -1 }
}

function maxAbsDiopter(list: DegreeStockItem[], key: "sph" | "cyl", fallback: number) {
  let max = fallback
  for (const it of list) {
    const n = Math.abs(Number(it[key]))
    if (Number.isFinite(n) && n > max) max = Math.ceil(n / 0.25) * 0.25
  }
  return max
}


/** 库存预警二维表轴：行=球镜，列=柱镜（与截图一致） */
export function lensWarnAxes(pair: DegreeSignPair = "-/-", sphAbs = DEGREE_SPH_ABS, cylAbs = 6) {
  const { sph: sphSign, cyl: cylSign } = degreeSignParts(pair)
  const sphs = diopterSteps(0, sphSign * sphAbs)
  const cyls = diopterSteps(0, cylSign * cylAbs)
  return { sphs, cyls }
}

export function degreeStockGrid(list: DegreeStockItem[], pair: DegreeSignPair = "-/-") {
  const sphMax = maxAbsDiopter(list, "sph", DEGREE_SPH_ABS)
  const cylMax = maxAbsDiopter(list, "cyl", DEGREE_CYL_ABS)
  const { sph: sphSign, cyl: cylSign } = degreeSignParts(pair)
  const sphs = diopterSteps(0, sphSign * sphMax)
  const cyls = diopterSteps(0, cylSign * cylMax)
  const qtyMap = new Map<string, number>()
  for (const it of list) {
    const sph = Number(it.sph)
    const cyl = Number(it.cyl)
    if (!Number.isFinite(sph) || !Number.isFinite(cyl)) continue
    const k = `${sph.toFixed(2)}|${cyl.toFixed(2)}`
    qtyMap.set(k, (qtyMap.get(k) || 0) + (Number(it.qty) || 0))
  }
  const rows = cyls.map((cyl) => ({
    cyl,
    cells: sphs.map((sph) => ({
      sph,
      qty: qtyMap.get(`${Number(sph).toFixed(2)}|${Number(cyl).toFixed(2)}`) || 0
    }))
  }))
  return { sphs, rows }
}
