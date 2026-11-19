import React, { useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ChevronDown, SlidersHorizontal, RefreshCw, RotateCcw, Search } from 'lucide-react';
import { useAuth } from '@/src/modules/auth/application/AuthContext';
import { Button } from '@/src/shared/ui/Button';
import { PaginationBar } from '@/src/shared/ui/PaginationBar';
import { Select } from '@/src/shared/ui/Select';
import {
  ErrorState,
  NoPermissionState,
  TableLoadingOverlay,
  TableLoadingRows,
} from '@/src/shared/ui/StateViews';

type LogRow = {
  id: string;
  category: string;
  action: string;
  target: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  ip_region: string | null;
  client_type: string;
  created_at: string;
  actor_name: string | null;
  actor_username?: string | null;
  actor_role_id?: string | null;
  actor_role_name: string | null;
};

type LogResult = {
  items: LogRow[];
  total: number;
  page: number;
  pageSize: number;
};

type LogFacets = {
  roles: Array<{ id: string; name: string }>;
  categories: string[];
  actions: Array<{ category: string; action: string }>;
  clientTypes: string[];
};

type TimePreset = 'month' | 'today' | '7d' | '30d' | 'custom' | 'all';

const base = `${import.meta.env.BASE_URL}api`;

function formatLocalYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getCurrentMonthYmd(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getPresetRange(preset: 'today' | '7d' | '30d'): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date(end);
  if (preset === '7d') {
    start.setDate(end.getDate() - 6);
  } else if (preset === '30d') {
    start.setDate(end.getDate() - 29);
  }
  return {
    startDate: formatLocalYmd(start),
    endDate: formatLocalYmd(end),
  };
}

function formatDetailsText(row: LogRow): string {
  const d = row.details ?? {};
  const parts: string[] = [];
  if (typeof d.username === 'string' && d.username) parts.push(`账号 ${d.username}`);
  if (typeof d.role === 'string' && d.role) parts.push(`角色 ${d.role}`);
  if (typeof d.supplierName === 'string' && d.supplierName) parts.push(d.supplierName);
  if (typeof d.storeName === 'string' && d.storeName) parts.push(d.storeName);
  if (typeof d.themeKey === 'string' && d.themeKey) parts.push(`主题 ${d.themeKey}`);
  if (typeof d.note === 'string' && d.note) parts.push(d.note);
  if (parts.length > 0) return parts.join(' · ');
  if (row.target) return row.target;
  const fallbackValues = Object.values(d)
    .filter((v) => typeof v === 'string' || typeof v === 'number')
    .map((v) => String(v))
    .filter(Boolean);
  return fallbackValues.length > 0 ? fallbackValues.slice(0, 3).join(' · ') : '—';
}

export const OperationLogsPage: React.FC = () => {
  const { session, allRoles, hasPermission } = useAuth();
  const defaultMonth = useMemo(() => getCurrentMonthYmd(), []);

  const [timePreset, setTimePreset] = useState<TimePreset>('month');
  const [month, setMonth] = useState(defaultMonth);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [clientTypeFilter, setClientTypeFilter] = useState('');
  const [draftSearch, setDraftSearch] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const extraFilterCount = [roleFilter, actionFilter, clientTypeFilter].filter(Boolean).length;

  const allowed = session.identityType === 'admin' && hasPermission('system.read');

  const facetsQuery = useQuery({
    queryKey: ['system-operation-logs-facets'],
    enabled: allowed,
    staleTime: 60_000,
    queryFn: async () => {
      const response = await fetch(`${base}/system/operation-logs/facets`, {
        credentials: 'same-origin',
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? '加载筛选选项失败');
      return body as LogFacets;
    },
  });

  const logs = useQuery({
    queryKey: [
      'system-operation-logs',
      timePreset,
      month,
      startDate,
      endDate,
      roleFilter,
      categoryFilter,
      actionFilter,
      clientTypeFilter,
      search,
      page,
      pageSize,
    ],
    enabled: allowed,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (timePreset === 'month' && month) {
        params.set('month', month);
      } else if (timePreset !== 'all') {
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
      }
      if (roleFilter) params.set('role', roleFilter);
      if (categoryFilter) params.set('category', categoryFilter);
      if (actionFilter) params.set('action', actionFilter);
      if (clientTypeFilter) params.set('clientType', clientTypeFilter);
      if (search) params.set('search', search);

      const response = await fetch(`${base}/system/operation-logs?${params}`, {
        credentials: 'same-origin',
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? '加载操作日志失败');
      return body as LogResult;
    },
  });

  const roleOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of allRoles) {
      seen.set(r.id, r.name);
    }
    for (const r of facetsQuery.data?.roles ?? []) {
      if (!seen.has(r.id) && !Array.from(seen.values()).includes(r.name)) {
        seen.set(r.id, r.name);
      }
    }
    return [
      { value: '', label: '全部角色' },
      ...Array.from(seen.entries()).map(([id, name]) => ({
        value: id,
        label: name,
      })),
    ];
  }, [allRoles, facetsQuery.data?.roles]);

  const categoryOptions = useMemo(() => {
    const categories = facetsQuery.data?.categories ?? [];
    return [
      { value: '', label: '全部项目' },
      ...categories.map((cat) => ({ value: cat, label: cat })),
    ];
  }, [facetsQuery.data?.categories]);

  const actionOptions = useMemo(() => {
    const rawActions = facetsQuery.data?.actions ?? [];
    const filtered = categoryFilter
      ? rawActions.filter((item) => item.category === categoryFilter).map((item) => item.action)
      : Array.from(new Set(rawActions.map((item) => item.action)));
    return [
      { value: '', label: '全部操作' },
      ...filtered.map((act) => ({ value: act, label: act })),
    ];
  }, [facetsQuery.data?.actions, categoryFilter]);

  const clientTypeOptions = useMemo(() => {
    const list = facetsQuery.data?.clientTypes ?? [];
    return [
      { value: '', label: '全部客户端' },
      ...list.map((ct) => ({ value: ct, label: ct })),
    ];
  }, [facetsQuery.data?.clientTypes]);

  const handleTimePresetChange = (nextPreset: string) => {
    const preset = nextPreset as TimePreset;
    setTimePreset(preset);
    setPage(1);
    if (preset === 'month') {
      if (!month) setMonth(defaultMonth);
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today' || preset === '7d' || preset === '30d') {
      const range = getPresetRange(preset);
      setStartDate(range.startDate);
      setEndDate(range.endDate);
    } else if (preset === 'custom') {
      if (!startDate && !endDate) {
        const range = getPresetRange('7d');
        setStartDate(range.startDate);
        setEndDate(range.endDate);
      }
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  const handleResetFilters = () => {
    setTimePreset('month');
    setMonth(defaultMonth);
    setStartDate('');
    setEndDate('');
    setRoleFilter('');
    setCategoryFilter('');
    setActionFilter('');
    setClientTypeFilter('');
    setDraftSearch('');
    setSearch('');
    setPage(1);
  };

  const hasCustomFilter =
    timePreset !== 'month' ||
    month !== defaultMonth ||
    Boolean(roleFilter) ||
    Boolean(categoryFilter) ||
    Boolean(actionFilter) ||
    Boolean(clientTypeFilter) ||
    Boolean(search);

  if (!allowed) {
    return <NoPermissionState moduleLabel="操作日志" requiredPermission="system.read" />;
  }

  const items = logs.data?.items ?? [];
  const total = logs.data?.total ?? 0;
  const isBusy = logs.isLoading || logs.isFetching;

  return (
    <div className="space-y-3">
      <form
        className="rounded-2xl border border-[#D9DDD4] bg-white p-3 space-y-2.5"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setSearch(draftSearch.trim());
        }}
      >
        <div className="flex flex-wrap items-center gap-2 [&>div]:w-full [&>div]:sm:w-[170px]">
          <div>
            <label className="sr-only">时间范围</label>
            <Select
              variant="arc"
              ariaLabel="选择时间范围"
              value={timePreset}
              onChange={handleTimePresetChange}
              options={[
                { value: 'month', label: '按指定月份' },
                { value: 'today', label: '今日' },
                { value: '7d', label: '最近 7 天' },
                { value: '30d', label: '最近 30 天' },
                { value: 'custom', label: '自定义时间段' },
                { value: 'all', label: '全部时间' },
              ]}
            />
          </div>

          {timePreset === 'month' && (
            <div>
              <label className="sr-only">选择月份</label>
              <input
                aria-label="选择月份"
                type="month"
                value={month}
                onChange={(event) => {
                  setMonth(event.target.value);
                  setPage(1);
                }}
                className="h-9 w-full rounded-xl border border-[#D9DDD4] bg-white px-4 text-[14px] text-[#171916] outline-none transition-colors hover:border-[#9DA498] focus:border-[#171916]"
              />
            </div>
          )}

          {(timePreset === 'today' ||
            timePreset === '7d' ||
            timePreset === '30d' ||
            timePreset === 'custom') && (
            <>
              <div>
                <label className="sr-only">开始日期</label>
                <input
                  aria-label="开始日期"
                  type="date"
                  value={startDate}
                  max={endDate || undefined}
                  onChange={(event) => {
                    setTimePreset('custom');
                    setStartDate(event.target.value);
                    setPage(1);
                  }}
                  className="h-9 w-full rounded-xl border border-[#D9DDD4] bg-white px-4 text-[14px] text-[#171916] tabular-nums outline-none transition-colors hover:border-[#9DA498] focus:border-[#171916]"
                />
              </div>
              <div>
                <label className="sr-only">结束日期</label>
                <input
                  aria-label="结束日期"
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(event) => {
                    setTimePreset('custom');
                    setEndDate(event.target.value);
                    setPage(1);
                  }}
                  className="h-9 w-full rounded-xl border border-[#D9DDD4] bg-white px-4 text-[14px] text-[#171916] tabular-nums outline-none transition-colors hover:border-[#9DA498] focus:border-[#171916]"
                />
              </div>
            </>
          )}



          <div>
            <label className="sr-only">操作项目</label>
            <Select
              variant="arc"
              ariaLabel="按操作项目筛选"
              value={categoryFilter}
              placeholder="全部项目"
              onChange={(val) => {
                setCategoryFilter(val);
                if (
                  val &&
                  actionFilter &&
                  !facetsQuery.data?.actions.some(
                    (item) => item.category === val && item.action === actionFilter
                  )
                ) {
                  setActionFilter('');
                }
                setPage(1);
              }}
              options={categoryOptions}
            />
          </div>





          <label className="flex h-9 min-w-[180px] flex-1 items-center gap-2 rounded-full border border-[#D9DDD4] bg-[#F8F9F5] px-4 transition-colors focus-within:border-[#171916] focus-within:bg-white">
            <Search className="h-4 w-4 text-[#73796F] shrink-0" />
            <input
              aria-label="搜索日志"
              placeholder="搜索操作人、账号、IP 或关键词"
              value={draftSearch}
              onChange={(event) => setDraftSearch(event.target.value)}
              className="w-full bg-transparent text-sm text-[#171916] outline-none placeholder:text-[#8B9188]"
            />
          </label>
          <Button type="submit" variant="accent" icon={<Search className="h-3.5 w-3.5" />}>
            搜索
          </Button>
          {hasCustomFilter && (
            <Button
              type="button"
              variant="secondary"
              icon={<RotateCcw className="h-3.5 w-3.5" />}
              onClick={handleResetFilters}
            >
              重置筛选
            </Button>
          )}
          <button type="button" aria-expanded={filtersOpen} aria-controls="audit-extra-filters"
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-sm text-[#5F645D] hover:bg-[#F2F4ED] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#171916]">
            <SlidersHorizontal className="h-3.5 w-3.5" />更多筛选
            {extraFilterCount > 0 && <span className="rounded-full bg-[#E8F5B7] px-1.5 text-xs font-medium text-[#171916]">{extraFilterCount}</span>}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
          </button>
          <Button
            type="button"
            variant="ghost"
            icon={<RefreshCw className={`h-3.5 w-3.5 ${logs.isFetching ? 'animate-spin' : ''}`} />}
            onClick={() => void logs.refetch()}
          >
            刷新
          </Button>
        </div>
        {filtersOpen && (
          <div id="audit-extra-filters" className="grid grid-cols-1 gap-2 border-t border-[#EFF2EA] pt-2.5 sm:grid-cols-3 xl:max-w-[720px]">
          <div>
            <label className="sr-only">用户角色</label>
            <Select
              variant="arc"
              ariaLabel="按用户角色筛选"
              value={roleFilter}
              placeholder="全部角色"
              onChange={(val) => {
                setRoleFilter(val);
                setPage(1);
              }}
              options={roleOptions}
            />
          </div>
          <div>
            <label className="sr-only">具体操作</label>
            <Select
              variant="arc"
              ariaLabel="按具体操作筛选"
              value={actionFilter}
              placeholder="全部操作"
              onChange={(val) => {
                setActionFilter(val);
                setPage(1);
              }}
              options={actionOptions}
            />
          </div>
          <div>
            <label className="sr-only">客户端</label>
            <Select
              variant="arc"
              ariaLabel="按客户端筛选"
              value={clientTypeFilter}
              placeholder="全部客户端"
              onChange={(val) => {
                setClientTypeFilter(val);
                setPage(1);
              }}
              options={clientTypeOptions}
            />
          </div>
          </div>
        )}
      </form>

      {logs.isError && !logs.data ? (
        <ErrorState message={logs.error.message} onRetry={() => void logs.refetch()} />
      ) : (
        <section className="overflow-hidden rounded-[20px] border border-[#D9DDD4] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E8E0] px-4 py-2.5">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-[#171916]">审计记录</h3>
              {logs.isFetching && items.length > 0 && (
                <span className="text-xs text-[#73796F]">正在同步最新记录…</span>
              )}
            </div>
            <span className="text-xs tabular-nums text-[#73796F]">共 {total} 条</span>
          </div>

          <div className="relative">
            <div className="overflow-x-auto qsl-scroll">
              <table className="w-full min-w-[1200px] text-left text-sm">
                <thead className="bg-[#F8F9F5] text-[#686F65]">
                  <tr>
                    {[
                      '项目',
                      '操作',
                      '操作人',
                      '用户角色',
                      '操作时间',
                      '操作IP',
                      '操作IP区域',
                      '客户端',
                      '操作详情',
                    ].map((label) => (
                      <th key={label} className="px-5 py-3 font-medium whitespace-nowrap">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E9ECE5]">
                  {isBusy && items.length === 0 ? (
                    <TableLoadingRows
                      colSpan={9}
                      label="正在从数据库检索操作日志…"
                      subLabel="记录较多时请稍候，系统正在精准过滤"
                    />
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-12 text-center text-sm text-[#73796F]">
                        <span>该筛选条件下暂无操作记录</span>
                        {hasCustomFilter && (
                          <button
                            type="button"
                            onClick={handleResetFilters}
                            className="ml-3 text-[#171916] underline underline-offset-4 cursor-pointer"
                          >
                            重置全部筛选
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    items.map((row) => (
                      <tr key={row.id} className="hover:bg-[#FAFBF5] transition-colors">
                        <td className="px-5 py-3 font-medium whitespace-nowrap text-[#171916]">
                          {row.category}
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap text-[#171916]">{row.action}</td>
                        <td className="px-5 py-3 whitespace-nowrap text-[#171916]">
                          <span>{row.actor_name ?? '系统'}</span>
                          {row.actor_username && (
                            <span className="ml-1.5 font-mono text-xs text-[#73796F]">
                              @{row.actor_username}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap text-[#5F645D]">
                          {row.actor_role_name ?? '—'}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 tabular-nums text-[#5F645D]">
                          {new Date(row.created_at).toLocaleString('zh-CN', { hour12: false })}
                        </td>
                        <td className="px-5 py-3 font-mono text-xs whitespace-nowrap">
                          {row.ip_address ? (
                            <a
                              className="underline decoration-dotted underline-offset-4 hover:text-[#171916]"
                              href={`https://www.ip138.com/iplookup.php?${new URLSearchParams({
                                ip: row.ip_address,
                                action: '2',
                              })}`}
                              target="_blank"
                              rel="noreferrer noopener"
                              title="在 IP138 查询"
                            >
                              {row.ip_address}
                            </a>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3" title="依据网络出口 IP 估算">
                          {row.ip_region ?? (row.ip_address ? '未知' : '—')}
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap text-[#5F645D]">
                          {row.client_type || '—'}
                        </td>
                        <td className="px-5 py-3 text-[#6D736A] max-w-[320px] truncate" title={formatDetailsText(row)}>
                          {formatDetailsText(row)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {isBusy && items.length > 0 && (
              <TableLoadingOverlay
                label="正在从数据库检索操作日志…"
                subLabel="记录较多时请稍候，无需重复点击"
              />
            )}
          </div>

          <PaginationBar
            total={total}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setPageSize(next);
              setPage(1);
            }}
          />
        </section>
      )}
    </div>
  );
};
