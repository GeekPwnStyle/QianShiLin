import type { DataScopeContext } from '@/src/shared/types/common';

export interface CustomerProfile {
  id: string;
  memberNo: string;
  name: string;
  phone: string;
  phoneMasked?: boolean;
  gender: '男' | '女';
  birthday: string;
  age: number;
  ageGroup: string;
  address: string;
  remark: string;
  tier: string;
  avatarUrl?: string;
  medicalIdNo: string;
  tags: string[];
  storeId: string;
  storeName: string;
  guideName: string;
  source: string;
  relatedAccount: string;
  customerType: string;
  wechatFollowed: boolean;
  refundableAmount: string;
  storedValueBalance: string;
  pointsBalance: number;
  visitCount: number;
  lastVisitDate: string;
  nextReviewDate: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerTagDefinition {
  id: string;
  name: string;
  sort_order: number;
}

export interface CustomerListParams {
  page: number;
  pageSize: number;
  keyword?: string;
  storeId?: string;
  gender?: string;
  tier?: string;
}

export interface CustomerListResponse {
  items: CustomerProfile[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CustomerWritePayload {
  name: string;
  phone: string;
  gender: '男' | '女';
  birthday: string | null;
  age: number;
  ageGroup: string;
  address: string;
  remark: string;
  memberNo: string;
  tier: string;
  avatarUrl: string | null;
  medicalIdNo: string;
  tags: string[];
  storeId: string;
  guideName?: string;
  source?: string;
  relatedAccount?: string;
  customerType?: string;
  wechatFollowed?: boolean;
  nextReviewDate?: string | null;
}

export const CUSTOMER_TIER_OPTIONS = [
  '普通顾客',
  '银卡会员',
  '金卡会员',
  '黑卡会员',
  '青少年护眼会员',
] as const;

export const CUSTOMER_AGE_GROUP_OPTIONS = [
  '儿童（0-12岁）',
  '青少年（13-17岁）',
  '青年（18-35岁）',
  '中年（36-59岁）',
  '长者（60岁及以上）',
] as const;

export function computeAgeFromBirthday(birthday: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthday)) return 0;
  const [y, m, d] = birthday.split('-').map(Number);
  const today = new Date();
  let age = today.getFullYear() - y;
  const monthDiff = today.getMonth() + 1 - m;
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d)) {
    age -= 1;
  }
  return Math.max(0, Math.min(150, age));
}

export function suggestAgeGroup(age: number): string {
  if (age <= 12) return '儿童（0-12岁）';
  if (age <= 17) return '青少年（13-17岁）';
  if (age <= 35) return '青年（18-35岁）';
  if (age <= 59) return '中年（36-59岁）';
  return '长者（60岁及以上）';
}

const API_BASE = `${import.meta.env.BASE_URL}api/customers`;
const DEBUG_CUSTOMERS_KEY = 'qsl_debug_customers_v1';
const DEBUG_TAGS_KEY = 'qsl_debug_customer_tags_v1';

const STORE_NAMES: Record<string, string> = {
  store_hq_01: '杭州西湖旗舰店',
  store_hz_02: '杭州滨江天街店',
  store_sh_03: '上海静安寺店',
  store_nj_04: '南京新街口店',
};

const INITIAL_DEBUG_TAGS: CustomerTagDefinition[] = [
  { id: 'tag_1', name: '高度近视', sort_order: 10 },
  { id: 'tag_2', name: '青少年防控', sort_order: 20 },
  { id: 'tag_3', name: '渐进多焦点', sort_order: 30 },
  { id: 'tag_4', name: '隐形眼镜常客', sort_order: 40 },
  { id: 'tag_5', name: 'VIP复购', sort_order: 50 },
  { id: 'tag_6', name: '太阳镜偏好', sort_order: 60 },
  { id: 'tag_7', name: '老花镜需求', sort_order: 70 },
];

const INITIAL_DEBUG_CUSTOMERS: CustomerProfile[] = [
  {
    id: 'cust_demo_01',
    memberNo: 'QSL-M-20260001',
    name: '沈若曦',
    phone: '13805718801',
    gender: '女',
    birthday: '1997-04-18',
    age: 29,
    ageGroup: '青年（18-35岁）',
    address: '杭州市西湖区文三路258号',
    remark: '偏好轻量化纯钛镜架，对防蓝光镀膜要求较高',
    tier: '黑卡会员',
    medicalIdNo: 'ZJ-33010619970418002X',
    tags: ['高度近视', 'VIP复购'],
    storeId: 'store_hq_01',
    storeName: '杭州西湖旗舰店',
    guideName: '苏晓晴',
    source: '门店接待',
    relatedAccount: '',
    customerType: '高价值会员',
    wechatFollowed: true,
    refundableAmount: '0.00',
    storedValueBalance: '2400.00',
    pointsBalance: 1850,
    visitCount: 6,
    lastVisitDate: '2026-11-12',
    nextReviewDate: '2027-05-12',
  },
  {
    id: 'cust_demo_02',
    memberNo: 'QSL-M-20260002',
    name: '林子昂',
    phone: '13958024419',
    gender: '男',
    birthday: '2013-09-03',
    age: 13,
    ageGroup: '青少年（13-17岁）',
    address: '杭州市滨江区江南大道388号',
    remark: '离焦镜片半年复查跟进中，家长希望周末预约',
    tier: '青少年护眼会员',
    medicalIdNo: '',
    tags: ['青少年防控'],
    storeId: 'store_hz_02',
    storeName: '杭州滨江天街店',
    guideName: '陈思琪',
    source: '视光筛查转入',
    relatedAccount: '',
    customerType: '青少年近视管理',
    wechatFollowed: true,
    refundableAmount: '0.00',
    storedValueBalance: '800.00',
    pointsBalance: 640,
    visitCount: 4,
    lastVisitDate: '2026-11-08',
    nextReviewDate: '2027-02-08',
  },
];

function readDebugCustomers(): CustomerProfile[] {
  try {
    const raw = window.localStorage.getItem(DEBUG_CUSTOMERS_KEY);
    if (!raw) return INITIAL_DEBUG_CUSTOMERS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CustomerProfile[]) : INITIAL_DEBUG_CUSTOMERS;
  } catch {
    return INITIAL_DEBUG_CUSTOMERS;
  }
}

function writeDebugCustomers(items: CustomerProfile[]): void {
  try {
    window.localStorage.setItem(DEBUG_CUSTOMERS_KEY, JSON.stringify(items));
  } catch {
    // Ignore quota errors
  }
}

function readDebugTags(): CustomerTagDefinition[] {
  try {
    const raw = window.localStorage.getItem(DEBUG_TAGS_KEY);
    if (!raw) return INITIAL_DEBUG_TAGS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CustomerTagDefinition[]) : INITIAL_DEBUG_TAGS;
  } catch {
    return INITIAL_DEBUG_TAGS;
  }
}

function writeDebugTags(items: CustomerTagDefinition[]): void {
  try {
    window.localStorage.setItem(DEBUG_TAGS_KEY, JSON.stringify(items));
  } catch {
    // Ignore quota errors
  }
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof data?.error === 'string' ? data.error : `请求失败（${response.status}）`);
  }
  return data as T;
}

export const customersApi = {
  async list(params: CustomerListParams, scope: DataScopeContext, debugMode: boolean): Promise<CustomerListResponse> {
    if (!debugMode) {
      const qs = new URLSearchParams({
        page: String(params.page),
        pageSize: String(params.pageSize),
        ...(params.keyword?.trim() ? { keyword: params.keyword.trim() } : {}),
        ...(params.storeId && params.storeId !== 'all' ? { storeId: params.storeId } : {}),
        ...(params.gender && params.gender !== 'all' ? { gender: params.gender } : {}),
        ...(params.tier && params.tier !== 'all' ? { tier: params.tier } : {}),
      });
      return requestJson<CustomerListResponse>(`${API_BASE}?${qs.toString()}`);
    }

    const allowed = new Set(scope.authorizedStoreIds);
    const kw = (params.keyword ?? '').trim().toLowerCase();
    const filtered = readDebugCustomers().filter((c) => {
      if (scope.identityType === 'supplier') return false;
      if (allowed.size && !allowed.has(c.storeId)) return false;
      if (params.storeId && params.storeId !== 'all' && c.storeId !== params.storeId) return false;
      if (params.gender && params.gender !== 'all' && c.gender !== params.gender) return false;
      if (params.tier && params.tier !== 'all' && c.tier !== params.tier) return false;
      if (
        kw &&
        ![c.name, c.memberNo, c.phone, c.guideName, c.medicalIdNo]
          .some((f) => f.toLowerCase().includes(kw))
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

  async create(payload: CustomerWritePayload, debugMode: boolean): Promise<CustomerProfile> {
    if (!debugMode) {
      const res = await requestJson<{ item: CustomerProfile }>(API_BASE, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.item;
    }

    const existing = readDebugCustomers();
    const memberNo =
      payload.memberNo.trim() ||
      `QSL-M-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${String(existing.length + 1).padStart(4, '0')}`;
    const item: CustomerProfile = {
      id: `cust_${Date.now()}`,
      memberNo,
      name: payload.name.trim(),
      phone: payload.phone.trim(),
      gender: payload.gender,
      birthday: payload.birthday ?? '',
      age: payload.age,
      ageGroup: payload.ageGroup,
      address: payload.address.trim(),
      remark: payload.remark.trim(),
      tier: payload.tier || '普通顾客',
      avatarUrl: payload.avatarUrl ?? undefined,
      medicalIdNo: payload.medicalIdNo.trim(),
      tags: payload.tags,
      storeId: payload.storeId,
      storeName: STORE_NAMES[payload.storeId] ?? payload.storeId,
      guideName: payload.guideName ?? '',
      source: payload.source ?? '门店新建',
      relatedAccount: payload.relatedAccount ?? '',
      customerType: payload.customerType ?? '普通客群',
      wechatFollowed: Boolean(payload.wechatFollowed),
      refundableAmount: '0.00',
      storedValueBalance: '0.00',
      pointsBalance: 0,
      visitCount: 1,
      lastVisitDate: new Date().toISOString().slice(0, 10),
      nextReviewDate: payload.nextReviewDate ?? '',
    };
    writeDebugCustomers([item, ...existing]);
    return item;
  },

  async update(id: string, payload: Partial<CustomerWritePayload>, debugMode: boolean): Promise<CustomerProfile> {
    if (!debugMode) {
      const res = await requestJson<{ item: CustomerProfile }>(`${API_BASE}/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      return res.item;
    }

    const items = readDebugCustomers();
    const idx = items.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error('未找到该顾客资料');
    const prev = items[idx];
    const nextStoreId = payload.storeId ?? prev.storeId;
    const updated: CustomerProfile = {
      ...prev,
      ...payload,
      birthday: payload.birthday === null ? '' : (payload.birthday ?? prev.birthday),
      avatarUrl: payload.avatarUrl === null ? undefined : (payload.avatarUrl ?? prev.avatarUrl),
      nextReviewDate: payload.nextReviewDate === null ? '' : (payload.nextReviewDate ?? prev.nextReviewDate),
      storeId: nextStoreId,
      storeName: STORE_NAMES[nextStoreId] ?? nextStoreId,
    };
    items[idx] = updated;
    writeDebugCustomers(items);
    return updated;
  },

  async batchDelete(ids: string[], debugMode: boolean): Promise<{ deletedCount: number }> {
    if (!debugMode) {
      return requestJson<{ deletedCount: number }>(`${API_BASE}/batch-delete`, {
        method: 'POST',
        body: JSON.stringify({ ids }),
      });
    }
    const idSet = new Set(ids);
    const prev = readDebugCustomers();
    const next = prev.filter((c) => !idSet.has(c.id));
    writeDebugCustomers(next);
    return { deletedCount: prev.length - next.length };
  },

  async batchVisit(ids: string[], debugMode: boolean): Promise<{ updatedCount: number; visitDate: string }> {
    if (!debugMode) {
      return requestJson<{ updatedCount: number; visitDate: string }>(`${API_BASE}/batch-visit`, {
        method: 'POST',
        body: JSON.stringify({ ids }),
      });
    }
    const idSet = new Set(ids);
    const visitDate = new Date().toISOString().slice(0, 10);
    let updatedCount = 0;
    const next = readDebugCustomers().map((c) => {
      if (!idSet.has(c.id)) return c;
      updatedCount += 1;
      return { ...c, lastVisitDate: visitDate, visitCount: c.visitCount + 1 };
    });
    writeDebugCustomers(next);
    return { updatedCount, visitDate };
  },

  async listTags(debugMode: boolean): Promise<CustomerTagDefinition[]> {
    if (!debugMode) {
      const res = await requestJson<{ items: CustomerTagDefinition[] }>(`${API_BASE}/tags`);
      return res.items;
    }
    return readDebugTags();
  },

  async createTag(name: string, debugMode: boolean): Promise<CustomerTagDefinition> {
    if (!debugMode) {
      const res = await requestJson<{ item: CustomerTagDefinition }>(`${API_BASE}/tags`, {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      return res.item;
    }
    const tags = readDebugTags();
    if (tags.some((t) => t.name.toLowerCase() === name.trim().toLowerCase())) {
      throw new Error('该标签已存在');
    }
    const item: CustomerTagDefinition = {
      id: `tag_${Date.now()}`,
      name: name.trim(),
      sort_order: tags.length * 10 + 10,
    };
    writeDebugTags([...tags, item]);
    return item;
  },

  async deleteTag(id: string, debugMode: boolean): Promise<void> {
    if (!debugMode) {
      await requestJson(`${API_BASE}/tags/${encodeURIComponent(id)}`, { method: 'DELETE' });
      return;
    }
    writeDebugTags(readDebugTags().filter((t) => t.id !== id));
  },
};
