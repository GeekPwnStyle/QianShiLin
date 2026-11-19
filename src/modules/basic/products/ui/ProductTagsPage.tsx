import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit3, Plus, RotateCcw, Search, Tag, Trash2 } from 'lucide-react';
import { useAuth } from '@/src/modules/auth/application/AuthContext';
import {
  productsApi,
  type ProductTagRecord,
} from '@/src/modules/basic/products/infrastructure/productsApi';
import { Button } from '@/src/shared/ui/Button';
import { HelpTooltip } from '@/src/shared/ui/HelpTooltip';
import { Modal } from '@/src/shared/ui/Modal';
import { OperationStatus } from '@/src/shared/ui/OperationStatus';
import { PaginationBar } from '@/src/shared/ui/PaginationBar';
import { Select } from '@/src/shared/ui/Select';
import { EmptyState, ErrorState, LoadingSkeleton } from '@/src/shared/ui/StateViews';

const TAG_COLOR_OPTIONS: Array<{ value: string; label: string; badgeClass: string }> = [
  { value: 'emerald', label: '青翠绿', badgeClass: 'bg-[#ECFDF3] text-[#166534] border-[#BBF7D0]' },
  { value: 'amber', label: '琥珀金', badgeClass: 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]' },
  { value: 'blue', label: '晴空蓝', badgeClass: 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]' },
  { value: 'violet', label: '紫藤调', badgeClass: 'bg-[#F5F3FF] text-[#6D28D9] border-[#DDD6FE]' },
  { value: 'rose', label: '珊瑚粉', badgeClass: 'bg-[#FFF1F2] text-[#BE123C] border-[#FECDD3]' },
  { value: 'default', label: '中性灰', badgeClass: 'bg-[#F8F9F5] text-[#171916] border-[#D9DDD4]' },
];

export function getTagBadgeClass(color: string): string {
  return (
    TAG_COLOR_OPTIONS.find((o) => o.value === color)?.badgeClass ??
    'bg-[#F8F9F5] text-[#171916] border-[#D9DDD4]'
  );
}

export const ProductTagsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { debugMode, hasPermission } = useAuth();
  const canCreate = hasPermission('basic.product.create');
  const canUpdate = hasPermission('basic.product.update');
  const canDelete = hasPermission('basic.product.delete');

  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusMsg, setStatusMsg] = useState<{ text: string; role: 'status' | 'alert' } | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<ProductTagRecord | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState('emerald');
  const [sortOrder, setSortOrder] = useState('10');
  const [enabled, setEnabled] = useState(true);
  const [remark, setRemark] = useState('');
  const [formError, setFormError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<ProductTagRecord | null>(null);

  const { data: tags = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['product-tags', debugMode],
    queryFn: () => productsApi.listTags(debugMode),
  });

  const filtered = useMemo(() => {
    const kw = appliedKeyword.trim().toLowerCase();
    return tags.filter(
      (t) =>
        !kw ||
        t.name.toLowerCase().includes(kw) ||
        t.remark.toLowerCase().includes(kw)
    );
  }, [tags, appliedKeyword]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const invalidateAll = async () => {
    await queryClient.invalidateQueries({ queryKey: ['product-tags'] });
    await queryClient.invalidateQueries({ queryKey: ['products-meta'] });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error('请输入标签名称');
      const orderNum = Number.parseInt(sortOrder, 10);
      const payload = {
        name: trimmed,
        color,
        sortOrder: Number.isFinite(orderNum) ? orderNum : 100,
        enabled,
        remark: remark.trim(),
      };
      if (editingTag) {
        return productsApi.updateTag(editingTag.id, payload, debugMode);
      }
      return productsApi.createTag(payload, debugMode);
    },
    onSuccess: (saved) => {
      setFormOpen(false);
      setStatusMsg({ text: `${editingTag ? '已更新' : '已新增'}选品标签「${saved.name}」`, role: 'status' });
      void invalidateAll();
    },
    onError: (err) => {
      setFormError(err instanceof Error ? err.message : '保存失败');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (tag: ProductTagRecord) =>
      productsApi.updateTag(tag.id, { enabled: !tag.enabled }, debugMode),
    onSuccess: (updated) => {
      setStatusMsg({
        text: `已${updated.enabled ? '启用' : '停用'}标签「${updated.name}」`,
        role: 'status',
      });
      void invalidateAll();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productsApi.deleteTag(id, debugMode),
    onSuccess: () => {
      setDeleteTarget(null);
      setStatusMsg({ text: '已删除选品标签', role: 'status' });
      void invalidateAll();
    },
    onError: (err) => {
      setDeleteTarget(null);
      setStatusMsg({ text: err instanceof Error ? err.message : '删除失败', role: 'alert' });
    },
  });

  const openCreate = () => {
    setEditingTag(null);
    setName('');
    setColor('emerald');
    setSortOrder(String((tags.length + 1) * 10));
    setEnabled(true);
    setRemark('');
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (tag: ProductTagRecord) => {
    setEditingTag(tag);
    setName(tag.name);
    setColor(tag.color || 'default');
    setSortOrder(String(tag.sortOrder));
    setEnabled(tag.enabled);
    setRemark(tag.remark || '');
    setFormError('');
    setFormOpen(true);
  };

  if (isLoading) return <LoadingSkeleton rows={6} />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  return (
    <div className="space-y-4">
      {statusMsg && <OperationStatus role={statusMsg.role}>{statusMsg.text}</OperationStatus>}

      <div className="bg-white border border-[#D9DDD4] rounded-[20px] p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 text-[#73796F] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setAppliedKeyword(keyword);
                  setPage(1);
                }
              }}
              placeholder="搜索选品标签名称或说明"
              className="w-full h-10 pl-9 pr-3 rounded-[9px] bg-[#F8F9F5] border border-[#D9DDD4] text-[14px] outline-none focus:border-[#171916]"
            />
          </div>
          <Button
            variant="primary"
            onClick={() => {
              setAppliedKeyword(keyword);
              setPage(1);
            }}
          >
            搜索
          </Button>
          <Button
            variant="ghost"
            icon={<RotateCcw className="w-3.5 h-3.5" />}
            onClick={() => {
              setKeyword('');
              setAppliedKeyword('');
              setPage(1);
            }}
          >
            重置
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <HelpTooltip
            title="选品标签用途"
            content="选品标签用于在新增/编辑商品档案和门店收银开单时快速筛选特色货品（如热销爆款、青少年防控、高折射率等）。"
          />
          {canCreate && (
            <Button variant="accent" icon={<Plus className="w-3.5 h-3.5" />} onClick={openCreate}>
              新增选品标签
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white border border-[#D9DDD4] rounded-[20px] overflow-hidden">
        {pagedRows.length === 0 ? (
          <div className="p-6">
            <EmptyState
              mode="filtered"
              actionLabel="重置搜索"
              onAction={() => {
                setKeyword('');
                setAppliedKeyword('');
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
                    <th className="px-4 py-3 font-semibold">标签效果</th>
                    <th className="px-4 py-3 font-semibold">标签名称</th>
                    <th className="w-24 px-4 py-3 text-center font-semibold">排序</th>
                    <th className="w-28 px-4 py-3 text-center font-semibold">启用状态</th>
                    <th className="px-4 py-3 font-semibold">备注说明</th>
                    <th className="w-36 px-4 py-3 text-right font-semibold">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E8E0]">
                  {pagedRows.map((tag, idx) => (
                    <tr key={tag.id} className="hover:bg-[#F8F9F5]/80 transition-colors">
                      <td className="px-4 py-3 text-center tabular-nums text-[#5F645D]">
                        {(safePage - 1) * pageSize + idx + 1}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md border text-[12px] font-medium ${getTagBadgeClass(tag.color)}`}
                        >
                          <Tag className="w-3 h-3" />
                          <span>{tag.name}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-[#171916]">{tag.name}</td>
                      <td className="px-4 py-3 text-center tabular-nums text-[#5F645D]">
                        {tag.sortOrder}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          disabled={!canUpdate || toggleMutation.isPending}
                          onClick={() => toggleMutation.mutate(tag)}
                          className={`px-2.5 py-0.5 rounded-full text-[12px] font-medium border cursor-pointer disabled:opacity-50 ${
                            tag.enabled
                              ? 'bg-[#ECFDF3] text-[#166534] border-[#BBF7D0]'
                              : 'bg-[#F8F9F5] text-[#73796F] border-[#D9DDD4]'
                          }`}
                        >
                          {tag.enabled ? '启用' : '停用'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-[#5F645D]">{tag.remark || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          {canUpdate && (
                            <button
                              type="button"
                              onClick={() => openEdit(tag)}
                              className="inline-flex items-center gap-1 text-[13px] text-[#171916] hover:underline cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>编辑</span>
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(tag)}
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
              unit="个标签"
            />
          </>
        )}
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingTag ? `编辑选品标签 · ${editingTag.name}` : '新增选品标签'}
        maxWidthClass="max-w-md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              取消
            </Button>
            <Button
              variant="primary"
              loading={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              确定保存
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && (
            <div className="rounded-xl bg-[#FEF2F2] border border-[#FECACA] px-3 py-2 text-[13px] text-[#B91C1C]">
              {formError}
            </div>
          )}
          <div>
            <label className="block text-[13px] font-medium text-[#171916] mb-1.5">
              <span className="text-[#DC2626]">*</span> 标签名称
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：超轻纯钛 / 青少年防控"
              className="w-full h-10 px-3 rounded-[9px] bg-white border border-[#D9DDD4] text-[14px] outline-none focus:border-[#171916]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-medium text-[#171916] mb-1.5">徽章色系</label>
              <Select
                ariaLabel="徽章色系"
                variant="white"
                value={color}
                onChange={setColor}
                options={TAG_COLOR_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#171916] mb-1.5">排序权重</label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full h-10 px-3 rounded-[9px] bg-white border border-[#D9DDD4] text-[14px] tabular-nums outline-none focus:border-[#171916]"
              />
            </div>
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#171916] mb-1.5">备注说明</label>
            <input
              type="text"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="选填标签使用说明"
              className="w-full h-10 px-3 rounded-[9px] bg-white border border-[#D9DDD4] text-[14px] outline-none focus:border-[#171916]"
            />
          </div>
          <label className="inline-flex items-center gap-2 text-[14px] text-[#171916] cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="w-4 h-4 accent-[var(--qsl-brand-dark)] cursor-pointer"
            />
            <span>立即启用该标签</span>
          </label>
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={`确认删除标签「${deleteTarget?.name ?? ''}」`}
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
          删除后，新建/编辑商品档案的选品标签下拉列表将不再展示「{deleteTarget?.name}」。
        </p>
      </Modal>
    </div>
  );
};
