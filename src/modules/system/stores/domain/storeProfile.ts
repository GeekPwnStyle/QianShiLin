export type StoreType = '总店' | '分店' | '加盟店' | '视光中心';

export type StoreOperatingStatus = 'operating' | 'preparing' | 'disabled';

export interface StorePermissions {
  showOnMiniProgram: boolean;
  crossStoreView: boolean;
  otherStoresViewThis: boolean;
  viewHqSuppliers: boolean;
  viewInventoryCount: boolean;
}

export interface StoreOperationalConfig {
  defaultWarehouse: string;
  processingCenter: string;
  blankLensSourceWarehouse: string;
  businessHours: string;
  appointmentSlotCapacity: number;
  allowOnlineAppointment: boolean;
  operatingStatus: StoreOperatingStatus;
  miniProgramNotice: string;
}

export interface StoreProfileRecord {
  id: string;
  numericId: number;
  storeCode: string;
  name: string;
  shortName: string;
  storeType: StoreType;
  parentStoreName: string;
  regionName: string;
  province: string;
  city: string;
  address: string;
  contactName: string;
  phone: string;
  wechat: string;
  qq: string;
  medicalLicenseNo: string;
  medicalLicenseExpiry: string;
  openedAt: string;
  expiresAt: string;
  permissions: StorePermissions;
  config: StoreOperationalConfig;
}

export const PROVINCE_CITY_MAP: Record<string, string[]> = {
  浙江省: ['杭州市', '宁波市', '温州市', '绍兴市', '嘉兴市'],
  上海市: ['上海市'],
  江苏省: ['南京市', '苏州市', '无锡市', '常州市'],
  重庆市: ['重庆市'],
  北京市: ['北京市'],
  广东省: ['广州市', '深圳市', '佛山市'],
  四川省: ['成都市'],
};

export const REGION_OPTIONS = ['华东大区', '西南大区', '华南大区', '华北大区', '华中大区'];

export const WAREHOUSE_OPTIONS = [
  '西湖中心仓',
  '滨江陈列仓',
  '静安精品仓',
  '新街口视光仓',
  '杭州总仓',
  '城西备品仓',
];

export const PROCESSING_CENTER_OPTIONS = [
  '华东中央车房加工中心',
  '上海精密配镜工坊',
  '西南区域加工分中心',
  '门店自有基础装配台',
];

export function getDaysRemaining(dateStr: string): number | null {
  if (!dateStr || dateStr === '1900-01-01') return null;
  const target = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function addMonthsToDate(dateStr: string, months: number): string {
  const parsed = new Date(`${dateStr}T00:00:00`);
  const base = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const next = new Date(base.getFullYear(), base.getMonth() + months, base.getDate());
  const y = next.getFullYear();
  const m = String(next.getMonth() + 1).padStart(2, '0');
  const d = String(next.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const INITIAL_STORE_PROFILES: StoreProfileRecord[] = [
  {
    id: 'store_hq_01',
    numericId: 1804,
    storeCode: '00000823',
    name: '杭州西湖旗舰店',
    shortName: '西湖旗舰总店',
    storeType: '总店',
    parentStoreName: '杭州西湖旗舰店',
    regionName: '华东大区',
    province: '浙江省',
    city: '杭州市',
    address: '浙江省杭州市上城区延安路258号湖滨银泰旁',
    contactName: '周婉宁',
    phone: '13858011804',
    wechat: 'qsl_xihu_hq',
    qq: '284019823',
    medicalLicenseNo: '浙杭械经营备20230815号',
    medicalLicenseExpiry: '2029-08-14',
    openedAt: '2023-08-15',
    expiresAt: '2030-04-01',
    permissions: {
      showOnMiniProgram: true,
      crossStoreView: true,
      otherStoresViewThis: true,
      viewHqSuppliers: true,
      viewInventoryCount: true,
    },
    config: {
      defaultWarehouse: '西湖中心仓',
      processingCenter: '华东中央车房加工中心',
      blankLensSourceWarehouse: '杭州总仓',
      businessHours: '09:30 - 21:30',
      appointmentSlotCapacity: 4,
      allowOnlineAppointment: true,
      operatingStatus: 'operating',
      miniProgramNotice: '提供全套医学验光、角膜塑形镜验配及蔡司/依视路定制车房片服务。',
    },
  },
  {
    id: 'store_hz_02',
    numericId: 3571,
    storeCode: '00002637',
    name: '杭州滨江天街店',
    shortName: '滨江天街分店',
    storeType: '分店',
    parentStoreName: '杭州西湖旗舰店',
    regionName: '华东大区',
    province: '浙江省',
    city: '杭州市',
    address: '浙江省杭州市滨江区江南大道1090号龙湖天街B1',
    contactName: '陈明轩',
    phone: '13757122637',
    wechat: 'qsl_binjiang',
    qq: '391026370',
    medicalLicenseNo: '浙杭滨械经营20240118号',
    medicalLicenseExpiry: '2027-06-30',
    openedAt: '2025-04-28',
    expiresAt: '2027-04-28',
    permissions: {
      showOnMiniProgram: true,
      crossStoreView: false,
      otherStoresViewThis: true,
      viewHqSuppliers: true,
      viewInventoryCount: true,
    },
    config: {
      defaultWarehouse: '滨江陈列仓',
      processingCenter: '华东中央车房加工中心',
      blankLensSourceWarehouse: '西湖中心仓',
      businessHours: '10:00 - 22:00',
      appointmentSlotCapacity: 3,
      allowOnlineAppointment: true,
      operatingStatus: 'operating',
      miniProgramNotice: '商场综合体直营店，支持线上预约快检与跨店调货取镜。',
    },
  },
  {
    id: 'store_sh_03',
    numericId: 3618,
    storeCode: '00003105',
    name: '上海静安嘉里中心店',
    shortName: '静安嘉里店',
    storeType: '分店',
    parentStoreName: '杭州西湖旗舰店',
    regionName: '华东大区',
    province: '上海市',
    city: '上海市',
    address: '上海市静安区南京西路1515号静安嘉里中心南区L2',
    contactName: '苏晓晴',
    phone: '13916203105',
    wechat: 'qsl_jingan_sh',
    qq: '',
    medicalLicenseNo: '沪静械经营20240902号',
    medicalLicenseExpiry: '2028-09-01',
    openedAt: '2024-09-10',
    expiresAt: '2028-09-10',
    permissions: {
      showOnMiniProgram: true,
      crossStoreView: true,
      otherStoresViewThis: true,
      viewHqSuppliers: false,
      viewInventoryCount: true,
    },
    config: {
      defaultWarehouse: '静安精品仓',
      processingCenter: '上海精密配镜工坊',
      blankLensSourceWarehouse: '静安精品仓',
      businessHours: '10:00 - 22:00',
      appointmentSlotCapacity: 4,
      allowOnlineAppointment: true,
      operatingStatus: 'operating',
      miniProgramNotice: '专注高端设计师镜架与蔡司精密渐进片验配体验。',
    },
  },
  {
    id: 'store_nj_04',
    numericId: 3829,
    storeCode: '00003492',
    name: '南京新街口视光中心',
    shortName: '新街口视光中心',
    storeType: '视光中心',
    parentStoreName: '杭州西湖旗舰店',
    regionName: '华东大区',
    province: '江苏省',
    city: '南京市',
    address: '江苏省南京市秦淮区中山南路1号德基广场二期5楼',
    contactName: '许文博',
    phone: '13605183492',
    wechat: 'qsl_nj_optom',
    qq: '410558902',
    medicalLicenseNo: '苏宁械经营许20231108号',
    medicalLicenseExpiry: '2027-01-15',
    openedAt: '2024-01-12',
    expiresAt: '2027-01-15',
    permissions: {
      showOnMiniProgram: true,
      crossStoreView: true,
      otherStoresViewThis: false,
      viewHqSuppliers: true,
      viewInventoryCount: true,
    },
    config: {
      defaultWarehouse: '新街口视光仓',
      processingCenter: '华东中央车房加工中心',
      blankLensSourceWarehouse: '杭州总仓',
      businessHours: '09:00 - 20:30',
      appointmentSlotCapacity: 5,
      allowOnlineAppointment: true,
      operatingStatus: 'operating',
      miniProgramNotice: '青少年近视防控及角膜塑形镜专科视光中心，配备眼轴生物测量仪。',
    },
  },
  {
    id: 'store_cq_05',
    numericId: 4012,
    storeCode: '00004012',
    name: '重庆解放碑精益视光店',
    shortName: '解放碑加盟店',
    storeType: '加盟店',
    parentStoreName: '杭州西湖旗舰店',
    regionName: '西南大区',
    province: '重庆市',
    city: '重庆市',
    address: '重庆市渝中区邹容路83号附2号',
    contactName: '张江南',
    phone: '023-63611178',
    wechat: 'qsl_cq_jy',
    qq: '',
    medicalLicenseNo: '渝中械经营20250211号',
    medicalLicenseExpiry: '2028-02-10',
    openedAt: '2025-11-20',
    expiresAt: '2027-02-20',
    permissions: {
      showOnMiniProgram: false,
      crossStoreView: false,
      otherStoresViewThis: false,
      viewHqSuppliers: true,
      viewInventoryCount: false,
    },
    config: {
      defaultWarehouse: '城西备品仓',
      processingCenter: '西南区域加工分中心',
      blankLensSourceWarehouse: '杭州总仓',
      businessHours: '09:30 - 21:00',
      appointmentSlotCapacity: 2,
      allowOnlineAppointment: false,
      operatingStatus: 'operating',
      miniProgramNotice: '西南区域授权合作加盟门店，支持常规镜片装配与会员积分互通。',
    },
  },
];

const STORE_PROFILES_STORAGE_KEY = 'qsl_store_profiles_v1';

export function loadStoreProfiles(): StoreProfileRecord[] {
  if (typeof window === 'undefined') return INITIAL_STORE_PROFILES;
  try {
    const raw = window.localStorage.getItem(STORE_PROFILES_STORAGE_KEY);
    if (!raw) return INITIAL_STORE_PROFILES;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as StoreProfileRecord[];
    }
  } catch {
    // Ignore storage parse error
  }
  return INITIAL_STORE_PROFILES;
}

export function saveStoreProfiles(records: StoreProfileRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORE_PROFILES_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Ignore storage write error
  }
}
