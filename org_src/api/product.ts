import { mockReject, mockResolve } from "@/mock"
import {
  addCatalogProduct,
  degreeStockMap,
  productCatalog,
  removeCatalogProducts,
  setCatalogEnabled,
  setCatalogPrice,
  updateCatalogProduct
} from "@/views/product/productData"
import {
  CAT_TABS,
  buildCatalogTree,
  buildCatBrandOptions,
  CATALOG_KEYS,
  cellLabel,
  cellValue,
  isProductTreeKey,
  matchCatPath,
  matchProductTree,
  searchBlob,
  sectionFor,
  sortProductRows,
  type CascaderOption,
  type CatalogTreeNode,
  type DegreeStockItem,
  type FilterOption,
  type LensStockWarnItem,
  type PowerRangeItem,
  type ProductRow
} from "@/views/product/productUi"

/** 产品资料列表查询。筛选在服务端完成，页面只渲染返回结果。 */
export type ProductListQuery = {
  cat: string
  q?: string
  brands?: string[][]
  priceMin?: number | null
  priceMax?: number | null
  /** 列头勾选。空数组表示该列无命中；不传表示不限 */
  columns?: Record<string, string[] | undefined>
  /** 列头搜索框，参与行过滤 */
  columnQueries?: Record<string, string>
  sortKey?: string
  sortOrder?: "asc" | "desc" | ""
  /** 左侧树选中的品牌、系列。空字符串表示不限 */
  treeBrand?: string
  treeSeries?: string
  page: number
  pageSize: number
  /** 商品资料总表：列筛选按统一表头，而不是分品类页签 */
  catalog?: boolean
}

export type ProductListResult = {
  list: ProductRow[]
  /** 当前筛选条件下的总条数，不含品类页签上的全量数量 */
  total: number
  counts: { catId: string; cat: string; total: number }[]
  brandOptions: CascaderOption[]
  /** 各列可选项：已套用其他列条件，不含本列自身的勾选和搜索 */
  columnOptions: Record<string, FilterOption[]>
  catalogTree: CatalogTreeNode[]
}

function inCat(row: ProductRow, catId: string) {
  if (isProductTreeKey(catId)) return matchProductTree(row, catId)
  return row.catId === catId || row.cat === catId
}

function numberOrNull(value: number | null | undefined) {
  if (value == null || Number.isNaN(Number(value))) return null
  return Number(value)
}

function matchBase(row: ProductRow, query: ProductListQuery) {
  const keyword = (query.q || "").trim().toLowerCase()
  if (keyword && !searchBlob(row).includes(keyword)) return false
  if (!matchCatPath(row, query.brands || [])) return false
  const min = numberOrNull(query.priceMin)
  const max = numberOrNull(query.priceMax)
  if (min != null && Number(row.price) < min) return false
  if (max != null && Number(row.price) > max) return false
  if (query.treeBrand && row.brand !== query.treeBrand) return false
  if (query.treeSeries && row.series !== query.treeSeries) return false
  return true
}

function textHit(row: ProductRow, colKey: string, query: string) {
  const keyword = query.trim().toLowerCase()
  if (!keyword) return true
  return cellLabel(row, colKey).toLowerCase().includes(keyword) || String(cellValue(row, colKey)).toLowerCase().includes(keyword)
}

function filterableKeys(query: ProductListQuery) {
  if (query.catalog) return CATALOG_KEYS.filter((item) => item[3])
  const tab = CAT_TABS.find((item) => item.catId === query.cat)
  return sectionFor(query.cat, tab?.cat || query.cat).keys.filter((item) => item[3])
}

function matchColumns(row: ProductRow, query: ProductListQuery, skipCol?: string) {
  const columns = query.columns || {}
  const queries = query.columnQueries || {}
  return filterableKeys(query).every((item) => {
    const colKey = item[1]
    if (colKey === skipCol) return true
    const text = queries[colKey] || ""
    if (text && !textHit(row, colKey, text)) return false
    const selected = columns[colKey]
    if (selected == null) return true
    return selected.includes(String(cellValue(row, colKey)))
  })
}

function sortOptions(options: FilterOption[]) {
  return options.sort((a, b) => {
    if (a.value === "__empty__" || a.label === "空") return 1
    if (b.value === "__empty__" || b.label === "空") return -1
    return a.label.localeCompare(b.label, "zh", { numeric: true })
  })
}

function columnOptionsOf(rows: ProductRow[], query: ProductListQuery) {
  const out: Record<string, FilterOption[]> = {}
  for (const item of filterableKeys(query)) {
    const map = new Map<string, string>()
    for (const row of rows) {
      if (!matchColumns(row, query, item[1])) continue
      const value = String(cellValue(row, item[1]))
      if (!map.has(value)) map.set(value, cellLabel(row, item[1]))
    }
    out[item[1]] = sortOptions([...map.entries()].map(([value, label]) => ({ value, label })))
  }
  return out
}

function sortMatched(rows: ProductRow[], query: ProductListQuery) {
  const key = query.sortKey
  const order = query.sortOrder
  if (!key || (order !== "asc" && order !== "desc")) return sortProductRows(rows)
  const dir = order === "desc" ? -1 : 1
  return rows.slice().sort((a, b) => {
    const av = cellLabel(a, key)
    const bv = cellLabel(b, key)
    const aEmpty = !av || av === "空"
    const bEmpty = !bv || bv === "空"
    if (aEmpty && bEmpty) return 0
    if (aEmpty) return 1
    if (bEmpty) return -1
    return av.localeCompare(bv, "zh", { numeric: true, sensitivity: "base" }) * dir
  })
}

export const getProductPageAPI = (query: ProductListQuery) => {
  const counts = CAT_TABS.map((tab) => ({
    catId: tab.catId,
    cat: tab.cat,
    total: productCatalog.filter((row) => inCat(row, tab.catId)).length
  }))
  const catRows = productCatalog.filter((row) => inCat(row, query.cat))
  const baseRows = catRows.filter((row) => matchBase(row, query))
  const matched = sortMatched(baseRows.filter((row) => matchColumns(row, query)).map((row) => ({ ...row })), query)
  const pageSize = Math.max(1, query.pageSize || 20)
  const page = Math.max(1, query.page || 1)
  const start = (page - 1) * pageSize
  const data: ProductListResult = {
    list: matched.slice(start, start + pageSize),
    total: matched.length,
    counts,
    brandOptions: buildCatBrandOptions(catRows),
    columnOptions: columnOptionsOf(baseRows, query),
    catalogTree: buildCatalogTree(productCatalog)
  }
  return mockResolve(data, 320)
}

export const getProductDegreeAPI = (id: string) => mockResolve<DegreeStockItem[]>(degreeStockMap[id] || [], 280)

export type ProductSaveInput = {
  cat: string
  typeKey: string
  name: string
  brand: string
  series: string
  model: string
  spec: string
  index: string
  coating: string
  polarized: string
  degree: string
  focalType: string
  addPower: string
  channel: string
  clType: string
  clExpireDate: string
  axis: string
  shelfLifeYears: string
  waterContent: string
  dia: string
  baseCurve: string
  centerThickness: string
  packSpec: string
  clMaterial: string
  udiCode: string
  warnDays: string
  diCode: string
  packageLevel: string
  regCertNo: string
  regCertExpire: string
  registrant: string
  filer: string
  manufacturer: string
  creditCode: string
  produceLicense: string
  filingNo: string
  origin: string
  produceLicenseExpire: string
  sku: string
  year: string
  yearFlag: boolean
  enabled: boolean
  stockLoc: string
  settleLoc: string
  externalCode: string
  supplierPrice: string
  homeProcess: boolean
  material: string
  style: string
  attr: string
  unit: string
  gauge: string
  size: string
  supplierModel: string
  supplierColor: string
  barcode: string
  specialPrice: boolean
  customMade: boolean
  isGift: boolean
  frameType: string
  detail: string
  purchasePrice: number
  wholesalePrice: number
  price: number
  employeePrice: number
  maxStock: number
  minStock: number
  images: string[]
  designImages: string[]
  powerRanges: PowerRangeItem[]
  lensStockWarn: LensStockWarnItem[]
}

function num(value: number) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function patchOf(input: ProductSaveInput): Partial<ProductRow> {
  return {
    cat: input.cat,
    typeKey: input.typeKey,
    name: input.name.trim(),
    brand: input.brand.trim(),
    series: input.series.trim(),
    model: input.model.trim(),
    spec: input.spec.trim(),
    index: input.index.trim(),
    coating: input.coating.trim(),
    polarized: input.polarized.trim(),
    degree: input.degree.trim(),
    focalType: input.focalType.trim(),
    addPower: input.addPower.trim(),
    channel: input.channel.trim(),
    clType: input.clType.trim(),
    clExpireDate: input.clExpireDate.trim(),
    axis: input.axis.trim(),
    shelfLifeYears: input.shelfLifeYears.trim(),
    waterContent: input.waterContent.trim(),
    dia: input.dia.trim(),
    baseCurve: input.baseCurve.trim(),
    centerThickness: input.centerThickness.trim(),
    packSpec: input.packSpec.trim(),
    clMaterial: input.clMaterial.trim(),
    udiCode: input.udiCode.trim(),
    warnDays: input.warnDays.trim(),
    diCode: input.diCode.trim(),
    packageLevel: input.packageLevel.trim(),
    regCertNo: input.regCertNo.trim(),
    regCertExpire: input.regCertExpire.trim(),
    registrant: input.registrant.trim(),
    filer: input.filer.trim(),
    manufacturer: input.manufacturer.trim(),
    creditCode: input.creditCode.trim(),
    produceLicense: input.produceLicense.trim(),
    filingNo: input.filingNo.trim(),
    origin: input.origin.trim(),
    produceLicenseExpire: input.produceLicenseExpire.trim(),
    sku: input.sku.trim(),
    year: input.year.trim(),
    yearFlag: input.yearFlag,
    enabled: input.enabled,
    stockLoc: input.stockLoc.trim(),
    settleLoc: input.settleLoc.trim(),
    externalCode: input.externalCode.trim(),
    supplierPrice: input.supplierPrice.trim(),
    homeProcess: input.homeProcess,
    material: input.material.trim(),
    style: input.style.trim(),
    attr: input.attr.trim(),
    unit: input.unit.trim() || "副",
    gauge: input.gauge.trim(),
    size: input.size.trim(),
    supplierModel: input.supplierModel.trim(),
    supplierColor: input.supplierColor.trim(),
    barcode: input.barcode.trim(),
    specialPrice: input.specialPrice,
    customMade: input.customMade,
    isGift: input.isGift,
    frameType: input.frameType.trim(),
    detail: input.detail,
    purchasePrice: num(input.purchasePrice),
    wholesalePrice: num(input.wholesalePrice),
    price: num(input.price),
    employeePrice: num(input.employeePrice),
    maxStock: num(input.maxStock),
    minStock: num(input.minStock),
    images: input.images.slice(),
    designImages: input.designImages.slice(),
    powerRanges: (input.powerRanges || []).map((row) => ({
      sphMin: row.sphMin == null || (row.sphMin as unknown) === "" ? undefined : Number(row.sphMin),
      sphMax: row.sphMax == null || (row.sphMax as unknown) === "" ? undefined : Number(row.sphMax),
      cylMin: row.cylMin == null || (row.cylMin as unknown) === "" ? undefined : Number(row.cylMin),
      cylMax: row.cylMax == null || (row.cylMax as unknown) === "" ? undefined : Number(row.cylMax),
      combinedPower: (row as any).combinedPower == null || (row as any).combinedPower === "" ? undefined : Number((row as any).combinedPower),
      purchasePrice: row.purchasePrice == null || (row.purchasePrice as unknown) === "" ? undefined : Number(row.purchasePrice),
      retailPrice: row.retailPrice == null || (row.retailPrice as unknown) === "" ? undefined : Number(row.retailPrice),
      wholesalePrice: row.wholesalePrice == null || (row.wholesalePrice as unknown) === "" ? undefined : Number(row.wholesalePrice),
      employeePrice: row.employeePrice == null || (row.employeePrice as unknown) === "" ? undefined : Number(row.employeePrice)
    })),
    lensStockWarn: (input.lensStockWarn || []).map((row) => ({
      sph: Number(row.sph),
      cyl: Number(row.cyl),
      max: row.max == null || (row.max as unknown) === "" ? null : Number(row.max),
      min: row.min == null || (row.min as unknown) === "" ? null : Number(row.min)
    })).filter((row) => Number.isFinite(row.sph) && Number.isFinite(row.cyl) && (row.max != null || row.min != null))
  }
}

export const updateProductAPI = (input: ProductSaveInput & { id: string }) => {
  const item = updateCatalogProduct(input.id, patchOf(input))
  if (!item) return mockReject<ProductRow>("商品不存在")
  return mockResolve(item, 280)
}

export const deleteProductsAPI = (ids: string[]) => mockResolve(removeCatalogProducts(ids), 220)

export const setProductEnabledAPI = (ids: string[], enabled: boolean) => {
  setCatalogEnabled(ids, enabled)
  return mockResolve(ids.length, 220)
}

export const setProductPriceAPI = (ids: string[], price: number) => {
  setCatalogPrice(ids, price)
  return mockResolve(ids.length, 220)
}


function nowCreatedAt() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
export const createProductAPI = (input: ProductSaveInput) => {
  const item = addCatalogProduct({
    ...patchOf(input),
    createdAt: nowCreatedAt(),
    cat: input.cat,
    name: input.name.trim(),
    brand: input.brand.trim(),
    price: num(input.price),
    discount: 10,
    stockQty: 0
  })
  return mockResolve(item, 320)
}
