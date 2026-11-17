import { mockResolve } from "@/mock"

/** 仓库类型（四选一） */
export type WarehouseType = "残次品仓库" | "镜片默认仓" | "镜架及其他产品默认仓" | "商城下单仓" | ""

export const warehouseTypes: WarehouseType[] = [
  "残次品仓库",
  "镜片默认仓",
  "镜架及其他产品默认仓",
  "商城下单仓"
]

export interface Warehouse {
  id: string
  /** 仓库代号 */
  code: string
  /** 仓库名称 */
  name: string
  /** 仓库联系人 */
  contact: string
  /** 电话 */
  phone: string
  /** 仓库备注 */
  remark: string
  /** 仓库类型 */
  warehouseType: WarehouseType
  /** 排序（拖拽后写入，列表按此顺序） */
  sort: number
}

export interface WarehouseQuery {
  keyword?: string
}

export interface WarehousePage {
  list: Warehouse[]
  total: number
}

/** 演示用仓库资料（由原四布尔标记迁移） */
let warehouses: Warehouse[] = [
  {
    id: "W001",
    code: "001",
    name: "成品仓",
    contact: "张伟",
    phone: "13800001001",
    remark: "成品默认仓",
    warehouseType: "镜架及其他产品默认仓",
    sort: 0
  },
  {
    id: "W002",
    code: "009",
    name: "镜架仓库",
    contact: "李娜",
    phone: "13800001002",
    remark: "",
    warehouseType: "镜架及其他产品默认仓",
    sort: 1
  },
  {
    id: "W003",
    code: "002",
    name: "报废仓",
    contact: "王强",
    phone: "13800001003",
    remark: "残次/报废专用",
    warehouseType: "残次品仓库",
    sort: 2
  },
  {
    id: "W004",
    code: "003",
    name: "镜片仓库",
    contact: "赵敏",
    phone: "13800001004",
    remark: "镜片默认出入库",
    warehouseType: "镜片默认仓",
    sort: 3
  },
  {
    id: "W005",
    code: "004",
    name: "配件仓",
    contact: "陈晨",
    phone: "13800001005",
    remark: "",
    warehouseType: "镜架及其他产品默认仓",
    sort: 4
  },
  {
    id: "W006",
    code: "005",
    name: "残次品仓",
    contact: "刘洋",
    phone: "13800001006",
    remark: "残次品仓",
    warehouseType: "残次品仓库",
    sort: 5
  }
]

const orderedWarehouses = () =>
  [...warehouses].sort((a, b) => a.sort - b.sort || a.code.localeCompare(b.code, "zh-CN"))

const reindex = (list: Warehouse[]) => {
  list.forEach((item, index) => {
    item.sort = index
  })
}

const normalizeType = (value: unknown): WarehouseType => {
  if (value === "" || value == null) return ""
  if (typeof value === "string" && (warehouseTypes as string[]).includes(value)) {
    return value as WarehouseType
  }
  return ""
}

export const getWarehousePageAPI = (query: WarehouseQuery = {}) => {
  const keyword = query.keyword?.trim().toLowerCase() ?? ""
  const filtered = orderedWarehouses().filter((item) => {
    if (!keyword) return true
    return (
      item.code.toLowerCase().includes(keyword) ||
      item.name.toLowerCase().includes(keyword) ||
      item.warehouseType.includes(keyword)
    )
  })
  return mockResolve<WarehousePage>({ list: filtered, total: filtered.length }, 200)
}

export const saveWarehouseAPI = (payload: Omit<Warehouse, "id" | "sort"> & { id?: string }) => {
  const code = payload.code.trim()
  const name = payload.name.trim()
  if (!code) return mockResolve({ ok: false as const, message: "请填写仓库代号" }, 200)
  if (!name) return mockResolve({ ok: false as const, message: "请填写仓库名称" }, 200)
  const warehouseType = normalizeType(payload.warehouseType)
  const dup = warehouses.find((item) => item.code === code && item.id !== payload.id)
  if (dup) return mockResolve({ ok: false as const, message: "仓库代号已存在" }, 200)

  if (payload.id) {
    const target = warehouses.find((item) => item.id === payload.id)
    if (target) {
      Object.assign(target, {
        code,
        name,
        contact: (payload.contact || "").trim(),
        phone: (payload.phone || "").trim(),
        remark: (payload.remark || "").trim(),
        warehouseType
      })
    }
  } else {
    const next = warehouses.length + 1
    warehouses.push({
      id: `W${String(next).padStart(3, "0")}`,
      code,
      name,
      contact: (payload.contact || "").trim(),
      phone: (payload.phone || "").trim(),
      remark: (payload.remark || "").trim(),
      warehouseType,
      sort: warehouses.length
    })
  }
  warehouses = orderedWarehouses()
  reindex(warehouses)
  return mockResolve({ ok: true as const, message: "ok" }, 300)
}

export const deleteWarehouseAPI = (id: string) => {
  const index = warehouses.findIndex((item) => item.id === id)
  if (index >= 0) warehouses.splice(index, 1)
  reindex(warehouses)
  return mockResolve(true, 200)
}

export const reorderWarehousesAPI = (orderedIds: string[]) => {
  const current = orderedWarehouses()
  const moving = new Set(orderedIds)
  const queue = orderedIds.filter((id) => moving.has(id) && current.some((item) => item.id === id))
  const nextIds = current.map((item) => (moving.has(item.id) ? queue.shift() ?? item.id : item.id))
  const byId = new Map(current.map((item) => [item.id, item]))
  const next = nextIds.map((id) => byId.get(id)).filter((item): item is Warehouse => Boolean(item))
  warehouses.splice(0, warehouses.length, ...next)
  reindex(warehouses)
  return mockResolve(true, 200)
}

const CSV_HEADERS = ["仓库代号", "仓库名称", "仓库联系人", "电话", "仓库备注", "仓库类型"] as const

const csvCell = (value: string) => {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

export const warehousesToCsv = (list: Warehouse[]) => {
  const lines = [
    CSV_HEADERS.join(","),
    ...list.map((item) =>
      [item.code, item.name, item.contact, item.phone, item.remark, item.warehouseType]
        .map((cell) => csvCell(cell))
        .join(",")
    )
  ]
  return `\uFEFF${lines.join("\r\n")}`
}
