import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useAuth } from '@/src/modules/auth/application/AuthContext';
import { ErrorState, LoadingSkeleton, NoPermissionState } from '@/src/shared/ui/StateViews';

type LogRow = { id:string; category:string; action:string; target:string | null;
  details:Record<string,unknown>; ip_address:string | null; client_type:string;
  created_at:string; actor_name:string | null; actor_role_name:string | null };
type LogResult = { items:LogRow[]; total:number; page:number; pageSize:number };
const base = `${import.meta.env.BASE_URL}api`;

export const OperationLogsPage:React.FC = () => {
  const { session,hasPermission }=useAuth();
  const [month,setMonth]=useState(new Date().toISOString().slice(0,7));
  const [draft,setDraft]=useState('');
  const [search,setSearch]=useState('');
  const [page,setPage]=useState(1);
  const allowed=session.identityType==='admin' && hasPermission('system.read');
  const logs=useQuery({queryKey:['system-operation-logs',month,search,page],enabled:allowed,queryFn:async()=>{
    const query=new URLSearchParams({month,search,page:String(page),pageSize:'20'});
    const response=await fetch(`${base}/system/operation-logs?${query}`,{credentials:'same-origin'});
    const body=await response.json();
    if (!response.ok) throw new Error(body.error ?? '加载操作日志失败');
    return body as LogResult;
  }});
  if (!allowed) return <NoPermissionState moduleLabel="操作日志" requiredPermission="system.read" />;
  return <div className="space-y-5">
    <div><h2 className="text-[25px] font-semibold text-[#171916]">操作日志</h2>
      <p className="mt-1 text-sm text-[#6D736A]">按月份、项目、操作或操作人检索。记录登录、退出和权限配置变更。</p></div>
    <form className="flex flex-wrap items-end gap-3 rounded-[20px] border border-[#D9DDD4] bg-white p-4" onSubmit={event=>{event.preventDefault();setPage(1);setSearch(draft.trim());}}>
      <label className="text-xs text-[#6D736A]">选择月份<input aria-label="选择月份" type="month" value={month} onChange={event=>{setMonth(event.target.value);setPage(1);}} className="mt-1 block h-10 rounded-xl border border-[#D9DDD4] bg-[#F8F9F5] px-3 text-sm text-[#171916]" /></label>
      <label className="flex h-10 min-w-[230px] flex-1 items-center gap-2 rounded-xl border border-[#D9DDD4] bg-[#F8F9F5] px-3"><Search className="h-4 w-4 text-[#73796F]"/><input aria-label="搜索日志" placeholder="项目 / 操作 / 操作人" value={draft} onChange={event=>setDraft(event.target.value)} className="w-full bg-transparent text-sm outline-none" /></label>
      <button type="submit" className="h-10 rounded-xl bg-[var(--qsl-brand-dark)] hover:bg-[var(--qsl-brand-dark-hover)] px-5 text-sm text-white cursor-pointer transition-colors">搜索</button>
    </form>
    {logs.isLoading ? <LoadingSkeleton/> : logs.isError ? <ErrorState message={logs.error.message} onRetry={()=>logs.refetch()}/> : <section className="overflow-hidden rounded-[20px] border border-[#D9DDD4] bg-white">
      <div className="flex items-center justify-between border-b border-[#E5E8E0] px-5 py-4"><h3 className="font-semibold">审计记录</h3><span className="text-xs text-[#73796F]">共 {logs.data?.total ?? 0} 条</span></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="bg-[#F8F9F5] text-[#686F65]"><tr>{['项目','操作','操作人','用户角色','操作时间','操作IP','客户端','操作详情'].map(label=><th key={label} className="px-5 py-3 font-medium">{label}</th>)}</tr></thead>
        <tbody className="divide-y divide-[#E9ECE5]">{logs.data?.items.map(row=><tr key={row.id} className="hover:bg-[#FAFBF5]"><td className="px-5 py-3 font-medium">{row.category}</td><td className="px-5 py-3">{row.action}</td><td className="px-5 py-3">{row.actor_name ?? '系统'}</td><td className="px-5 py-3">{row.actor_role_name ?? '—'}</td><td className="whitespace-nowrap px-5 py-3">{new Date(row.created_at).toLocaleString('zh-CN',{hour12:false})}</td><td className="px-5 py-3 font-mono text-xs">{row.ip_address ?? '—'}</td><td className="px-5 py-3">{row.client_type}</td><td className="px-5 py-3 text-[#6D736A]">{row.details.username as string ?? row.details.role as string ?? row.target ?? '—'}</td></tr>)}</tbody></table>
      {logs.data?.items.length===0 && <p className="px-5 py-12 text-center text-sm text-[#73796F]">该条件下暂无操作记录</p>}</div>
      <div className="flex items-center justify-end gap-3 border-t border-[#E5E8E0] px-5 py-3 text-sm"><button disabled={page===1} onClick={()=>setPage(value=>value-1)} className="disabled:opacity-40">上一页</button><span>{page} / {Math.max(1,Math.ceil((logs.data?.total ?? 0)/20))}</span><button disabled={page*20 >= (logs.data?.total ?? 0)} onClick={()=>setPage(value=>value+1)} className="disabled:opacity-40">下一页</button></div>
    </section>}
  </div>;
};
