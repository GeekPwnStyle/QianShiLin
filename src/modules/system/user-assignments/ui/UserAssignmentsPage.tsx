import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Search, Shield } from 'lucide-react';
import { useAuth } from '@/src/modules/auth/application/AuthContext';
import { STORE_CATALOG } from '@/src/modules/auth/domain/identity';
import { Button } from '@/src/shared/ui/Button';
import { ErrorState, LoadingSkeleton, NoPermissionState } from '@/src/shared/ui/StateViews';

type UserAccess = { id: string; username: string; display_name: string; status: string;
  role_id: string; role_name: string; identity_type: 'admin' | 'store' | 'supplier';
  store_ids: string[]; permission_denies: string[]; permissions: string[]; updated_at: string };
const base = `${import.meta.env.BASE_URL}api`;
async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`${base}${path}`, { method, credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body) });
  const value = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(value.error ?? `请求失败（${response.status}）`);
  return value as T;
}

export const UserAssignmentsPage: React.FC = () => {
  const { session, allRoles, hasPermission } = useAuth();
  const cache = useQueryClient();
  const [keyword,setKeyword] = useState('');
  const [selectedId,setSelectedId] = useState<string | null>(null);
  const [roleId,setRoleId] = useState('');
  const [storeIds,setStoreIds] = useState<string[]>([]);
  const [denies,setDenies] = useState<string[]>([]);
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const canManage = session.identityType === 'admin' && hasPermission('system.user.manage');
  const users = useQuery({ queryKey:['system-users'], queryFn:() => request<UserAccess[]>('/system/users'), enabled:canManage });
  const selected = users.data?.find(user => user.id === selectedId) ?? users.data?.[0];
  useEffect(() => {
    if (!selected) return;
    setSelectedId(selected.id); setRoleId(selected.role_id); setStoreIds(selected.store_ids);
    setDenies(selected.permission_denies); setError('');
  },[selected?.id,selected?.role_id,selected?.updated_at]);
  const role = allRoles.find(item => item.id === roleId);
  const allowedRoles = allRoles.filter(item => item.identityType === selected?.identity_type);
  const filtered = useMemo(() => (users.data ?? []).filter(user =>
    `${user.display_name} ${user.username} ${user.role_name}`.toLowerCase().includes(keyword.trim().toLowerCase())),[users.data,keyword]);
  const changed = Boolean(selected && (roleId !== selected.role_id
    || [...storeIds].sort().join('|') !== [...selected.store_ids].sort().join('|')
    || [...denies].sort().join('|') !== [...selected.permission_denies].sort().join('|')));
  const save = async () => {
    if (!selected) return;
    setSaving(true); setError(''); setNotice('');
    try {
      await request(`/system/users/${selected.id}`,'PUT',{ roleId,storeIds,permissionDenies:denies });
      await cache.invalidateQueries({ queryKey:['system-users'] });
      setNotice(`已保存 ${selected.display_name} 的角色、门店范围和个人减权设置。`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : '保存失败'); }
    finally { setSaving(false); }
  };
  if (!canManage) return <NoPermissionState moduleLabel="用户权限分配" requiredPermission="system.user.manage" />;
  if (users.isLoading) return <LoadingSkeleton />;
  if (users.isError) return <ErrorState message={users.error.message} onRetry={() => users.refetch()} />;
  return <div className="space-y-5">
    <div><h2 className="text-[25px] font-semibold text-[#171916]">用户权限分配</h2>
      <p className="mt-1 text-sm text-[#6D736A]">为真实登录账号绑定角色与授权门店，并对个人权限做收紧设置。</p>
      <p className="mt-2 text-xs text-[#73796F]">个人权限只能从所属角色中扣除；变更写入审计。已登录的用户需重新登录后刷新门店范围。</p></div>
    {notice && <p role="status" className="rounded-xl border border-[#BBF7D0] bg-[#ECFDF3] p-3 text-sm text-[#166534]">{notice}</p>}
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[310px_minmax(0,1fr)]">
      <section className="rounded-[20px] border border-[#D9DDD4] bg-white p-4">
        <div className="flex items-center gap-2 border-b border-[#E5E8E0] pb-3"><Shield className="h-4 w-4" /><h3 className="font-semibold">账号列表</h3><span className="ml-auto text-xs text-[#73796F]">{filtered.length} 人</span></div>
        <label className="my-3 flex h-10 items-center gap-2 rounded-xl border border-[#D9DDD4] px-3"><Search className="h-4 w-4 text-[#73796F]" />
          <input aria-label="搜索账号" className="w-full outline-none" value={keyword} onChange={event => setKeyword(event.target.value)} placeholder="姓名 / 账号 / 角色" /></label>
        <div className="max-h-[65vh] space-y-2 overflow-y-auto">{filtered.map(user => <button key={user.id} type="button" onClick={() => setSelectedId(user.id)}
          className={`w-full rounded-xl border p-3 text-left cursor-pointer ${selected?.id === user.id ? 'border-[#171916] bg-[#ECF9A8]' : 'border-[#E5E8E0] bg-[#F8F9F5] hover:bg-white'}`}>
          <span className="block font-medium text-[#171916]">{user.display_name} <span className="text-xs font-normal text-[#73796F]">{user.username}</span></span>
          <span className="mt-1 block text-xs text-[#5F645D]">{user.role_name} · {user.store_ids.length ? `${user.store_ids.length} 家门店` : '供应商范围'}</span>
        </button>)}</div>
      </section>
      {selected && <section className="space-y-5 rounded-[20px] border border-[#D9DDD4] bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E8E0] pb-4">
          <div><h3 className="text-lg font-semibold">{selected.display_name} · 权限配置</h3><p className="text-sm text-[#73796F]">账号 {selected.username} · {selected.status === 'active' ? '启用' : selected.status}</p></div>
          <Button variant="primary" disabled={!changed} loading={saving} onClick={save} icon={<Check className="h-4 w-4" />}>保存分配</Button>
        </div>
        <div><label className="text-sm font-semibold">所属角色</label><select aria-label="所属角色" value={roleId} onChange={event => {setRoleId(event.target.value);setDenies([]);}}
          disabled={selected.username === 'admin'} className="mt-2 block h-10 w-full max-w-md rounded-xl border border-[#D9DDD4] px-3">
          {allowedRoles.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <p className="mt-1 text-xs text-[#73796F]">角色定义可在“角色权限管理”中统一编辑；管理员保底权限不可撤销。</p></div>
        {selected.identity_type !== 'supplier' && <div><h4 className="text-sm font-semibold">授权门店范围</h4><div className="mt-2 grid gap-2 sm:grid-cols-2">
          {STORE_CATALOG.map(store => <label key={store.id} className="flex items-center gap-2 rounded-xl border border-[#E5E8E0] bg-[#F8F9F5] p-3 text-sm">
            <input type="checkbox" checked={storeIds.includes(store.id)} disabled={selected.username === 'admin'} onChange={event => setStoreIds(previous => event.target.checked ? [...previous,store.id] : previous.filter(id => id !== store.id))} />{store.name}</label>)}
        </div></div>}
        <div><h4 className="text-sm font-semibold">个人权限收紧 <span className="font-normal text-[#73796F]">已禁用 {denies.length} 项</span></h4>
          <p className="mt-1 text-xs text-[#73796F]">下列权限来自角色。勾选“个人禁用”后，该账号即使角色允许也无法使用。</p>
          <div className="mt-3 grid max-h-[44vh] gap-2 overflow-y-auto sm:grid-cols-2 xl:grid-cols-3">
            {role?.permissions.map(code => <label key={code} className="flex items-center gap-2 rounded-xl border border-[#E5E8E0] bg-[#F8F9F5] p-2.5 text-xs">
              <input type="checkbox" checked={denies.includes(code)} disabled={selected.username === 'admin'} onChange={event => setDenies(previous => event.target.checked ? [...previous,code] : previous.filter(item => item !== code))} />
              <span className="font-mono break-all">{code}</span></label>)}
          </div></div>
        {error && <p role="alert" className="text-sm text-[#9C3232]">{error}</p>}
      </section>}
    </div>
  </div>;
};
