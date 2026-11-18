import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronDown,
  ChevronRight,
  FolderPlus,
  Maximize2,
  Minimize2,
  Plus,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/src/modules/auth/application/AuthContext';
import {
  productsApi,
  type ProductCategoryRecord,
} from '@/src/modules/basic/products/infrastructure/productsApi';
import { Button } from '@/src/shared/ui/Button';
import { HelpTooltip } from '@/src/shared/ui/HelpTooltip';
import { Modal } from '@/src/shared/ui/Modal';
import { OperationStatus } from '@/src/shared/ui/OperationStatus';
import { ErrorState, LoadingSkeleton } from '@/src/shared/ui/StateViews';

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

  const { data, isLoading, isError, refetch } = useQuery({
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

  const flatRows = useMemo(() => {
    const rows: CategoryTreeNode[] = [];
    const walk = (nodes: CategoryTreeNode[]) => {
      for (const n of nodes) {
        rows.push(n);
        if (n.children.length > 0 && expandedIds.has(n.id)) {
          walk(n.children);
        }
      }
    };
    walk(treeNodes);
    return rows;
  }, [treeNodes, expandedIds]);

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

  if (isLoading) return <LoadingSkeleton rows={8} />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  return (
    <div className="space-y-4">
      {statusMsg && <OperationStatus role={statusMsg.role}>{statusMsg.text}</OperationStatus>}

      <div className="bg-white border border-[#D9DDD4] rounded-[20px] p-4 space-y-4">
        {/* Toolbar matching Screenshot 2 */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="accent"
              size="sm"
              icon={<Maximize2 className="w-3.5 h-3.5" />}
              onClick={() => setExpandedIds(new Set(expandableIds))}
            >
              展 开
            </Button>
            <Button
              variant="accent"
              size="sm"
              icon={<Minimize2 className="w-3.5 h-3.5" />}
              onClick={() => setExpandedIds(new Set())}
            >
              收 起
            </Button>

            <span className="h-5 w-[1px] bg-[#D9DDD4] mx-1" aria-hidden="true" />

            <div className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[var(--qsl-brand-dark)]">
              <span>说明</span>
              <HelpTooltip
                title="商品分类体系说明"
                content={
                  '1. 支持多级商品品类树形维护，与商品列表左侧品类树实时联动。\n2. 开启「只读」锁定的系统关键品类禁止直接改名或删除，需先切换为「可编辑」。\n3. 仍关联商品的品类不可删除。'
                }
              />
            </div>

            {canCreate && (
              <Button
                variant="accent"
                size="sm"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={openCreateRoot}
              >
                新增 1级品类
              </Button>
            )}

            {canDelete && (
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 className="w-3.5 h-3.5" />}
                disabled={selectedIds.length === 0}
                onClick={() => {
                  setDeleteTitle(`批量删除选中的 ${selectedIds.length} 个品类`);
                  setDeleteTargetIds(selectedIds);
                }}
              >
                批量删除{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
              </Button>
            )}
          </div>

          <div className="text-[13px] text-[#5F645D] tabular-nums">
            共 <strong className="text-[#171916]">{categories.length}</strong> 个分类 · 关联商品{' '}
            <strong className="text-[#171916]">{data?.totalProducts ?? 0}</strong> 件
          </div>
        </div>

        {/* Tree Table matching Screenshot 2 */}
        <div className="border border-[#E5E8E0] rounded-[14px] overflow-x-auto">
          <table className="w-full text-left border-collapse text-[14px]">
            <thead>
              <tr className="bg-[#F8F9F5] border-b border-[#E5E8E0] text-[#5F645D]">
                <th className="w-11 px-3 py-3 text-center border-r border-[#E5E8E0]">
                  <input
                    type="checkbox"
                    aria-label="全选品类"
                    checked={allSelected}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedIds(flatRows.map((r) => r.id));
                      else setSelectedIds([]);
                    }}
                    className="w-4 h-4 accent-[var(--qsl-brand-dark)] cursor-pointer"
                  />
                </th>
                <th className="w-16 px-3 py-3 text-center border-r border-[#E5E8E0] font-semibold">序号</th>
                <th className="w-56 px-3 py-3 text-center border-r border-[#E5E8E0] font-semibold">操作</th>
                <th className="w-32 px-3 py-3 text-center border-r border-[#E5E8E0] font-semibold">
                  <span className="inline-flex items-center justify-center gap-1">
                    <span>是否只读</span>
                    <HelpTooltip content="设为「只读」时该品类锁定防误改/误删；点击开关即可切换。" />
                  </span>
                </th>
                <th className="px-4 py-3 font-semibold">品类</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E8E0]">
              {flatRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-[#73796F]">
                    暂无商品分类，请点击上方「新增 1级品类」创建。
                  </td>
                </tr>
              ) : (
                flatRows.map((node, index) => {
                  const hasChildren = node.children.length > 0;
                  const isExpanded = expandedIds.has(node.id);
                  const checked = selectedIds.includes(node.id);

                  return (
                    <tr
                      key={node.id}
                      className={`transition-colors ${
                        checked
                          ? 'bg-[var(--qsl-accent-soft)]'
                          : 'bg-white hover:bg-[var(--qsl-accent-soft)]/50'
                      }`}
                    >
                      <td className="px-3 py-2.5 text-center border-r border-[#E5E8E0]">
                        <input
                          type="checkbox"
                          aria-label={`选择品类 ${node.name}`}
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedIds((p) => [...p, node.id]);
                            else setSelectedIds((p) => p.filter((x) => x !== node.id));
                          }}
                          className="w-4 h-4 accent-[var(--qsl-brand-dark)] cursor-pointer"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-center border-r border-[#E5E8E0] tabular-nums text-[#5F645D]">
                        {index + 1}
                      </td>
                      <td className="px-3 py-2.5 border-r border-[#E5E8E0]">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {canCreate && (
                            <button
                              type="button"
                              onClick={() => openCreateChild(node)}
                              className="h-7 px-2.5 rounded-md bg-[var(--qsl-accent)] text-[var(--qsl-accent-ink)] hover:bg-[var(--qsl-accent-hover)] border border-[var(--qsl-accent-border)] text-[12px] font-medium cursor-pointer transition-colors"
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
                              className="h-7 px-2.5 rounded-md bg-[var(--qsl-accent)] text-[var(--qsl-accent-ink)] hover:bg-[var(--qsl-accent-hover)] border border-[var(--qsl-accent-border)] text-[12px] font-medium cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              编辑
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
                              className="h-7 px-2.5 rounded-md bg-[#DC2626] text-white hover:bg-[#B91C1C] text-[12px] font-medium cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              删除
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center border-r border-[#E5E8E0]">
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
                      <td className="px-4 py-2.5">
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
      </div>

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
      <Modal
        open={Boolean(deleteTargetIds)}
        onClose={() => setDeleteTargetIds(null)}
        title={deleteTitle || '确认删除品类'}
        maxWidthClass="max-w-md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTargetIds(null)}>
              取消
            </Button>
            <Button
              variant="danger"
              loading={deleteMutation.isPending}
              onClick={() => deleteTargetIds && deleteMutation.mutate(deleteTargetIds)}
            >
              确认删除
            </Button>
          </>
        }
      >
        <p className="text-[14px] text-[#171916] leading-relaxed">
          确定删除所选品类吗？若品类下存在未迁移的商品或处于「只读」锁定状态，系统将拦截该删除操作。
        </p>
      </Modal>
    </div>
  );
};
