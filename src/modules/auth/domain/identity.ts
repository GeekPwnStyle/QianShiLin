import { DEFAULT_THEME_KEY, type ThemeKey } from '@/src/shared/theme/themes';

export type IdentityType = 'admin' | 'store' | 'supplier';

export type StoreSubRole = 'store_manager' | 'store_guide' | 'store_optometrist' | 'store_staff';

export type DataScopeType = 'all_stores' | 'assigned_stores' | 'own_supplier';

export type PermissionCode = string;

export interface SensitiveFieldPermissions {
  viewCostPrice: boolean;
  viewWholesalePrice: boolean;
  viewProfitMargin: boolean;
  viewPlaintextPhone: boolean;
  batchExport: boolean;
}

export interface RoleDefinition {
  id: string;
  name: string;
  identityType: IdentityType;
  subRole?: StoreSubRole;
  description: string;
  dataScope: DataScopeType;
  permissions: PermissionCode[];
  sensitiveFields: SensitiveFieldPermissions;
  updatedAt: string;
  updatedBy: string;
}

export interface PermissionAuditEntry {
  id: string;
  roleId: string;
  roleName: string;
  operator: string;
  actionSummary: string;
  changedPermissions: string[];
  createdAt: string;
}

export type AvatarColorPreset = 'charcoal' | 'lime' | 'forest' | 'amber' | 'slate';

export const AVATAR_PRESET_STYLES: Record<
  AvatarColorPreset,
  { label: string; bgClass: string; textClass: string; swatchCss: string }
> = {
  charcoal: {
    label: '深色主题',
    bgClass: 'bg-[var(--qsl-brand-dark)]',
    textClass: 'text-[var(--qsl-accent-on-dark)]',
    swatchCss: 'var(--qsl-brand-dark)',
  },
  lime: {
    label: '亮色主题',
    bgClass: 'bg-[var(--qsl-accent)] border border-[var(--qsl-accent-border)]',
    textClass: 'text-[var(--qsl-accent-ink)]',
    swatchCss: 'var(--qsl-accent)',
  },
  forest: {
    label: '深森绿',
    bgClass: 'bg-[#166534]',
    textClass: 'text-[#FFFFFF]',
    swatchCss: '#166534',
  },
  amber: {
    label: '暖琥珀',
    bgClass: 'bg-[#B45309]',
    textClass: 'text-[#FFFFFF]',
    swatchCss: '#B45309',
  },
  slate: {
    label: '静谧灰',
    bgClass: 'bg-[#475569]',
    textClass: 'text-[#FFFFFF]',
    swatchCss: '#475569',
  },
};

export interface AuthSession {
  userId: string;
  username: string;
  displayName: string;
  email?: string;
  title: string;
  avatarInitials: string;
  avatarUrl?: string;
  avatarColorPreset?: AvatarColorPreset;
  themeKey: ThemeKey;
  identityType: IdentityType;
  roleId: string;
  roleName: string;
  subRole?: StoreSubRole;
  currentStoreId: string;
  currentStoreName: string;
  authorizedStores: Array<{ id: string; name: string; code: string }>;
  permissionDenies?: string[];
  supplierId?: string;
  supplierName?: string;
}

export interface LoginAccountDescriptor {
  username: string;
  aliases: string[];
  presetKey: 'admin' | 'store_manager' | 'store_guide' | 'store_optometrist' | 'supplier';
  displayName: string;
  roleName: string;
  roleSummary: string;
}

export const STORE_CATALOG: Array<{ id: string; name: string; code: string; region: string }> = [
  { id: 'store_hq_01', name: '杭州西湖旗舰店', code: 'HZ-XH01', region: '华东大区' },
  { id: 'store_hz_02', name: '杭州滨江天街店', code: 'HZ-BJ02', region: '华东大区' },
  { id: 'store_sh_03', name: '上海静安嘉里中心店', code: 'SH-JA03', region: '华东大区' },
  { id: 'store_nj_04', name: '南京新街口视光中心', code: 'NJ-XJ04', region: '华东大区' },
];

export const SUPPLIER_CATALOG: Array<{ id: string; name: string; code: string }> = [
  { id: 'sup_zeiss_01', name: '卡尔蔡司光学华东代理', code: 'SUP-ZEISS' },
  { id: 'sup_essilor_02', name: '依视路镜片供应链中心', code: 'SUP-ESSILOR' },
  { id: 'sup_linberg_03', name: '北欧钛架联合供货商', code: 'SUP-TITAN' },
];

export const ALL_MODULE_BASE_PERMISSIONS: PermissionCode[] = [
  'workbench.read',
  'basic.read',
  'basic.product.read',
  'basic.product.create',
  'basic.product.update',
  'basic.product.delete',
  'basic.product.import',
  'basic.product.export',
  'basic.product.cost.read',
  'basic.customer.read',
  'basic.customer.create',
  'basic.customer.update',
  'basic.customer.delete',
  'basic.staff.read',
  'basic.supplier.read',
  'basic.brand.read',
  'basic.fee.read',
  'sales.read',
  'sales.pos.create',
  'sales.order.read',
  'sales.discount.override',
  'sales.settings.manage',
  'purchase.read',
  'purchase.create',
  'purchase.approve',
  'transfer.read',
  'transfer.create',
  'inventory.read',
  'inventory.adjust.doc',
  'after_sales.read',
  'reports.read',
  'finance.read',
  'finance.audit',
  'contact_lenses.read',
  'members.read',
  'members.profile.read',
  'members.profile.create',
  'members.followup.notification.read',
  'members.followup.notification.send',
  'members.points.read',
  'members.recharge.read',
  'members.appointments.read',
  'members.marketing.read',
  'members.settings.manage',
  'members.analytics.read',
  'members.optometry.read',
  'processing.read',
  'vision_records.read',
  'vision_screening.read',
  'orthokeratology.read',
  'brands.read',
  'brands.order.create',
  'marketing.read',
  'system.read',
  'system.notice.publish',
  'system.role.manage',
  'system.user.manage',
  'system.store.manage',
  'system.period_close.execute',
  'help.read',
];

export const DEFAULT_ROLES: RoleDefinition[] = [
  {
    id: 'role_hq_admin',
    name: '总部运营管理员',
    identityType: 'admin',
    description: '可管理全部18个授权业务模块与跨门店范围；成本价与账期结转需单独开启。',
    dataScope: 'all_stores',
    permissions: ALL_MODULE_BASE_PERMISSIONS.filter((p) => p !== 'system.period_close.execute'),
    sensitiveFields: {
      viewCostPrice: true,
      viewWholesalePrice: true,
      viewProfitMargin: true,
      viewPlaintextPhone: false,
      batchExport: true,
    },
    updatedAt: '2026-11-10T09:30:00Z',
    updatedBy: '系统初始化',
  },
  {
    id: 'role_store_manager',
    name: '门店店长',
    identityType: 'store',
    subRole: 'store_manager',
    description: '仅访问所辖门店的门店交易、库存运营、客户经营、视力健康档案、交付加工与经营分析，无系统全局设置权。',
    dataScope: 'assigned_stores',
    permissions: [
      'workbench.read',
      'basic.read',
      'basic.product.read',
      'basic.product.export',
      'basic.customer.read',
      'basic.customer.create',
      'basic.customer.update',
      'basic.customer.delete',
      'basic.brand.read',
      'basic.fee.read',
      'sales.read',
      'sales.pos.create',
      'sales.order.read',
      'sales.discount.override',
      'purchase.read',
      'purchase.create',
      'transfer.read',
      'transfer.create',
      'inventory.read',
      'inventory.adjust.doc',
      'after_sales.read',
      'reports.read',
      'contact_lenses.read',
      'members.read',
      'members.profile.read',
      'members.profile.create',
      'members.followup.notification.read',
      'members.followup.notification.send',
      'members.points.read',
      'members.recharge.read',
      'members.appointments.read',
      'members.analytics.read',
      'members.optometry.read',
      'processing.read',
      'vision_records.read',
      'vision_screening.read',
      'orthokeratology.read',
      'brands.read',
      'marketing.read',
      'help.read',
    ],
    sensitiveFields: {
      viewCostPrice: false,
      viewWholesalePrice: true,
      viewProfitMargin: false,
      viewPlaintextPhone: false,
      batchExport: true,
    },
    updatedAt: '2026-11-12T14:20:00Z',
    updatedBy: '林致远',
  },
  {
    id: 'role_store_guide',
    name: '门店导购员',
    identityType: 'store',
    subRole: 'store_guide',
    description: '聚焦门店收银工作台、商品查询、客户接待与复查邀约，受限查看采购成本与资金往来。',
    dataScope: 'assigned_stores',
    permissions: [
      'workbench.read',
      'basic.read',
      'basic.product.read',
      'basic.customer.read',
      'basic.customer.create',
      'basic.customer.update',
      'sales.read',
      'sales.pos.create',
      'sales.order.read',
      'inventory.read',
      'after_sales.read',
      'members.read',
      'members.profile.read',
      'members.followup.notification.read',
      'members.appointments.read',
      'processing.read',
      'help.read',
    ],
    sensitiveFields: {
      viewCostPrice: false,
      viewWholesalePrice: false,
      viewProfitMargin: false,
      viewPlaintextPhone: false,
      batchExport: false,
    },
    updatedAt: '2026-11-12T14:22:00Z',
    updatedBy: '林致远',
  },
  {
    id: 'role_store_optometrist',
    name: '门店高级验光师',
    identityType: 'store',
    subRole: 'store_optometrist',
    description: '负责屈光检查记录、塑形镜随访、校园视力项目与复查邀约，不接触成本及财务审批。',
    dataScope: 'assigned_stores',
    permissions: [
      'workbench.read',
      'basic.read',
      'basic.product.read',
      'sales.read',
      'sales.order.read',
      'contact_lenses.read',
      'members.read',
      'members.profile.read',
      'members.followup.notification.read',
      'members.followup.notification.send',
      'members.appointments.read',
      'members.optometry.read',
      'processing.read',
      'vision_records.read',
      'vision_screening.read',
      'orthokeratology.read',
      'help.read',
    ],
    sensitiveFields: {
      viewCostPrice: false,
      viewWholesalePrice: false,
      viewProfitMargin: false,
      viewPlaintextPhone: false,
      batchExport: false,
    },
    updatedAt: '2026-11-12T15:05:00Z',
    updatedBy: '林致远',
  },
  {
    id: 'role_supplier_partner',
    name: '合作供应商账号',
    identityType: 'supplier',
    description: '供应商专属工作台与品牌采购门户：仅查看自身供货商品、采购交付、退货及供应链对账，严格隔离客户、视力健康与内部利润。',
    dataScope: 'own_supplier',
    permissions: [
      'workbench.read',
      'basic.read',
      'basic.product.read',
      'purchase.read',
      'after_sales.read',
      'finance.read',
      'brands.read',
      'brands.order.create',
      'help.read',
    ],
    sensitiveFields: {
      viewCostPrice: false,
      viewWholesalePrice: true,
      viewProfitMargin: false,
      viewPlaintextPhone: false,
      batchExport: false,
    },
    updatedAt: '2026-11-11T11:10:00Z',
    updatedBy: '系统初始化',
  },
];

export const PRESET_SESSIONS: Record<string, AuthSession> = {
  admin: {
    userId: 'user_admin_01',
    username: 'admin',
    displayName: '林致远',
    email: 'admin@qianshilink.demo',
    title: '营运总监 · 管理员',
    avatarInitials: '林',
    themeKey: DEFAULT_THEME_KEY,
    identityType: 'admin',
    roleId: 'role_hq_admin',
    roleName: '总部运营管理员',
    currentStoreId: 'all',
    currentStoreName: '全部授权门店 (4家)',
    authorizedStores: STORE_CATALOG,
  },
  store_manager: {
    userId: 'user_store_01',
    username: 'manager',
    displayName: '周婉宁',
    email: 'store.xihu@qianshilink.demo',
    title: '店长 · 杭州西湖旗舰店',
    avatarInitials: '周',
    themeKey: DEFAULT_THEME_KEY,
    identityType: 'store',
    roleId: 'role_store_manager',
    roleName: '门店店长',
    subRole: 'store_manager',
    currentStoreId: 'store_hq_01',
    currentStoreName: '杭州西湖旗舰店',
    authorizedStores: [STORE_CATALOG[0], STORE_CATALOG[1]],
  },
  store_guide: {
    userId: 'user_store_02',
    username: 'guide',
    displayName: '陈明轩',
    email: 'guide.binjiang@qianshilink.demo',
    title: '导购员 · 杭州滨江天街店',
    avatarInitials: '陈',
    themeKey: DEFAULT_THEME_KEY,
    identityType: 'store',
    roleId: 'role_store_guide',
    roleName: '门店导购员',
    subRole: 'store_guide',
    currentStoreId: 'store_hz_02',
    currentStoreName: '杭州滨江天街店',
    authorizedStores: [STORE_CATALOG[1]],
  },
  store_optometrist: {
    userId: 'user_store_03',
    username: 'optometrist',
    displayName: '许文博',
    email: 'optom.xihu@qianshilink.demo',
    title: '高级验光师 · 杭州西湖旗舰店',
    avatarInitials: '许',
    themeKey: DEFAULT_THEME_KEY,
    identityType: 'store',
    roleId: 'role_store_optometrist',
    roleName: '门店高级验光师',
    subRole: 'store_optometrist',
    currentStoreId: 'store_hq_01',
    currentStoreName: '杭州西湖旗舰店',
    authorizedStores: [STORE_CATALOG[0]],
  },
  supplier: {
    userId: 'user_sup_01',
    username: 'supplier',
    displayName: '顾承泽',
    email: 'supplier.zeiss@qianshilink.demo',
    title: '供应链协调人 · 卡尔蔡司光学华东代理',
    avatarInitials: '顾',
    themeKey: DEFAULT_THEME_KEY,
    identityType: 'supplier',
    roleId: 'role_supplier_partner',
    roleName: '合作供应商账号',
    currentStoreId: 'supplier_scope',
    currentStoreName: '卡尔蔡司光学华东代理',
    authorizedStores: [],
    supplierId: 'sup_zeiss_01',
    supplierName: '卡尔蔡司光学华东代理',
  },
};

export const LOGIN_ACCOUNTS: LoginAccountDescriptor[] = [
  {
    username: 'admin',
    aliases: ['admin@qianshilink.demo'],
    presetKey: 'admin',
    displayName: '林致远',
    roleName: '总部运营管理员',
    roleSummary: '总部全局权限：可访问全部18个授权业务模块与4家门店，支持成本价查看与数据导出。',
  },
  {
    username: 'manager',
    aliases: ['store.xihu@qianshilink.demo'],
    presetKey: 'store_manager',
    displayName: '周婉宁',
    roleName: '门店店长',
    roleSummary: '门店管理权限：限西湖旗舰店与滨江天街店，含开单超权折扣与门店报表，隔离系统配置与进货成本。',
  },
  {
    username: 'guide',
    aliases: ['guide.binjiang@qianshilink.demo'],
    presetKey: 'store_guide',
    displayName: '陈明轩',
    roleName: '门店导购员',
    roleSummary: '门店一线权限：限滨江天街店，聚焦收银工作台、商品查询与客户接待，隔离成本价、导出与资金往来。',
  },
  {
    username: 'optometrist',
    aliases: ['optom.xihu@qianshilink.demo'],
    presetKey: 'store_optometrist',
    displayName: '许文博',
    roleName: '门店高级验光师',
    roleSummary: '视力健康专业权限：限西湖旗舰店，负责屈光检查、塑形镜随访与校园视力项目，隔离成本与财务审批。',
  },
  {
    username: 'supplier',
    aliases: ['supplier.zeiss@qianshilink.demo'],
    presetKey: 'supplier',
    displayName: '顾承泽',
    roleName: '合作供应商账号',
    roleSummary: '外部协同权限：仅查看自身供货商品、采购交付、品牌采购门户与结算记录，严格隔离客户与门店利润。',
  },
];

export function checkPermission(
  role: RoleDefinition | undefined,
  requiredPermission?: PermissionCode
): boolean {
  if (!requiredPermission) return true;
  if (!role) return false;
  return role.permissions.includes(requiredPermission);
}
