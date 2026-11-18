import { OperationStatus } from '@/src/shared/ui/OperationStatus';
import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { Modal } from '@/src/shared/ui/Modal';
import { PaginationBar } from '@/src/shared/ui/PaginationBar';
import { useAuth } from '@/src/modules/auth/application/AuthContext';
import { NoticeDetailModal } from './NoticeDetailModal';
import { categoryNames, noticesApi, severityNames, type Notice } from '../infrastructure/noticesApi';

export const NoticeBell: React.FC = () => {
  const {debugMode,session}=useAuth();
  const cache=useQueryClient();
  const root=useRef<HTMLDivElement>(null);
  const [open,setOpen]=useState(false);
  const [historyOpen,setHistoryOpen]=useState(false);
  const [status,setStatus]=useState<'all'|'unread'>('all');
  const [page,setPage]=useState(1);
  const [pageSize,setPageSize]=useState(10);
  const [detail,setDetail]=useState<Notice|null>(null);
  const [error,setError]=useState('');
  const count=useQuery({queryKey:['notices','unread-count',session.userId],queryFn:noticesApi.unreadCount,
    enabled:!debugMode,refetchInterval:30000,refetchOnWindowFocus:true});
  const summary=useQuery({queryKey:['notices','inbox','unread',1,session.userId],queryFn:()=>noticesApi.inbox('unread',1,5),enabled:!debugMode && open});
  const history=useQuery({queryKey:['notices','inbox',status,page,pageSize,session.userId],queryFn:()=>noticesApi.inbox(status,page,pageSize),enabled:!debugMode && historyOpen});
  useEffect(()=>{const onDown=(event:MouseEvent)=>{if(root.current && !root.current.contains(event.target as Node)) setOpen(false);};
    const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false);};
    document.addEventListener('mousedown',onDown);document.addEventListener('keydown',onKey);
    return()=>{document.removeEventListener('mousedown',onDown);document.removeEventListener('keydown',onKey);};},[]);
  const read=async(item:Notice)=>{
    setError('');setOpen(false);setHistoryOpen(false);
    try {const full=await noticesApi.detail(item.id);setDetail(full);
      if (!full.readAt) {const result=await noticesApi.markRead(item.id);setDetail({...full,readAt:result.readAt});
        await Promise.all([cache.invalidateQueries({queryKey:['notices','unread-count']}),cache.invalidateQueries({queryKey:['notices','inbox']})]);}
    } catch(cause){setError(cause instanceof Error?cause.message:'公告读取失败');}
  };
  const unread=count.data?.count ?? 0;
  return <><div ref={root} className="relative"><button type="button" onClick={()=>setOpen(v=>!v)} aria-label={`消息通知${unread?`，${unread}条未读`:''}`} className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-[#171916] hover:bg-[#F1F2EE] cursor-pointer"><Bell size={18} />{unread>0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--qsl-brand-dark)] px-1 text-[10px] font-bold text-[var(--qsl-accent-on-dark)]">{unread>99?'99+':unread}</span>}</button>
    {open && <div className="qsl-glass-popover absolute right-0 z-[60] mt-2 w-[min(380px,calc(100vw-24px))] rounded-2xl p-4 shadow-xl"><div className="flex items-center justify-between border-b border-[#171916]/[0.08] pb-3"><div><strong className="text-[15px]">消息通知</strong><span className="ml-2 text-xs text-[#6D736A]">{unread} 条未读</span></div><button type="button" onClick={()=>setOpen(false)} className="text-xs text-[#6D736A] cursor-pointer">关闭</button></div>
      {debugMode?<p className="py-6 text-sm text-[#6D736A]">本地演示登录不连接公告服务，请使用真实账号登录查看。</p>:summary.isLoading?<p className="py-6 text-sm text-[#6D736A]">正在加载…</p>:summary.isError?<p className="py-5 text-sm text-red-700">加载失败：{summary.error.message}</p>:summary.data?.items.length?<div className="max-h-80 space-y-1 overflow-y-auto py-2">{summary.data.items.map(item=><button type="button" key={item.id} onClick={()=>read(item)} className="w-full rounded-xl px-3 py-2.5 text-left hover:bg-[var(--qsl-accent-soft-65)] cursor-pointer"><div className="flex items-center gap-2"><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--qsl-accent)] ring-1 ring-[var(--qsl-accent-border)]" /><strong className="truncate text-sm">{item.title}</strong>{item.severity==='urgent' && <span className="shrink-0 text-[11px] text-red-700">紧急</span>}</div><p className="mt-1 line-clamp-2 pl-3.5 text-xs text-[#6D736A]">{item.content}</p><span className="mt-1 block pl-3.5 text-[11px] text-[#8A9086]">{new Date(item.publishedAt).toLocaleString('zh-CN')}</span></button>)}</div>:<p className="py-7 text-center text-sm text-[#6D736A]">目前没有未读公告</p>}
      <button type="button" onClick={()=>{setOpen(false);setStatus('all');setPage(1);setHistoryOpen(true);}} className="w-full border-t border-[#171916]/[0.08] pt-3 text-center text-sm font-medium cursor-pointer">查看全部历史公告 →</button></div>}
  </div>
  {error && <OperationStatus role="alert">{error}</OperationStatus>}
  <Modal open={historyOpen} onClose={()=>setHistoryOpen(false)} title="我的公告" subtitle="已读与未读记录仅属于当前账号" maxWidthClass="max-w-3xl"><div className="mb-4 flex gap-2">{(['all','unread'] as const).map(value=><button type="button" key={value} onClick={()=>{setStatus(value);setPage(1);}} className={`rounded-full px-4 py-2 text-sm cursor-pointer ${status===value?'bg-[var(--qsl-nav-active-bg)] text-[var(--qsl-nav-active-ink)]':'border border-[#D9DDD4]'}`}>{value==='all'?'全部':'未读'}</button>)}</div>
    {debugMode?<p className="py-8 text-center text-sm text-[#6D736A]">本地演示模式暂无真实公告。</p>:history.isLoading?<p className="py-8 text-sm">正在加载…</p>:history.isError?<p className="py-8 text-sm text-red-700">{history.error.message}</p>:history.data?.items.length?<div className="divide-y divide-[#EEF0E9]">{history.data.items.map(item=><button type="button" key={item.id} onClick={()=>read(item)} className="w-full py-4 text-left hover:bg-[#F8F9F5] cursor-pointer"><div className="flex items-center gap-2"><strong className="text-[15px]">{item.title}</strong>{!item.readAt && <span className="rounded-full bg-[var(--qsl-accent-soft)] border border-[var(--qsl-accent-soft-border)] text-[var(--qsl-accent-soft-ink)] px-2 py-0.5 text-[11px]">未读</span>}</div><p className="mt-1 line-clamp-2 text-sm text-[#6D736A]">{item.content}</p><div className="mt-2 text-xs text-[#8A9086]">{categoryNames[item.category]} · {severityNames[item.severity]} · {new Date(item.publishedAt).toLocaleString('zh-CN')}</div></button>)}</div>:<p className="py-8 text-center text-sm text-[#6D736A]">没有公告记录</p>}
    <PaginationBar compact className="mt-4" total={history.data?.total ?? 0} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={next=>{setPageSize(next);setPage(1);}} />
  </Modal><NoticeDetailModal notice={detail} onClose={()=>setDetail(null)} /></>;
};
