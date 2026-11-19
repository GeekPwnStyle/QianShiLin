import React, { useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Download,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  Upload,
} from 'lucide-react';
import { useAuth } from '@/src/modules/auth/application/AuthContext';
import { STORE_CATALOG } from '@/src/modules/auth/domain/identity';
import {
  suppliersApi,
  type SupplierRecord,
  type SupplierWritePayload,
} from '@/src/modules/basic/suppliers/infrastructure/suppliersApi';
import {
  BatchAuthorizeModal,
  MergeSuppliersModal,
  SupplierInvitationModal,
  SupplierMoreModal,
} from '@/src/modules/basic/suppliers/ui/SupplierActionModals';
import { SupplierFormModal } from '@/src/modules/basic/suppliers/ui/SupplierFormModal';
import { Button } from '@/src/shared/ui/Button';
import { ConfirmDeleteModal } from '@/src/shared/ui/ConfirmDeleteModal';
import { HelpTooltip } from '@/src/shared/ui/HelpTooltip';
import { Modal } from '@/src/shared/ui/Modal';
import { OperationStatus } from '@/src/shared/ui/OperationStatus';
import { PaginationBar } from '@/src/shared/ui/PaginationBar';
import { Select } from '@/src/shared/ui/Select';
import { ErrorState, LoadingSkeleton } from '@/src/shared/ui/StateViews';

type ColumnKey =
  | 'name'
  | 'login_username'
  | 'contact'
  | 'phone'
  | 'is_default'
  | 'bound_franchise_stores'
  | 'sort_order'
  | 'scope'
  | 'province'
  | 'city'
  | 'district'
  | 'owner_store_type'
  | 'owner_store_name'
  | 'detail_address'
  | 'device_license_expires_on'
  | 'is_supply_chain'
  | 'enabled';

const ALL_COLUMNS: Array<{ key: ColumnKey; label: string; sortField?: string }> = [
  { key: 'name', label: '供应商', sortField: 'name' },
  { key: 'login_username', label: '登录账号 ID' },
  { key: 'contact', label: '联系人', sortField: 'contact' },
  { key: 'phone', label: '手机号', sortField: 'phone' },
  { key: 'is_default', label: '是否默认供应商' },
  { key: 'bound_franchise_stores', label: '绑定加盟批发门店' },
  { key: 'sort_order', label: '排序', sortField: 'sort_order' },
  { key: 'scope', label: '经营范围' },
  { key: 'province', label: '省份' },
  { key: 'city', label: '城市' },
  { key: 'district', label: '区县' },
  { key: 'owner_store_type', label: '归属门店类型' },
  { key: 'owner_store_name', label: '归属门店' },
  { key: 'detail_address', label: '详细地址' },
  {
    key: 'device_license_expires_on',
    label: '医疗器械经营许可证过期时间',
    sortField: 'device_license_expires_on',
  },
  { key: 'is_supply_chain', label: '供应链供应商' },
  { key: 'enabled', label: '是否启用' },
];

function csvCell(val: string): string {
  const safe = /^[=+\-@\t\r]/.test(val) ? `'${val}` : val;
  return `"${safe.replaceAll('"', '""')}"`;
}

function getLicenseExpiryTone(dateStr: string | null): 'normal' | 'warn' | 'expired' {
  if (!dateStr) return 'normal';
  const target = new Date(`${dateStr}T00:00:00`).getTime();
  if (!Number.isFinite(target)) return 'normal';
  const diffDays = (target - Date.now()) / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return 'expired';
  if (diffDays <= 90) return 'warn';
  return 'normal';
}

export const SupplierPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { session, debugMode } = useAuth();
  const canEdit = session.identityType === 'admin';
  const canEditBank = session.identityType === 'admin';

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [keywordInput, setKeywordInput] = useState('');
  const [search, setSearch] = useState('');
  const [filterEnabled, setFilterEnabled] = useState<'' | 'true' | 'false'>('');
  const [filterDefault, setFilterDefault] = useState<'' | 'true' | 'false'>('');
  const [filterSupplyChain, setFilterSupplyChain] = useState<'' | 'true' | 'false'>('');
  const [filterStoreId, setFilterStoreId] = useState('');
  const [sortField, setSortField] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [hiddenColumns, setHiddenColumns] = useState<ColumnKey[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingSupplier, setEditingSupplier] = useState<SupplierRecord | null>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [moreSupplier, setMoreSupplier] = useState<SupplierRecord | null>(null);
  const [batchAuthOpen, setBatchAuthOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [deletingSupplier, setDeletingSupplier] = useState<SupplierRecord | null>(null);

  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const query = useQuery({
    queryKey: [
      'catalog',
      'suppliers',
      page,
      pageSize,
      search,
      filterEnabled,
      filterDefault,
      filterSupplyChain,
      filterStoreId,
      sortField,
      sortOrder,
      debugMode,
    ],
    queryFn: () =>
      suppliersApi.list(
        {
          page,
          pageSize,
          search,
          enabled: filterEnabled,
          isDefault: filterDefault,
          isSupplyChain: filterSupplyChain,
          storeId: filterStoreId,
          sortField: sortField || undefined,
          sortOrder,
        },
        debugMode
      ),
  });

  const rows = query.data?.items ?? [];
  const total = query.data?.total ?? 0;

  const selectedSuppliers = useMemo(
    () => rows.filter((r) => selectedIds.includes(r.id)),
    [rows, selectedIds]
  );

  const visibleColumns = useMemo(
    () => ALL_COLUMNS.filter((c) => !hiddenColumns.includes(c.key)),
    [hiddenColumns]
  );

  const allCheckedOnPage =
    rows.length > 0 && rows.every((row) => selectedIds.includes(row.id));

  const invalidateAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['catalog', 'suppliers'] }),
      queryClient.invalidateQueries({ queryKey: ['system-users'] }),
      queryClient.invalidateQueries({ queryKey: ['product-meta'] }),
      queryClient.invalidateQueries({ queryKey: ['purchase-suppliers'] }),
      queryClient.invalidateQueries({ queryKey: ['manual-inbound-suppliers'] }),
    ]);
  };

  const toggleSort = (field?: string) => {
    if (!field) return;
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const handleToggleBoolean = async (
    row: SupplierRecord,
    field: 'is_default' | 'enabled'
  ) => {
    if (!canEdit || busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const nextVal = !row[field];
      await suppliersApi.update(row.id, { [field]: nextVal }, debugMode);
      await invalidateAll();
      setNotice({
        text:
          field === 'is_default'
            ? `已${nextVal ? '设为' : '取消'}默认供应商：${row.name}`
            : `已${nextVal ? '启用' : '停用'}供应商：${row.name}`,
      });
    } catch (err) {
      setNotice({ text: err instanceof Error ? err.message : '状态更新失败', error: true });
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingSupplier || busy) return;
    setBusy(true);
    setNotice(null);
    try {
      await suppliersApi.remove(deletingSupplier.id, debugMode);
      setSelectedIds((prev) => prev.filter((id) => id !== deletingSupplier.id));
      setDeletingSupplier(null);
      await invalidateAll();
      setNotice({ text: `已删除供应商「${deletingSupplier.name}」` });
    } catch (err) {
      setNotice({ text: err instanceof Error ? err.message : '删除失败', error: true });
    } finally {
      setBusy(false);
    }
  };

  const handleExport = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const collected: SupplierRecord[] = [];
      for (let current = 1; current <= 50; current++) {
        const res = await suppliersApi.list(
          {
            page: current,
            pageSize: 100,
            search,
            enabled: filterEnabled,
            isDefault: filterDefault,
            isSupplyChain: filterSupplyChain,
            storeId: filterStoreId,
          },
          debugMode
        );
        collected.push(...res.items);
        if (collected.length >= res.total || !res.items.length) break;
      }
      const headers = [
        '供应商名称',
        '登录账号 ID',
        '供应商别名',
        '联系人',
        '手机号',
        '是否默认供应商',
        '绑定加盟批发门店',
        '排序',
        '经营范围',
        '省份',
        '城市',
        '区县',
        '归属门店类型',
        '归属门店',
        '详细地址',
        '医疗器械经营许可证号',
        '医疗器械经营许可证过期时间',
        '供应链供应商',
        '是否启用',
      ];
      const csvRows = [
        headers.map(csvCell).join(','),
        ...collected.map((r) =>
          [
            r.name,
            r.login_username || '',
            r.alias || '',
            r.contact || '',
            r.phone || '',
            r.is_default ? '是' : '否',
            (r.bound_franchise_stores ?? []).join('、'),
            String(r.sort_order ?? 100),
            r.scope || '',
            r.province || '',
            r.city || '',
            r.district || '',
            r.owner_store_type || '总店',
            r.owner_store_name || '',
            r.detail_address || '',
            r.device_license_number || '',
            r.device_license_expires_on || '',
            r.is_supply_chain ? '启用' : '停用',
            r.enabled ? '启用' : '停用',
          ]
            .map((v) => csvCell(String(v)))
            .join(',')
        ),
      ];
      const url = URL.createObjectURL(
        new Blob(['\ufeff', csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8' })
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = '供应商资料.csv';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice({ text: `已导出 ${collected.length} 条供应商资料` });
    } catch (err) {
      setNotice({ text: err instanceof Error ? err.message : '导出失败', error: true });
    } finally {
      setBusy(false);
    }
  };

  const handleImportFile = async (file: File) => {
    if (file.size > 1024 * 1024) {
      setNotice({ text: 'CSV 文件不得超过 1MB', error: true });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const text = (await file.text()).replace(/^\ufeff/, '');
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) throw new Error('CSV 缺少表头或数据行');
      const parseLine = (line: string) => {
        const cols: string[] = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') {
              cur += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (ch === ',' && !inQuotes) {
            cols.push(cur.trim());
            cur = '';
          } else {
            cur += ch;
          }
        }
        cols.push(cur.trim());
        return cols;
      };
      const header = parseLine(lines[0]);
      const idx = (name: string) => header.findIndex((h) => h.includes(name));
      const nameIdx = idx('供应商');
      if (nameIdx < 0) throw new Error('未找到「供应商」列');
      const contactIdx = idx('联系人');
      const phoneIdx = idx('手机') >= 0 ? idx('手机') : idx('电话');
      const scopeIdx = idx('经营范围');
      const provinceIdx = idx('省');
      const cityIdx = idx('城');
      const districtIdx = idx('区');
      const addrIdx = idx('详细地址');

      let ok = 0;
      for (let i = 1; i < lines.length; i++) {
        const cols = parseLine(lines[i]);
        const supName = cols[nameIdx]?.trim();
        if (!supName) continue;
        const payload: SupplierWritePayload = {
          name: supName,
          contact: contactIdx >= 0 ? cols[contactIdx] || '' : '',
          phone: phoneIdx >= 0 ? cols[phoneIdx] || '' : '',
          scope: scopeIdx >= 0 ? cols[scopeIdx] || '' : '',
          province: provinceIdx >= 0 ? cols[provinceIdx] || '' : '',
          city: cityIdx >= 0 ? cols[cityIdx] || '' : '',
          district: districtIdx >= 0 ? cols[districtIdx] || '' : '',
          detail_address: addrIdx >= 0 ? cols[addrIdx] || '' : '',
          enabled: true,
        };
        await suppliersApi.create(payload, debugMode);
        ok++;
      }
      await invalidateAll();
      setNotice({ text: `成功导入 ${ok} 条供应商资料` });
    } catch (err) {
      setNotice({ text: err instanceof Error ? err.message : '导入失败', error: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {notice && (
        <OperationStatus role={notice.error ? 'alert' : 'status'}>{notice.text}</OperationStatus>
      )}
      {busy && <OperationStatus loading>正在处理供应商资料</OperationStatus>}

      <section className="overflow-hidden rounded-[20px] border border-[#E5E8E0] bg-white text-sm">
        {/* 顶部工具栏 */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#E5E8E0] p-3">
          {canEdit && (
            <>
              <Button
                variant="accent"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                disabled={busy}
                onClick={() => {
                  setFormMode('create');
                  setEditingSupplier(null);
                  setFormOpen(true);
                }}
              >
                新增
              </Button>
              <Button
                variant="accent"
                size="sm"
                disabled={busy}
                onClick={() => setInviteOpen(true)}
              >
                通过邀请码新增
              </Button>
            </>
          )}

          <span className="inline-flex items-center gap-1 px-1.5 text-xs font-medium text-[#2D6A4F]">
            <span>供应商说明</span>
            <HelpTooltip
              title="供应商说明"
              ariaLabel="供应商说明"
              content="1. 供应商资料已同步数据库，支持光学镜片/镜架/器械资质效期与银行账户管理（非管理员账号自动隐藏银行敏感字段）。2. 排序数值越小越靠前显示。3. 支持批量授权门店与重复供应商合并。"
            />
          </span>

          {canEdit && (
            <>
              <Button
                size="sm"
                disabled={!selectedIds.length || busy}
                onClick={() => setBatchAuthOpen(true)}
              >
                批量授权门店{selectedIds.length ? ` (${selectedIds.length})` : ''}
              </Button>
              <Button
                size="sm"
                disabled={selectedIds.length < 2 || busy}
                onClick={() => setMergeOpen(true)}
              >
                合并供应商
              </Button>
            </>
          )}

          <div className="ml-auto flex flex-wrap items-center gap-2">
            {canEdit && (
              <>
                <Button
                  size="sm"
                  icon={<Upload className="w-3.5 h-3.5" />}
                  disabled={busy}
                  onClick={() => importInputRef.current?.click()}
                >
                  导入
                </Button>
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleImportFile(file);
                    e.target.value = '';
                  }}
                />
              </>
            )}
            <Button
              size="sm"
              icon={<Download className="w-3.5 h-3.5" />}
              disabled={!total || busy}
              onClick={() => void handleExport()}
            >
              导出
            </Button>
            <div className="flex items-center">
              <input
                type="text"
                aria-label="模糊搜索"
                placeholder="模糊搜索"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setSearch(keywordInput.trim());
                    setPage(1);
                  }
                }}
                className="h-9 w-44 rounded-l-lg border border-r-0 border-[#D9DDD4] bg-white px-3 text-sm outline-none focus:border-[#171916]"
              />
              <button
                type="button"
                onClick={() => {
                  setSearch(keywordInput.trim());
                  setPage(1);
                }}
                className="inline-flex h-9 items-center gap-1 rounded-r-lg border border-[var(--qsl-accent-border)] bg-[var(--qsl-accent)] px-3 text-xs font-semibold text-[var(--qsl-accent-ink)] hover:bg-[var(--qsl-accent-hover)] cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                搜索
              </button>
            </div>
            <Button
              size="sm"
              icon={<SlidersHorizontal className="w-3.5 h-3.5" />}
              onClick={() => setFiltersOpen((p) => !p)}
            >
              筛选搜索
            </Button>
            <Button size="sm" onClick={() => setColumnsOpen((p) => !p)}>
              设置表头
            </Button>
          </div>
        </div>

        {/* 筛选展开区 */}
        {filtersOpen && (
          <div className="flex flex-wrap items-center gap-3 border-b border-[#E5E8E0] bg-[#FAFBF8] px-4 py-3">
            <Select
              variant="arc"
              ariaLabel="启用状态筛选"
              placeholder="全部启用状态"
              className="w-40"
              value={filterEnabled}
              onChange={(v) => {
                setFilterEnabled(v as '' | 'true' | 'false');
                setPage(1);
              }}
              options={[
                { value: '', label: '全部启用状态' },
                { value: 'true', label: '仅看已启用' },
                { value: 'false', label: '仅看已停用' },
              ]}
            />
            <Select
              variant="arc"
              ariaLabel="默认供应商筛选"
              placeholder="全部默认状态"
              className="w-40"
              value={filterDefault}
              onChange={(v) => {
                setFilterDefault(v as '' | 'true' | 'false');
                setPage(1);
              }}
              options={[
                { value: '', label: '全部默认状态' },
                { value: 'true', label: '仅默认供应商' },
                { value: 'false', label: '非默认供应商' },
              ]}
            />
            <Select
              variant="arc"
              ariaLabel="供应链筛选"
              placeholder="全部供应链类型"
              className="w-44"
              value={filterSupplyChain}
              onChange={(v) => {
                setFilterSupplyChain(v as '' | 'true' | 'false');
                setPage(1);
              }}
              options={[
                { value: '', label: '全部供应链类型' },
                { value: 'true', label: '供应链供应商' },
                { value: 'false', label: '普通供应商' },
              ]}
            />
            <Select
              variant="arc"
              ariaLabel="授权门店筛选"
              placeholder="全部授权门店"
              className="w-48"
              value={filterStoreId}
              onChange={(v) => {
                setFilterStoreId(v);
                setPage(1);
              }}
              options={[
                { value: '', label: '全部授权门店' },
                ...STORE_CATALOG.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
            {(filterEnabled || filterDefault || filterSupplyChain || filterStoreId || search) && (
              <Button
                size="sm"
                onClick={() => {
                  setFilterEnabled('');
                  setFilterDefault('');
                  setFilterSupplyChain('');
                  setFilterStoreId('');
                  setKeywordInput('');
                  setSearch('');
                  setPage(1);
                }}
              >
                重置筛选
              </Button>
            )}
          </div>
        )}

        {/* 设置表头展开区 */}
        {columnsOpen && (
          <div className="flex flex-wrap gap-3 border-b border-[#E5E8E0] bg-[#FAFBF8] px-4 py-3 text-xs">
            {ALL_COLUMNS.map((col) => (
              <label key={col.key} className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!hiddenColumns.includes(col.key)}
                  onChange={() =>
                    setHiddenColumns((prev) =>
                      prev.includes(col.key)
                        ? prev.filter((k) => k !== col.key)
                        : [...prev, col.key]
                    )
                  }
                />
                <span>{col.label}</span>
              </label>
            ))}
          </div>
        )}

        {/* 主表格 */}
        {query.isLoading ? (
          <div className="p-4">
            <LoadingSkeleton />
          </div>
        ) : query.isError ? (
          <div className="p-4">
            <ErrorState message={query.error.message} onRetry={() => query.refetch()} />
          </div>
        ) : (
          <div className="max-h-[66dvh] overflow-auto">
            <table className="w-full min-w-[1480px] text-left text-[13px]">
              <thead className="sticky top-0 z-10 bg-[#F5F7F2] text-[#4A4F47] border-b border-[#E5E8E0]">
                <tr>
                  <th className="w-12 px-2.5 py-2.5 text-center whitespace-nowrap">序号</th>
                  <th className="w-10 px-2 py-2.5 text-center">
                    <input
                      type="checkbox"
                      aria-label="选择本页全部供应商"
                      checked={allCheckedOnPage}
                      onChange={() =>
                        setSelectedIds((prev) =>
                          allCheckedOnPage
                            ? prev.filter((id) => !rows.some((r) => r.id === id))
                            : Array.from(new Set([...prev, ...rows.map((r) => r.id)]))
                        )
                      }
                    />
                  </th>
                  <th className="px-2.5 py-2.5 whitespace-nowrap">操作</th>
                  {visibleColumns.map((col) => (
                    <th key={col.key} className="px-2.5 py-2.5 whitespace-nowrap font-medium">
                      {col.sortField ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(col.sortField)}
                          className="inline-flex items-center gap-1 cursor-pointer hover:text-[#171916]"
                        >
                          <span>{col.label}</span>
                          {sortField === col.sortField && (
                            <span className="text-[11px]">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                          )}
                        </button>
                      ) : (
                        col.label
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={visibleColumns.length + 3} className="py-12 text-center text-[#73796F]">
                      暂无符合条件的供应商资料
                    </td>
                  </tr>
                ) : (
                  rows.map((row, index) => {
                    const rowNo = (page - 1) * pageSize + index + 1;
                    const expiryTone = getLicenseExpiryTone(row.device_license_expires_on);
                    return (
                      <tr
                        key={row.id}
                        className="border-t border-[#ECEFE7] even:bg-[#FAFBF8] hover:bg-[#F2F6EE] transition-colors"
                      >
                        <td className="px-2.5 py-2 text-center tabular-nums text-[#5F645D]">
                          {rowNo}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <input
                            type="checkbox"
                            aria-label={`选择 ${row.name}`}
                            checked={selectedIds.includes(row.id)}
                            onChange={() =>
                              setSelectedIds((prev) =>
                                prev.includes(row.id)
                                  ? prev.filter((id) => id !== row.id)
                                  : [...prev, row.id]
                              )
                            }
                          />
                        </td>
                        <td className="px-2.5 py-2 whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            {canEdit && (
                              <>
                                <button
                                  type="button"
                                  title="编辑"
                                  aria-label={`编辑 ${row.name}`}
                                  onClick={() => {
                                    setFormMode('edit');
                                    setEditingSupplier(row);
                                    setFormOpen(true);
                                  }}
                                  className="inline-flex h-6 w-6 items-center justify-center rounded border border-[var(--qsl-accent-border)] bg-[var(--qsl-accent)] text-[var(--qsl-accent-ink)] hover:bg-[var(--qsl-accent-hover)] cursor-pointer"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={row.login_username === 'supplier' || busy}
                                  title={
                                    row.login_username === 'supplier'
                                      ? '系统基准供应商账号（@supplier）受保护，请改为停用'
                                      : '删除'
                                  }
                                  aria-label={`删除 ${row.name}`}
                                  onClick={() => setDeletingSupplier(row)}
                                  className="inline-flex h-6 w-6 items-center justify-center rounded border border-red-200 bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => setMoreSupplier(row)}
                              className="inline-flex h-6 items-center rounded border border-[#B7E4C7] bg-[#ECFDF5] px-2 text-[11px] font-medium text-[#1B4332] hover:bg-[#D8F3DC] cursor-pointer"
                            >
                              更多
                            </button>
                          </div>
                        </td>

                        {visibleColumns.map((col) => {
                          if (col.key === 'name') {
                            return (
                              <td key={col.key} className="px-2.5 py-2 max-w-[220px]">
                                <div className="truncate font-medium text-[#171916]" title={row.name}>
                                  {row.name}
                                </div>
                              </td>
                            );
                          }
                          if (col.key === 'login_username') {
                            return (
                              <td key={col.key} className="px-2.5 py-2 whitespace-nowrap font-mono text-xs text-[#2D6A4F]">
                                {row.login_username ? (
                                  <span>
                                    @{row.login_username}
                                    {row.login_status === 'disabled' && (
                                      <span className="ml-1.5 font-sans text-[#9AA096]">· 已停用</span>
                                    )}
                                  </span>
                                ) : (
                                  '—'
                                )}
                              </td>
                            );
                          }
                          if (col.key === 'phone') {
                            return (
                              <td key={col.key} className="px-2.5 py-2 whitespace-nowrap tabular-nums">
                                {row.phone || '—'}
                              </td>
                            );
                          }
                          if (col.key === 'is_default') {
                            return (
                              <td key={col.key} className="px-2.5 py-2 whitespace-nowrap">
                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={row.is_default}
                                  disabled={!canEdit || busy}
                                  onClick={() => void handleToggleBoolean(row, 'is_default')}
                                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer disabled:opacity-50 ${
                                    row.is_default ? 'bg-[#2D6A4F]' : 'bg-[#C8CEC4]'
                                  }`}
                                >
                                  <span
                                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                      row.is_default ? 'translate-x-[18px]' : 'translate-x-[3px]'
                                    }`}
                                  />
                                </button>
                              </td>
                            );
                          }
                          if (col.key === 'bound_franchise_stores') {
                            const txt = (row.bound_franchise_stores ?? []).join('、');
                            return (
                              <td key={col.key} className="px-2.5 py-2 max-w-[160px] truncate" title={txt}>
                                {txt || '—'}
                              </td>
                            );
                          }
                          if (col.key === 'sort_order') {
                            return (
                              <td key={col.key} className="px-2.5 py-2 whitespace-nowrap tabular-nums">
                                {row.sort_order ?? 100}
                              </td>
                            );
                          }
                          if (col.key === 'scope') {
                            return (
                              <td key={col.key} className="px-2.5 py-2 max-w-[220px] truncate" title={row.scope}>
                                {row.scope || '—'}
                              </td>
                            );
                          }
                          if (col.key === 'detail_address') {
                            return (
                              <td key={col.key} className="px-2.5 py-2 max-w-[220px] truncate" title={row.detail_address}>
                                {row.detail_address || '—'}
                              </td>
                            );
                          }
                          if (col.key === 'device_license_expires_on') {
                            return (
                              <td key={col.key} className="px-2.5 py-2 whitespace-nowrap tabular-nums">
                                {row.device_license_expires_on ? (
                                  <span
                                    className={
                                      expiryTone === 'expired'
                                        ? 'text-red-600 font-medium'
                                        : expiryTone === 'warn'
                                          ? 'text-amber-700 font-medium'
                                          : 'text-[#171916]'
                                    }
                                  >
                                    {row.device_license_expires_on}
                                  </span>
                                ) : (
                                  '—'
                                )}
                              </td>
                            );
                          }
                          if (col.key === 'is_supply_chain') {
                            return (
                              <td key={col.key} className="px-2.5 py-2 whitespace-nowrap">
                                <span
                                  className={`text-xs font-medium ${
                                    row.is_supply_chain ? 'text-[#2D6A4F]' : 'text-[#73796F]'
                                  }`}
                                >
                                  {row.is_supply_chain ? '启用' : '停用'}
                                </span>
                              </td>
                            );
                          }
                          if (col.key === 'enabled') {
                            return (
                              <td key={col.key} className="px-2.5 py-2 whitespace-nowrap">
                                <button
                                  type="button"
                                  disabled={!canEdit || busy}
                                  onClick={() => void handleToggleBoolean(row, 'enabled')}
                                  className={`rounded-md border px-2.5 py-0.5 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 ${
                                    row.enabled
                                      ? 'border-[#86EFAC] bg-[#F0FDF4] text-[#16A34A] hover:bg-[#DCFCE7]'
                                      : 'border-[#D9DDD4] bg-[#F5F7F2] text-[#73796F] hover:bg-[#ECEFE7]'
                                  }`}
                                >
                                  {row.enabled ? '启用' : '停用'}
                                </button>
                              </td>
                            );
                          }

                          const rawVal = row[col.key];
                          const text = typeof rawVal === 'string' && rawVal ? rawVal : '—';
                          return (
                            <td key={col.key} className="px-2.5 py-2 whitespace-nowrap">
                              {text}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 底部分页 */}
        <PaginationBar
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(next) => {
            setPageSize(next);
            setPage(1);
          }}
          summaryExtra={<span>已选 {selectedIds.length} 条</span>}
        />
      </section>

      {/* 新增/编辑弹窗 */}
      <SupplierFormModal
        open={formOpen}
        mode={formMode}
        initialSupplier={editingSupplier}
        canEditBank={canEditBank}
        defaultStoreName={session.authorizedStores[0]?.name || '杭州西湖旗舰店'}
        debugMode={debugMode}
        onClose={() => setFormOpen(false)}
        onSaved={(saved, m) => {
          setFormOpen(false);
          const accountNote = saved.login_username ? `（登录账号 @${saved.login_username}）` : '';
          setNotice({ text: `${m === 'create' ? '已新增' : '已更新'}供应商「${saved.name}」${accountNote}` });
          void invalidateAll();
        }}
      />

      {/* 通过邀请码新增弹窗 */}
      <SupplierInvitationModal
        open={inviteOpen}
        debugMode={debugMode}
        onClose={() => setInviteOpen(false)}
        onSupplierAdded={() => {
          void invalidateAll();
        }}
      />

      {/* 更多弹窗 */}
      <SupplierMoreModal
        supplier={moreSupplier}
        canEdit={canEdit}
        debugMode={debugMode}
        onClose={() => setMoreSupplier(null)}
        onUpdated={() => {
          void invalidateAll();
        }}
      />

      {/* 批量授权门店弹窗 */}
      <BatchAuthorizeModal
        open={batchAuthOpen}
        selectedSuppliers={selectedSuppliers}
        debugMode={debugMode}
        onClose={() => setBatchAuthOpen(false)}
        onSuccess={(count) => {
          setBatchAuthOpen(false);
          setSelectedIds([]);
          setNotice({ text: `已为 ${count} 家供应商更新门店授权范围` });
          void invalidateAll();
        }}
      />

      {/* 合并供应商弹窗 */}
      <MergeSuppliersModal
        open={mergeOpen}
        selectedSuppliers={selectedSuppliers}
        debugMode={debugMode}
        onClose={() => setMergeOpen(false)}
        onSuccess={(mergedCount) => {
          setMergeOpen(false);
          setSelectedIds([]);
          setNotice({ text: `已合并清理 ${mergedCount} 条重复供应商记录` });
          void invalidateAll();
        }}
      />

      {/* 删除确认弹窗 */}
      <ConfirmDeleteModal
        open={Boolean(deletingSupplier)}
        title="确认删除供应商资料"
        subtitle="危险操作二次确认：删除后该供应商资料与关联账号将移除"
        description={
          <span>
            确定删除供应商「<strong>{deletingSupplier?.name}</strong>」吗？
          </span>
        }
        note="此操作不可撤销；若已存在历史单据关联建议改为停用。"
        items={
          deletingSupplier
            ? [
                {
                  id: deletingSupplier.id,
                  label: deletingSupplier.name,
                  meta: deletingSupplier.login_username
                    ? `@${deletingSupplier.login_username}`
                    : deletingSupplier.contact || undefined,
                },
              ]
            : undefined
        }
        loading={busy}
        onClose={() => setDeletingSupplier(null)}
        onConfirm={() => void handleDeleteConfirm()}
      />
    </div>
  );
};
