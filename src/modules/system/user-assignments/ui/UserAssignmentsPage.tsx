import { OperationStatus } from '@/src/shared/ui/OperationStatus';
import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useAuth } from '@/src/modules/auth/application/AuthContext';
import { STORE_CATALOG } from '@/src/modules/auth/domain/identity';
import { ACCESS_TREE, withAction, type AccessAction } from '@/src/modules/system/access-matrix/domain/accessMatrix';
import { AccessMenuTree, AccessSummaryTable, PermissionEditor } from '@/src/modules/system/access-matrix/ui/AccessMatrix';
import type { NavNode } from '@/src/modules/navigation/domain/menuRegistry';
import { Select } from '@/src/shared/ui/Select';
import { ErrorState, LoadingSkeleton, NoPermissionState } from '@/src/shared/ui/StateViews';

type UserAccess = {
  id: string;
  username: string;
  display_name: string;
  status: string;
  role_id: string;
  role_name: string;
  identity_type: 'admin' | 'store' | 'supplier';
  store_ids: string[];
  permission_denies: string[];
  permissions: string[];
  updated_at: string;
  supplier_id?: string | null;
  supplier_name?: string | null;
};

type IdentityFilter = 'all' | 'staff' | 'supplier';
type Draft = { user: UserAccess; roleId: string; storeIds: string[]; denies: string[] };
const base = `${import.meta.env.BASE_URL}api`;

async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    method,
    credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const value = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(value.error ?? `请求失败（${response.status}）`);
  return value as T;
}

export const UserAssignmentsPage: React.FC = () => {
  const { session, allRoles, hasPermission } = useAuth();
  const cache = useQueryClient();
  const [selected, setSelected] = useState<NavNode>(ACCESS_TREE[1]);
  const [filter, setFilter] = useState('');
  const [identityFilter, setIdentityFilter] = useState<IdentityFilter>('all');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const canManage = session.identityType === 'admin' && hasPermission('system.user.manage');
  const users = useQuery({
    queryKey: ['system-users'],
    queryFn: () => request<UserAccess[]>('/system/users'),
    enabled: canManage,
  });

  const counts = useMemo(() => {
    const list = users.data ?? [];
    const supplier = list.filter((u) => u.identity_type === 'supplier').length;
    return { all: list.length, staff: list.length - supplier, supplier };
  }, [users.data]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return (users.data ?? []).filter((u) => {
      if (identityFilter === 'supplier' && u.identity_type !== 'supplier') return false;
      if (identityFilter === 'staff' && u.identity_type === 'supplier') return false;
      if (!q) return true;
      return `${u.display_name} @${u.username} ${u.username} ${u.role_name} ${u.supplier_name ?? ''}`
        .toLowerCase()
        .includes(q);
    });
  }, [users.data, filter, identityFilter]);

  const role = allRoles.find((r) => r.id === draft?.roleId);
  const effective = role?.permissions.filter((code) => !draft?.denies.includes(code)) ?? [];

  const change = (node: NavNode, action: AccessAction, enabled: boolean) =>
    setDraft((old) => {
      if (!old || !role || old.user.username === 'admin') return old;
      const nextEffective = withAction(
        role.permissions.filter((code) => !old.denies.includes(code)),
        node,
        action,
        enabled
      );
      // Individual assignments can only remove role rights, never grant absent rights.
      const next = new Set(nextEffective.filter((code) => role.permissions.includes(code)));
      return { ...old, denies: role.permissions.filter((code) => !next.has(code)) };
    });

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await request(`/system/users/${draft.user.id}`, 'PUT', {
        roleId: draft.roleId,
        storeIds: draft.storeIds,
        permissionDenies: draft.denies,
      });
      await Promise.all([
        cache.invalidateQueries({ queryKey: ['system-users'] }),
        cache.invalidateQueries({ queryKey: ['staff'] }),
        cache.invalidateQueries({ queryKey: ['catalog', 'suppliers'] }),
      ]);
      setDraft(null);
      setNotice('用户角色、范围及个人权限已保存。');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (draft && users.data && !users.data.some((u) => u.id === draft.user.id)) setDraft(null);
  }, [users.data, draft]);

  if (!canManage) return <NoPermissionState moduleLabel="用户权限分配" requiredPermission="system.user.manage" />;
  if (users.isLoading) return <LoadingSkeleton />;
  if (users.isError) return <ErrorState message={users.error.message} onRetry={() => users.refetch()} />;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[25px] font-semibold text-[#171916]">用户权限分配</h2>
        <p className="mt-1 text-sm text-[#6D736A]">
          按菜单核对员工与合作供应商账号的实际权限，每个供应商均已分配唯一登录账号 ID。
        </p>
      </div>
      <div className="rounded-xl border border-[var(--qsl-accent-soft-border)] bg-[var(--qsl-accent-soft-35)] px-4 py-3 text-xs text-[#5F645D]">
        用户权限继承所属角色，仅支持在角色授权范围内收紧；员工与供应商资料新建时会自动同步唯一登录账号 ID 至数据库，超级管理员权限锁定。
      </div>
      {notice && <OperationStatus role="status">{notice}</OperationStatus>}
      {error && <OperationStatus role="alert">{error}</OperationStatus>}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <AccessMenuTree selected={selected} onSelect={setSelected} />
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex w-full max-w-sm items-center gap-2 rounded-xl border border-[#D9DDD4] bg-white px-3 py-2">
              <Search size={15} className="text-[#73796F]" />
              <input
                aria-label="搜索账号"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="姓名 / 账号 ID / 供应商 / 角色"
                className="w-full text-sm outline-none"
              />
            </label>
            <div className="inline-flex rounded-xl border border-[#D9DDD4] bg-white p-1 text-xs">
              {(
                [
                  { id: 'all', label: `全部账号 (${counts.all})` },
                  { id: 'staff', label: `内部员工 (${counts.staff})` },
                  { id: 'supplier', label: `供应商账号 (${counts.supplier})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setIdentityFilter(tab.id)}
                  className={`rounded-lg px-3 py-1.5 font-medium tabular-nums transition-colors cursor-pointer ${
                    identityFilter === tab.id
                      ? 'bg-[var(--qsl-accent)] text-[var(--qsl-accent-ink)]'
                      : 'text-[#5F645D] hover:bg-[#F5F7F2]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <AccessSummaryTable
            subjects={filtered}
            selected={selected}
            nameOf={(u) => u.display_name}
            metaOf={(u) => {
              const parts = [`@${u.username}`];
              if (u.supplier_name) parts.push(u.supplier_name);
              if (u.status === 'disabled') parts.push('已停用');
              return parts.join(' · ');
            }}
            subtitleOf={(u) => u.role_name}
            codesOf={(u) => u.permissions.filter((code) => !u.permission_denies.includes(code))}
            onEdit={(user) => {
              setError('');
              setDraft({
                user,
                roleId: user.role_id,
                storeIds: [...user.store_ids],
                denies: [...user.permission_denies],
              });
            }}
          />
        </div>
      </div>
      {draft && (
        <PermissionEditor
          title={`编辑账号权限 · ${draft.user.display_name}`}
          codes={effective}
          onChange={change}
          onClose={() => setDraft(null)}
          onSave={save}
          saving={saving}
          locked={draft.user.username === 'admin' ? role?.permissions ?? [] : []}
          allowedCodes={role?.permissions ?? []}
          header={
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap items-center gap-4">
                <span>
                  账号 ID：<strong className="font-mono">@{draft.user.username}</strong>
                </span>
                {draft.user.supplier_name && (
                  <span className="text-[#5F645D]">
                    关联供应商：<strong className="text-[#171916]">{draft.user.supplier_name}</strong>
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <span>角色：</span>
                  <Select
                    variant="arc"
                    ariaLabel="所属角色"
                    className="w-52"
                    disabled={draft.user.username === 'admin'}
                    value={draft.roleId}
                    onChange={(nextRoleId) => setDraft({ ...draft, roleId: nextRoleId, denies: [] })}
                    options={allRoles
                      .filter((r) => r.identityType === draft.user.identity_type)
                      .map((r) => ({ value: r.id, label: r.name }))}
                  />
                </div>
              </div>
              {draft.user.identity_type !== 'supplier' ? (
                <div className="flex flex-wrap items-center gap-3">
                  授权门店：
                  {STORE_CATALOG.map((store) => (
                    <label key={store.id} className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={draft.storeIds.includes(store.id)}
                        disabled={draft.user.username === 'admin'}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            storeIds: e.target.checked
                              ? [...draft.storeIds, store.id]
                              : draft.storeIds.filter((id) => id !== store.id),
                          })
                        }
                      />
                      {store.name}
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#73796F]">
                  供应商登录账号自动绑定对应供应商数据范围，登录后仅可访问该供应商自身的商品与协同单据。
                </p>
              )}
            </div>
          }
        />
      )}
    </div>
  );
};

