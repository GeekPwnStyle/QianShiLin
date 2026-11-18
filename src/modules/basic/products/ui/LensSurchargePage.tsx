import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Calculator,
  Copy,
  Edit3,
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
import { Button } from '@/src/shared/ui/Button';
import { HelpTooltip } from '@/src/shared/ui/HelpTooltip';
import { Modal } from '@/src/shared/ui/Modal';
import { OperationStatus } from '@/src/shared/ui/OperationStatus';
import { PaginationBar } from '@/src/shared/ui/PaginationBar';
import { Select } from '@/src/shared/ui/Select';
import { EmptyState, ErrorState, LoadingSkeleton } from '@/src/shared/ui/StateViews';

export const LensSurchargePage: React.FC = () => {
  const queryClient = useQueryClient();
  const { debugMode, hasPermission } = useAuth();
  const canCreate = hasPermission('basic.product.create');
  const canUpdate = hasPermission('basic.product.update');
  const canDelete = hasPermission('basic.product.delete');

  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
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

  const { data: rules = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['lens-surcharges', appliedSearch, debugMode],
    queryFn: () => productsApi.listLensSurcharges(appliedSearch, debugMode),
  });

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

  const total = rules.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedRules = rules.slice((safePage - 1) * pageSize, safePage * pageSize);

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

  if (isLoading) return <LoadingSkeleton rows={6} />;
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

      {/* Toolbar */}
      <div className="bg-white border border-[#D9DDD4] rounded-[20px] p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 text-[#73796F] absolute left-3 top-1/2 -translate-y-1/2" />
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
              placeholder="搜索加价规则名称、品牌或品类"
              className="w-full h-10 pl-9 pr-3 rounded-[9px] bg-[#F8F9F5] border border-[#D9DDD4] text-[14px] outline-none focus:border-[#171916]"
            />
          </div>
          <Button
            variant="primary"
            onClick={() => {
              setAppliedSearch(searchInput);
              setPage(1);
            }}
          >
            搜索
          </Button>
          <Button
            variant="ghost"
            icon={<RotateCcw className="w-3.5 h-3.5" />}
            onClick={() => {
              setSearchInput('');
              setAppliedSearch('');
              setPage(1);
            }}
          >
            重置
          </Button>
        </div>

        {canCreate && (
          <Button variant="accent" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => openCreate()}>
            新增散光附加费
          </Button>
        )}
      </div>

      {/* Rules Table */}
      <div className="bg-white border border-[#D9DDD4] rounded-[20px] overflow-hidden">
        {pagedRules.length === 0 ? (
          <div className="p-6">
            <EmptyState
              mode={appliedSearch ? 'filtered' : 'initial'}
              actionLabel={appliedSearch ? '清除搜索' : '新增散光附加费'}
              onAction={() => {
                if (appliedSearch) {
                  setSearchInput('');
                  setAppliedSearch('');
                } else {
                  openCreate();
                }
              }}
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[14px]">
                <thead>
                  <tr className="bg-[#F8F9F5] border-b border-[#E5E8E0] text-[#5F645D]">
                    <th className="w-16 px-4 py-3 text-center font-semibold">序号</th>
                    <th className="px-4 py-3 font-semibold">规则名称</th>
                    <th className="px-4 py-3 font-semibold">附加费类型</th>
                    <th className="px-4 py-3 font-semibold">适用品类</th>
                    <th className="px-4 py-3 font-semibold">适用品牌</th>
                    <th className="px-4 py-3 text-center font-semibold">光度矩阵规格</th>
                    <th className="w-24 px-4 py-3 text-center font-semibold">状态</th>
                    <th className="px-4 py-3 font-semibold">更新时间</th>
                    <th className="w-48 px-4 py-3 text-right font-semibold">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E8E0]">
                  {pagedRules.map((rule, idx) => (
                    <tr key={rule.id} className="hover:bg-[#F8F9F5]/80 transition-colors">
                      <td className="px-4 py-3 text-center tabular-nums text-[#5F645D]">
                        {(safePage - 1) * pageSize + idx + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-[#171916]">{rule.name}</div>
                        {rule.remark && (
                          <div className="text-[12px] text-[#73796F] truncate max-w-[260px]">
                            {rule.remark}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[var(--qsl-accent-soft)] text-[12px] font-medium text-[#171916]">
                          <SlidersHorizontal className="w-3 h-3" />
                          {rule.surchargeType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#171916]">{rule.categoryName || '全部'}</td>
                      <td className="px-4 py-3 text-[#171916]">{rule.brandName || '全部'}</td>
                      <td className="px-4 py-3 text-center tabular-nums text-[#5F645D]">
                        {rule.sphRanges.length} 球镜 × {rule.cylRanges.length} 柱镜
                      </td>
                      <td className="px-4 py-3 text-center">
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
                      <td className="px-4 py-3 tabular-nums text-[#5F645D]">
                        {rule.updatedAt ? formatDate(rule.updatedAt) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2.5">
                          {canUpdate && (
                            <button
                              type="button"
                              onClick={() => openEdit(rule)}
                              className="inline-flex items-center gap-1 text-[13px] font-medium text-[var(--qsl-brand-dark)] hover:underline cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>配置矩阵</span>
                            </button>
                          )}
                          {canCreate && (
                            <button
                              type="button"
                              onClick={() => openCreate(rule)}
                              className="inline-flex items-center gap-1 text-[13px] text-[#5F645D] hover:text-[#171916] hover:underline cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              <span>复制</span>
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(rule)}
                              className="inline-flex items-center gap-1 text-[13px] text-[#DC2626] hover:underline cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>删除</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
          </>
        )}
      </div>

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

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={`确认删除规则「${deleteTarget?.name ?? ''}」`}
        maxWidthClass="max-w-md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              取消
            </Button>
            <Button
              variant="danger"
              loading={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              确认删除
            </Button>
          </>
        }
      >
        <p className="text-[14px] text-[#171916]">
          删除后门店开单将不再套用该散光/定制附加费矩阵，是否确认删除？
        </p>
      </Modal>
    </div>
  );
};
