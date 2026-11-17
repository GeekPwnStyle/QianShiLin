import { mockReject, mockResolve } from "@/mock"
import { normalizeRegionPaths } from "@/views/region/regionOptions"

export interface RegionManager {
  id: string
  name: string
  phone: string
  /** 从大区或省开始的路径，如 ["华东"]、["华南","广东省","深圳市","南山区"] */
  regions: string[][]
}

export interface RegionManagerQuery {
  page: number
  pageSize: number
}

export interface RegionManagerPage {
  list: RegionManager[]
  total: number
}

export type RegionManagerInput = Omit<RegionManager, "id"> & { id?: string }

const managers: RegionManager[] = [
  { id: "R001", name: "林晓", phone: "13800001001", regions: [["华东"]] },
  {
    id: "R002",
    name: "周宁",
    phone: "13900001002",
    regions: [["华南", "广东省", "深圳市", "南山区"]]
  }
]

let sequence = managers.length

const nextId = () => {
  sequence += 1
  return `R${String(sequence).padStart(3, "0")}`
}

export const getRegionManagerPageAPI = (query: RegionManagerQuery) => {
  const start = (query.page - 1) * query.pageSize
  return mockResolve<RegionManagerPage>(
    {
      list: managers.slice(start, start + query.pageSize).map((item) => ({ ...item, regions: item.regions.map((path) => [...path]) })),
      total: managers.length
    },
    300
  )
}

export const saveRegionManagerAPI = (input: RegionManagerInput) => {
  const name = input.name.trim()
  const phone = input.phone.trim()
  const regions = normalizeRegionPaths(input.regions)
  if (!name) return mockReject("请输入姓名")
  if (!/^1\d{10}$/.test(phone)) return mockReject("请输入 11 位手机号")
  if (!regions.length) return mockReject("请选择负责区域")
  const duplicated = managers.find((item) => item.phone === phone && item.id !== input.id)
  if (duplicated) return mockReject("该电话已被其他负责人使用")
  if (input.id) {
    const target = managers.find((item) => item.id === input.id)
    if (!target) return mockReject("负责人不存在")
    Object.assign(target, { name, phone, regions })
  } else {
    managers.unshift({ id: nextId(), name, phone, regions })
  }
  return mockResolve(true, 300)
}

export const deleteRegionManagerAPI = (id: string) => {
  const index = managers.findIndex((item) => item.id === id)
  if (index >= 0) managers.splice(index, 1)
  return mockResolve(true, 300)
}
