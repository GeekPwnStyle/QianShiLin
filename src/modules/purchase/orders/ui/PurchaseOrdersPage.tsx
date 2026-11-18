import { OperationStatus } from '@/src/shared/ui/OperationStatus';
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Plus, Search } from 'lucide-react';
import { appRepositories } from '@/src/app/composition/container';
import { useAuth } from '@/src/modules/auth/application/AuthContext';
import { STORE_CATALOG } from '@/src/modules/auth/domain/identity';
import type { ProductItem } from '@/src/modules/basic/products/domain/product';
import { downloadCsv } from '@/src/shared/lib/exportCsv';
import { Button } from '@/src/shared/ui/Button';
import { DataTable, type TableColumn } from '@/src/shared/ui/DataTable';
import { Modal } from '@/src/shared/ui/Modal';
import { EmptyState, ErrorState, LoadingSkeleton, NoPermissionState } from '@/src/shared/ui/StateViews';
import { StatusLabel } from '@/src/shared/ui/StatusLabel';

type Order = {
  id: string; order_no: string; store_id: string; supplier_name: string | null;
  order_type: 'single' | 'series'; status: string; hq_confirmed: boolean;
  ordered_qty: number; accepted_qty: number; creator_name: string;
  note: string; supplier_note: string; courier_info: string; source_order_no: string;
  related_purchase_no: string; supply_chain: string; created_at: string;
  lines?: Array<{ id: string; product_name: string; category_name: string; brand: string;
    series: string; model: string; ordered_qty: number; accepted_qty: number; note: string }>;
};
type Page = { items: Order[]; total: number; page: number; pageSize: number };
type SupplierPage = { items: Array<{ id: string; name: string }>; total: number };
type DraftLine = { productName: string; categoryName: string; brand: string;
  series: string; model: string; orderedQty: number; note: string };
const base = `${import.meta.env.BASE_URL}api`;
async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`${base}${path}`, { method, credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? `请求失败（${response.status}）`);
  return data as T;
}
const storeName = (id: string) => STORE_CATALOG.find(store => store.id === id)?.name ?? id;
const statusName: Record<string, string> = { draft: '草稿', submitted: '已提交', confirmed: '已确认', received: '已验收', cancelled: '已取消' };

export const PurchaseOrdersPage: React.FC = () => {
  const { session, dataScope, hasPermission } = useAuth();
  const client = useQueryClient();
  const [view, setView] = useState<'mine' | 'branch'>('mine');
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [orderType, setOrderType] = useState<'single' | 'series'>('single');
  const [supplierId, setSupplierId] = useState('');
  const [draftStoreId, setDraftStoreId] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const currentStore = session.currentStoreId;
  const otherStores = dataScope.authorizedStoreIds.filter(id => id !== currentStore);
  const selectedStore = view === 'mine' ? (currentStore === 'all' ? '' : currentStore) : otherStores[0] ?? '';
  const list = useQuery({ queryKey: ['purchase-orders', view, selectedStore, page, search],
    queryFn: () => request<Page>(`/purchase/orders?page=${page}&pageSize=20&storeId=${encodeURIComponent(selectedStore)}&search=${encodeURIComponent(search)}`) });
  const detail = useQuery({ queryKey: ['purchase-order', detailId], enabled: Boolean(detailId),
    queryFn: () => request<Order>(`/purchase/orders/${detailId}`) });
  const suppliers = useQuery({ queryKey: ['purchase-suppliers'], enabled: createOpen,
    queryFn: () => request<SupplierPage>('/catalog/suppliers?pageSize=100') });
  const products = useQuery({ queryKey: ['purchase-products', selectedStore], enabled: pickerOpen,
    queryFn: () => appRepositories.products.queryProducts({ page: 1, pageSize: 100 }, dataScope) });

  const openCreate = (type: 'single' | 'series') => {
    setOrderType(type); setSupplierId(''); setNote(''); setLines([]); setError('');
    setDraftStoreId(selectedStore || dataScope.authorizedStoreIds[0] || '');
    setOrderDate(new Date().toISOString().slice(0, 10)); setCreateOpen(true);
  };
  const addProduct = (product: ProductItem) => {
    setLines(previous => [...previous, { productName: product.name, categoryName: product.categoryName,
      brand: product.brand, series: product.series, model: product.model,
      orderedQty: 1, note: '' }]);
    setPickerOpen(false);
  };
  const save = async () => {
    if (!lines.length) { setError('请先选择至少一件商品'); return; }
    setSaving(true); setError('');
    try {
      const created = await request<Order>('/purchase/orders', 'POST', {
        storeId: draftStoreId, supplierId: supplierId || null, orderType, orderDate, note, lines,
      });
      setCreateOpen(false); setNotice(`采购订货草稿 ${created.order_no} 已保存`);
      await client.invalidateQueries({ queryKey: ['purchase-orders'] });
    } catch (cause) { setError(cause instanceof Error ? cause.message : '保存失败'); }
    finally { setSaving(false); }
  };
  const columns: TableColumn<Order>[] = [
    { key: 'order_no', header: '单号', sticky: true, render: row => <button className="font-mono underline cursor-pointer" onClick={() => setDetailId(row.id)}>{row.order_no}</button> },
    { key: 'created_at', header: '创建时间', render: row => new Date(row.created_at).toLocaleString('zh-CN') },
    { key: 'status', header: '状态', render: row => <StatusLabel tone={row.status === 'draft' ? 'neutral' : 'success'} label={statusName[row.status] ?? row.status} /> },
    { key: 'hq_confirmed', header: '总店确认', render: row => row.hq_confirmed ? '是' : '否' },
    { key: 'ordered_qty', header: '订货数量', align: 'right', render: row => row.ordered_qty },
    { key: 'accepted_qty', header: '验收数量', align: 'right', render: row => row.accepted_qty },
    { key: 'order_type', header: '类型', render: row => row.order_type === 'single' ? '单品' : '系列' },
    { key: 'creator_name', header: '制单人', render: row => row.creator_name },
    { key: 'supplier_name', header: '供应商', render: row => row.supplier_name ?? '暂无' },
    { key: 'note', header: '备注', render: row => row.note || '—' },
    { key: 'supplier_note', header: '供应商备注', render: row => row.supplier_note || '—' },
    { key: 'courier_info', header: '快递信息', render: row => row.courier_info || '—' },
  ];
  if (session.identityType === 'supplier') {
    return <NoPermissionState moduleLabel="采购订货单" requiredPermission="绑定自身供应商范围" />;
  }
  return <div className="space-y-5">
    <div><h2 className="text-[25px] font-semibold text-[#171916]">采购订货单</h2>
      <p className="text-sm text-[#6D736A] mt-1">按授权门店查看订单；新增单品或系列订货草稿。</p>
      <p className="text-xs text-[#6D736A] mt-2">商品选择使用演示目录；保存仅生成订货草稿，不发起实际采购或验收。批量确认、快递信息及订单合并规则待核实。</p></div>
    <div className="flex gap-2 border-b border-[#D9DDD4] pb-2">
      {(['mine', 'branch'] as const).map(key => <button key={key} type="button"
        disabled={key === 'branch' && !otherStores.length}
        className={`px-4 py-2 rounded-full text-sm cursor-pointer ${view === key ? 'bg-[var(--qsl-nav-active-bg)] text-[var(--qsl-nav-active-ink)]' : 'text-[#5F645D] hover:bg-white'}`}
        onClick={() => { setView(key); setPage(1); }}>{key === 'mine' ? '本店采购订货单' : '分店采购订货单'}</button>)}
    </div>
    <div className="flex flex-wrap gap-2 items-center rounded-[18px] border border-[#D9DDD4] bg-white p-4">
      {view === 'mine' && hasPermission('purchase.create') && <>
        <Button variant="accent" icon={<Plus className="w-4 h-4" />} onClick={() => openCreate('single')}>新增单品订货</Button>
        <Button onClick={() => openCreate('series')}>新增系列订货</Button>
      </>}
      <input aria-label="搜索单号或供应商" value={keyword} onChange={event => setKeyword(event.target.value)}
        onKeyDown={event => { if (event.key === 'Enter') { setSearch(keyword.trim()); setPage(1); } }}
        placeholder="单号 / 供应商" className="h-10 min-w-[180px] flex-1 rounded-lg border border-[#D9DDD4] px-3" />
      <Button icon={<Search className="w-4 h-4" />} onClick={() => { setSearch(keyword.trim()); setPage(1); }}>查询</Button>
      <Button icon={<Download className="w-4 h-4" />} onClick={() => {
        downloadCsv('采购订货单当前页', list.data?.items ?? [], columns.slice(0, 10).map(column => ({ key: column.key, header: column.header,
          accessor: row => String((row as unknown as Record<string, unknown>)[column.key] ?? '') })));
      }}>导出当前页</Button>
    </div>
    {notice && <OperationStatus role="status">{notice}</OperationStatus>}
    {list.isLoading ? <LoadingSkeleton /> : list.isError ? <ErrorState message={list.error.message} onRetry={() => list.refetch()} />
      : list.data?.items.length ? <DataTable columns={columns} rows={list.data.items} total={list.data.total}
        page={page} pageSize={20} onPageChange={setPage} /> : <EmptyState mode={search ? 'filtered' : 'initial'} />}
    <Modal open={createOpen} onClose={() => setCreateOpen(false)} title={`新增${orderType === 'single' ? '单品' : '系列'}采购订货单`}
      maxWidthClass="max-w-5xl" footer={<><Button onClick={() => { setNote(''); setLines([]); }}>重置</Button>
        <Button variant="primary" loading={saving} onClick={save}>保存草稿</Button></>}>
      <div className="space-y-5 max-h-[65vh] overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <label className="text-sm">供应商<select value={supplierId} onChange={event => setSupplierId(event.target.value)} className="mt-1 block h-10 w-full rounded-lg border border-[#D9DDD4] px-3">
            <option value="">暂无</option>{suppliers.data?.items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="text-sm">创建日期<input type="date" value={orderDate} onChange={event => setOrderDate(event.target.value)}
            className="mt-1 block h-10 w-full rounded-lg border border-[#D9DDD4] px-3" /></label>
          <label className="text-sm">归属门店<select value={draftStoreId} onChange={event => setDraftStoreId(event.target.value)} disabled={currentStore !== 'all'}
            className="mt-1 block h-10 w-full rounded-lg border border-[#D9DDD4] bg-white px-3">
            {dataScope.authorizedStoreIds.map(id => <option key={id} value={id}>{storeName(id)}</option>)}
          </select></label>
        </div>
        <label className="text-sm block">备注<textarea value={note} onChange={event => setNote(event.target.value)} rows={2}
          className="mt-1 block w-full rounded-lg border border-[#D9DDD4] p-3" /></label>
        <div className="flex items-center justify-between"><h3 className="font-semibold">订货明细</h3><Button onClick={() => setPickerOpen(true)}>手选商品</Button></div>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-[#D9DDD4] text-left">
          {['商品名称','品类','品牌','系列','规格型号','订货数量','验收数量','备注','操作'].map(label => <th key={label} className="p-2 whitespace-nowrap">{label}</th>)}</tr></thead><tbody>
          {lines.map((line, index) => <tr key={`${line.productName}-${index}`} className="border-b border-[#E5E8E0]">
            {[line.productName,line.categoryName,line.brand,line.series,line.model].map((value, i) => <td key={i} className="p-2">{value || '—'}</td>)}
            <td className="p-2"><input type="number" min={1} value={line.orderedQty} onChange={event => setLines(prev => prev.map((row, at) => at === index ? { ...row, orderedQty: Number(event.target.value) } : row))} className="w-20 border rounded px-2 py-1" /></td>
            <td className="p-2">0</td><td className="p-2"><input value={line.note} onChange={event => setLines(prev => prev.map((row, at) => at === index ? { ...row, note: event.target.value } : row))} className="w-32 border rounded px-2 py-1" /></td>
            <td className="p-2"><button className="underline" onClick={() => setLines(prev => prev.filter((_, at) => at !== index))}>移除</button></td></tr>)}
          {!lines.length && <tr><td colSpan={9} className="p-8 text-center text-[#73796F]">暂无商品，请手选商品</td></tr>}
        </tbody></table></div>
        <p className="text-right text-sm">总计订货数量：<strong>{lines.reduce((sum, line) => sum + (line.orderedQty || 0), 0)}</strong></p>
        {error && <OperationStatus role="alert">{error}</OperationStatus>}
      </div>
    </Modal>
    <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} title="选择商品" maxWidthClass="max-w-4xl">
      <div className="max-h-[60vh] overflow-y-auto space-y-2">
        {products.isLoading ? <LoadingSkeleton /> : products.data?.items.map(product => <button key={product.id}
          type="button" onClick={() => addProduct(product)} className="block w-full text-left rounded-xl border border-[#D9DDD4] p-3 hover:bg-[#F8F9F5]">
          <strong>{product.name}</strong><span className="ml-3 text-[#6D736A]">{product.brand} · {product.categoryName} · {product.model}</span>
        </button>)}
      </div>
    </Modal>
    <Modal open={Boolean(detailId)} onClose={() => setDetailId(null)} title="采购订货单明细" maxWidthClass="max-w-3xl">
      {detail.isLoading ? <LoadingSkeleton /> : detail.isError ? <ErrorState message={detail.error.message} /> : detail.data && <div className="space-y-3 text-sm">
        <p>单号：{detail.data.order_no}　门店：{storeName(detail.data.store_id)}　状态：{statusName[detail.data.status]}</p>
        <p>供应商：{detail.data.supplier_name || '暂无'}　制单人：{detail.data.creator_name}</p>
        <p>备注：{detail.data.note || '—'}</p>
        <div className="border-t border-[#D9DDD4] pt-3">{detail.data.lines?.map(line => <p key={line.id} className="py-2 border-b border-[#E5E8E0]">
          {line.product_name} · {line.brand} · {line.model}　订货 {line.ordered_qty} / 验收 {line.accepted_qty}
        </p>)}</div>
      </div>}
    </Modal>
  </div>;
};
