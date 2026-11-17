import type { CascaderProps } from "ant-design-vue"
import { supplierRegions } from "@/views/base/supplierRegions"

type CascaderOption = NonNullable<CascaderProps["options"]>[number]

const zoneProvinces: Array<[string, string[]]> = [
  ["华东", ["上海市", "江苏省", "浙江省", "安徽省", "福建省", "江西省", "山东省"]],
  ["华南", ["广东省", "广西壮族自治区", "海南省"]]
]

const provinceCities = () => {
  const provinces = new Map<string, Map<string, string[]>>()
  for (const item of supplierRegions) {
    if (!provinces.has(item.province)) provinces.set(item.province, new Map())
    const cities = provinces.get(item.province)!
    if (!cities.has(item.city)) cities.set(item.city, [])
    if (item.district && !cities.get(item.city)!.includes(item.district)) cities.get(item.city)!.push(item.district)
  }
  return provinces
}

const toProvinceOption = (province: string, cities: Map<string, string[]>): CascaderOption => ({
  label: province,
  value: province,
  children: [...cities.entries()].map(([city, districts]) => ({
    label: city,
    value: city,
    children: districts.length ? districts.map((district) => ({ label: district, value: district })) : undefined
  }))
})

/** 大区可选华东、华南；其下以及其余省份都可以选到省、市、区 */
export const regionCascaderOptions = (() => {
  const provinces = provinceCities()
  const used = new Set<string>()
  const zones: CascaderOption[] = zoneProvinces.map(([zone, names]) => {
    const children = names.flatMap((name) => {
      const cities = provinces.get(name)
      if (!cities) return []
      used.add(name)
      return [toProvinceOption(name, cities)]
    })
    return { label: zone, value: zone, children }
  })
  const rest = [...provinces.entries()]
    .filter(([name]) => !used.has(name))
    .map(([name, cities]) => toProvinceOption(name, cities))
  return [...zones, ...rest]
})()

/** 选了上级后，去掉已被包含的下级 */
export const normalizeRegionPaths = (paths: string[][]) => {
  const unique = paths
    .map((path) => path.map((item) => String(item).trim()).filter(Boolean))
    .filter((path) => path.length)
  const covered = unique.filter(
    (path) =>
      !unique.some(
        (other) =>
          other.length < path.length && other.every((segment, index) => path[index] === segment)
      )
  )
  const seen = new Set<string>()
  return covered.filter((path) => {
    const key = path.join("|")
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export const formatRegionPath = (path: string[]) =>
  path.filter((part, index) => index === 0 || part !== path[index - 1]).join(" / ")
