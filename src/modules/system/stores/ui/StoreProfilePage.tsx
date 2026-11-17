import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  Columns3,
  Download,
  Filter,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { useAuth } from '@/src/modules/auth/application/AuthContext';
import {
  PROCESSING_CENTER_OPTIONS,
  PROVINCE_CITY_MAP,
  REGION_OPTIONS,
  WAREHOUSE_OPTIONS,
  addMonthsToDate,
  getDaysRemaining,
  loadStoreProfiles,
  saveStoreProfiles,
  type StoreOperatingStatus,
  type StorePermissions,
  type StoreProfileRecord,
  type StoreType,
} from '@/src/modules/system/stores/domain/storeProfile';
import { downloadCsv } from '@/src/shared/lib/exportCsv';
import { Button } from '@/src/shared/ui/Button';
import { HelpTooltip } from '@/src/shared/ui/HelpTooltip';
import { Modal } from '@/src/shared/ui/Modal';
import { Select } from '@/src/shared/ui/Select';
import { EmptyState } from '@/src/shared/ui/StateViews';
import { StatusLabel } from '@/src/shared/ui/StatusLabel';

type SortField =
  | 'name'
  | 'openedAt'
  | 'expiresAt'
  | 'storeType'
  | 'province'
  | 'city'
  | 'showOnMiniProgram'
  | 'crossStoreView'
  | 'otherStoresViewThis'
  | 'viewHqSuppliers'
  | 'viewInventoryCount';

type ColumnFilterKey =
  | 'name'
  | 'expiresStatus'
  | 'storeType'
  | 'shortName'
  | 'regionName'
  | 'province'
  | 'city'
  | 'storeCode'
  | 'contactName'
  | 'phone'
  | 'wechat'
  | 'qq'
  | 'medicalLicenseNo'
  | 'address'
  | 'showOnMiniProgram'
  | 'crossStoreView'
  | 'otherStoresViewThis'
  | 'viewHqSuppliers'
  | 'viewInventoryCount';

interface ColumnDef {
  key: string;
  label: string;
  minWidth: string;
  sticky?: boolean;
  defaultVisible: boolean;
  sortField?: SortField;
  filterKey?: ColumnFilterKey;
  filterKind?: 'text' | 'select';
}

const ALL_COLUMNS: ColumnDef[] = [
  { key: 'index', label: '#', minWidth: '52px', sticky: true, defaultVisible: true },
  { key: 'actions', label: '操作', minWidth: '158px', sticky: true, defaultVisible: true },
  {
    key: 'name',
    label: '门店名称',
    minWidth: '170px',
    defaultVisible: true,
    sortField: 'name',
    filterKey: 'name',
    filterKind: 'text',
  },
  {
    key: 'openedAt',
    label: '系统开户日期',
    minWidth: '132px',
    defaultVisible: true,
    sortField: 'openedAt',
  },
  {
    key: 'expiresAt',
    label: '系统到期日期',
    minWidth: '162px',
    defaultVisible: true,
    sortField: 'expiresAt',
    filterKey: 'expiresStatus',
    filterKind: 'select',
  },
  {
    key: 'storeType',
    label: '门店类型',
    minWidth: '112px',
    defaultVisible: true,
    sortField: 'storeType',
    filterKey: 'storeType',
    filterKind: 'select',
  },
  {
    key: 'shortName',
    label: '门店简称',
    minWidth: '130px',
    defaultVisible: true,
    filterKey: 'shortName',
    filterKind: 'text',
  },
  { key: 'parentStoreName', label: '归属总店', minWidth: '150px', defaultVisible: true },
  {
    key: 'regionName',
    label: '区域归属',
    minWidth: '110px',
    defaultVisible: true,
    filterKey: 'regionName',
    filterKind: 'select',
  },
  {
    key: 'province',
    label: '省',
    minWidth: '100px',
    defaultVisible: true,
    sortField: 'province',
    filterKey: 'province',
    filterKind: 'select',
  },
  {
    key: 'city',
    label: '市',
    minWidth: '100px',
    defaultVisible: true,
    sortField: 'city',
    filterKey: 'city',
    filterKind: 'select',
  },
  {
    key: 'storeCode',
    label: '门店代号',
    minWidth: '148px',
    defaultVisible: true,
    filterKey: 'storeCode',
    filterKind: 'text',
  },
  {
    key: 'contactName',
    label: '联系人',
    minWidth: '104px',
    defaultVisible: true,
    filterKey: 'contactName',
    filterKind: 'text',
  },
  {
    key: 'phone',
    label: '手机号码',
    minWidth: '132px',
    defaultVisible: true,
    filterKey: 'phone',
    filterKind: 'text',
  },
  {
    key: 'wechat',
    label: '微信',
    minWidth: '124px',
    defaultVisible: true,
    filterKey: 'wechat',
    filterKind: 'text',
  },
  {
    key: 'qq',
    label: 'QQ',
    minWidth: '118px',
    defaultVisible: true,
    filterKey: 'qq',
    filterKind: 'text',
  },
  {
    key: 'medicalLicenseNo',
    label: '医疗器械经营许可证号',
    minWidth: '196px',
    defaultVisible: true,
    filterKey: 'medicalLicenseNo',
    filterKind: 'text',
  },
  {
    key: 'medicalLicenseExpiry',
    label: '医疗器械经营许可证过期时间',
    minWidth: '196px',
    defaultVisible: true,
  },
  {
    key: 'address',
    label: '门店地址',
    minWidth: '260px',
    defaultVisible: true,
    filterKey: 'address',
    filterKind: 'text',
  },
  {
    key: 'showOnMiniProgram',
    label: '顾客小程序上显示',
    minWidth: '164px',
    defaultVisible: true,
    sortField: 'showOnMiniProgram',
    filterKey: 'showOnMiniProgram',
    filterKind: 'select',
  },
  {
    key: 'crossStoreView',
    label: '跨店查看权限',
    minWidth: '134px',
    defaultVisible: true,
    sortField: 'crossStoreView',
    filterKey: 'crossStoreView',
    filterKind: 'select',
  },
  {
    key: 'otherStoresViewThis',
    label: '其他门店查看本店权限',
    minWidth: '176px',
    defaultVisible: true,
    sortField: 'otherStoresViewThis',
    filterKey: 'otherStoresViewThis',
    filterKind: 'select',
  },
  {
    key: 'viewHqSuppliers',
    label: '查看总店供应商权限',
    minWidth: '168px',
    defaultVisible: true,
    sortField: 'viewHqSuppliers',
    filterKey: 'viewHqSuppliers',
    filterKind: 'select',
  },
  {
    key: 'viewInventoryCount',
    label: '盘点任务查看权限',
    minWidth: '148px',
    defaultVisible: true,
    sortField: 'viewInventoryCount',
    filterKey: 'viewInventoryCount',
    filterKind: 'select',
  },
];

const STORE_TYPE_STYLE: Record<StoreType, string> = {
  总店: 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]',
  分店: 'bg-[#F5F3FF] text-[#6D28D9] border-[#DDD6FE]',
  加盟店: 'bg-[#FEF7EC] text-[#B45309] border-[#FDE68A]',
  视光中心: 'bg-[var(--qsl-accent-soft-85)] text-[#171916] border-[var(--qsl-accent-soft-border)]',
};

const PERMISSION_FIELDS: Array<{
  key: keyof StorePermissions;
  label: string;
  desc: string;
  yesLabel: string;
  noLabel: string;
}> = [
  {
    key: 'showOnMiniProgram',
    label: '顾客小程序上显示',
    desc: '开启后，顾客在微信小程序预约验光及门店列表可见该门店信息。',
    yesLabel: '显示',
    noLabel: '隐藏',
  },
  {
    key: 'crossStoreView',
    label: '跨店查看权限',
    desc: '允许本门店员工查询其余授权门店的商品库存及客户基础档案。',
    yesLabel: '有',
    noLabel: '无',
  },
  {
    key: 'otherStoresViewThis',
    label: '其他门店查看本店权限',
    desc: '允许同连锁体系下的其他分店查看本店实时可调拨库存与营业概况。',
    yesLabel: '有',
    noLabel: '无',
  },
  {
    key: 'viewHqSuppliers',
    label: '查看总店供应商权限',
    desc: '允许门店在采购申请时参照总部统筹合作的品牌供应商名录。',
    yesLabel: '有',
    noLabel: '无',
  },
  {
    key: 'viewInventoryCount',
    label: '盘点任务查看权限',
    desc: '允许门店查看与核对历史盘点任务的盈亏明细及差异原因。',
    yesLabel: '有',
    noLabel: '无',
  },
];

interface StoreFormState {
  name: string;
  shortName: string;
  storeType: StoreType;
  parentStoreName: string;
  regionName: string;
  storeCode: string;
  openedAt: string;
  expiresAt: string;
  province: string;
  city: string;
  address: string;
  contactName: string;
  phone: string;
  wechat: string;
  qq: string;
  medicalLicenseNo: string;
  medicalLicenseExpiry: string;
  permissions: StorePermissions;
}

function createEmptyStoreForm(nextCodeNum: number): StoreFormState {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  const openedAt = `${y}-${m}-${d}`;
  const expiresAt = `${y + 2}-${m}-${d}`;
  const licenseExp = `${y + 4}-${m}-${d}`;

  return {
    name: '',
    shortName: '',
    storeType: '分店',
    parentStoreName: '杭州西湖旗舰店',
    regionName: '华东大区',
    storeCode: String(nextCodeNum).padStart(8, '0'),
    openedAt,
    expiresAt,
    province: '浙江省',
    city: '杭州市',
    address: '',
    contactName: '',
    phone: '',
    wechat: '',
    qq: '',
    medicalLicenseNo: '',
    medicalLicenseExpiry: licenseExp,
    permissions: {
      showOnMiniProgram: true,
      crossStoreView: false,
      otherStoresViewThis: true,
      viewHqSuppliers: true,
      viewInventoryCount: true,
    },
  };
}

type BatchPermChoice = 'keep' | 'true' | 'false';

export const StoreProfilePage: React.FC = () => {
  const { hasPermission } = useAuth();
  const canManageStores = hasPermission('system.store.manage');

  const [stores, setStores] = useState<StoreProfileRecord[]>(() => loadStoreProfiles());
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [sortBy, setSortBy] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [columnFilters, setColumnFilters] = useState<Partial<Record<ColumnFilterKey, string>>>({});
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Column visibility popover ("设置表头")
  const [hiddenCols, setHiddenCols] = useState<Record<string, boolean>>({});
  const [colMenuOpen, setColMenuOpen] = useState(false);
  const [colSearch, setColSearch] = useState('');
  const colMenuBtnRef = useRef<HTMLButtonElement>(null);
  const colMenuPopoverRef = useRef<HTMLDivElement>(null);

  // Header filter popover
  const [activeFilterCol, setActiveFilterCol] = useState<ColumnDef | null>(null);
  const [filterPopoverPos, setFilterPopoverPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const [filterDraft, setFilterDraft] = useState('');
  const filterPopoverRef = useRef<HTMLDivElement>(null);

  // Toast banner
  const [notice, setNotice] = useState<string | null>(null);

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreProfileRecord | null>(null);
  const [formState, setFormState] = useState<StoreFormState>(() => createEmptyStoreForm(4100));
  const [formError, setFormError] = useState<string | null>(null);

  const [renewTarget, setRenewTarget] = useState<StoreProfileRecord | null>(null);
  const [renewMonths, setRenewMonths] = useState<number>(12);
  const [renewCustomDate, setRenewCustomDate] = useState<string>('');
  const [renewRemark, setRenewRemark] = useState<string>('');

  const [permTarget, setPermTarget] = useState<StoreProfileRecord | null>(null);
  const [singlePermDraft, setSinglePermDraft] = useState<StorePermissions | null>(null);

  const [batchPermOpen, setBatchPermOpen] = useState(false);
  const [batchPermDraft, setBatchPermDraft] = useState<Record<keyof StorePermissions, BatchPermChoice>>({
    showOnMiniProgram: 'keep',
    crossStoreView: 'keep',
    otherStoresViewThis: 'keep',
    viewHqSuppliers: 'keep',
    viewInventoryCount: 'keep',
  });

  const [configTarget, setConfigTarget] = useState<StoreProfileRecord | null>(null);
  const [configDraft, setConfigDraft] = useState<StoreProfileRecord['config'] | null>(null);

  const [deleteTargets, setDeleteTargets] = useState<StoreProfileRecord[]>([]);

  const updateStores = (updater: (prev: StoreProfileRecord[]) => StoreProfileRecord[]) => {
    setStores((prev) => {
      const next = updater(prev);
      saveStoreProfiles(next);
      return next;
    });
  };

  const showSuccess = (msg: string) => {
    setNotice(msg);
  };

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(t);
  }, [notice]);

  // Close column settings popover on outside click
  useEffect(() => {
    if (!colMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        colMenuBtnRef.current?.contains(target) ||
        colMenuPopoverRef.current?.contains(target)
      ) {
        return;
      }
      setColMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [colMenuOpen]);

  // Close header filter popover on outside click / Escape / scroll
  useEffect(() => {
    if (!activeFilterCol) return;
    const onDown = (e: MouseEvent) => {
      if (filterPopoverRef.current?.contains(e.target as Node)) return;
      setActiveFilterCol(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveFilterCol(null);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [activeFilterCol]);

  const visibleColumns = useMemo(
    () => ALL_COLUMNS.filter((c) => !hiddenCols[c.key]),
    [hiddenCols]
  );

  const provinceOptions = useMemo(
    () => Array.from(new Set([...Object.keys(PROVINCE_CITY_MAP), ...stores.map((s) => s.province)])),
    [stores]
  );

  const cityOptions = useMemo(() => {
    const cities = new Set<string>(stores.map((s) => s.city));
    return Array.from(cities);
  }, [stores]);

  const parentStoreOptions = useMemo(() => {
    const hqs = stores.filter((s) => s.storeType === '总店').map((s) => s.name);
    return Array.from(new Set(['杭州西湖旗舰店', ...hqs]));
  }, [stores]);

  // Filtered + Sorted list
  const filteredStores = useMemo(() => {
    const kw = appliedKeyword.trim().toLowerCase();

    const list = stores.filter((s) => {
      if (kw) {
        const hay = [
          s.name,
          s.shortName,
          s.storeCode,
          String(s.numericId),
          s.contactName,
          s.phone,
          s.province,
          s.city,
          s.address,
          s.medicalLicenseNo,
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(kw)) return false;
      }

      for (const [k, rawVal] of Object.entries(columnFilters)) {
        const val = (rawVal ?? '').trim().toLowerCase();
        if (!val) continue;
        const key = k as ColumnFilterKey;

        if (key === 'name' && !s.name.toLowerCase().includes(val)) return false;
        if (key === 'shortName' && !s.shortName.toLowerCase().includes(val)) return false;
        if (
          key === 'storeCode' &&
          !`${s.numericId} ${s.storeCode}`.toLowerCase().includes(val)
        ) {
          return false;
        }
        if (key === 'contactName' && !s.contactName.toLowerCase().includes(val)) return false;
        if (key === 'phone' && !s.phone.toLowerCase().includes(val)) return false;
        if (key === 'wechat' && !s.wechat.toLowerCase().includes(val)) return false;
        if (key === 'qq' && !s.qq.toLowerCase().includes(val)) return false;
        if (
          key === 'medicalLicenseNo' &&
          !s.medicalLicenseNo.toLowerCase().includes(val)
        ) {
          return false;
        }
        if (key === 'address' && !s.address.toLowerCase().includes(val)) return false;
        if (key === 'storeType' && s.storeType.toLowerCase() !== val) return false;
        if (key === 'regionName' && s.regionName.toLowerCase() !== val) return false;
        if (key === 'province' && s.province.toLowerCase() !== val) return false;
        if (key === 'city' && s.city.toLowerCase() !== val) return false;

        if (key === 'expiresStatus') {
          const days = getDaysRemaining(s.expiresAt);
          if (val === 'expired' && !(days !== null && days < 0)) return false;
          if (val === 'expiring_soon' && !(days !== null && days >= 0 && days <= 180)) {
            return false;
          }
          if (val === 'normal' && !(days === null || days > 180)) return false;
        }

        if (key === 'showOnMiniProgram' && String(s.permissions.showOnMiniProgram) !== val) {
          return false;
        }
        if (key === 'crossStoreView' && String(s.permissions.crossStoreView) !== val) {
          return false;
        }
        if (
          key === 'otherStoresViewThis' &&
          String(s.permissions.otherStoresViewThis) !== val
        ) {
          return false;
        }
        if (key === 'viewHqSuppliers' && String(s.permissions.viewHqSuppliers) !== val) {
          return false;
        }
        if (key === 'viewInventoryCount' && String(s.permissions.viewInventoryCount) !== val) {
          return false;
        }
      }

      return true;
    });

    if (!sortBy) return list;

    return [...list].sort((a, b) => {
      const dir = sortOrder === 'asc' ? 1 : -1;
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name, 'zh-CN') * dir;
        case 'openedAt':
          return a.openedAt.localeCompare(b.openedAt) * dir;
        case 'expiresAt':
          return a.expiresAt.localeCompare(b.expiresAt) * dir;
        case 'storeType':
          return a.storeType.localeCompare(b.storeType, 'zh-CN') * dir;
        case 'province':
          return a.province.localeCompare(b.province, 'zh-CN') * dir;
        case 'city':
          return a.city.localeCompare(b.city, 'zh-CN') * dir;
        case 'showOnMiniProgram':
          return (Number(a.permissions.showOnMiniProgram) - Number(b.permissions.showOnMiniProgram)) * dir;
        case 'crossStoreView':
          return (Number(a.permissions.crossStoreView) - Number(b.permissions.crossStoreView)) * dir;
        case 'otherStoresViewThis':
          return (
            (Number(a.permissions.otherStoresViewThis) - Number(b.permissions.otherStoresViewThis)) *
            dir
          );
        case 'viewHqSuppliers':
          return (Number(a.permissions.viewHqSuppliers) - Number(b.permissions.viewHqSuppliers)) * dir;
        case 'viewInventoryCount':
          return (
            (Number(a.permissions.viewInventoryCount) - Number(b.permissions.viewInventoryCount)) *
            dir
          );
        default:
          return 0;
      }
    });
  }, [appliedKeyword, columnFilters, sortBy, sortOrder, stores]);

  const totalPages = Math.max(1, Math.ceil(filteredStores.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedStores = useMemo(
    () => filteredStores.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filteredStores, safePage]
  );

  const hasActiveFilters =
    Boolean(appliedKeyword.trim()) ||
    Object.values(columnFilters).some((v) => Boolean(v && v.trim()));

  const allOnPageSelected =
    pagedStores.length > 0 && pagedStores.every((s) => selectedIds.includes(s.id));

  const toggleAllOnPage = () => {
    if (allOnPageSelected) {
      const pageSet = new Set(pagedStores.map((s) => s.id));
      setSelectedIds((prev) => prev.filter((id) => !pageSet.has(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pagedStores.map((s) => s.id)])));
    }
  };

  const toggleRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const openHeaderFilter = (col: ColumnDef, e: React.MouseEvent<HTMLButtonElement>) => {
    if (!col.filterKey) return;
    if (activeFilterCol?.key === col.key) {
      setActiveFilterCol(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const width = 240;
    const left = Math.min(Math.max(12, rect.left - 40), window.innerWidth - width - 12);
    const top = Math.min(window.innerHeight - 240, rect.bottom + 8);
    setFilterPopoverPos({ top, left });
    setFilterDraft(columnFilters[col.filterKey] ?? '');
    setActiveFilterCol(col);
  };

  const applyFilter = (key: ColumnFilterKey, value: string) => {
    setColumnFilters((prev) => {
      const next = { ...prev };
      if (!value.trim()) {
        delete next[key];
      } else {
        next[key] = value.trim();
      }
      return next;
    });
    setPage(1);
    setActiveFilterCol(null);
  };

  const resetAllFilters = () => {
    setSearchInput('');
    setAppliedKeyword('');
    setColumnFilters({});
    setSortBy(null);
    setPage(1);
  };

  const openCreateModal = () => {
    const maxNum = stores.reduce((max, s) => Math.max(max, s.numericId), 4000);
    setEditingStore(null);
    setFormState(createEmptyStoreForm(maxNum + 1));
    setFormError(null);
    setFormOpen(true);
  };

  const openEditModal = (store: StoreProfileRecord) => {
    setEditingStore(store);
    setFormState({
      name: store.name,
      shortName: store.shortName,
      storeType: store.storeType,
      parentStoreName: store.parentStoreName,
      regionName: store.regionName,
      storeCode: store.storeCode,
      openedAt: store.openedAt,
      expiresAt: store.expiresAt,
      province: store.province,
      city: store.city,
      address: store.address,
      contactName: store.contactName,
      phone: store.phone,
      wechat: store.wechat,
      qq: store.qq,
      medicalLicenseNo: store.medicalLicenseNo,
      medicalLicenseExpiry: store.medicalLicenseExpiry,
      permissions: { ...store.permissions },
    });
    setFormError(null);
    setFormOpen(true);
  };

  const handleSaveStore = () => {
    if (!formState.name.trim()) {
      setFormError('请输入门店名称');
      return;
    }
    if (!formState.storeCode.trim()) {
      setFormError('请输入门店代号');
      return;
    }
    if (!formState.contactName.trim() || !formState.phone.trim()) {
      setFormError('请输入门店联系人与手机号码');
      return;
    }
    if (!formState.address.trim()) {
      setFormError('请输入门店详细地址');
      return;
    }

    if (editingStore) {
      updateStores((prev) =>
        prev.map((item) =>
          item.id === editingStore.id
            ? {
                ...item,
                name: formState.name.trim(),
                shortName: formState.shortName.trim() || formState.name.trim(),
                storeType: formState.storeType,
                parentStoreName:
                  formState.storeType === '总店'
                    ? formState.name.trim()
                    : formState.parentStoreName,
                regionName: formState.regionName,
                storeCode: formState.storeCode.trim(),
                openedAt: formState.openedAt,
                expiresAt: formState.expiresAt,
                province: formState.province,
                city: formState.city,
                address: formState.address.trim(),
                contactName: formState.contactName.trim(),
                phone: formState.phone.trim(),
                wechat: formState.wechat.trim(),
                qq: formState.qq.trim(),
                medicalLicenseNo: formState.medicalLicenseNo.trim(),
                medicalLicenseExpiry: formState.medicalLicenseExpiry,
                permissions: { ...formState.permissions },
              }
            : item
        )
      );
      setFormOpen(false);
      showSuccess(`已保存「${formState.name.trim()}」门店资料修改`);
    } else {
      const nextIdNum = stores.reduce((max, s) => Math.max(max, s.numericId), 4000) + 1;
      const created: StoreProfileRecord = {
        id: `store_${Date.now()}`,
        numericId: nextIdNum,
        storeCode: formState.storeCode.trim(),
        name: formState.name.trim(),
        shortName: formState.shortName.trim() || formState.name.trim(),
        storeType: formState.storeType,
        parentStoreName:
          formState.storeType === '总店' ? formState.name.trim() : formState.parentStoreName,
        regionName: formState.regionName,
        province: formState.province,
        city: formState.city,
        address: formState.address.trim(),
        contactName: formState.contactName.trim(),
        phone: formState.phone.trim(),
        wechat: formState.wechat.trim(),
        qq: formState.qq.trim(),
        medicalLicenseNo: formState.medicalLicenseNo.trim(),
        medicalLicenseExpiry: formState.medicalLicenseExpiry || '1900-01-01',
        openedAt: formState.openedAt,
        expiresAt: formState.expiresAt,
        permissions: { ...formState.permissions },
        config: {
          defaultWarehouse: `${formState.shortName.trim() || formState.name.trim()}中心仓`,
          processingCenter: '华东中央车房加工中心',
          blankLensSourceWarehouse: '杭州总仓',
          businessHours: '09:30 - 21:30',
          appointmentSlotCapacity: 3,
          allowOnlineAppointment: formState.permissions.showOnMiniProgram,
          operatingStatus: 'operating',
          miniProgramNotice: '支持专业医学验光、眼镜定制与到店调校服务。',
        },
      };
      updateStores((prev) => [created, ...prev]);
      setFormOpen(false);
      setPage(1);
      showSuccess(`已新增门店「${created.name}」（代号 ${created.storeCode}）`);
    }
  };

  const openRenewModal = (store: StoreProfileRecord) => {
    setRenewTarget(store);
    setRenewMonths(12);
    setRenewCustomDate(addMonthsToDate(store.expiresAt, 12));
    setRenewRemark('');
  };

  const handleConfirmRenew = () => {
    if (!renewTarget || !renewCustomDate) return;
    updateStores((prev) =>
      prev.map((s) => (s.id === renewTarget.id ? { ...s, expiresAt: renewCustomDate } : s))
    );
    showSuccess(`门店「${renewTarget.name}」系统到期日已续期至 ${renewCustomDate}`);
    setRenewTarget(null);
  };

  const openPermissionsModal = (store: StoreProfileRecord) => {
    setPermTarget(store);
    setSinglePermDraft({ ...store.permissions });
  };

  const handleConfirmSinglePermissions = () => {
    if (!permTarget || !singlePermDraft) return;
    updateStores((prev) =>
      prev.map((s) => (s.id === permTarget.id ? { ...s, permissions: { ...singlePermDraft } } : s))
    );
    showSuccess(`已更新「${permTarget.name}」的门店查看与小程序权限`);
    setPermTarget(null);
  };

  const openBatchPermModal = () => {
    setBatchPermDraft({
      showOnMiniProgram: 'keep',
      crossStoreView: 'keep',
      otherStoresViewThis: 'keep',
      viewHqSuppliers: 'keep',
      viewInventoryCount: 'keep',
    });
    setBatchPermOpen(true);
  };

  const handleConfirmBatchPermissions = () => {
    const selectedSet = new Set(selectedIds);
    updateStores((prev) =>
      prev.map((s) => {
        if (!selectedSet.has(s.id)) return s;
        const nextPerm: StorePermissions = { ...s.permissions };
        for (const field of PERMISSION_FIELDS) {
          const choice = batchPermDraft[field.key];
          if (choice === 'true') nextPerm[field.key] = true;
          if (choice === 'false') nextPerm[field.key] = false;
        }
        return { ...s, permissions: nextPerm };
      })
    );
    setBatchPermOpen(false);
    showSuccess(`已批量更新 ${selectedIds.length} 家门店的权限配置`);
  };

  const openConfigModal = (store: StoreProfileRecord) => {
    setConfigTarget(store);
    setConfigDraft({ ...store.config });
  };

  const handleConfirmConfig = () => {
    if (!configTarget || !configDraft) return;
    updateStores((prev) =>
      prev.map((s) => (s.id === configTarget.id ? { ...s, config: { ...configDraft } } : s))
    );
    showSuccess(`已保存「${configTarget.name}」仓库与营业配置`);
    setConfigTarget(null);
  };

  const handleConfirmDelete = () => {
    if (deleteTargets.length === 0) return;
    const removeSet = new Set(deleteTargets.map((d) => d.id));
    updateStores((prev) => prev.filter((s) => !removeSet.has(s.id)));
    setSelectedIds((prev) => prev.filter((id) => !removeSet.has(id)));
    showSuccess(
      deleteTargets.length === 1
        ? `已删除门店「${deleteTargets[0].name}」`
        : `已批量删除 ${deleteTargets.length} 家门店档案`
    );
    setDeleteTargets([]);
  };

  const handleExport = () => {
    const targetRows =
      selectedIds.length > 0
        ? filteredStores.filter((s) => selectedIds.includes(s.id))
        : filteredStores;
    downloadCsv('千视林_门店资料档案', targetRows, [
      { key: 'numericId', header: '门店ID', accessor: (r) => r.numericId },
      { key: 'storeCode', header: '门店代号', accessor: (r) => r.storeCode },
      { key: 'name', header: '门店名称', accessor: (r) => r.name },
      { key: 'shortName', header: '门店简称', accessor: (r) => r.shortName },
      { key: 'storeType', header: '门店类型', accessor: (r) => r.storeType },
      { key: 'parentStoreName', header: '归属总店', accessor: (r) => r.parentStoreName },
      { key: 'regionName', header: '区域归属', accessor: (r) => r.regionName },
      { key: 'province', header: '省', accessor: (r) => r.province },
      { key: 'city', header: '市', accessor: (r) => r.city },
      { key: 'contactName', header: '联系人', accessor: (r) => r.contactName },
      { key: 'phone', header: '手机号码', accessor: (r) => r.phone },
      { key: 'wechat', header: '微信', accessor: (r) => r.wechat },
      { key: 'qq', header: 'QQ', accessor: (r) => r.qq },
      { key: 'openedAt', header: '系统开户日期', accessor: (r) => r.openedAt },
      { key: 'expiresAt', header: '系统到期日期', accessor: (r) => r.expiresAt },
      { key: 'medicalLicenseNo', header: '医疗器械经营许可证号', accessor: (r) => r.medicalLicenseNo },
      {
        key: 'medicalLicenseExpiry',
        header: '许可证过期时间',
        accessor: (r) => r.medicalLicenseExpiry,
      },
      { key: 'address', header: '门店地址', accessor: (r) => r.address },
      {
        key: 'showOnMiniProgram',
        header: '顾客小程序上显示',
        accessor: (r) => (r.permissions.showOnMiniProgram ? '显示' : '隐藏'),
      },
      {
        key: 'crossStoreView',
        header: '跨店查看权限',
        accessor: (r) => (r.permissions.crossStoreView ? '有' : '无'),
      },
      {
        key: 'otherStoresViewThis',
        header: '其他门店查看本店权限',
        accessor: (r) => (r.permissions.otherStoresViewThis ? '有' : '无'),
      },
      {
        key: 'viewHqSuppliers',
        header: '查看总店供应商权限',
        accessor: (r) => (r.permissions.viewHqSuppliers ? '有' : '无'),
      },
      {
        key: 'viewInventoryCount',
        header: '盘点任务查看权限',
        accessor: (r) => (r.permissions.viewInventoryCount ? '有' : '无'),
      },
    ]);
    showSuccess(`已导出 ${targetRows.length} 条门店资料`);
  };

  const renderBooleanTag = (yes: boolean, yesLabel = '有', noLabel = '无') => (
    <span
      className={`inline-flex items-center justify-center min-w-[40px] px-2.5 py-0.5 rounded-[7px] text-[13px] font-medium border ${
        yes
          ? 'bg-[#ECFDF3] text-[#166534] border-[#86EFAC]'
          : 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]'
      }`}
    >
      {yes ? yesLabel : noLabel}
    </span>
  );

  const getHeaderFilterOptions = (key: ColumnFilterKey) => {
    switch (key) {
      case 'expiresStatus':
        return [
          { value: '', label: '全部到期状态' },
          { value: 'normal', label: '正常（>180天）' },
          { value: 'expiring_soon', label: '即将到期（≤180天）' },
          { value: 'expired', label: '已到期' },
        ];
      case 'storeType':
        return [
          { value: '', label: '全部类型' },
          { value: '总店', label: '总店' },
          { value: '分店', label: '分店' },
          { value: '加盟店', label: '加盟店' },
          { value: '视光中心', label: '视光中心' },
        ];
      case 'regionName':
        return [
          { value: '', label: '全部大区' },
          ...REGION_OPTIONS.map((r) => ({ value: r, label: r })),
        ];
      case 'province':
        return [
          { value: '', label: '全部省份' },
          ...provinceOptions.map((p) => ({ value: p, label: p })),
        ];
      case 'city':
        return [
          { value: '', label: '全部城市' },
          ...cityOptions.map((c) => ({ value: c, label: c })),
        ];
      case 'showOnMiniProgram':
        return [
          { value: '', label: '全部状态' },
          { value: 'true', label: '显示' },
          { value: 'false', label: '隐藏' },
        ];
      default:
        return [
          { value: '', label: '全部权限' },
          { value: 'true', label: '有' },
          { value: 'false', label: '无' },
        ];
    }
  };

  const renderCell = (store: StoreProfileRecord, colKey: string, rowIdx: number) => {
    switch (colKey) {
      case 'index':
        return (
          <span className="tabular-nums text-[#5F645D] font-medium">
            {(safePage - 1) * pageSize + rowIdx + 1}
          </span>
        );

      case 'actions':
        return (
          <div className="flex flex-col gap-1 py-0.5">
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={!canManageStores}
                onClick={() => openRenewModal(store)}
                className="px-2 py-0.5 rounded-[6px] text-[12px] font-medium bg-[#171916] text-white hover:bg-[#2C302A] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-colors"
              >
                续费
              </button>
              <button
                type="button"
                disabled={!canManageStores}
                onClick={() => openEditModal(store)}
                className="px-2 py-0.5 rounded-[6px] text-[12px] font-medium bg-[var(--qsl-accent-soft)] text-[#171916] border border-[var(--qsl-accent-soft-border)] hover:bg-[var(--qsl-accent)] hover:text-[var(--qsl-accent-ink)] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-colors"
              >
                编辑
              </button>
              <button
                type="button"
                disabled={!canManageStores}
                onClick={() => setDeleteTargets([store])}
                title="删除门店"
                aria-label={`删除 ${store.name}`}
                className="px-1.5 py-0.5 rounded-[6px] text-[12px] font-medium text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] hover:bg-[#FEE2E2] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-colors"
              >
                删除
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={!canManageStores}
                onClick={() => openPermissionsModal(store)}
                className="px-2 py-0.5 rounded-[6px] text-[12px] font-medium bg-[#F8F9F5] text-[#171916] border border-[#D9DDD4] hover:border-[#171916] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-colors"
              >
                权限
              </button>
              <button
                type="button"
                disabled={!canManageStores}
                onClick={() => openConfigModal(store)}
                className="px-2 py-0.5 rounded-[6px] text-[12px] font-medium bg-[#F8F9F5] text-[#171916] border border-[#D9DDD4] hover:border-[#171916] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-colors"
              >
                配置
              </button>
            </div>
          </div>
        );

      case 'name':
        return (
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#171916]">{store.name}</span>
            {store.config.operatingStatus !== 'operating' && (
              <StatusLabel
                tone={store.config.operatingStatus === 'preparing' ? 'warning' : 'neutral'}
                label={store.config.operatingStatus === 'preparing' ? '筹备中' : '已停用'}
              />
            )}
          </div>
        );

      case 'openedAt':
        return <span className="tabular-nums text-[#5F645D]">{store.openedAt}</span>;

      case 'expiresAt': {
        const days = getDaysRemaining(store.expiresAt);
        return (
          <div className="leading-snug tabular-nums">
            <div className="text-[#171916]">{store.expiresAt}</div>
            {days !== null && (
              <div
                className={`text-[12px] ${
                  days < 0
                    ? 'text-[#DC2626] font-medium'
                    : days <= 180
                      ? 'text-[#B45309] font-medium'
                      : 'text-[#73796F]'
                }`}
              >
                {days < 0 ? `(已逾期${Math.abs(days)}天)` : `(${days}天后到期)`}
              </div>
            )}
          </div>
        );
      }

      case 'storeType':
        return (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-[7px] text-[13px] font-medium border ${
              STORE_TYPE_STYLE[store.storeType]
            }`}
          >
            {store.storeType}
          </span>
        );

      case 'shortName':
        return <span className="text-[#171916]">{store.shortName || '—'}</span>;

      case 'parentStoreName':
        return <span className="text-[#5F645D]">{store.parentStoreName || '—'}</span>;

      case 'regionName':
        return <span className="text-[#5F645D]">{store.regionName || '—'}</span>;

      case 'province':
        return <span>{store.province}</span>;

      case 'city':
        return <span>{store.city}</span>;

      case 'storeCode':
        return (
          <div className="leading-snug tabular-nums font-mono text-[13px]">
            <div className="text-[#5F645D]">ID: {store.numericId}</div>
            <div className="text-[#171916]">代号: {store.storeCode}</div>
          </div>
        );

      case 'contactName':
        return <span className="font-medium">{store.contactName}</span>;

      case 'phone':
        return <span className="tabular-nums">{store.phone}</span>;

      case 'wechat':
        return <span className="text-[#5F645D] font-mono text-[13px]">{store.wechat || '—'}</span>;

      case 'qq':
        return <span className="text-[#5F645D] tabular-nums">{store.qq || '—'}</span>;

      case 'medicalLicenseNo':
        return (
          <span className="text-[#171916] font-mono text-[13px]">
            {store.medicalLicenseNo || '—'}
          </span>
        );

      case 'medicalLicenseExpiry': {
        const expDays = getDaysRemaining(store.medicalLicenseExpiry);
        return (
          <span
            className={`tabular-nums ${
              expDays !== null && expDays <= 90 ? 'text-[#B45309] font-medium' : 'text-[#5F645D]'
            }`}
          >
            {store.medicalLicenseExpiry || '1900-01-01'}
          </span>
        );
      }

      case 'address':
        return (
          <span className="block max-w-[260px] truncate" title={store.address}>
            {store.address}
          </span>
        );

      case 'showOnMiniProgram':
        return renderBooleanTag(store.permissions.showOnMiniProgram, '显示', '隐藏');

      case 'crossStoreView':
        return renderBooleanTag(store.permissions.crossStoreView, '有', '无');

      case 'otherStoresViewThis':
        return renderBooleanTag(store.permissions.otherStoresViewThis, '有', '无');

      case 'viewHqSuppliers':
        return renderBooleanTag(store.permissions.viewHqSuppliers, '有', '无');

      case 'viewInventoryCount':
        return renderBooleanTag(store.permissions.viewInventoryCount, '有', '无');

      default:
        return null;
    }
  };

  const startIdx = filteredStores.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endIdx = Math.min(filteredStores.length, safePage * pageSize);

  return (
    <div className="space-y-4">
      {notice && (
        <div
          role="status"
          className="px-4 py-3 rounded-2xl bg-[var(--qsl-accent-soft)] border border-[var(--qsl-accent-soft-border)] text-[#171916] text-[14px] font-medium flex items-center justify-between gap-3"
        >
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#166534] shrink-0" />
            <span>{notice}</span>
          </span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="关闭提示"
            className="text-[#5F645D] hover:text-[#171916] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Toolbar */}
      <div className="bg-white border border-[#D9DDD4] rounded-[20px] p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {canManageStores && (
            <>
              <Button variant="accent" icon={<Plus className="w-4 h-4" />} onClick={openCreateModal}>
                新增门店
              </Button>
              <Button
                variant="secondary"
                disabled={selectedIds.length === 0}
                icon={<ShieldCheck className="w-4 h-4" />}
                onClick={openBatchPermModal}
              >
                批量修改权限 {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
              </Button>
              <Button
                variant="danger"
                disabled={selectedIds.length === 0}
                icon={<Trash2 className="w-4 h-4" />}
                onClick={() =>
                  setDeleteTargets(stores.filter((s) => selectedIds.includes(s.id)))
                }
              >
                删除门店 {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
              </Button>
            </>
          )}
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-[13px] text-[#5F645D] hover:text-[#171916] underline underline-offset-2 cursor-pointer ml-1"
            >
              清空已选 ({selectedIds.length})
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            icon={<Download className="w-4 h-4" />}
            disabled={filteredStores.length === 0}
            onClick={handleExport}
          >
            导出
          </Button>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setAppliedKeyword(searchInput);
              setPage(1);
            }}
            className="flex items-center gap-1.5"
          >
            <div className="relative w-56 sm:w-64">
              <Search className="w-4 h-4 text-[#73796F] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="模糊搜索门店/代号/联系人..."
                className="w-full h-10 pl-9 pr-3 rounded-[10px] bg-[#F8F9F5] border border-[#D9DDD4] focus:bg-white focus:border-[#171916] text-[14px] text-[#171916] outline-none transition-colors"
              />
            </div>
            <Button type="submit" variant="primary">
              搜索
            </Button>
          </form>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              icon={<RotateCcw className="w-3.5 h-3.5" />}
              onClick={resetAllFilters}
            >
              重置筛选
            </Button>
          )}

          {/* Header Column Settings Trigger */}
          <div className="relative">
            <Button
              ref={colMenuBtnRef}
              variant="secondary"
              icon={<SlidersHorizontal className="w-4 h-4" />}
              onClick={() => setColMenuOpen((prev) => !prev)}
            >
              设置表头
            </Button>
            {colMenuOpen && (
              <div
                ref={colMenuPopoverRef}
                className="absolute right-0 mt-2 w-72 qsl-glass-popover rounded-2xl p-3.5 z-40"
              >
                <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#171916]/[0.08]">
                  <span className="text-[14px] font-semibold text-[#171916] inline-flex items-center gap-1.5">
                    <Columns3 className="w-4 h-4" /> 设置显示表头
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setHiddenCols({})}
                      className="text-[12px] text-[#5F645D] hover:text-[#171916] cursor-pointer"
                    >
                      恢复默认
                    </button>
                    <button
                      type="button"
                      onClick={() => setColMenuOpen(false)}
                      className="text-[13px] font-medium text-[#171916] cursor-pointer"
                    >
                      完成
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  value={colSearch}
                  onChange={(e) => setColSearch(e.target.value)}
                  placeholder="筛选列名..."
                  className="w-full h-8 px-2.5 mb-2 rounded-lg bg-white/80 border border-[#D9DDD4] text-[13px] outline-none focus:border-[#171916]"
                />
                <div className="max-h-64 overflow-y-auto qsl-scroll space-y-1">
                  {ALL_COLUMNS.filter((c) =>
                    colSearch.trim() ? c.label.includes(colSearch.trim()) : true
                  ).map((col) => {
                    const checked = !hiddenCols[col.key];
                    return (
                      <label
                        key={col.key}
                        className="flex items-center gap-2 text-[14px] text-[#171916] py-1 px-2 rounded-lg hover:bg-white/70 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={col.sticky}
                          onChange={() =>
                            setHiddenCols((prev) => ({
                              ...prev,
                              [col.key]: checked,
                            }))
                          }
                          className="accent-[#171916]"
                        />
                        <span className="truncate">{col.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Connected Wide Store Profile Table */}
      {filteredStores.length === 0 ? (
        <EmptyState
          mode="filtered"
          title="没有匹配的门店档案"
          description="请调整模糊搜索关键词或表头筛选条件，或点击新增门店建立档案。"
          actionLabel={hasActiveFilters ? '清除筛选条件' : undefined}
          onAction={hasActiveFilters ? resetAllFilters : undefined}
        />
      ) : (
        <div className="bg-white border border-[#D9DDD4] rounded-[20px] overflow-hidden">
          <div className="overflow-x-auto qsl-scroll">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[#E5E8E0] bg-[#F8F9F5]">
                  <th className="w-11 px-3.5 py-3 text-center sticky left-0 bg-[#F8F9F5] z-20 border-r border-[#E5E8E0]">
                    <input
                      type="checkbox"
                      aria-label="全选当前页门店"
                      checked={allOnPageSelected}
                      onChange={toggleAllOnPage}
                      className="accent-[#171916] w-4 h-4 cursor-pointer"
                    />
                  </th>
                  {visibleColumns.map((col) => {
                    const isSorted = sortBy === col.sortField;
                    const filterActive = Boolean(
                      col.filterKey && columnFilters[col.filterKey]
                    );
                    const stickyPos =
                      col.key === 'index'
                        ? 'sticky left-11 z-20 bg-[#F8F9F5] border-r border-[#E5E8E0]'
                        : col.key === 'actions'
                          ? 'sticky left-[96px] z-20 bg-[#F8F9F5] border-r border-[#D9DDD4] shadow-[4px_0_12px_rgba(23,25,22,0.04)]'
                          : 'border-r border-[#E5E8E0] last:border-r-0';

                    return (
                      <th
                        key={col.key}
                        style={{ minWidth: col.minWidth }}
                        className={`px-3.5 py-3 text-[13px] font-semibold text-[#5F645D] whitespace-nowrap align-middle ${stickyPos}`}
                      >
                        <div className="inline-flex items-center gap-1.5">
                          <span>{col.label}</span>
                          {col.key === 'showOnMiniProgram' && (
                            <HelpTooltip
                              title="顾客小程序上显示说明"
                              content="控制该门店是否展示在千视林顾客端微信小程序的门店导航及在线预约列表中。"
                              ariaLabel="查看顾客小程序显示说明"
                            />
                          )}
                          {col.sortField && (
                            <button
                              type="button"
                              onClick={() => handleSort(col.sortField!)}
                              aria-label={`按 ${col.label} 排序`}
                              className={`p-0.5 rounded hover:bg-[#EAECE6] cursor-pointer ${
                                isSorted ? 'text-[#171916]' : 'text-[#8C9288]'
                              }`}
                            >
                              {isSorted ? (
                                sortOrder === 'asc' ? (
                                  <ArrowUp className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowDown className="w-3.5 h-3.5" />
                                )
                              ) : (
                                <ArrowUpDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                          {col.filterKey && (
                            <button
                              type="button"
                              onClick={(e) => openHeaderFilter(col, e)}
                              aria-label={`筛选 ${col.label}`}
                              className={`p-0.5 rounded cursor-pointer transition-colors ${
                                filterActive
                                  ? 'bg-[var(--qsl-accent-soft)] text-[#171916]'
                                  : 'text-[#8C9288] hover:bg-[#EAECE6] hover:text-[#171916]'
                              }`}
                            >
                              <Filter className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-[#E5E8E0]">
                {pagedStores.map((store, idx) => {
                  const checked = selectedIds.includes(store.id);
                  const rowBg = checked
                    ? 'bg-[var(--qsl-accent-soft-35)]'
                    : idx % 2 === 1
                      ? 'bg-[#FAFBF8]'
                      : 'bg-white';
                  const stickyCellBg = checked
                    ? 'bg-[var(--qsl-accent-soft)]'
                    : idx % 2 === 1
                      ? 'bg-[#FAFBF8]'
                      : 'bg-white';

                  return (
                    <tr
                      key={store.id}
                      className={`transition-colors hover:bg-[#F1F5EC] ${rowBg}`}
                    >
                      <td
                        className={`w-11 px-3.5 py-2.5 text-center sticky left-0 z-10 border-r border-[#E5E8E0] ${stickyCellBg}`}
                      >
                        <input
                          type="checkbox"
                          aria-label={`选择门店 ${store.name}`}
                          checked={checked}
                          onChange={() => toggleRow(store.id)}
                          className="accent-[#171916] w-4 h-4 cursor-pointer"
                        />
                      </td>

                      {visibleColumns.map((col) => {
                        const stickyPos =
                          col.key === 'index'
                            ? `sticky left-11 z-10 border-r border-[#E5E8E0] ${stickyCellBg} text-center`
                            : col.key === 'actions'
                              ? `sticky left-[96px] z-10 border-r border-[#D9DDD4] shadow-[4px_0_12px_rgba(23,25,22,0.04)] ${stickyCellBg}`
                              : 'border-r border-[#E5E8E0] last:border-r-0';

                        return (
                          <td
                            key={col.key}
                            className={`px-3.5 py-2.5 text-[14px] text-[#171916] whitespace-nowrap align-middle ${stickyPos}`}
                          >
                            {renderCell(store, col.key, idx)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-t border-[#E5E8E0] bg-white text-[14px] text-[#5F645D]">
            <div className="tabular-nums">
              第 {startIdx}–{endIdx} 条 · 共 <strong className="text-[#171916]">{filteredStores.length}</strong> 家门店
              <span className="mx-2 text-[#D9DDD4]">|</span>
              <span>提示：左右滑动表格可查看完整门店资质与跨店权限列</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={safePage <= 1}
                onClick={() => setPage(safePage - 1)}
              >
                上一页
              </Button>
              <span className="px-2 tabular-nums text-[#171916]">
                {safePage} / {totalPages}
              </span>
              <Button
                size="sm"
                variant="secondary"
                disabled={safePage >= totalPages}
                onClick={() => setPage(safePage + 1)}
              >
                下一页
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Column Header Filter Portal Popover */}
      {activeFilterCol &&
        activeFilterCol.filterKey &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={filterPopoverRef}
            style={{
              position: 'fixed',
              top: `${filterPopoverPos.top}px`,
              left: `${filterPopoverPos.left}px`,
            }}
            className="z-[90] w-60 qsl-glass-popover rounded-2xl p-3 space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-[#171916]">
                筛选 · {activeFilterCol.label}
              </span>
              <button
                type="button"
                onClick={() => applyFilter(activeFilterCol.filterKey!, '')}
                className="text-[12px] text-[#5F645D] hover:text-[#171916] cursor-pointer"
              >
                清空
              </button>
            </div>

            {activeFilterCol.filterKind === 'select' ? (
              <div className="space-y-1 max-h-56 overflow-y-auto qsl-scroll">
                {getHeaderFilterOptions(activeFilterCol.filterKey).map((opt) => {
                  const currentVal = columnFilters[activeFilterCol.filterKey!] ?? '';
                  const isActive = currentVal === opt.value;
                  return (
                    <button
                      key={opt.value || '__all__'}
                      type="button"
                      onClick={() => applyFilter(activeFilterCol.filterKey!, opt.value)}
                      className={`w-full px-2.5 py-1.5 rounded-lg text-left text-[13px] cursor-pointer transition-colors ${
                        isActive
                          ? 'bg-[var(--qsl-accent-soft-85)] text-[#171916] font-semibold'
                          : 'text-[#171916] hover:bg-[#171916]/[0.05]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  applyFilter(activeFilterCol.filterKey!, filterDraft);
                }}
                className="space-y-2"
              >
                <input
                  type="text"
                  autoFocus
                  value={filterDraft}
                  onChange={(e) => setFilterDraft(e.target.value)}
                  placeholder={`输入${activeFilterCol.label}关键字...`}
                  className="w-full h-9 px-2.5 rounded-lg bg-white border border-[#D9DDD4] text-[13px] outline-none focus:border-[#171916]"
                />
                <div className="flex justify-end gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setActiveFilterCol(null)}
                  >
                    取消
                  </Button>
                  <Button type="submit" size="sm" variant="primary">
                    应用
                  </Button>
                </div>
              </form>
            )}
          </div>,
          document.body
        )}

      {/* Modal 1: Create / Edit Store */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingStore ? `编辑门店资料 · ${editingStore.name}` : '新增门店档案'}
        subtitle="完善门店基础信息、医疗器械经营资质及初始跨店权限（前端演示状态实时同步）。"
        maxWidthClass="max-w-4xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              取消
            </Button>
            <Button variant="primary" onClick={handleSaveStore}>
              {editingStore ? '保存修改' : '确认新增门店'}
            </Button>
          </>
        }
      >
        <div className="space-y-6 text-[14px]">
          {formError && (
            <div className="px-4 py-2.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626]">
              {formError}
            </div>
          )}

          {/* Section 1: Basic Info */}
          <div className="space-y-3">
            <h3 className="text-[15px] font-semibold text-[#171916]">门店基础信息</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-[13px] text-[#5F645D] mb-1">门店名称 *</label>
                <input
                  type="text"
                  value={formState.name}
                  onChange={(e) => {
                    setFormState((p) => ({ ...p, name: e.target.value }));
                    if (formError) setFormError(null);
                  }}
                  placeholder="如：杭州城西银泰视光中心"
                  className="w-full h-10 px-3 rounded-[9px] bg-white border border-[#D9DDD4] text-[15px] outline-none focus:border-[#171916]"
                />
              </div>
              <div>
                <label className="block text-[13px] text-[#5F645D] mb-1">门店简称</label>
                <input
                  type="text"
                  value={formState.shortName}
                  onChange={(e) => setFormState((p) => ({ ...p, shortName: e.target.value }))}
                  placeholder="如：城西银泰店"
                  className="w-full h-10 px-3 rounded-[9px] bg-white border border-[#D9DDD4] text-[15px] outline-none focus:border-[#171916]"
                />
              </div>
              <div>
                <label className="block text-[13px] text-[#5F645D] mb-1">门店代号 *</label>
                <input
                  type="text"
                  value={formState.storeCode}
                  onChange={(e) => setFormState((p) => ({ ...p, storeCode: e.target.value }))}
                  placeholder="00004101"
                  className="w-full h-10 px-3 rounded-[9px] bg-white border border-[#D9DDD4] text-[15px] font-mono outline-none focus:border-[#171916]"
                />
              </div>

              <div>
                <label className="block text-[13px] text-[#5F645D] mb-1">门店类型 *</label>
                <Select
                  ariaLabel="门店类型"
                  variant="white"
                  value={formState.storeType}
                  onChange={(val) =>
                    setFormState((p) => ({ ...p, storeType: val as StoreType }))
                  }
                  options={[
                    { value: '总店', label: '总店' },
                    { value: '分店', label: '分店' },
                    { value: '加盟店', label: '加盟店' },
                    { value: '视光中心', label: '视光中心' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-[13px] text-[#5F645D] mb-1">归属总店</label>
                <Select
                  ariaLabel="归属总店"
                  variant="white"
                  disabled={formState.storeType === '总店'}
                  value={formState.parentStoreName}
                  onChange={(val) => setFormState((p) => ({ ...p, parentStoreName: val }))}
                  options={parentStoreOptions.map((n) => ({ value: n, label: n }))}
                />
              </div>

              <div>
                <label className="block text-[13px] text-[#5F645D] mb-1">区域归属</label>
                <Select
                  ariaLabel="区域归属"
                  variant="white"
                  value={formState.regionName}
                  onChange={(val) => setFormState((p) => ({ ...p, regionName: val }))}
                  options={REGION_OPTIONS.map((r) => ({ value: r, label: r }))}
                />
              </div>

              <div>
                <label className="block text-[13px] text-[#5F645D] mb-1">系统开户日期</label>
                <input
                  type="date"
                  value={formState.openedAt}
                  onChange={(e) => setFormState((p) => ({ ...p, openedAt: e.target.value }))}
                  className="w-full h-10 px-3 rounded-[9px] bg-white border border-[#D9DDD4] text-[15px] outline-none focus:border-[#171916]"
                />
              </div>

              <div>
                <label className="block text-[13px] text-[#5F645D] mb-1">系统到期日期</label>
                <input
                  type="date"
                  value={formState.expiresAt}
                  onChange={(e) => setFormState((p) => ({ ...p, expiresAt: e.target.value }))}
                  className="w-full h-10 px-3 rounded-[9px] bg-white border border-[#D9DDD4] text-[15px] outline-none focus:border-[#171916]"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Region & Contact */}
          <div className="pt-4 border-t border-[#171916]/[0.08] space-y-3">
            <h3 className="text-[15px] font-semibold text-[#171916]">地区与联系信息</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div>
                <label className="block text-[13px] text-[#5F645D] mb-1">省 *</label>
                <Select
                  ariaLabel="省"
                  variant="white"
                  value={formState.province}
                  onChange={(val) => {
                    const cities = PROVINCE_CITY_MAP[val] ?? ['其他'];
                    setFormState((p) => ({ ...p, province: val, city: cities[0] }));
                  }}
                  options={Object.keys(PROVINCE_CITY_MAP).map((prov) => ({
                    value: prov,
                    label: prov,
                  }))}
                />
              </div>
              <div>
                <label className="block text-[13px] text-[#5F645D] mb-1">市 *</label>
                <Select
                  ariaLabel="市"
                  variant="white"
                  value={formState.city}
                  onChange={(val) => setFormState((p) => ({ ...p, city: val }))}
                  options={(PROVINCE_CITY_MAP[formState.province] ?? [formState.city]).map((c) => ({
                    value: c,
                    label: c,
                  }))}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[13px] text-[#5F645D] mb-1">门店地址 *</label>
                <input
                  type="text"
                  value={formState.address}
                  onChange={(e) => {
                    setFormState((p) => ({ ...p, address: e.target.value }));
                    if (formError) setFormError(null);
                  }}
                  placeholder="如：浙江省杭州市西湖区丰潭路380号"
                  className="w-full h-10 px-3 rounded-[9px] bg-white border border-[#D9DDD4] text-[15px] outline-none focus:border-[#171916]"
                />
              </div>

              <div>
                <label className="block text-[13px] text-[#5F645D] mb-1">联系人 *</label>
                <input
                  type="text"
                  value={formState.contactName}
                  onChange={(e) => setFormState((p) => ({ ...p, contactName: e.target.value }))}
                  placeholder="店长或负责人姓名"
                  className="w-full h-10 px-3 rounded-[9px] bg-white border border-[#D9DDD4] text-[15px] outline-none focus:border-[#171916]"
                />
              </div>
              <div>
                <label className="block text-[13px] text-[#5F645D] mb-1">手机号码 *</label>
                <input
                  type="text"
                  value={formState.phone}
                  onChange={(e) => setFormState((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="手机号或门店座机"
                  className="w-full h-10 px-3 rounded-[9px] bg-white border border-[#D9DDD4] text-[15px] tabular-nums outline-none focus:border-[#171916]"
                />
              </div>
              <div>
                <label className="block text-[13px] text-[#5F645D] mb-1">微信</label>
                <input
                  type="text"
                  value={formState.wechat}
                  onChange={(e) => setFormState((p) => ({ ...p, wechat: e.target.value }))}
                  placeholder="选填"
                  className="w-full h-10 px-3 rounded-[9px] bg-white border border-[#D9DDD4] text-[15px] outline-none focus:border-[#171916]"
                />
              </div>
              <div>
                <label className="block text-[13px] text-[#5F645D] mb-1">QQ</label>
                <input
                  type="text"
                  value={formState.qq}
                  onChange={(e) => setFormState((p) => ({ ...p, qq: e.target.value }))}
                  placeholder="选填"
                  className="w-full h-10 px-3 rounded-[9px] bg-white border border-[#D9DDD4] text-[15px] outline-none focus:border-[#171916]"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Medical Device License */}
          <div className="pt-4 border-t border-[#171916]/[0.08] space-y-3">
            <h3 className="text-[15px] font-semibold text-[#171916]">医疗器械经营合规资质</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[13px] text-[#5F645D] mb-1">
                  医疗器械经营许可证号
                </label>
                <input
                  type="text"
                  value={formState.medicalLicenseNo}
                  onChange={(e) =>
                    setFormState((p) => ({ ...p, medicalLicenseNo: e.target.value }))
                  }
                  placeholder="如：浙杭械经营备20260001号"
                  className="w-full h-10 px-3 rounded-[9px] bg-white border border-[#D9DDD4] text-[15px] outline-none focus:border-[#171916]"
                />
              </div>
              <div>
                <label className="block text-[13px] text-[#5F645D] mb-1">
                  医疗器械经营许可证过期时间
                </label>
                <input
                  type="date"
                  value={formState.medicalLicenseExpiry}
                  onChange={(e) =>
                    setFormState((p) => ({ ...p, medicalLicenseExpiry: e.target.value }))
                  }
                  className="w-full h-10 px-3 rounded-[9px] bg-white border border-[#D9DDD4] text-[15px] outline-none focus:border-[#171916]"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Initial Permissions */}
          <div className="pt-4 border-t border-[#171916]/[0.08] space-y-3">
            <h3 className="text-[15px] font-semibold text-[#171916]">小程序展示与数据查看权限</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {PERMISSION_FIELDS.map((field) => {
                const enabled = formState.permissions[field.key];
                return (
                  <label
                    key={field.key}
                    className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                      enabled
                        ? 'bg-[var(--qsl-accent-soft-45)] border-[var(--qsl-accent-soft-border)]'
                        : 'bg-white/70 border-[#D9DDD4]'
                    }`}
                  >
                    <span className="text-[13px] font-medium text-[#171916]">{field.label}</span>
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) =>
                        setFormState((p) => ({
                          ...p,
                          permissions: {
                            ...p.permissions,
                            [field.key]: e.target.checked,
                          },
                        }))
                      }
                      className="accent-[#171916] w-4 h-4 cursor-pointer"
                    />
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal 2: Renew Subscription */}
      <Modal
        open={Boolean(renewTarget)}
        onClose={() => setRenewTarget(null)}
        title={`门店系统续费 · ${renewTarget?.name ?? ''}`}
        subtitle={`门店代号 ${renewTarget?.storeCode ?? ''} · 开户日期 ${renewTarget?.openedAt ?? ''}`}
        maxWidthClass="max-w-lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRenewTarget(null)}>
              取消
            </Button>
            <Button variant="primary" onClick={handleConfirmRenew}>
              确认续费并更新到期日
            </Button>
          </>
        }
      >
        {renewTarget && (
          <div className="space-y-4 text-[14px]">
            <div className="p-3.5 rounded-xl bg-white/75 border border-[#D9DDD4] flex items-center justify-between">
              <div>
                <div className="text-[13px] text-[#5F645D]">当前系统到期日</div>
                <div className="text-[18px] font-semibold text-[#171916] tabular-nums mt-0.5">
                  {renewTarget.expiresAt}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[13px] text-[#5F645D]">剩余天数</div>
                <div className="text-[18px] font-semibold text-[#171916] tabular-nums mt-0.5">
                  {getDaysRemaining(renewTarget.expiresAt) ?? '—'} 天
                </div>
              </div>
            </div>

            <div>
              <div className="text-[13px] text-[#5F645D] mb-2">快捷续费周期</div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: '+6个月', months: 6 },
                  { label: '+1年', months: 12 },
                  { label: '+2年', months: 24 },
                  { label: '+3年', months: 36 },
                ].map((opt) => (
                  <button
                    key={opt.months}
                    type="button"
                    onClick={() => {
                      setRenewMonths(opt.months);
                      setRenewCustomDate(addMonthsToDate(renewTarget.expiresAt, opt.months));
                    }}
                    className={`h-9 rounded-lg border text-[13px] font-medium cursor-pointer transition-colors ${
                      renewMonths === opt.months
                        ? 'bg-[#171916] text-white border-[#171916]'
                        : 'bg-white border-[#D9DDD4] text-[#171916] hover:border-[#171916]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[13px] text-[#5F645D] mb-1">
                续费后目标到期日期 *
              </label>
              <input
                type="date"
                value={renewCustomDate}
                onChange={(e) => {
                  setRenewMonths(0);
                  setRenewCustomDate(e.target.value);
                }}
                className="w-full h-10 px-3 rounded-[9px] bg-white border border-[#D9DDD4] text-[15px] tabular-nums outline-none focus:border-[#171916]"
              />
              {renewCustomDate && (
                <p className="text-[13px] text-[#166534] mt-1.5 tabular-nums">
                  续费后新有效期剩余：{getDaysRemaining(renewCustomDate) ?? '—'} 天
                </p>
              )}
            </div>

            <div>
              <label className="block text-[13px] text-[#5F645D] mb-1">续费备注（选填）</label>
              <input
                type="text"
                value={renewRemark}
                onChange={(e) => setRenewRemark(e.target.value)}
                placeholder="如：总部年度续约结算单号"
                className="w-full h-10 px-3 rounded-[9px] bg-white border border-[#D9DDD4] text-[14px] outline-none focus:border-[#171916]"
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Modal 3: Single Store Permissions */}
      <Modal
        open={Boolean(permTarget && singlePermDraft)}
        onClose={() => setPermTarget(null)}
        title={`门店权限设置 · ${permTarget?.name ?? ''}`}
        subtitle="配置该门店在小程序露出、跨店协同及盘点数据查看权限。"
        maxWidthClass="max-w-xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPermTarget(null)}>
              取消
            </Button>
            <Button variant="primary" onClick={handleConfirmSinglePermissions}>
              保存权限设置
            </Button>
          </>
        }
      >
        {singlePermDraft && (
          <div className="space-y-3">
            {PERMISSION_FIELDS.map((field) => {
              const active = singlePermDraft[field.key];
              return (
                <div
                  key={field.key}
                  className="p-3.5 rounded-xl bg-white/80 border border-[#D9DDD4] flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="text-[15px] font-semibold text-[#171916]">{field.label}</div>
                    <div className="text-[13px] text-[#5F645D] mt-0.5">{field.desc}</div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={active}
                    onClick={() =>
                      setSinglePermDraft((prev) =>
                        prev ? { ...prev, [field.key]: !prev[field.key] } : prev
                      )
                    }
                    className={`px-3 py-1.5 rounded-lg border text-[13px] font-semibold shrink-0 cursor-pointer transition-colors ${
                      active
                        ? 'bg-[var(--qsl-accent-soft)] border-[var(--qsl-accent-soft-border)] text-[#171916]'
                        : 'bg-[#F8F9F5] border-[#D9DDD4] text-[#5F645D]'
                    }`}
                  >
                    {active ? field.yesLabel : field.noLabel}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Modal>

      {/* Modal 4: Batch Edit Permissions */}
      <Modal
        open={batchPermOpen}
        onClose={() => setBatchPermOpen(false)}
        title={`批量修改门店权限 (${selectedIds.length} 家)`}
        subtitle="选择需要统一调整的权限项，未调整项可保持“保持不变”。"
        maxWidthClass="max-w-xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setBatchPermOpen(false)}>
              取消
            </Button>
            <Button variant="primary" onClick={handleConfirmBatchPermissions}>
              应用到所选 {selectedIds.length} 家门店
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {PERMISSION_FIELDS.map((field) => {
            const currentChoice = batchPermDraft[field.key];
            return (
              <div
                key={field.key}
                className="p-3.5 rounded-xl bg-white/80 border border-[#D9DDD4] flex flex-wrap items-center justify-between gap-3"
              >
                <div className="text-[14px] font-semibold text-[#171916]">{field.label}</div>
                <div className="inline-flex items-center p-0.5 rounded-lg bg-[#EAECE6] border border-[#D9DDD4]">
                  {(
                    [
                      { value: 'keep', label: '保持不变' },
                      { value: 'true', label: field.yesLabel },
                      { value: 'false', label: field.noLabel },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setBatchPermDraft((prev) => ({ ...prev, [field.key]: opt.value }))
                      }
                      className={`px-2.5 py-1 rounded-md text-[12px] font-medium cursor-pointer transition-colors ${
                        currentChoice === opt.value
                          ? 'bg-[#171916] text-white'
                          : 'text-[#5F645D] hover:text-[#171916]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Modal>

      {/* Modal 5: Store Operational Configuration */}
      <Modal
        open={Boolean(configTarget && configDraft)}
        onClose={() => setConfigTarget(null)}
        title={`门店业务配置 · ${configTarget?.name ?? ''}`}
        subtitle="配置门店默认出入库仓位、加工中心绑定及小程序预约承载参数。"
        maxWidthClass="max-w-2xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfigTarget(null)}>
              取消
            </Button>
            <Button variant="primary" onClick={handleConfirmConfig}>
              保存业务配置
            </Button>
          </>
        }
      >
        {configDraft && (
          <div className="space-y-4 text-[14px]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[13px] text-[#5F645D] mb-1">营业状态</label>
                <Select
                  ariaLabel="营业状态"
                  variant="white"
                  value={configDraft.operatingStatus}
                  onChange={(val) =>
                    setConfigDraft((p) =>
                      p ? { ...p, operatingStatus: val as StoreOperatingStatus } : p
                    )
                  }
                  options={[
                    { value: 'operating', label: '正常营业' },
                    { value: 'preparing', label: '筹备中' },
                    { value: 'disabled', label: '已停用' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-[13px] text-[#5F645D] mb-1">默认绑定门店仓</label>
                <Select
                  ariaLabel="默认绑定门店仓"
                  variant="white"
                  value={configDraft.defaultWarehouse}
                  onChange={(val) =>
                    setConfigDraft((p) => (p ? { ...p, defaultWarehouse: val } : p))
                  }
                  options={WAREHOUSE_OPTIONS.map((w) => ({ value: w, label: w }))}
                />
              </div>

              <div>
                <label className="block text-[13px] text-[#5F645D] mb-1">关联中央加工中心</label>
                <Select
                  ariaLabel="关联中央加工中心"
                  variant="white"
                  value={configDraft.processingCenter}
                  onChange={(val) =>
                    setConfigDraft((p) => (p ? { ...p, processingCenter: val } : p))
                  }
                  options={PROCESSING_CENTER_OPTIONS.map((c) => ({ value: c, label: c }))}
                />
              </div>

              <div>
                <label className="block text-[13px] text-[#5F645D] mb-1">毛坯片默认调出仓</label>
                <Select
                  ariaLabel="毛坯片默认调出仓"
                  variant="white"
                  value={configDraft.blankLensSourceWarehouse}
                  onChange={(val) =>
                    setConfigDraft((p) => (p ? { ...p, blankLensSourceWarehouse: val } : p))
                  }
                  options={WAREHOUSE_OPTIONS.map((w) => ({ value: w, label: w }))}
                />
              </div>

              <div>
                <label className="block text-[13px] text-[#5F645D] mb-1">门店营业时间</label>
                <input
                  type="text"
                  value={configDraft.businessHours}
                  onChange={(e) =>
                    setConfigDraft((p) => (p ? { ...p, businessHours: e.target.value } : p))
                  }
                  className="w-full h-10 px-3 rounded-[9px] bg-white border border-[#D9DDD4] text-[15px] outline-none focus:border-[#171916]"
                />
              </div>

              <div>
                <label className="block text-[13px] text-[#5F645D] mb-1">
                  单时段最大验光预约数
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={configDraft.appointmentSlotCapacity}
                  onChange={(e) =>
                    setConfigDraft((p) =>
                      p ? { ...p, appointmentSlotCapacity: Number(e.target.value) || 1 } : p
                    )
                  }
                  className="w-full h-10 px-3 rounded-[9px] bg-white border border-[#D9DDD4] text-[15px] tabular-nums outline-none focus:border-[#171916]"
                />
              </div>
            </div>

            <label className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-white/80 border border-[#D9DDD4] cursor-pointer">
              <div>
                <div className="text-[14px] font-semibold text-[#171916]">开启顾客在线预约</div>
                <div className="text-[13px] text-[#5F645D]">
                  关闭后，该门店仅支持线下到店登记，小程序不提供线上排班选时。
                </div>
              </div>
              <input
                type="checkbox"
                checked={configDraft.allowOnlineAppointment}
                onChange={(e) =>
                  setConfigDraft((p) =>
                    p ? { ...p, allowOnlineAppointment: e.target.checked } : p
                  )
                }
                className="accent-[#171916] w-4 h-4 cursor-pointer"
              />
            </label>

            <div>
              <label className="block text-[13px] text-[#5F645D] mb-1">门店小程序展示说明</label>
              <textarea
                rows={2}
                value={configDraft.miniProgramNotice}
                onChange={(e) =>
                  setConfigDraft((p) => (p ? { ...p, miniProgramNotice: e.target.value } : p))
                }
                className="w-full p-3 rounded-[9px] bg-white border border-[#D9DDD4] text-[14px] outline-none focus:border-[#171916]"
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Modal 6: Delete Confirmation */}
      <Modal
        open={deleteTargets.length > 0}
        onClose={() => setDeleteTargets([])}
        title={
          deleteTargets.length === 1
            ? `确认删除门店 · ${deleteTargets[0]?.name}`
            : `确认批量删除 ${deleteTargets.length} 家门店`
        }
        subtitle="危险操作二次确认：删除后该门店将从当前门店资料列表中移除。"
        maxWidthClass="max-w-md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTargets([])}>
              取消
            </Button>
            <Button variant="danger" onClick={handleConfirmDelete}>
              确认删除
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-[14px] text-[#171916]">
          <p>
            即将删除以下门店档案（当前为前端演示操作，后续接入服务端时需联动校验历史单据与仓库余额）：
          </p>
          <div className="max-h-40 overflow-y-auto qsl-scroll space-y-1.5">
            {deleteTargets.map((st) => (
              <div
                key={st.id}
                className="px-3 py-2 rounded-lg bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-between gap-2"
              >
                <span className="font-semibold">{st.name}</span>
                <span className="font-mono text-[12px] text-[#5F645D]">代号 {st.storeCode}</span>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
};
