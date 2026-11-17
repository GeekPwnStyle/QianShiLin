import { OperationStatus } from '@/src/shared/ui/OperationStatus';
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { appRepositories } from '@/src/app/composition/container';
import { useAuth } from '@/src/modules/auth/application/AuthContext';
import type { RoleDefinition } from '@/src/modules/auth/domain/identity';
import { ACCESS_TREE, withAction, type AccessAction } from '@/src/modules/system/access-matrix/domain/accessMatrix';
import { AccessMenuTree, AccessSummaryTable, PermissionEditor } from '@/src/modules/system/access-matrix/ui/AccessMatrix';
import type { NavNode } from '@/src/modules/navigation/domain/menuRegistry';
import { NoPermissionState } from '@/src/shared/ui/StateViews';

export const RolePermissionsPage: React.FC = () => {
  const { session, allRoles, refetchRoles, hasPermission } = useAuth();
  const cache = useQueryClient();
  const [selected, setSelected] = useState<NavNode>(ACCESS_TREE[1]);
  const [editing, setEditing] = useState<RoleDefinition | null>(null);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'store' | 'supplier'>('store');
  const canManage = session.identityType === 'admin' && hasPermission('system.role.manage');
  const save = useMutation({
    mutationFn: (role: RoleDefinition) => appRepositories.roles.updateRole(role, session.displayName, `更新「${role.name}」操作权限`),
    onSuccess: async () => { setEditing(null); setError(''); setNotice('角色权限已保存，菜单与操作授权已同步。'); await refetchRoles(); await cache.invalidateQueries({ queryKey: ['system-users'] }); },
    onError: cause => setError(cause instanceof Error ? cause.message : '保存失败'),
  });
  if (!canManage) return <NoPermissionState moduleLabel="角色权限管理" requiredPermission="system.role.manage" />;
  const filtered = allRoles.filter(role => `${role.name} ${role.description}`.toLowerCase().includes(filter.trim().toLowerCase()));
  const locked = editing?.id === 'role_hq_admin' ? ['system.read', 'system.role.manage', 'system.user.manage'] : [];
  const change = (node: NavNode, action: AccessAction, enabled: boolean) => setEditing(old => old ? { ...old, permissions: withAction(old.permissions, node, action, enabled) } : old);
  const createRole = async () => {
    setError('');
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/system/roles`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName.trim(), identityType: newType, permissions: newType === 'store' ? ['workbench.read'] : ['brands.read'] }) });
      const value = await res.json(); if (!res.ok) throw new Error(value.error ?? '新增角色失败');
      await refetchRoles(); setCreating(false); setNewName(''); setNotice('角色已建立。请在矩阵中配置具体菜单操作。');
    } catch (cause) { setError(cause instanceof Error ? cause.message : '新增角色失败'); }
  };
  const deleteRole = async () => {
    if (!editing?.id.startsWith('role_custom_') || !window.confirm(`删除角色「${editing.name}」？已分配员工的角色不能删除。`)) return;
    setError('');
    try { const res = await fetch(`${import.meta.env.BASE_URL}api/system/roles/${encodeURIComponent(editing.id)}`, { method: 'DELETE', credentials: 'same-origin' }); const value = await res.json(); if (!res.ok) throw new Error(value.error ?? '删除角色失败');
      setEditing(null); await refetchRoles(); setNotice('自定义角色已删除。');
    } catch (cause) { setError(cause instanceof Error ? cause.message : '删除角色失败'); }
  };
  return <div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-[25px] font-semibold text-[#171916]">角色权限管理</h2><p className="mt-1 text-sm text-[#6D736A]">按菜单查看各角色的操作授权，点击角色进入完整权限矩阵。</p></div><button type="button" onClick={() => setCreating(true)} className="rounded-xl bg-[#D7FF00] px-4 py-2 text-sm font-semibold">＋ 新增角色</button></div>
    <div className="rounded-xl border border-[#E0E4DB] bg-[#F7F9F0] px-4 py-3 text-xs text-[#5F645D]">权限矩阵只列出系统已有的操作权限码；未开发操作以“—”表示。总部管理员保底权限不可撤销。门店和供应商数据范围仍由服务端单独限制。</div>
    {notice && <OperationStatus role="status">{notice}</OperationStatus>}
    {error && <OperationStatus role="alert">{error}</OperationStatus>}
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[260px_minmax(0,1fr)]"><AccessMenuTree selected={selected} onSelect={setSelected} /><div className="space-y-3"><label className="flex max-w-sm items-center gap-2 rounded-xl border border-[#D9DDD4] bg-white px-3 py-2"><Search size={15} /><input aria-label="搜索角色" value={filter} onChange={e => setFilter(e.target.value)} placeholder="搜索角色" className="w-full text-sm outline-none" /></label><AccessSummaryTable subjects={filtered} selected={selected} nameOf={r => r.name} subtitleOf={r => r.identityType === 'admin' ? '总部' : r.identityType === 'supplier' ? '供应商' : '门店'} codesOf={r => r.permissions} onEdit={role => { setError(''); setEditing(structuredClone(role)); }} /></div></div>
    {editing && <PermissionEditor title={`编辑角色权限 · ${editing.name}`} codes={editing.permissions} onChange={change} onClose={() => setEditing(null)} onSave={() => save.mutate(editing)} saving={save.isPending} locked={locked} header={<div className="space-y-3 text-sm"><div className="flex flex-wrap items-center gap-4"><span>角色：<strong>{editing.name}</strong></span><span>身份：{editing.identityType === 'admin' ? '总部' : editing.identityType === 'supplier' ? '供应商' : '门店'}</span><span>数据范围：{editing.dataScope === 'all_stores' ? '全部门店' : editing.dataScope === 'own_supplier' ? '所属供应商' : '授权门店'}</span>{editing.id.startsWith('role_custom_') && <button type="button" onClick={deleteRole} className="ml-auto text-red-700 underline">删除自定义角色</button>}</div><div className="flex flex-wrap gap-3">{([['viewCostPrice','成本价'],['viewWholesalePrice','批发价'],['viewProfitMargin','毛利率'],['viewPlaintextPhone','明文手机号'],['batchExport','批量导出']] as const).map(([key,label]) => <label key={key} className="flex items-center gap-1"><input type="checkbox" checked={editing.sensitiveFields[key]} onChange={e => setEditing({ ...editing, sensitiveFields: { ...editing.sensitiveFields, [key]: e.target.checked } })} />{label}</label>)}</div></div>} />}
    {creating && <div role="dialog" aria-modal="true" aria-label="新增角色" className="fixed inset-0 z-[110] flex items-center justify-center bg-[#171916]/50 p-4"><div className="w-full max-w-md space-y-4 rounded-[22px] bg-white p-6"><h3 className="text-xl font-semibold">新增角色</h3><label className="block text-sm">角色名称<input aria-label="角色名称" value={newName} maxLength={60} onChange={e => setNewName(e.target.value)} className="mt-2 w-full rounded-xl border border-[#D9DDD4] px-3 py-2" /></label><label className="block text-sm">身份类型<select aria-label="身份类型" value={newType} onChange={e => setNewType(e.target.value as 'store' | 'supplier')} className="mt-2 w-full rounded-xl border border-[#D9DDD4] px-3 py-2"><option value="store">门店</option><option value="supplier">供应商</option></select></label><p className="text-xs text-[#73796F]">新角色默认只保留基础入口；权限在创建后逐项配置。总部管理员身份不可自建。</p>{error && <OperationStatus role="alert">{error}</OperationStatus>}<div className="flex justify-end gap-2"><button type="button" onClick={() => setCreating(false)} className="rounded-xl border px-4 py-2">取消</button><button type="button" disabled={!newName.trim()} onClick={createRole} className="rounded-xl bg-[#D7FF00] px-4 py-2 font-semibold disabled:opacity-50">创建</button></div></div></div>}
  </div>;
};
