import { LOCS, SUPPLIERS, type DegreeStockItem, type ProductRow } from "./productUi"

type Seed = Partial<ProductRow> & Pick<ProductRow, "id" | "cat" | "brand" | "name" | "price">

const blank = "—"

function row(seed: Seed): ProductRow {
  const cat = seed.cat
  return {
    sku: seed.id,
    catId: cat,
    spec: blank,
    model: blank,
    series: blank,
    index: blank,
    discount: 10,
    stockQty: 0,
    stockLoc: LOCS[0]!,
    rowKey: seed.id,
    material: blank,
    frameType: blank,
    coating: blank,
    focalType: blank,
    eyeSide: blank,
    sph: blank,
    cyl: blank,
    period: blank,
    dia: blank,
    packSpec: blank,
    func: blank,
    volume: blank,
    color: blank,
    degree: blank,
    promoPrice: "",
    inboundAt: "2026-03-12",
    createdAt: "2026-03-12 10:00",
    tags: [],
    supplier: SUPPLIERS[0]!,
    enabled: true,
    clType: blank,
    year: blank,
    axis: blank,
    isCustomLens: blank,
    score: 20,
    lensSurcharge: 0,
    lensKind: blank,
    ...seed
  }
}

type FrameLine = {
  brand: string
  series: string
  model: string
  material: string
  frameType: string
  price: number
  supplier: string
  year: string
  colors: [spec: string, color: string][]
  tags?: string[]
}

type LensLine = {
  brand: string
  series: string
  code: string
  supplier: string
  base: number
  indexes: string[]
  coatings: string[]
}

const DISCOUNTS = [8, 8.5, 8.8, 9, 9.5, 10]
const EYES = ["左右眼", "左眼", "右眼"] as const
const FOCALS = ["单光", "渐进", "防疲劳"] as const

function seqId(prefix: string, n: number) {
  return `${prefix}${String(n).padStart(3, "0")}`
}

function moreProducts(): ProductRow[] {
  const frames = buildFrames()
  const lenses = buildLenses()
  const contacts = buildContacts()
  const readers = buildReaders()
  const care = buildCare()
  const accessories = buildAccessories()
  const services = buildServices()
  const packages = buildPackages()
  return [...frames, ...lenses, ...contacts, ...readers, ...care, ...accessories, ...services, ...packages]
}

function buildFrames() {
  const lines: FrameLine[] = [
    { brand: "暴龙", series: "经典系列", model: "BJ7021", material: "TR90", frameType: "全框", price: 1180, supplier: "区域经销", year: "2025", tags: ["热销"], colors: [["C1", "黑色"], ["C2", "玳瑁"], ["C3", "透明"]] },
    { brand: "暴龙", series: "经典系列", model: "BJ7155", material: "板材", frameType: "全框", price: 1380, supplier: "区域经销", year: "2026", colors: [["C1", "黑色"], ["C4", "棕色"]] },
    { brand: "暴龙", series: "商务系列", model: "BJ7208", material: "钛合金", frameType: "半框", price: 1780, supplier: "区域经销", year: "2026", tags: ["团购"], colors: [["B1", "银色"], ["B2", "金色"]] },
    { brand: "暴龙", series: "商务系列", model: "BJ6102", material: "纯钛", frameType: "无框", price: 1980, supplier: "区域经销", year: "2025", colors: [["T1", "金色"], ["T2", "枪色"]] },
    { brand: "陌森", series: "轻盈系列", model: "MS5028", material: "板材", frameType: "全框", price: 920, supplier: "门店统采", year: "2025", tags: ["热销"], colors: [["C1", "棕色"], ["C2", "黑色"], ["C3", "透明"]] },
    { brand: "陌森", series: "轻盈系列", model: "MS6160", material: "TR90", frameType: "全框", price: 780, supplier: "门店统采", year: "2024", tags: ["学生"], colors: [["C1", "黑色"], ["C2", "蓝色"]] },
    { brand: "陌森", series: "轻盈系列", model: "MS3001", material: "金属", frameType: "半框", price: 1080, supplier: "门店统采", year: "2026", colors: [["S1", "银色"], ["S2", "金色"]] },
    { brand: "派丽蒙", series: "儿童系列", model: "PR79018", material: "TR90", frameType: "全框", price: 520, supplier: "门店统采", year: "2025", tags: ["学生"], colors: [["P1", "粉色"], ["P2", "蓝色"], ["P3", "绿色"]] },
    { brand: "派丽蒙", series: "儿童系列", model: "PR66005", material: "TR90", frameType: "全框", price: 460, supplier: "门店统采", year: "2026", tags: ["学生"], colors: [["P1", "红色"], ["P2", "黄色"]] },
    { brand: "派丽蒙", series: "青少年系列", model: "PR83520", material: "TR90", frameType: "全框", price: 720, supplier: "门店统采", year: "2025", colors: [["A1", "黑色"], ["A2", "透明"]] },
    { brand: "派丽蒙", series: "青少年系列", model: "PR77811", material: "板材", frameType: "全框", price: 860, supplier: "门店统采", year: "2024", tags: ["热销"], colors: [["A1", "棕色"], ["A2", "黑色"]] },
    { brand: "海伦凯勒", series: "钛架系列", model: "H83021", material: "纯钛", frameType: "无框", price: 2380, supplier: "华东光学仓", year: "2026", tags: ["联营"], colors: [["T1", "金色"], ["T2", "银色"]] },
    { brand: "海伦凯勒", series: "钛架系列", model: "H27066", material: "纯钛", frameType: "半框", price: 2080, supplier: "华东光学仓", year: "2025", colors: [["T1", "黑色"], ["T2", "枪色"]] },
    { brand: "海伦凯勒", series: "商务系列", model: "H26180", material: "钛合金", frameType: "全框", price: 1680, supplier: "华东光学仓", year: "2025", tags: ["团购"], colors: [["B1", "黑色"], ["B2", "银色"]] },
    { brand: "夏蒙", series: "经典系列", model: "CH10618", material: "钛合金", frameType: "眉线", price: 2680, supplier: "华东光学仓", year: "2024", colors: [["C1", "黑色"], ["C2", "银色"]] },
    { brand: "夏蒙", series: "经典系列", model: "CH16042", material: "纯钛", frameType: "全框", price: 2980, supplier: "华东光学仓", year: "2026", tags: ["团购"], colors: [["C1", "金色"], ["C2", "黑色"]] },
    { brand: "雷朋", series: "飞行员系列", model: "RB3025", material: "金属", frameType: "全框", price: 1380, supplier: "区域经销", year: "2025", tags: ["热销"], colors: [["G1", "金色"], ["G2", "银色"], ["G3", "黑色"]] },
    { brand: "雷朋", series: "飞行员系列", model: "RB3447", material: "板材", frameType: "全框", price: 1180, supplier: "区域经销", year: "2026", colors: [["C1", "玳瑁"], ["C2", "黑色"]] },
    { brand: "雷朋", series: "俱乐部大师", model: "RB4190", material: "板材", frameType: "眉线", price: 1580, supplier: "区域经销", year: "2024", colors: [["C1", "黑色"], ["C2", "棕色"]] },
    { brand: "宝岛", series: "镜架系列", model: "BD2108", material: "TR90", frameType: "全框", price: 298, supplier: "门店统采", year: "2025", tags: ["学生"], colors: [["C1", "黑色"], ["C2", "透明"], ["C3", "蓝色"]] },
    { brand: "宝岛", series: "镜架系列", model: "BD3316", material: "金属", frameType: "全框", price: 368, supplier: "门店统采", year: "2026", colors: [["S1", "银色"], ["S2", "黑色"]] },
    { brand: "宝岛", series: "镜架系列", model: "BD4502", material: "板材", frameType: "全框", price: 428, supplier: "门店统采", year: "2024", colors: [["C1", "棕色"], ["C2", "黑色"]] }
  ]
  const list: ProductRow[] = []
  let n = 9
  for (const line of lines) {
    line.colors.forEach(([spec, color], index) => {
      const id = seqId("F", n)
      n += 1
      const discount = line.price >= 2000 ? 8.8 : DISCOUNTS[(n + index) % DISCOUNTS.length]!
      const kid = line.series.includes("儿童") || line.series.includes("青少年")
      list.push(
        row({
          id,
          cat: "镜架",
          brand: line.brand,
          name: `${line.brand} ${line.model}`,
          series: line.series,
          model: line.model,
          spec,
          material: line.material,
          frameType: line.frameType,
          color,
          year: line.year,
          price: line.price,
          discount,
          stockQty: 2 + ((n * 5 + index * 3) % 28),
          stockLoc: kid ? "前柜 S2" : line.price >= 2000 ? "后仓 L-02" : n % 2 === 0 ? "前柜 A3" : "前柜 B1",
          tags: line.tags || (line.price < 700 ? ["学生"] : []),
          supplier: line.supplier,
          promoPrice: line.tags?.includes("热销") ? Math.round(line.price * 0.85) : "",
          enabled: n % 19 !== 0,
          score: Math.max(8, Math.round(line.price / 45)),
          inboundAt: `2026-0${(n % 6) + 1}-${String((n % 27) + 1).padStart(2, "0")}`
        })
      )
    })
  }
  return list
}

function buildLenses() {
  const lines: LensLine[] = [
    { brand: "蔡司", series: "智锐系列", code: "ZR", supplier: "蔡司官方", base: 1480, indexes: ["1.56", "1.67", "1.74"], coatings: ["莲花膜", "防蓝光膜"] },
    { brand: "蔡司", series: "钻立方系列", code: "DC", supplier: "蔡司官方", base: 2180, indexes: ["1.60", "1.67"], coatings: ["钻立方铂金膜", "防蓝光膜"] },
    { brand: "依视路", series: "万里路系列", code: "WL", supplier: "依视路直供", base: 1680, indexes: ["1.60", "1.67", "1.74"], coatings: ["钻晶膜", "防蓝光膜"] },
    { brand: "依视路", series: "爱赞系列", code: "AZ", supplier: "依视路直供", base: 980, indexes: ["1.56", "1.60", "1.74"], coatings: ["加硬膜", "防蓝光膜"] },
    { brand: "明月", series: "PMC 超亮系列", code: "PMC", supplier: "门店统采", base: 480, indexes: ["1.56", "1.67", "1.71"], coatings: ["防蓝光膜", "加硬膜"] },
    { brand: "豪雅", series: "新乐学系列", code: "XLX", supplier: "华东光学仓", base: 1880, indexes: ["1.56", "1.67"], coatings: ["加硬膜", "防蓝光膜"] },
    { brand: "豪雅", series: "丽视系列", code: "LS", supplier: "华东光学仓", base: 1280, indexes: ["1.60", "1.67", "1.74"], coatings: ["丽视膜"] },
    { brand: "宝岛", series: "镜片系列", code: "BDL", supplier: "门店统采", base: 280, indexes: ["1.56", "1.60", "1.67"], coatings: ["加硬膜", "绿膜"] }
  ]
  const list: ProductRow[] = []
  let n = 8
  for (const line of lines) {
    for (const index of line.indexes) {
      for (const coating of line.coatings) {
        const id = seqId("L", n)
        const focal = FOCALS[n % FOCALS.length]!
        const custom = index === "1.74" || focal === "渐进"
        const price = line.base + (index === "1.74" ? 900 : index === "1.71" ? 620 : index === "1.67" ? 380 : index === "1.60" ? 160 : 0) + (coating.includes("防蓝光") ? 80 : 0)
        const diopter = ((n % 12) - 6) * 0.5
        list.push(
          row({
            id,
            cat: "镜片",
            brand: line.brand,
            name: `${line.brand}${line.series.replace("系列", "")} ${index}`,
            series: line.series,
            model: `${line.code}${index.replace(".", "")}`,
            index,
            coating,
            focalType: focal,
            eyeSide: EYES[n % EYES.length]!,
            sph: diopter.toFixed(2),
            cyl: n % 4 === 0 ? "—" : (-0.25 * ((n % 4) + 1)).toFixed(2),
            axis: n % 4 === 0 ? "—" : String((n * 15) % 180),
            lensKind: custom ? "定制镜片" : "库存镜片",
            isCustomLens: custom ? "是" : "否",
            price,
            discount: DISCOUNTS[n % DISCOUNTS.length]!,
            stockQty: custom ? 4 + (n % 12) : 16 + (n % 40),
            stockLoc: "后仓 L-02",
            tags: line.brand === "明月" || line.series.includes("乐学") ? ["学生"] : focal === "渐进" ? ["老花"] : n % 5 === 0 ? ["医保", "热销"] : ["热销"],
            supplier: line.supplier,
            promoPrice: n % 5 === 0 ? Math.round(price * 0.82) : "",
            enabled: n % 23 !== 0,
            score: Math.max(10, Math.round(price / 50)),
            lensSurcharge: 40 + (n % 5) * 20,
            inboundAt: `2026-0${(n % 4) + 2}-18`
          })
        )
        n += 1
      }
    }
  }
  return list
}

function buildContacts() {
  const lines: { brand: string; series: string; name: string; period: string; dia: string; packSpec: string; price: number; supplier: string; colors?: string[] }[] = [
    { brand: "强生", series: "舒日", name: "安视优舒日日抛", period: "日抛", dia: "14.2", packSpec: "30片/盒", price: 268, supplier: "强生视康" },
    { brand: "强生", series: "舒日", name: "安视优舒日日抛", period: "日抛", dia: "14.3", packSpec: "90片/盒", price: 698, supplier: "强生视康" },
    { brand: "强生", series: "舒澈", name: "安视优舒澈月抛", period: "月抛", dia: "14.0", packSpec: "6片/盒", price: 188, supplier: "强生视康" },
    { brand: "强生", series: "美瞳", name: "安视优美瞳日抛", period: "日抛", dia: "14.2", packSpec: "10片/盒", price: 128, supplier: "强生视康", colors: ["黑色", "棕色", "灰色"] },
    { brand: "强生", series: "欧舒适", name: "安视优双周抛", period: "双周抛", dia: "14.0", packSpec: "6片/盒", price: 158, supplier: "强生视康" },
    { brand: "博士伦", series: "清朗", name: "清朗日抛", period: "日抛", dia: "14.2", packSpec: "30片/盒", price: 218, supplier: "门店统采" },
    { brand: "博士伦", series: "清朗", name: "清朗月抛", period: "月抛", dia: "14.0", packSpec: "6片/盒", price: 98, supplier: "门店统采" },
    { brand: "博士伦", series: "清朗", name: "清朗半年抛", period: "半年抛", dia: "14.2", packSpec: "2片/盒", price: 86, supplier: "门店统采" },
    { brand: "博士伦", series: "蕾丝", name: "蕾丝明眸日抛", period: "日抛", dia: "14.5", packSpec: "10片/盒", price: 168, supplier: "门店统采", colors: ["棕色", "黑色", "混血棕"] },
    { brand: "博士伦", series: "蕾丝", name: "蕾丝明眸月抛", period: "月抛", dia: "14.2", packSpec: "2片/盒", price: 78, supplier: "门店统采", colors: ["棕色", "灰色"] },
    { brand: "海昌", series: "星眸", name: "海昌星眸日抛", period: "日抛", dia: "14.2", packSpec: "30片/盒", price: 198, supplier: "门店统采" },
    { brand: "海昌", series: "星眸", name: "海昌星眸半年抛", period: "半年抛", dia: "14.0", packSpec: "2片/盒", price: 68, supplier: "门店统采", colors: ["黑色", "棕色"] },
    { brand: "海昌", series: "优氧", name: "海昌优氧月抛", period: "月抛", dia: "14.2", packSpec: "6片/盒", price: 88, supplier: "门店统采" },
    { brand: "海昌", series: "优氧", name: "海昌优氧年抛", period: "年抛", dia: "14.2", packSpec: "1片/盒", price: 58, supplier: "门店统采" }
  ]
  const list: ProductRow[] = []
  let n = 5
  for (const line of lines) {
    const colors = line.colors?.length ? line.colors : [""]
    for (const color of colors) {
      const id = seqId("C", n)
      list.push(
        row({
          id,
          cat: "隐形眼镜",
          brand: line.brand,
          name: color ? `${line.name} ${color}` : line.name,
          series: line.series,
          period: line.period,
          dia: line.dia,
          packSpec: line.packSpec,
          spec: color || blank,
          color: color || blank,
          clType: line.period,
          axis: line.period === "日抛" ? "—" : "180",
          price: line.price + (color ? 20 : 0),
          discount: DISCOUNTS[n % DISCOUNTS.length]!,
          stockQty: 12 + (n % 70),
          stockLoc: "冷柜 C1",
          tags: color ? ["热销"] : n % 3 === 0 ? ["医保"] : ["学生"],
          supplier: line.supplier,
          promoPrice: n % 4 === 0 ? Math.round(line.price * 0.9) : "",
          score: 6 + (n % 8),
          enabled: n % 21 !== 0
        })
      )
      n += 1
    }
  }
  return list
}

function buildReaders() {
  const lines = [
    { brand: "宝岛", series: "镜架系列", model: "BD", material: "板材", focalType: "单光", price: 98, supplier: "门店统采" },
    { brand: "宝岛", series: "镜架系列", model: "BDX", material: "金属", focalType: "双光", price: 168, supplier: "门店统采" },
    { brand: "雷朋", series: "俱乐部大师", model: "RB", material: "金属", focalType: "双光", price: 860, supplier: "区域经销" },
    { brand: "海伦凯勒", series: "商务系列", model: "HR", material: "纯钛", focalType: "单光", price: 680, supplier: "华东光学仓" },
    { brand: "暴龙", series: "经典系列", model: "BR", material: "TR90", focalType: "单光", price: 420, supplier: "区域经销" }
  ]
  const degrees = ["+1.00", "+1.50", "+2.00", "+2.50", "+3.00"]
  const list: ProductRow[] = []
  let n = 4
  for (const line of lines) {
    for (const degree of degrees) {
      const id = seqId("R", n)
      const power = Number(degree)
      list.push(
        row({
          id,
          cat: "老花镜",
          brand: line.brand,
          name: `${line.brand}${line.focalType}老花 ${degree}`,
          series: line.series,
          model: `${line.model}-${degree.replace("+", "")}`,
          focalType: line.focalType,
          degree,
          spec: n % 2 === 0 ? "C1" : "C2",
          material: line.material,
          color: n % 2 === 0 ? "黑色" : "棕色",
          price: line.price + Math.round(power * 20),
          discount: line.price > 600 ? 8.8 : 10,
          stockQty: 6 + (n % 18),
          stockLoc: line.price > 600 ? "前柜 A3" : "前柜 S2",
          tags: ["老花"],
          supplier: line.supplier,
          score: 6 + (n % 6)
        })
      )
      n += 1
    }
  }
  return list
}

function buildCare() {
  const lines: { brand: string; name: string; model: string; spec: string; price: number; func: string; volume: string; supplier: string }[] = [
    { brand: "博士伦", name: "润明护理液", model: "RM500", spec: "500ml", price: 88, func: "护理液", volume: "500ml", supplier: "门店统采" },
    { brand: "博士伦", name: "润明护理液", model: "RM240", spec: "240ml", price: 52, func: "护理液", volume: "240ml", supplier: "门店统采" },
    { brand: "博士伦", name: "润明润滑液", model: "RY15", spec: "15ml", price: 36, func: "润滑液", volume: "15ml", supplier: "门店统采" },
    { brand: "博士伦", name: "双氧水护理液", model: "OX120", spec: "120ml", price: 46, func: "双氧护理", volume: "120ml", supplier: "门店统采" },
    { brand: "海昌", name: "海昌护理液", model: "HC500", spec: "500ml", price: 58, func: "护理液", volume: "500ml", supplier: "门店统采" },
    { brand: "海昌", name: "海昌护理液", model: "HC120", spec: "120ml", price: 26, func: "护理液", volume: "120ml", supplier: "门店统采" },
    { brand: "海昌", name: "海昌润眼液", model: "HY10", spec: "10ml", price: 32, func: "润眼液", volume: "10ml", supplier: "门店统采" },
    { brand: "海昌", name: "海昌冲洗液", model: "CX100", spec: "100ml", price: 22, func: "冲洗液", volume: "100ml", supplier: "门店统采" },
    { brand: "强生", name: "安视优护理液", model: "AJ360", spec: "360ml", price: 78, func: "护理液", volume: "360ml", supplier: "强生视康" },
    { brand: "强生", name: "安视优护理液", model: "AJ100", spec: "100ml", price: 38, func: "护理液", volume: "100ml", supplier: "强生视康" },
    { brand: "强生", name: "安视优润滑液", model: "AJL8", spec: "8ml", price: 42, func: "润滑液", volume: "8ml", supplier: "强生视康" },
    { brand: "蔡司", name: "蔡司镜片清洁喷雾", model: "ZS60", spec: "60ml", price: 68, func: "清洁喷雾", volume: "60ml", supplier: "蔡司官方" },
    { brand: "蔡司", name: "蔡司防雾喷雾", model: "ZF30", spec: "30ml", price: 58, func: "防雾", volume: "30ml", supplier: "蔡司官方" },
    { brand: "依视路", name: "依视路清洁湿巾", model: "YW30", spec: "30片", price: 36, func: "清洁湿巾", volume: "30片", supplier: "依视路直供" }
  ]
  return lines.map((line, index) => {
    const n = index + 4
    return row({
      id: seqId("N", n),
      cat: "护理产品",
      brand: line.brand,
      name: line.name,
      series: "护理系列",
      model: line.model,
      spec: line.spec,
      price: line.price,
      discount: 10,
      stockQty: 18 + (n % 40),
      stockLoc: "配件柜",
      func: line.func,
      volume: line.volume,
      tags: line.func === "护理液" && line.price >= 70 ? ["热销"] : [],
      supplier: line.supplier,
      score: 2 + (n % 5)
    })
  })
}

function buildAccessories() {
  const lines: { brand: string; name: string; color: string; price: number; series?: string }[] = [
    { brand: "宝岛", name: "磁吸眼镜盒", color: "黑色", price: 49 },
    { brand: "宝岛", name: "磁吸眼镜盒", color: "粉色", price: 49 },
    { brand: "宝岛", name: "皮质眼镜盒", color: "棕色", price: 69 },
    { brand: "宝岛", name: "超细纤维镜布", color: "蓝色", price: 12 },
    { brand: "宝岛", name: "防滑耳套", color: "透明", price: 15 },
    { brand: "宝岛", name: "硅胶鼻托", color: "透明", price: 9 },
    { brand: "宝岛", name: "运动眼镜绳", color: "黑色", price: 19 },
    { brand: "宝岛", name: "偏光夹片", color: "灰色", price: 59 },
    { brand: "雷朋", name: "雷朋硬壳眼镜盒", color: "黑色", price: 128 },
    { brand: "雷朋", name: "雷朋镜布", color: "红色", price: 29 },
    { brand: "海伦凯勒", name: "钛架专用鼻托", color: "透明", price: 18 },
    { brand: "蔡司", name: "蔡司镜头纸", color: "白色", price: 22, series: "护理系列" },
    { brand: "镜片清洁套装", name: "旅行清洁套装", color: "蓝色", price: 56, series: "护理系列" },
    { brand: "镜片清洁套装", name: "店用清洁套装", color: "绿色", price: 88, series: "护理系列" }
  ]
  return lines.map((line, index) =>
    row({
      id: seqId("A", index + 4),
      cat: "配件",
      brand: line.brand,
      name: line.name,
      series: line.series || blank,
      color: line.color,
      price: line.price,
      discount: line.price >= 80 ? 9 : 10,
      stockQty: 20 + index * 4,
      stockLoc: "配件柜",
      tags: line.price >= 80 ? ["热销"] : [],
      supplier: line.brand === "蔡司" ? "蔡司官方" : "门店统采",
      promoPrice: line.name.includes("套装") ? Math.round(line.price * 0.9) : "",
      score: 1 + (index % 4)
    })
  )
}

function buildServices() {
  const lines = [
    ["配镜调整", 0],
    ["镜片更换", 40],
    ["儿童验光", 0],
    ["散瞳验光", 30],
    ["镜架焊接", 20],
    ["鼻托更换", 10],
    ["到家配送", 15],
    ["会员复购加工", 20]
  ] as const
  return lines.map(([name, price], index) =>
    row({
      id: seqId("S", index + 4),
      cat: "服务",
      brand: "门店",
      name,
      price,
      discount: 10,
      stockQty: 0,
      inboundAt: "",
      tags: [],
      supplier: "门店统采",
      score: 0
    })
  )
}

function buildPackages() {
  const lines: { brand: string; series: string; name: string; price: number; promo?: number; supplier: string; tags: string[] }[] = [
    { brand: "蔡司", series: "智锐系列", name: "2680元【成人渐进套餐】", price: 2680, promo: 2380, supplier: "蔡司官方", tags: ["老花", "热销"] },
    { brand: "蔡司", series: "钻立方系列", name: "3280元【超薄防蓝光套餐】", price: 3280, promo: 2980, supplier: "蔡司官方", tags: ["热销"] },
    { brand: "依视路", series: "万里路系列", name: "2180元【中老年渐进套餐】", price: 2180, promo: 1980, supplier: "依视路直供", tags: ["老花"] },
    { brand: "依视路", series: "爱赞系列", name: "1280元【学生离焦套餐】", price: 1280, supplier: "依视路直供", tags: ["学生"] },
    { brand: "明月", series: "PMC 超亮系列", name: "680元【入门防蓝光套餐】", price: 680, promo: 599, supplier: "门店统采", tags: ["学生", "热销"] },
    { brand: "豪雅", series: "新乐学系列", name: "2380元【青少年防控套餐】", price: 2380, supplier: "华东光学仓", tags: ["学生"] },
    { brand: "豪雅", series: "丽视系列", name: "1680元【办公防疲劳套餐】", price: 1680, supplier: "华东光学仓", tags: ["团购"] },
    { brand: "暴龙", series: "商务系列", name: "1980元【钛架单光套餐】", price: 1980, promo: 1780, supplier: "区域经销", tags: ["团购"] },
    { brand: "海伦凯勒", series: "钛架系列", name: "2880元【纯钛成镜套餐】", price: 2880, supplier: "华东光学仓", tags: ["联营"] },
    { brand: "宝岛", series: "镜架系列", name: "399元【门店福利套餐】", price: 399, supplier: "门店统采", tags: ["学生"] },
    { brand: "雷朋", series: "飞行员系列", name: "1580元【太阳镜套餐】", price: 1580, promo: 1380, supplier: "区域经销", tags: ["热销"] },
    { brand: "强生", series: "舒日", name: "598元【日抛半年盒套餐】", price: 598, supplier: "强生视康", tags: ["医保"] }
  ]
  return lines.map((line, index) =>
    row({
      id: seqId("P", index + 4),
      cat: "套餐",
      brand: line.brand,
      name: line.name,
      series: line.series,
      price: line.price,
      discount: 10,
      promoPrice: line.promo ?? "",
      stockQty: 0,
      tags: line.tags,
      supplier: line.supplier,
      score: Math.round(line.price / 60)
    })
  )
}

export const productCatalog: ProductRow[] = [
  row({ id: "F001", cat: "镜架", brand: "暴龙", name: "暴龙 BJ6088", series: "经典系列", model: "BJ6088", spec: "C1", material: "TR90", frameType: "全框", color: "黑色", year: "2025", price: 1280, discount: 8.5, stockQty: 12, stockLoc: "前柜 A3", tags: ["热销"], supplier: "区域经销", promoPrice: 980, score: 30 }),
  row({ id: "F002", cat: "镜架", brand: "暴龙", name: "暴龙 BJ6088", series: "经典系列", model: "BJ6088", spec: "C2", material: "TR90", frameType: "全框", color: "玳瑁", year: "2025", price: 1280, discount: 8.5, stockQty: 6, stockLoc: "前柜 A3", tags: ["热销"], supplier: "区域经销", score: 30 }),
  row({ id: "F003", cat: "镜架", brand: "暴龙", name: "暴龙 BJ7132", series: "商务系列", model: "BJ7132", spec: "B1", material: "钛合金", frameType: "半框", color: "银色", year: "2026", price: 1680, discount: 9, stockQty: 4, stockLoc: "前柜 B1", tags: ["团购"], supplier: "区域经销", score: 40 }),
  row({ id: "F004", cat: "镜架", brand: "陌森", name: "陌森 MS7112", series: "轻盈系列", model: "MS7112", spec: "C01", material: "板材", frameType: "全框", color: "棕色", year: "2024", price: 860, discount: 8, stockQty: 9, stockLoc: "前柜 B1", tags: ["学生"], supplier: "门店统采", promoPrice: 699, enabled: true, score: 16 }),
  row({ id: "F005", cat: "镜架", brand: "派丽蒙", name: "派丽蒙 PR82412", series: "儿童系列", model: "PR82412", spec: "P3", material: "TR90", frameType: "全框", color: "蓝色", year: "2025", price: 560, discount: 9.5, stockQty: 15, stockLoc: "前柜 S2", tags: ["学生"], supplier: "门店统采", score: 12 }),
  row({ id: "F006", cat: "镜架", brand: "派丽蒙", name: "派丽蒙 PR83006", series: "青少年系列", model: "PR83006", spec: "A2", material: "TR90", frameType: "全框", color: "透明", year: "2026", price: 680, discount: 9, stockQty: 7, stockLoc: "前柜 S2", tags: ["学生", "热销"], supplier: "门店统采", score: 14 }),
  row({ id: "F007", cat: "镜架", brand: "海伦凯勒", name: "海伦凯勒 H2612", series: "钛架系列", model: "H2612", spec: "T1", material: "纯钛", frameType: "无框", color: "金色", year: "2025", price: 2180, discount: 8.8, stockQty: 3, stockLoc: "前柜 A3", tags: ["联营"], supplier: "华东光学仓", promoPrice: 1880, score: 50 }),
  row({ id: "F008", cat: "镜架", brand: "夏蒙", name: "夏蒙 CH12345", series: "经典系列", model: "CH12345", spec: "C4", material: "钛合金", frameType: "眉线", color: "黑色", year: "2024", price: 2460, discount: 10, stockQty: 2, stockLoc: "后仓 L-02", tags: ["团购"], supplier: "华东光学仓", enabled: false, score: 60 }),

  row({ id: "L001", cat: "镜片", brand: "蔡司", name: "蔡司智锐 1.60", series: "智锐系列", model: "ZR160", index: "1.60", coating: "钻立方铂金膜", focalType: "单光", eyeSide: "左右眼", sph: "-2.00", cyl: "-0.75", axis: "180", lensKind: "库存镜片", isCustomLens: "否", price: 1680, discount: 8, stockQty: 42, stockLoc: "后仓 L-02", tags: ["热销", "医保"], supplier: "蔡司官方", promoPrice: 1280, score: 36, lensSurcharge: 80 }),
  row({ id: "L002", cat: "镜片", brand: "蔡司", name: "蔡司智锐 1.67", series: "智锐系列", model: "ZR167", index: "1.67", coating: "钻立方铂金膜", focalType: "渐进", eyeSide: "左右眼", sph: "-3.25", cyl: "-1.00", axis: "90", lensKind: "定制镜片", isCustomLens: "是", price: 2680, discount: 8.5, stockQty: 18, stockLoc: "后仓 L-02", tags: ["热销"], supplier: "蔡司官方", score: 48, lensSurcharge: 120 }),
  row({ id: "L003", cat: "镜片", brand: "蔡司", name: "蔡司钻立方 1.74", series: "钻立方系列", model: "DC174", index: "1.74", coating: "防蓝光膜", focalType: "单光", eyeSide: "右眼", sph: "-4.50", cyl: "-0.50", axis: "175", lensKind: "定制镜片", isCustomLens: "是", price: 3280, discount: 9, stockQty: 8, stockLoc: "后仓 L-02", tags: ["医保"], supplier: "蔡司官方", score: 60, lensSurcharge: 150 }),
  row({ id: "L004", cat: "镜片", brand: "依视路", name: "依视路万里路 1.56", series: "万里路系列", model: "WL156", index: "1.56", coating: "膜洁", focalType: "渐进", eyeSide: "左右眼", sph: "+1.50", cyl: "-0.75", axis: "10", lensKind: "库存镜片", isCustomLens: "否", price: 1980, discount: 8, stockQty: 21, stockLoc: "后仓 L-02", tags: ["老花"], supplier: "依视路直供", promoPrice: 1580, score: 40, lensSurcharge: 90 }),
  row({ id: "L005", cat: "镜片", brand: "依视路", name: "依视路爱赞 1.67", series: "爱赞系列", model: "AZ167", index: "1.67", coating: "加硬膜", focalType: "单光", eyeSide: "左眼", sph: "-1.00", cyl: "—", axis: "—", lensKind: "库存镜片", isCustomLens: "否", price: 1460, discount: 9, stockQty: 33, stockLoc: "后仓 L-02", tags: ["学生"], supplier: "依视路直供", score: 28, lensSurcharge: 60 }),
  row({ id: "L006", cat: "镜片", brand: "明月", name: "明月 PMC 1.60", series: "PMC 超亮系列", model: "PMC160", index: "1.60", coating: "防蓝光膜", focalType: "单光", eyeSide: "左右眼", sph: "-2.00", cyl: "-1.25", axis: "5", lensKind: "库存镜片", isCustomLens: "否", price: 680, discount: 9.5, stockQty: 56, stockLoc: "后仓 L-02", tags: ["热销", "学生"], supplier: "门店统采", promoPrice: 599, score: 18, lensSurcharge: 50 }),
  row({ id: "L007", cat: "镜片", brand: "豪雅", name: "豪雅新乐学 1.60", series: "新乐学系列", model: "XLX160", index: "1.60", coating: "加硬膜", focalType: "单光", eyeSide: "左右眼", sph: "-3.25", cyl: "-0.50", axis: "180", lensKind: "定制镜片", isCustomLens: "是", price: 2380, discount: 8.8, stockQty: 11, stockLoc: "后仓 L-02", tags: ["学生"], supplier: "华东光学仓", enabled: false, score: 44, lensSurcharge: 100 }),

  row({ id: "C001", cat: "隐形眼镜", brand: "强生", name: "安视优日抛", series: "舒日", period: "日抛", dia: "14.2", packSpec: "30片/盒", spec: "—", clType: "日抛", axis: "—", price: 268, discount: 9, stockQty: 80, stockLoc: "冷柜 C1", tags: ["热销"], supplier: "强生视康", score: 10 }),
  row({ id: "C002", cat: "隐形眼镜", brand: "强生", name: "安视优月抛", series: "舒澈", period: "月抛", dia: "14.0", packSpec: "6片/盒", clType: "月抛", axis: "180", price: 188, discount: 8.5, stockQty: 46, stockLoc: "冷柜 C1", tags: ["医保"], supplier: "强生视康", promoPrice: 158, score: 8 }),
  row({ id: "C003", cat: "隐形眼镜", brand: "博士伦", name: "清朗半年抛", series: "清朗", period: "半年抛", dia: "14.2", packSpec: "2片/盒", clType: "年抛", price: 128, discount: 10, stockQty: 24, stockLoc: "冷柜 C1", tags: ["学生"], supplier: "门店统采", score: 6 }),
  row({ id: "C004", cat: "隐形眼镜", brand: "博士伦", name: "蕾丝明眸日抛", series: "蕾丝", period: "日抛", dia: "14.5", packSpec: "10片/盒", spec: "棕色", clType: "日抛", color: "棕色", price: 158, discount: 9, stockQty: 31, stockLoc: "冷柜 C1", tags: ["热销"], supplier: "门店统采", score: 8 }),

  row({ id: "R001", cat: "老花镜", brand: "宝岛", name: "宝岛老花 150", series: "镜架系列", model: "BD150", focalType: "单光", degree: "+1.50", spec: "C1", material: "板材", price: 128, discount: 10, stockQty: 20, stockLoc: "前柜 S2", tags: ["老花"], supplier: "门店统采", score: 6 }),
  row({ id: "R002", cat: "老花镜", brand: "宝岛", name: "宝岛老花 200", model: "BD200", focalType: "单光", degree: "+2.00", spec: "C2", material: "金属", price: 148, discount: 9, stockQty: 14, stockLoc: "前柜 S2", tags: ["老花"], supplier: "门店统采", score: 6 }),
  row({ id: "R003", cat: "老花镜", brand: "雷朋", name: "雷朋阅读镜", series: "俱乐部大师", model: "RB3016", focalType: "双光", degree: "+2.50", spec: "W1", material: "金属", price: 980, discount: 8.5, stockQty: 5, stockLoc: "前柜 A3", tags: ["团购"], supplier: "区域经销", promoPrice: 860, score: 20 }),

  row({ id: "N001", cat: "护理产品", brand: "博士伦", name: "润明护理液", series: "护理系列", model: "RM360", spec: "360ml", price: 68, discount: 10, stockQty: 40, stockLoc: "配件柜", func: "护理液", volume: "360ml", tags: ["热销"], supplier: "门店统采", score: 4 }),
  row({ id: "N002", cat: "护理产品", brand: "博士伦", name: "润明护理液", series: "护理系列", model: "RM120", spec: "120ml", price: 32, discount: 10, stockQty: 55, stockLoc: "配件柜", func: "护理液", volume: "120ml", supplier: "门店统采", score: 2 }),
  row({ id: "N003", cat: "护理产品", brand: "海昌", name: "海昌润滑液", series: "护理系列", model: "HC60", spec: "60ml", price: 28, discount: 9, stockQty: 36, stockLoc: "配件柜", func: "润滑液", volume: "60ml", tags: ["学生"], supplier: "门店统采", score: 2 }),

  row({ id: "A001", cat: "配件", brand: "宝岛", name: "折叠眼镜盒", color: "黑色", price: 39, discount: 10, stockQty: 60, stockLoc: "配件柜", tags: ["热销"], supplier: "门店统采", score: 2 }),
  row({ id: "A002", cat: "配件", brand: "宝岛", name: "超细纤维镜布", color: "灰色", price: 12, discount: 10, stockQty: 120, stockLoc: "配件柜", supplier: "门店统采", score: 1 }),
  row({ id: "A003", cat: "配件", brand: "镜片清洁套装", name: "镜片清洁套装", series: "护理系列", color: "透明", price: 45, discount: 9, stockQty: 28, stockLoc: "配件柜", tags: ["联营"], supplier: "门店统采", promoPrice: 39, score: 2 }),

  row({ id: "S001", cat: "服务", brand: "门店", name: "标准加工", price: 30, discount: 10, stockQty: 0, inboundAt: "", tags: [], supplier: "门店统采", score: 0 }),
  row({ id: "S002", cat: "服务", brand: "门店", name: "加急加工", price: 50, discount: 10, stockQty: 0, inboundAt: "", supplier: "门店统采", score: 0 }),
  row({ id: "S003", cat: "服务", brand: "门店", name: "视力复查", price: 0, discount: 10, stockQty: 0, inboundAt: "", supplier: "门店统采", score: 0 }),

  row({ id: "P001", cat: "套餐", brand: "蔡司", name: "1880元【青少年离焦镜】", series: "智锐系列", price: 1880, discount: 10, promoPrice: 1680, stockQty: 0, tags: ["学生", "热销"], supplier: "蔡司官方", score: 40 }),
  row({ id: "P002", cat: "套餐", brand: "依视路", name: "980元【成人单光套餐】", series: "爱赞系列", price: 980, discount: 10, stockQty: 0, tags: ["医保"], supplier: "依视路直供", score: 20 }),
  row({ id: "P003", cat: "套餐", brand: "暴龙", name: "2580元【商务镜架套餐】", series: "商务系列", price: 2580, discount: 10, promoPrice: 2280, stockQty: 0, tags: ["团购"], supplier: "区域经销", score: 50 }),
  ...moreProducts()
]

function lensDegrees(seed: number): DegreeStockItem[] {
  const items: DegreeStockItem[] = []
  for (let s = 0; s <= 20; s += 1) {
    for (let c = 0; c <= 8; c += 1) {
      if ((s * 3 + c * 5 + seed) % 7 !== 0) continue
      items.push({ sph: -s * 0.25, cyl: -c * 0.25, qty: ((s + c + seed) % 5) + 1 })
    }
  }
  items.push({ sph: 1.5, cyl: -0.5, qty: 4 }, { sph: 2, cyl: 0, qty: 2 })
  return items
}

let extraSeq = 1

export function updateCatalogProduct(id: string, patch: Partial<ProductRow>) {
  const item = productCatalog.find((row) => row.id === id)
  if (!item) return null
  Object.assign(item, patch)
  return item
}

export function removeCatalogProducts(ids: string[]) {
  const drop = new Set(ids)
  let count = 0
  for (let i = productCatalog.length - 1; i >= 0; i -= 1) {
    if (!drop.has(productCatalog[i]!.id)) continue
    productCatalog.splice(i, 1)
    count += 1
  }
  return count
}

export function setCatalogEnabled(ids: string[], enabled: boolean) {
  const pick = new Set(ids)
  for (const item of productCatalog) {
    if (pick.has(item.id)) item.enabled = enabled
  }
}

export function setCatalogPrice(ids: string[], price: number) {
  const pick = new Set(ids)
  for (const item of productCatalog) {
    if (pick.has(item.id)) item.price = price
  }
}

export function addCatalogProduct(seed: Omit<Seed, "id"> & { id?: string }) {
  const id = seed.id || `X${String(extraSeq).padStart(4, "0")}`
  extraSeq += 1
  const item = row({ ...seed, id })
  productCatalog.push(item)
  if (item.cat === "镜片") degreeStockMap[item.id] = lensDegrees(extraSeq + 30)
  return item
}

export const degreeStockMap: Record<string, DegreeStockItem[]> = Object.fromEntries(
  productCatalog.filter((item) => item.cat === "镜片").map((item) => [item.id, lensDegrees(Number(item.id.replace(/\D/g, "")) || 1)])
)
