import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Calculator,
  Copy,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/src/modules/auth/application/AuthContext';
import {
  computeLensSurcharge,
  productsApi,
  type LensSurchargeRule,
} from '@/src/modules/basic/products/infrastructure/productsApi';
import { LensSurchargeMatrixModal } from '@/src/modules/basic/products/ui/LensSurchargeMatrixModal';
import { formatCurrency, formatDate } from '@/src/shared/lib/format';
import { ConfirmDeleteModal } from '@/src/shared/ui/ConfirmDeleteModal';
import { HelpTooltip } from '@/src/shared/ui/HelpTooltip';
import { OperationStatus } from '@/src/shared/ui/OperationStatus';
import { PaginationBar } from '@/src/shared/ui/PaginationBar';
import { Select } from '@/src/shared/ui/Select';
import { ErrorState, TableLoadingOverlay, TableLoadingRows } from '@/src/shared/ui/StateViews';

const toolbarBtn =
  'inline-flex items-center gap-1.5 rounded-lg border border-[#D9DDD4] bg-white px-3 py-1.5 font-medium text-[#171916] hover:bg-[#F5F7F2] disabled:opacity-40 cursor-pointer';
const primaryBtn =
  'inline-flex items-center gap-1.5 rounded-lg border border-[var(--qsl-accent-border)] bg-[var(--qsl-accent)] px-3 py-1.5 font-medium text-[var(--qsl-accent-ink)] hover:bg-[var(--qsl-accent-hover)] disabled:opacity-40 cursor-pointer';
const toolbarInput =
  'h-9 rounded-lg border border-[#D9DDD4] bg-white px-3 text-sm outline-none focus:border-[var(--qsl-accent-border)]';

type RuleColKey =
  | 'name'
  | 'surchargeType'
  | 'categoryName'
  | 'brandName'
  | 'matrixSpec'
  | 'enabled'
  | 'updatedAt';

const RULE_COLUMNS: Array<{ key: RuleColKey; label: string }> = [
  { key: 'name', label: '规则名称' },
  { key: 'surchargeType', label: '附加费类型' },
  { key: 'categoryName', label: '适用品类' },
  { key: 'brandName', label: '适用品牌' },
  { key: 'matrixSpec', label: '光度矩阵规格' },
  { key: 'enabled', label: '状态' },
  { key: 'updatedAt', label: '更新时间' },
];

export const LensSurchargePage: React.FC = () => {
  const queryClient = useQueryClient();
  const { debugMode, hasPermission } = useAuth();
  const canCreate = hasPermission('basic.product.create');
  const canUpdate = hasPermission('basic.product.update');
  const canDelete = hasPermission('basic.product.delete');

  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [enabledFilter, setEnabledFilter] = useState<'all' | 'true' | 'false'>('all');
  const [brandFilter, setBrandFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [hiddenCols, setHiddenCols] = useState<RuleColKey[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusMsg, setStatusMsg] = useState<{ text: string; role: 'status' | 'alert' } | null>(null);

  // Matrix Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingRule, setEditingRule] = useState<LensSurchargeRule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LensSurchargeRule | null>(null);

  // Live diopter calculator
  const [calcRuleId, setCalcRuleId] = useState('');
  const [calcSph, setCalcSph] = useState('-6.50');
  const [calcCyl, setCalcCyl] = useState('-2.00');

  const { data: meta } = useQuery({
    queryKey: ['products-meta', debugMode],
    queryFn: () => productsApi.getMeta(debugMode),
  });

  const { data: rules = [], isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ['lens-surcharges', appliedSearch, debugMode],
    queryFn: () => productsApi.listLensSurcharges(appliedSearch, debugMode),
  });

  const visibleColumns = useMemo(
    () => RULE_COLUMNS.filter((c) => !hiddenCols.includes(c.key)),
    [hiddenCols]
  );

  const brandNames = useMemo(
    () => Array.from(new Set(rules.map((r) => r.brandName).filter(Boolean))),
    [rules]
  );
  const categoryNames = useMemo(
    () => Array.from(new Set(rules.map((r) => r.categoryName).filter(Boolean))),
    [rules]
  );

  const filteredRules = useMemo(() => {
    return rules.filter((r) => {
      if (enabledFilter === 'true' && !r.enabled) return false;
      if (enabledFilter === 'false' && r.enabled) return false;
      if (brandFilter !== 'all' && r.brandName !== brandFilter) return false;
      if (categoryFilter !== 'all' && r.categoryName !== categoryFilter) return false;
      return true;
    });
  }, [rules, enabledFilter, brandFilter, categoryFilter]);

  const activeCalcRule = useMemo(() => {
    if (calcRuleId) {
      return rules.find((r) => r.id === calcRuleId) ?? rules[0] ?? null;
    }
    return rules.find((r) => r.enabled) ?? rules[0] ?? null;
  }, [rules, calcRuleId]);

  const calcResult = useMemo(() => {
    if (!activeCalcRule) return null;
    const sph = Number.parseFloat(calcSph);
    const cyl = Number.parseFloat(calcCyl);
    if (!Number.isFinite(sph) || !Number.isFinite(cyl)) return null;
    return computeLensSurcharge(activeCalcRule, sph, cyl);
  }, [activeCalcRule, calcSph, calcCyl]);

  const total = filteredRules.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedRules = filteredRules.slice((safePage - 1) * pageSize, safePage * pageSize);

  const toggleEnabledMutation = useMutation({
    mutationFn: (rule: LensSurchargeRule) =>
      productsApi.updateLensSurcharge(rule.id, { enabled: !rule.enabled }, debugMode),
    onSuccess: (updated) => {
      setStatusMsg({
        text: `已${updated.enabled ? '启用' : '停用'}规则「${updated.name}」`,
        role: 'status',
      });
      void queryClient.invalidateQueries({ queryKey: ['lens-surcharges'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productsApi.deleteLensSurcharge(id, debugMode),
    onSuccess: () => {
      setDeleteTarget(null);
      setStatusMsg({ text: '已删除加价规则', role: 'status' });
      void queryClient.invalidateQueries({ queryKey: ['lens-surcharges'] });
    },
    onError: (err) => {
      setDeleteTarget(null);
      setStatusMsg({ text: err instanceof Error ? err.message : '删除失败', role: 'alert' });
    },
  });

  const openCreate = (copyFrom?: LensSurchargeRule) => {
    setModalMode('create');
    setEditingRule(copyFrom ?? null);
    setModalOpen(true);
  };

  const openEdit = (rule: LensSurchargeRule) => {
    setModalMode('edit');
    setEditingRule(rule);
    setModalOpen(true);
  };

  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  return (
    <div className="space-y-4">
      {statusMsg && <OperationStatus role={statusMsg.role}>{statusMsg.text}</OperationStatus>}

      {/* Interactive Diopter Surcharge Simulator */}
      <div className="bg-white border border-[#D9DDD4] rounded-[20px] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-[#E5E8E0]">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-[var(--qsl-brand-dark)]" />
            <span className="text-[15px] font-semibold text-[#171916]">镜片光度附加费实时试算</span>
            <HelpTooltip
              title="半开区间 [含起始, 不含结束) 校验"
              content="例如柱镜为 -2.00，将精准命中「-2.00到-3.00」（或 -1.25到-2.25）而非「0.00到-2.00」，与门店车房加价规则完全一致。"
            />
          </div>
          {calcResult && (
            <div className="text-[14px]">
              {calcResult.matched ? (
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--qsl-accent-soft)] text-[#171916] font-medium">
                  <span>
                    命中区间：球镜 [{calcResult.sphLabel}] × 柱镜 [{calcResult.cylLabel}]
                  </span>
                  <span className="font-bold text-[var(--qsl-brand-dark)] tabular-nums">
                    + {formatCurrency(calcResult.amount)}
                  </span>
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-[#F8F9F5] border border-[#D9DDD4] text-[#73796F] text-[13px]">
                  当前光度未命中该矩阵中的任意区间
                </span>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[12px] text-[#5F645D] mb-1">试算规则</label>
            <Select
              ariaLabel="选择试算规则"
              variant="white"
              value={activeCalcRule?.id ?? ''}
              placeholder="暂无加价规则"
              onChange={setCalcRuleId}
              options={rules.map((r) => ({
                value: r.id,
                label: `${r.name} (${r.brandName} · ${r.categoryName})`,
              }))}
            />
          </div>
          <div>
            <label className="block text-[12px] text-[#5F645D] mb-1">球镜度数 (SPH)</label>
            <input
              type="number"
              step="0.25"
              value={calcSph}
              onChange={(e) => setCalcSph(e.target.value)}
              placeholder="-6.50"
              className="w-full h-10 px-3 rounded-[9px] bg-[#F8F9F5] border border-[#D9DDD4] text-[14px] tabular-nums outline-none focus:border-[#171916]"
            />
          </div>
          <div>
            <label className="block text-[12px] text-[#5F645D] mb-1">柱镜度数 (CYL)</label>
            <input
              type="number"
              step="0.25"
              value={calcCyl}
              onChange={(e) => setCalcCyl(e.target.value)}
              placeholder="-2.00"
              className="w-full h-10 px-3 rounded-[9px] bg-[#F8F9F5] border border-[#D9DDD4] text-[14px] tabular-nums outline-none focus:border-[#171916]"
            />
          </div>
        </div>
      </div>

      {/* Connected Toolbar + Filters + Header Options + Rules Table + Pagination */}
      <section className="overflow-hidden rounded-[20px] border border-[#D9DDD4] bg-white text-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-[#E5E8E0] p-3">
          {canCreate && (
            <button type="button" className={primaryBtn} onClick={() => openCreate()}>
              <Plus size={15} />
              新增散光附加费
            </button>
          )}

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="flex items-center">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setAppliedSearch(searchInput);
                    setPage(1);
                  }
                }}
                aria-label="模糊搜索"
                placeholder="搜索规则名称 / 品牌 / 品类"
                className={toolbarInput + ' w-52 rounded-r-none border-r-0'}
              />
              <button
                type="button"
                onClick={() => {
                  setAppliedSearch(searchInput);
                  setPage(1);
                }}
                className="inline-flex h-9 items-center gap-1 rounded-r-lg border border-[var(--qsl-accent-border)] bg-[var(--qsl-accent)] px-3 font-medium text-[var(--qsl-accent-ink)] hover:bg-[var(--qsl-accent-hover)] cursor-pointer"
              >
                <Search size={14} />
                搜索
              </button>
            </div>
            <button
              type="button"
              aria-expanded={filtersOpen}
              className={`${toolbarBtn} ${filtersOpen ? 'bg-[#F8F9F5] border-[#B9C1B3]' : ''}`}
              onClick={() => setFiltersOpen((p) => !p)}
            >
              筛选搜索
            </button>
            <button
              type="button"
              aria-expanded={columnsOpen}
              aria-controls="surcharge-header-options"
              className={`${toolbarBtn} ${columnsOpen ? 'bg-[#F8F9F5] border-[#B9C1B3]' : ''}`}
              onClick={() => setColumnsOpen((p) => !p)}
            >
              <SlidersHorizontal className="w-4 h-4" />
              设置表头
            </button>
          </div>
        </div>

        {/* Filter Strip */}
        {filtersOpen && (
          <div className="flex flex-wrap items-center gap-2.5 border-b border-[#E5E8E0] bg-[#FAFBF8] p-3">
            <Select
              variant="compact"
              ariaLabel="启用状态筛选"
              placeholder="全部启用状态"
              className="w-40"
              buttonClassName="w-full rounded-full px-3.5 bg-white"
              value={enabledFilter}
              onChange={(v) => {
                setEnabledFilter(v as 'all' | 'true' | 'false');
                setPage(1);
              }}
              options={[
                { value: 'all', label: '全部启用状态' },
                { value: 'true', label: '仅看已启用' },
                { value: 'false', label: '仅看已停用' },
              ]}
            />
            <Select
              variant="compact"
              ariaLabel="适用品类筛选"
              placeholder="全部品类"
              className="w-44"
              buttonClassName="w-full rounded-full px-3.5 bg-white"
              value={categoryFilter}
              onChange={(v) => {
                setCategoryFilter(v);
                setPage(1);
              }}
              options={[
                { value: 'all', label: '全部适用品类' },
                ...categoryNames.map((name) => ({ value: name, label: name })),
              ]}
            />
            <Select
              variant="compact"
              ariaLabel="适用品牌筛选"
              placeholder="全部品牌"
              className="w-44"
              buttonClassName="w-full rounded-full px-3.5 bg-white"
              value={brandFilter}
              onChange={(v) => {
                setBrandFilter(v);
                setPage(1);
              }}
              options={[
                { value: 'all', label: '全部适用品牌' },
                ...brandNames.map((name) => ({ value: name, label: name })),
              ]}
            />
            {(appliedSearch ||
              searchInput ||
              enabledFilter !== 'all' ||
              categoryFilter !== 'all' ||
              brandFilter !== 'all') && (
              <button
                type="button"
                className={toolbarBtn}
                onClick={() => {
                  setSearchInput('');
                  setAppliedSearch('');
                  setEnabledFilter('all');
                  setCategoryFilter('all');
                  setBrandFilter('all');
                  setPage(1);
                }}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                重置筛选
              </button>
            )}
          </div>
        )}

        {/* Header Options Strip */}
        {columnsOpen && (
          <div
            id="surcharge-header-options"
            className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[#E5E8E0] bg-[#F8F9F5] px-4 py-3"
          >
            {RULE_COLUMNS.map((col) => (
              <label
                key={col.key}
                className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap text-[13px] text-[#171916]"
              >
                <input
                  type="checkbox"
                  checked={!hiddenCols.includes(col.key)}
                  onChange={() =>
                    setHiddenCols((prev) =>
                      prev.includes(col.key)
                        ? prev.filter((k) => k !== col.key)
                        : [...prev, col.key]
                    )
                  }
                  className="h-3.5 w-3.5 accent-[var(--qsl-accent)] border-0 outline-none focus:ring-0 cursor-pointer"
                />
                <span>{col.label}</span>
              </label>
            ))}
            <button
              type="button"
              onClick={() => setHiddenCols([])}
              className="ml-auto cursor-pointer text-xs text-[#73796F] hover:text-[#171916]"
            >
              恢复默认
            </button>
          </div>
        )}

        {/* Rules Table */}
        <div className="relative">
          <div className="overflow-x-auto qsl-scroll">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[#E5E8E0] bg-[#F8F9F5]">
                  <th className="w-16 px-3.5 py-3 text-center text-[13px] font-semibold text-[#5F645D] whitespace-nowrap align-middle border-r border-[#E5E8E0]">
                    序号
                  </th>
                  <th className="px-3.5 py-3 text-[13px] font-semibold text-[#5F645D] whitespace-nowrap align-middle border-r border-[#E5E8E0]">
                    操作
                  </th>
                  {visibleColumns.map((col) => (
                    <th
                      key={col.key}
                      className={`px-3.5 py-3 text-[13px] font-semibold text-[#5F645D] whitespace-nowrap align-middle border-r border-[#E5E8E0] last:border-r-0 ${
                        col.key === 'matrixSpec' || col.key === 'enabled' ? 'text-center' : 'text-left'
                      }`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E8E0]">
                {(isLoading || isFetching) && pagedRules.length === 0 ? (
                  <TableLoadingRows
                    colSpan={visibleColumns.length + 2}
                    label="正在从数据库加载镜片加价规则…"
                  />
                ) : pagedRules.length === 0 ? (
                  <tr>
                    <td colSpan={visibleColumns.length + 2} className="px-4 py-12 text-center text-[#73796F]">
                      暂无符合条件的镜片工艺加价规则
                    </td>
                  </tr>
                ) : (
                  pagedRules.map((rule, idx) => (
                    <tr
                      key={rule.id}
                      className={`transition-colors hover:bg-[#F1F5EC] ${
                        idx % 2 === 1 ? 'bg-[#FAFBF8]' : 'bg-white'
                      }`}
                    >
                      <td className="px-3.5 py-2.5 text-center tabular-nums text-[14px] text-[#5F645D] whitespace-nowrap align-middle border-r border-[#E5E8E0]">
                        {(safePage - 1) * pageSize + idx + 1}
                      </td>
                      <td className="px-3.5 py-2.5 text-[14px] text-[#171916] whitespace-nowrap align-middle border-r border-[#E5E8E0]">
                        <div className="inline-flex items-center gap-1.5">
                          {canUpdate && (
                            <button
                              type="button"
                              title="配置矩阵"
                              aria-label={`配置矩阵 ${rule.name}`}
                              onClick={() => openEdit(rule)}
                              className={primaryBtn + ' !px-2 !py-1'}
                            >
                              <Pencil size={14} />
                              <span className="text-xs">矩阵</span>
                            </button>
                          )}
                          {canCreate && (
                            <button
                              type="button"
                              title="复制规则"
                              aria-label={`复制 ${rule.name}`}
                              onClick={() => openCreate(rule)}
                              className={toolbarBtn + ' !px-2 !py-1'}
                            >
                              <Copy size={14} />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              title="删除规则"
                              aria-label={`删除 ${rule.name}`}
                              onClick={() => setDeleteTarget(rule)}
                              className={toolbarBtn + ' !px-2 !py-1 text-red-700'}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                      {visibleColumns.map((col) => {
                        const tdBase =
                          'px-3.5 py-2.5 text-[14px] text-[#171916] whitespace-nowrap align-middle border-r border-[#E5E8E0] last:border-r-0';
                        if (col.key === 'name') {
                          return (
                            <td key={col.key} className={tdBase}>
                              <div className="font-medium text-[#171916]">{rule.name}</div>
                              {rule.remark && (
                                <div className="text-[12px] text-[#73796F] truncate max-w-[260px]">
                                  {rule.remark}
                                </div>
                              )}
                            </td>
                          );
                        }
                        if (col.key === 'surchargeType') {
                          return (
                            <td key={col.key} className={tdBase}>
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[var(--qsl-accent-soft)] text-[12px] font-medium text-[#171916]">
                                <SlidersHorizontal className="w-3 h-3" />
                                {rule.surchargeType}
                              </span>
                            </td>
                          );
                        }
                        if (col.key === 'categoryName') {
                          return (
                            <td key={col.key} className={tdBase}>
                              {rule.categoryName || '全部'}
                            </td>
                          );
                        }
                        if (col.key === 'brandName') {
                          return (
                            <td key={col.key} className={tdBase}>
                              {rule.brandName || '全部'}
                            </td>
                          );
                        }
                        if (col.key === 'matrixSpec') {
                          return (
                            <td key={col.key} className={`${tdBase} text-center tabular-nums text-[#5F645D]`}>
                              {rule.sphRanges.length} 球镜 × {rule.cylRanges.length} 柱镜
                            </td>
                          );
                        }
                        if (col.key === 'enabled') {
                          return (
                            <td key={col.key} className={`${tdBase} text-center`}>
                              <button
                                type="button"
                                disabled={!canUpdate || toggleEnabledMutation.isPending}
                                onClick={() => toggleEnabledMutation.mutate(rule)}
                                className={`px-2.5 py-0.5 rounded-full text-[12px] font-medium border cursor-pointer disabled:opacity-50 ${
                                  rule.enabled
                                    ? 'bg-[#ECFDF3] text-[#166534] border-[#BBF7D0]'
                                    : 'bg-[#F8F9F5] text-[#73796F] border-[#D9DDD4]'
                                }`}
                              >
                                {rule.enabled ? '启用' : '停用'}
                              </button>
                            </td>
                          );
                        }
                        return (
                          <td key={col.key} className={`${tdBase} tabular-nums text-[#5F645D]`}>
                            {rule.updatedAt ? formatDate(rule.updatedAt) : '-'}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {isFetching && pagedRules.length > 0 && (
            <TableLoadingOverlay label="正在同步镜片加价规则…" />
          )}
        </div>

        <PaginationBar
          total={total}
          page={safePage}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(next) => {
            setPageSize(next);
            setPage(1);
          }}
          unit="条加价规则"
        />
      </section>

      <LensSurchargeMatrixModal
        open={modalOpen}
        mode={modalMode}
        initialRule={editingRule}
        meta={meta}
        debugMode={debugMode}
        onClose={() => setModalOpen(false)}
        onSaved={(saved) => {
          setModalOpen(false);
          setStatusMsg({
            text: `${modalMode === 'edit' ? '已更新' : '已新增'}加价规则「${saved.name}」`,
            role: 'status',
          });
          void queryClient.invalidateQueries({ queryKey: ['lens-surcharges'] });
        }}
      />

      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title="确认删除加价规则"
        subtitle="危险操作二次确认：删除后该加价矩阵将从数据库移除"
        description={
          <span>
            确定删除加价规则「<strong>{deleteTarget?.name ?? ''}</strong>」吗？
          </span>
        }
        note="删除后门店开单将不再套用该散光/定制附加费矩阵。"
        items={
          deleteTarget
            ? [
                {
                  id: deleteTarget.id,
                  label: deleteTarget.name,
                  meta: `${deleteTarget.brandName || '全部'} · ${deleteTarget.categoryName || '全部'}`,
                },
              ]
            : undefined
        }
        loading={deleteMutation.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  );
};
