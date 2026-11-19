import React, { useEffect, useState } from 'react';
import { useAuth } from '@/src/modules/auth/application/AuthContext';
export function SessionPolicySettings(){
 const {session,debugMode,hasPermission}=useAuth();
 const [minutes,setMinutes]=useState('30'),[saved,setSaved]=useState<number|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const allowed=session.identityType==='admin'&&hasPermission('system.read');
 const endpoint=`${import.meta.env.BASE_URL}api/system/session-policy`;
 useEffect(()=>{let active=true;if(debugMode)return;fetch(endpoint,{credentials:'same-origin'}).then(async r=>{const b=await r.json();if(!r.ok)throw new Error(b.error||'读取失败');if(active){setMinutes(String(b.idle_timeout_minutes));setSaved(b.idle_timeout_minutes);}}).catch(()=>{if(active)setMessage('无法读取会话设置，请刷新重试');});return()=>{active=false;};},[debugMode]);
 const save=async()=>{const n=Number(minutes);if(!Number.isInteger(n)||n<1||n>1440){setMessage('请输入 1～1440 之间的整数分钟');return;}setBusy(true);setMessage('');try{const r=await fetch(endpoint,{method:'PUT',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({idle_timeout_minutes:n})});const b=await r.json();if(!r.ok)throw new Error(b.error||'保存失败');setSaved(b.idle_timeout_minutes);setMessage('已保存，对所有真实登录会话生效');}catch(e){setMessage(e instanceof Error?e.message:'保存失败');}finally{setBusy(false);}};
 return <section className="rounded-[22px] border border-[#D9DDD4] bg-white p-4 sm:p-5">
  <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-base font-semibold">登录与会话安全</h2><p className="mt-1 text-sm text-[#73796F]">全系统统一设置 · 后台自动刷新不计为用户操作</p></div><span className="rounded-full bg-[#F2F4ED] px-3 py-1 text-xs">全局参数</span></div>
  <div className="mt-4 flex flex-wrap items-center gap-3"><label htmlFor="session-idle-minutes" className="text-sm font-medium">无操作自动退出</label><input id="session-idle-minutes" type="number" min={1} max={1440} step={1} value={minutes} disabled={!allowed||debugMode||saved===null||busy} onChange={e=>setMinutes(e.target.value)} className="h-10 w-24 rounded-xl border border-[#D9DDD4] px-3 tabular-nums"/><span className="text-sm">分钟</span><button type="button" disabled={!allowed||debugMode||busy||saved===null||Number(minutes)===saved} onClick={()=>void save()} className="h-10 rounded-xl bg-[var(--qsl-accent)] px-4 text-sm text-[var(--qsl-accent-ink)] hover:bg-[var(--qsl-accent-hover)] disabled:opacity-40">{busy?'保存中…':'保存会话设置'}</button></div>
  <p className="mt-2 text-xs text-[#73796F]">支持 1～1440 分钟，默认 30 分钟。缩短时间可能使已闲置的会话立即失效。此设置单独保存，不随门店参数同步。</p>
  {(debugMode||!allowed)&&<p className="mt-2 text-sm text-[#73796F]">{debugMode?'演示模式不连接会话策略，请使用真实管理员登录。':'仅系统管理员可修改。'}</p>}
  {message&&<p role="status" className="mt-2 text-sm">{message}</p>}
 </section>;
}
