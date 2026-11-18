import { OperationStatus } from '@/src/shared/ui/OperationStatus';
import React, { useRef, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Plus, Search, Upload } from 'lucide-react';
import { downloadCatalogCsv, importRows } from '../application/catalogCsv';
import { useAuth } from '@/src/modules/auth/application/AuthContext';
import { Button } from '@/src/shared/ui/Button';
import { DataTable, type TableColumn } from '@/src/shared/ui/DataTable';
import { Modal } from '@/src/shared/ui/Modal';
import { EmptyState, ErrorState } from '@/src/shared/ui/StateViews';
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
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<CatalogRow | null>(null);
  const [form, setForm] = useState<Record<string, unknown> | null>(null);
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
      setMessage('已删除');
      await client.invalidateQueries({ queryKey: ['catalog', config.resource] });
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
  const columns: TableColumn<CatalogRow>[] = config.columns.map(key => ({
    key,
    header: config.fields.find(field => field.key === key)?.label ?? key,
    render: row => key === 'enabled'
      ? <StatusLabel tone={row.enabled ? 'success' : 'neutral'} label={row.enabled ? '启用' : '停用'} />
      : <span title={display(row[key])}>{display(row[key])}</span>,
  }));
  if (canEdit) columns.push({
    key: 'actions', header: '操作',
    render: row => <div className="flex gap-3">
      <button type="button" className="text-[#171916] underline cursor-pointer" onClick={() => openForm(row)}>编辑</button>
      <button type="button" className="text-[#9C3232] underline cursor-pointer" onClick={() => {
        if (window.confirm(`确认删除「${row.name}」？`)) remove.mutate(row.id);
      }}>删除</button>
    </div>,
  });

  return <div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><h2 className="text-[23px] font-semibold text-[#171916]">{config.title}</h2>
        <p className="text-sm text-[#6D736A] mt-1">{config.description}</p></div>
      <div className="flex flex-wrap gap-2">
        {config.resource !== 'warehouses' && <Button icon={<Download className="w-4 h-4" />} loading={transferring} onClick={exportAll}>导出 CSV</Button>}
        {canEdit && config.resource !== 'warehouses' && <>
          <Button onClick={() => downloadCatalogCsv(`${config.title}导入模板.csv`, config.fields, [])}>下载模板</Button>
          <Button icon={<Upload className="w-4 h-4" />} loading={transferring} onClick={() => importInput.current?.click()}>导入 CSV</Button>
          <input ref={importInput} type="file" accept=".csv,text/csv" className="hidden" aria-label="导入 CSV 文件"
            onChange={event => { const file = event.target.files?.[0]; if (file) void importFile(file); event.target.value = ''; }} />
        </>}
        {canEdit && <Button variant="accent" icon={<Plus className="w-4 h-4" />} onClick={() => openForm()}>新增{config.title}</Button>}
      </div>
    </div>
    <div className="flex gap-2 rounded-[18px] border border-[#D9DDD4] bg-white p-4">
      <input aria-label="搜索名称" value={keyword} onChange={event => setKeyword(event.target.value)}
        onKeyDown={event => { if (event.key === 'Enter') { setPage(1); setSearch(keyword.trim()); } }}
        placeholder={`搜索${config.title}名称`} className="h-10 min-w-0 flex-1 rounded-lg border border-[#D9DDD4] px-3 outline-none focus:border-[#171916]" />
      <Button icon={<Search className="w-4 h-4" />} onClick={() => { setPage(1); setSearch(keyword.trim()); }}>查询</Button>
    </div>
    {message && <OperationStatus role="status">{message}</OperationStatus>}
    {remove.error && <OperationStatus role="alert">{remove.error.message}</OperationStatus>}
    {query.isError && !query.data ? (
      <ErrorState message={query.error.message} onRetry={() => query.refetch()} />
    ) : !query.isLoading && !query.isFetching && !query.data?.items.length ? (
      <EmptyState mode={search ? 'filtered' : 'initial'} />
    ) : (
      <DataTable
        columns={columns}
        rows={query.data?.items ?? []}
        total={query.data?.total ?? 0}
        page={page}
        pageSize={pageSize}
        loading={query.isLoading || query.isFetching}
        loadingLabel={`正在从数据库加载${config.title}…`}
        onPageChange={setPage}
        onPageSizeChange={next => { setPageSize(next); setPage(1); }}
      />
    )}
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
  </div>;
};
