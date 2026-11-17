import { mockResolve } from "@/mock"

export type SupplierCategory = "镜架" | "镜片" | "成镜" | "配件" | "护理" | "医疗器械"

export const supplierCategories: SupplierCategory[] = ["镜架", "镜片", "成镜", "配件", "护理", "医疗器械"]

export interface Supplier {
  id: string
  /** 供应商 */
  name: string
  /** 联系人 */
  contact: string
  /** 手机号 */
  phone: string
  /** 供应品类 */
  categories: SupplierCategory[]
  /** 供应品牌 */
  brands: string[]
  /** 是否默认供应商 */
  isDefault: boolean
  /** 绑定加盟批发门店 */
  franchiseStore: string
  /** 排序 */
  sort: number
  /** 经营范围 */
  scope: string
  /** 省份 */
  province: string
  /** 城市 */
  city: string
  /** 区县 */
  district: string
  /** 归属门店类型 */
  storeType: string
  /** 归属门店 */
  storeName: string
  /** 详细地址 */
  detailAddress: string
  /** 供应商地址，省市区和详细地址合在一起，详情里使用 */
  address: string
  /** 医疗器械经营许可证过期时间 */
  licenseExpire: string
  /** 供应链 */
  supplyChain: string
  /** 是否启用供应商 */
  supplierEnabled: boolean
  /** 是否启用 */
  enabled: boolean
  /** 上报状态 */
  reportStatus: string
  /** 供应商别名 */
  alias: string
  /** 别名拼音首字母 */
  aliasInitial: string
  /** 固定电话 */
  tel: string
  /** 微信 */
  wechat: string
  /** QQ号 */
  qq: string
  /** 统一社会信用代号 */
  creditCode: string
  /** 发货地址编号 */
  shipCode: string
  /** 银行户名 */
  bankHolder: string
  /** 开户行 */
  bankBranch: string
  /** 银行账号 */
  bankAccount: string
  /** 营业执照图片 */
  businessLicenseImage: string
  /** 营业执照过期时间 */
  businessLicenseExpire: string
  /** 医疗器械经营许可证图片 */
  deviceLicenseImage: string
  /** 医疗器械经营许可证号 */
  deviceLicenseNo: string
  /** 医疗器械经营许可证签发日期 */
  deviceLicenseIssueDate: string
  /** 医疗器械经营许可证签发机构 */
  deviceLicenseIssuer: string
  /** 医疗器械经营许可证有效期开始时间 */
  deviceLicenseStart: string
  /** 备注 */
  remark: string
}

const emptyProfile = {
  alias: "",
  aliasInitial: "",
  tel: "",
  wechat: "",
  qq: "",
  creditCode: "",
  shipCode: "",
  bankHolder: "",
  bankBranch: "",
  bankAccount: "",
  businessLicenseImage: "",
  businessLicenseExpire: "",
  deviceLicenseImage: "",
  deviceLicenseNo: "",
  deviceLicenseIssueDate: "",
  deviceLicenseIssuer: "",
  deviceLicenseStart: "",
  remark: "",
  brands: [] as string[]
}

export interface SupplierQuery {
  keyword?: string
  /** 空为全部，1 启用，0 禁用 */
  enabled?: "" | "1" | "0"
  supplierEnabled?: "" | "1" | "0"
  isDefault?: "" | "1" | "0"
  address?: string
  storeType?: string
  page: number
  pageSize: number
}

export interface SupplierPage {
  list: Supplier[]
  total: number
}

const STORE = "holyes合力思（总店）"

/** 演示用供应商，字段与供应商资料列表一致 */
const supplierSeeds: Array<Omit<Supplier, keyof typeof emptyProfile>> = [
  { id: "S001", name: "没有来生有限公司", contact: "小王", phone: "13620906955", categories: ["镜架"], isDefault: false, franchiseStore: "没有来生急仓", sort: 0, scope: "", province: "广东", city: "", district: "", storeType: "总店", storeName: STORE, detailAddress: "", address: "广东", licenseExpire: "", supplyChain: "", supplierEnabled: true, enabled: true, reportStatus: "" },
  { id: "S002", name: "下单给合力思网贸", contact: "蔡颖杰3", phone: "13670008950", categories: ["镜片"], isDefault: false, franchiseStore: "深圳市合力思科技有限公司123", sort: 0, scope: "", province: "广东省", city: "深圳市", district: "龙华区", storeType: "总店", storeName: STORE, detailAddress: "清祥路", address: "广东省深圳市龙华区清祥路", licenseExpire: "2027-08-29", supplyChain: "", supplierEnabled: true, enabled: true, reportStatus: "" },
  { id: "S003", name: "没有来生有限公司", contact: "小王", phone: "1530262180", categories: ["镜架", "配件"], isDefault: false, franchiseStore: "没有来生急仓", sort: 0, scope: "", province: "广东", city: "", district: "", storeType: "总店", storeName: STORE, detailAddress: "", address: "广东", licenseExpire: "", supplyChain: "", supplierEnabled: true, enabled: true, reportStatus: "" },
  { id: "S004", name: "kkll", contact: "CAI", phone: "021-65109019", categories: ["镜片"], isDefault: false, franchiseStore: "", sort: 0, scope: "主营镜片生产", province: "广东省", city: "深圳市", district: "龙华区", storeType: "总店", storeName: STORE, detailAddress: "来了就是深圳人，一分别想带回家哈哈哈！", address: "广东省深圳市龙华区来了就是深圳人，一分别想带回家哈哈哈！", licenseExpire: "2030-02-01", supplyChain: "", supplierEnabled: true, enabled: true, reportStatus: "" },
  { id: "S005", name: "视野联行", contact: "白先生", phone: "13220235256", categories: ["成镜"], isDefault: false, franchiseStore: "", sort: 0, scope: "", province: "", city: "", district: "", storeType: "总店", storeName: STORE, detailAddress: "", address: "", licenseExpire: "", supplyChain: "", supplierEnabled: true, enabled: true, reportStatus: "" },
  { id: "S006", name: "第三方供应商", contact: "CAI", phone: "13800138000", categories: ["镜片"], isDefault: false, franchiseStore: "", sort: 0, scope: "主营镜片生产", province: "广东省", city: "深圳市", district: "龙华区", storeType: "总店", storeName: STORE, detailAddress: "来了就是深圳人，一分别想带回家哈哈哈！", address: "广东省深圳市龙华区来了就是深圳人，一分别想带回家哈哈哈！", licenseExpire: "2027-02-04", supplyChain: "", supplierEnabled: true, enabled: true, reportStatus: "" },
  { id: "S007", name: "大众眼镜", contact: "", phone: "13800138148", categories: ["镜架", "镜片"], isDefault: false, franchiseStore: "", sort: 1, scope: "", province: "", city: "", district: "", storeType: "总店", storeName: STORE, detailAddress: "", address: "", licenseExpire: "2022-01-13", supplyChain: "", supplierEnabled: false, enabled: false, reportStatus: "" },
  { id: "S008", name: "开云", contact: "白客3", phone: "17700000004", categories: ["成镜"], isDefault: false, franchiseStore: "", sort: 99, scope: "", province: "", city: "", district: "", storeType: "总店", storeName: STORE, detailAddress: "", address: "", licenseExpire: "", supplyChain: "", supplierEnabled: true, enabled: true, reportStatus: "" },
  { id: "S009", name: "测试4", contact: "白客4", phone: "17700000004", categories: ["配件"], isDefault: false, franchiseStore: "", sort: 99, scope: "", province: "", city: "", district: "", storeType: "总店", storeName: STORE, detailAddress: "", address: "", licenseExpire: "2024-06-30", supplyChain: "", supplierEnabled: true, enabled: true, reportStatus: "" },
  { id: "S010", name: "测试5", contact: "白客5", phone: "17700000004", categories: ["镜片", "护理"], isDefault: false, franchiseStore: "", sort: 99, scope: "", province: "", city: "", district: "", storeType: "总店", storeName: STORE, detailAddress: "", address: "", licenseExpire: "", supplyChain: "", supplierEnabled: true, enabled: true, reportStatus: "" },
  { id: "S011", name: "深圳供应商", contact: "白客1", phone: "17700000004", categories: ["镜架"], isDefault: false, franchiseStore: "", sort: 99, scope: "", province: "", city: "", district: "", storeType: "总店", storeName: STORE, detailAddress: "", address: "", licenseExpire: "", supplyChain: "", supplierEnabled: true, enabled: true, reportStatus: "" },
  { id: "S012", name: "旭明眼镜有限公司", contact: "白客1", phone: "17700000004", categories: ["镜架", "镜片"], isDefault: false, franchiseStore: "", sort: 99, scope: "", province: "", city: "", district: "", storeType: "总店", storeName: STORE, detailAddress: "", address: "", licenseExpire: "", supplyChain: "", supplierEnabled: false, enabled: false, reportStatus: "" },
  { id: "S013", name: "郑氏眼镜", contact: "嘟嘟你", phone: "17700000023", categories: ["镜片"], isDefault: false, franchiseStore: "", sort: 99, scope: "", province: "四川省", city: "", district: "", storeType: "总店", storeName: STORE, detailAddress: "", address: "四川省", licenseExpire: "", supplyChain: "", supplierEnabled: false, enabled: false, reportStatus: "" },
  { id: "S014", name: "中国车房", contact: "白客", phone: "17700000003", categories: ["镜片", "成镜"], isDefault: false, franchiseStore: "", sort: 99, scope: "", province: "", city: "", district: "", storeType: "总店", storeName: STORE, detailAddress: "", address: "", licenseExpire: "", supplyChain: "", supplierEnabled: true, enabled: true, reportStatus: "" }
]

const seedBrands: Record<string, string[]> = {
  S001: ["暴龙", "陌森"],
  S002: ["蔡司", "依视路"],
  S003: ["派丽蒙"],
  S007: ["陌森", "明月"]
}

const suppliers: Supplier[] = supplierSeeds.map((item) => ({
  ...emptyProfile,
  ...item,
  brands: seedBrands[item.id] ?? []
}))

const matchFlag = (value: boolean, flag?: "" | "1" | "0") => {
  if (flag === "1") return value
  if (flag === "0") return !value
  return true
}

/** 排序值越小越靠前，相同排序保持当前数组顺序 */
const orderedSuppliers = () =>
  suppliers
    .map((item, index) => ({ item, index }))
    .sort((a, b) => a.item.sort - b.item.sort || a.index - b.index)
    .map((entry) => entry.item)

export const getSupplierPageAPI = (query: SupplierQuery) => {
  const keyword = query.keyword?.trim().toLowerCase() ?? ""
  const address = query.address?.trim() ?? ""
  const storeType = query.storeType?.trim() ?? ""
  const filtered = orderedSuppliers().filter((item) => {
    if (keyword) {
      const blob = `${item.name} ${item.alias} ${item.contact} ${item.phone} ${item.categories.join(" ")} ${item.brands.join(" ")} ${item.storeName} ${item.address}`.toLowerCase()
      if (!blob.includes(keyword)) return false
    }
    if (!matchFlag(item.enabled, query.enabled)) return false
    if (!matchFlag(item.supplierEnabled, query.supplierEnabled)) return false
    if (!matchFlag(item.isDefault, query.isDefault)) return false
    if (address && !item.address.includes(address)) return false
    if (storeType && item.storeType !== storeType) return false
    return true
  })
  const start = (query.page - 1) * query.pageSize
  return mockResolve<SupplierPage>(
    { list: filtered.slice(start, start + query.pageSize), total: filtered.length },
    400
  )
}

const clearOtherDefaults = (id: string) => {
  for (const item of suppliers) {
    if (item.id !== id) item.isDefault = false
  }
}

export const saveSupplierAPI = (supplier: Omit<Supplier, "id"> & { id?: string }) => {
  if (supplier.id) {
    const target = suppliers.find((item) => item.id === supplier.id)
    if (target) Object.assign(target, supplier)
    if (supplier.isDefault && supplier.id) clearOtherDefaults(supplier.id)
  } else {
    const id = `S${String(suppliers.length + 1).padStart(3, "0")}`
    suppliers.unshift({ ...supplier, id })
    if (supplier.isDefault) clearOtherDefaults(id)
  }
  return mockResolve(true, 400)
}

export const deleteSupplierAPI = (id: string) => {
  const index = suppliers.findIndex((item) => item.id === id)
  if (index >= 0) suppliers.splice(index, 1)
  return mockResolve(true, 300)
}

/** 按拖拽后的可见顺序重排。未出现在列表里的供应商保持原相对位置 */
export const reorderSuppliersAPI = (orderedIds: string[]) => {
  const current = orderedSuppliers()
  const moving = new Set(orderedIds)
  const queue = orderedIds.filter((id) => moving.has(id) && current.some((item) => item.id === id))
  const nextIds = current.map((item) => (moving.has(item.id) ? queue.shift() ?? item.id : item.id))
  const byId = new Map(current.map((item) => [item.id, item]))
  const next = nextIds.map((id) => byId.get(id)).filter((item): item is Supplier => Boolean(item))
  suppliers.splice(0, suppliers.length, ...next)
  suppliers.forEach((item, index) => {
    item.sort = index
  })
  return mockResolve(true, 200)
}

const CSV_HEADERS = [
  "供应商",
  "联系人",
  "手机号",
  "供应品类",
  "供应品牌",
  "是否默认供应商",
  "绑定加盟批发门店",
  "排序",
  "经营范围",
  "省份",
  "城市",
  "区县",
  "归属门店类型",
  "归属门店",
  "详细地址",
  "供应商地址",
  "医疗器械经营许可证过期时间",
  "供应链",
  "是否启用供应商",
  "是否启用",
  "上报状态",
  "供应商别名",
  "别名拼音首字母",
  "固定电话",
  "微信",
  "QQ号",
  "统一社会信用代号",
  "发货地址编号",
  "银行户名",
  "开户行",
  "银行账号",
  "营业执照过期时间",
  "医疗器械经营许可证号",
  "医疗器械经营许可证签发日期",
  "医疗器械经营许可证签发机构",
  "医疗器械经营许可证有效期开始时间",
  "备注"
] as const

const csvCell = (value: string) => {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

const yesNo = (value: boolean) => (value ? "是" : "否")
const enabledText = (value: boolean) => (value ? "启用" : "禁用")

export const suppliersToCsv = (list: Supplier[]) => {
  const lines = [
    CSV_HEADERS.join(","),
    ...list.map((item) =>
      [
        item.name,
        item.contact,
        item.phone,
        item.categories.join("、"),
        item.brands.join("、"),
        yesNo(item.isDefault),
        item.franchiseStore,
        String(item.sort ?? 0),
        item.scope,
        item.province,
        item.city,
        item.district,
        item.storeType,
        item.storeName,
        item.detailAddress,
        item.address,
        item.licenseExpire,
        item.supplyChain,
        enabledText(item.supplierEnabled),
        enabledText(item.enabled),
        item.reportStatus,
        item.alias,
        item.aliasInitial,
        item.tel,
        item.wechat,
        item.qq,
        item.creditCode,
        item.shipCode,
        item.bankHolder,
        item.bankBranch,
        item.bankAccount,
        item.businessLicenseExpire,
        item.deviceLicenseNo,
        item.deviceLicenseIssueDate,
        item.deviceLicenseIssuer,
        item.deviceLicenseStart,
        item.remark
      ]
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
        } else quoted = false
      } else cell += ch
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

const asEnabled = (value: string) => value !== "禁用" && value !== "否"

export const parseSupplierCsv = (text: string): { rows: Omit<Supplier, "id">[]; error?: string } => {
  const table = parseCsv(text)
  if (!table.length) return { rows: [], error: "文件是空的" }
  const header = table[0].map((item) => item.trim())
  if (header[0] !== "供应商") return { rows: [], error: "请使用导出的供应商资料文件" }
  const indexOf = (title: string) => header.indexOf(title)
  const rows: Omit<Supplier, "id">[] = []
  for (let i = 1; i < table.length; i += 1) {
    const line = table[i]
    const cell = (title: string) => (line[indexOf(title)] ?? "").trim()
    const name = cell("供应商")
    if (!name) return { rows: [], error: `第 ${i + 1} 行缺少供应商` }
    const sort = Number(cell("排序"))
    const categories = cell("供应品类")
      .split(/[、,，]/)
      .map((item) => item.trim())
      .filter(Boolean)
    if (categories.some((item) => !supplierCategories.includes(item as SupplierCategory))) {
      return { rows: [], error: `第 ${i + 1} 行供应品类不正确` }
    }
    const brands = cell("供应品牌")
      .split(/[、,，]/)
      .map((item) => item.trim())
      .filter(Boolean)
    rows.push({
      name,
      contact: cell("联系人"),
      phone: cell("手机号"),
      categories: [...new Set(categories)] as SupplierCategory[],
      brands: [...new Set(brands)],
      isDefault: cell("是否默认供应商") === "是",
      franchiseStore: cell("绑定加盟批发门店"),
      sort: Number.isFinite(sort) ? sort : 0,
      scope: cell("经营范围"),
      province: cell("省份"),
      city: cell("城市"),
      district: cell("区县"),
      storeType: cell("归属门店类型") || "总店",
      storeName: cell("归属门店"),
      detailAddress: cell("详细地址"),
      address:
        cell("供应商地址") ||
        [cell("省份"), cell("城市"), cell("区县"), cell("详细地址")].filter(Boolean).join(""),
      licenseExpire: cell("医疗器械经营许可证过期时间"),
      supplyChain: cell("供应链"),
      supplierEnabled: asEnabled(cell("是否启用供应商")),
      enabled: asEnabled(cell("是否启用")),
      reportStatus: cell("上报状态"),
      alias: cell("供应商别名"),
      aliasInitial: cell("别名拼音首字母"),
      tel: cell("固定电话"),
      wechat: cell("微信"),
      qq: cell("QQ号"),
      creditCode: cell("统一社会信用代号"),
      shipCode: cell("发货地址编号"),
      bankHolder: cell("银行户名"),
      bankBranch: cell("开户行"),
      bankAccount: cell("银行账号"),
      businessLicenseImage: "",
      businessLicenseExpire: cell("营业执照过期时间"),
      deviceLicenseImage: "",
      deviceLicenseNo: cell("医疗器械经营许可证号"),
      deviceLicenseIssueDate: cell("医疗器械经营许可证签发日期"),
      deviceLicenseIssuer: cell("医疗器械经营许可证签发机构"),
      deviceLicenseStart: cell("医疗器械经营许可证有效期开始时间"),
      remark: cell("备注")
    })
  }
  if (!rows.length) return { rows: [], error: "没有可导入的供应商" }
  return { rows }
}

export const importSuppliersAPI = (rows: Omit<Supplier, "id">[]) => {
  for (const row of rows) {
    const target = suppliers.find((item) => item.name === row.name && item.phone === row.phone)
    if (target) {
      Object.assign(target, row, {
        id: target.id,
        businessLicenseImage: row.businessLicenseImage || target.businessLicenseImage,
        deviceLicenseImage: row.deviceLicenseImage || target.deviceLicenseImage
      })
    } else suppliers.push({ ...row, id: `S${String(suppliers.length + 1).padStart(3, "0")}` })
    if (row.isDefault) clearOtherDefaults(target?.id || suppliers[suppliers.length - 1].id)
  }
  return mockResolve(rows.length, 400)
}

export interface SupplierBill {
  id: string
  /** 单据类型 */
  type: string
  /** 单据编号 */
  billNo: string
  /** 单据日期 */
  date: string
  /** 金额 */
  amount: number
  /** 状态 */
  status: string
}

const billSeeds = [
  { type: "采购入库单", status: "已完成" },
  { type: "采购退货单", status: "已完成" },
  { type: "付款单", status: "待审核" },
  { type: "对账单", status: "已完成" }
]

/** 供应商往来单据，详情页同一屏展示 */
export const getSupplierBillsAPI = (supplierId: string) => {
  const index = Math.max(
    suppliers.findIndex((item) => item.id === supplierId),
    0
  )
  const list: SupplierBill[] = billSeeds.slice(0, 3 + (index % 2)).map((item, i) => ({
    id: `${supplierId}-B${i + 1}`,
    type: item.type,
    billNo: `CG${String(2026000 + index * 10 + i)}`,
    date: `2026-0${(i % 6) + 1}-${String(8 + i).padStart(2, "0")}`,
    amount: 1280 + index * 36 + i * 560,
    status: i === 2 && index % 3 === 0 ? "待审核" : item.status
  }))
  return mockResolve(list, 300)
}
