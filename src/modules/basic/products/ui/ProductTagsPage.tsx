import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, RotateCcw, Search, SlidersHorizontal, Tag, Trash2 } from 'lucide-react';
import { useAuth } from '@/src/modules/auth/application/AuthContext';
import {
  productsApi,
  type ProductTagRecord,
} from '@/src/modules/basic/products/infrastructure/productsApi';
import { Button } from '@/src/shared/ui/Button';
import { ConfirmDeleteModal } from '@/src/shared/ui/ConfirmDeleteModal';
import { HelpTooltip } from '@/src/shared/ui/HelpTooltip';
import { Modal } from '@/src/shared/ui/Modal';
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

type TagColKey = 'preview' | 'name' | 'sortOrder' | 'enabled' | 'remark';

const TAG_COLUMNS: Array<{ key: TagColKey; label: string }> = [
  { key: 'preview', label: '标签效果' },
  { key: 'name', label: '标签名称' },
  { key: 'sortOrder', label: '排序' },
  { key: 'enabled', label: '启用状态' },
  { key: 'remark', label: '备注说明' },
];

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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [enabledFilter, setEnabledFilter] = useState<'all' | 'true' | 'false'>('all');
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [hiddenCols, setHiddenCols] = useState<TagColKey[]>([]);
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

  const { data: tags = [], isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ['product-tags', debugMode],
    queryFn: () => productsApi.listTags(debugMode),
  });

  const visibleColumns = useMemo(
    () => TAG_COLUMNS.filter((c) => !hiddenCols.includes(c.key)),
    [hiddenCols]
  );

  const filtered = useMemo(() => {
    const kw = appliedKeyword.trim().toLowerCase();
    return tags.filter((t) => {
      const matchKw =
        !kw ||
        t.name.toLowerCase().includes(kw) ||
        t.remark.toLowerCase().includes(kw);
      const matchEnabled =
        enabledFilter === 'all' ||
        (enabledFilter === 'true' ? t.enabled : !t.enabled);
      return matchKw && matchEnabled;
    });
  }, [tags, appliedKeyword, enabledFilter]);

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

  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  return (
    <div className="space-y-4">
      {statusMsg && <OperationStatus role={statusMsg.role}>{statusMsg.text}</OperationStatus>}

      <section className="overflow-hidden rounded-[20px] border border-[#D9DDD4] bg-white text-sm">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#E5E8E0] p-3">
          {canCreate && (
            <button type="button" className={primaryBtn} onClick={openCreate}>
              <Plus size={15} />
              新增选品标签
            </button>
          )}
          <span className="inline-flex items-center gap-1 rounded-lg bg-[#F5F7F2] px-2.5 py-1 text-xs font-medium text-[#2D6A4F]">
            <span>说明</span>
            <HelpTooltip
              title="选品标签用途"
              content="选品标签用于在新增/编辑商品档案和门店收银开单时快速筛选特色货品（如热销爆款、青少年防控、高折射率等）。"
            />
          </span>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="flex items-center">
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
                aria-label="模糊搜索"
                placeholder="搜索标签名称或说明"
                className={toolbarInput + ' w-48 rounded-r-none border-r-0'}
              />
              <button
                type="button"
                onClick={() => {
                  setAppliedKeyword(keyword);
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
              aria-controls="tags-header-options"
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
            {(appliedKeyword || keyword || enabledFilter !== 'all') && (
              <button
                type="button"
                className={toolbarBtn}
                onClick={() => {
                  setKeyword('');
                  setAppliedKeyword('');
                  setEnabledFilter('all');
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
            id="tags-header-options"
            className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[#E5E8E0] bg-[#F8F9F5] px-4 py-3"
          >
            {TAG_COLUMNS.map((col) => (
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

        {/* Table */}
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
                        col.key === 'sortOrder' || col.key === 'enabled' ? 'text-center' : 'text-left'
                      }`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E8E0]">
                {(isLoading || isFetching) && pagedRows.length === 0 ? (
                  <TableLoadingRows
                    colSpan={visibleColumns.length + 2}
                    label="正在从数据库加载选品标签…"
                  />
                ) : pagedRows.length === 0 ? (
                  <tr>
                    <td colSpan={visibleColumns.length + 2} className="px-4 py-12 text-center text-[#73796F]">
                      暂无符合条件的选品标签
                    </td>
                  </tr>
                ) : (
                  pagedRows.map((tag, idx) => (
                    <tr
                      key={tag.id}
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
                              title="编辑"
                              aria-label={`编辑 ${tag.name}`}
                              onClick={() => openEdit(tag)}
                              className={primaryBtn + ' !px-2 !py-1'}
                            >
                              <Pencil size={14} />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              title="删除"
                              aria-label={`删除 ${tag.name}`}
                              onClick={() => setDeleteTarget(tag)}
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
                        if (col.key === 'preview') {
                          return (
                            <td key={col.key} className={tdBase}>
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md border text-[12px] font-medium ${getTagBadgeClass(tag.color)}`}
                              >
                                <Tag className="w-3 h-3" />
                                <span>{tag.name}</span>
                              </span>
                            </td>
                          );
                        }
                        if (col.key === 'name') {
                          return (
                            <td key={col.key} className={`${tdBase} font-medium`}>
                              {tag.name}
                            </td>
                          );
                        }
                        if (col.key === 'sortOrder') {
                          return (
                            <td key={col.key} className={`${tdBase} text-center tabular-nums text-[#5F645D]`}>
                              {tag.sortOrder}
                            </td>
                          );
                        }
                        if (col.key === 'enabled') {
                          return (
                            <td key={col.key} className={`${tdBase} text-center`}>
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
                          );
                        }
                        return (
                          <td key={col.key} className={`${tdBase} text-[#5F645D]`}>
                            {tag.remark || '-'}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {isFetching && pagedRows.length > 0 && (
            <TableLoadingOverlay label="正在同步选品标签…" />
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
          unit="个标签"
        />
      </section>

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

      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title="确认删除选品标签"
        subtitle="危险操作二次确认：删除后该标签将从数据库移除"
        description={
          <span>
            确定删除选品标签「<strong>{deleteTarget?.name ?? ''}</strong>」吗？
          </span>
        }
        note="删除后，新建/编辑商品档案的选品标签下拉列表将不再展示该标签。"
        items={
          deleteTarget
            ? [{ id: deleteTarget.id, label: deleteTarget.name, meta: deleteTarget.remark || undefined }]
            : undefined
        }
        loading={deleteMutation.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  );
};
