/** 商城商品：本地持久化产品资料 id 列表 + 商城价/上架状态（演示用） */
const STORAGE_KEY = "mall-goods-ids"
const META_KEY = "mall-goods-meta"
const SERIES_ORDER_KEY = "mall-series-order"

export type MallGoodsMeta = {
  /** 商城原价；未设置时为空 */
  mallPrice?: number | null
  /** 商城优惠价；未设置时为空 */
  mallPromoPrice?: number | null
  /** 是否上架，默认 true */
  shelfOn?: boolean
  /** 积分兑换所需积分；未设置时为空 */
  pointsToRedeem?: number | null
  /** 积分兑换所需现金；未设置时为空 */
  pointsCash?: number | null
  /** 定时上架时间；未设置时为空 */
  shelfOnAt?: string | null
  /** 定时下架时间；未设置时为空 */
  shelfOffAt?: string | null
  /** 商城商品封面图（data URL / url）；覆盖产品资料图 */
  mallImage?: string | null
}

function readIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return [...new Set(parsed.map((id) => String(id)).filter(Boolean))]
  } catch {
    return []
  }
}

function writeIds(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...new Set(ids.filter(Boolean))]))
}

function readMetaMap(): Record<string, MallGoodsMeta> {
  try {
    const raw = localStorage.getItem(META_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {}
    return parsed as Record<string, MallGoodsMeta>
  } catch {
    return {}
  }
}

function writeMetaMap(map: Record<string, MallGoodsMeta>) {
  localStorage.setItem(META_KEY, JSON.stringify(map))
}

export function getMallGoodsIds(): string[] {
  return readIds()
}

export function getMallGoodsMetaMap(): Record<string, MallGoodsMeta> {
  return readMetaMap()
}

export function getMallGoodsMeta(id: string): MallGoodsMeta {
  const map = readMetaMap()
  const hit = map[String(id)]
  if (!hit) return { shelfOn: true, mallPrice: null, mallPromoPrice: null, pointsToRedeem: null, pointsCash: null, shelfOnAt: null, shelfOffAt: null, mallImage: null }
  return {
    mallPrice: hit.mallPrice ?? null,
    mallPromoPrice: hit.mallPromoPrice ?? null,
    shelfOn: hit.shelfOn !== false,
    pointsToRedeem: hit.pointsToRedeem ?? null,
    pointsCash: hit.pointsCash ?? null,
    shelfOnAt: hit.shelfOnAt ?? null,
    shelfOffAt: hit.shelfOffAt ?? null,
    mallImage: hit.mallImage ?? null
  }
}

function ensureMeta(id: string, map: Record<string, MallGoodsMeta>) {
  const key = String(id)
  if (!map[key]) map[key] = { shelfOn: true, mallPrice: null, mallPromoPrice: null, pointsToRedeem: null, pointsCash: null, shelfOnAt: null, shelfOffAt: null, mallImage: null }
  return map[key]
}

/** 追加产品资料 id，自动去重；可选按 id 写入初始商城原价（默认同步零售价）；优惠价默认空；返回实际新增数量 */
export function addMallGoodsIds(
  ids: string[],
  mallPriceById?: Record<string, number | null | undefined>
): number {
  const cur = readIds()
  const set = new Set(cur)
  const meta = readMetaMap()
  let added = 0
  for (const id of ids) {
    const key = String(id || "").trim()
    if (!key || set.has(key)) continue
    set.add(key)
    cur.push(key)
    const row = ensureMeta(key, meta)
    if (mallPriceById && Object.prototype.hasOwnProperty.call(mallPriceById, key)) {
      const raw = mallPriceById[key]
      row.mallPrice = raw == null || Number.isNaN(Number(raw)) ? null : Number(raw)
    }
    added += 1
  }
  writeIds(cur)
  writeMetaMap(meta)
  return added
}

export function removeMallGoodsIds(ids: string[]) {
  const drop = new Set(ids.map(String))
  writeIds(readIds().filter((id) => !drop.has(id)))
  const meta = readMetaMap()
  for (const id of drop) delete meta[id]
  writeMetaMap(meta)
}

export function clearMallGoodsIds() {
  writeIds([])
  writeMetaMap({})
}

export function setMallPrice(id: string, price: number | null) {
  const key = String(id)
  const meta = readMetaMap()
  const row = ensureMeta(key, meta)
  row.mallPrice = price == null || Number.isNaN(Number(price)) ? null : Number(price)
  writeMetaMap(meta)
}

export function setMallPromoPrice(id: string, price: number | null) {
  const key = String(id)
  const meta = readMetaMap()
  const row = ensureMeta(key, meta)
  row.mallPromoPrice = price == null || Number.isNaN(Number(price)) ? null : Number(price)
  writeMetaMap(meta)
}

export function setMallImage(id: string, url: string | null) {
  const key = String(id)
  const meta = readMetaMap()
  const row = ensureMeta(key, meta)
  const v = url == null ? null : String(url).trim()
  row.mallImage = v || null
  writeMetaMap(meta)
}

export function setMallShelfOn(id: string, on: boolean) {
  const key = String(id)
  const meta = readMetaMap()
  const row = ensureMeta(key, meta)
  row.shelfOn = !!on
  writeMetaMap(meta)
}

export function setPointsToRedeem(id: string, points: number | null) {
  const key = String(id)
  const meta = readMetaMap()
  const row = ensureMeta(key, meta)
  row.pointsToRedeem = points == null || Number.isNaN(Number(points)) ? null : Number(points)
  writeMetaMap(meta)
}

export function setPointsCash(id: string, cash: number | null) {
  const key = String(id)
  const meta = readMetaMap()
  const row = ensureMeta(key, meta)
  row.pointsCash = cash == null || Number.isNaN(Number(cash)) ? null : Number(cash)
  writeMetaMap(meta)
}

export function setShelfOnAt(id: string, at: string | null) {
  const key = String(id)
  const meta = readMetaMap()
  const row = ensureMeta(key, meta)
  const v = at == null ? null : String(at).trim()
  row.shelfOnAt = v || null
  writeMetaMap(meta)
}

export function setShelfOffAt(id: string, at: string | null) {
  const key = String(id)
  const meta = readMetaMap()
  const row = ensureMeta(key, meta)
  const v = at == null ? null : String(at).trim()
  row.shelfOffAt = v || null
  writeMetaMap(meta)
}

export function getMallSeriesOrder(): string[] {
  try {
    const raw = localStorage.getItem(SERIES_ORDER_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const out: string[] = []
    const seen = new Set<string>()
    for (const item of parsed) {
      const name = String(item || "").trim()
      if (!name || seen.has(name)) continue
      seen.add(name)
      out.push(name)
    }
    return out
  } catch {
    return []
  }
}

export function setMallSeriesOrder(order: string[]) {
  const out: string[] = []
  const seen = new Set<string>()
  for (const item of order || []) {
    const name = String(item || "").trim()
    if (!name || seen.has(name)) continue
    seen.add(name)
    out.push(name)
  }
  localStorage.setItem(SERIES_ORDER_KEY, JSON.stringify(out))
}
