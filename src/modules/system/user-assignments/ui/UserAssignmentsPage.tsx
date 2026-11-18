import { OperationStatus } from '@/src/shared/ui/OperationStatus';
import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useAuth } from '@/src/modules/auth/application/AuthContext';
import { STORE_CATALOG } from '@/src/modules/auth/domain/identity';
import { ACCESS_TREE, withAction, type AccessAction } from '@/src/modules/system/access-matrix/domain/accessMatrix';
import { AccessMenuTree, AccessSummaryTable, PermissionEditor } from '@/src/modules/system/access-matrix/ui/AccessMatrix';
import type { NavNode } from '@/src/modules/navigation/domain/menuRegistry';
import { ErrorState, LoadingSkeleton, NoPermissionState } from '@/src/shared/ui/StateViews';

type UserAccess = { id: string; username: string; display_name: string; status: string;
  role_id: string; role_name: string; identity_type: 'admin' | 'store' | 'supplier';
  store_ids: string[]; permission_denies: string[]; permissions: string[]; updated_at: string };
type Draft = { user: UserAccess; roleId: string; storeIds: string[]; denies: string[] };
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
  const [selected, setSelected] = useState<NavNode>(ACCESS_TREE[1]);
  const [filter, setFilter] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const canManage = session.identityType === 'admin' && hasPermission('system.user.manage');
  const users = useQuery({ queryKey: ['system-users'], queryFn: () => request<UserAccess[]>('/system/users'), enabled: canManage });
  const filtered = useMemo(() => (users.data ?? []).filter(u => `${u.display_name} ${u.username} ${u.role_name}`.toLowerCase().includes(filter.trim().toLowerCase())), [users.data, filter]);
  const role = allRoles.find(r => r.id === draft?.roleId);
  const effective = role?.permissions.filter(code => !draft?.denies.includes(code)) ?? [];
  const change = (node: NavNode, action: AccessAction, enabled: boolean) => setDraft(old => {
    if (!old || !role || old.user.username === 'admin') return old;
    const nextEffective = withAction(role.permissions.filter(code => !old.denies.includes(code)), node, action, enabled);
    // Individual assignments can only remove role rights, never grant absent rights.
    const next = new Set(nextEffective.filter(code => role.permissions.includes(code)));
    return { ...old, denies: role.permissions.filter(code => !next.has(code)) };
  });
  const save = async () => {
    if (!draft) return;
    setSaving(true); setError(''); setNotice('');
    try { await request(`/system/users/${draft.user.id}`, 'PUT', { roleId: draft.roleId, storeIds: draft.storeIds, permissionDenies: draft.denies });
      await cache.invalidateQueries({ queryKey: ['system-users'] }); setDraft(null); setNotice('员工角色、门店范围及个人权限已保存。');
    } catch (cause) { setError(cause instanceof Error ? cause.message : '保存失败'); } finally { setSaving(false); }
  };
  useEffect(() => { if (draft && users.data && !users.data.some(u => u.id === draft.user.id)) setDraft(null); }, [users.data, draft]);
  if (!canManage) return <NoPermissionState moduleLabel="用户权限分配" requiredPermission="system.user.manage" />;
  if (users.isLoading) return <LoadingSkeleton />;
  if (users.isError) return <ErrorState message={users.error.message} onRetry={() => users.refetch()} />;
  return <div className="space-y-5">
    <div><h2 className="text-[25px] font-semibold text-[#171916]">用户权限分配</h2><p className="mt-1 text-sm text-[#6D736A]">按菜单核对员工的实际权限，编辑时逐项调整角色授权内的操作。</p></div>
    <div className="rounded-xl border border-[var(--qsl-accent-soft-border)] bg-[var(--qsl-accent-soft-35)] px-4 py-3 text-xs text-[#5F645D]">员工权限继承角色，只能收紧；超级管理员权限锁定。门店范围由服务端强制校验，变更写入操作审计。</div>
    {notice && <OperationStatus role="status">{notice}</OperationStatus>}
    {error && <OperationStatus role="alert">{error}</OperationStatus>}
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[260px_minmax(0,1fr)]"><AccessMenuTree selected={selected} onSelect={setSelected} /><div className="space-y-3"><label className="flex max-w-sm items-center gap-2 rounded-xl border border-[#D9DDD4] bg-white px-3 py-2"><Search size={15} /><input aria-label="搜索员工" value={filter} onChange={e => setFilter(e.target.value)} placeholder="姓名 / 账号 / 角色" className="w-full text-sm outline-none" /></label><AccessSummaryTable subjects={filtered} selected={selected} nameOf={u => u.display_name} subtitleOf={u => u.role_name} codesOf={u => u.permissions.filter(code => !u.permission_denies.includes(code))} onEdit={user => { setError(''); setDraft({ user, roleId: user.role_id, storeIds: [...user.store_ids], denies: [...user.permission_denies] }); }} /></div></div>
    {draft && <PermissionEditor title={`编辑员工权限 · ${draft.user.display_name}`} codes={effective} onChange={change} onClose={() => setDraft(null)} onSave={save} saving={saving} locked={draft.user.username === 'admin' ? role?.permissions ?? [] : []} allowedCodes={role?.permissions ?? []} header={<div className="space-y-3 text-sm"><div className="flex flex-wrap items-center gap-4"><span>账号：<strong>{draft.user.username}</strong></span><label>角色：<select aria-label="所属角色" value={draft.roleId} disabled={draft.user.username === 'admin'} onChange={e => setDraft({ ...draft, roleId: e.target.value, denies: [] })} className="ml-2 rounded-lg border border-[#D9DDD4] px-2 py-1">{allRoles.filter(r => r.identityType === draft.user.identity_type).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label></div>{draft.user.identity_type !== 'supplier' && <div className="flex flex-wrap items-center gap-3">授权门店：{STORE_CATALOG.map(store => <label key={store.id} className="flex items-center gap-1"><input type="checkbox" checked={draft.storeIds.includes(store.id)} disabled={draft.user.username === 'admin'} onChange={e => setDraft({ ...draft, storeIds: e.target.checked ? [...draft.storeIds, store.id] : draft.storeIds.filter(id => id !== store.id) })} />{store.name}</label>)}</div>}</div>} />}
  </div>;
};
