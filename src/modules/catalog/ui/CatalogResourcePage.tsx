import { OperationStatus } from '@/src/shared/ui/OperationStatus';
import React, { useRef, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Pencil, Plus, RotateCcw, SlidersHorizontal, Trash2, Upload } from 'lucide-react';
import { downloadCatalogCsv, importRows } from '../application/catalogCsv';
import { useAuth } from '@/src/modules/auth/application/AuthContext';
import { Button } from '@/src/shared/ui/Button';
import { ConfirmDeleteModal } from '@/src/shared/ui/ConfirmDeleteModal';
import { Modal } from '@/src/shared/ui/Modal';
import { PaginationBar } from '@/src/shared/ui/PaginationBar';
import { Select } from '@/src/shared/ui/Select';
import { ErrorState, TableLoadingOverlay, TableLoadingRows } from '@/src/shared/ui/StateViews';
import { StatusLabel } from '@/src/shared/ui/StatusLabel';

export type ResourceName = 'brands' | 'suppliers' | 'warehouses';
export interface CatalogField {
  key: string;
  label: string;
  type?: 'text' | 'boolean' | 'array' | 'date' | 'select' | 'integer';
  required?: boolean;
  options?: string[];
}
export interface CatalogConfig {
  resource: ResourceName;
  title: string;
  description: string;
  fields: CatalogField[];
  columns: string[];
}
type CatalogRow = Record<string, unknown> & { id: string; name: string };
type PageResult = { items: CatalogRow[]; total: number; page: number; pageSize: number };

const root = `${import.meta.env.BASE_URL}api/catalog`;
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

function display(value: unknown): string {
  if (Array.isArray(value)) return value.join('、') || '—';
  if (typeof value === 'boolean') return value ? '是' : '否';
  if (value == null || value === '') return '—';
  return String(value).slice(0, 80);
}

export const CatalogResourcePage: React.FC<{ config: CatalogConfig }> = ({ config }) => {
  const client = useQueryClient();
  const { session } = useAuth();
  const canEdit = session.identityType === 'admin';
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [enabledFilter, setEnabledFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [hiddenCols, setHiddenCols] = useState<string[]>([]);
  const [editing, setEditing] = useState<CatalogRow | null>(null);
  const [form, setForm] = useState<Record<string, unknown> | null>(null);
  const [deletingRow, setDeletingRow] = useState<CatalogRow | null>(null);
  const [message, setMessage] = useState('');
  const [transferring, setTransferring] = useState(false);
  const importInput = useRef<HTMLInputElement>(null);
  const queryKey = ['catalog', config.resource, page, pageSize, search];
  const query = useQuery({
    queryKey,
    placeholderData: keepPreviousData,
    queryFn: () => api<PageResult>(`/${config.resource}?page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(search)}`),
  });
  const save = useMutation({
    mutationFn: (values: Record<string, unknown>) => api<CatalogRow>(
      `/${config.resource}${editing ? `/${editing.id}` : ''}`,
      editing ? 'PATCH' : 'POST', values,
    ),
    onSuccess: async () => {
      setForm(null); setMessage('已保存');
      await client.invalidateQueries({ queryKey: ['catalog', config.resource] });
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => api<{ ok: boolean }>(`/${config.resource}/${id}`, 'DELETE'),
    onSuccess: async () => {
      setDeletingRow(null);
      setMessage('已删除');
      await client.invalidateQueries({ queryKey: ['catalog', config.resource] });
    },
    onError: () => {
      setDeletingRow(null);
    },
  });

  const openForm = (row?: CatalogRow) => {
    setEditing(row ?? null);
    setForm(Object.fromEntries(config.fields.map(field => [field.key,
      row?.[field.key] ?? (field.key === 'enabled' ? true : field.type === 'boolean' ? false : field.type === 'array' ? [] : field.type === 'integer' ? 0 : '')
    ])));
    save.reset();
  };
  const exportAll = async () => {
    setTransferring(true);
    try {
      const collected: CatalogRow[] = [];
      for (let current = 1; current <= 100; current++) {
        const result = await api<PageResult>(`/${config.resource}?page=${current}&pageSize=100&search=${encodeURIComponent(search)}`);
        collected.push(...result.items);
        if (collected.length >= result.total) break;
      }
      downloadCatalogCsv(`${config.title}.csv`, config.fields, collected);
      setMessage(`已导出 ${collected.length} 条`);
    } catch (error) { setMessage(error instanceof Error ? error.message : '导出失败'); }
    finally { setTransferring(false); }
  };
  const importFile = async (file: File) => {
    if (file.size > 1024 * 1024) { setMessage('CSV 文件不得超过 1MB'); return; }
    setTransferring(true);
    let success = 0;
    const errors: string[] = [];
    try {
      const records = importRows(await file.text(), config.fields);
      for (let i = 0; i < records.length; i++) {
        try { await api(`/${config.resource}`, 'POST', records[i]); success++; }
        catch (error) { errors.push(`第 ${i + 2} 行：${error instanceof Error ? error.message : '导入失败'}`); }
      }
      await client.invalidateQueries({ queryKey: ['catalog', config.resource] });
      setMessage(`导入完成：成功 ${success} 条，失败 ${errors.length} 条。${errors.slice(0, 3).join('；')}`);
    } catch (error) { setMessage(error instanceof Error ? error.message : '导入失败'); }
    finally { setTransferring(false); }
  };
  const dataColumns = config.columns.map(key => ({
    key,
    header: config.fields.find(field => field.key === key)?.label ?? key,
  }));
  const visibleColumns = dataColumns.filter(c => !hiddenCols.includes(c.key));
  const rawRows = query.data?.items ?? [];
  const filteredRows = enabledFilter === 'all'
    ? rawRows
    : rawRows.filter(r => enabledFilter === 'enabled' ? Boolean(r.enabled) : !r.enabled);
  const colSpanCount = visibleColumns.length + (canEdit ? 2 : 1);

  const btnCls = 'inline-flex items-center gap-1.5 rounded-lg border border-[#D9DDD4] bg-white px-3 py-1.5 font-medium text-[#171916] hover:bg-[#F5F7F2] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed';
  const primaryCls = 'inline-flex items-center gap-1.5 rounded-lg border border-[var(--qsl-accent-border)] bg-[var(--qsl-accent)] px-3 py-1.5 font-medium text-[var(--qsl-accent-ink)] hover:bg-[var(--qsl-accent-hover)] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed';
  const toolbarInputCls = 'h-9 rounded-lg border border-[#D9DDD4] bg-white px-3 text-sm outline-none focus:border-[var(--qsl-accent-border)]';

  return <div className="space-y-4">
    {message && <OperationStatus role="status">{message}</OperationStatus>}
    {remove.error && <OperationStatus role="alert">{remove.error.message}</OperationStatus>}

    <section className="overflow-hidden rounded-[20px] border border-[#D9DDD4] bg-white text-sm">
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E5E8E0] p-3">
        {canEdit && <button type="button" className={primaryCls} onClick={() => openForm()}><Plus size={15} />新增{config.title}</button>}
        {config.resource !== 'warehouses' && <button type="button" className={btnCls} disabled={transferring} onClick={exportAll}><Download size={15} />导出 CSV</button>}
        {canEdit && config.resource !== 'warehouses' && <>
          <button type="button" className={btnCls} onClick={() => downloadCatalogCsv(`${config.title}导入模板.csv`, config.fields, [])}><Download size={15} />下载模板</button>
          <button type="button" className={btnCls} disabled={transferring} onClick={() => importInput.current?.click()}><Upload size={15} />导入 CSV</button>
          <input ref={importInput} type="file" accept=".csv,text/csv" className="hidden" aria-label="导入 CSV 文件"
            onChange={event => { const file = event.target.files?.[0]; if (file) void importFile(file); event.target.value = ''; }} />
        </>}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <input
            aria-label="搜索名称"
            value={keyword}
            onChange={event => {
              const v = event.target.value;
              setKeyword(v);
              setPage(1);
              setSearch(v.trim());
            }}
            onKeyDown={event => { if (event.key === 'Enter') { setPage(1); setSearch(keyword.trim()); } }}
            placeholder={`搜索${config.title}名称`}
            className={`${toolbarInputCls} w-48 min-w-0`}
          />
          <button
            type="button"
            onClick={() => setFiltersOpen(prev => !prev)}
            aria-expanded={filtersOpen}
            className={`${btnCls} ${filtersOpen ? 'bg-[#F8F9F5] border-[#B9C1B3]' : ''}`}
          >
            筛选搜索
          </button>
          <button
            type="button"
            onClick={() => setColumnsOpen(prev => !prev)}
            aria-expanded={columnsOpen}
            aria-controls="catalog-header-options"
            className={`${btnCls} ${columnsOpen ? 'bg-[#F8F9F5] border-[#B9C1B3]' : ''}`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            设置表头
          </button>
        </div>
      </div>

      {filtersOpen && (
        <div className="flex flex-wrap items-center gap-2.5 border-b border-[#E5E8E0] bg-[#FAFBF8] p-3">
          <Select
            variant="compact"
            ariaLabel="启用状态筛选"
            placeholder="全部状态"
            className="w-40"
            buttonClassName="w-full rounded-full px-3.5 bg-white"
            value={enabledFilter}
            onChange={val => setEnabledFilter(val as 'all' | 'enabled' | 'disabled')}
            options={[
              { value: 'all', label: '全部状态' },
              { value: 'enabled', label: '仅看启用' },
              { value: 'disabled', label: '仅看停用' },
            ]}
          />
          {(enabledFilter !== 'all' || search) && (
            <button
              type="button"
              onClick={() => { setEnabledFilter('all'); setKeyword(''); setSearch(''); setPage(1); }}
              className="inline-flex h-8 items-center gap-1 rounded-full border border-[#D9DDD4] bg-white px-3 text-xs text-[#5F645D] hover:text-[#171916] cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              重置筛选
            </button>
          )}
        </div>
      )}

      {columnsOpen && (
        <div id="catalog-header-options" className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[#E5E8E0] bg-[#F8F9F5] px-4 py-3">
          {dataColumns.map(col => (
            <label key={col.key} className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap text-[13px] text-[#171916]">
              <input
                type="checkbox"
                checked={!hiddenCols.includes(col.key)}
                onChange={() => setHiddenCols(prev => prev.includes(col.key) ? prev.filter(k => k !== col.key) : [...prev, col.key])}
                className="h-3.5 w-3.5 accent-[var(--qsl-accent)] border-0 outline-none focus:ring-0 cursor-pointer"
              />
              {col.header}
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

      {query.isError && !query.data ? (
        <div className="p-5">
          <ErrorState message={query.error.message} onRetry={() => query.refetch()} />
        </div>
      ) : (
        <>
          <div className="relative">
            <div className="overflow-x-auto qsl-scroll">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#E5E8E0] bg-[#F8F9F5]">
                    <th className="w-14 px-3.5 py-3 text-center text-[13px] font-semibold text-[#5F645D] whitespace-nowrap align-middle sticky left-0 z-20 bg-[#F8F9F5] border-r border-[#E5E8E0]">
                      序号
                    </th>
                    {canEdit && (
                      <th className="px-3.5 py-3 text-[13px] font-semibold text-[#5F645D] whitespace-nowrap align-middle sticky left-14 z-20 bg-[#F8F9F5] border-r border-[#D9DDD4] shadow-[4px_0_12px_rgba(23,25,22,0.04)]">
                        操作
                      </th>
                    )}
                    {visibleColumns.map(col => (
                      <th key={col.key} className="px-3.5 py-3 text-[13px] font-semibold text-[#5F645D] whitespace-nowrap align-middle border-r border-[#E5E8E0] last:border-r-0">
                        {col.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E8E0]">
                  {(query.isLoading || query.isFetching) && filteredRows.length === 0 ? (
                    <TableLoadingRows colSpan={colSpanCount} label={`正在从数据库加载${config.title}…`} />
                  ) : filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={colSpanCount} className="px-4 py-12 text-center text-[#73796F]">
                        暂无符合条件的{config.title}
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row, idx) => {
                      const rowBg = idx % 2 === 1 ? 'bg-[#FAFBF8]' : 'bg-white';
                      return (
                        <tr key={row.id} className={`transition-colors hover:bg-[#F1F5EC] ${rowBg}`}>
                          <td className={`w-14 px-3.5 py-2.5 text-center text-[14px] text-[#5F645D] tabular-nums whitespace-nowrap align-middle sticky left-0 z-10 border-r border-[#E5E8E0] ${rowBg}`}>
                            {(page - 1) * pageSize + idx + 1}
                          </td>
                          {canEdit && (
                            <td className={`px-3.5 py-2.5 text-[14px] text-[#171916] whitespace-nowrap align-middle sticky left-14 z-10 border-r border-[#D9DDD4] shadow-[4px_0_12px_rgba(23,25,22,0.04)] ${rowBg}`}>
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  title="编辑"
                                  aria-label={`编辑 ${row.name}`}
                                  className={`${primaryCls} !px-2 !py-1`}
                                  onClick={() => openForm(row)}
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  type="button"
                                  title="删除"
                                  aria-label={`删除 ${row.name}`}
                                  className={`${btnCls} !px-2 !py-1 text-red-700`}
                                  onClick={() => setDeletingRow(row)}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          )}
                          {visibleColumns.map(col => (
                            <td key={col.key} className="px-3.5 py-2.5 text-[14px] text-[#171916] whitespace-nowrap align-middle border-r border-[#E5E8E0] last:border-r-0">
                              {col.key === 'enabled' ? (
                                <StatusLabel tone={row.enabled ? 'success' : 'neutral'} label={row.enabled ? '启用' : '停用'} />
                              ) : (
                                <span title={display(row[col.key])}>{display(row[col.key])}</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {(query.isLoading || query.isFetching) && filteredRows.length > 0 && (
              <TableLoadingOverlay label={`正在同步${config.title}…`} />
            )}
          </div>

          <PaginationBar
            total={query.data?.total ?? 0}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={next => { setPageSize(next); setPage(1); }}
          />
        </>
      )}
    </section>
    <Modal open={form !== null} onClose={() => setForm(null)} title={`${editing ? '编辑' : '新增'}${config.title}`}
      maxWidthClass="max-w-2xl" footer={<><Button onClick={() => setForm(null)}>取消</Button>
        <Button variant="primary" loading={save.isPending} onClick={() => {
          if (!form) return;
          const missing = config.fields.find(field => field.required && !String(form[field.key] ?? '').trim());
          if (missing) { setMessage(`请填写${missing.label}`); return; }
          save.mutate(Object.fromEntries(Object.entries(form).map(([key, value]) => [
            key, config.fields.find(field => field.key === key)?.type === 'date' && value === '' ? null : value,
          ])));
        }}>保存</Button></>}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto py-2">
        {config.fields.map(field => <label key={field.key} className="flex flex-col gap-1 text-sm text-[#4E544B]">
          <span>{field.label}{field.required && <span className="text-[#9C3232]"> *</span>}</span>
          {field.type === 'boolean' ? <select className="h-10 rounded-lg border border-[#D9DDD4] px-3" value={form?.[field.key] ? 'true' : 'false'}
            onChange={event => setForm(prev => ({ ...prev, [field.key]: event.target.value === 'true' }))}><option value="true">是</option><option value="false">否</option></select>
          : field.type === 'select' ? <select className="h-10 rounded-lg border border-[#D9DDD4] px-3" value={String(form?.[field.key] ?? '')}
            onChange={event => setForm(prev => ({ ...prev, [field.key]: event.target.value }))}>
            <option value="">请选择</option>{field.options?.map(option => <option key={option}>{option}</option>)}
          </select>
          : <input type={field.type === 'date' ? 'date' : field.type === 'integer' ? 'number' : 'text'} min={field.type === 'integer' ? 0 : undefined} className="h-10 rounded-lg border border-[#D9DDD4] px-3"
            value={field.type === 'array' ? display(form?.[field.key]) === '—' ? '' : display(form?.[field.key]) : String(form?.[field.key] ?? '')}
            onChange={event => setForm(prev => ({ ...prev, [field.key]: field.type === 'array'
              ? event.target.value.split(/[、,，]/).map(x => x.trim()).filter(Boolean)
              : field.type === 'integer' ? Number(event.target.value) : event.target.value }))} />}
        </label>)}
      </div>
      {save.error && <OperationStatus role="alert">{save.error.message}</OperationStatus>}
    </Modal>
    <ConfirmDeleteModal
      open={Boolean(deletingRow)}
      title={`确认删除${config.title}`}
      subtitle="危险操作二次确认：删除后该记录将从数据库移除"
      description={
        <span>
          确定删除{config.title}「<strong>{deletingRow?.name}</strong>」吗？
        </span>
      }
      note="此操作不可撤销；若仍有关联业务数据，删除可能会被系统拒绝。"
      loading={remove.isPending}
      onClose={() => setDeletingRow(null)}
      onConfirm={() => {
        if (deletingRow) remove.mutate(deletingRow.id);
      }}
    />
  </div>;
};
