import React, { useCallback, useMemo, useState } from 'react';
import {
  Download,
  Plus,
  Search,
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
import { ErrorState, LoadingSkeleton } from '@/src/shared/ui/StateViews';

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

  return (
    <div className="space-y-5">
      {statusNotice && (
        <OperationStatus key={statusNotice.key} role={statusNotice.role}>
          {statusNotice.text}
        </OperationStatus>
      )}

      <header className="flex min-h-8 flex-wrap items-center gap-x-3 gap-y-1">
        <h1 className="text-lg font-semibold text-[#171916]">客户档案</h1>
        {debugMode && <span className="rounded-full bg-[#F2F4EF] px-2 py-0.5 text-xs text-[#5F645D]">演示数据</span>}
      </header>

      <div className="flex flex-wrap items-center gap-2 rounded-[20px] border border-[#D9DDD4] bg-white p-4 text-sm">
        <button
          type="button"
          onClick={openCreateModal}
          disabled={!canCreate}
          className="rounded-lg bg-[var(--qsl-accent)] text-[var(--qsl-accent-ink)] border border-[var(--qsl-accent-border)] hover:bg-[var(--qsl-accent-hover)] font-medium px-3 py-2 cursor-pointer transition-colors disabled:opacity-40"
        >
          <Plus className="mr-1 inline h-4 w-4" />
          新增
        </button>

        <button
          type="button"
          onClick={() => setDeleteConfirmOpen(true)}
          disabled={!selectedIds.length || !canDelete || batchBusy}
          className="rounded-lg bg-red-600 hover:bg-red-700 px-3 py-2 text-white disabled:opacity-40 cursor-pointer transition-colors inline-flex items-center gap-1"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>批量删除</span>
        </button>

        <button
          type="button"
          onClick={() => void handleBatchVisit()}
          disabled={!selectedIds.length || !canUpdate || batchBusy}
          className="rounded-lg bg-[var(--qsl-brand-dark)] hover:bg-[var(--qsl-brand-dark-hover)] px-3 py-2 text-white disabled:opacity-40 cursor-pointer transition-colors"
        >
          更新到店时间
        </button>

        <button
          type="button"
          onClick={() => showToast('子账号家庭成员绑定将在后续版本开放，可先在编辑页记录「关联账号」')}
          className="rounded-lg bg-[var(--qsl-brand-dark)] hover:bg-[var(--qsl-brand-dark-hover)] px-3 py-2 text-white cursor-pointer transition-colors"
        >
          子账号操作⌄
        </button>

        <button
          type="button"
          onClick={() => showToast('顾客合并需要服务端冲突校验，当前暂未开放')}
          className="rounded-lg bg-[var(--qsl-brand-dark)] hover:bg-[var(--qsl-brand-dark-hover)] px-3 py-2 text-white cursor-pointer transition-colors"
        >
          合并顾客资料
        </button>

        <span className="flex-1" />

        <button
          type="button"
          onClick={downloadImportTemplate}
          className="rounded-lg border border-[#D9DDD4] hover:border-[#171916] px-3 py-2 cursor-pointer transition-colors"
        >
          <Download className="mr-1 inline h-4 w-4" />
          导入模板下载
        </button>

        <button
          type="button"
          onClick={() => showToast('批量导入解析需完成字段映射校验，当前请点击「新增」录入')}
          className="rounded-lg border border-[#D9DDD4] hover:border-[#171916] px-3 py-2 cursor-pointer transition-colors"
        >
          <Upload className="mr-1 inline h-4 w-4" />
          导入
        </button>

        <button
          type="button"
          onClick={exportCsv}
          className="rounded-lg border border-[#D9DDD4] hover:border-[#171916] px-3 py-2 cursor-pointer transition-colors"
        >
          <Download className="mr-1 inline h-4 w-4" />
          导出
        </button>

        <button
          type="button"
          onClick={() => setExtraFilters((v) => !v)}
          className={`rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
            extraFilters
              ? 'border-[#171916] bg-[var(--qsl-accent-soft-55)] font-medium'
              : 'border-[#D9DDD4] hover:border-[#171916]'
          }`}
        >
          筛选搜索
        </button>

        <button
          type="button"
          onClick={() => setColumnsOpen((v) => !v)}
          className={`rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
            columnsOpen
              ? 'border-[#171916] bg-[var(--qsl-accent-soft-55)] font-medium'
              : 'border-[#D9DDD4] hover:border-[#171916]'
          }`}
        >
          设置表头
        </button>
      </div>

      {extraFilters && (
        <div className="rounded-xl border border-[#D9DDD4] bg-white px-4 py-3 text-sm text-[#5F645D]">
          支持按姓名、手机号、会员卡号、导购员、证件号以及标签关键词检索，并可叠加门店、性别和会员等级过滤。
        </div>
      )}

      {columnsOpen && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-[#D9DDD4] bg-white p-4 text-sm">
          <span className="font-medium text-[#171916]">显示列：</span>
          {TOGGLEABLE_COLUMNS.map((col) => (
            <label key={col.key} className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isColVisible(col.key)}
                onChange={() => toggleColumn(col.key)}
              />
              <span>{col.label}</span>
            </label>
          ))}
        </div>
      )}

      <section className="rounded-[24px] border border-[#D9DDD4] bg-white p-5">
        <div className="mb-4 flex items-center gap-2 font-semibold text-[#171916]">
          <SlidersHorizontal className="h-4 w-4" />
          筛选顾客
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <label className="relative md:col-span-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-[#73796F]" />
            <input
              aria-label="搜索顾客"
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                setPage(1);
              }}
              placeholder="姓名 / 手机号 / 卡号 / 导购 / 标签"
              className="h-10 w-full rounded-xl border border-[#D9DDD4] pl-9 pr-3 text-sm outline-none focus:border-[#171916]"
            />
          </label>
          <select
            aria-label="筛选门店"
            value={store}
            onChange={(e) => {
              setStore(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-xl border border-[#D9DDD4] px-3 text-sm outline-none focus:border-[#171916]"
          >
            <option value="all">全部授权门店</option>
            {session.authorizedStores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            aria-label="筛选性别"
            value={gender}
            onChange={(e) => {
              setGender(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-xl border border-[#D9DDD4] px-3 text-sm outline-none focus:border-[#171916]"
          >
            <option value="all">全部性别</option>
            <option value="男">男</option>
            <option value="女">女</option>
          </select>
          <select
            aria-label="筛选会员等级"
            value={tier}
            onChange={(e) => {
              setTier(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-xl border border-[#D9DDD4] px-3 text-sm outline-none focus:border-[#171916]"
          >
            <option value="all">全部等级</option>
            {CUSTOMER_TIER_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="overflow-hidden rounded-[24px] border border-[#D9DDD4] bg-white">
        <div className="flex items-center justify-between border-b border-[#E7EAE2] px-5 py-4">
          <h2 className="font-semibold text-[#171916]">顾客列表</h2>
          <span className="text-sm text-[#73796F]">
            共 {rows.length} 条 · 已勾选 {selectedIds.length} 条
          </span>
        </div>

        {isLoading ? (
          <div className="p-5">
            <LoadingSkeleton />
          </div>
        ) : isError ? (
          <div className="p-5">
            <ErrorState onRetry={() => void refetch()} />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto qsl-scroll">
              <table className="w-full min-w-[1680px] text-left text-sm">
                <thead className="bg-[#F8F9F5] text-[#5F645D]">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-3 font-medium">
                      <input
                        type="checkbox"
                        aria-label="全选当前页"
                        checked={allShownSelected}
                        onChange={toggleSelectAllShown}
                      />
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium">操作</th>
                    <th className="sticky left-0 z-10 bg-[#F8F9F5] whitespace-nowrap px-4 py-3 font-medium">
                      顾客姓名
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium">手机号</th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium">性别</th>
                    {isColVisible('birthday') && (
                      <th className="whitespace-nowrap px-4 py-3 font-medium">生日</th>
                    )}
                    <th className="whitespace-nowrap px-4 py-3 font-medium">年龄</th>
                    {isColVisible('ageGroup') && (
                      <th className="whitespace-nowrap px-4 py-3 font-medium">年龄段</th>
                    )}
                    <th className="whitespace-nowrap px-4 py-3 font-medium">会员等级</th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium">会员卡号</th>
                    {isColVisible('medicalIdNo') && (
                      <th className="whitespace-nowrap px-4 py-3 font-medium">医保/证件号</th>
                    )}
                    <th className="whitespace-nowrap px-4 py-3 font-medium">注册门店</th>
                    {isColVisible('relatedAccount') && (
                      <th className="whitespace-nowrap px-4 py-3 font-medium">关联账号</th>
                    )}
                    {isColVisible('source') && (
                      <th className="whitespace-nowrap px-4 py-3 font-medium">顾客来源</th>
                    )}
                    <th className="whitespace-nowrap px-4 py-3 font-medium">导购绑定</th>
                    {isColVisible('refundableAmount') && (
                      <th className="whitespace-nowrap px-4 py-3 font-medium">可退金额</th>
                    )}
                    {isColVisible('storedValueBalance') && (
                      <th className="whitespace-nowrap px-4 py-3 font-medium">余额</th>
                    )}
                    {isColVisible('pointsBalance') && (
                      <th className="whitespace-nowrap px-4 py-3 font-medium">积分</th>
                    )}
                    {isColVisible('address') && (
                      <th className="whitespace-nowrap px-4 py-3 font-medium">地址</th>
                    )}
                    {isColVisible('customerType') && (
                      <th className="whitespace-nowrap px-4 py-3 font-medium">类型</th>
                    )}
                    {isColVisible('wechatFollowed') && (
                      <th className="whitespace-nowrap px-4 py-3 font-medium">是否关注公众号</th>
                    )}
                    {isColVisible('tags') && (
                      <th className="whitespace-nowrap px-4 py-3 font-medium">标签</th>
                    )}
                    {isColVisible('createdAt') && (
                      <th className="whitespace-nowrap px-4 py-3 font-medium">注册时间</th>
                    )}
                    {isColVisible('remark') && (
                      <th className="whitespace-nowrap px-4 py-3 font-medium">备注</th>
                    )}
                    <th className="whitespace-nowrap px-4 py-3 font-medium">到店次数</th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium">最近到店</th>

                  </tr>
                </thead>
                <tbody>
                  {shown.map((m) => (
                    <tr key={m.id} className="border-t border-[#EEF0E9] hover:bg-[#FBFCF7]">
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          aria-label={`选择${m.name}`}
                          checked={selectedIds.includes(m.id)}
                          onChange={() =>
                            setSelectedIds((v) =>
                              v.includes(m.id) ? v.filter((id) => id !== m.id) : [...v, m.id]
                            )
                          }
                        />
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap"><button type="button" onClick={()=>setDetailCustomer(m)} className="rounded-lg border border-[var(--qsl-accent-border)] bg-[var(--qsl-accent)] px-3 py-1.5 text-xs font-semibold text-[var(--qsl-accent-ink)] transition-colors hover:bg-[var(--qsl-accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--qsl-accent-border)]">查看详情</button></td>
                      <td className="sticky left-0 bg-white px-4 py-3.5 font-semibold text-[#171916]">
                        <div className="flex items-center gap-2.5 whitespace-nowrap">
                          {m.avatarUrl ? (
                            <img
                              src={m.avatarUrl}
                              alt={m.name}
                              className="h-8 w-8 rounded-full object-cover border border-[#D9DDD4] shrink-0"
                            />
                          ) : (
                            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--qsl-accent-soft-85)] text-xs font-bold text-[#171916]">
                              {m.name.slice(0, 1)}
                            </span>
                          )}
                          <span>{m.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono whitespace-nowrap">{displayPhone(m)}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap">{m.gender}</td>
                      {isColVisible('birthday') && (
                        <td className="px-4 py-3.5 whitespace-nowrap font-mono text-[#5F645D]">
                          {m.birthday || '—'}
                        </td>
                      )}
                      <td className="px-4 py-3.5 whitespace-nowrap tabular-nums">{m.age} 岁</td>
                      {isColVisible('ageGroup') && (
                        <td className="px-4 py-3.5 whitespace-nowrap text-[#5F645D]">
                          {m.ageGroup || '—'}
                        </td>
                      )}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center rounded-md bg-[#F4F6F0] px-2 py-0.5 text-xs font-medium text-[#171916]">
                          {m.tier}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono whitespace-nowrap">{m.memberNo}</td>
                      {isColVisible('medicalIdNo') && (
                        <td className="px-4 py-3.5 font-mono whitespace-nowrap text-[#5F645D]">
                          {m.medicalIdNo || '—'}
                        </td>
                      )}
                      <td className="px-4 py-3.5 whitespace-nowrap">{m.storeName}</td>
                      {isColVisible('relatedAccount') && (
                        <td className="px-4 py-3.5 whitespace-nowrap text-[#5F645D]">
                          {m.relatedAccount || '—'}
                        </td>
                      )}
                      {isColVisible('source') && (
                        <td className="px-4 py-3.5 whitespace-nowrap text-[#5F645D]">
                          {m.source || '—'}
                        </td>
                      )}
                      <td className="px-4 py-3.5 whitespace-nowrap">{m.guideName || '—'}</td>
                      {isColVisible('refundableAmount') && (
                        <td className="px-4 py-3.5 whitespace-nowrap tabular-nums">
                          {m.refundableAmount}
                        </td>
                      )}
                      {isColVisible('storedValueBalance') && (
                        <td className="px-4 py-3.5 whitespace-nowrap tabular-nums">
                          {m.storedValueBalance}
                        </td>
                      )}
                      {isColVisible('pointsBalance') && (
                        <td className="px-4 py-3.5 whitespace-nowrap tabular-nums">
                          {m.pointsBalance}
                        </td>
                      )}
                      {isColVisible('address') && (
                        <td className="px-4 py-3.5 max-w-[200px] truncate text-[#5F645D]" title={m.address}>
                          {m.address || '—'}
                        </td>
                      )}
                      {isColVisible('customerType') && (
                        <td className="px-4 py-3.5 whitespace-nowrap text-[#5F645D]">
                          {m.customerType || '—'}
                        </td>
                      )}
                      {isColVisible('wechatFollowed') && (
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {m.wechatFollowed ? '已关注' : '未关注'}
                        </td>
                      )}
                      {isColVisible('tags') && (
                        <td className="px-4 py-3.5 whitespace-nowrap">
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
                        <td className="px-4 py-3.5 whitespace-nowrap font-mono text-xs text-[#5F645D]">
                          {m.createdAt ? m.createdAt.slice(0, 10) : '—'}
                        </td>
                      )}
                      {isColVisible('remark') && (
                        <td className="px-4 py-3.5 max-w-[220px] truncate text-[#5F645D]" title={m.remark}>
                          {m.remark || '—'}
                        </td>
                      )}
                      <td className="px-4 py-3.5 whitespace-nowrap tabular-nums">{m.visitCount}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap font-mono">
                        {m.lastVisitDate || '—'}
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length === 0 && (
                <div className="py-12 text-center text-[#73796F]">没有符合条件的顾客</div>
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
