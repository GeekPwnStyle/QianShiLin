import React, { useCallback, useMemo, useState } from 'react';
import {
  Download,
  Eye,
  Pencil,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Trash2,
  Upload,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/src/modules/auth/application/AuthContext';
import {
  CUSTOMER_TIER_OPTIONS,
  customersApi,
  type CustomerProfile,
} from '@/src/modules/basic/customers/infrastructure/customersApi';
import { CustomerDetailModal } from '@/src/modules/basic/customers/ui/CustomerDetailModal';
import { CustomerFormModal } from '@/src/modules/basic/customers/ui/CustomerFormModal';
import { maskPhone } from '@/src/shared/lib/format';
import { ConfirmDeleteModal } from '@/src/shared/ui/ConfirmDeleteModal';
import { OperationStatus } from '@/src/shared/ui/OperationStatus';
import { PaginationBar } from '@/src/shared/ui/PaginationBar';
import { Select } from '@/src/shared/ui/Select';
import { ErrorState, TableLoadingOverlay, TableLoadingRows } from '@/src/shared/ui/StateViews';

type ToggleableColumnKey =
  | 'birthday'
  | 'ageGroup'
  | 'medicalIdNo'
  | 'relatedAccount'
  | 'source'
  | 'refundableAmount'
  | 'storedValueBalance'
  | 'pointsBalance'
  | 'address'
  | 'customerType'
  | 'wechatFollowed'
  | 'tags'
  | 'createdAt'
  | 'remark';

const TOGGLEABLE_COLUMNS: Array<{ key: ToggleableColumnKey; label: string }> = [
  { key: 'birthday', label: '生日' },
  { key: 'ageGroup', label: '年龄段' },
  { key: 'medicalIdNo', label: '医保/证件号' },
  { key: 'relatedAccount', label: '关联账号' },
  { key: 'source', label: '顾客来源' },
  { key: 'refundableAmount', label: '可退金额' },
  { key: 'storedValueBalance', label: '余额' },
  { key: 'pointsBalance', label: '积分' },
  { key: 'address', label: '地址' },
  { key: 'customerType', label: '类型' },
  { key: 'wechatFollowed', label: '是否关注公众号' },
  { key: 'tags', label: '标签' },
  { key: 'createdAt', label: '注册时间' },
  { key: 'remark', label: '备注' },
];

export const CustomerArchivePage: React.FC = () => {
  const queryClient = useQueryClient();
  const { session, currentRole, dataScope, debugMode, hasPermission } = useAuth();

  const [keyword, setKeyword] = useState('');
  const [store, setStore] = useState('all');
  const [gender, setGender] = useState('all');
  const [tier, setTier] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [extraFilters, setExtraFilters] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [hiddenColumns, setHiddenColumns] = useState<ToggleableColumnKey[]>([]);

  const [detailCustomer, setDetailCustomer] = useState<CustomerProfile | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingCustomer, setEditingCustomer] = useState<CustomerProfile | null>(null);

  const [batchBusy, setBatchBusy] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [statusNotice, setStatusNotice] = useState<{
    key: number;
    role: 'status' | 'alert';
    text: string;
  } | null>(null);

  const showToast = useCallback((text: string, role: 'status' | 'alert' = 'status') => {
    setStatusNotice({ key: Date.now(), role, text });
  }, []);

  const {
    data,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['customer-archive', session.userId, session.currentStoreId, debugMode],
    queryFn: () =>
      customersApi.list({ page: 1, pageSize: 500 }, dataScope, debugMode),
  });

  const {
    data: tagList = [],
    isFetching: tagsFetching,
    refetch: refetchTags,
  } = useQuery({
    queryKey: ['customer-tags', debugMode],
    queryFn: () => customersApi.listTags(debugMode),
  });

  const allowPlainPhone = Boolean(currentRole?.sensitiveFields.viewPlaintextPhone);

  const displayPhone = useCallback(
    (item: CustomerProfile) => {
      if (item.phoneMasked || item.phone.includes('****')) return item.phone;
      return maskPhone(item.phone, allowPlainPhone);
    },
    [allowPlainPhone]
  );

  const allItems = data?.items ?? [];

  const rows = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return allItems.filter((m) => {
      if (store !== 'all' && m.storeId !== store) return false;
      if (gender !== 'all' && m.gender !== gender) return false;
      if (tier !== 'all' && m.tier !== tier) return false;
      if (
        kw &&
        ![m.name, m.memberNo, m.phone, m.guideName, m.medicalIdNo, ...m.tags].some((v) =>
          v.toLowerCase().includes(kw)
        )
      ) {
        return false;
      }
      return true;
    });
  }, [allItems, store, gender, tier, keyword]);

  const [pageSize, setPageSize] = useState(20);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const shown = rows.slice((safePage - 1) * pageSize, safePage * pageSize);

  const canCreate = hasPermission('basic.customer.create') || hasPermission('basic.customer.read');
  const canUpdate = hasPermission('basic.customer.update') || hasPermission('basic.customer.read');
  const canDelete =
    hasPermission('basic.customer.delete') ||
    session.identityType === 'admin' ||
    session.subRole === 'store_manager';

  const defaultStoreId =
    session.currentStoreId !== 'all'
      ? session.currentStoreId
      : session.authorizedStores[0]?.id ?? 'store_hq_01';

  const isColVisible = (key: ToggleableColumnKey) => !hiddenColumns.includes(key);

  const toggleColumn = (key: ToggleableColumnKey) => {
    setHiddenColumns((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const openCreateModal = useCallback(() => {
    setModalMode('create');
    setEditingCustomer(null);
    setModalOpen(true);
  }, []);

  const openEditModal = useCallback((customer: CustomerProfile) => {
    setModalMode('edit');
    setEditingCustomer(customer);
    setModalOpen(true);
  }, []);

  const closeFormModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  const handleSaved = useCallback(
    (savedItem: CustomerProfile, action: 'close' | 'edit_more') => {
      void queryClient.invalidateQueries({ queryKey: ['customer-archive'] });
      void queryClient.invalidateQueries({ queryKey: ['members'] });

      if (action === 'edit_more') {
        setModalMode('edit');
        setEditingCustomer(savedItem);
        setModalOpen(true);
        showToast(`顾客「${savedItem.name}」已保存，可继续查看或编辑其他信息`);
        return;
      }

      setModalOpen(false);
      showToast(
        modalMode === 'create'
          ? `已新增顾客「${savedItem.name}」并存入数据库`
          : `顾客「${savedItem.name}」资料已更新`
      );
    },
    [modalMode, queryClient, showToast]
  );

  const handleBatchDelete = async () => {
    if (!selectedIds.length || !canDelete) return;
    setBatchBusy(true);
    try {
      const res = await customersApi.batchDelete(selectedIds, debugMode);
      setSelectedIds([]);
      setDeleteConfirmOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['customer-archive'] });
      showToast(`已删除 ${res.deletedCount} 条顾客资料`);
    } catch (error) {
      setDeleteConfirmOpen(false);
      showToast(error instanceof Error ? error.message : '批量删除失败', 'alert');
    } finally {
      setBatchBusy(false);
    }
  };

  const handleBatchVisit = async () => {
    if (!selectedIds.length || !canUpdate) return;
    setBatchBusy(true);
    try {
      const res = await customersApi.batchVisit(selectedIds, debugMode);
      setSelectedIds([]);
      await queryClient.invalidateQueries({ queryKey: ['customer-archive'] });
      showToast(`已更新 ${res.updatedCount} 位顾客到店时间为 ${res.visitDate}`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '更新到店时间失败', 'alert');
    } finally {
      setBatchBusy(false);
    }
  };

  const allShownSelected = shown.length > 0 && shown.every((m) => selectedIds.includes(m.id));
  const toggleSelectAllShown = () => {
    if (allShownSelected) {
      const shownSet = new Set(shown.map((m) => m.id));
      setSelectedIds((prev) => prev.filter((id) => !shownSet.has(id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...shown.map((m) => m.id)])]);
    }
  };

  const exportCsv = () => {
    const headers = [
      '姓名',
      '手机号',
      '性别',
      '生日',
      '年龄',
      '年龄段',
      '地址',
      '备注',
      '会员卡号',
      '会员等级',
      '医保/证件号',
      '标签',
      '注册门店',
      '导购绑定',
      '余额',
      '积分',
      '到店次数',
      '最近到店',
    ];
    const cells = rows.map((m) => [
      m.name,
      displayPhone(m),
      m.gender,
      m.birthday || '',
      String(m.age),
      m.ageGroup || '',
      m.address || '',
      m.remark || '',
      m.memberNo,
      m.tier,
      m.medicalIdNo || '',
      m.tags.join('、'),
      m.storeName,
      m.guideName,
      m.storedValueBalance,
      String(m.pointsBalance),
      String(m.visitCount),
      m.lastVisitDate,
    ]);
    const csv =
      '\ufeff' +
      [headers, ...cells]
        .map((row) => row.map((x) => `"${String(x).replaceAll('"', '""')}"`).join(','))
        .join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = '客户档案.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const downloadImportTemplate = () => {
    const headers = [
      '姓名',
      '手机号',
      '性别',
      '生日',
      '年龄',
      '年龄段',
      '地址',
      '备注',
      '会员卡号',
      '会员等级',
      '医保/证件号',
      '标签',
      '注册门店',
    ];
    const sample = [
      '张示例',
      '13800000001',
      '女',
      '1995-06-15',
      '31',
      '青年（18-35岁）',
      '杭州市西湖区文三路100号',
      '首次到店验光',
      '',
      '银卡会员',
      '',
      'VIP复购',
      session.authorizedStores[0]?.name ?? '杭州西湖旗舰店',
    ];
    const csv = '\ufeff' + [headers, sample].map((r) => r.map((c) => `"${c}"`).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = '客户档案导入模板.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const hasCustomerFilter = Boolean(keyword.trim() || store !== 'all' || gender !== 'all' || tier !== 'all');
  const toolbarBtn =
    'inline-flex items-center gap-1.5 rounded-lg border border-[#D9DDD4] bg-white px-3 py-1.5 font-medium text-[#171916] hover:bg-[#F5F7F2] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed';
  const primaryBtn =
    'inline-flex items-center gap-1.5 rounded-lg border border-[var(--qsl-accent-border)] bg-[var(--qsl-accent)] px-3 py-1.5 font-medium text-[var(--qsl-accent-ink)] hover:bg-[var(--qsl-accent-hover)] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed';
  const toolbarInput =
    'h-9 rounded-lg border border-[#D9DDD4] bg-white px-3 text-sm outline-none focus:border-[var(--qsl-accent-border)]';

  const visibleColCount = 12 + TOGGLEABLE_COLUMNS.filter((c) => isColVisible(c.key)).length;

  return (
    <div className="space-y-4">
      {statusNotice && (
        <OperationStatus key={statusNotice.key} role={statusNotice.role}>
          {statusNotice.text}
        </OperationStatus>
      )}

      <section className="overflow-hidden rounded-[20px] border border-[#D9DDD4] bg-white text-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-[#E5E8E0] p-3">
          <button
            type="button"
            onClick={openCreateModal}
            disabled={!canCreate}
            className={primaryBtn}
          >
            <Plus size={15} />
            新增
          </button>

          <button
            type="button"
            onClick={() => setDeleteConfirmOpen(true)}
            disabled={!selectedIds.length || !canDelete || batchBusy}
            className={`${toolbarBtn} text-red-700`}
          >
            <Trash2 size={14} />
            批量删除{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
          </button>

          <button
            type="button"
            onClick={() => void handleBatchVisit()}
            disabled={!selectedIds.length || !canUpdate || batchBusy}
            className={toolbarBtn}
          >
            更新到店时间
          </button>

          <button
            type="button"
            onClick={() => showToast('子账号家庭成员绑定将在后续版本开放，可先在编辑页记录「关联账号」')}
            className={toolbarBtn}
          >
            子账号操作
          </button>

          <button
            type="button"
            onClick={() => showToast('顾客合并需要服务端冲突校验，当前暂未开放')}
            className={toolbarBtn}
          >
            合并顾客资料
          </button>

          {debugMode && (
            <span className="rounded-md bg-[#F5F7F2] px-2 py-1 text-xs text-[#5F645D]">演示数据</span>
          )}

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button type="button" onClick={downloadImportTemplate} className={toolbarBtn}>
              <Download size={15} />
              模板
            </button>

            <button
              type="button"
              onClick={() => showToast('批量导入解析需完成字段映射校验，当前请点击「新增」录入')}
              className={toolbarBtn}
            >
              <Upload size={15} />
              导入
            </button>

            <button type="button" onClick={exportCsv} className={toolbarBtn}>
              <Download size={15} />
              导出
            </button>

            <input
              aria-label="搜索顾客"
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                setPage(1);
              }}
              placeholder="姓名 / 手机号 / 卡号 / 导购 / 标签"
              className={`${toolbarInput} w-52 min-w-0`}
            />

            <button
              type="button"
              onClick={() => setExtraFilters((v) => !v)}
              aria-expanded={extraFilters}
              className={`${toolbarBtn} ${extraFilters ? 'bg-[#F8F9F5] border-[#B9C1B3]' : ''}`}
            >
              筛选搜索
            </button>

            <button
              type="button"
              onClick={() => setColumnsOpen((v) => !v)}
              aria-expanded={columnsOpen}
              aria-controls="customer-header-options"
              className={`${toolbarBtn} ${columnsOpen ? 'bg-[#F8F9F5] border-[#B9C1B3]' : ''}`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              设置表头
            </button>
          </div>
        </div>

        {extraFilters && (
          <div className="flex flex-wrap items-center gap-2.5 border-b border-[#E5E8E0] bg-[#FAFBF8] p-3">
            <Select
              variant="compact"
              ariaLabel="筛选门店"
              placeholder="全部授权门店"
              className="w-48"
              buttonClassName="w-full rounded-full px-3.5 bg-white"
              value={store}
              onChange={(next) => {
                setStore(next);
                setPage(1);
              }}
              options={[
                { value: 'all', label: '全部授权门店' },
                ...session.authorizedStores.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
            <Select
              variant="compact"
              ariaLabel="筛选性别"
              placeholder="全部性别"
              className="w-36"
              buttonClassName="w-full rounded-full px-3.5 bg-white"
              value={gender}
              onChange={(next) => {
                setGender(next);
                setPage(1);
              }}
              options={[
                { value: 'all', label: '全部性别' },
                { value: '男', label: '男' },
                { value: '女', label: '女' },
              ]}
            />
            <Select
              variant="compact"
              ariaLabel="筛选会员等级"
              placeholder="全部等级"
              className="w-40"
              buttonClassName="w-full rounded-full px-3.5 bg-white"
              value={tier}
              onChange={(next) => {
                setTier(next);
                setPage(1);
              }}
              options={[
                { value: 'all', label: '全部等级' },
                ...CUSTOMER_TIER_OPTIONS.map((t) => ({ value: t, label: t })),
              ]}
            />
            {hasCustomerFilter && (
              <button
                type="button"
                onClick={() => {
                  setKeyword('');
                  setStore('all');
                  setGender('all');
                  setTier('all');
                  setPage(1);
                }}
                className="inline-flex h-8 items-center gap-1 rounded-full border border-[#D9DDD4] bg-white px-3 text-xs text-[#5F645D] hover:text-[#171916] cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                重置筛选
              </button>
            )}
          </div>
        )}

        {columnsOpen && (
          <div
            id="customer-header-options"
            className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[#E5E8E0] bg-[#F8F9F5] px-4 py-3"
          >
            {TOGGLEABLE_COLUMNS.map((col) => (
              <label
                key={col.key}
                className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap text-[13px] text-[#171916]"
              >
                <input
                  type="checkbox"
                  checked={isColVisible(col.key)}
                  onChange={() => toggleColumn(col.key)}
                  className="h-3.5 w-3.5 accent-[var(--qsl-accent)] border-0 outline-none focus:ring-0 cursor-pointer"
                />
                <span>{col.label}</span>
              </label>
            ))}
            <button
              type="button"
              onClick={() => setHiddenColumns([])}
              className="ml-auto cursor-pointer text-xs text-[#73796F] hover:text-[#171916]"
            >
              恢复默认
            </button>
          </div>
        )}

        {isError ? (
          <div className="p-5">
            <ErrorState onRetry={() => void refetch()} />
          </div>
        ) : (
          <>
            <div className="relative">
              <div className="overflow-x-auto qsl-scroll">
                <table className="w-full min-w-[1680px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[#E5E8E0] bg-[#F8F9F5]">
                      <th className="w-11 px-3.5 py-3 text-center sticky left-0 bg-[#F8F9F5] z-20 border-r border-[#E5E8E0]">
                        <input
                          type="checkbox"
                          aria-label="全选当前页"
                          checked={allShownSelected}
                          onChange={toggleSelectAllShown}
                          className="accent-[#171916] w-4 h-4 cursor-pointer"
                        />
                      </th>
                      <th className="px-3.5 py-3 text-[13px] font-semibold text-[#5F645D] whitespace-nowrap align-middle sticky left-11 z-20 bg-[#F8F9F5] border-r border-[#D9DDD4] shadow-[4px_0_12px_rgba(23,25,22,0.04)]">
                        操作
                      </th>
                      <th className="px-3.5 py-3 text-[13px] font-semibold text-[#5F645D] whitespace-nowrap align-middle border-r border-[#E5E8E0]">
                        顾客姓名
                      </th>
                      <th className="px-3.5 py-3 text-[13px] font-semibold text-[#5F645D] whitespace-nowrap align-middle border-r border-[#E5E8E0]">
                        手机号
                      </th>
                      <th className="px-3.5 py-3 text-[13px] font-semibold text-[#5F645D] whitespace-nowrap align-middle border-r border-[#E5E8E0]">
                        性别
                      </th>
                      {isColVisible('birthday') && (
                        <th className="px-3.5 py-3 text-[13px] font-semibold text-[#5F645D] whitespace-nowrap align-middle border-r border-[#E5E8E0]">
                          生日
                        </th>
                      )}
                      <th className="px-3.5 py-3 text-[13px] font-semibold text-[#5F645D] whitespace-nowrap align-middle border-r border-[#E5E8E0]">
                        年龄
                      </th>
                      {isColVisible('ageGroup') && (
                        <th className="px-3.5 py-3 text-[13px] font-semibold text-[#5F645D] whitespace-nowrap align-middle border-r border-[#E5E8E0]">
                          年龄段
                        </th>
                      )}
                      <th className="px-3.5 py-3 text-[13px] font-semibold text-[#5F645D] whitespace-nowrap align-middle border-r border-[#E5E8E0]">
                        会员等级
                      </th>
                      <th className="px-3.5 py-3 text-[13px] font-semibold text-[#5F645D] whitespace-nowrap align-middle border-r border-[#E5E8E0]">
                        会员卡号
                      </th>
                      {isColVisible('medicalIdNo') && (
                        <th className="px-3.5 py-3 text-[13px] font-semibold text-[#5F645D] whitespace-nowrap align-middle border-r border-[#E5E8E0]">
                          医保/证件号
                        </th>
                      )}
                      <th className="px-3.5 py-3 text-[13px] font-semibold text-[#5F645D] whitespace-nowrap align-middle border-r border-[#E5E8E0]">
                        注册门店
                      </th>
                      {isColVisible('relatedAccount') && (
                        <th className="px-3.5 py-3 text-[13px] font-semibold text-[#5F645D] whitespace-nowrap align-middle border-r border-[#E5E8E0]">
                          关联账号
                        </th>
                      )}
                      {isColVisible('source') && (
                        <th className="px-3.5 py-3 text-[13px] font-semibold text-[#5F645D] whitespace-nowrap align-middle border-r border-[#E5E8E0]">
                          顾客来源
                        </th>
                      )}
                      <th className="px-3.5 py-3 text-[13px] font-semibold text-[#5F645D] whitespace-nowrap align-middle border-r border-[#E5E8E0]">
                        导购绑定
                      </th>
                      {isColVisible('refundableAmount') && (
                        <th className="px-3.5 py-3 text-[13px] font-semibold text-[#5F645D] whitespace-nowrap align-middle border-r border-[#E5E8E0]">
                          可退金额
                        </th>
                      )}
                      {isColVisible('storedValueBalance') && (
                        <th className="px-3.5 py-3 text-[13px] font-semibold text-[#5F645D] whitespace-nowrap align-middle border-r border-[#E5E8E0]">
                          余额
                        </th>
                      )}
                      {isColVisible('pointsBalance') && (
                        <th className="px-3.5 py-3 text-[13px] font-semibold text-[#5F645D] whitespace-nowrap align-middle border-r border-[#E5E8E0]">
                          积分
                        </th>
                      )}
                      {isColVisible('address') && (
                        <th className="px-3.5 py-3 text-[13px] font-semibold text-[#5F645D] whitespace-nowrap align-middle border-r border-[#E5E8E0]">
                          地址
                        </th>
                      )}
                      {isColVisible('customerType') && (
                        <th className="px-3.5 py-3 text-[13px] font-semibold text-[#5F645D] whitespace-nowrap align-middle border-r border-[#E5E8E0]">
                          类型
                        </th>
                      )}
                      {isColVisible('wechatFollowed') && (
                        <th className="px-3.5 py-3 text-[13px] font-semibold text-[#5F645D] whitespace-nowrap align-middle border-r border-[#E5E8E0]">
                          是否关注公众号
                        </th>
                      )}
                      {isColVisible('tags') && (
                        <th className="px-3.5 py-3 text-[13px] font-semibold text-[#5F645D] whitespace-nowrap align-middle border-r border-[#E5E8E0]">
                          标签
                        </th>
                      )}
                      {isColVisible('createdAt') && (
                        <th className="px-3.5 py-3 text-[13px] font-semibold text-[#5F645D] whitespace-nowrap align-middle border-r border-[#E5E8E0]">
                          注册时间
                        </th>
                      )}
                      {isColVisible('remark') && (
                        <th className="px-3.5 py-3 text-[13px] font-semibold text-[#5F645D] whitespace-nowrap align-middle border-r border-[#E5E8E0]">
                          备注
                        </th>
                      )}
                      <th className="px-3.5 py-3 text-[13px] font-semibold text-[#5F645D] whitespace-nowrap align-middle border-r border-[#E5E8E0]">
                        到店次数
                      </th>
                      <th className="px-3.5 py-3 text-[13px] font-semibold text-[#5F645D] whitespace-nowrap align-middle">
                        最近到店
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E8E0]">
                    {isLoading && !shown.length ? (
                      <TableLoadingRows colSpan={visibleColCount} label="正在从数据库加载顾客档案…" />
                    ) : shown.length === 0 ? (
                      <tr>
                        <td colSpan={visibleColCount} className="px-4 py-12 text-center text-[#73796F]">
                          没有符合条件的顾客
                        </td>
                      </tr>
                    ) : (
                      shown.map((m, idx) => {
                        const checked = selectedIds.includes(m.id);
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
                            key={m.id}
                            className={`transition-colors hover:bg-[#F1F5EC] ${rowBg}`}
                          >
                            <td
                              className={`w-11 px-3.5 py-2.5 text-center sticky left-0 z-10 border-r border-[#E5E8E0] ${stickyCellBg}`}
                            >
                              <input
                                type="checkbox"
                                aria-label={`选择${m.name}`}
                                checked={checked}
                                onChange={() =>
                                  setSelectedIds((v) =>
                                    v.includes(m.id) ? v.filter((id) => id !== m.id) : [...v, m.id]
                                  )
                                }
                                className="accent-[#171916] w-4 h-4 cursor-pointer"
                              />
                            </td>
                            <td
                              className={`px-3.5 py-2.5 text-[14px] text-[#171916] whitespace-nowrap align-middle sticky left-11 z-10 border-r border-[#D9DDD4] shadow-[4px_0_12px_rgba(23,25,22,0.04)] ${stickyCellBg}`}
                            >
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  title="编辑顾客"
                                  aria-label={`编辑 ${m.name}`}
                                  disabled={!canUpdate}
                                  onClick={() => openEditModal(m)}
                                  className={`${primaryBtn} !px-2 !py-1`}
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  type="button"
                                  title="查看详情"
                                  aria-label={`查看 ${m.name} 详情`}
                                  onClick={() => setDetailCustomer(m)}
                                  className={`${toolbarBtn} !px-2 !py-1`}
                                >
                                  <Eye size={14} />
                                </button>
                              </div>
                            </td>
                            <td className="px-3.5 py-2.5 text-[14px] font-semibold text-[#171916] whitespace-nowrap align-middle border-r border-[#E5E8E0]">
                              <div className="flex items-center gap-2 whitespace-nowrap">
                                {m.avatarUrl ? (
                                  <img
                                    src={m.avatarUrl}
                                    alt={m.name}
                                    className="h-7 w-7 rounded-full object-cover border border-[#D9DDD4] shrink-0"
                                  />
                                ) : (
                                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--qsl-accent-soft-85)] text-xs font-bold text-[#171916]">
                                    {m.name.slice(0, 1)}
                                  </span>
                                )}
                                <span>{m.name}</span>
                              </div>
                            </td>
                            <td className="px-3.5 py-2.5 text-[14px] font-mono text-[#171916] whitespace-nowrap align-middle border-r border-[#E5E8E0]">
                              {displayPhone(m)}
                            </td>
                            <td className="px-3.5 py-2.5 text-[14px] text-[#171916] whitespace-nowrap align-middle border-r border-[#E5E8E0]">
                              {m.gender}
                            </td>
                            {isColVisible('birthday') && (
                              <td className="px-3.5 py-2.5 text-[14px] whitespace-nowrap align-middle font-mono text-[#5F645D] border-r border-[#E5E8E0]">
                                {m.birthday || '—'}
                              </td>
                            )}
                            <td className="px-3.5 py-2.5 text-[14px] text-[#171916] whitespace-nowrap align-middle tabular-nums border-r border-[#E5E8E0]">
                              {m.age} 岁
                            </td>
                            {isColVisible('ageGroup') && (
                              <td className="px-3.5 py-2.5 text-[14px] whitespace-nowrap align-middle text-[#5F645D] border-r border-[#E5E8E0]">
                                {m.ageGroup || '—'}
                              </td>
                            )}
                            <td className="px-3.5 py-2.5 text-[14px] whitespace-nowrap align-middle border-r border-[#E5E8E0]">
                              <span className="inline-flex items-center rounded-md bg-[#F4F6F0] px-2 py-0.5 text-xs font-medium text-[#171916]">
                                {m.tier}
                              </span>
                            </td>
                            <td className="px-3.5 py-2.5 text-[14px] text-[#171916] font-mono whitespace-nowrap align-middle border-r border-[#E5E8E0]">
                              {m.memberNo}
                            </td>
                            {isColVisible('medicalIdNo') && (
                              <td className="px-3.5 py-2.5 text-[14px] font-mono whitespace-nowrap align-middle text-[#5F645D] border-r border-[#E5E8E0]">
                                {m.medicalIdNo || '—'}
                              </td>
                            )}
                            <td className="px-3.5 py-2.5 text-[14px] text-[#171916] whitespace-nowrap align-middle border-r border-[#E5E8E0]">
                              {m.storeName}
                            </td>
                            {isColVisible('relatedAccount') && (
                              <td className="px-3.5 py-2.5 text-[14px] whitespace-nowrap align-middle text-[#5F645D] border-r border-[#E5E8E0]">
                                {m.relatedAccount || '—'}
                              </td>
                            )}
                            {isColVisible('source') && (
                              <td className="px-3.5 py-2.5 text-[14px] whitespace-nowrap align-middle text-[#5F645D] border-r border-[#E5E8E0]">
                                {m.source || '—'}
                              </td>
                            )}
                            <td className="px-3.5 py-2.5 text-[14px] text-[#171916] whitespace-nowrap align-middle border-r border-[#E5E8E0]">
                              {m.guideName || '—'}
                            </td>
                            {isColVisible('refundableAmount') && (
                              <td className="px-3.5 py-2.5 text-[14px] text-[#171916] whitespace-nowrap align-middle tabular-nums border-r border-[#E5E8E0]">
                                {m.refundableAmount}
                              </td>
                            )}
                            {isColVisible('storedValueBalance') && (
                              <td className="px-3.5 py-2.5 text-[14px] text-[#171916] whitespace-nowrap align-middle tabular-nums border-r border-[#E5E8E0]">
                                {m.storedValueBalance}
                              </td>
                            )}
                            {isColVisible('pointsBalance') && (
                              <td className="px-3.5 py-2.5 text-[14px] text-[#171916] whitespace-nowrap align-middle tabular-nums border-r border-[#E5E8E0]">
                                {m.pointsBalance}
                              </td>
                            )}
                            {isColVisible('address') && (
                              <td
                                className="px-3.5 py-2.5 text-[14px] max-w-[200px] truncate align-middle text-[#5F645D] border-r border-[#E5E8E0]"
                                title={m.address}
                              >
                                {m.address || '—'}
                              </td>
                            )}
                            {isColVisible('customerType') && (
                              <td className="px-3.5 py-2.5 text-[14px] whitespace-nowrap align-middle text-[#5F645D] border-r border-[#E5E8E0]">
                                {m.customerType || '—'}
                              </td>
                            )}
                            {isColVisible('wechatFollowed') && (
                              <td className="px-3.5 py-2.5 text-[14px] text-[#171916] whitespace-nowrap align-middle border-r border-[#E5E8E0]">
                                {m.wechatFollowed ? '已关注' : '未关注'}
                              </td>
                            )}
                            {isColVisible('tags') && (
                              <td className="px-3.5 py-2.5 text-[14px] whitespace-nowrap align-middle border-r border-[#E5E8E0]">
                                {m.tags.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {m.tags.map((t) => (
                                      <span
                                        key={t}
                                        className="inline-block rounded-md bg-[var(--qsl-accent-soft)] border border-[var(--qsl-accent-soft-border)] px-1.5 py-0.5 text-xs text-[#171916]"
                                      >
                                        {t}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-[#8A9086]">—</span>
                                )}
                              </td>
                            )}
                            {isColVisible('createdAt') && (
                              <td className="px-3.5 py-2.5 whitespace-nowrap align-middle font-mono text-xs text-[#5F645D] border-r border-[#E5E8E0]">
                                {m.createdAt ? m.createdAt.slice(0, 10) : '—'}
                              </td>
                            )}
                            {isColVisible('remark') && (
                              <td
                                className="px-3.5 py-2.5 text-[14px] max-w-[220px] truncate align-middle text-[#5F645D] border-r border-[#E5E8E0]"
                                title={m.remark}
                              >
                                {m.remark || '—'}
                              </td>
                            )}
                            <td className="px-3.5 py-2.5 text-[14px] text-[#171916] whitespace-nowrap align-middle tabular-nums border-r border-[#E5E8E0]">
                              {m.visitCount}
                            </td>
                            <td className="px-3.5 py-2.5 text-[14px] text-[#171916] whitespace-nowrap align-middle font-mono">
                              {m.lastVisitDate || '—'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {isFetching && shown.length > 0 && (
                <TableLoadingOverlay label="正在同步顾客档案…" />
              )}
            </div>

            <PaginationBar
              total={rows.length}
              page={safePage}
              pageSize={pageSize}
              unit="人"
              onPageChange={setPage}
              onPageSizeChange={(next) => {
                setPageSize(next);
                setPage(1);
              }}
              summaryExtra={
                <span className="text-xs text-[#73796F]">
                  可见 {data?.total ?? '—'} 人{data?.total !== rows.length && ` · 筛选 ${rows.length} 人`} · {debugMode ? '本地调试演示库' : '顾客档案库'}
                </span>
              }
            />
          </>
        )}
      </section>

      <CustomerDetailModal customer={detailCustomer} onClose={()=>setDetailCustomer(null)} debugMode={debugMode} />
      <CustomerFormModal
        open={modalOpen}
        mode={modalMode}
        initialCustomer={editingCustomer}
        authorizedStores={session.authorizedStores}
        defaultStoreId={defaultStoreId}
        defaultGuideName={session.displayName}
        debugMode={debugMode}
        tags={tagList}
        tagsFetching={tagsFetching}
        onRefreshTags={refetchTags}
        onClose={closeFormModal}
        onSaved={handleSaved}
      />
      <ConfirmDeleteModal
        open={deleteConfirmOpen}
        title={
          selectedIds.length === 1
            ? '确认删除顾客档案'
            : `确认批量删除 ${selectedIds.length} 条顾客档案`
        }
        subtitle="危险操作二次确认：删除后顾客资料将从数据库移除"
        description={
          <span>
            确定从数据库删除选中的 <strong>{selectedIds.length}</strong> 条顾客资料吗？
          </span>
        }
        note="此操作不可撤销；请确认所选顾客无需继续保留历史配镜及验光记录。"
        items={selectedIds.map((id) => {
          const customer = allItems.find((item) => item.id === id);
          return {
            id,
            label: customer?.name || id,
            meta: customer ? displayPhone(customer) : undefined,
          };
        })}
        loading={batchBusy}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={() => void handleBatchDelete()}
      />
    </div>
  );
};
