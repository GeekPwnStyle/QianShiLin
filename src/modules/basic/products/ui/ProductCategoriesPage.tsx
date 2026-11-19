import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronDown,
  ChevronRight,
  FolderPlus,
  Maximize2,
  Minimize2,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/src/modules/auth/application/AuthContext';
import {
  productsApi,
  type ProductCategoryRecord,
} from '@/src/modules/basic/products/infrastructure/productsApi';
import { Button } from '@/src/shared/ui/Button';
import { ConfirmDeleteModal } from '@/src/shared/ui/ConfirmDeleteModal';
import { HelpTooltip } from '@/src/shared/ui/HelpTooltip';
import { Modal } from '@/src/shared/ui/Modal';
import { OperationStatus } from '@/src/shared/ui/OperationStatus';
import { Select } from '@/src/shared/ui/Select';
import { ErrorState, TableLoadingOverlay, TableLoadingRows } from '@/src/shared/ui/StateViews';

const toolbarBtn =
  'inline-flex items-center gap-1.5 rounded-lg border border-[#D9DDD4] bg-white px-3 py-1.5 font-medium text-[#171916] hover:bg-[#F5F7F2] disabled:opacity-40 cursor-pointer';
const primaryBtn =
  'inline-flex items-center gap-1.5 rounded-lg border border-[var(--qsl-accent-border)] bg-[var(--qsl-accent)] px-3 py-1.5 font-medium text-[var(--qsl-accent-ink)] hover:bg-[var(--qsl-accent-hover)] disabled:opacity-40 cursor-pointer';
const toolbarInput =
  'h-9 rounded-lg border border-[#D9DDD4] bg-white px-3 text-sm outline-none focus:border-[var(--qsl-accent-border)]';

interface CategoryTreeNode extends ProductCategoryRecord {
  children: CategoryTreeNode[];
  depth: number;
}

export const ProductCategoriesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { debugMode, hasPermission } = useAuth();
  const canCreate = hasPermission('basic.product.create');
  const canUpdate = hasPermission('basic.product.update');
  const canDelete = hasPermission('basic.product.delete');

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [readonlyFilter, setReadonlyFilter] = useState<'all' | 'editable' | 'readonly'>('all');
  const [statusMsg, setStatusMsg] = useState<{ text: string; role: 'status' | 'alert' } | null>(null);

  // Add/Edit modal
  const [formOpen, setFormOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<ProductCategoryRecord | null>(null);
  const [parentCat, setParentCat] = useState<ProductCategoryRecord | null>(null);
  const [catName, setCatName] = useState('');
  const [catSortOrder, setCatSortOrder] = useState('10');
  const [catReadonly, setCatReadonly] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete confirm modal
  const [deleteTargetIds, setDeleteTargetIds] = useState<string[] | null>(null);
  const [deleteTitle, setDeleteTitle] = useState('');

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ['product-categories', debugMode],
    queryFn: () => productsApi.listCategories(debugMode),
  });

  const categories = data?.items ?? [];

  const treeNodes = useMemo(() => {
    const map = new Map<string, CategoryTreeNode>();
    for (const c of categories) {
      map.set(c.id, { ...c, children: [], depth: 0 });
    }
    const roots: CategoryTreeNode[] = [];
    for (const c of categories) {
      const node = map.get(c.id)!;
      if (c.parentId && map.has(c.parentId)) {
        map.get(c.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }
    const assignDepth = (nodes: CategoryTreeNode[], depth: number) => {
      nodes.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'zh-CN'));
      for (const n of nodes) {
        n.depth = depth;
        assignDepth(n.children, depth + 1);
      }
    };
    assignDepth(roots, 0);
    return roots;
  }, [categories]);

  const hasFilterActive = Boolean(search.trim()) || readonlyFilter !== 'all';

  const filteredTree = useMemo(() => {
    if (!hasFilterActive) return treeNodes;
    const kw = search.trim().toLowerCase();
    const walkFilter = (nodes: CategoryTreeNode[]): CategoryTreeNode[] => {
      const next: CategoryTreeNode[] = [];
      for (const n of nodes) {
        const filteredChildren = walkFilter(n.children);
        const matchSearch = !kw || n.name.toLowerCase().includes(kw);
        const matchStatus =
          readonlyFilter === 'all' ||
          (readonlyFilter === 'readonly' ? n.isReadonly : !n.isReadonly);
        if ((matchSearch && matchStatus) || filteredChildren.length > 0) {
          next.push({ ...n, children: filteredChildren });
        }
      }
      return next;
    };
    return walkFilter(treeNodes);
  }, [treeNodes, hasFilterActive, search, readonlyFilter]);

  const flatRows = useMemo(() => {
    const rows: CategoryTreeNode[] = [];
    const walk = (nodes: CategoryTreeNode[]) => {
      for (const n of nodes) {
        rows.push(n);
        if (n.children.length > 0 && (hasFilterActive || expandedIds.has(n.id))) {
          walk(n.children);
        }
      }
    };
    walk(filteredTree);
    return rows;
  }, [filteredTree, expandedIds, hasFilterActive]);

  const expandableIds = useMemo(
    () => categories.filter((c) => categories.some((sub) => sub.parentId === c.id)).map((c) => c.id),
    [categories]
  );

  const invalidateAll = async () => {
    await queryClient.invalidateQueries({ queryKey: ['product-categories'] });
    await queryClient.invalidateQueries({ queryKey: ['products-meta'] });
    await queryClient.invalidateQueries({ queryKey: ['products'] });
  };

  const toggleReadonlyMutation = useMutation({
    mutationFn: ({ id, isReadonly }: { id: string; isReadonly: boolean }) =>
      productsApi.updateCategory(id, { isReadonly }, debugMode),
    onSuccess: (updated) => {
      setStatusMsg({
        text: `已将「${updated.name}」设为${updated.isReadonly ? '只读锁定' : '可编辑'}`,
        role: 'status',
      });
      void invalidateAll();
    },
    onError: (err) => {
      setStatusMsg({ text: err instanceof Error ? err.message : '切换失败', role: 'alert' });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const trimmed = catName.trim();
      if (!trimmed) throw new Error('请输入品类名称');
      const sortOrder = Number.parseInt(catSortOrder, 10);
      if (editingCat) {
        return productsApi.updateCategory(
          editingCat.id,
          {
            name: trimmed,
            sortOrder: Number.isFinite(sortOrder) ? sortOrder : editingCat.sortOrder,
            isReadonly: catReadonly,
          },
          debugMode
        );
      }
      return productsApi.createCategory(
        {
          name: trimmed,
          parentId: parentCat?.id ?? null,
          sortOrder: Number.isFinite(sortOrder) ? sortOrder : 100,
          isReadonly: catReadonly,
        },
        debugMode
      );
    },
    onSuccess: (saved) => {
      if (parentCat) {
        setExpandedIds((prev) => new Set([...prev, parentCat.id]));
      }
      setFormOpen(false);
      setStatusMsg({ text: `${editingCat ? '已更新' : '已新增'}品类「${saved.name}」`, role: 'status' });
      void invalidateAll();
    },
    onError: (err) => {
      setFormError(err instanceof Error ? err.message : '保存失败');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 1) {
        await productsApi.deleteCategory(ids[0], debugMode);
        return { deletedCount: 1 };
      }
      return productsApi.batchDeleteCategories(ids, debugMode);
    },
    onSuccess: (res) => {
      setSelectedIds([]);
      setDeleteTargetIds(null);
      setStatusMsg({ text: `已删除 ${res.deletedCount} 个品类`, role: 'status' });
      void invalidateAll();
    },
    onError: (err) => {
      setDeleteTargetIds(null);
      setStatusMsg({ text: err instanceof Error ? err.message : '删除失败', role: 'alert' });
    },
  });

  const openCreateRoot = () => {
    setEditingCat(null);
    setParentCat(null);
    setCatName('');
    setCatSortOrder(String((treeNodes.length + 1) * 10));
    setCatReadonly(false);
    setFormError('');
    setFormOpen(true);
  };

  const openCreateChild = (parent: ProductCategoryRecord) => {
    setEditingCat(null);
    setParentCat(parent);
    setCatName('');
    setCatSortOrder('10');
    setCatReadonly(false);
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (cat: ProductCategoryRecord) => {
    setEditingCat(cat);
    setParentCat(null);
    setCatName(cat.name);
    setCatSortOrder(String(cat.sortOrder));
    setCatReadonly(cat.isReadonly);
    setFormError('');
    setFormOpen(true);
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = flatRows.length > 0 && flatRows.every((r) => selectedIds.includes(r.id));

  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  return (
    <div className="space-y-4">
      {statusMsg && <OperationStatus role={statusMsg.role}>{statusMsg.text}</OperationStatus>}

      <section className="overflow-hidden rounded-[20px] border border-[#D9DDD4] bg-white text-sm">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#E5E8E0] p-3">
          {canCreate && (
            <button type="button" className={primaryBtn} onClick={openCreateRoot}>
              <Plus size={15} />
              新增 1级品类
            </button>
          )}
          <button
            type="button"
            className={toolbarBtn}
            onClick={() => setExpandedIds(new Set(expandableIds))}
          >
            <Maximize2 className="w-3.5 h-3.5" />
            展开
          </button>
          <button
            type="button"
            className={toolbarBtn}
            onClick={() => setExpandedIds(new Set())}
          >
            <Minimize2 className="w-3.5 h-3.5" />
            收起
          </button>
          {canDelete && (
            <button
              type="button"
              className={toolbarBtn + ' text-red-700'}
              disabled={selectedIds.length === 0}
              onClick={() => {
                setDeleteTitle(`批量删除选中的 ${selectedIds.length} 个品类`);
                setDeleteTargetIds(selectedIds);
              }}
            >
              批量删除{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
            </button>
          )}

          <span className="inline-flex items-center gap-1 rounded-lg bg-[#F5F7F2] px-2.5 py-1 text-xs font-medium text-[#2D6A4F]">
            <span>说明</span>
            <HelpTooltip
              title="商品分类体系说明"
              content={
                '1. 支持多级商品品类树形维护，与商品列表左侧品类树实时联动。\n2. 开启「只读」锁定的系统关键品类禁止直接改名或删除，需先切换为「可编辑」。\n3. 仍关联商品的品类不可删除。'
              }
            />
          </span>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <span className="text-xs text-[#5F645D] tabular-nums mr-1">
              共 <strong className="text-[#171916]">{categories.length}</strong> 个分类 · 关联商品{' '}
              <strong className="text-[#171916]">{data?.totalProducts ?? 0}</strong> 件
            </span>
            <input
              type="text"
              aria-label="模糊搜索"
              placeholder="搜索品类名称"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={toolbarInput + ' w-44 min-w-0'}
            />
            <button
              type="button"
              aria-expanded={filtersOpen}
              className={`${toolbarBtn} ${filtersOpen ? 'bg-[#F8F9F5] border-[#B9C1B3]' : ''}`}
              onClick={() => setFiltersOpen((p) => !p)}
            >
              筛选搜索
            </button>
          </div>
        </div>

        {/* Filter Strip */}
        {filtersOpen && (
          <div className="flex flex-wrap items-center gap-2.5 border-b border-[#E5E8E0] bg-[#FAFBF8] p-3">
            <Select
              variant="compact"
              ariaLabel="只读状态筛选"
              placeholder="全部状态"
              className="w-44"
              buttonClassName="w-full rounded-full px-3.5 bg-white"
              value={readonlyFilter}
              onChange={(v) => setReadonlyFilter(v as 'all' | 'editable' | 'readonly')}
              options={[
                { value: 'all', label: '全部锁定状态' },
                { value: 'editable', label: '仅可编辑品类' },
                { value: 'readonly', label: '仅只读锁定品类' },
              ]}
            />
            {hasFilterActive && (
              <button
                type="button"
                className={toolbarBtn}
                onClick={() => {
                  setSearch('');
                  setReadonlyFilter('all');
                }}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                重置筛选
              </button>
            )}
          </div>
        )}

        {/* Tree Table */}
        <div className="relative">
          <div className="overflow-x-auto qsl-scroll">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[#E5E8E0] bg-[#F8F9F5]">
                  <th className="w-11 px-3.5 py-3 text-center border-r border-[#E5E8E0]">
                    <input
                      type="checkbox"
                      aria-label="全选品类"
                      checked={allSelected}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedIds(flatRows.map((r) => r.id));
                        else setSelectedIds([]);
                      }}
                      className="accent-[#171916] w-4 h-4 cursor-pointer"
                    />
                  </th>
                  <th className="px-3.5 py-3 text-[13px] font-semibold text-[#5F645D] whitespace-nowrap align-middle border-r border-[#E5E8E0]">
                    操作
                  </th>
                  <th className="w-16 px-3.5 py-3 text-center text-[13px] font-semibold text-[#5F645D] whitespace-nowrap align-middle border-r border-[#E5E8E0]">
                    序号
                  </th>
                  <th className="w-32 px-3.5 py-3 text-center text-[13px] font-semibold text-[#5F645D] whitespace-nowrap align-middle border-r border-[#E5E8E0]">
                    <span className="inline-flex items-center justify-center gap-1">
                      <span>是否只读</span>
                      <HelpTooltip content="设为「只读」时该品类锁定防误改/误删；点击开关即可切换。" />
                    </span>
                  </th>
                  <th className="px-3.5 py-3 text-[13px] font-semibold text-[#5F645D] whitespace-nowrap align-middle">
                    品类
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E8E0]">
                {(isLoading || isFetching) && flatRows.length === 0 ? (
                  <TableLoadingRows colSpan={5} label="正在从数据库加载商品分类体系…" />
                ) : flatRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-[#73796F]">
                      {hasFilterActive ? '暂无符合筛选条件的商品分类' : '暂无商品分类，请点击上方「新增 1级品类」创建'}
                    </td>
                  </tr>
                ) : (
                  flatRows.map((node, index) => {
                    const hasChildren = node.children.length > 0;
                    const isExpanded = hasFilterActive || expandedIds.has(node.id);
                    const checked = selectedIds.includes(node.id);
                    const rowBg = checked
                      ? 'bg-[var(--qsl-accent-soft-35)]'
                      : index % 2 === 1
                        ? 'bg-[#FAFBF8]'
                        : 'bg-white';

                    return (
                      <tr key={node.id} className={`transition-colors hover:bg-[#F1F5EC] ${rowBg}`}>
                        <td className="w-11 px-3.5 py-2.5 text-center border-r border-[#E5E8E0]">
                          <input
                            type="checkbox"
                            aria-label={`选择品类 ${node.name}`}
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedIds((p) => [...p, node.id]);
                              else setSelectedIds((p) => p.filter((x) => x !== node.id));
                            }}
                            className="accent-[#171916] w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="px-3.5 py-2.5 text-[14px] text-[#171916] whitespace-nowrap align-middle border-r border-[#E5E8E0]">
                          <div className="inline-flex items-center gap-1.5">
                            {canCreate && (
                              <button
                                type="button"
                                onClick={() => openCreateChild(node)}
                                className={toolbarBtn + ' !px-2.5 !py-1 text-xs'}
                              >
                                新增子分类
                              </button>
                            )}
                            {canUpdate && (
                              <button
                                type="button"
                                onClick={() => openEdit(node)}
                                disabled={node.isReadonly}
                                title={node.isReadonly ? '只读状态请先解锁后再编辑' : '编辑品类'}
                                aria-label={`编辑 ${node.name}`}
                                className={primaryBtn + ' !px-2 !py-1'}
                              >
                                <Pencil size={14} />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                disabled={node.isReadonly}
                                onClick={() => {
                                  setDeleteTitle(`删除品类「${node.name}」`);
                                  setDeleteTargetIds([node.id]);
                                }}
                                title={node.isReadonly ? '只读品类禁止删除' : '删除品类'}
                                aria-label={`删除 ${node.name}`}
                                className={toolbarBtn + ' !px-2 !py-1 text-red-700'}
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5 text-center border-r border-[#E5E8E0] tabular-nums text-[14px] text-[#5F645D]">
                          {index + 1}
                        </td>
                        <td className="px-3.5 py-2.5 text-center border-r border-[#E5E8E0]">
                          <button
                            type="button"
                            disabled={!canUpdate || toggleReadonlyMutation.isPending}
                            onClick={() =>
                              toggleReadonlyMutation.mutate({
                                id: node.id,
                                isReadonly: !node.isReadonly,
                              })
                            }
                            className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[12px] font-medium transition-colors cursor-pointer disabled:opacity-50 ${
                              node.isReadonly
                                ? 'bg-[#EAECE6] text-[#5F645D] border border-[#C8CEC0]'
                                : 'bg-[var(--qsl-accent)] text-[var(--qsl-accent-ink)] border border-[var(--qsl-accent-border)]'
                            }`}
                          >
                            {!node.isReadonly ? (
                              <>
                                <span>可编辑</span>
                                <span className="w-3 h-3 rounded-full bg-white border border-[#171916]/20" />
                              </>
                            ) : (
                              <>
                                <span className="w-3 h-3 rounded-full bg-[#5F645D]" />
                                <span>只读</span>
                              </>
                            )}
                          </button>
                        </td>
                        <td className="px-3.5 py-2.5 text-[14px] text-[#171916] whitespace-nowrap align-middle">
                          <div
                            className="flex items-center gap-2"
                            style={{ paddingLeft: `${node.depth * 24}px` }}
                          >
                            {hasChildren ? (
                              <button
                                type="button"
                                onClick={() => toggleExpand(node.id)}
                                aria-label={isExpanded ? `收起 ${node.name}` : `展开 ${node.name}`}
                                className="w-5 h-5 rounded inline-flex items-center justify-center text-[#5F645D] hover:bg-[#EAECE6] hover:text-[#171916] cursor-pointer"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </button>
                            ) : (
                              <span className="w-5 inline-block" />
                            )}
                            <span className="font-medium text-[#171916]">{node.name}</span>
                            {node.depth > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-[#F8F9F5] border border-[#E5E8E0] text-[11px] text-[#73796F]">
                                {node.depth + 1}级分类
                              </span>
                            )}
                            <span className="ml-1 px-2 py-0.5 rounded-full bg-[#F8F9F5] border border-[#E5E8E0] text-[12px] text-[#5F645D] tabular-nums">
                              {node.productCount} 件商品
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {isFetching && flatRows.length > 0 && (
            <TableLoadingOverlay label="正在同步商品分类体系…" />
          )}
        </div>
      </section>

      {/* Add / Edit Category Modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={
          editingCat
            ? `编辑品类 · ${editingCat.name}`
            : parentCat
              ? `新增子分类（上级：${parentCat.name}）`
              : '新增 1级品类'
        }
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
          {parentCat && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F8F9F5] border border-[#E5E8E0] text-[13px] text-[#5F645D]">
              <FolderPlus className="w-4 h-4 text-[#171916]" />
              <span>上级分类：{parentCat.name}</span>
            </div>
          )}
          <div>
            <label className="block text-[13px] font-medium text-[#171916] mb-1.5">
              <span className="text-[#DC2626]">*</span> 品类名称
            </label>
            <input
              type="text"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="例如：防蓝光单光片 / 钛合金镜架"
              className="w-full h-10 px-3 rounded-[9px] bg-white border border-[#D9DDD4] text-[14px] outline-none focus:border-[#171916]"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#171916] mb-1.5">显示排序权重（越小越靠前）</label>
            <input
              type="number"
              value={catSortOrder}
              onChange={(e) => setCatSortOrder(e.target.value)}
              className="w-full h-10 px-3 rounded-[9px] bg-white border border-[#D9DDD4] text-[14px] tabular-nums outline-none focus:border-[#171916]"
            />
          </div>
          <label className="inline-flex items-center gap-2 text-[14px] text-[#171916] cursor-pointer">
            <input
              type="checkbox"
              checked={catReadonly}
              onChange={(e) => setCatReadonly(e.target.checked)}
              className="w-4 h-4 accent-[var(--qsl-brand-dark)] cursor-pointer"
            />
            <span>设为只读锁定（防止误改名称或误删除）</span>
          </label>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <ConfirmDeleteModal
        open={Boolean(deleteTargetIds)}
        title={deleteTitle || '确认删除品类'}
        subtitle="危险操作二次确认：删除后该商品品类将从数据库移除"
        description={
          <span>
            确定删除选中的 <strong>{deleteTargetIds?.length ?? 0}</strong> 个商品品类吗？
          </span>
        }
        note="若品类下存在未迁移的商品或处于「只读」锁定状态，系统将拦截该删除操作。"
        items={(deleteTargetIds ?? []).map((id) => {
          const matched = categories.find((c) => c.id === id);
          return {
            id,
            label: matched?.name || id,
            meta: matched ? `${matched.productCount} 件商品` : undefined,
          };
        })}
        loading={deleteMutation.isPending}
        onClose={() => setDeleteTargetIds(null)}
        onConfirm={() => deleteTargetIds && deleteMutation.mutate(deleteTargetIds)}
      />
    </div>
  );
};
