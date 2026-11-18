import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/src/modules/auth/application/AuthContext';
import { Modal } from '@/src/shared/ui/Modal';
import { OperationStatus } from '@/src/shared/ui/OperationStatus';

const columns = [
  ['name','员工姓名'], ['role','角色'], ['department','部门'], ['limit','整单调价权限（元）'],
  ['age','年龄'], ['gender','性别'], ['education','学历'], ['phone','联系电话'],
  ['address','家庭地址'], ['loginStatus','登录限制备注'], ['tags','标签'],
] as const;
type Key = typeof columns[number][0];
type Row = { id: string; store_id: string; data: Partial<Record<Key,string>> };
const input = 'rounded-lg border bg-white px-2.5 py-1.5';
const button = 'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-medium disabled:opacity-40';
const primary = button + ' border-[var(--qsl-accent-border)] bg-[var(--qsl-accent)] text-[var(--qsl-accent-ink)] hover:bg-[var(--qsl-accent-hover)]';
const api = `${import.meta.env.BASE_URL}api/staff`;

async function request<T>(url: string, method = 'GET', body?: object): Promise<T> {
  const response = await fetch(url, { method, credentials: 'same-origin', ...(body && { headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) }) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || '操作失败');
  return result;
}

export function StaffArchivePage() {
  const { session, debugMode } = useAuth();
  const stores = session.authorizedStores;
  const query = useQuery({ queryKey: ['staff', session.userId], enabled: !debugMode, queryFn: () => request<{rows:Row[];canEdit:boolean}>(api) });
  const [search, setSearch] = useState('');
  const [store, setStore] = useState('');
  const [role, setRole] = useState('');
  const [filters, setFilters] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [hidden, setHidden] = useState<Key[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<Row | null>(null);
  const [sync, setSync] = useState(false);
  const [target, setTarget] = useState('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(50);
  const [sort, setSort] = useState<{key:Key; desc:boolean}>({key:'name',desc:false});
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{text:string;error?:boolean}>();
  const canEdit = query.data?.canEdit ?? false;
  const all = query.data?.rows ?? [];
  const storeName = (id: string) => stores.find(item => item.id === id)?.name ?? id;
  const visibleColumns = columns.filter(([key]) => !hidden.includes(key));
  const filtered = all.filter(row => (!store || store === row.store_id) && (!role || role === row.data.role)
    && Object.values(row.data).some(value => value.toLowerCase().includes(search.trim().toLowerCase())))
    .sort((a,b) => (sort.desc ? -1 : 1) * (a.data[sort.key] ?? '').localeCompare(b.data[sort.key] ?? '', 'zh-CN', { numeric:true }));
  const pages = Math.max(1, Math.ceil(filtered.length / size));
  const currentPage = Math.min(page, pages);
  const shown = filtered.slice((currentPage - 1) * size, currentPage * size);
  const allChecked = shown.length > 0 && shown.every(row => selected.includes(row.id));

  async function mutate(path: string, method: string, body: object, message: string) {
    if (busy) return;
    setBusy(true);
    setStatus(undefined);
    try {
      const result = await request<{count:number}>(api + path, method, body);
      setEditing(null); setSync(false); setSelected([]);
      setStatus({text:`${message}，${result.count} 条`});
      await query.refetch();
    } catch (error) {
      setStatus({text: error instanceof Error ? error.message : '操作失败', error: true});
    } finally { setBusy(false); }
  }
  function remove(ids: string[]) {
    if (window.confirm(`确定删除选中的 ${ids.length} 条员工档案？`)) void mutate('?action=delete', 'POST', {ids}, '已删除');
  }
  function exportRows() {
    const csv = (value: string) => '"' + (/^[=+\-@\t\r]/.test(value) ? "'" + value : value).replaceAll('"','""') + '"';
    const rows = [['门店', ...visibleColumns.map(([, label]) => label)], ...filtered.map(row => [storeName(row.store_id), ...visibleColumns.map(([key]) => row.data[key] ?? '')])];
    const url = URL.createObjectURL(new Blob(['\ufeff', rows.map(row => row.map(csv).join(',')).join('\r\n')], { type:'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = '员工档案.csv'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <section className="overflow-hidden rounded-[20px] border bg-white text-sm">
    {status && <OperationStatus role={status.error ? 'alert' : 'status'}>{status.text}</OperationStatus>}
    {busy && <OperationStatus loading>正在处理员工档案</OperationStatus>}
    <div className="flex flex-wrap items-center gap-2 border-b p-3">
      <button type="button" className={primary} disabled={!canEdit || busy} onClick={() => setEditing({id:'', store_id:store || stores[0]?.id || '', data:{loginStatus:'正常'}})}><Plus size={15}/>新增</button>
      <button type="button" className={button} disabled={!canEdit || !selected.length || stores.length < 2 || busy} onClick={() => {setTarget(''); setSync(true);}}>同步其他门店</button>
      <button type="button" className={button + ' text-red-700'} disabled={!canEdit || !selected.length || busy} onClick={() => remove(selected)}>批量删除</button>
      <div className="ml-auto flex flex-wrap gap-2">
        <button type="button" className={button} disabled={!filtered.length || !canEdit} onClick={exportRows}><Download size={15}/>导出</button>
        <input className={input + ' min-w-0'} aria-label="模糊搜索" placeholder="姓名 / 部门 / 电话 / 标签" value={search} onChange={event => {setSearch(event.target.value); setPage(1);}} />
        <button type="button" className={button} aria-expanded={filters} onClick={() => setFilters(!filters)}>筛选搜索</button>
        <button type="button" className={button} aria-expanded={columnsOpen} onClick={() => setColumnsOpen(!columnsOpen)}>设置表头</button>
      </div>
    </div>
    {filters && <div className="flex flex-wrap gap-2 border-b p-3">
      <select aria-label="门店" className={input} value={store} onChange={event => {setStore(event.target.value); setPage(1);}}><option value="">全部授权门店</option>{stores.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      <select aria-label="角色" className={input} value={role} onChange={event => {setRole(event.target.value); setPage(1);}}><option value="">全部角色</option>{[...new Set(all.map(row => row.data.role).filter(Boolean))].map(value => <option key={value}>{value}</option>)}</select>
    </div>}
    {columnsOpen && <div className="flex flex-wrap gap-3 border-b p-3">{columns.map(([key,label]) => <label key={key} className="inline-flex items-center gap-1"><input type="checkbox" checked={!hidden.includes(key)} onChange={() => setHidden(previous => previous.includes(key) ? previous.filter(value => value !== key) : [...previous,key])}/>{label}</label>)}</div>}
    <div className="max-h-[65dvh] overflow-auto">
      <table className="w-full min-w-[960px] text-left">
        <thead className="sticky top-0 bg-[#F5F7F2]"><tr>
          <th className="p-2"><input aria-label="选择本页" type="checkbox" checked={allChecked} onChange={() => setSelected(previous => allChecked ? previous.filter(id => !shown.some(row => row.id === id)) : [...new Set([...previous, ...shown.map(row => row.id)])])}/></th>
          <th className="p-2">操作</th>
          {visibleColumns.map(([key,label]) => <th key={key} className="whitespace-nowrap p-2" aria-sort={sort.key !== key ? 'none' : sort.desc ? 'descending' : 'ascending'}><button type="button" onClick={() => setSort({key,desc:sort.key === key && !sort.desc})}>{label}{sort.key === key ? (sort.desc ? ' ↓' : ' ↑') : ''}</button></th>)}
          <th className="p-2">门店</th>
        </tr></thead>
        <tbody>{shown.map(row => <tr key={row.id} className="border-t even:bg-[#F8F9F5]">
          <td className="p-2"><input type="checkbox" aria-label={`选择 ${row.data.name}`} checked={selected.includes(row.id)} onChange={() => setSelected(previous => previous.includes(row.id) ? previous.filter(id => id !== row.id) : [...previous,row.id])}/></td>
          <td className="whitespace-nowrap p-2"><button type="button" title="编辑" aria-label={`编辑 ${row.data.name}`} className={primary + ' !px-2'} disabled={!canEdit || busy} onClick={() => setEditing(row)}><Pencil size={14}/></button> <button type="button" title="删除" aria-label={`删除 ${row.data.name}`} className={button + ' !px-2 text-red-700'} disabled={!canEdit || busy} onClick={() => remove([row.id])}><Trash2 size={14}/></button></td>
          {visibleColumns.map(([key]) => <td key={key} className="max-w-60 truncate p-2" title={row.data[key]}>{row.data[key] || '—'}</td>)}
          <td className="whitespace-nowrap p-2">{storeName(row.store_id)}</td>
        </tr>)}</tbody>
      </table>
      {!shown.length && <div className="p-10 text-center text-[#73796F]">{debugMode ? '演示模式暂无员工档案' : query.isPending ? '正在加载员工档案…' : query.isError ? '员工档案加载失败' : '暂无符合条件的员工档案'}</div>}
    </div>
    <div className="flex flex-wrap items-center justify-end gap-2 border-t p-3">
      <span>共 {filtered.length} 条 · 已选 {selected.length} 条</span>
      <button type="button" className={button} disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>上一页</button>
      <span>{currentPage} / {pages} 页</span>
      <button type="button" className={button} disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)}>下一页</button>
      <select aria-label="每页条数" className={input} value={size} onChange={event => {setSize(Number(event.target.value)); setPage(1);}}>{[20,50,100].map(value => <option key={value} value={value}>{value} 条/页</option>)}</select>
    </div>
    {editing && <Modal open title={editing.id ? '编辑员工档案' : '新增员工档案'} onClose={() => {if (!busy) setEditing(null);}}>
      <form className="grid gap-3 sm:grid-cols-2" onSubmit={event => {event.preventDefault(); void mutate('', editing.id ? 'PATCH' : 'POST', {...editing,storeId:editing.store_id}, '已保存');}}>
        <label className="grid gap-1">所属门店<select required className={input} value={editing.store_id} onChange={event => setEditing({...editing,store_id:event.target.value})}>{stores.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        {columns.map(([key,label]) => {
          const set = (value:string) => setEditing({...editing,data:{...editing.data,[key]:value}});
          return <label key={key} className="grid gap-1">{label}
            {key === 'gender' || key === 'loginStatus' ? <select className={input} value={editing.data[key] ?? ''} onChange={event => set(event.target.value)}><option value="">未填写</option>{(key === 'gender' ? ['男','女'] : ['正常','限制']).map(value => <option key={value}>{value}</option>)}</select>
              : <input className={input} required={key === 'name'} maxLength={300} value={editing.data[key] ?? ''} onChange={event => set(event.target.value)}/>}
          </label>;
        })}
        <p className="sm:col-span-2 text-xs text-[#73796F]">登录限制和调价额度为档案字段。账号登录及业务授权由权限管理控制。</p>
        <button type="submit" className={primary} disabled={busy}>保存档案</button>
      </form>
    </Modal>}
    {sync && <Modal open title="同步员工档案到其他门店" onClose={() => {if(!busy) setSync(false);}}>
      <p className="mb-3 text-sm">同步选中的 {selected.length} 条档案。同一来源已同步时更新目标门店档案。</p>
      <select aria-label="目标门店" className={input} value={target} onChange={event => setTarget(event.target.value)}><option value="">请选择目标门店</option>{stores.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      <button type="button" className={primary + ' ml-2'} disabled={!target || busy} onClick={() => void mutate('?action=sync','POST',{ids:selected,storeId:target},'已同步')}>确认同步</button>
    </Modal>}
  </section>;
}
