export interface SupplierThirdPartyBinding {
  platform?: string;
  externalSupplierId?: string;
  externalSupplierName?: string;
  remark?: string;
}

export interface SupplierRecord {
  id: string;
  name: string;
  alias: string;
  alias_pinyin: string;
  contact: string;
  phone: string;
  landline: string;
  wechat: string;
  qq: string;
  categories: string[];
  is_default: boolean;
  enabled: boolean;
  province: string;
  city: string;
  district: string;
  detail_address: string;
  shipping_area_code: string;
  sort_order: number;
  scope: string;
  credit_code: string;
  business_license_image: string;
  business_license_expires_on: string | null;
  device_license_image: string;
  device_license_number: string;
  device_license_issued_on: string | null;
  device_license_issuer: string;
  device_license_valid_from: string | null;
  device_license_expires_on: string | null;
  bank_holder?: string;
  bank_branch?: string;
  bank_account?: string;
  is_supply_chain: boolean;
  bound_franchise_stores: string[];
  authorized_store_ids: string[];
  owner_store_type: string;
  owner_store_name: string;
  bound_product_ids: string[];
  third_party_binding: SupplierThirdPartyBinding;
  remark: string;
  user_id?: string | null;
  login_username?: string;
  login_status?: string;
  role_id?: string;
  role_name?: string;
  created_at?: string;
  updated_at?: string;
}

export type SupplierWritePayload = Partial<
  Omit<SupplierRecord, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'login_status' | 'role_id' | 'role_name'>
> & {
  login_username?: string;
  login_password?: string;
};

export interface SupplierListParams {
  page: number;
  pageSize: number;
  search?: string;
  enabled?: '' | 'true' | 'false';
  isDefault?: '' | 'true' | 'false';
  isSupplyChain?: '' | 'true' | 'false';
  storeId?: string;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SupplierPageResult {
  items: SupplierRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SupplierInvitationRecord {
  id: string;
  invite_code: string;
  status: '待审核' | '已通过' | '已拒绝';
  target_store_name: string;
  target_store_contact: string;
  applied_at: string;
  note: string;
  supplier_id?: string | null;
}

export interface CityDirectoryEntry {
  key: string;
  label: string;
  province: string;
  city: string;
  district: string;
  areaCode: string;
}

export const CITY_DIRECTORY: CityDirectoryEntry[] = [
  { key: 'hangzhou_xihu', label: '浙江省 杭州市 西湖区', province: '浙江省', city: '杭州市', district: '西湖区', areaCode: '0571' },
  { key: 'hangzhou_binjiang', label: '浙江省 杭州市 滨江区', province: '浙江省', city: '杭州市', district: '滨江区', areaCode: '0571' },
  { key: 'wenzhou_ouhai', label: '浙江省 温州市 瓯海区', province: '浙江省', city: '温州市', district: '瓯海区', areaCode: '0577' },
  { key: 'taizhou_linhai', label: '浙江省 台州市 临海市', province: '浙江省', city: '台州市', district: '临海市', areaCode: '0576' },
  { key: 'shanghai_jingan', label: '上海市 上海市 静安区', province: '上海市', city: '上海市', district: '静安区', areaCode: '021' },
  { key: 'shanghai_songjiang', label: '上海市 上海市 松江区', province: '上海市', city: '上海市', district: '松江区', areaCode: '021' },
  { key: 'shanghai_huangpu', label: '上海市 上海市 黄浦区', province: '上海市', city: '上海市', district: '黄浦区', areaCode: '021' },
  { key: 'nanjing_xuanwu', label: '江苏省 南京市 玄武区', province: '江苏省', city: '南京市', district: '玄武区', areaCode: '025' },
  { key: 'zhenjiang_danyang', label: '江苏省 镇江市 丹阳市', province: '江苏省', city: '镇江市', district: '丹阳市', areaCode: '0511' },
  { key: 'guangzhou_huangpu', label: '广东省 广州市 黄埔区', province: '广东省', city: '广州市', district: '黄埔区', areaCode: '020' },
  { key: 'shenzhen_nanshan', label: '广东省 深圳市 南山区', province: '广东省', city: '深圳市', district: '南山区', areaCode: '0755' },
  { key: 'beijing_chaoyang', label: '北京市 北京市 朝阳区', province: '北京市', city: '北京市', district: '朝阳区', areaCode: '010' },
  { key: 'beijing_dongcheng', label: '北京市 北京市 东城区', province: '北京市', city: '北京市', district: '东城区', areaCode: '010' },
  { key: 'chengdu_wuhou', label: '四川省 成都市 武侯区', province: '四川省', city: '成都市', district: '武侯区', areaCode: '028' },
  { key: 'chongqing_yuzhong', label: '重庆市 重庆市 渝中区', province: '重庆市', city: '重庆市', district: '渝中区', areaCode: '023' },
  { key: 'hefei_gaoxin', label: '安徽省 合肥市 高新区', province: '安徽省', city: '合肥市', district: '高新区', areaCode: '0551' },
  { key: 'xiamen_siming', label: '福建省 厦门市 思明区', province: '福建省', city: '厦门市', district: '思明区', areaCode: '0592' },
];

export const FRANCHISE_WHOLESALE_OPTIONS = [
  '杭州萧山加盟中心',
  '宁波天一视光加盟店',
  '苏州园区联合批发部',
  '无锡太湖眼科配镜中心',
  '合肥政务区视光加盟店',
];

const CHAR_PINYIN_MAP: Record<string, string> = {
  卡: 'K', 尔: 'E', 蔡: 'C', 司: 'S', 光: 'G', 学: 'X', 华: 'H', 东: 'D', 代: 'D', 理: 'L',
  依: 'Y', 视: 'S', 路: 'L', 镜: 'J', 片: 'P', 供: 'G', 应: 'Y', 链: 'L', 中: 'Z', 心: 'X',
  北: 'B', 欧: 'O', 钛: 'T', 架: 'J', 联: 'L', 合: 'H', 货: 'H', 商: 'S', 精: 'J', 益: 'Y',
  高: 'G', 登: 'D', 器: 'Q', 械: 'X', 有: 'Y', 限: 'X', 公: 'G', 重: 'C', 庆: 'Q', 千: 'Q',
  里: 'L', 眼: 'Y', 贸: 'M', 洪: 'H', 旭: 'X', 德: 'D', 生: 'S', 上: 'S', 海: 'H', 图: 'T',
  观: 'G', 四: 'S', 川: 'C', 品: 'P', 嘉: 'J', 忠: 'Z', 诚: 'C', 京: 'J', 宝: 'B', 典: 'D',
  普: 'P', 康: 'K', 角: 'J', 膜: 'M', 塑: 'S', 形: 'X', 站: 'Z', 博: 'B', 士: 'S', 伦: 'L',
  隐: 'Y', 护: 'H', 直: 'Z', 豪: 'H', 雅: 'Y', 明: 'M', 月: 'Y', 暴: 'B', 龙: 'L', 陌: 'M',
  森: 'S', 太: 'T', 阳: 'Y', 昌: 'C', 科: 'K', 技: 'J', 浙: 'Z', 江: 'J', 杭: 'H', 州: 'Z',
};

export function toPinyinInitials(text: string): string {
  const clean = text.trim();
  if (!clean) return '';
  let out = '';
  for (const ch of clean) {
    if (/[a-zA-Z0-9]/.test(ch)) {
      out += ch.toUpperCase();
    } else if (CHAR_PINYIN_MAP[ch]) {
      out += CHAR_PINYIN_MAP[ch];
    }
  }
  return out.slice(0, 24);
}

const root = `${import.meta.env.BASE_URL}api/catalog`;
const DEBUG_SUPPLIERS_KEY = 'qsl_debug_suppliers_v2';
const DEBUG_INVITATIONS_KEY = 'qsl_debug_supplier_invitations_v1';

async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`${root}${path}`, {
    method,
    credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error ?? `请求失败（${response.status}）`);
  return result as T;
}

const DEFAULT_DEBUG_SUPPLIERS: SupplierRecord[] = [
  {
    id: '11111111-1111-4111-8111-111111111101',
    name: '卡尔蔡司光学华东代理',
    alias: '蔡司华东',
    alias_pinyin: 'CSHD',
    contact: '张明远',
    phone: '13800138001',
    landline: '020-82091100',
    wechat: 'zeiss_huadong',
    qq: '',
    categories: ['镜片', '加工工艺'],
    is_default: true,
    enabled: true,
    province: '广东省',
    city: '广州市',
    district: '黄埔区',
    detail_address: '中新广州知识城九龙大道蔡司光学产业园',
    shipping_area_code: '020',
    sort_order: 10,
    scope: '蔡司泽锐 / 智锐 / 小乐园离焦镜片 / 钻立方镀膜定制',
    credit_code: '91440101797399881K',
    business_license_image: '',
    business_license_expires_on: '2035-12-31',
    device_license_image: '',
    device_license_number: '粤穗食药监械经营许20230188号',
    device_license_issued_on: '2023-05-01',
    device_license_issuer: '广州市市场监督管理局',
    device_license_valid_from: '2023-05-01',
    device_license_expires_on: '2028-04-30',
    bank_holder: '卡尔蔡司光学华东代理有限公司',
    bank_branch: '中国建设银行广州科学城支行',
    bank_account: '44050147010100008812',
    is_supply_chain: true,
    bound_franchise_stores: [],
    authorized_store_ids: ['store_hq_01', 'store_hz_02', 'store_sh_03', 'store_nj_04'],
    owner_store_type: '总店',
    owner_store_name: '杭州西湖旗舰店',
    bound_product_ids: [],
    third_party_binding: {},
    remark: '核心战略镜片供应方',
    user_id: '00000000-0000-0000-0000-000000000005',
    login_username: 'supplier',
    login_status: 'active',
    role_id: 'role_supplier_partner',
    role_name: '合作供应商账号',
  },
  {
    id: '11111111-1111-4111-8111-111111111102',
    name: '依视路镜片供应链中心',
    alias: '依视路供应链',
    alias_pinyin: 'YSLGYL',
    contact: '陈思琪',
    phone: '13957186620',
    landline: '021-57748800',
    wechat: '',
    qq: '',
    categories: ['镜片', '护理液'],
    is_default: false,
    enabled: true,
    province: '上海市',
    city: '上海市',
    district: '松江区',
    detail_address: '松江工业区东部新区锦昔路88号',
    shipping_area_code: '021',
    sort_order: 20,
    scope: '星趣控离焦镜片 / 万里路渐进片 / 钻晶膜岩系列',
    credit_code: '91310000607366412N',
    business_license_image: '',
    business_license_expires_on: '2032-08-31',
    device_license_image: '',
    device_license_number: '沪松食药监械经营许20240092号',
    device_license_issued_on: '2024-01-15',
    device_license_issuer: '上海市松江区市场监督管理局',
    device_license_valid_from: '2024-01-15',
    device_license_expires_on: '2029-01-14',
    bank_holder: '上海依视路供应链中心',
    bank_branch: '招商银行上海松江支行',
    bank_account: '121908887700102',
    is_supply_chain: true,
    bound_franchise_stores: ['杭州萧山加盟中心'],
    authorized_store_ids: ['store_hq_01', 'store_hz_02', 'store_sh_03', 'store_nj_04'],
    owner_store_type: '总店',
    owner_store_name: '杭州西湖旗舰店',
    bound_product_ids: [],
    third_party_binding: {},
    remark: '',
    user_id: '00000000-0000-0000-0000-000000000102',
    login_username: 'sup_essilor',
    login_status: 'active',
    role_id: 'role_supplier_partner',
    role_name: '合作供应商账号',
  },
  {
    id: '11111111-1111-4111-8111-111111111103',
    name: '北欧钛架联合供货商',
    alias: '北欧钛架',
    alias_pinyin: 'BETJ',
    contact: '林俊杰',
    phone: '13758209912',
    landline: '0577-86352200',
    wechat: '',
    qq: '',
    categories: ['镜架', '太阳镜', '老花镜'],
    is_default: false,
    enabled: true,
    province: '浙江省',
    city: '温州市',
    district: '瓯海区',
    detail_address: '中国（瓯海）眼镜小镇光学产业中心6号楼',
    shipping_area_code: '0577',
    sort_order: 30,
    scope: '纯钛超轻光学镜架 / β钛儿童镜架 / 商务太阳镜',
    credit_code: '91330304MA2890123X',
    business_license_image: '',
    business_license_expires_on: null,
    device_license_image: '',
    device_license_number: '',
    device_license_issued_on: null,
    device_license_issuer: '',
    device_license_valid_from: null,
    device_license_expires_on: null,
    is_supply_chain: false,
    bound_franchise_stores: [],
    authorized_store_ids: ['store_hq_01', 'store_hz_02', 'store_sh_03', 'store_nj_04'],
    owner_store_type: '总店',
    owner_store_name: '杭州西湖旗舰店',
    bound_product_ids: [],
    third_party_binding: {},
    remark: '',
    user_id: '00000000-0000-0000-0000-000000000103',
    login_username: 'sup_titan',
    login_status: 'active',
    role_id: 'role_supplier_partner',
    role_name: '合作供应商账号',
  },
  {
    id: '11111111-1111-4111-8111-111111111104',
    name: '精益高登光学器械有限公司',
    alias: '精益高登',
    alias_pinyin: 'JYGD',
    contact: '赵伟',
    phone: '18570742105',
    landline: '',
    wechat: '',
    qq: '',
    categories: ['镜架', '镜片', '辅料'],
    is_default: false,
    enabled: true,
    province: '江苏省',
    city: '镇江市',
    district: '丹阳市',
    detail_address: '丹阳市开发区眼镜城供应链B区18号',
    shipping_area_code: '0511',
    sort_order: 40,
    scope: '中高端光学镜架 / 验光辅料及陈列道具',
    credit_code: '',
    business_license_image: '',
    business_license_expires_on: null,
    device_license_image: '',
    device_license_number: '',
    device_license_issued_on: null,
    device_license_issuer: '',
    device_license_valid_from: null,
    device_license_expires_on: null,
    is_supply_chain: false,
    bound_franchise_stores: [],
    authorized_store_ids: ['store_hq_01', 'store_hz_02'],
    owner_store_type: '总店',
    owner_store_name: '杭州西湖旗舰店',
    bound_product_ids: [],
    third_party_binding: {},
    remark: '',
    user_id: '00000000-0000-0000-0000-000000000104',
    login_username: 'sup_jygd',
    login_status: 'active',
    role_id: 'role_supplier_partner',
    role_name: '合作供应商账号',
  },
  {
    id: '11111111-1111-4111-8111-111111111105',
    name: '重庆千里眼商贸有限公司',
    alias: '千里眼商贸',
    alias_pinyin: 'QLYSM',
    contact: '喻杰',
    phone: '15730095918',
    landline: '',
    wechat: '',
    qq: '',
    categories: ['镜架', '太阳镜'],
    is_default: false,
    enabled: true,
    province: '重庆市',
    city: '重庆市',
    district: '渝中区',
    detail_address: '解放碑光学商贸大厦12层',
    shipping_area_code: '023',
    sort_order: 50,
    scope: '潮牌太阳镜 / 板材与金属混搭光学镜架',
    credit_code: '',
    business_license_image: '',
    business_license_expires_on: null,
    device_license_image: '',
    device_license_number: '',
    device_license_issued_on: null,
    device_license_issuer: '',
    device_license_valid_from: null,
    device_license_expires_on: null,
    is_supply_chain: false,
    bound_franchise_stores: [],
    authorized_store_ids: ['store_hq_01', 'store_sh_03'],
    owner_store_type: '总店',
    owner_store_name: '杭州西湖旗舰店',
    bound_product_ids: [],
    third_party_binding: {},
    remark: '',
    user_id: '00000000-0000-0000-0000-000000000105',
    login_username: 'sup_qly',
    login_status: 'active',
    role_id: 'role_supplier_partner',
    role_name: '合作供应商账号',
  },
  {
    id: '11111111-1111-4111-8111-111111111106',
    name: '洪旭德生光学镜片有限公司',
    alias: '洪旭德生',
    alias_pinyin: 'HXDS',
    contact: '孙小云',
    phone: '13637911165',
    landline: '',
    wechat: '',
    qq: '',
    categories: ['镜片'],
    is_default: false,
    enabled: true,
    province: '浙江省',
    city: '杭州市',
    district: '滨江区',
    detail_address: '滨江区江南大道388号光学分拨中心',
    shipping_area_code: '0571',
    sort_order: 60,
    scope: '洪旭德生镜片 / 高折射率非球面防蓝光镜片',
    credit_code: '',
    business_license_image: '',
    business_license_expires_on: null,
    device_license_image: '',
    device_license_number: '浙杭食药监械经营许20231024号',
    device_license_issued_on: '2023-08-01',
    device_license_issuer: '杭州市市场监督管理局',
    device_license_valid_from: '2023-08-01',
    device_license_expires_on: '2028-07-31',
    is_supply_chain: true,
    bound_franchise_stores: [],
    authorized_store_ids: ['store_hq_01', 'store_hz_02', 'store_sh_03', 'store_nj_04'],
    owner_store_type: '总店',
    owner_store_name: '杭州西湖旗舰店',
    bound_product_ids: [],
    third_party_binding: {},
    remark: '',
    user_id: '00000000-0000-0000-0000-000000000106',
    login_username: 'sup_hxds',
    login_status: 'active',
    role_id: 'role_supplier_partner',
    role_name: '合作供应商账号',
  },
  {
    id: '11111111-1111-4111-8111-111111111107',
    name: '上海图观眼镜有限公司',
    alias: '上海图观',
    alias_pinyin: 'SHTG',
    contact: '王学军',
    phone: '13851186908',
    landline: '0511-86990888',
    wechat: '',
    qq: '',
    categories: ['老花镜', '镜架'],
    is_default: false,
    enabled: true,
    province: '上海市',
    city: '上海市',
    district: '静安区',
    detail_address: '青云路国际眼镜批发城3楼A12',
    shipping_area_code: '021',
    sort_order: 70,
    scope: '吉瑞祥老光 / 中老年折叠便携老花镜系列',
    credit_code: '',
    business_license_image: '',
    business_license_expires_on: null,
    device_license_image: '',
    device_license_number: '',
    device_license_issued_on: null,
    device_license_issuer: '',
    device_license_valid_from: null,
    device_license_expires_on: null,
    is_supply_chain: false,
    bound_franchise_stores: [],
    authorized_store_ids: ['store_hq_01', 'store_sh_03', 'store_nj_04'],
    owner_store_type: '总店',
    owner_store_name: '杭州西湖旗舰店',
    bound_product_ids: [],
    third_party_binding: {},
    remark: '',
    user_id: '00000000-0000-0000-0000-000000000107',
    login_username: 'sup_shtg',
    login_status: 'active',
    role_id: 'role_supplier_partner',
    role_name: '合作供应商账号',
  },
  {
    id: '11111111-1111-4111-8111-111111111108',
    name: '四川上品视嘉眼镜有限公司',
    alias: '上品视嘉',
    alias_pinyin: 'SPSJ',
    contact: '黄国强',
    phone: '15528329966',
    landline: '',
    wechat: '',
    qq: '',
    categories: ['镜片', '镜架'],
    is_default: false,
    enabled: true,
    province: '四川省',
    city: '成都市',
    district: '武侯区',
    detail_address: '人民南路四段视光供应链中心5栋',
    shipping_area_code: '028',
    sort_order: 80,
    scope: '尼康镜片 / 精品钛架西南华东联采',
    credit_code: '',
    business_license_image: '',
    business_license_expires_on: null,
    device_license_image: '',
    device_license_number: '川蓉食药监械经营许20240216号',
    device_license_issued_on: '2024-03-01',
    device_license_issuer: '成都市市场监督管理局',
    device_license_valid_from: '2024-03-01',
    device_license_expires_on: '2029-02-28',
    is_supply_chain: true,
    bound_franchise_stores: [],
    authorized_store_ids: ['store_hq_01', 'store_hz_02', 'store_sh_03', 'store_nj_04'],
    owner_store_type: '总店',
    owner_store_name: '杭州西湖旗舰店',
    bound_product_ids: [],
    third_party_binding: {},
    remark: '',
    user_id: '00000000-0000-0000-0000-000000000108',
    login_username: 'sup_spsj',
    login_status: 'active',
    role_id: 'role_supplier_partner',
    role_name: '合作供应商账号',
  },
];

function readDebugSuppliers(): SupplierRecord[] {
  if (typeof window === 'undefined') return DEFAULT_DEBUG_SUPPLIERS;
  try {
    const raw = window.localStorage.getItem(DEBUG_SUPPLIERS_KEY);
    if (!raw) return DEFAULT_DEBUG_SUPPLIERS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_DEBUG_SUPPLIERS;
  } catch {
    return DEFAULT_DEBUG_SUPPLIERS;
  }
}

function writeDebugSuppliers(rows: SupplierRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DEBUG_SUPPLIERS_KEY, JSON.stringify(rows));
  } catch {
    // Ignore storage quota errors
  }
}

function readDebugInvitations(): SupplierInvitationRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(DEBUG_INVITATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeDebugInvitations(rows: SupplierInvitationRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DEBUG_INVITATIONS_KEY, JSON.stringify(rows));
  } catch {
    // Ignore storage quota errors
  }
}

export const suppliersApi = {
  async list(params: SupplierListParams, debugMode: boolean): Promise<SupplierPageResult> {
    if (debugMode) {
      let rows = readDebugSuppliers();
      const q = (params.search ?? '').trim().toLowerCase();
      if (q) {
        rows = rows.filter((r) =>
          [r.name, r.alias, r.alias_pinyin, r.contact, r.phone, r.scope, r.detail_address, r.login_username]
            .some((v) => (v ?? '').toLowerCase().includes(q))
        );
      }
      if (params.enabled === 'true' || params.enabled === 'false') {
        rows = rows.filter((r) => r.enabled === (params.enabled === 'true'));
      }
      if (params.isDefault === 'true' || params.isDefault === 'false') {
        rows = rows.filter((r) => r.is_default === (params.isDefault === 'true'));
      }
      if (params.isSupplyChain === 'true' || params.isSupplyChain === 'false') {
        rows = rows.filter((r) => r.is_supply_chain === (params.isSupplyChain === 'true'));
      }
      if (params.storeId) {
        rows = rows.filter((r) => (r.authorized_store_ids ?? []).includes(params.storeId!));
      }
      rows = [...rows].sort((a, b) => {
        if (params.sortField) {
          const av = String((a as unknown as Record<string, unknown>)[params.sortField] ?? '');
          const bv = String((b as unknown as Record<string, unknown>)[params.sortField] ?? '');
          const cmp = av.localeCompare(bv, 'zh-CN', { numeric: true });
          return params.sortOrder === 'desc' ? -cmp : cmp;
        }
        return (a.sort_order ?? 100) - (b.sort_order ?? 100);
      });
      const start = (params.page - 1) * params.pageSize;
      return {
        items: rows.slice(start, start + params.pageSize),
        total: rows.length,
        page: params.page,
        pageSize: params.pageSize,
      };
    }

    const qs = new URLSearchParams({
      page: String(params.page),
      pageSize: String(params.pageSize),
    });
    if (params.search?.trim()) qs.set('search', params.search.trim());
    if (params.enabled) qs.set('enabled', params.enabled);
    if (params.isDefault) qs.set('isDefault', params.isDefault);
    if (params.isSupplyChain) qs.set('isSupplyChain', params.isSupplyChain);
    if (params.storeId) qs.set('storeId', params.storeId);
    if (params.sortField) {
      qs.set('sortField', params.sortField);
      qs.set('sortOrder', params.sortOrder ?? 'asc');
    }
    return api<SupplierPageResult>(`/suppliers?${qs.toString()}`);
  },

  async create(payload: SupplierWritePayload, debugMode: boolean): Promise<SupplierRecord> {
    if (debugMode) {
      const all = readDebugSuppliers();
      const rawAccount = (payload.login_username ?? '').trim().toLowerCase();
      const slug = toPinyinInitials(payload.name ?? '').toLowerCase() || String(Date.now()).slice(-6);
      const baseUsername = rawAccount || `sup_${slug}`;
      let resolvedUsername = baseUsername;
      if (rawAccount && all.some((r) => (r.login_username ?? '').toLowerCase() === rawAccount)) {
        throw new Error(`登录账号「${rawAccount}」已被占用`);
      }
      let idx = 2;
      while (all.some((r) => (r.login_username ?? '').toLowerCase() === resolvedUsername)) {
        resolvedUsername = `${baseUsername}_${idx++}`;
      }
      const enabled = payload.enabled !== false;
      const next: SupplierRecord = {
        id: `debug_sup_${Date.now()}`,
        name: payload.name ?? '',
        alias: payload.alias ?? '',
        alias_pinyin: payload.alias_pinyin ?? '',
        contact: payload.contact ?? '',
        phone: payload.phone ?? '',
        landline: payload.landline ?? '',
        wechat: payload.wechat ?? '',
        qq: payload.qq ?? '',
        categories: payload.categories ?? [],
        is_default: Boolean(payload.is_default),
        enabled,
        province: payload.province ?? '',
        city: payload.city ?? '',
        district: payload.district ?? '',
        detail_address: payload.detail_address ?? '',
        shipping_area_code: payload.shipping_area_code ?? '',
        sort_order: payload.sort_order ?? 100,
        scope: payload.scope ?? '',
        credit_code: payload.credit_code ?? '',
        business_license_image: payload.business_license_image ?? '',
        business_license_expires_on: payload.business_license_expires_on ?? null,
        device_license_image: payload.device_license_image ?? '',
        device_license_number: payload.device_license_number ?? '',
        device_license_issued_on: payload.device_license_issued_on ?? null,
        device_license_issuer: payload.device_license_issuer ?? '',
        device_license_valid_from: payload.device_license_valid_from ?? null,
        device_license_expires_on: payload.device_license_expires_on ?? null,
        bank_holder: payload.bank_holder ?? '',
        bank_branch: payload.bank_branch ?? '',
        bank_account: payload.bank_account ?? '',
        is_supply_chain: Boolean(payload.is_supply_chain),
        bound_franchise_stores: payload.bound_franchise_stores ?? [],
        authorized_store_ids: payload.authorized_store_ids ?? [],
        owner_store_type: payload.owner_store_type ?? '总店',
        owner_store_name: payload.owner_store_name ?? '杭州西湖旗舰店',
        bound_product_ids: payload.bound_product_ids ?? [],
        third_party_binding: payload.third_party_binding ?? {},
        remark: payload.remark ?? '',
        user_id: `debug_user_${Date.now()}`,
        login_username: resolvedUsername,
        login_status: enabled ? 'active' : 'disabled',
        role_id: 'role_supplier_partner',
        role_name: '合作供应商账号',
      };
      writeDebugSuppliers([next, ...all]);
      return next;
    }
    return api<SupplierRecord>('/suppliers', 'POST', payload);
  },

  async update(id: string, payload: SupplierWritePayload, debugMode: boolean): Promise<SupplierRecord> {
    if (debugMode) {
      const all = readDebugSuppliers();
      const { login_password: _ignoredPassword, login_username: _ignoredUsername, ...rest } = payload;
      let updated: SupplierRecord | null = null;
      const next = all.map((r) => {
        if (r.id !== id) return r;
        const nextEnabled = rest.enabled !== undefined ? rest.enabled : r.enabled;
        updated = {
          ...r,
          ...rest,
          login_status: nextEnabled ? 'active' : 'disabled',
        };
        return updated;
      });
      writeDebugSuppliers(next);
      if (!updated) throw new Error('供应商不存在');
      return updated;
    }
    return api<SupplierRecord>(`/suppliers/${id}`, 'PATCH', payload);
  },

  async remove(id: string, debugMode: boolean): Promise<void> {
    if (debugMode) {
      writeDebugSuppliers(readDebugSuppliers().filter((r) => r.id !== id));
      return;
    }
    await api<{ ok: boolean }>(`/suppliers/${id}`, 'DELETE');
  },

  async batchAuthorize(ids: string[], storeIds: string[], debugMode: boolean): Promise<number> {
    if (debugMode) {
      const all = readDebugSuppliers();
      const set = new Set(ids);
      writeDebugSuppliers(all.map((r) => (set.has(r.id) ? { ...r, authorized_store_ids: storeIds } : r)));
      return ids.length;
    }
    const res = await api<{ count: number }>('/suppliers/batch-authorize', 'POST', { ids, storeIds });
    return res.count;
  },

  async merge(sourceIds: string[], targetId: string, debugMode: boolean): Promise<number> {
    if (debugMode) {
      const all = readDebugSuppliers();
      const target = all.find((r) => r.id === targetId);
      const sources = all.filter((r) => sourceIds.includes(r.id) && r.id !== targetId);
      if (!target || !sources.length) throw new Error('请选择有效的合并供应商');
      const mergedCategories = Array.from(new Set([...target.categories, ...sources.flatMap((s) => s.categories)]));
      const mergedStores = Array.from(new Set([...target.authorized_store_ids, ...sources.flatMap((s) => s.authorized_store_ids)]));
      const mergedProducts = Array.from(new Set([...target.bound_product_ids, ...sources.flatMap((s) => s.bound_product_ids)]));
      const removeSet = new Set(sources.map((s) => s.id));
      writeDebugSuppliers(
        all
          .filter((r) => !removeSet.has(r.id))
          .map((r) =>
            r.id === targetId
              ? { ...r, categories: mergedCategories, authorized_store_ids: mergedStores, bound_product_ids: mergedProducts }
              : r
          )
      );
      return sources.length;
    }
    const res = await api<{ mergedCount: number }>('/suppliers/merge', 'POST', { sourceIds, targetId });
    return res.mergedCount;
  },

  async scanCode(code: string, debugMode: boolean): Promise<{ found: boolean; data: Partial<SupplierRecord>; message: string }> {
    if (debugMode) {
      const clean = code.trim();
      const match = readDebugSuppliers().find((r) => r.credit_code === clean || r.device_license_number === clean);
      if (match) return { found: true, data: match, message: `已匹配「${match.name}」工商与证照资料` };
      const isUscc = /^[0-9A-HJ-NPQRTUWXY]{2}\d{6}[0-9A-HJ-NPQRTUWXY]{10}$/i.test(clean);
      return {
        found: false,
        data: isUscc ? { credit_code: clean.toUpperCase() } : { device_license_number: clean },
        message: isUscc ? '已识别 18 位统一社会信用代码' : '已识别为医疗器械经营许可证号',
      };
    }
    return api<{ found: boolean; data: Partial<SupplierRecord>; message: string }>('/suppliers/scan', 'POST', { code });
  },

  async listInvitations(debugMode: boolean): Promise<SupplierInvitationRecord[]> {
    if (debugMode) return readDebugInvitations();
    const res = await api<{ items: SupplierInvitationRecord[] }>('/suppliers/invitations');
    return res.items;
  },

  async createInvitation(inviteCode: string, debugMode: boolean): Promise<{ item: SupplierInvitationRecord; autoApproved: boolean }> {
    if (debugMode) {
      const autoApprove = /^QSL-SUP-/i.test(inviteCode.trim());
      const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');
      let supplierId: string | null = null;
      if (autoApprove) {
        const created = await suppliersApi.create(
          {
            name: `合作加盟供货门店 (${inviteCode.toUpperCase()})`,
            alias: inviteCode.toUpperCase(),
            contact: '供应链专员',
            phone: '13800008888',
            categories: ['镜片', '镜架'],
            is_supply_chain: true,
            authorized_store_ids: ['store_hq_01', 'store_hz_02', 'store_sh_03', 'store_nj_04'],
          },
          true
        );
        supplierId = created.id;
      }
      const item: SupplierInvitationRecord = {
        id: `inv_${Date.now()}`,
        invite_code: inviteCode,
        status: autoApprove ? '已通过' : '待审核',
        target_store_name: autoApprove ? `合作加盟供货门店 (${inviteCode.toUpperCase()})` : `外部供应链门店 (${inviteCode})`,
        target_store_contact: autoApprove ? '供应链专员' : '待对方门店确认',
        applied_at: nowStr,
        note: autoApprove ? '邀请码核验通过，已自动生成并关联供应商档案' : '已提交绑定申请，等待对方门店审核确认',
        supplier_id: supplierId,
      };
      writeDebugInvitations([item, ...readDebugInvitations()]);
      return { item, autoApproved: autoApprove };
    }
    return api<{ item: SupplierInvitationRecord; autoApproved: boolean }>('/suppliers/invitations', 'POST', { inviteCode });
  },
};
