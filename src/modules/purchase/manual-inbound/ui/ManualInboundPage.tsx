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

type Line = { productName: string; categoryName: string; brand: string; series: string; model: string;
  purchasePrice: number; retailPrice: number; quantity: number; note: string };
type Draft = { id: string; draft_no: string; supplier_name: string; store_id: string; business_date: string;
  expected_receipt_date: string | null; settlement_type: string; external_order_no: string; note: string;
  supplier_note: string; freight: string; status: string; creator_name: string; created_at: string;
  quantity: number; goods_amount: string; lines?: Array<Line & { id: string; product_name: string; purchase_price: string; retail_price: string }> };
type Page = { items: Draft[]; total: number; page: number; pageSize: number };
type Suppliers = { items: Array<{ id: string; name: string }> };
const api = `${import.meta.env.BASE_URL}api`;
async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`${api}${path}`, { method, credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body) });
  const value = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(value.error ?? `请求失败（${response.status}）`);
  return value as T;
}
const field = 'mt-1 block h-10 w-full rounded-[10px] border border-[#D9DDD4] bg-white px-3 text-[#171916]';
const money = (value: number) => `¥ ${value.toFixed(2)}`;
const initialDate = () => new Date().toISOString().slice(0,10);

export const ManualInboundPage: React.FC = () => {
  const { session, dataScope, hasPermission } = useAuth();
  const cache = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState('');
  const [draftStoreId, setDraftStoreId] = useState('');
  const [businessDate, setBusinessDate] = useState(initialDate);
  const [expectedReceiptDate, setExpectedReceiptDate] = useState('');
  const [settlementType, setSettlementType] = useState<'store' | 'headquarters'>('store');
  const [externalOrderNo, setExternalOrderNo] = useState('');
  const [note, setNote] = useState('');
  const [supplierNote, setSupplierNote] = useState('');
  const [freight, setFreight] = useState(0);
  const [lines, setLines] = useState<Line[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const listStoreId = session.currentStoreId === 'all' ? '' : session.currentStoreId;
  const list = useQuery({ queryKey: ['manual-inbound',listStoreId,page,pageSize,search],
    queryFn: () => request<Page>(`/purchase/manual-inbound?storeId=${encodeURIComponent(listStoreId)}&page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(search)}`) });
  const detail = useQuery({ queryKey: ['manual-inbound-detail',detailId], enabled: Boolean(detailId),
    queryFn: () => request<Draft>(`/purchase/manual-inbound/${detailId}`) });
  const suppliers = useQuery({ queryKey: ['manual-inbound-suppliers'], enabled: createOpen,
    queryFn: () => request<Suppliers>('/catalog/suppliers?pageSize=100') });
  const products = useQuery({ queryKey: ['manual-inbound-products'], enabled: pickerOpen,
    queryFn: () => appRepositories.products.queryProducts({ page: 1, pageSize: 100 }, dataScope) });
  const quantity = lines.reduce((sum,line) => sum + (Number(line.quantity) || 0), 0);
  const goodsAmount = lines.reduce((sum,line) => sum + (Number(line.quantity) || 0)*(Number(line.purchasePrice) || 0), 0);
  const updateLine = (index: number, update: Partial<Line>) => setLines(previous => previous.map((line,at) => at === index ? { ...line,...update } : line));
  const reset = () => { setSupplierId(''); setDraftStoreId(listStoreId || dataScope.authorizedStoreIds[0] || ''); setBusinessDate(initialDate()); setExpectedReceiptDate('');
    setSettlementType('store'); setExternalOrderNo(''); setNote(''); setSupplierNote(''); setFreight(0); setLines([]); setError(''); };
  const addProduct = (product: ProductItem) => {
    setLines(previous => [...previous,{ productName: product.name, categoryName: product.categoryName,
      brand: product.brand, series: product.series, model: product.model, purchasePrice: 0, retailPrice: 0, quantity: 1, note: '' }]);
    setPickerOpen(false);
  };
  const save = async () => {
    if (!supplierId) { setError('请选择供应商'); return; }
    if (!lines.length) { setError('请添加至少一件商品'); return; }
    if (lines.some(line => !Number.isInteger(line.quantity) || line.quantity < 1 || line.purchasePrice < 0 || line.retailPrice < 0)) {
      setError('请核对商品数量与价格'); return;
    }
    setSaving(true); setError('');
    try {
      const created = await request<Draft>('/purchase/manual-inbound','POST', { storeId: draftStoreId,
        supplierId,businessDate,expectedReceiptDate: expectedReceiptDate || null,settlementType,externalOrderNo,
        note,supplierNote,freight,lines });
      setCreateOpen(false); reset(); setNotice(`入库草稿 ${created.draft_no} 已保存；库存未变更。`);
      await cache.invalidateQueries({ queryKey: ['manual-inbound'] });
    } catch (cause) { setError(cause instanceof Error ? cause.message : '保存失败'); }
    finally { setSaving(false); }
  };
  const columns: TableColumn<Draft>[] = [
    { key:'draft_no',header:'草稿单号',sticky:true,render: row => <button className="font-mono underline cursor-pointer" onClick={() => setDetailId(row.id)}>{row.draft_no}</button> },
    { key:'created_at',header:'创建时间',render: row => new Date(row.created_at).toLocaleString('zh-CN') },
    { key:'business_date',header:'业务日期',render: row => row.business_date?.slice(0,10) },
    { key:'supplier_name',header:'供应商',render: row => row.supplier_name },
    { key:'external_order_no',header:'第三方单号',render: row => row.external_order_no || '—' },
    { key:'quantity',header:'商品总数',align:'right',render: row => row.quantity },
    { key:'goods_amount',header:'商品金额',align:'right',render: row => money(Number(row.goods_amount)) },
    { key:'freight',header:'运费',align:'right',render: row => money(Number(row.freight)) },
    { key:'status',header:'状态',render: () => '草稿' },
    { key:'creator_name',header:'制单人',render: row => row.creator_name },
  ];
  if (session.identityType === 'supplier') return <NoPermissionState moduleLabel="手工入库" requiredPermission="门店采购范围" />;
  return <div className="space-y-5">
    <div><h2 className="text-[25px] font-semibold text-[#171916]">手工入库</h2>
      <p className="mt-1 text-sm text-[#6D736A]">按门店记录供应商、商品数量与价格，先保存可核对的入库草稿。</p>
      <p className="mt-2 text-xs text-[#6D736A]">商品选择暂用演示目录；条码解析、附件、批量修改、打印及正式入库待商品主数据与库存规则接通。保存草稿不会增加库存或生成应付账款。</p></div>
    <div className="flex flex-wrap items-center gap-2 rounded-[18px] border border-[#D9DDD4] bg-white p-4">
      {hasPermission('purchase.create') && <Button variant="accent" icon={<Plus className="h-4 w-4" />} onClick={() => { reset(); setCreateOpen(true); }}>新增入库草稿</Button>}
      <input aria-label="搜索草稿单号或供应商" className={`${field} mt-0 min-w-[180px] flex-1`} value={keyword}
        onChange={event => setKeyword(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { setSearch(keyword.trim()); setPage(1); } }} placeholder="草稿单号 / 供应商" />
      <Button icon={<Search className="h-4 w-4" />} onClick={() => { setSearch(keyword.trim()); setPage(1); }}>查询</Button>
      <Button icon={<Download className="h-4 w-4" />} onClick={() => downloadCsv('手工入库草稿当前页',list.data?.items ?? [],
        columns.slice(0,8).map(column => ({ key: column.key,header: column.header,
          accessor: row => String((row as unknown as Record<string,unknown>)[column.key] ?? '') })))}>导出当前页</Button>
    </div>
    {notice && <OperationStatus role="status">{notice}</OperationStatus>}
    {list.isLoading ? <LoadingSkeleton /> : list.isError ? <ErrorState message={list.error.message} onRetry={() => list.refetch()} />
      : list.data?.items.length ? <DataTable columns={columns} rows={list.data.items} total={list.data.total} page={page} pageSize={pageSize} onPageChange={setPage}
          onPageSizeChange={next => { setPageSize(next); setPage(1); }} />
      : <EmptyState mode={search ? 'filtered' : 'initial'} />}
    <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="新增手工入库草稿" maxWidthClass="max-w-6xl"
      footer={<><Button onClick={reset}>重置</Button><Button variant="primary" loading={saving} onClick={save}>保存草稿</Button></>}>
      <div className="max-h-[68vh] space-y-5 overflow-y-auto pr-1 text-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label>归属门店 <span className="text-red-600">*</span><select className={field} value={draftStoreId} onChange={event => setDraftStoreId(event.target.value)} disabled={session.currentStoreId !== 'all'}>
            {dataScope.authorizedStoreIds.map(id => <option key={id} value={id}>{STORE_CATALOG.find(store => store.id === id)?.name ?? id}</option>)}</select></label>
          <label>供应商 <span className="text-red-600">*</span><select className={field} value={supplierId} onChange={event => setSupplierId(event.target.value)}>
            <option value="">请选择供应商</option>{suppliers.data?.items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label>业务日期<input type="date" className={field} value={businessDate} onChange={event => setBusinessDate(event.target.value)} /></label>
          <label>预计收货时间<input type="date" className={field} value={expectedReceiptDate} onChange={event => setExpectedReceiptDate(event.target.value)} /></label>
          <label>结算类型<select className={field} value={settlementType} onChange={event => setSettlementType(event.target.value as 'store' | 'headquarters')}>
            <option value="store">本店结算</option><option value="headquarters">总店结算</option></select></label>
          <label>第三方单号<input className={field} value={externalOrderNo} maxLength={120} onChange={event => setExternalOrderNo(event.target.value)} /></label>
          <label>运费（元）<input type="number" min="0" step="0.01" className={field} value={freight} onChange={event => setFreight(Number(event.target.value))} /></label>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label>订单备注<textarea className={`${field} h-20 py-2`} maxLength={1000} value={note} onChange={event => setNote(event.target.value)} /></label>
          <label>供应商备注<textarea className={`${field} h-20 py-2`} maxLength={1000} value={supplierNote} onChange={event => setSupplierNote(event.target.value)} /></label>
        </div>
        <div className="flex items-center justify-between"><h3 className="font-semibold">商品明细</h3><Button onClick={() => setPickerOpen(true)}>手选商品</Button></div>
        <div className="overflow-x-auto rounded-xl border border-[#D9DDD4]"><table className="min-w-[1100px] w-full text-left"><thead className="bg-[#F8F9F5]"><tr>
          {['商品名称','品类','品牌','系列','规格型号','进货价','零售价','数量','金额','商品备注','操作'].map(label => <th key={label} className="p-2 whitespace-nowrap">{label}</th>)}</tr></thead><tbody>
          {lines.map((line,index) => <tr key={`${line.productName}-${index}`} className="border-t border-[#E5E8E0]">
            {[line.productName,line.categoryName,line.brand,line.series,line.model].map((value,at) => <td key={at} className="p-2">{value || '—'}</td>)}
            <td className="p-2"><input aria-label={`第${index+1}行进货价`} type="number" min="0" step="0.01" className="w-20 rounded border px-2 py-1" value={line.purchasePrice} onChange={event => updateLine(index,{ purchasePrice:Number(event.target.value) })} /></td>
            <td className="p-2"><input aria-label={`第${index+1}行零售价`} type="number" min="0" step="0.01" className="w-20 rounded border px-2 py-1" value={line.retailPrice} onChange={event => updateLine(index,{ retailPrice:Number(event.target.value) })} /></td>
            <td className="p-2"><input aria-label={`第${index+1}行数量`} type="number" min="1" className="w-16 rounded border px-2 py-1" value={line.quantity} onChange={event => updateLine(index,{ quantity:Number(event.target.value) })} /></td>
            <td className="p-2 whitespace-nowrap">{money(line.quantity*line.purchasePrice)}</td>
            <td className="p-2"><input aria-label={`第${index+1}行备注`} className="w-28 rounded border px-2 py-1" value={line.note} onChange={event => updateLine(index,{ note:event.target.value })} /></td>
            <td className="p-2"><button className="underline cursor-pointer" onClick={() => setLines(previous => previous.filter((_,at) => at !== index))}>移除</button></td></tr>)}
          {!lines.length && <tr><td colSpan={11} className="p-8 text-center text-[#73796F]">暂无商品，请手选商品</td></tr>}
        </tbody></table></div>
        <div className="flex justify-end gap-5 font-medium">商品总数：{quantity}　商品金额：{money(goodsAmount)}　总金额：{money(goodsAmount + freight)}</div>
        {error && <OperationStatus role="alert">{error}</OperationStatus>}
      </div>
    </Modal>
    <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} title="选择商品" maxWidthClass="max-w-4xl">
      <div className="max-h-[60vh] space-y-2 overflow-y-auto">{products.isLoading ? <LoadingSkeleton /> : products.data?.items.map(product => <button key={product.id}
        className="block w-full rounded-xl border border-[#D9DDD4] p-3 text-left hover:bg-[#F8F9F5]" onClick={() => addProduct(product)}>
        <strong>{product.name}</strong><span className="ml-3 text-[#6D736A]">{product.brand} · {product.categoryName} · {product.model}</span></button>)}</div>
    </Modal>
    <Modal open={Boolean(detailId)} onClose={() => setDetailId(null)} title="手工入库草稿明细" maxWidthClass="max-w-3xl">
      {detail.isLoading ? <LoadingSkeleton /> : detail.isError ? <ErrorState message={detail.error.message} /> : detail.data && <div className="space-y-3 text-sm">
        <p>单号：{detail.data.draft_no}　供应商：{detail.data.supplier_name}　状态：草稿</p>
        <p>业务日期：{detail.data.business_date.slice(0,10)}　制单人：{detail.data.creator_name}</p>
        <p>第三方单号：{detail.data.external_order_no || '—'}　备注：{detail.data.note || '—'}</p>
        <div className="border-t border-[#D9DDD4] pt-2">{detail.data.lines?.map(line => <p key={line.id} className="border-b border-[#E5E8E0] py-2">
          {line.product_name} · {line.brand} · {line.model}　{line.quantity} 件 × {money(Number(line.purchase_price))}</p>)}</div>
      </div>}
    </Modal>
  </div>;
};
