import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Megaphone, Search, Send } from 'lucide-react';
import { useAuth } from '@/src/modules/auth/application/AuthContext';
import { STORE_CATALOG } from '@/src/modules/auth/domain/identity';
import { ErrorState, LoadingSkeleton, NoPermissionState } from '@/src/shared/ui/StateViews';
import { Modal } from '@/src/shared/ui/Modal';
import { NoticeDetailModal } from './NoticeDetailModal';
import { categoryNames, noticesApi, severityNames, type Notice, type NoticeAudience, type NoticeCategory, type NoticeSeverity } from '../infrastructure/noticesApi';

const emptyAudience = (): NoticeAudience => ({ mode:'all',roleIds:[],userIds:[],storeIds:[] });
export const NoticeAdminPage: React.FC = () => {
  const {session,hasPermission,debugMode} = useAuth();
  const cache=useQueryClient();
  const [title,setTitle]=useState('');
  const [category,setCategory]=useState<NoticeCategory>('general');
  const [severity,setSeverity]=useState<NoticeSeverity>('normal');
  const [content,setContent]=useState('');
  const [audience,setAudience]=useState<NoticeAudience>(emptyAudience);
  const [scheduleAt,setScheduleAt]=useState('');
  const [userSearch,setUserSearch]=useState('');
  const [search,setSearch]=useState('');
  const [keyword,setKeyword]=useState('');
  const [page,setPage]=useState(1);
  const [publishing,setPublishing]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [detail,setDetail]=useState<Notice|null>(null);
  const [receiptNotice,setReceiptNotice]=useState<Notice|null>(null);
  const allowed=!debugMode && session.identityType==='admin' && hasPermission('system.notice.publish');
  const recipients=useQuery({queryKey:['notices','recipients'],queryFn:noticesApi.recipients,enabled:allowed});
  const history=useQuery({queryKey:['notices','admin',page,search],queryFn:()=>noticesApi.adminList(page,search),enabled:allowed,refetchInterval:30000});
  const receipts=useQuery({queryKey:['notices','receipts',receiptNotice?.id],queryFn:()=>noticesApi.receipts(receiptNotice!.id),enabled:allowed && Boolean(receiptNotice),refetchInterval:15000});
  const users=recipients.data?.users ?? [];
  const filteredUsers=users.filter(u=>`${u.display_name} ${u.username} ${u.role_name}`.toLowerCase().includes(userSearch.toLowerCase())).slice(0,100);
  const previewCount=useMemo(()=>users.filter(u=>(!audience.storeIds.length || u.store_ids.some(id=>audience.storeIds.includes(id)))
    && (audience.mode==='all' || audience.mode==='roles' && audience.roleIds.includes(u.role_id)
      || audience.mode==='users' && audience.userIds.includes(u.id))).length,[users,audience]);
  const toggle=(key:'roleIds'|'userIds'|'storeIds',id:string)=>setAudience(prev=>({ ...prev,[key]:prev[key].includes(id)?prev[key].filter(v=>v!==id):[...prev[key],id] }));
  const publish=async()=>{
    if (!title.trim() || !content.trim()) {setError('请填写标题和正文。');return;}
    if (!previewCount) {setError('当前接收范围没有有效用户。');return;}
    setPublishing(true);setError('');setNotice('');
    try {const result=await noticesApi.publish({title:title.trim(),category,severity,content:content.trim(),audience,
      ...(scheduleAt?{publishAt:new Date(scheduleAt).toISOString()}:{})});
      setTitle('');setContent('');setAudience(emptyAudience());setScheduleAt('');setNotice(`公告已${scheduleAt?'排期':'发布'}，接收用户 ${result.recipientCount} 人。`);
      await Promise.all([cache.invalidateQueries({queryKey:['notices','admin']}),cache.invalidateQueries({queryKey:['notices','inbox']}),cache.invalidateQueries({queryKey:['notices','unread-count']})]);
    } catch(cause) {setError(cause instanceof Error?cause.message:'发布失败');} finally {setPublishing(false);}
  };
  if (debugMode) return <div className="rounded-[22px] border border-[#D9DDD4] bg-white p-8 text-sm text-[#6D736A]">演示登录不连接公告服务。请使用真实管理员账号登录，发布公告并查看阅读情况。</div>;
  if (!allowed) return <NoPermissionState moduleLabel="内部公告" requiredPermission="system.notice.publish" />;
  return <div className="space-y-6"><div><h2 className="text-[26px] font-semibold text-[#171916]">内部公告</h2><p className="mt-1 text-sm text-[#6D736A]">发布给指定用户、角色或全部成员；每位接收人独立保留历史与已读状态。</p></div>
    {notice && <p role="status" className="rounded-xl border border-[#BBF7D0] bg-[#ECFDF3] p-3 text-sm text-[#166534]">{notice}</p>}
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <section className="rounded-[22px] border border-[#D9DDD4] bg-white p-5 sm:p-6"><div className="flex items-center gap-2 border-b border-[#E5E8E0] pb-4"><Megaphone size={20} /><h3 className="text-lg font-semibold">发布公告</h3></div>
      <div className="mt-5 grid gap-4 md:grid-cols-3"><label className="text-sm">公告类型<select value={category} onChange={e=>setCategory(e.target.value as NoticeCategory)} className="mt-2 block w-full rounded-xl border border-[#D9DDD4] bg-white px-3 py-2.5">{Object.entries(categoryNames).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
        <label className="text-sm">消息级别<select value={severity} onChange={e=>setSeverity(e.target.value as NoticeSeverity)} className="mt-2 block w-full rounded-xl border border-[#D9DDD4] bg-white px-3 py-2.5">{Object.entries(severityNames).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
        <label className="text-sm">发送时间 <span className="text-[#8B9088]">留空立即发布</span><input type="datetime-local" value={scheduleAt} onChange={e=>setScheduleAt(e.target.value)} className="mt-2 block w-full rounded-xl border border-[#D9DDD4] bg-white px-3 py-2" /></label></div>
      <label className="mt-4 block text-sm">标题 <span className="text-red-600">*</span><input value={title} maxLength={160} onChange={e=>setTitle(e.target.value)} placeholder="输入公告标题" className="mt-2 block w-full rounded-xl border border-[#D9DDD4] px-3 py-2.5" /></label>
      <label className="mt-4 block text-sm">正文 <span className="text-red-600">*</span><textarea value={content} maxLength={20000} onChange={e=>setContent(e.target.value)} rows={7} placeholder="输入公告内容，可换行排版" className="mt-2 block w-full resize-y rounded-xl border border-[#D9DDD4] px-3 py-2.5 leading-7" /><span className="block text-right text-xs text-[#73796F]">{content.length}/20000</span></label>
      <div className="mt-5 border-t border-[#E5E8E0] pt-5"><h4 className="font-semibold">接收范围</h4><p className="mt-1 text-xs text-[#73796F]">发布时固定接收人名单；未来新建账号不会自动看到旧公告。</p>
        <div className="mt-3 flex flex-wrap gap-2">{([['all','全部用户'],['roles','指定角色'],['users','指定用户']] as const).map(([value,label])=><button type="button" key={value} onClick={()=>setAudience({...emptyAudience(),mode:value,storeIds:audience.storeIds})} className={`rounded-full px-4 py-2 text-sm ${audience.mode===value?'bg-[#171916] text-white':'border border-[#D9DDD4] bg-white'}`}>{label}</button>)}</div>
        <div className="mt-4 flex flex-wrap gap-2"><span className="py-2 text-xs text-[#6D736A]">门店筛选：</span>{STORE_CATALOG.map(store=><label key={store.id} className="flex items-center gap-1 rounded-full border border-[#E1E4DB] px-3 py-1.5 text-xs"><input type="checkbox" checked={audience.storeIds.includes(store.id)} onChange={()=>toggle('storeIds',store.id)} />{store.name}</label>)}</div>
        {audience.mode==='roles' && <div className="mt-4 flex flex-wrap gap-2">{recipients.data?.roles.map(role=><label key={role.id} className="flex items-center gap-1 rounded-xl border border-[#E1E4DB] px-3 py-2 text-sm"><input type="checkbox" checked={audience.roleIds.includes(role.id)} onChange={()=>toggle('roleIds',role.id)} />{role.name}</label>)}</div>}
        {audience.mode==='users' && <div className="mt-4"><label className="flex max-w-md items-center gap-2 rounded-xl border border-[#D9DDD4] px-3 py-2"><Search size={15} /><input aria-label="搜索接收用户" value={userSearch} onChange={e=>setUserSearch(e.target.value)} placeholder="搜索姓名、账号、角色" className="w-full text-sm outline-none" /></label><div className="mt-2 grid max-h-56 gap-2 overflow-y-auto sm:grid-cols-2 xl:grid-cols-3">{filteredUsers.map(user=><label key={user.id} className="flex items-center gap-2 rounded-xl border border-[#E1E4DB] px-3 py-2 text-sm"><input type="checkbox" checked={audience.userIds.includes(user.id)} onChange={()=>toggle('userIds',user.id)} /><span>{user.display_name}<small className="ml-2 text-[#73796F]">{user.role_name}</small></span></label>)}</div></div>}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><span className="text-sm text-[#5F645D]">预计接收 <strong className="text-[#171916]">{previewCount}</strong> 人 · 发布人 {session.displayName}</span><button type="button" onClick={publish} disabled={publishing || recipients.isLoading || !previewCount} className="inline-flex items-center gap-2 rounded-xl bg-[#D7FF00] px-5 py-2.5 font-semibold disabled:opacity-50"><Send size={16} />{publishing?'发布中…':scheduleAt?'安排发送':'发布公告'}</button></div>
        {recipients.isError && <p className="mt-2 text-sm text-red-700">接收人列表加载失败：{recipients.error.message}</p>}
      </div></section>
    <section className="rounded-[22px] border border-[#D9DDD4] bg-white p-5 sm:p-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><h3 className="text-lg font-semibold">发布记录</h3><p className="mt-1 text-xs text-[#73796F]">按接收名单统计已读与未读。</p></div><div className="flex gap-2"><input aria-label="搜索公告" value={keyword} onChange={e=>setKeyword(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){setPage(1);setSearch(keyword);}}} placeholder="标题或正文" className="rounded-xl border border-[#D9DDD4] px-3 py-2 text-sm" /><button type="button" onClick={()=>{setPage(1);setSearch(keyword);}} className="rounded-xl border border-[#D9DDD4] px-3 py-2 text-sm">搜索</button></div></div>
      <div className="mt-5">{history.isLoading?<LoadingSkeleton />:history.isError?<ErrorState message={history.error.message} onRetry={()=>history.refetch()} />:history.data?.items.length?<div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="border-b border-[#D9DDD4] bg-[#F8F9F5] text-[#6D736A]"><tr><th className="px-3 py-3">公告</th><th>级别</th><th>发送时间</th><th>接收</th><th>已读</th><th>未读</th><th>状态</th><th>操作</th></tr></thead><tbody>{history.data.items.map(item=><tr key={item.id} className="border-b border-[#EEF0E9]"><td className="px-3 py-3"><button type="button" onClick={()=>setDetail(item)} className="font-medium text-[#171916] hover:underline">{item.title}</button><div className="mt-1 text-xs text-[#73796F]">{categoryNames[item.category]} · {item.publisherName}</div></td><td>{severityNames[item.severity]}</td><td>{new Date(item.publishedAt).toLocaleString('zh-CN')}</td><td>{item.recipientCount}</td><td>{item.readCount}</td><td>{item.unreadCount}</td><td>{item.scheduled?'待发送':item.unreadCount===0?'全部已读':'部分未读'}</td><td><button type="button" onClick={()=>setReceiptNotice(item)} className="rounded-lg border border-[#D9DDD4] px-2 py-1 text-xs hover:bg-[#ECF9A8]">阅读情况</button></td></tr>)}</tbody></table></div>:<p className="py-12 text-center text-sm text-[#73796F]">暂无公告记录</p>}</div>
      <div className="mt-4 flex items-center justify-between text-xs text-[#73796F]"><span>共 {history.data?.total ?? 0} 条</span><div className="flex gap-2"><button type="button" disabled={page<=1} onClick={()=>setPage(page-1)} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">上一页</button><span className="px-2 py-1.5">{page}</span><button type="button" disabled={!history.data || page*20>=history.data.total} onClick={()=>setPage(page+1)} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">下一页</button></div></div>
    </section><NoticeDetailModal notice={detail} onClose={()=>setDetail(null)} />
    <Modal open={Boolean(receiptNotice)} onClose={()=>setReceiptNotice(null)} title={`阅读情况 · ${receiptNotice?.title ?? ''}`} subtitle={receipts.data ? `接收 ${receipts.data.total} 人 · ${receipts.data.allRead?'全部已读':'仍有未读'}` : undefined} maxWidthClass="max-w-6xl">
      {receipts.isLoading?<LoadingSkeleton />:receipts.isError?<ErrorState message={receipts.error.message} onRetry={()=>receipts.refetch()} />:<div className="max-h-[60vh] overflow-auto"><table className="w-full min-w-[1000px] table-fixed text-left text-sm"><colgroup><col style={{width:180}} /><col style={{width:160}} /><col /><col style={{width:90}} /><col style={{width:190}} /></colgroup><thead className="sticky top-0 bg-[#F8F9F5]"><tr><th className="px-4 py-3 whitespace-nowrap">接收人</th><th className="px-4 py-3 whitespace-nowrap">发布时角色</th><th className="px-4 py-3 whitespace-nowrap">发布时门店</th><th className="px-4 py-3 whitespace-nowrap">状态</th><th className="px-4 py-3 whitespace-nowrap">阅读时间</th></tr></thead><tbody>{receipts.data?.items.map(row=><tr key={row.user_id} className="border-t border-[#EEF0E9]"><td className="px-4 py-4 align-top">{row.display_name}<small className="block mt-1 text-[#8A9086]">{row.username}</small></td><td className="px-4 py-4 align-top leading-6">{row.recipient_role_name}</td><td className="px-4 py-4 align-top leading-6">{row.recipient_store_ids.map(id=>STORE_CATALOG.find(store=>store.id===id)?.name ?? id).join('、') || '供应商'}</td><td className={`px-4 py-4 align-top whitespace-nowrap ${row.read_at?'text-[#166534]':'font-semibold text-[#A16207]'}`}>{row.read_at?'已读':'未读'}</td><td className="px-4 py-4 align-top leading-6">{row.read_at?new Date(row.read_at).toLocaleString('zh-CN'):'—'}</td></tr>)}</tbody></table></div>}
    </Modal>
  </div>;
};
