export interface ProductCategoryRecord {
  id: string;
  parentId: string | null;
  name: string;
  sortOrder: number;
  isReadonly: boolean;
  productCount: number;
  createdAt?: string;
}

export interface ProductTagRecord {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  enabled: boolean;
  remark: string;
  createdAt?: string;
}

export interface ProductDictionaryRecord {
  id: string;
  dictType: 'stock_location' | 'manufacturer' | 'unit';
  name: string;
  sortOrder: number;
}

export interface ProductBrandOption {
  id: string;
  name: string;
  series: string[];
  enabled: boolean;
}

export interface ProductSupplierOption {
  id: string;
  name: string;
  contact: string;
  phone: string;
}

export interface ProductMetaResponse {
  categories: Array<{
    id: string;
    parent_id: string | null;
    name: string;
    sort_order: number;
    is_readonly: boolean;
  }>;
  brands: ProductBrandOption[];
  suppliers: ProductSupplierOption[];
  tags: Array<{
    id: string;
    name: string;
    color: string;
    sort_order: number;
    enabled: boolean;
    remark: string;
  }>;
  dictionaries: Array<{
    id: string;
    dict_type: 'stock_location' | 'manufacturer' | 'unit';
    name: string;
    sort_order: number;
  }>;
}

export interface ProductRecord {
  id: string;
  skuCode: string;
  name: string;
  brandId: string;
  brandName: string;
  categoryId: string;
  categoryName: string;
  model: string;
  colorOrDiopter: string;
  series: string;
  year: number | null;
  refractiveIndex: string;
  isCustomLens: boolean;
  axis: string;
  coatingType: string;
  contactLensType: string;
  retailPrice: string;
  salesDiscount: string;
  discountedPrice: string;
  costPrice?: string;
  wholesalePrice?: string;
  barcode: string;
  stockLocation: string;
  unit: string;
  pinOnSale: boolean;
  tags: string[];
  imageUrl?: string;
  supplierId: string;
  supplierName: string;
  minStock: number | null;
  maxStock: number | null;
  manufacturer: string;
  productionLicenseNo: string;
  filingCertNo: string;
  originPlace: string;
  licenseExpiresOn: string;
  licenseImageUrl?: string;
  storeId: string;
  storeName: string;
  enabled: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface ProductWritePayload {
  skuCode?: string;
  name: string;
  brandId?: string;
  brandName: string;
  categoryId: string;
  categoryName: string;
  model: string;
  colorOrDiopter: string;
  series: string;
  year: number | null;
  refractiveIndex: string;
  isCustomLens: boolean;
  axis: string;
  coatingType: string;
  contactLensType: string;
  retailPrice: string;
  salesDiscount: string;
  discountedPrice: string;
  costPrice?: string;
  wholesalePrice?: string;
  barcode: string;
  stockLocation: string;
  unit: string;
  pinOnSale: boolean;
  tags: string[];
  imageUrl?: string | null;
  supplierId?: string;
  supplierName: string;
  minStock: number | null;
  maxStock: number | null;
  manufacturer: string;
  productionLicenseNo: string;
  filingCertNo: string;
  originPlace: string;
  licenseExpiresOn: string;
  licenseImageUrl?: string | null;
  storeId?: string;
  storeName?: string;
  enabled: boolean;
}

export interface LensSurchargeRule {
  id: string;
  name: string;
  surchargeType: string;
  categoryId: string;
  categoryName: string;
  brandId: string;
  brandName: string;
  sphRanges: string[];
  cylRanges: string[];
  matrix: number[][];
  confirmDelete: boolean;
  enabled: boolean;
  remark: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductListParams {
  page: number;
  pageSize: number;
  keyword?: string;
  categoryId?: string;
  brand?: string;
  enabled?: string;
  isCustomLens?: string;
  tag?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ProductListResponse {
  items: ProductRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export const DEFAULT_SPH_RANGES = [
  '0.00到-6.25',
  '-6.25到-8.25',
  '-8.25到-10.25',
  '-10.25到-31.00',
];

export const DEFAULT_CYL_RANGES = [
  '0.00到-1.25',
  '-1.25到-2.25',
  '-2.25到-3.25',
  '-3.25到-4.25',
  '-4.25到-6.25',
  '-6.25到-31.00',
];

/**
 * Parses a range string like "0.00到-1.25" or "-2.00~-3.00" and checks if value falls inside [start, end).
 * Supports both ascending (e.g. +0.00 到 +4.00) and descending negative diopter ranges (0.00 到 -2.00).
 */
export function matchesDiopterRange(rangeLabel: string, value: number): boolean {
  const cleaned = rangeLabel.replace(/\s+/g, '');
  const match = /^([+-]?\d+(?:\.\d+)?)(?:到|~|至|-)([+-]?\d+(?:\.\d+)?)$/.exec(cleaned);
  if (!match) return false;
  const start = Number.parseFloat(match[1]);
  const end = Number.parseFloat(match[2]);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return false;
  if (start >= end) {
    // Negative direction e.g. 0.00 到 -2.00: [0.00, -2.00) -> value <= start && value > end
    return value <= start + 1e-6 && value > end + 1e-6;
  }
  // Positive direction e.g. 0.00 到 +2.00: [start, end)
  return value >= start - 1e-6 && value < end - 1e-6;
}

export function computeLensSurcharge(
  rule: LensSurchargeRule,
  sph: number,
  cyl: number
): { matched: boolean; amount: number; sphLabel?: string; cylLabel?: string } {
  const rIdx = rule.sphRanges.findIndex((label) => matchesDiopterRange(label, sph));
  const cIdx = rule.cylRanges.findIndex((label) => matchesDiopterRange(label, cyl));
  if (rIdx === -1 || cIdx === -1) {
    return { matched: false, amount: 0 };
  }
  const amount = Number(rule.matrix?.[rIdx]?.[cIdx] ?? 0);
  return {
    matched: true,
    amount: Number.isFinite(amount) ? amount : 0,
    sphLabel: rule.sphRanges[rIdx],
    cylLabel: rule.cylRanges[cIdx],
  };
}

const API_ROOT = `${import.meta.env.BASE_URL}api`;

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof body?.error === 'string' ? body.error : `请求失败（${response.status}）`);
  }
  return body as T;
}

// Local debug storage fallback (active only when debugMode = true in standalone local sandbox)
const DBG_CATS = 'qsl_dbg_prod_cats_v1';
const DBG_TAGS = 'qsl_dbg_prod_tags_v1';
const DBG_DICTS = 'qsl_dbg_prod_dicts_v1';
const DBG_PRODS = 'qsl_dbg_prod_list_v1';
const DBG_SURCHARGES = 'qsl_dbg_lens_surcharges_v1';

const SEED_CATS: ProductCategoryRecord[] = [
  { id: 'cat_sunglass', parentId: null, name: '太阳镜', sortOrder: 10, isReadonly: false, productCount: 1 },
  { id: 'cat_care', parentId: null, name: '护理液', sortOrder: 20, isReadonly: false, productCount: 1 },
  { id: 'cat_care_multi', parentId: 'cat_care', name: '多功能护理液', sortOrder: 10, isReadonly: false, productCount: 1 },
  { id: 'cat_contact', parentId: null, name: '隐形眼镜', sortOrder: 30, isReadonly: false, productCount: 1 },
  { id: 'cat_lens', parentId: null, name: '镜片', sortOrder: 40, isReadonly: false, productCount: 2 },
  { id: 'cat_lens_single', parentId: 'cat_lens', name: '单光/防蓝光片', sortOrder: 10, isReadonly: false, productCount: 1 },
  { id: 'cat_lens_control', parentId: 'cat_lens', name: '青少年离焦/渐进片', sortOrder: 20, isReadonly: false, productCount: 1 },
  { id: 'cat_frame', parentId: null, name: '镜架', sortOrder: 50, isReadonly: false, productCount: 2 },
  { id: 'cat_frame_titan', parentId: 'cat_frame', name: '纯钛/β钛架', sortOrder: 10, isReadonly: false, productCount: 1 },
  { id: 'cat_frame_acetate', parentId: 'cat_frame', name: '板材/TR架', sortOrder: 20, isReadonly: false, productCount: 1 },
  { id: 'cat_accessory', parentId: null, name: '辅料', sortOrder: 60, isReadonly: false, productCount: 0 },
  { id: 'cat_other', parentId: null, name: '其他', sortOrder: 70, isReadonly: false, productCount: 0 },
  { id: 'cat_reading', parentId: null, name: '老花镜', sortOrder: 80, isReadonly: false, productCount: 0 },
  { id: 'cat_craft', parentId: null, name: '加工工艺', sortOrder: 90, isReadonly: false, productCount: 0 },
  { id: 'cat_training', parentId: null, name: '视觉训练', sortOrder: 100, isReadonly: false, productCount: 0 },
];

const SEED_TAGS: ProductTagRecord[] = [
  { id: 'pt_1', name: '热销爆款', color: 'amber', sortOrder: 10, enabled: true, remark: '门店主推畅销款' },
  { id: 'pt_2', name: '青少年防控', color: 'emerald', sortOrder: 20, enabled: true, remark: '离焦/防控专用系列' },
  { id: 'pt_3', name: '防蓝光', color: 'blue', sortOrder: 30, enabled: true, remark: '日常数码防护' },
  { id: 'pt_4', name: '高折射率', color: 'violet', sortOrder: 40, enabled: true, remark: '1.67 / 1.74 超薄需求' },
  { id: 'pt_5', name: '超轻纯钛', color: 'default', sortOrder: 50, enabled: true, remark: '轻量化佩戴体验' },
];

const SEED_DICTS: ProductDictionaryRecord[] = [
  { id: 'pd_1', dictType: 'stock_location', name: 'A区-精品镜架柜', sortOrder: 10 },
  { id: 'pd_2', dictType: 'stock_location', name: 'B区-太阳镜专柜', sortOrder: 20 },
  { id: 'pd_3', dictType: 'stock_location', name: 'C区-镜片阴凉柜', sortOrder: 30 },
  { id: 'pd_4', dictType: 'manufacturer', name: '卡尔蔡司光学（广州）有限公司', sortOrder: 10 },
  { id: 'pd_5', dictType: 'manufacturer', name: '上海依视路光学有限公司', sortOrder: 20 },
];

const SEED_PRODUCTS: ProductRecord[] = [
  {
    id: 'prod_dbg_1',
    skuCode: 'QSL-FRAME-1064',
    name: 'GOOD4镜架',
    brandId: 'b_good4',
    brandName: 'GOOD4',
    categoryId: 'cat_frame_titan',
    categoryName: '纯钛/β钛架',
    model: '1064',
    colorOrDiopter: 'BK',
    series: '经典系列',
    year: 2026,
    refractiveIndex: '',
    isCustomLens: false,
    axis: '',
    coatingType: '',
    contactLensType: '',
    retailPrice: '5180.00',
    salesDiscount: '100.00',
    discountedPrice: '5180.00',
    costPrice: '2150.00',
    wholesalePrice: '2880.00',
    barcode: '6901064000011',
    stockLocation: 'A区-精品镜架柜',
    unit: '副',
    pinOnSale: true,
    tags: ['热销爆款', '超轻纯钛'],
    supplierId: 'sup_linberg_03',
    supplierName: '北欧钛架联合供货商',
    minStock: 2,
    maxStock: 20,
    manufacturer: '',
    productionLicenseNo: '',
    filingCertNo: '',
    originPlace: '中国深圳',
    licenseExpiresOn: '',
    storeId: 'store_hq_01',
    storeName: '杭州西湖旗舰店',
    enabled: true,
    createdAt: '2026-11-10T09:00:00Z',
  },
  {
    id: 'prod_dbg_2',
    skuCode: 'QSL-LENS-ZEISS-159',
    name: '蔡司镜片小瞳堡钻立方爱动膜 1.59',
    brandId: 'b_zeiss',
    brandName: '卡尔蔡司',
    categoryId: 'cat_lens_control',
    categoryName: '青少年离焦/渐进片',
    model: 'ZEISS-MYOCARE-159',
    colorOrDiopter: '0.00 ~ -8.00',
    series: '小瞳堡',
    year: 2026,
    refractiveIndex: '1.59',
    isCustomLens: true,
    axis: '0-180',
    coatingType: '钻立方爱动膜',
    contactLensType: '',
    retailPrice: '2240.00',
    salesDiscount: '100.00',
    discountedPrice: '2240.00',
    costPrice: '890.00',
    wholesalePrice: '1240.00',
    barcode: '4049334101592',
    stockLocation: 'C区-镜片阴凉柜',
    unit: '片',
    pinOnSale: true,
    tags: ['青少年防控', '热销爆款'],
    supplierId: 'sup_zeiss_01',
    supplierName: '卡尔蔡司光学华东代理',
    minStock: 4,
    maxStock: 40,
    manufacturer: '卡尔蔡司光学（广州）有限公司',
    productionLicenseNo: '',
    filingCertNo: '',
    originPlace: '广东广州',
    licenseExpiresOn: '',
    storeId: 'store_hq_01',
    storeName: '杭州西湖旗舰店',
    enabled: true,
    createdAt: '2026-11-12T10:30:00Z',
  },
];

const SEED_SURCHARGES: LensSurchargeRule[] = [
  {
    id: 'sur_dbg_1',
    name: '通用散光附加费标准',
    surchargeType: '散光附加费',
    categoryId: '',
    categoryName: '全部',
    brandId: '',
    brandName: '全部',
    sphRanges: DEFAULT_SPH_RANGES,
    cylRanges: DEFAULT_CYL_RANGES,
    matrix: [
      [0, 0, 120, 200, 300, 480],
      [0, 80, 160, 260, 380, 560],
      [100, 160, 240, 340, 460, 680],
      [220, 280, 360, 480, 620, 880],
    ],
    confirmDelete: true,
    enabled: true,
    remark: '度数范围按前闭后开 [起始, 结束) 匹配',
  },
];

function readDbg<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeDbg<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
}

export const productsApi = {
  async getMeta(debugMode: boolean): Promise<ProductMetaResponse> {
    if (!debugMode) {
      return requestJson<ProductMetaResponse>(`${API_ROOT}/products/meta`);
    }
    const cats = readDbg(DBG_CATS, SEED_CATS);
    const tags = readDbg(DBG_TAGS, SEED_TAGS);
    const dicts = readDbg(DBG_DICTS, SEED_DICTS);
    return {
      categories: cats.map((c) => ({
        id: c.id,
        parent_id: c.parentId,
        name: c.name,
        sort_order: c.sortOrder,
        is_readonly: c.isReadonly,
      })),
      brands: [
        { id: 'b_zeiss', name: '卡尔蔡司', series: ['小瞳堡', '泽锐', '智锐'], enabled: true },
        { id: 'b_essilor', name: '依视路', series: ['星趣控', '钻晶A4', '膜岩'], enabled: true },
        { id: 'b_good4', name: 'GOOD4', series: ['经典系列'], enabled: true },
        { id: 'b_dupont', name: '都彭', series: ['商务系列'], enabled: true },
      ],
      suppliers: [
        { id: 'sup_zeiss_01', name: '卡尔蔡司光学华东代理', contact: '张经理', phone: '13800138001' },
        { id: 'sup_essilor_02', name: '依视路镜片供应链中心', contact: '李经理', phone: '13800138002' },
        { id: 'sup_linberg_03', name: '北欧钛架联合供货商', contact: '王经理', phone: '13800138003' },
      ],
      tags: tags.map((t) => ({
        id: t.id,
        name: t.name,
        color: t.color,
        sort_order: t.sortOrder,
        enabled: t.enabled,
        remark: t.remark,
      })),
      dictionaries: dicts.map((d) => ({
        id: d.id,
        dict_type: d.dictType,
        name: d.name,
        sort_order: d.sortOrder,
      })),
    };
  },

  async quickAddBrand(name: string, kind: '自营品牌' | '代理品牌', debugMode: boolean): Promise<ProductBrandOption> {
    if (!debugMode) {
      const res = await requestJson<{ item: ProductBrandOption }>(`${API_ROOT}/products/quick-brand`, {
        method: 'POST',
        body: JSON.stringify({ name, kind }),
      });
      return res.item;
    }
    return { id: `b_${Date.now()}`, name: name.trim(), series: [], enabled: true };
  },

  async listProducts(params: ProductListParams, debugMode: boolean): Promise<ProductListResponse> {
    if (!debugMode) {
      const qs = new URLSearchParams({
        page: String(params.page),
        pageSize: String(params.pageSize),
        ...(params.keyword?.trim() ? { keyword: params.keyword.trim() } : {}),
        ...(params.categoryId && params.categoryId !== 'all' ? { categoryId: params.categoryId } : {}),
        ...(params.brand && params.brand !== 'all' ? { brand: params.brand } : {}),
        ...(params.enabled && params.enabled !== 'all' ? { enabled: params.enabled } : {}),
        ...(params.isCustomLens && params.isCustomLens !== 'all' ? { isCustomLens: params.isCustomLens } : {}),
        ...(params.tag && params.tag !== 'all' ? { tag: params.tag } : {}),
        ...(params.sortBy ? { sortBy: params.sortBy } : {}),
        ...(params.sortOrder ? { sortOrder: params.sortOrder } : {}),
      });
      return requestJson<ProductListResponse>(`${API_ROOT}/products?${qs.toString()}`);
    }

    const cats = readDbg(DBG_CATS, SEED_CATS);
    const collectIds = (rootId: string): Set<string> => {
      const set = new Set([rootId]);
      const queue = [rootId];
      while (queue.length) {
        const cur = queue.shift()!;
        for (const c of cats) {
          if (c.parentId === cur) {
            set.add(c.id);
            queue.push(c.id);
          }
        }
      }
      return set;
    };
    const catFilter = params.categoryId && params.categoryId !== 'all' ? collectIds(params.categoryId) : null;
    const kw = (params.keyword ?? '').trim().toLowerCase();
    const filtered = readDbg(DBG_PRODS, SEED_PRODUCTS).filter((p) => {
      if (catFilter && !catFilter.has(p.categoryId)) return false;
      if (params.brand && params.brand !== 'all' && p.brandName !== params.brand) return false;
      if (params.enabled === 'true' && !p.enabled) return false;
      if (params.enabled === 'false' && p.enabled) return false;
      if (params.isCustomLens === 'true' && !p.isCustomLens) return false;
      if (params.isCustomLens === 'false' && p.isCustomLens) return false;
      if (params.tag && params.tag !== 'all' && !p.tags.includes(params.tag)) return false;
      if (
        kw &&
        ![p.name, p.skuCode, p.brandName, p.model, p.colorOrDiopter, p.barcode].some((f) =>
          f.toLowerCase().includes(kw)
        )
      ) {
        return false;
      }
      return true;
    });
    const start = (params.page - 1) * params.pageSize;
    return {
      items: filtered.slice(start, start + params.pageSize),
      total: filtered.length,
      page: params.page,
      pageSize: params.pageSize,
    };
  },

  async createProduct(payload: ProductWritePayload, debugMode: boolean): Promise<ProductRecord> {
    if (!debugMode) {
      const res = await requestJson<{ item: ProductRecord }>(`${API_ROOT}/products`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.item;
    }
    const existing = readDbg(DBG_PRODS, SEED_PRODUCTS);
    const created: ProductRecord = {
      ...payload,
      id: `prod_${Date.now()}`,
      skuCode: payload.skuCode?.trim() || `QSL-${String(Date.now()).slice(-6)}`,
      brandId: payload.brandId ?? '',
      supplierId: payload.supplierId ?? '',
      imageUrl: payload.imageUrl ?? undefined,
      licenseImageUrl: payload.licenseImageUrl ?? undefined,
      storeId: payload.storeId ?? 'store_hq_01',
      storeName: payload.storeName ?? '杭州西湖旗舰店',
      createdAt: new Date().toISOString(),
    };
    writeDbg(DBG_PRODS, [created, ...existing]);
    return created;
  },

  async updateProduct(id: string, payload: Partial<ProductWritePayload>, debugMode: boolean): Promise<ProductRecord> {
    if (!debugMode) {
      const res = await requestJson<{ item: ProductRecord }>(`${API_ROOT}/products/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      return res.item;
    }
    const list = readDbg(DBG_PRODS, SEED_PRODUCTS);
    const idx = list.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('未找到该商品');
    const updated: ProductRecord = {
      ...list[idx],
      ...payload,
      imageUrl: payload.imageUrl === null ? undefined : (payload.imageUrl ?? list[idx].imageUrl),
      licenseImageUrl: payload.licenseImageUrl === null ? undefined : (payload.licenseImageUrl ?? list[idx].licenseImageUrl),
      updatedAt: new Date().toISOString(),
    };
    list[idx] = updated;
    writeDbg(DBG_PRODS, list);
    return updated;
  },

  async deleteProduct(id: string, debugMode: boolean): Promise<void> {
    if (!debugMode) {
      await requestJson(`${API_ROOT}/products/${encodeURIComponent(id)}`, { method: 'DELETE' });
      return;
    }
    writeDbg(DBG_PRODS, readDbg(DBG_PRODS, SEED_PRODUCTS).filter((p) => p.id !== id));
  },

  async batchDeleteProducts(ids: string[], debugMode: boolean): Promise<{ deletedCount: number }> {
    if (!debugMode) {
      return requestJson(`${API_ROOT}/products/batch-delete`, {
        method: 'POST',
        body: JSON.stringify({ ids }),
      });
    }
    const idSet = new Set(ids);
    const list = readDbg(DBG_PRODS, SEED_PRODUCTS);
    const next = list.filter((p) => !idSet.has(p.id));
    writeDbg(DBG_PRODS, next);
    return { deletedCount: list.length - next.length };
  },

  async batchUpdateProducts(
    ids: string[],
    patch: { enabled?: boolean; salesDiscount?: string; stockLocation?: string; pinOnSale?: boolean; tags?: string[] },
    debugMode: boolean
  ): Promise<{ updatedCount: number }> {
    if (!debugMode) {
      return requestJson(`${API_ROOT}/products/batch-update`, {
        method: 'POST',
        body: JSON.stringify({ ids, patch }),
      });
    }
    const idSet = new Set(ids);
    let updatedCount = 0;
    const next = readDbg(DBG_PRODS, SEED_PRODUCTS).map((p) => {
      if (!idSet.has(p.id)) return p;
      updatedCount += 1;
      const discount = patch.salesDiscount !== undefined && patch.salesDiscount !== ''
        ? Number.parseFloat(patch.salesDiscount)
        : Number.parseFloat(p.salesDiscount);
      const retail = Number.parseFloat(p.retailPrice);
      return {
        ...p,
        enabled: patch.enabled ?? p.enabled,
        salesDiscount: discount.toFixed(2),
        discountedPrice: (Math.round(retail * (discount / 100) * 100) / 100).toFixed(2),
        stockLocation: patch.stockLocation || p.stockLocation,
        pinOnSale: patch.pinOnSale ?? p.pinOnSale,
        tags: patch.tags ?? p.tags,
      };
    });
    writeDbg(DBG_PRODS, next);
    return { updatedCount };
  },

  async importProducts(
    items: Array<{ skuCode?: string; brandName: string; categoryName: string; name: string; model: string; colorOrDiopter?: string; retailPrice: string; salesDiscount?: string }>,
    debugMode: boolean
  ): Promise<{ importedCount: number }> {
    if (!debugMode) {
      return requestJson(`${API_ROOT}/products/import`, {
        method: 'POST',
        body: JSON.stringify({ items }),
      });
    }
    const prev = readDbg(DBG_PRODS, SEED_PRODUCTS);
    const added: ProductRecord[] = items.map((r, i) => ({
      id: `prod_imp_${Date.now()}_${i}`,
      skuCode: r.skuCode || `QSL-IMP-${Date.now().toString().slice(-4)}${i}`,
      name: r.name,
      brandId: '',
      brandName: r.brandName,
      categoryId: 'cat_lens_single',
      categoryName: r.categoryName,
      model: r.model,
      colorOrDiopter: r.colorOrDiopter ?? '',
      series: '',
      year: 2026,
      refractiveIndex: '',
      isCustomLens: false,
      axis: '',
      coatingType: '',
      contactLensType: '',
      retailPrice: Number(r.retailPrice || 0).toFixed(2),
      salesDiscount: Number(r.salesDiscount || 100).toFixed(2),
      discountedPrice: Number(r.retailPrice || 0).toFixed(2),
      barcode: '',
      stockLocation: '',
      unit: '',
      pinOnSale: false,
      tags: [],
      supplierId: '',
      supplierName: '',
      minStock: null,
      maxStock: null,
      manufacturer: '',
      productionLicenseNo: '',
      filingCertNo: '',
      originPlace: '',
      licenseExpiresOn: '',
      storeId: 'store_hq_01',
      storeName: '杭州西湖旗舰店',
      enabled: true,
      createdAt: new Date().toISOString(),
    }));
    writeDbg(DBG_PRODS, [...added, ...prev]);
    return { importedCount: added.length };
  },

  // Categories
  async listCategories(debugMode: boolean): Promise<{ items: ProductCategoryRecord[]; totalProducts: number }> {
    if (!debugMode) {
      return requestJson(`${API_ROOT}/product-categories`);
    }
    const prods = readDbg(DBG_PRODS, SEED_PRODUCTS);
    const cats = readDbg(DBG_CATS, SEED_CATS).map((c) => {
      const ids = new Set<string>([c.id]);
      const rawAll = readDbg(DBG_CATS, SEED_CATS);
      const q = [c.id];
      while (q.length) {
        const cur = q.shift()!;
        for (const sub of rawAll) {
          if (sub.parentId === cur) {
            ids.add(sub.id);
            q.push(sub.id);
          }
        }
      }
      return { ...c, productCount: prods.filter((p) => ids.has(p.categoryId)).length };
    });
    return { items: cats, totalProducts: prods.length };
  },

  async createCategory(
    payload: { name: string; parentId: string | null; sortOrder?: number; isReadonly?: boolean },
    debugMode: boolean
  ): Promise<ProductCategoryRecord> {
    if (!debugMode) {
      const res = await requestJson<{ item: ProductCategoryRecord }>(`${API_ROOT}/product-categories`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.item;
    }
    const list = readDbg(DBG_CATS, SEED_CATS);
    const item: ProductCategoryRecord = {
      id: `cat_${Date.now()}`,
      parentId: payload.parentId,
      name: payload.name.trim(),
      sortOrder: payload.sortOrder ?? 100,
      isReadonly: Boolean(payload.isReadonly),
      productCount: 0,
    };
    writeDbg(DBG_CATS, [...list, item]);
    return item;
  },

  async updateCategory(
    id: string,
    payload: { name?: string; isReadonly?: boolean; sortOrder?: number },
    debugMode: boolean
  ): Promise<ProductCategoryRecord> {
    if (!debugMode) {
      const res = await requestJson<{ item: ProductCategoryRecord }>(`${API_ROOT}/product-categories/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      return res.item;
    }
    const list = readDbg(DBG_CATS, SEED_CATS);
    const idx = list.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error('品类不存在');
    const updated = { ...list[idx], ...payload };
    list[idx] = updated;
    writeDbg(DBG_CATS, list);
    return updated;
  },

  async batchDeleteCategories(ids: string[], debugMode: boolean): Promise<{ deletedCount: number }> {
    if (!debugMode) {
      return requestJson(`${API_ROOT}/product-categories/batch-delete`, {
        method: 'POST',
        body: JSON.stringify({ ids }),
      });
    }
    const idSet = new Set(ids);
    const list = readDbg(DBG_CATS, SEED_CATS);
    const next = list.filter((c) => !idSet.has(c.id));
    writeDbg(DBG_CATS, next);
    return { deletedCount: list.length - next.length };
  },

  async deleteCategory(id: string, debugMode: boolean): Promise<void> {
    if (!debugMode) {
      await requestJson(`${API_ROOT}/product-categories/${encodeURIComponent(id)}`, { method: 'DELETE' });
      return;
    }
    writeDbg(DBG_CATS, readDbg(DBG_CATS, SEED_CATS).filter((c) => c.id !== id && c.parentId !== id));
  },

  // Tags
  async listTags(debugMode: boolean): Promise<ProductTagRecord[]> {
    if (!debugMode) {
      const res = await requestJson<{ items: ProductTagRecord[] }>(`${API_ROOT}/product-tags`);
      return res.items;
    }
    return readDbg(DBG_TAGS, SEED_TAGS);
  },

  async createTag(
    payload: { name: string; color?: string; remark?: string; enabled?: boolean; sortOrder?: number },
    debugMode: boolean
  ): Promise<ProductTagRecord> {
    if (!debugMode) {
      const res = await requestJson<{ item: ProductTagRecord }>(`${API_ROOT}/product-tags`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.item;
    }
    const list = readDbg(DBG_TAGS, SEED_TAGS);
    if (list.some((t) => t.name.toLowerCase() === payload.name.trim().toLowerCase())) {
      throw new Error('该选品标签已存在');
    }
    const item: ProductTagRecord = {
      id: `pt_${Date.now()}`,
      name: payload.name.trim(),
      color: payload.color || 'default',
      sortOrder: payload.sortOrder ?? list.length * 10 + 10,
      enabled: payload.enabled ?? true,
      remark: payload.remark ?? '',
    };
    writeDbg(DBG_TAGS, [...list, item]);
    return item;
  },

  async updateTag(
    id: string,
    payload: Partial<{ name: string; color: string; remark: string; enabled: boolean; sortOrder: number }>,
    debugMode: boolean
  ): Promise<ProductTagRecord> {
    if (!debugMode) {
      const res = await requestJson<{ item: ProductTagRecord }>(`${API_ROOT}/product-tags/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      return res.item;
    }
    const list = readDbg(DBG_TAGS, SEED_TAGS);
    const idx = list.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error('标签不存在');
    const updated = { ...list[idx], ...payload };
    list[idx] = updated;
    writeDbg(DBG_TAGS, list);
    return updated;
  },

  async deleteTag(id: string, debugMode: boolean): Promise<void> {
    if (!debugMode) {
      await requestJson(`${API_ROOT}/product-tags/${encodeURIComponent(id)}`, { method: 'DELETE' });
      return;
    }
    writeDbg(DBG_TAGS, readDbg(DBG_TAGS, SEED_TAGS).filter((t) => t.id !== id));
  },

  // Dictionaries
  async listDictionaries(dictType: 'stock_location' | 'manufacturer' | 'unit', debugMode: boolean): Promise<ProductDictionaryRecord[]> {
    if (!debugMode) {
      const res = await requestJson<{ items: ProductDictionaryRecord[] }>(`${API_ROOT}/product-dictionaries?type=${dictType}`);
      return res.items;
    }
    return readDbg(DBG_DICTS, SEED_DICTS).filter((d) => d.dictType === dictType);
  },

  async createDictionary(
    dictType: 'stock_location' | 'manufacturer' | 'unit',
    name: string,
    debugMode: boolean
  ): Promise<ProductDictionaryRecord> {
    if (!debugMode) {
      const res = await requestJson<{ item: ProductDictionaryRecord }>(`${API_ROOT}/product-dictionaries`, {
        method: 'POST',
        body: JSON.stringify({ dictType, name }),
      });
      return res.item;
    }
    const list = readDbg(DBG_DICTS, SEED_DICTS);
    const item: ProductDictionaryRecord = {
      id: `pd_${Date.now()}`,
      dictType,
      name: name.trim(),
      sortOrder: list.length * 10 + 10,
    };
    writeDbg(DBG_DICTS, [...list, item]);
    return item;
  },

  async deleteDictionary(id: string, debugMode: boolean): Promise<void> {
    if (!debugMode) {
      await requestJson(`${API_ROOT}/product-dictionaries/${encodeURIComponent(id)}`, { method: 'DELETE' });
      return;
    }
    writeDbg(DBG_DICTS, readDbg(DBG_DICTS, SEED_DICTS).filter((d) => d.id !== id));
  },

  // Lens surcharges
  async listLensSurcharges(search: string, debugMode: boolean): Promise<LensSurchargeRule[]> {
    if (!debugMode) {
      const res = await requestJson<{ items: LensSurchargeRule[] }>(
        `${API_ROOT}/lens-surcharges${search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ''}`
      );
      return res.items;
    }
    const kw = search.trim().toLowerCase();
    return readDbg(DBG_SURCHARGES, SEED_SURCHARGES).filter((r) =>
      !kw || [r.name, r.categoryName, r.brandName].some((f) => f.toLowerCase().includes(kw))
    );
  },

  async createLensSurcharge(
    payload: Omit<LensSurchargeRule, 'id' | 'createdAt' | 'updatedAt'>,
    debugMode: boolean
  ): Promise<LensSurchargeRule> {
    if (!debugMode) {
      const res = await requestJson<{ item: LensSurchargeRule }>(`${API_ROOT}/lens-surcharges`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.item;
    }
    const list = readDbg(DBG_SURCHARGES, SEED_SURCHARGES);
    const item: LensSurchargeRule = {
      ...payload,
      id: `sur_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    writeDbg(DBG_SURCHARGES, [item, ...list]);
    return item;
  },

  async updateLensSurcharge(
    id: string,
    payload: Partial<Omit<LensSurchargeRule, 'id'>>,
    debugMode: boolean
  ): Promise<LensSurchargeRule> {
    if (!debugMode) {
      const res = await requestJson<{ item: LensSurchargeRule }>(`${API_ROOT}/lens-surcharges/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      return res.item;
    }
    const list = readDbg(DBG_SURCHARGES, SEED_SURCHARGES);
    const idx = list.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error('加价规则不存在');
    const updated: LensSurchargeRule = {
      ...list[idx],
      ...payload,
      updatedAt: new Date().toISOString(),
    };
    list[idx] = updated;
    writeDbg(DBG_SURCHARGES, list);
    return updated;
  },

  async deleteLensSurcharge(id: string, debugMode: boolean): Promise<void> {
    if (!debugMode) {
      await requestJson(`${API_ROOT}/lens-surcharges/${encodeURIComponent(id)}`, { method: 'DELETE' });
      return;
    }
    writeDbg(DBG_SURCHARGES, readDbg(DBG_SURCHARGES, SEED_SURCHARGES).filter((r) => r.id !== id));
  },
};
