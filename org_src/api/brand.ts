import { mockResolve } from "@/mock"

/** 售卖品类 */
export type BrandNature = "镜架" | "镜片" | "成镜" | "配件" | "综合"

/** 品牌性质 */
export type BrandKind = "自营品牌" | "代理品牌"

export interface Brand {
  id: string
  /** 品牌名称 */
  name: string
  /** 品牌别名 */
  alias: string
  /** 是否系统品牌 */
  isSystem: boolean
  /** 品牌性质，可空 */
  kind: BrandKind | ""
  /** 售卖品类，可多选 */
  natures: BrandNature[]
  /** 系列，多个用顿号分隔 */
  series: string
  /** 品牌备注 */
  remark: string
  /** 是否置顶 */
  pinned: boolean
  /** 是否启用 */
  enabled: boolean
}

export interface BrandQuery {
  name?: string
  /** 空为全部，1 启用，0 禁用 */
  enabled?: "" | "1" | "0"
  page: number
  pageSize: number
}

export interface BrandPage {
  list: Brand[]
  total: number
}

/** 系统内置品牌，供批量添加 */
export interface SystemBrand {
  name: string
  alias: string
  kind: BrandKind
  natures: BrandNature[]
  added?: boolean
}

export const systemBrands: SystemBrand[] = [
  { name: "暴龙", alias: "BOLON", kind: "代理品牌", natures: ["镜架"] },
  { name: "蔡司", alias: "ZEISS", kind: "代理品牌", natures: ["镜片"] },
  { name: "依视路", alias: "ESSILOR", kind: "代理品牌", natures: ["镜片"] },
  { name: "豪雅", alias: "HOYA", kind: "代理品牌", natures: ["镜片"] },
  { name: "雷朋", alias: "Ray-Ban", kind: "代理品牌", natures: ["成镜"] },
  { name: "陌森", alias: "Molsion", kind: "自营品牌", natures: ["镜架"] },
  { name: "派丽蒙", alias: "PARIM", kind: "代理品牌", natures: ["镜架"] },
  { name: "木九十", alias: "MUJOSH", kind: "代理品牌", natures: ["成镜"] },
  { name: "海伦凯勒", alias: "HELEN KELLER", kind: "代理品牌", natures: ["镜架"] },
  { name: "明月", alias: "MINGYUE", kind: "代理品牌", natures: ["镜片"] },
  { name: "宝岛", alias: "FORMOSA", kind: "自营品牌", natures: ["镜架", "镜片"] },
  { name: "精工", alias: "SEIKO", kind: "代理品牌", natures: ["镜片"] },
  { name: "尼康", alias: "Nikon", kind: "代理品牌", natures: ["镜片"] },
  { name: "夏蒙", alias: "CHARMANT", kind: "代理品牌", natures: ["镜架"] },
  { name: "林德伯格", alias: "LINDBERG", kind: "代理品牌", natures: ["镜架"] },
  { name: "施洛华", alias: "SILHOUETTE", kind: "代理品牌", natures: ["镜架"] },
  { name: "万新", alias: "WANXIN", kind: "代理品牌", natures: ["镜片"] },
  { name: "帕莎", alias: "PRSR", kind: "代理品牌", natures: ["镜架"] },
  { name: "欧克利", alias: "Oakley", kind: "代理品牌", natures: ["成镜"] },
  { name: "宝丽来", alias: "Polaroid", kind: "代理品牌", natures: ["成镜"] },
  { name: "康耐特", alias: "CONANT", kind: "代理品牌", natures: ["镜片"] }
]

export const getSystemBrandsAPI = () => {
  const names = new Set(brands.map((item) => item.name))
  return mockResolve(systemBrands.map((item) => ({ ...item, added: names.has(item.name) })))
}

export const addSystemBrandsAPI = (names: string[]) => {
  const picked = systemBrands.filter((item) => names.includes(item.name) && !brands.some((brand) => brand.name === item.name))
  for (const item of picked) {
    brands.push({
      id: `B${String(brands.length + 1).padStart(3, "0")}`,
      name: item.name,
      alias: item.alias,
      isSystem: false,
      kind: item.kind,
      natures: [...item.natures],
      series: "",
      remark: "",
      pinned: false,
      enabled: true
    })
  }
  brands.sort((a, b) => Number(b.pinned) - Number(a.pinned))
  return mockResolve(picked.length, 400)
}

/** 演示用品牌数据 */
const brands: Brand[] = [
  { id: "B001", name: "暴龙", alias: "BOLON", isSystem: true, kind: "代理品牌", natures: ["镜架"], series: "经典系列、商务系列", remark: "集团主推镜架品牌", pinned: true, enabled: true },
  { id: "B002", name: "蔡司", alias: "ZEISS", isSystem: true, kind: "代理品牌", natures: ["镜片"], series: "智锐系列、钻立方系列", remark: "系统内置，不可删除", pinned: true, enabled: true },
  { id: "B003", name: "依视路", alias: "ESSILOR", isSystem: true, kind: "代理品牌", natures: ["镜片"], series: "万里路系列、爱赞系列", remark: "", pinned: false, enabled: true },
  { id: "B004", name: "雷朋", alias: "Ray-Ban", isSystem: false, kind: "代理品牌", natures: ["成镜"], series: "飞行员系列、俱乐部大师", remark: "太阳镜为主", pinned: true, enabled: true },
  { id: "B005", name: "陌森", alias: "Molsion", isSystem: false, kind: "自营品牌", natures: ["镜架"], series: "轻盈系列", remark: "门店自建品牌", pinned: false, enabled: true },
  { id: "B006", name: "派丽蒙", alias: "PARIM", isSystem: false, kind: "代理品牌", natures: ["镜架"], series: "儿童系列、青少年系列", remark: "", pinned: false, enabled: true },
  { id: "B007", name: "豪雅", alias: "HOYA", isSystem: true, kind: "代理品牌", natures: ["镜片"], series: "新乐学系列、丽视系列", remark: "", pinned: false, enabled: false },
  { id: "B008", name: "木九十", alias: "MUJOSH", isSystem: false, kind: "代理品牌", natures: ["成镜"], series: "复古系列", remark: "", pinned: false, enabled: true },
  { id: "B009", name: "海伦凯勒", alias: "HELEN KELLER", isSystem: false, kind: "代理品牌", natures: ["镜架"], series: "商务系列、钛架系列", remark: "", pinned: true, enabled: true },
  { id: "B010", name: "镜片清洁套装", alias: "配件", isSystem: false, kind: "自营品牌", natures: ["配件"], series: "护理系列", remark: "含镜布、清洗液", pinned: false, enabled: true },
  { id: "B011", name: "明月", alias: "MINGYUE", isSystem: false, kind: "代理品牌", natures: ["镜片"], series: "PMC 超亮系列", remark: "", pinned: false, enabled: true },
  { id: "B012", name: "宝岛", alias: "FORMOSA", isSystem: false, kind: "自营品牌", natures: ["镜架", "镜片"], series: "镜架系列、镜片系列", remark: "自有品牌，覆盖多品类", pinned: false, enabled: false },
]

export const getBrandPageAPI = (query: BrandQuery) => {
  const name = query.name?.trim().toLowerCase() ?? ""
  const filtered = brands.filter((b) => {
    if (name && !b.name.toLowerCase().includes(name) && !b.alias.toLowerCase().includes(name)) return false
    if (query.enabled === "1" && !b.enabled) return false
    if (query.enabled === "0" && b.enabled) return false
    return true
  })
  filtered.sort((a, b) => Number(b.pinned) - Number(a.pinned))
  const start = (query.page - 1) * query.pageSize
  return mockResolve<BrandPage>(
    { list: filtered.slice(start, start + query.pageSize), total: filtered.length },
    400
  )
}

export const saveBrandAPI = (brand: Omit<Brand, "id"> & { id?: string }) => {
  if (brand.id) {
    const target = brands.find((b) => b.id === brand.id)
    if (target) Object.assign(target, brand)
  } else {
    brands.unshift({ ...brand, id: `B${String(brands.length + 1).padStart(3, "0")}` })
    brands.sort((a, b) => Number(b.pinned) - Number(a.pinned))
  }
  return mockResolve(true, 400)
}

export const deleteBrandAPI = (id: string) => {
  const index = brands.findIndex((b) => b.id === id)
  if (index >= 0) brands.splice(index, 1)
  return mockResolve(true, 300)
}

const BRAND_NATURES: BrandNature[] = ["镜架", "镜片", "成镜", "配件", "综合"]
const BRAND_KINDS: BrandKind[] = ["自营品牌", "代理品牌"]
const CSV_HEADERS = ["品牌名称", "品牌别名", "品牌性质", "售卖品类", "系列", "品牌备注", "是否置顶", "是否启用"] as const

const csvCell = (value: string) => {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

const yesNo = (value: boolean) => (value ? "是" : "否")

/** 导出为 Excel 可打开的 CSV */
export const brandsToCsv = (list: Brand[]) => {
  const lines = [
    CSV_HEADERS.join(","),
    ...list.map((item) =>
      [item.name, item.alias, item.kind, item.natures.join("、"), item.series, item.remark, yesNo(item.pinned), yesNo(item.enabled)]
        .map((cell) => csvCell(cell ?? ""))
        .join(",")
    )
  ]
  return `\uFEFF${lines.join("\r\n")}`
}

const parseCsv = (text: string) => {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let quoted = false
  const src = text.replace(/^\uFEFF/, "")
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i]
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"'
          i += 1
        } else {
          quoted = false
        }
      } else {
        cell += ch
      }
      continue
    }
    if (ch === '"') {
      quoted = true
      continue
    }
    if (ch === ",") {
      row.push(cell)
      cell = ""
      continue
    }
    if (ch === "\n") {
      row.push(cell)
      cell = ""
      if (row.some((item) => item.trim())) rows.push(row)
      row = []
      continue
    }
    if (ch !== "\r") cell += ch
  }
  row.push(cell)
  if (row.some((item) => item.trim())) rows.push(row)
  return rows
}

export interface BrandImportResult {
  rows: Omit<Brand, "id">[]
  error?: string
}

/** 解析导出的品牌资料。同名品牌在导入时会更新 */
export const parseBrandCsv = (text: string): BrandImportResult => {
  const table = parseCsv(text)
  if (!table.length) return { rows: [], error: "文件是空的" }
  const header = table[0].map((item) => item.trim())
  if (header[0] !== "品牌名称") return { rows: [], error: "请使用导出的品牌资料文件" }
  const indexOf = (title: string) => header.indexOf(title)
  const rows: Omit<Brand, "id">[] = []
  for (let i = 1; i < table.length; i += 1) {
    const line = table[i]
    const cell = (title: string) => (line[indexOf(title)] ?? "").trim()
    const name = cell("品牌名称")
    const kind = cell("品牌性质")
    const natures = (cell("售卖品类") || cell("关联品类"))
      .split(/[、,，]/)
      .map((item) => item.trim())
      .filter(Boolean)
    if (!name) return { rows: [], error: `第 ${i + 1} 行缺少品牌名称` }
    if (kind && !BRAND_KINDS.includes(kind as BrandKind)) return { rows: [], error: `第 ${i + 1} 行品牌性质不正确` }
    if (natures.some((item) => !BRAND_NATURES.includes(item as BrandNature))) {
      return { rows: [], error: `第 ${i + 1} 行售卖品类不正确` }
    }
    rows.push({
      name,
      alias: cell("品牌别名"),
      isSystem: false,
      kind: kind as BrandKind | "",
      natures: [...new Set(natures)] as BrandNature[],
      series: cell("系列"),
      remark: cell("品牌备注"),
      pinned: cell("是否置顶") === "是",
      enabled: cell("是否启用") !== "否"
    })
  }
  if (!rows.length) return { rows: [], error: "没有可导入的品牌" }
  return { rows }
}

export const importBrandsAPI = (rows: Omit<Brand, "id">[]) => {
  for (const row of rows) {
    const target = brands.find((item) => item.name === row.name)
    if (target) {
      Object.assign(target, row, { id: target.id, isSystem: target.isSystem })
    } else {
      brands.push({ ...row, isSystem: false, id: `B${String(brands.length + 1).padStart(3, "0")}` })
    }
  }
  brands.sort((a, b) => Number(b.pinned) - Number(a.pinned))
  return mockResolve(rows.length, 400)
}
