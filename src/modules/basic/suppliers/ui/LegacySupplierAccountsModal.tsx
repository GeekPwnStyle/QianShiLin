import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

type Account = { id: string; username: string; legacy_role: string; legacy_status: string;
  legacy_created_at: string | null; legacy_updated_at: string | null; supplier_count: number };
type Grant = { id: string; name: string; source_name: string; needs_review: boolean };

async function get<T>(path: string): Promise<T> {
  const r = await fetch(`${import.meta.env.BASE_URL}api/catalog/suppliers/legacy-accounts${path}`, { credentials: 'same-origin' });
  const body = await r.json();
  if (!r.ok) throw new Error(body.error || '读取旧账号资料失败');
  return body;
}

export function LegacySupplierAccountsModal({ onClose, debugMode }: { onClose: () => void; debugMode: boolean }) {
  const [search, setSearch] = useState('');
  const [input, setInput] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Account | null>(null);
  const [grantSearch, setGrantSearch] = useState('');
  const accounts = useQuery({ queryKey: ['legacy-supplier-accounts', search, page],
    queryFn: () => get<{items: Account[]; total: number}>(`?${new URLSearchParams({search, page: String(page)})}`), enabled: !debugMode });
  const grants = useQuery({ queryKey: ['legacy-supplier-grants', selected?.id],
    queryFn: () => get<{items: Grant[]}>(`/${selected!.id}`), enabled: !!selected && !debugMode });
  const items = (grants.data?.items ?? []).filter(g => `${g.name} ${g.source_name}`.toLowerCase().includes(grantSearch.toLowerCase()));
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onKeyDown={e => { if (e.key === 'Escape') onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="legacy-supplier-title" className="flex max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
      <header className="flex items-center justify-between border-b p-4">
        <h2 id="legacy-supplier-title" className="font-semibold">旧账号授权</h2>
        <button type="button" autoFocus onClick={onClose} className="rounded-lg border px-3 py-1">关闭</button>
      </header>
      <p className="px-4 pt-3 text-sm text-gray-600">这里保留旧系统的账号与授权资料。旧角色和“有效”状态仅供核对，尚未开通新系统登录。</p>
      {debugMode ? <p className="p-4">演示模式不读取真实迁移资料，请退出演示模式后查看。</p> : <>
        <form className="flex gap-2 p-4" onSubmit={e => { e.preventDefault(); setSearch(input.trim()); setPage(1); setSelected(null); }}>
          <input aria-label="搜索旧账号或授权供应商" className="flex-1 rounded-lg border px-3 py-2" placeholder="搜索旧账号或授权供应商" value={input} onChange={e => setInput(e.target.value)} />
          <button className="rounded-lg border px-4" type="submit">搜索</button>
        </form>
        <div className="overflow-auto px-4 pb-4">
          {accounts.isPending && <p role="status">正在读取旧账号…</p>}
          {accounts.isError && <p role="alert">{accounts.error.message}<button className="ml-2 underline" onClick={() => void accounts.refetch()}>重试</button></p>}
          {accounts.data && <>
            <table className="w-full text-left text-sm"><thead><tr className="border-b text-gray-500">
              {['旧账号', '原角色 / 状态', '授权供应商', '原创建时间', '原更新时间'].map(h => <th className="p-2 whitespace-nowrap" key={h}>{h}</th>)}
            </tr></thead><tbody>{accounts.data.items.map(a => <tr key={a.id} className={`border-b ${selected?.id === a.id ? 'bg-green-50' : ''}`}>
              <td className="p-2 font-medium">{a.username}</td><td className="p-2">{a.legacy_role} / {a.legacy_status}</td>
              <td className="p-2"><button type="button" className="text-green-800 underline" aria-expanded={selected?.id === a.id} onClick={() => { setSelected(a); setGrantSearch(''); }}>查看 {a.supplier_count} 家</button></td>
              <td className="p-2 whitespace-nowrap">{a.legacy_created_at || '—'}</td><td className="p-2 whitespace-nowrap">{a.legacy_updated_at || '—'}</td>
            </tr>)}</tbody></table>
            {!accounts.data.items.length && <p className="py-4 text-gray-500">没有匹配的旧账号资料</p>}
            <div className="flex items-center justify-between py-3"><span className="text-sm">共 {accounts.data.total} 个账号 · 第 {page} 页</span>
              <div className="flex gap-3"><button disabled={page <= 1} onClick={() => {setPage(p => p-1); setSelected(null);}}>上一页</button><button disabled={page*20 >= accounts.data.total} onClick={() => {setPage(p => p+1); setSelected(null);}}>下一页</button></div></div>
          </>}
          {selected && <section className="mt-3 rounded-xl border p-3" aria-label={`${selected.username} 的授权供应商`}>
            <h3 className="font-medium">{selected.username} · 授权供应商明细</h3>
            <input className="my-3 w-full rounded-lg border px-3 py-2" aria-label="筛选授权明细" placeholder="筛选供应商名称" value={grantSearch} onChange={e => setGrantSearch(e.target.value)} />
            {grants.isPending && <p role="status">正在读取授权明细…</p>}
            {grants.isError && <p role="alert">{grants.error.message}<button className="ml-2 underline" onClick={() => void grants.refetch()}>重试</button></p>}
            <ul className="grid max-h-64 gap-2 overflow-auto text-sm md:grid-cols-2">{items.map(g => <li key={g.id} className="rounded-lg bg-gray-50 p-2">{g.source_name}{g.needs_review && <span className="ml-2 text-amber-700">名称待复核</span>}</li>)}</ul>
            {grants.data && !items.length && <p className="text-gray-500">没有匹配的供应商</p>}
          </section>}
        </div>
      </>}
    </section>
  </div>;
}
