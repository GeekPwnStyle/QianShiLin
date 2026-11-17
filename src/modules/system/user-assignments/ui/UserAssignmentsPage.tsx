import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Search, Shield } from 'lucide-react';
import { useAuth } from '@/src/modules/auth/application/AuthContext';
import { PRESET_SESSIONS, STORE_CATALOG } from '@/src/modules/auth/domain/identity';
import { SYSTEM_THEME_MAP, resolveThemeKey } from '@/src/shared/theme/themes';
import { Button } from '@/src/shared/ui/Button';
import { Select } from '@/src/shared/ui/Select';
import { ErrorState, LoadingSkeleton, NoPermissionState } from '@/src/shared/ui/StateViews';

type UserAccess = {
  id: string;
  username: string;
  display_name: string;
  email?: string | null;
  title?: string | null;
  theme_key?: string | null;
  avatar_color_preset?: string | null;
  supplier_id?: string | null;
  supplier_name?: string | null;
  status: string;
  role_id: string;
  role_name: string;
  identity_type: 'admin' | 'store' | 'supplier';
  store_ids: string[];
  permission_denies: string[];
  permissions: string[];
  updated_at: string;
};

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
  const { session, debugMode, allRoles, hasPermission } = useAuth();
  const cache = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [roleId, setRoleId] = useState('');
  const [storeIds, setStoreIds] = useState<string[]>([]);
  const [denies, setDenies] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const canManage = session.identityType === 'admin' && hasPermission('system.user.manage');

  const debugFallbackUsers = useMemo<UserAccess[]>(
    () =>
      Object.values(PRESET_SESSIONS).map((preset) => {
        const matchedRole = allRoles.find((r) => r.id === preset.roleId);
        return {
          id: preset.userId,
          username: preset.username,
          display_name: preset.displayName,
          email: preset.email ?? null,
          title: preset.title,
          theme_key: preset.themeKey,
          avatar_color_preset: preset.avatarColorPreset ?? 'charcoal',
          supplier_id: preset.supplierId ?? null,
          supplier_name: preset.supplierName ?? null,
          status: 'active',
          role_id: preset.roleId,
          role_name: preset.roleName,
          identity_type: preset.identityType,
          store_ids: preset.authorizedStores.map((s) => s.id),
          permission_denies: preset.permissionDenies ?? [],
          permissions: matchedRole?.permissions ?? [],
          updated_at: matchedRole?.updatedAt ?? new Date().toISOString(),
        };
      }),
    [allRoles]
  );

  const users = useQuery({
    queryKey: ['system-users', debugMode],
    queryFn: () =>
      debugMode ? Promise.resolve(debugFallbackUsers) : request<UserAccess[]>('/system/users'),
    enabled: canManage,
  });

  const userList = users.data ?? (debugMode ? debugFallbackUsers : []);
  const selected = userList.find((user) => user.id === selectedId) ?? userList[0];

  useEffect(() => {
    if (!selected) return;
    setSelectedId(selected.id);
    setRoleId(selected.role_id);
    setStoreIds(selected.store_ids);
    setDenies(selected.permission_denies);
    setError('');
  }, [selected?.id, selected?.role_id, selected?.updated_at]);

  const role = allRoles.find((item) => item.id === roleId);
  const allowedRoles = allRoles.filter((item) => item.identityType === selected?.identity_type);
  const filtered = useMemo(
    () =>
      userList.filter((user) =>
        `${user.display_name} ${user.username} ${user.email ?? ''} ${user.title ?? ''} ${user.role_name}`
          .toLowerCase()
          .includes(keyword.trim().toLowerCase())
      ),
    [userList, keyword]
  );

  const changed = Boolean(
    selected &&
      (roleId !== selected.role_id ||
        [...storeIds].sort().join('|') !== [...selected.store_ids].sort().join('|') ||
        [...denies].sort().join('|') !== [...selected.permission_denies].sort().join('|'))
  );

  const save = async () => {
    if (!selected) return;
    if (debugMode) {
      setNotice('当前为本地 debug 演示模式，账号角色持久化入库需连接 PostgreSQL 数据库服务。');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await request(`/system/users/${selected.id}`, 'PUT', {
        roleId,
        storeIds,
        permissionDenies: denies,
      });
      await cache.invalidateQueries({ queryKey: ['system-users'] });
      setNotice(`已保存 ${selected.display_name} 的角色、门店范围和个人减权设置。`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (!canManage) {
    return <NoPermissionState moduleLabel="用户权限分配" requiredPermission="system.user.manage" />;
  }
  if (users.isLoading) return <LoadingSkeleton />;
  if (users.isError) {
    return <ErrorState message={users.error.message} onRetry={() => users.refetch()} />;
  }

  const selectedTheme = selected
    ? SYSTEM_THEME_MAP[resolveThemeKey(selected.theme_key)]
    : undefined;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[25px] font-semibold text-[#171916]">用户权限分配</h2>
        <p className="mt-1 text-sm text-[#6D736A]">
          为真实登录账号绑定角色与授权门店，并对个人权限做收紧设置；个人主题色由各账号在右上角自主设置并同步入库。
        </p>
        <p className="mt-2 text-xs text-[#73796F]">
          个人权限只能从所属角色中扣除；变更写入审计。已登录的用户需重新登录后刷新门店范围。
        </p>
      </div>

      {debugMode && (
        <p className="rounded-xl border border-[#FDE68A] bg-[#FEF7EC] px-3.5 py-2.5 text-xs text-[#B45309]">
          当前处于本地 debug 演示模式，下方展示预设账号列表；正式部署连接数据库后将读取全部真实数据库账号并支持持久化保存。
        </p>
      )}

      {notice && (
        <p
          role="status"
          className="rounded-xl border border-[#BBF7D0] bg-[#ECFDF3] p-3 text-sm text-[#166534]"
        >
          {notice}
        </p>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[330px_minmax(0,1fr)]">
        <section className="rounded-[20px] border border-[#D9DDD4] bg-white p-4">
          <div className="flex items-center gap-2 border-b border-[#E5E8E0] pb-3">
            <Shield className="h-4 w-4" />
            <h3 className="font-semibold">账号列表</h3>
            <span className="ml-auto text-xs text-[#73796F] tabular-nums">{filtered.length} 人</span>
          </div>
          <label className="my-3 flex h-10 items-center gap-2 rounded-xl border border-[#D9DDD4] px-3">
            <Search className="h-4 w-4 text-[#73796F]" />
            <input
              aria-label="搜索账号"
              className="w-full outline-none"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="姓名 / 账号 / 岗位 / 角色"
            />
          </label>
          <div className="max-h-[65vh] space-y-2 overflow-y-auto qsl-scroll">
            {filtered.map((user) => {
              const userTheme = SYSTEM_THEME_MAP[resolveThemeKey(user.theme_key)];
              const isSelected = selected?.id === user.id;
              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => setSelectedId(user.id)}
                  className={`w-full rounded-xl border p-3 text-left cursor-pointer transition-colors ${
                    isSelected
                      ? 'border-[var(--qsl-brand-dark)] bg-[var(--qsl-accent-soft)]'
                      : 'border-[#E5E8E0] bg-[#F8F9F5] hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-[#171916] truncate">
                      {user.display_name}{' '}
                      <span className="text-xs font-normal text-[#73796F]">{user.username}</span>
                    </span>
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-[11px] text-[#5F645D] border border-[#E5E8E0] shrink-0"
                      title={`当前主题色：${userTheme.name}`}
                    >
                      <span
                        className="h-2 w-2 rounded-full border border-black/10"
                        style={{ backgroundColor: userTheme.accentHex }}
                      />
                      <span>{userTheme.name}</span>
                    </span>
                  </div>
                  <span className="mt-1 block text-xs text-[#5F645D] truncate">
                    {user.title || user.role_name} ·{' '}
                    {user.identity_type === 'supplier'
                      ? user.supplier_name || '供应商范围'
                      : `${user.store_ids.length} 家门店`}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {selected && (
          <section className="space-y-5 rounded-[20px] border border-[#D9DDD4] bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E8E0] pb-4">
              <div>
                <h3 className="text-lg font-semibold">{selected.display_name} · 权限配置</h3>
                <p className="text-sm text-[#73796F]">
                  账号 {selected.username}
                  {selected.email ? ` · ${selected.email}` : ''}
                  {selected.title ? ` · ${selected.title}` : ''} ·{' '}
                  {selected.status === 'active' ? '启用' : selected.status}
                  {selectedTheme ? ` · 主题：${selectedTheme.name}` : ''}
                </p>
              </div>
              <Button
                variant="primary"
                disabled={!changed}
                loading={saving}
                onClick={save}
                icon={<Check className="h-4 w-4" />}
              >
                保存分配
              </Button>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">所属角色</label>
              <div className="max-w-md">
                <Select
                  ariaLabel="所属角色"
                  variant="white"
                  disabled={selected.username === 'admin'}
                  value={roleId}
                  onChange={(val) => {
                    setRoleId(val);
                    setDenies([]);
                  }}
                  options={allowedRoles.map((item) => ({
                    value: item.id,
                    label: item.name,
                  }))}
                />
              </div>
              <p className="mt-1.5 text-xs text-[#73796F]">
                角色定义可在“角色权限管理”中统一编辑；管理员保底权限不可撤销。
              </p>
            </div>

            {selected.identity_type === 'supplier' ? (
              <div className="rounded-xl border border-[#E5E8E0] bg-[#F8F9F5] p-3.5 text-sm text-[#5F645D]">
                关联供应商范围：<strong className="text-[#171916]">{selected.supplier_name || '未绑定供应商'}</strong>
              </div>
            ) : (
              <div>
                <h4 className="text-sm font-semibold">授权门店范围</h4>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {STORE_CATALOG.map((store) => (
                    <label
                      key={store.id}
                      className="flex items-center gap-2 rounded-xl border border-[#E5E8E0] bg-[#F8F9F5] p-3 text-sm cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className="accent-[#171916]"
                        checked={storeIds.includes(store.id)}
                        disabled={selected.username === 'admin'}
                        onChange={(event) =>
                          setStoreIds((previous) =>
                            event.target.checked
                              ? [...previous, store.id]
                              : previous.filter((id) => id !== store.id)
                          )
                        }
                      />
                      <span>{store.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 className="text-sm font-semibold">
                个人权限收紧{' '}
                <span className="font-normal text-[#73796F] tabular-nums">
                  已禁用 {denies.length} 项
                </span>
              </h4>
              <p className="mt-1 text-xs text-[#73796F]">
                下列权限来自角色。勾选“个人禁用”后，该账号即使角色允许也无法使用。
              </p>
              <div className="mt-3 grid max-h-[44vh] gap-2 overflow-y-auto qsl-scroll sm:grid-cols-2 xl:grid-cols-3">
                {role?.permissions.map((code) => (
                  <label
                    key={code}
                    className="flex items-center gap-2 rounded-xl border border-[#E5E8E0] bg-[#F8F9F5] p-2.5 text-xs cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      className="accent-[#171916]"
                      checked={denies.includes(code)}
                      disabled={selected.username === 'admin'}
                      onChange={(event) =>
                        setDenies((previous) =>
                          event.target.checked
                            ? [...previous, code]
                            : previous.filter((item) => item !== code)
                        )
                      }
                    />
                    <span className="font-mono break-all">{code}</span>
                  </label>
                ))}
              </div>
            </div>

            {error && (
              <p role="alert" className="text-sm text-[#9C3232]">
                {error}
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  );
};
