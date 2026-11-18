import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Link2, Pencil, Plus, ShieldCheck, Trash2, UserPlus } from 'lucide-react';
import { useAuth } from '@/src/modules/auth/application/AuthContext';
import { PRESET_SESSIONS } from '@/src/modules/auth/domain/identity';
import { Modal } from '@/src/shared/ui/Modal';
import { OperationStatus } from '@/src/shared/ui/OperationStatus';
import { PaginationBar } from '@/src/shared/ui/PaginationBar';
import { Select } from '@/src/shared/ui/Select';

const columns = [
  ['name', '员工姓名'],
  ['role', '角色'],
  ['department', '部门'],
  ['limit', '整单调价权限（元）'],
  ['age', '年龄'],
  ['gender', '性别'],
  ['education', '学历'],
  ['phone', '联系电话'],
  ['address', '家庭地址'],
  ['loginStatus', '登录限制备注'],
  ['tags', '标签'],
] as const;

type Key = (typeof columns)[number][0];

type RoleOption = {
  id: string;
  name: string;
  identity_type?: 'admin' | 'store' | 'supplier';
  description?: string;
};

type Row = {
  id: string;
  store_id: string;
  user_id?: string | null;
  username?: string;
  role_id?: string;
  data: Partial<Record<Key, string>>;
};

type EditingRow = Row & {
  createUserAccount?: boolean;
  newUsername?: string;
  newPassword?: string;
};

type StaffListResponse = {
  rows: Row[];
  canEdit: boolean;
  canManageUsers?: boolean;
  roles: RoleOption[];
};

const DEBUG_STAFF_KEY = 'qsl_debug_staff_v1';
const input = 'h-10 rounded-full border border-[#D9DDD4] bg-white px-4 text-sm outline-none transition-colors hover:border-[#9DA498] focus:border-[#171916] focus:ring-2 focus:ring-[#171916]/[0.08]';
const toolbarInput = 'h-9 rounded-lg border border-[#D9DDD4] bg-white px-3 text-sm outline-none focus:border-[var(--qsl-accent-border)]';
const button = 'inline-flex items-center gap-1.5 rounded-lg border border-[#D9DDD4] bg-white px-3 py-1.5 font-medium text-[#171916] hover:bg-[#F5F7F2] disabled:opacity-40 cursor-pointer';
const primary = 'inline-flex items-center gap-1.5 rounded-lg border border-[var(--qsl-accent-border)] bg-[var(--qsl-accent)] px-3 py-1.5 font-medium text-[var(--qsl-accent-ink)] hover:bg-[var(--qsl-accent-hover)] disabled:opacity-40 cursor-pointer';
const api = `${import.meta.env.BASE_URL}api/staff`;

async function request<T>(url: string, method = 'GET', body?: object): Promise<T> {
  const response = await fetch(url, {
    method,
    credentials: 'same-origin',
    ...(body && { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || '操作失败');
  return result;
}

function buildInitialDebugRows(): Row[] {
  return Object.values(PRESET_SESSIONS)
    .filter((s) => s.identityType !== 'supplier')
    .map((s) => ({
      id: `debug_staff_${s.userId}`,
      store_id: s.authorizedStores[0]?.id ?? 'store_hq_01',
      user_id: s.userId,
      username: s.username,
      role_id: s.roleId,
      data: {
        name: s.displayName,
        role: s.roleName,
        department: s.identityType === 'admin' ? '总部运营' : '门店服务',
        limit: s.identityType === 'admin' ? '5000' : s.subRole === 'store_manager' ? '1000' : '200',
        age: '',
        gender: '',
        education: '',
        phone: '',
        address: '',
        loginStatus: '正常',
        tags: s.identityType === 'admin' ? '核心管理' : '系统账号',
      },
    }));
}

function loadDebugRows(): Row[] {
  if (typeof window === 'undefined') return buildInitialDebugRows();
  try {
    const raw = window.localStorage.getItem(DEBUG_STAFF_KEY);
    if (!raw) return buildInitialDebugRows();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : buildInitialDebugRows();
  } catch {
    return buildInitialDebugRows();
  }
}

export function StaffArchivePage() {
  const { session, allRoles, hasPermission, debugMode } = useAuth();
  const queryClient = useQueryClient();
  const stores = session.authorizedStores;

  const query = useQuery({
    queryKey: ['staff', session.userId],
    enabled: !debugMode,
    queryFn: () => request<StaffListResponse>(api),
  });

  const [debugRows, setDebugRows] = useState<Row[]>(() => loadDebugRows());
  const [search, setSearch] = useState('');
  const [store, setStore] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [filters, setFilters] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [hidden, setHidden] = useState<Key[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<EditingRow | null>(null);
  const [confirmDeleteIds, setConfirmDeleteIds] = useState<string[] | null>(null);
  const [sync, setSync] = useState(false);
  const [target, setTarget] = useState('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [sort, setSort] = useState<{ key: Key; desc: boolean }>({ key: 'name', desc: false });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ text: string; error?: boolean }>();

  const fallbackRoles: RoleOption[] = useMemo(
    () =>
      allRoles
        .filter((r) => r.identityType !== 'supplier')
        .map((r) => ({ id: r.id, name: r.name, identity_type: r.identityType, description: r.description })),
    [allRoles]
  );

  const roleOptions: RoleOption[] = useMemo(() => {
    if (!debugMode && query.data?.roles?.length) {
      return query.data.roles;
    }
    return fallbackRoles;
  }, [debugMode, query.data?.roles, fallbackRoles]);

  const canEdit = debugMode
    ? session.identityType === 'admin' || hasPermission('basic.staff.update')
    : (query.data?.canEdit ?? false);
  const canManageUsers = debugMode
    ? session.identityType === 'admin' && hasPermission('system.user.manage')
    : (query.data?.canManageUsers ?? (session.identityType === 'admin' && hasPermission('system.user.manage')));

  const all = useMemo(() => {
    if (!debugMode) return query.data?.rows ?? [];
    const allowedIds = new Set(stores.map((s) => s.id));
    return debugRows.filter((r) => !allowedIds.size || allowedIds.has(r.store_id));
  }, [debugMode, query.data?.rows, debugRows, stores]);

  const storeName = (id: string) => stores.find((item) => item.id === id)?.name ?? id;
  const visibleColumns = columns.filter(([key]) => !hidden.includes(key));

  const filterRoleNames = useMemo(() => {
    const names = new Set<string>(roleOptions.map((r) => r.name));
    for (const row of all) {
      if (row.data.role) names.add(row.data.role);
    }
    return Array.from(names);
  }, [roleOptions, all]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return all
      .filter((row) => {
        if (store && store !== row.store_id) return false;
        if (roleFilter && roleFilter !== (row.data.role ?? '')) return false;
        if (!keyword) return true;
        const fieldsMatch = Object.values(row.data).some((value) =>
          (value ?? '').toLowerCase().includes(keyword)
        );
        const usernameMatch = (row.username ?? '').toLowerCase().includes(keyword);
        return fieldsMatch || usernameMatch;
      })
      .sort(
        (a, b) =>
          (sort.desc ? -1 : 1) *
          (a.data[sort.key] ?? '').localeCompare(b.data[sort.key] ?? '', 'zh-CN', { numeric: true })
      );
  }, [all, store, roleFilter, search, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / size));
  const currentPage = Math.min(page, pages);
  const shown = filtered.slice((currentPage - 1) * size, currentPage * size);
  const allChecked = shown.length > 0 && shown.every((row) => selected.includes(row.id));

  function saveDebugRows(next: Row[]) {
    setDebugRows(next);
    try {
      window.localStorage.setItem(DEBUG_STAFF_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota errors
    }
  }

  async function mutate(path: string, method: string, body: object, message: string) {
    if (busy) return;
    setBusy(true);
    setStatus(undefined);
    try {
      if (debugMode) {
        const payload = body as Record<string, unknown>;
        if (path === '?action=delete') {
          const ids = (payload.ids as string[]) ?? [];
          const hasProtected = debugRows.some(
            (r) => ids.includes(r.id) && (r.username === 'admin' || r.user_id === session.userId)
          );
          if (hasProtected) throw new Error('不能删除当前登录账号或超级管理员关联的员工档案');
          saveDebugRows(debugRows.filter((r) => !ids.includes(r.id)));
          setSelected([]);
          setConfirmDeleteIds(null);
          setStatus({ text: `${message}，${ids.length} 条` });
          return;
        }
        if (path === '?action=sync') {
          const ids = (payload.ids as string[]) ?? [];
          const targetStore = String(payload.storeId ?? '');
          const clones = debugRows
            .filter((r) => ids.includes(r.id) && r.store_id !== targetStore)
            .map((r) => ({ ...r, id: `debug_staff_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, store_id: targetStore }));
          saveDebugRows([...debugRows, ...clones]);
          setSync(false);
          setSelected([]);
          setStatus({ text: `${message}，${clones.length} 条` });
          return;
        }
        const rowBody = body as EditingRow & { storeId?: string; roleId?: string; createUserAccount?: boolean; username?: string };
        const matchedRole = roleOptions.find((r) => r.id === rowBody.roleId);
        const nextRow: Row = {
          id: rowBody.id || `debug_staff_${Date.now()}`,
          store_id: rowBody.storeId || rowBody.store_id,
          user_id: rowBody.user_id ?? (rowBody.createUserAccount ? `debug_user_${Date.now()}` : null),
          username: rowBody.username || (rowBody.createUserAccount ? String(rowBody.newUsername ?? '') : undefined),
          role_id: matchedRole?.id ?? rowBody.roleId ?? rowBody.role_id,
          data: {
            ...rowBody.data,
            role: matchedRole?.name ?? rowBody.data?.role ?? '',
          },
        };
        if (method === 'POST') {
          saveDebugRows([...debugRows, nextRow]);
        } else {
          saveDebugRows(debugRows.map((r) => (r.id === nextRow.id ? nextRow : r)));
        }
        setEditing(null);
        setStatus({ text: `${message}，1 条` });
        return;
      }

      const result = await request<{ count: number }>(api + path, method, body);
      setEditing(null);
      setConfirmDeleteIds(null);
      setSync(false);
      setSelected([]);
      setStatus({ text: `${message}，${result.count} 条` });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['staff'] }),
        queryClient.invalidateQueries({ queryKey: ['system-users'] }),
      ]);
    } catch (error) {
      setStatus({ text: error instanceof Error ? error.message : '操作失败', error: true });
    } finally {
      setBusy(false);
    }
  }

  function openCreateModal() {
    setStatus(undefined);
    setEditing({
      id: '',
      store_id: store || stores[0]?.id || '',
      role_id: '',
      createUserAccount: canManageUsers,
      newUsername: '',
      newPassword: '',
      data: {
        role: '',
        loginStatus: '正常',
      },
    });
  }

  function openEditModal(row: Row) {
    const resolvedRoleId =
      row.role_id || roleOptions.find((r) => r.name === row.data.role)?.id || '';
    setStatus(undefined);
    setEditing({
      ...row,
      role_id: resolvedRoleId,
      createUserAccount: false,
      newUsername: '',
      newPassword: '',
      data: {
        ...row.data,
        role: roleOptions.find((r) => r.id === resolvedRoleId)?.name ?? row.data.role ?? '',
      },
    });
  }

  function submitEditing(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    if (!editing.store_id) {
      setStatus({ text: '请选择所属门店', error: true });
      return;
    }
    if (!editing.role_id) {
      setStatus({ text: '请选择员工角色', error: true });
      return;
    }
    const isCreate = !editing.id;
    const payload = {
      id: editing.id,
      storeId: editing.store_id,
      roleId: editing.role_id,
      data: editing.data,
      createUserAccount: Boolean(!editing.user_id && editing.createUserAccount),
      username: editing.newUsername?.trim() || '',
      password: editing.newPassword || '',
    };
    void mutate('', isCreate ? 'POST' : 'PATCH', payload, '已保存');
  }

  function exportRows() {
    const csv = (value: string) =>
      '"' + (/^[=+\-@\t\r]/.test(value) ? "'" + value : value).replaceAll('"', '""') + '"';
    const rows = [
      ['关联账号', '门店', ...visibleColumns.map(([, label]) => label)],
      ...filtered.map((row) => [
        row.username ? `@${row.username}` : '仅员工档案',
        storeName(row.store_id),
        ...visibleColumns.map(([key]) => row.data[key] ?? ''),
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob(['\ufeff', rows.map((row) => row.map(csv).join(',')).join('\r\n')], {
        type: 'text/csv;charset=utf-8',
      })
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = '员工档案.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <section className="overflow-hidden rounded-[20px] border border-[#E5E8E0] bg-white text-sm">
      {status && <OperationStatus role={status.error ? 'alert' : 'status'}>{status.text}</OperationStatus>}
      {busy && <OperationStatus loading>正在处理员工档案</OperationStatus>}

      <div className="flex flex-wrap items-center gap-2 border-b border-[#E5E8E0] p-3">
        <button type="button" className={primary} disabled={!canEdit || busy} onClick={openCreateModal}>
          <Plus size={15} />
          新增
        </button>
        <button
          type="button"
          className={button}
          disabled={!canEdit || !selected.length || stores.length < 2 || busy}
          onClick={() => {
            setTarget('');
            setSync(true);
          }}
        >
          同步其他门店
        </button>
        <button
          type="button"
          className={button + ' text-red-700'}
          disabled={!canEdit || !selected.length || busy}
          onClick={() => setConfirmDeleteIds(selected)}
        >
          批量删除
        </button>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#F5F7F2] px-2.5 py-1 text-xs text-[#5F645D]">
          <Link2 size={13} className="text-[#2D6A4F]" />
          已与「用户权限分配」及系统角色库实时打通
        </span>

        <div className="ml-auto flex flex-wrap gap-2">
          <button type="button" className={button} disabled={!filtered.length || !canEdit} onClick={exportRows}>
            <Download size={15} />
            导出
          </button>
          <input
            className={toolbarInput + ' min-w-0'}
            aria-label="模糊搜索"
            placeholder="姓名 / 账号 / 部门 / 电话"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          <button type="button" className={button} aria-expanded={filters} onClick={() => setFilters(!filters)}>
            筛选搜索
          </button>
          <button
            type="button"
            className={button}
            aria-expanded={columnsOpen}
            onClick={() => setColumnsOpen(!columnsOpen)}
          >
            设置表头
          </button>
        </div>
      </div>

      {filters && (
        <div className="flex flex-wrap items-center gap-2.5 border-b border-[#E5E8E0] bg-[#FAFBF8] p-3">
          <Select
            variant="compact"
            ariaLabel="门店筛选"
            placeholder="全部授权门店"
            className="w-48"
            buttonClassName="w-full rounded-full px-3.5 bg-white"
            value={store}
            onChange={(next) => {
              setStore(next);
              setPage(1);
            }}
            options={[
              { value: '', label: '全部授权门店' },
              ...stores.map((item) => ({ value: item.id, label: item.name })),
            ]}
          />
          <Select
            variant="compact"
            ariaLabel="角色筛选"
            placeholder="全部角色"
            className="w-48"
            buttonClassName="w-full rounded-full px-3.5 bg-white"
            value={roleFilter}
            onChange={(next) => {
              setRoleFilter(next);
              setPage(1);
            }}
            options={[
              { value: '', label: '全部角色' },
              ...filterRoleNames.map((value) => ({ value, label: value })),
            ]}
          />
        </div>
      )}

      {columnsOpen && (
        <div className="flex flex-wrap gap-3 border-b border-[#E5E8E0] bg-[#FAFBF8] p-3">
          {columns.map(([key, label]) => (
            <label key={key} className="inline-flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={!hidden.includes(key)}
                onChange={() =>
                  setHidden((previous) =>
                    previous.includes(key) ? previous.filter((value) => value !== key) : [...previous, key]
                  )
                }
              />
              {label}
            </label>
          ))}
        </div>
      )}

      <div className="max-h-[65dvh] overflow-auto">
        <table className="w-full min-w-[1040px] text-left">
          <thead className="sticky top-0 z-10 bg-[#F5F7F2] text-[#4A4F47]">
            <tr>
              <th className="p-2.5">
                <input
                  aria-label="选择本页"
                  type="checkbox"
                  checked={allChecked}
                  onChange={() =>
                    setSelected((previous) =>
                      allChecked
                        ? previous.filter((id) => !shown.some((row) => row.id === id))
                        : [...new Set([...previous, ...shown.map((row) => row.id)])]
                    )
                  }
                />
              </th>
              <th className="p-2.5 whitespace-nowrap">操作</th>
              <th className="p-2.5 whitespace-nowrap">关联登录账号</th>
              {visibleColumns.map(([key, label]) => (
                <th
                  key={key}
                  className="whitespace-nowrap p-2.5"
                  aria-sort={sort.key !== key ? 'none' : sort.desc ? 'descending' : 'ascending'}
                >
                  <button
                    type="button"
                    className="cursor-pointer font-medium hover:text-[#171916]"
                    onClick={() => setSort({ key, desc: sort.key === key && !sort.desc })}
                  >
                    {label}
                    {sort.key === key ? (sort.desc ? ' ↓' : ' ↑') : ''}
                  </button>
                </th>
              ))}
              <th className="p-2.5 whitespace-nowrap">门店</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((row) => {
              const isProtected = row.username === 'admin' || row.user_id === session.userId;
              return (
                <tr key={row.id} className="border-t border-[#ECEFE7] even:bg-[#F8F9F5] hover:bg-[#F3F6EE]">
                  <td className="p-2.5">
                    <input
                      type="checkbox"
                      aria-label={`选择 ${row.data.name}`}
                      checked={selected.includes(row.id)}
                      onChange={() =>
                        setSelected((previous) =>
                          previous.includes(row.id)
                            ? previous.filter((id) => id !== row.id)
                            : [...previous, row.id]
                        )
                      }
                    />
                  </td>
                  <td className="whitespace-nowrap p-2.5">
                    <button
                      type="button"
                      title="编辑"
                      aria-label={`编辑 ${row.data.name}`}
                      className={primary + ' !px-2 !py-1'}
                      disabled={!canEdit || busy}
                      onClick={() => openEditModal(row)}
                    >
                      <Pencil size={14} />
                    </button>{' '}
                    <button
                      type="button"
                      title={isProtected ? '当前账号或超级管理员不可删除' : '删除'}
                      aria-label={`删除 ${row.data.name}`}
                      className={button + ' !px-2 !py-1 text-red-700'}
                      disabled={!canEdit || busy || isProtected}
                      onClick={() => setConfirmDeleteIds([row.id])}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                  <td className="whitespace-nowrap p-2.5">
                    {row.username ? (
                      <span className="inline-flex items-center gap-1 rounded-md border border-[#B7E4C7] bg-[#ECFDF5] px-2 py-0.5 text-xs font-medium text-[#1B4332]">
                        <ShieldCheck size={12} />@{row.username}
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-md border border-[#E5E8E0] bg-[#F5F7F2] px-2 py-0.5 text-xs text-[#73796F]">
                        仅员工档案
                      </span>
                    )}
                  </td>
                  {visibleColumns.map(([key]) => (
                    <td key={key} className="max-w-60 truncate p-2.5" title={row.data[key]}>
                      {row.data[key] || '—'}
                    </td>
                  ))}
                  <td className="whitespace-nowrap p-2.5">{storeName(row.store_id)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!shown.length && (
          <div className="p-10 text-center text-[#73796F]">
            {query.isPending && !debugMode
              ? '正在加载员工档案…'
              : query.isError && !debugMode
                ? '员工档案加载失败'
                : '暂无符合条件的员工档案'}
          </div>
        )}
      </div>

      <PaginationBar
        total={filtered.length}
        page={currentPage}
        pageSize={size}
        onPageChange={setPage}
        onPageSizeChange={(next) => {
          setSize(next);
          setPage(1);
        }}
        summaryExtra={<span>已选 {selected.length} 条</span>}
      />

      {editing && (
        <Modal
          open
          title={editing.id ? '编辑员工档案' : '新增员工档案'}
          subtitle={
            editing.user_id
              ? `已关联系统登录账号 @${editing.username}，修改姓名/角色/状态将同步至用户权限分配`
              : '员工角色选项直接读取系统角色库，可按需同步开通系统登录账号'
          }
          onClose={() => {
            if (!busy) setEditing(null);
          }}
        >
          <form className="grid gap-3.5 sm:grid-cols-2" onSubmit={submitEditing}>
            <div className="grid gap-1.5">
              <span className="text-xs font-medium text-[#4A4F47]">所属门店 *</span>
              <Select
                variant="arc"
                ariaLabel="所属门店"
                placeholder="请选择所属门店"
                value={editing.store_id}
                onChange={(nextStore) => setEditing({ ...editing, store_id: nextStore })}
                options={stores.map((item) => ({ value: item.id, label: item.name }))}
              />
            </div>

            <div className="grid gap-1.5">
              <span className="text-xs font-medium text-[#4A4F47]">员工角色 *</span>
              <Select
                variant="arc"
                ariaLabel="员工角色"
                placeholder="请选择员工角色"
                value={editing.role_id ?? ''}
                disabled={editing.username === 'admin' || (Boolean(editing.user_id) && !canManageUsers)}
                onChange={(nextRoleId) => {
                  const matched = roleOptions.find((r) => r.id === nextRoleId);
                  setEditing({
                    ...editing,
                    role_id: nextRoleId,
                    data: { ...editing.data, role: matched?.name ?? '' },
                  });
                }}
                options={roleOptions.map((r) => ({
                  value: r.id,
                  label: r.name,
                  description: r.description,
                }))}
              />
              {editing.username === 'admin' && (
                <span className="text-[11px] text-[#73796F]">超级管理员角色受系统基线保护</span>
              )}
              {Boolean(editing.user_id) && editing.username !== 'admin' && !canManageUsers && (
                <span className="text-[11px] text-[#73796F]">调整已绑定账号的角色需具备「用户权限管理」权限</span>
              )}
            </div>

            {columns
              .filter(([key]) => key !== 'role')
              .map(([key, label]) => {
                const setVal = (value: string) =>
                  setEditing({ ...editing, data: { ...editing.data, [key]: value } });

                if (key === 'gender') {
                  return (
                    <div key={key} className="grid gap-1.5">
                      <span className="text-xs font-medium text-[#4A4F47]">{label}</span>
                      <Select
                        variant="arc"
                        ariaLabel="性别"
                        placeholder="请选择性别"
                        value={editing.data.gender ?? ''}
                        onChange={setVal}
                        options={[
                          { value: '男', label: '男' },
                          { value: '女', label: '女' },
                        ]}
                      />
                    </div>
                  );
                }

                if (key === 'loginStatus') {
                  return (
                    <div key={key} className="grid gap-1.5">
                      <span className="text-xs font-medium text-[#4A4F47]">{label}</span>
                      <Select
                        variant="arc"
                        ariaLabel="登录限制备注"
                        placeholder="请选择登录状态"
                        value={editing.data.loginStatus ?? ''}
                        disabled={editing.username === 'admin'}
                        onChange={setVal}
                        options={[
                          { value: '正常', label: '正常' },
                          { value: '限制', label: '限制' },
                        ]}
                      />
                    </div>
                  );
                }

                return (
                  <label key={key} className="grid gap-1.5">
                    <span className="text-xs font-medium text-[#4A4F47]">
                      {label}
                      {key === 'name' ? ' *' : ''}
                    </span>
                    <input
                      className={input}
                      required={key === 'name'}
                      maxLength={300}
                      value={editing.data[key] ?? ''}
                      onChange={(event) => setVal(event.target.value)}
                    />
                  </label>
                );
              })}

            {editing.user_id ? (
              <div className="sm:col-span-2 flex items-center gap-2 rounded-xl border border-[#B7E4C7] bg-[#ECFDF5] px-3 py-2.5 text-xs text-[#1B4332]">
                <ShieldCheck size={16} className="shrink-0" />
                <span>
                  已绑定系统用户 <strong>@{editing.username}</strong>。保存后将同步更新「用户权限分配」中的姓名、角色与账号状态；精细门店范围与菜单例外权限可在「系统管理 → 用户权限分配」中进一步调整。
                </span>
              </div>
            ) : canManageUsers ? (
              <div className="sm:col-span-2 space-y-2.5 rounded-xl border border-[#D9DDD4] bg-[#F8F9F5] p-3">
                <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-[#171916]">
                  <input
                    type="checkbox"
                    checked={Boolean(editing.createUserAccount)}
                    onChange={(event) =>
                      setEditing({ ...editing, createUserAccount: event.target.checked })
                    }
                  />
                  <UserPlus size={14} className="text-[#2D6A4F]" />
                  <span>同步开通系统登录账号（保存后立即出现在「用户权限分配」）</span>
                </label>
                {editing.createUserAccount && (
                  <div className="grid gap-3 pt-1 sm:grid-cols-2">
                    <label className="grid gap-1 text-xs">
                      <span className="font-medium text-[#4A4F47]">登录账号 *</span>
                      <input
                        required
                        className={input + ' text-sm'}
                        placeholder="3-32位字母/数字/下划线/点号"
                        value={editing.newUsername ?? ''}
                        onChange={(event) =>
                          setEditing({ ...editing, newUsername: event.target.value })
                        }
                      />
                    </label>
                    <label className="grid gap-1 text-xs">
                      <span className="font-medium text-[#4A4F47]">初始登录密码</span>
                      <input
                        type="password"
                        className={input + ' text-sm'}
                        placeholder="留空则默认 Qsl@123456"
                        value={editing.newPassword ?? ''}
                        onChange={(event) =>
                          setEditing({ ...editing, newPassword: event.target.value })
                        }
                      />
                    </label>
                  </div>
                )}
              </div>
            ) : (
              <p className="sm:col-span-2 text-xs text-[#73796F]">
                员工角色已接入系统角色库；登录账号开通及细粒度权限控制由总部管理员在「用户权限分配」中维护。
              </p>
            )}

            <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
              <button
                type="button"
                className={button}
                disabled={busy}
                onClick={() => setEditing(null)}
              >
                取消
              </button>
              <button type="submit" className={primary} disabled={busy}>
                保存档案
              </button>
            </div>
          </form>
        </Modal>
      )}

      {confirmDeleteIds && (
        <Modal
          open
          title="确认删除员工档案"
          maxWidthClass="max-w-md"
          onClose={() => {
            if (!busy) setConfirmDeleteIds(null);
          }}
        >
          <div className="space-y-4">
            <p className="text-sm text-[#4A4F47]">
              确定删除选中的 <strong>{confirmDeleteIds.length}</strong> 条员工档案？此操作不可撤销。
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className={button}
                disabled={busy}
                onClick={() => setConfirmDeleteIds(null)}
              >
                取消
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-700 disabled:opacity-40 cursor-pointer"
                disabled={busy}
                onClick={() =>
                  void mutate('?action=delete', 'POST', { ids: confirmDeleteIds }, '已删除')
                }
              >
                确认删除
              </button>
            </div>
          </div>
        </Modal>
      )}

      {sync && (
        <Modal
          open
          title="同步员工档案到其他门店"
          onClose={() => {
            if (!busy) setSync(false);
          }}
        >
          <p className="mb-3 text-sm">
            同步选中的 {selected.length} 条档案。同一来源已同步时更新目标门店档案。
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              variant="arc"
              ariaLabel="目标门店"
              placeholder="请选择目标门店"
              className="w-60"
              value={target}
              onChange={setTarget}
              options={stores.map((item) => ({ value: item.id, label: item.name }))}
            />
            <button
              type="button"
              className={primary}
              disabled={!target || busy}
              onClick={() => void mutate('?action=sync', 'POST', { ids: selected, storeId: target }, '已同步')}
            >
              确认同步
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
