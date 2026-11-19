import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Copy,
  Download,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Trash2,
  Unlock,
  Upload,
} from 'lucide-react';
import { useAuth } from '@/src/modules/auth/application/AuthContext';
import { parseCsv } from '@/src/modules/catalog/application/catalogCsv';
import { Button } from '@/src/shared/ui/Button';
import { ConfirmDeleteModal } from '@/src/shared/ui/ConfirmDeleteModal';
import { Modal } from '@/src/shared/ui/Modal';
import { OperationStatus } from '@/src/shared/ui/OperationStatus';
import { PaginationBar } from '@/src/shared/ui/PaginationBar';
import { Select } from '@/src/shared/ui/Select';
import { TableLoadingOverlay, TableLoadingRows } from '@/src/shared/ui/StateViews';

type Row = {
  id: string;
  store_id: string;
  name: string;
  sort_order: number;
  read_only?: boolean;
  version: number;
  category_id?: string;
  category_name?: string;
  cost_price?: string | null;
  retail_price?: string;
  enabled?: boolean;
  created_at?: string;
  item_count?: number;
};
type Result = { items: Row[]; total: number };
const base = `${import.meta.env.BASE_URL}api/pricing`;

async function api(path: string, method = 'GET', body?: unknown) {
  const r = await fetch(base + path, {
    method,
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || '请求失败');
  return data;
}

const input =
  'h-10 w-full rounded-xl border border-[#D9DDD4] bg-white px-3 text-sm outline-none focus:border-[var(--qsl-accent-border)]';
const toolbarBtn =
  'inline-flex items-center gap-1.5 rounded-lg border border-[#D9DDD4] bg-white px-3 py-1.5 font-medium text-[#171916] hover:bg-[#F5F7F2] disabled:opacity-40 cursor-pointer';
const primaryBtn =
  'inline-flex items-center gap-1.5 rounded-lg border border-[var(--qsl-accent-border)] bg-[var(--qsl-accent)] px-3 py-1.5 font-medium text-[var(--qsl-accent-ink)] hover:bg-[var(--qsl-accent-hover)] disabled:opacity-40 cursor-pointer';
const toolbarInput =
  'h-9 rounded-lg border border-[#D9DDD4] bg-white px-3 text-sm outline-none focus:border-[var(--qsl-accent-border)]';

type ColDef = {
  key: 'name' | 'category_name' | 'cost_price' | 'retail_price' | 'enabled' | 'read_only' | 'item_count' | 'sort_order';
  label: string;
  align?: 'left' | 'right' | 'center';
};

export function ServicePricingPage({ kind }: { kind: 'categories' | 'items' }) {
  const { session, debugMode, hasPermission } = useAuth();
  const qc = useQueryClient();
  const items = kind === 'items';
  const defaultStore = session.currentStoreId === 'all' ? '' : session.currentStoreId;
  const [store, setStore] = useState(defaultStore);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [category, setCategory] = useState('');
  const [enabled, setEnabled] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [hiddenCols, setHiddenCols] = useState<ColDef['key'][]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [editor, setEditor] = useState<Partial<Row> | null>(null);
  const [deleting, setDeleting] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const file = useRef<HTMLInputElement>(null);

  const canRead = hasPermission('basic.fee.read') && !debugMode;
  const canCreate = hasPermission('basic.fee.create');
  const canUpdate = hasPermission('basic.fee.update');
  const canDelete = hasPermission('basic.fee.delete');

  const allColumns = useMemo<ColDef[]>(
    () =>
      items
        ? [
            { key: 'name', label: '名称' },
            { key: 'category_name', label: '服务类别' },
            { key: 'cost_price', label: '进货价', align: 'right' },
            { key: 'retail_price', label: '零售价', align: 'right' },
            { key: 'enabled', label: '状态', align: 'center' },
            { key: 'sort_order', label: '排序', align: 'center' },
          ]
        : [
            { key: 'name', label: '名称' },
            { key: 'read_only', label: '保护状态', align: 'center' },
            { key: 'item_count', label: '项目数', align: 'center' },
            { key: 'sort_order', label: '排序', align: 'center' },
          ],
    [items]
  );

  const visibleColumns = useMemo(
    () => allColumns.filter((c) => !hiddenCols.includes(c.key)),
    [allColumns, hiddenCols]
  );

  const categories = useQuery<Row[]>({
    queryKey: ['pricing', 'categories-all', store],
    enabled: canRead,
    queryFn: async () => {
      const rows: Row[] = [];
      for (let p = 1; p <= 100; p++) {
        const r: Result = await api(
          '/categories?' + new URLSearchParams({ storeId: store, page: String(p), pageSize: '100' })
        );
        rows.push(...r.items);
        if (rows.length >= r.total) return rows;
      }
      throw new Error('类别过多，请缩小门店范围');
    },
  });

  const params = new URLSearchParams({
    storeId: store,
    page: String(page),
    pageSize: String(size),
    search,
    ...(items ? { categoryId: category, enabled } : {}),
  });

  const list = useQuery<Result>({
    queryKey: ['pricing', kind, store, page, size, search, category, enabled],
    enabled: canRead,
    queryFn: () => api('/' + kind + '?' + params),
  });

  useEffect(() => {
    setSelected([]);
  }, [kind, store, page, size, search, category, enabled]);

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ['pricing'] });
    setSelected([]);
  };

  const perform = async (fn: () => Promise<unknown>, success: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await fn();
      setEditor(null);
      setDeleting(null);
      setMessage({ text: success });
      await refresh();
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : '操作失败', error: true });
    } finally {
      setBusy(false);
    }
  };

  const open = (row?: Row, copy = false) => {
    setMessage(null);
    setEditor(
      row
        ? {
            ...row,
            ...(copy
              ? {
                  id: undefined,
                  version: undefined,
                  name: row.name + '（副本）',
                  read_only: false,
                }
              : {}),
          }
        : {
            store_id: store,
            name: '',
            sort_order: 1,
            read_only: false,
            category_id: category || categories.data?.[0]?.id || '',
            cost_price: '0.00',
            retail_price: '0.00',
            enabled: true,
          }
    );
  };

  const allRows = async () => {
    const rows: Row[] = [];
    for (let p = 1; p <= 100; p++) {
      const q = new URLSearchParams(params);
      q.set('page', String(p));
      q.set('pageSize', '100');
      const r: Result = await api('/' + kind + '?' + q);
      rows.push(...r.items);
      if (rows.length >= r.total) return rows;
    }
    throw new Error('单次导出最多10000条，请缩小筛选范围');
  };

  const csv = (rows: Row[]) => {
    const headers = items
      ? ['服务类别', '服务项目名称', '进货价', '零售价', '排序', '是否启用']
      : ['服务类别', '排序', '是否只读'];
    const quote = (x: unknown) => {
      let t = String(x ?? '');
      if (/^[=+\-@\t\r]/.test(t)) t = "'" + t;
      return '"' + t.replaceAll('"', '""') + '"';
    };
    const data = rows.map((r) =>
      items
        ? [r.category_name, r.name, r.cost_price, r.retail_price, r.sort_order, r.enabled ? '启用' : '禁用']
        : [r.name, r.sort_order, r.read_only ? '只读' : '可编辑']
    );
    const blob = new Blob(['\uFEFF', [headers, ...data].map((r) => r.map(quote).join(',')).join('\r\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (items ? '服务项目' : '服务类别') + '.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const importFile = async (f: File) => {
    setBusy(true);
    let saved = 0;
    try {
      if (f.size > 1024 * 1024) throw new Error('文件最大1MB');
      const rows = parseCsv(await f.text());
      const expected = items
        ? ['服务类别', '服务项目名称', '进货价', '零售价', '排序', '是否启用']
        : ['服务类别', '排序', '是否只读'];
      if (JSON.stringify(rows[0]) !== JSON.stringify(expected)) {
        throw new Error('表头不匹配，请先导出CSV作为模板');
      }
      if (rows.length < 2 || rows.length > 101) throw new Error('每次导入1～100条');
      for (const [i, r] of rows.slice(1).entries()) {
        let body: Partial<Row>;
        if (items) {
          const cat = categories.data?.find((c) => c.name === r[0]);
          if (!cat) throw new Error(`第${i + 2}行类别不存在，请先创建`);
          if (!['启用', '禁用'].includes(r[5])) throw new Error(`第${i + 2}行启用状态无效`);
          body = {
            store_id: store,
            name: r[1],
            category_id: cat.id,
            cost_price: r[2],
            retail_price: r[3],
            sort_order: Number(r[4]),
            enabled: r[5] === '启用',
          };
        } else {
          if (!['只读', '可编辑'].includes(r[2])) throw new Error(`第${i + 2}行只读状态无效`);
          body = {
            store_id: store,
            name: r[0],
            sort_order: Number(r[1]),
            read_only: r[2] === '只读',
          };
        }
        await api('/' + kind, 'POST', body);
        saved++;
      }
      setMessage({ text: `导入完成，共${saved}条` });
    } catch (e) {
      setMessage({
        text: `已保存${saved}条；${e instanceof Error ? e.message : '导入失败'}。已保存记录不会重复撤销，请修正剩余行后导入。`,
        error: true,
      });
    } finally {
      setBusy(false);
      await refresh();
    }
  };

  if (!canRead) {
    return (
      <div className="rounded-[20px] border border-[#D9DDD4] bg-white p-6 text-sm text-[#5F645D]">
        {debugMode ? '请使用真实账号登录，服务定价连接真实数据库。' : '没有服务定价查看权限。'}
      </div>
    );
  }

  const rows = list.data?.items || [];
  const allChecked = rows.length > 0 && rows.every((r) => selected.includes(r.id));
  const storeOptions =
    session.currentStoreId === 'all'
      ? [{ value: '', label: '全部授权门店' }, ...session.authorizedStores.map((s) => ({ value: s.id, label: s.name }))]
      : session.authorizedStores
          .filter((s) => s.id === session.currentStoreId)
          .map((s) => ({ value: s.id, label: s.name }));

  const hasFilterActive = Boolean(search) || Boolean(enabled) || (session.currentStoreId === 'all' && Boolean(store));

  return (
    <div className="space-y-4">
      {message && (
        <OperationStatus role={message.error ? 'alert' : 'status'}>{message.text}</OperationStatus>
      )}
      {(list.error || categories.error) && (
        <OperationStatus role="alert">{(list.error || categories.error)?.message}</OperationStatus>
      )}

      <div className={items ? 'grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)] items-start' : ''}>
        {items && (
          <aside className="rounded-[20px] border border-[#D9DDD4] bg-white p-3.5">
            <h3 className="mb-3 border-b border-[#E5E8E0] pb-2.5 text-sm font-semibold text-[#171916]">
              服务类别
            </h3>
            <div className="max-h-[540px] space-y-1 overflow-y-auto qsl-scroll">
              {[{ id: '', name: '全部服务类别' }, ...(categories.data || [])].map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => {
                    setCategory(c.id);
                    setPage(1);
                  }}
                  className={`block w-full rounded-lg px-3 py-2 text-left text-[13px] transition-colors cursor-pointer ${
                    category === c.id
                      ? 'bg-[var(--qsl-accent-soft)] text-[#171916] font-semibold'
                      : 'text-[#5F645D] hover:bg-[#F8F9F5] hover:text-[#171916]'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </aside>
        )}

        <section className="min-w-0 overflow-hidden rounded-[20px] border border-[#D9DDD4] bg-white text-sm">
          {/* Connected Toolbar */}
          <div className="flex flex-wrap items-center gap-2 border-b border-[#E5E8E0] p-3">
            {canCreate && (
              <button
                type="button"
                className={primaryBtn}
                disabled={busy || !store}
                onClick={() => open()}
              >
                <Plus size={15} />
                新增{items ? '项目' : '类别'}
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                className={toolbarBtn + ' text-red-700'}
                disabled={!selected.length || busy}
                onClick={() => setDeleting(selected)}
              >
                批量删除{selected.length ? ` (${selected.length})` : ''}
              </button>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#F5F7F2] px-2.5 py-1 text-xs text-[#5F645D]">
              <span>
                {items ? '服务项目' : '服务类别'} · 共 {list.data?.total || 0} 条
              </span>
              {session.authorizedStores.find((s) => s.id === store)?.name && (
                <span>· {session.authorizedStores.find((s) => s.id === store)?.name}</span>
              )}
            </span>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              {canCreate && (
                <>
                  <button
                    type="button"
                    className={toolbarBtn}
                    disabled={busy}
                    onClick={() => file.current?.click()}
                  >
                    <Upload size={15} />
                    导入
                  </button>
                  <input
                    ref={file}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = '';
                      if (f) void importFile(f);
                    }}
                  />
                </>
              )}
              <button
                type="button"
                className={toolbarBtn}
                disabled={busy}
                onClick={() =>
                  void perform(async () => csv(await allRows()), '已导出当前筛选结果')
                }
              >
                <Download size={15} />
                导出
              </button>
              <form
                className="flex items-center"
                onSubmit={(e) => {
                  e.preventDefault();
                  setSearch(draft.trim());
                  setPage(1);
                }}
              >
                <input
                  aria-label="搜索名称"
                  className={toolbarInput + ' w-44 rounded-r-none border-r-0'}
                  placeholder={items ? '搜索服务项目' : '搜索服务类别'}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <button
                  type="submit"
                  className="inline-flex h-9 items-center gap-1 rounded-r-lg border border-[var(--qsl-accent-border)] bg-[var(--qsl-accent)] px-3 font-medium text-[var(--qsl-accent-ink)] hover:bg-[var(--qsl-accent-hover)] cursor-pointer"
                >
                  <Search size={14} />
                  搜索
                </button>
              </form>
              <button
                type="button"
                aria-expanded={filtersOpen}
                className={`${toolbarBtn} ${filtersOpen ? 'bg-[#F8F9F5] border-[#B9C1B3]' : ''}`}
                onClick={() => setFiltersOpen((p) => !p)}
              >
                筛选搜索
              </button>
              <button
                type="button"
                aria-expanded={columnsOpen}
                aria-controls="pricing-header-options"
                className={`${toolbarBtn} ${columnsOpen ? 'bg-[#F8F9F5] border-[#B9C1B3]' : ''}`}
                onClick={() => setColumnsOpen((p) => !p)}
              >
                <SlidersHorizontal className="w-4 h-4" />
                设置表头
              </button>
              <button
                type="button"
                aria-label="刷新"
                title="刷新"
                className={toolbarBtn + ' !px-2.5'}
                onClick={() => void refresh()}
              >
                <RefreshCw className={`w-4 h-4 ${list.isFetching ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Filter Strip */}
          {filtersOpen && (
            <div className="flex flex-wrap items-center gap-2.5 border-b border-[#E5E8E0] bg-[#FAFBF8] p-3">
              <Select
                variant="compact"
                ariaLabel="所属门店"
                placeholder="所属门店"
                className="w-48"
                buttonClassName="w-full rounded-full px-3.5 bg-white"
                value={store}
                onChange={(v) => {
                  setStore(v);
                  setCategory('');
                  setPage(1);
                }}
                options={storeOptions}
              />
              {items && (
                <Select
                  variant="compact"
                  ariaLabel="启用状态"
                  placeholder="全部状态"
                  className="w-36"
                  buttonClassName="w-full rounded-full px-3.5 bg-white"
                  value={enabled}
                  onChange={(v) => {
                    setEnabled(v);
                    setPage(1);
                  }}
                  options={[
                    { value: '', label: '全部状态' },
                    { value: 'true', label: '启用' },
                    { value: 'false', label: '禁用' },
                  ]}
                />
              )}
              {hasFilterActive && (
                <button
                  type="button"
                  className={toolbarBtn}
                  onClick={() => {
                    setStore(defaultStore);
                    setCategory('');
                    setEnabled('');
                    setDraft('');
                    setSearch('');
                    setPage(1);
                  }}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  重置筛选
                </button>
              )}
            </div>
          )}

          {/* Header Options Strip */}
          {columnsOpen && (
            <div
              id="pricing-header-options"
              className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[#E5E8E0] bg-[#F8F9F5] px-4 py-3"
            >
              {allColumns.map((col) => (
                <label
                  key={col.key}
                  className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap text-[13px] text-[#171916]"
                >
                  <input
                    type="checkbox"
                    checked={!hiddenCols.includes(col.key)}
                    onChange={() =>
                      setHiddenCols((prev) =>
                        prev.includes(col.key)
                          ? prev.filter((k) => k !== col.key)
                          : [...prev, col.key]
                      )
                    }
                    className="h-3.5 w-3.5 accent-[var(--qsl-accent)] border-0 outline-none focus:ring-0 cursor-pointer"
                  />
                  <span>{col.label}</span>
                </label>
              ))}
              <button
                type="button"
                onClick={() => setHiddenCols([])}
                className="ml-auto cursor-pointer text-xs text-[#73796F] hover:text-[#171916]"
              >
                恢复默认
              </button>
            </div>
          )}

          {/* Table */}
          <div className="relative">
            <div className="overflow-x-auto qsl-scroll">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#E5E8E0] bg-[#F8F9F5]">
                    <th className="w-11 px-3.5 py-3 text-center sticky left-0 bg-[#F8F9F5] z-20 border-r border-[#E5E8E0]">
                      <input
                        type="checkbox"
                        aria-label="选择本页全部"
                        checked={allChecked}
                        onChange={(e) =>
                          setSelected(e.target.checked ? rows.map((r) => r.id) : [])
                        }
                        className="accent-[#171916] w-4 h-4 cursor-pointer"
                      />
                    </th>
                    <th className="px-3.5 py-3 text-[13px] font-semibold text-[#5F645D] whitespace-nowrap align-middle sticky left-11 z-20 bg-[#F8F9F5] border-r border-[#D9DDD4] shadow-[4px_0_12px_rgba(23,25,22,0.04)]">
                      操作
                    </th>
                    {visibleColumns.map((col) => (
                      <th
                        key={col.key}
                        className={`px-3.5 py-3 text-[13px] font-semibold text-[#5F645D] whitespace-nowrap align-middle border-r border-[#E5E8E0] last:border-r-0 ${
                          col.align === 'right'
                            ? 'text-right'
                            : col.align === 'center'
                              ? 'text-center'
                              : 'text-left'
                        }`}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E8E0]">
                  {(list.isLoading || list.isFetching) && !rows.length ? (
                    <TableLoadingRows
                      colSpan={visibleColumns.length + 2}
                      label={`正在从数据库加载${items ? '服务项目' : '服务类别'}…`}
                    />
                  ) : !rows.length ? (
                    <tr>
                      <td colSpan={visibleColumns.length + 2} className="px-4 py-12 text-center text-[#73796F]">
                        暂无记录，可新增或导入服务资料
                      </td>
                    </tr>
                  ) : (
                    rows.map((r, idx) => {
                      const checked = selected.includes(r.id);
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
                        <tr key={r.id} className={`transition-colors hover:bg-[#F1F5EC] ${rowBg}`}>
                          <td
                            className={`w-11 px-3.5 py-2.5 text-center sticky left-0 z-10 border-r border-[#E5E8E0] ${stickyCellBg}`}
                          >
                            <input
                              type="checkbox"
                              aria-label={`选择${r.name}`}
                              checked={checked}
                              onChange={(e) =>
                                setSelected(
                                  e.target.checked
                                    ? [...selected, r.id]
                                    : selected.filter((x) => x !== r.id)
                                )
                              }
                              className="accent-[#171916] w-4 h-4 cursor-pointer"
                            />
                          </td>
                          <td
                            className={`px-3.5 py-2.5 text-[14px] text-[#171916] whitespace-nowrap align-middle sticky left-11 z-10 border-r border-[#D9DDD4] shadow-[4px_0_12px_rgba(23,25,22,0.04)] ${stickyCellBg}`}
                          >
                            <div className="inline-flex items-center gap-1.5">
                              {canUpdate && (!r.read_only || items) && (
                                <button
                                  type="button"
                                  disabled={busy}
                                  title="编辑"
                                  aria-label={`编辑${r.name}`}
                                  onClick={() => open(r)}
                                  className={primaryBtn + ' !px-2 !py-1'}
                                >
                                  <Pencil size={14} />
                                </button>
                              )}
                              {canCreate && (
                                <button
                                  type="button"
                                  disabled={busy}
                                  title="复制"
                                  aria-label={`复制${r.name}`}
                                  onClick={() => open(r, true)}
                                  className={toolbarBtn + ' !px-2 !py-1'}
                                >
                                  <Copy size={14} />
                                </button>
                              )}
                              {!items && r.read_only && canUpdate && session.identityType === 'admin' && (
                                <button
                                  type="button"
                                  disabled={busy}
                                  title="解除只读"
                                  aria-label={`解除${r.name}只读`}
                                  onClick={() =>
                                    void perform(
                                      () => api('/categories/unlock', 'POST', { id: r.id, version: r.version }),
                                      '已解除只读'
                                    )
                                  }
                                  className={toolbarBtn + ' !px-2 !py-1'}
                                >
                                  <Unlock size={14} />
                                </button>
                              )}
                              {canDelete && !r.read_only && (
                                <button
                                  type="button"
                                  disabled={busy}
                                  title="删除"
                                  aria-label={`删除${r.name}`}
                                  onClick={() => setDeleting([r.id])}
                                  className={toolbarBtn + ' !px-2 !py-1 text-red-700'}
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                          {visibleColumns.map((col) => {
                            const tdBase =
                              'px-3.5 py-2.5 text-[14px] text-[#171916] whitespace-nowrap align-middle border-r border-[#E5E8E0] last:border-r-0';
                            if (col.key === 'name') {
                              return (
                                <td key={col.key} className={`${tdBase} max-w-[280px] truncate font-medium`} title={r.name}>
                                  {r.name}
                                </td>
                              );
                            }
                            if (col.key === 'category_name') {
                              return (
                                <td key={col.key} className={tdBase}>
                                  {r.category_name || '-'}
                                </td>
                              );
                            }
                            if (col.key === 'cost_price') {
                              return (
                                <td key={col.key} className={`${tdBase} text-right tabular-nums`}>
                                  {r.cost_price === null ? '无权限' : Number(r.cost_price).toFixed(2)}
                                </td>
                              );
                            }
                            if (col.key === 'retail_price') {
                              return (
                                <td key={col.key} className={`${tdBase} text-right tabular-nums`}>
                                  {Number(r.retail_price).toFixed(2)}
                                </td>
                              );
                            }
                            if (col.key === 'enabled') {
                              return (
                                <td key={col.key} className={`${tdBase} text-center`}>
                                  <span
                                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                      r.enabled
                                        ? 'bg-[var(--qsl-nav-active-bg)] text-[var(--qsl-nav-active-ink)]'
                                        : 'bg-[#F0F1EE] text-[#73796F]'
                                    }`}
                                  >
                                    {r.enabled ? '启用' : '禁用'}
                                  </span>
                                </td>
                              );
                            }
                            if (col.key === 'read_only') {
                              return (
                                <td key={col.key} className={`${tdBase} text-center`}>
                                  {r.read_only ? '只读' : '可编辑'}
                                </td>
                              );
                            }
                            if (col.key === 'item_count') {
                              return (
                                <td key={col.key} className={`${tdBase} text-center tabular-nums`}>
                                  {r.item_count}
                                </td>
                              );
                            }
                            return (
                              <td key={col.key} className={`${tdBase} text-center tabular-nums`}>
                                {r.sort_order}
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
            {list.isFetching && rows.length > 0 && (
              <TableLoadingOverlay label={`正在同步${items ? '服务项目' : '服务类别'}…`} />
            )}
          </div>

          <PaginationBar
            total={list.data?.total || 0}
            page={page}
            pageSize={size}
            onPageChange={setPage}
            onPageSizeChange={(v) => {
              setSize(v);
              setPage(1);
            }}
            summaryExtra={<span>已选 {selected.length} 条</span>}
          />
        </section>
      </div>

      <Modal
        open={!!editor}
        onClose={() => {
          if (!busy) setEditor(null);
        }}
        title={`${editor?.id ? '编辑' : '新增'}${items ? '服务项目' : '服务类别'}`}
        subtitle="保存至当前门店，名称不可重复"
        maxWidthClass="max-w-xl"
      >
        {editor && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void perform(
                () => api('/' + kind + (editor.id ? '/' + editor.id : ''), editor.id ? 'PATCH' : 'POST', editor),
                '已保存'
              );
            }}
          >
            {items && (
              <label className="block space-y-1.5 text-sm">
                <span>服务类别 *</span>
                <Select
                  ariaLabel="服务类别"
                  value={editor.category_id || ''}
                  onChange={(v) => setEditor({ ...editor, category_id: v })}
                  options={(categories.data || []).map((c) => ({ value: c.id, label: c.name }))}
                />
              </label>
            )}
            <label className="block space-y-1.5 text-sm">
              <span>{items ? '服务项目名称' : '服务类别名称'} *</span>
              <input
                className={input}
                required
                maxLength={items ? 180 : 120}
                value={editor.name || ''}
                onChange={(e) => setEditor({ ...editor, name: e.target.value })}
              />
            </label>
            <div className={`grid gap-3 ${items ? 'sm:grid-cols-3' : ''}`}>
              {items && (
                <>
                  {(['cost_price', 'retail_price'] as const).map((key, i) => (
                    <label key={key} className="space-y-1.5 text-sm">
                      <span>{i ? '零售价' : '进货价'}（元） *</span>
                      <input
                        className={input}
                        type="number"
                        required
                        min="0"
                        max="9999999999.99"
                        step="0.01"
                        value={editor[key] ?? ''}
                        onChange={(e) => setEditor({ ...editor, [key]: e.target.value })}
                      />
                    </label>
                  ))}
                </>
              )}
              <label className="space-y-1.5 text-sm">
                <span>排序 *</span>
                <input
                  className={input}
                  required
                  type="number"
                  min="0"
                  max="999999"
                  step="1"
                  value={editor.sort_order ?? 1}
                  onChange={(e) => setEditor({ ...editor, sort_order: Number(e.target.value) })}
                />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={items ? !!editor.enabled : !!editor.read_only}
                onChange={(e) =>
                  setEditor({ ...editor, [items ? 'enabled' : 'read_only']: e.target.checked })
                }
              />
              {items ? '启用此服务项目' : '设为只读（编辑或删除前须管理员解除）'}
            </label>
            {message && message.error && (
              <p role="alert" className="text-sm text-red-700">
                {message.text}
              </p>
            )}
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button disabled={busy} onClick={() => setEditor(null)}>
                取消
              </Button>
              <Button type="submit" variant="accent" loading={busy}>
                保存
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDeleteModal
        open={!!deleting}
        title="确认删除服务收费记录"
        subtitle="危险操作二次确认：删除后将从数据库移除"
        description={
          <span>
            确定删除选中的 <strong>{deleting?.length ?? 0}</strong> 条记录吗？
          </span>
        }
        note="类别下仍有项目或包含只读类别时，整批操作会被拒绝。"
        items={(deleting ?? []).map((id) => ({
          id,
          label: rows.find((r) => r.id === id)?.name || id,
        }))}
        loading={busy}
        error={message?.error ? message.text : undefined}
        onClose={() => setDeleting(null)}
        onConfirm={() =>
          void perform(() => api('/' + kind + '/batch-delete', 'POST', { ids: deleting }), '已删除')
        }
      />
    </div>
  );
}
