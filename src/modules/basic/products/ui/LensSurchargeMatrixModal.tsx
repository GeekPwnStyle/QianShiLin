import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  DEFAULT_CYL_RANGES,
  DEFAULT_SPH_RANGES,
  productsApi,
  type LensSurchargeRule,
  type ProductMetaResponse,
} from '@/src/modules/basic/products/infrastructure/productsApi';
import { Button } from '@/src/shared/ui/Button';
import { Modal } from '@/src/shared/ui/Modal';
import { Select } from '@/src/shared/ui/Select';

export interface LensSurchargeMatrixModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialRule: LensSurchargeRule | null;
  meta: ProductMetaResponse | undefined;
  debugMode: boolean;
  onClose: () => void;
  onSaved: (saved: LensSurchargeRule) => void;
}

interface ContextMenuState {
  x: number;
  y: number;
  rowIndex: number | null;
  colIndex: number | null;
}

interface PendingDeleteOp {
  kind: 'row' | 'col';
  index: number;
  label: string;
}

const SURCHARGE_TYPES = ['散光附加费', '高折定制加价', '特殊通道加价', '染色/功能膜加价'];

export const LensSurchargeMatrixModal: React.FC<LensSurchargeMatrixModalProps> = ({
  open,
  mode,
  initialRule,
  meta,
  debugMode,
  onClose,
  onSaved,
}) => {
  const [name, setName] = useState('');
  const [surchargeType, setSurchargeType] = useState('散光附加费');
  const [categoryId, setCategoryId] = useState('');
  const [categoryName, setCategoryName] = useState('全部');
  const [brandId, setBrandId] = useState('');
  const [brandName, setBrandName] = useState('全部');
  const [sphRanges, setSphRanges] = useState<string[]>([...DEFAULT_SPH_RANGES]);
  const [cylRanges, setCylRanges] = useState<string[]>([...DEFAULT_CYL_RANGES]);
  const [matrix, setMatrix] = useState<string[][]>(() =>
    DEFAULT_SPH_RANGES.map(() => DEFAULT_CYL_RANGES.map(() => '0'))
  );
  const [confirmDelete, setConfirmDelete] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const [remark, setRemark] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDeleteOp | null>(null);

  useEffect(() => {
    if (!open) return;
    setErrorMsg('');
    setContextMenu(null);
    setPendingDelete(null);

    if (initialRule) {
      const isCopy = mode === 'create';
      const sph = initialRule.sphRanges.length ? [...initialRule.sphRanges] : [...DEFAULT_SPH_RANGES];
      const cyl = initialRule.cylRanges.length ? [...initialRule.cylRanges] : [...DEFAULT_CYL_RANGES];
      setName(isCopy ? `${initialRule.name}（复制）` : initialRule.name);
      setSurchargeType(initialRule.surchargeType || '散光附加费');
      setCategoryId(initialRule.categoryId || '');
      setCategoryName(initialRule.categoryName || '全部');
      setBrandId(initialRule.brandId || '');
      setBrandName(initialRule.brandName || '全部');
      setSphRanges(sph);
      setCylRanges(cyl);
      setMatrix(
        sph.map((_, rIdx) =>
          cyl.map((__, cIdx) => String(initialRule.matrix?.[rIdx]?.[cIdx] ?? 0))
        )
      );
      setConfirmDelete(initialRule.confirmDelete ?? true);
      setEnabled(initialRule.enabled ?? true);
      setRemark(initialRule.remark || '');
    } else {
      setName('');
      setSurchargeType('散光附加费');
      setCategoryId('');
      setCategoryName('全部');
      setBrandId('');
      setBrandName('全部');
      setSphRanges([...DEFAULT_SPH_RANGES]);
      setCylRanges([...DEFAULT_CYL_RANGES]);
      setMatrix(DEFAULT_SPH_RANGES.map(() => DEFAULT_CYL_RANGES.map(() => '0')));
      setConfirmDelete(true);
      setEnabled(true);
      setRemark('');
    }
  }, [open, mode, initialRule?.id]);

  useEffect(() => {
    if (!contextMenu) return;
    const closeMenu = () => setContextMenu(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };
    document.addEventListener('mousedown', closeMenu);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', closeMenu);
      window.removeEventListener('keydown', onKey);
    };
  }, [contextMenu]);

  const categoryOptions = useMemo(() => {
    const base = [{ value: '', label: '全部' }];
    const items = (meta?.categories ?? []).map((c) => ({
      value: c.id,
      label: c.name,
    }));
    return [...base, ...items];
  }, [meta?.categories]);

  const brandOptions = useMemo(() => {
    const base = [{ value: '', label: '全部' }];
    const items = (meta?.brands ?? []).map((b) => ({
      value: b.name,
      label: b.name,
    }));
    return [...base, ...items];
  }, [meta?.brands]);

  const insertRowAt = (index: number) => {
    setSphRanges((prev) => {
      const next = [...prev];
      next.splice(index, 0, '-0.00到-2.00');
      return next;
    });
    setMatrix((prev) => {
      const next = [...prev];
      next.splice(index, 0, cylRanges.map(() => '0'));
      return next;
    });
    setContextMenu(null);
  };

  const executeDeleteRow = (index: number) => {
    if (sphRanges.length <= 1) {
      setErrorMsg('至少需保留 1 个球镜度数行。');
      return;
    }
    setSphRanges((prev) => prev.filter((_, idx) => idx !== index));
    setMatrix((prev) => prev.filter((_, idx) => idx !== index));
  };

  const requestDeleteRow = (index: number) => {
    setContextMenu(null);
    if (sphRanges.length <= 1) {
      setErrorMsg('至少需保留 1 个球镜度数行。');
      return;
    }
    if (confirmDelete) {
      setPendingDelete({ kind: 'row', index, label: sphRanges[index] || `第 ${index + 1} 行` });
    } else {
      executeDeleteRow(index);
    }
  };

  const insertColAt = (index: number) => {
    setCylRanges((prev) => {
      const next = [...prev];
      next.splice(index, 0, '-0.00到-1.00');
      return next;
    });
    setMatrix((prev) =>
      prev.map((row) => {
        const nextRow = [...row];
        nextRow.splice(index, 0, '0');
        return nextRow;
      })
    );
    setContextMenu(null);
  };

  const executeDeleteCol = (index: number) => {
    if (cylRanges.length <= 1) {
      setErrorMsg('至少需保留 1 个柱镜度数列。');
      return;
    }
    setCylRanges((prev) => prev.filter((_, idx) => idx !== index));
    setMatrix((prev) => prev.map((row) => row.filter((_, idx) => idx !== index)));
  };

  const requestDeleteCol = (index: number) => {
    setContextMenu(null);
    if (cylRanges.length <= 1) {
      setErrorMsg('至少需保留 1 个柱镜度数列。');
      return;
    }
    if (confirmDelete) {
      setPendingDelete({ kind: 'col', index, label: cylRanges[index] || `第 ${index + 1} 列` });
    } else {
      executeDeleteCol(index);
    }
  };

  const handleSave = async () => {
    const cleanSph = sphRanges.map((s) => s.trim()).filter(Boolean);
    const cleanCyl = cylRanges.map((c) => c.trim()).filter(Boolean);
    if (cleanSph.length !== sphRanges.length || cleanCyl.length !== cylRanges.length) {
      setErrorMsg('请填写完整的球镜与柱镜度数区间标签（例如：0.00到-6.25）。');
      return;
    }

    const numericMatrix = matrix.map((row) =>
      row.map((cell) => {
        const val = Number.parseFloat(cell);
        return Number.isFinite(val) && val >= 0 ? Math.round(val * 100) / 100 : 0;
      })
    );

    const ruleName =
      name.trim() || `${brandName === '全部' ? '通用' : brandName}${categoryName === '全部' ? '' : categoryName}${surchargeType}`;

    setErrorMsg('');
    setSaving(true);
    try {
      const payload = {
        name: ruleName,
        surchargeType,
        categoryId,
        categoryName: categoryName || '全部',
        brandId,
        brandName: brandName || '全部',
        sphRanges: cleanSph,
        cylRanges: cleanCyl,
        matrix: numericMatrix,
        confirmDelete,
        enabled,
        remark: remark.trim(),
      };
      const saved =
        mode === 'edit' && initialRule
          ? await productsApi.updateLensSurcharge(initialRule.id, payload, debugMode)
          : await productsApi.createLensSurcharge(payload, debugMode);
      onSaved(saved);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '保存散光附加费失败');
    } finally {
      setSaving(false);
    }
  };

  const openCellMenu = (
    e: React.MouseEvent,
    rowIndex: number | null,
    colIndex: number | null
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const menuWidth = 190;
    const menuHeight = 220;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 12);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 12);
    setContextMenu({ x, y, rowIndex, colIndex });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'edit' ? `编辑 ${surchargeType}` : `新增 ${surchargeType}`}
      maxWidthClass="max-w-5xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            取消
          </Button>
          <Button variant="accent" loading={saving} onClick={() => void handleSave()}>
            确 定
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {errorMsg && (
          <div className="rounded-xl bg-[#FEF2F2] border border-[#FECACA] px-4 py-2.5 text-[14px] text-[#B91C1C]">
            {errorMsg}
          </div>
        )}

        {/* Top Selectors matching Screenshot 4 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-[13px] font-medium text-[#171916] mb-1.5">
              <span className="text-[#DC2626]">*</span>{' '}
              <span className="text-[var(--qsl-brand-dark)]">品类</span>
            </label>
            <Select
              ariaLabel="适用品类"
              variant="white"
              value={categoryId}
              onChange={(nextId) => {
                const found = categoryOptions.find((c) => c.value === nextId);
                setCategoryId(nextId);
                setCategoryName(found?.label ?? '全部');
              }}
              options={categoryOptions}
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[#171916] mb-1.5">
              <span className="text-[#DC2626]">*</span>{' '}
              <span className="text-[var(--qsl-brand-dark)]">品牌</span>
            </label>
            <Select
              ariaLabel="适用品牌"
              variant="white"
              value={brandName === '全部' ? '' : brandName}
              onChange={(nextBrand) => {
                if (!nextBrand) {
                  setBrandId('');
                  setBrandName('全部');
                } else {
                  const found = meta?.brands.find((b) => b.name === nextBrand);
                  setBrandId(found?.id ?? '');
                  setBrandName(nextBrand);
                }
              }}
              options={brandOptions}
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[#171916] mb-1.5">附加费类型</label>
            <Select
              ariaLabel="附加费类型"
              variant="white"
              value={surchargeType}
              onChange={setSurchargeType}
              options={SURCHARGE_TYPES.map((t) => ({ value: t, label: t }))}
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[#171916] mb-1.5">规则名称（可留空自动命名）</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：蔡司高散光定制附加费"
              className="w-full h-10 px-3 rounded-[9px] bg-white border border-[#D9DDD4] text-[14px] text-[#171916] outline-none focus:border-[#171916]"
            />
          </div>
        </div>

        {/* 附加费设置 hints & controls */}
        <div className="space-y-3">
          <div className="text-[14px] font-semibold text-[var(--qsl-brand-dark)]">附加费设置</div>
          <div className="rounded-xl bg-[#F8F9F5] border border-[#E5E8E0] p-3.5 text-[13px] text-[#5F645D] space-y-1 leading-relaxed">
            <div className="font-medium text-[#171916]">提示：</div>
            <div>1、右键点击表格，可以新增删除 行或列；</div>
            <div>
              2、度数范围的包含关系，为 0.00（含0.00） 到 -2（不含-2.00），如镜片柱镜为-2.00，那么附加费价格是用(-2.00到-3.00)来计算，而不是(0.00到-2.00)；
            </div>
            <div>3、输入价格时，按键盘上左边的Tab键切换下一个单元格；</div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4">
              <label className="inline-flex items-center gap-2 text-[14px] text-[#171916] cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmDelete}
                  onChange={(e) => setConfirmDelete(e.target.checked)}
                  className="w-4 h-4 accent-[var(--qsl-brand-dark)] cursor-pointer"
                />
                <span>删除行列时提示确认</span>
              </label>
              <label className="inline-flex items-center gap-2 text-[14px] text-[#171916] cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="w-4 h-4 accent-[var(--qsl-brand-dark)] cursor-pointer"
                />
                <span>启用本规则</span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => insertRowAt(sphRanges.length)}
              >
                新增球镜行
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => insertColAt(cylRanges.length)}
              >
                新增柱镜列
              </Button>
            </div>
          </div>

          {/* Pending inline delete confirmation */}
          {pendingDelete && (
            <div className="rounded-xl bg-[#FEF2F2] border border-[#FECACA] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
              <span className="text-[14px] text-[#B91C1C]">
                确认删除{pendingDelete.kind === 'row' ? '球镜行' : '柱镜列'}「{pendingDelete.label}」吗？
              </span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => setPendingDelete(null)}>
                  取消
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    if (pendingDelete.kind === 'row') executeDeleteRow(pendingDelete.index);
                    else executeDeleteCol(pendingDelete.index);
                    setPendingDelete(null);
                  }}
                >
                  确认删除
                </Button>
              </div>
            </div>
          )}

          {/* Diagonal Header + Matrix Table */}
          <div className="overflow-x-auto border border-[#D9DDD4] rounded-xl bg-white">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#F8F9F5]">
                  <th className="relative w-36 min-w-[138px] h-14 border-b border-r border-[#D9DDD4] p-0 select-none overflow-hidden">
                    <svg
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      aria-hidden="true"
                    >
                      <line x1="0" y1="0" x2="100" y2="100" stroke="#C8CEC0" strokeWidth="1.5" />
                    </svg>
                    <span className="absolute top-1.5 right-2.5 text-[12px] font-semibold text-[#171916]">
                      柱镜
                    </span>
                    <span className="absolute bottom-1.5 left-2.5 text-[12px] font-semibold text-[#171916]">
                      球镜
                    </span>
                  </th>
                  {cylRanges.map((cyl, cIdx) => (
                    <th
                      key={`cyl-${cIdx}`}
                      onContextMenu={(e) => openCellMenu(e, null, cIdx)}
                      title="右键可插入或删除柱镜列"
                      className="min-w-[116px] px-2 py-2 border-b border-r last:border-r-0 border-[#D9DDD4] font-semibold text-[#171916]"
                    >
                      <input
                        type="text"
                        value={cyl}
                        onChange={(e) =>
                          setCylRanges((prev) =>
                            prev.map((item, idx) => (idx === cIdx ? e.target.value : item))
                          )
                        }
                        aria-label={`柱镜区间 ${cIdx + 1}`}
                        className="w-full h-8 px-2 text-center rounded-md bg-white border border-transparent hover:border-[#D9DDD4] focus:border-[#171916] font-semibold text-[#171916] outline-none tabular-nums"
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sphRanges.map((sph, rIdx) => (
                  <tr key={`sph-${rIdx}`} className="border-b last:border-b-0 border-[#E5E8E0]">
                    <td
                      onContextMenu={(e) => openCellMenu(e, rIdx, null)}
                      title="右键可插入或删除球镜行"
                      className="px-2 py-2 border-r border-[#D9DDD4] bg-[#F8F9F5]/60 font-medium text-[#171916]"
                    >
                      <input
                        type="text"
                        value={sph}
                        onChange={(e) =>
                          setSphRanges((prev) =>
                            prev.map((item, idx) => (idx === rIdx ? e.target.value : item))
                          )
                        }
                        aria-label={`球镜区间 ${rIdx + 1}`}
                        className="w-full h-8 px-2 text-center rounded-md bg-white border border-transparent hover:border-[#D9DDD4] focus:border-[#171916] text-[13px] text-[#171916] outline-none tabular-nums"
                      />
                    </td>
                    {cylRanges.map((_, cIdx) => (
                      <td
                        key={`cell-${rIdx}-${cIdx}`}
                        onContextMenu={(e) => openCellMenu(e, rIdx, cIdx)}
                        className="p-2 border-r last:border-r-0 border-[#E5E8E0]"
                      >
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          value={matrix[rIdx]?.[cIdx] ?? '0'}
                          onChange={(e) =>
                            setMatrix((prev) =>
                              prev.map((row, r) =>
                                r === rIdx
                                  ? row.map((cell, c) => (c === cIdx ? e.target.value : cell))
                                  : row
                              )
                            )
                          }
                          aria-label={`${sph} × ${cylRanges[cIdx]} 附加费`}
                          className="w-full h-9 px-2.5 rounded-md border border-[#D9DDD4] bg-white text-[14px] text-[#171916] tabular-nums outline-none focus:border-[#171916] focus:ring-2 focus:ring-[var(--qsl-accent-soft)]"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[#171916] mb-1">规则备注（选填）</label>
            <input
              type="text"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="例如：超出常规现片范围按每片/每副加收散光定制费"
              className="w-full h-9 px-3 rounded-[9px] bg-white border border-[#D9DDD4] text-[13px] text-[#171916] outline-none focus:border-[#171916]"
            />
          </div>
        </div>
      </div>

      {/* Right-click context menu portal */}
      {contextMenu &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x }}
            onMouseDown={(e) => e.stopPropagation()}
            className="z-[200] w-48 rounded-xl bg-white border border-[#D9DDD4] shadow-xl p-1.5 text-[13px] text-[#171916]"
          >
            {contextMenu.rowIndex !== null && (
              <>
                <button
                  type="button"
                  onClick={() => insertRowAt(contextMenu.rowIndex!)}
                  className="w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-[#F8F9F5] text-left cursor-pointer"
                >
                  <ArrowUp className="w-3.5 h-3.5 text-[#5F645D]" />
                  <span>在上方插入行</span>
                </button>
                <button
                  type="button"
                  onClick={() => insertRowAt(contextMenu.rowIndex! + 1)}
                  className="w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-[#F8F9F5] text-left cursor-pointer"
                >
                  <ArrowDown className="w-3.5 h-3.5 text-[#5F645D]" />
                  <span>在下方插入行</span>
                </button>
                <button
                  type="button"
                  onClick={() => requestDeleteRow(contextMenu.rowIndex!)}
                  className="w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-[#FEF2F2] text-[#DC2626] text-left cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>删除当前行</span>
                </button>
              </>
            )}

            {contextMenu.rowIndex !== null && contextMenu.colIndex !== null && (
              <div className="my-1 border-t border-[#E5E8E0]" />
            )}

            {contextMenu.colIndex !== null && (
              <>
                <button
                  type="button"
                  onClick={() => insertColAt(contextMenu.colIndex!)}
                  className="w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-[#F8F9F5] text-left cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-[#5F645D]" />
                  <span>在左侧插入列</span>
                </button>
                <button
                  type="button"
                  onClick={() => insertColAt(contextMenu.colIndex! + 1)}
                  className="w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-[#F8F9F5] text-left cursor-pointer"
                >
                  <ArrowRight className="w-3.5 h-3.5 text-[#5F645D]" />
                  <span>在右侧插入列</span>
                </button>
                <button
                  type="button"
                  onClick={() => requestDeleteCol(contextMenu.colIndex!)}
                  className="w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-[#FEF2F2] text-[#DC2626] text-left cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>删除当前列</span>
                </button>
              </>
            )}
          </div>,
          document.body
        )}
    </Modal>
  );
};
