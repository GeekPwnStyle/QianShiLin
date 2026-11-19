import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  Copy,
  Download,
  Edit3,
  FileSpreadsheet,
  FileText,
  Filter,
  MinusSquare,
  Plus,
  PlusSquare,
  RotateCcw,
  Search,
  Settings2,
  SlidersHorizontal,
  Trash2,
  Upload,
} from 'lucide-react';
import { useAuth } from '@/src/modules/auth/application/AuthContext';
import { useNavigation } from '@/src/modules/navigation/application/NavigationContext';
import { MENU_BY_ID } from '@/src/modules/navigation/domain/menuRegistry';
import {
  productsApi,
  type ProductCategoryRecord,
  type ProductRecord,
} from '@/src/modules/basic/products/infrastructure/productsApi';
import { ProductFormModal } from '@/src/modules/basic/products/ui/ProductFormModal';
import { getTagBadgeClass } from '@/src/modules/basic/products/ui/ProductTagsPage';
import { downloadCsv } from '@/src/shared/lib/exportCsv';
import { formatCurrency, formatDate } from '@/src/shared/lib/format';
import { Button } from '@/src/shared/ui/Button';
import { HelpTooltip } from '@/src/shared/ui/HelpTooltip';
import { Modal } from '@/src/shared/ui/Modal';
import { OperationStatus } from '@/src/shared/ui/OperationStatus';
import { PaginationBar } from '@/src/shared/ui/PaginationBar';
import { Select } from '@/src/shared/ui/Select';
import { EmptyState, ErrorState, LoadingSkeleton } from '@/src/shared/ui/StateViews';
import { StatusLabel } from '@/src/shared/ui/StatusLabel';

interface CategoryTreeNode extends ProductCategoryRecord {
  children: CategoryTreeNode[];
}

interface ColumnDef {
  key: string;
  label: string;
  defaultVisible: boolean;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
}

interface ImportRowPreview {
  rowNumber: number;
  skuCode: string;
  brandName: string;
  categoryName: string;
  name: string;
  model: string;
  colorOrDiopter: string;
  retailPrice: string;
  salesDiscount: string;
  valid: boolean;
  errors: string[];
}

export const ProductListPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { navigateToNode } = useNavigation();
  const { session, currentRole, debugMode, hasPermission } = useAuth();

  const canCreate = hasPermission('basic.product.create');
  const canUpdate = hasPermission('basic.product.update');
  const canDelete = hasPermission('basic.product.delete');
  const canImport = hasPermission('basic.product.import');
  const canExport =
    hasPermission('basic.product.export') && Boolean(currentRole?.sensitiveFields.batchExport);
  const canSeeCost =
    hasPermission('basic.product.cost.read') && Boolean(currentRole?.sensitiveFields.viewCostPrice);
  const canSeeWholesale = Boolean(currentRole?.sensitiveFields.viewWholesalePrice);

  // Category sidebar state
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categorySearchInput, setCategorySearchInput] = useState('');
  const [categoryKeyword, setCategoryKeyword] = useState('');
  const [expandedCatIds, setExpandedCatIds] = useState<Set<string>>(new Set());

  // Product list filters
  const [keywordInput, setKeywordInput] = useState('');
  const [brandFilter, setBrandFilter] = useState('all');
  const [enabledFilter, setEnabledFilter] = useState<'all' | 'true' | 'false'>('all');
  const [customLensFilter, setCustomLensFilter] = useState<'all' | 'true' | 'false'>('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const [applied, setApplied] = useState({
    keyword: '',
    brand: 'all',
    enabled: 'all' as 'all' | 'true' | 'false',
    isCustomLens: 'all' as 'all' | 'true' | 'false',
    tag: 'all',
  });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [statusMsg, setStatusMsg] = useState<{ text: string; role: 'status' | 'alert' } | null>(null);

  // Dropdown popovers
  const [maintMenuOpen, setMaintMenuOpen] = useState(false);
  const [importMenuOpen, setImportMenuOpen] = useState(false);
  const [colPickerOpen, setColPickerOpen] = useState(false);
  const maintMenuRef = useRef<HTMLDivElement>(null);
  const importMenuRef = useRef<HTMLDivElement>(null);
  const colPickerRef = useRef<HTMLDivElement>(null);

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingProduct, setEditingProduct] = useState<ProductRecord | null>(null);
  const [copyFromProduct, setCopyFromProduct] = useState<ProductRecord | null>(null);

  const [deleteTargetIds, setDeleteTargetIds] = useState<string[] | null>(null);
  const [deleteTargetLabel, setDeleteTargetLabel] = useState('');

  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchEnabled, setBatchEnabled] = useState<'keep' | 'true' | 'false'>('keep');
  const [batchDiscount, setBatchDiscount] = useState('');
  const [batchStockLocation, setBatchStockLocation] = useState('');
  const [batchPinOnSale, setBatchPinOnSale] = useState<'keep' | 'true' | 'false'>('keep');

  // Import wizard
  const [importOpen, setImportOpen] = useState(false);
  const [importTab, setImportTab] = useState<'excel_v2' | 'lens_catalog' | 'trade_sync'>('excel_v2');
  const [importPreviews, setImportPreviews] = useState<ImportRowPreview[] | null>(null);
  const [importResultMsg, setImportResultMsg] = useState('');

  // Queries
  const { data: meta, refetch: refetchMeta } = useQuery({
    queryKey: ['products-meta', debugMode],
    queryFn: () => productsApi.getMeta(debugMode),
  });

  const { data: catResp } = useQuery({
    queryKey: ['product-categories', debugMode],
    queryFn: () => productsApi.listCategories(debugMode),
  });

  const { data: prodResp, isLoading, isError, refetch } = useQuery({
    queryKey: [
      'products',
      selectedCategory,
      applied,
      page,
      pageSize,
      sortBy,
      sortOrder,
      debugMode,
      session.currentStoreId,
    ],
    queryFn: () =>
      productsApi.listProducts(
        {
          page,
          pageSize,
          keyword: applied.keyword,
          categoryId: selectedCategory,
          brand: applied.brand,
          enabled: applied.enabled,
          isCustomLens: applied.isCustomLens,
          tag: applied.tag,
          sortBy,
          sortOrder,
        },
        debugMode
      ),
  });

  const allCategories = catResp?.items ?? [];
  const totalProductsAll = catResp?.totalProducts ?? 0;

  // Build hierarchical category tree for left sidebar
  const categoryTree = useMemo(() => {
    const kw = categoryKeyword.trim().toLowerCase();
    const nodeMap = new Map<string, CategoryTreeNode>();
    for (const c of allCategories) {
      nodeMap.set(c.id, { ...c, children: [] });
    }
    const roots: CategoryTreeNode[] = [];
    for (const c of allCategories) {
      const node = nodeMap.get(c.id)!;
      if (c.parentId && nodeMap.has(c.parentId)) {
        nodeMap.get(c.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }
    const sortNodes = (nodes: CategoryTreeNode[]) => {
      nodes.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'zh-CN'));
      for (const n of nodes) sortNodes(n.children);
    };
    sortNodes(roots);

    if (!kw) return roots;
    const filterTree = (nodes: CategoryTreeNode[]): CategoryTreeNode[] => {
      const res: CategoryTreeNode[] = [];
      for (const n of nodes) {
        const filteredChildren = filterTree(n.children);
        if (n.name.toLowerCase().includes(kw) || filteredChildren.length > 0) {
          res.push({ ...n, children: filteredChildren });
        }
      }
      return res;
    };
    return filterTree(roots);
  }, [allCategories, categoryKeyword]);

  // Expand top categories that have keyword matches
  useEffect(() => {
    if (!categoryKeyword.trim()) return;
    setExpandedCatIds(new Set(allCategories.map((c) => c.id)));
  }, [categoryKeyword, allCategories]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (maintMenuRef.current && !maintMenuRef.current.contains(target)) setMaintMenuOpen(false);
      if (importMenuRef.current && !importMenuRef.current.contains(target)) setImportMenuOpen(false);
      if (colPickerRef.current && !colPickerRef.current.contains(target)) setColPickerOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  // Table columns matching Screenshot 1
  const columnDefs = useMemo<ColumnDef[]>(
    () => [
      { key: 'name', label: '商品名称', defaultVisible: true, sortable: true },
      { key: 'brandName', label: '品牌', defaultVisible: true, sortable: true },
      { key: 'categoryName', label: '品类', defaultVisible: true, sortable: true },
      { key: 'model', label: '型号', defaultVisible: true, sortable: true },
      { key: 'colorOrDiopter', label: '色号/度数', defaultVisible: true },
      { key: 'series', label: '系列', defaultVisible: true },
      { key: 'refractiveIndex', label: '折射率', defaultVisible: true },
      { key: 'isCustomLens', label: '是否定制镜片', defaultVisible: true, align: 'center' },
      { key: 'axis', label: '轴位', defaultVisible: true },
      { key: 'coatingType', label: '加膜类型', defaultVisible: true },
      { key: 'year', label: '年份', defaultVisible: true, align: 'center' },
      { key: 'contactLensType', label: '隐形眼镜类型', defaultVisible: true },
      { key: 'retailPrice', label: '零售价', defaultVisible: true, sortable: true, align: 'right' },
      { key: 'salesDiscount', label: '销售折扣(%)', defaultVisible: true, align: 'right' },
      { key: 'discountedPrice', label: '零售价折后', defaultVisible: true, sortable: true, align: 'right' },
      ...(canSeeWholesale
        ? [{ key: 'wholesalePrice', label: '通用批发价', defaultVisible: false, align: 'right' as const }]
        : []),
      ...(canSeeCost
        ? [{ key: 'costPrice', label: '进货价', defaultVisible: false, align: 'right' as const }]
        : []),
      { key: 'skuCode', label: '商品编码', defaultVisible: false },
      { key: 'barcode', label: '商品条码', defaultVisible: false },
      { key: 'stockLocation', label: '库存摆放位置', defaultVisible: false },
      { key: 'unit', label: '单位', defaultVisible: false, align: 'center' },
      { key: 'supplierName', label: '供应商', defaultVisible: false },
      { key: 'tags', label: '标签', defaultVisible: false },
      { key: 'storeName', label: '归属门店', defaultVisible: false },
      { key: 'enabled', label: '启用状态', defaultVisible: false, align: 'center' },
      { key: 'createdAt', label: '创建时间', defaultVisible: false, sortable: true },
    ],
    [canSeeCost, canSeeWholesale]
  );

  const [visibleColKeys, setVisibleColKeys] = useState<string[]>(() =>
    columnDefs.filter((c) => c.defaultVisible).map((c) => c.key)
  );

  const activeColumns = useMemo(
    () => columnDefs.filter((c) => visibleColKeys.includes(c.key)),
    [columnDefs, visibleColKeys]
  );

  const rows = prodResp?.items ?? [];
  const total = prodResp?.total ?? 0;

  const invalidateProducts = async () => {
    await queryClient.invalidateQueries({ queryKey: ['products'] });
    await queryClient.invalidateQueries({ queryKey: ['product-categories'] });
  };

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 1) {
        await productsApi.deleteProduct(ids[0], debugMode);
        return { deletedCount: 1 };
      }
      return productsApi.batchDeleteProducts(ids, debugMode);
    },
    onSuccess: (res) => {
      setSelectedIds([]);
      setDeleteTargetIds(null);
      setStatusMsg({ text: `已删除 ${res.deletedCount} 个商品档案`, role: 'status' });
      void invalidateProducts();
    },
    onError: (err) => {
      setDeleteTargetIds(null);
      setStatusMsg({ text: err instanceof Error ? err.message : '删除失败', role: 'alert' });
    },
  });

  const batchMutation = useMutation({
    mutationFn: () => {
      const patch: {
        enabled?: boolean;
        salesDiscount?: string;
        stockLocation?: string;
        pinOnSale?: boolean;
      } = {};
      if (batchEnabled !== 'keep') patch.enabled = batchEnabled === 'true';
      if (batchDiscount.trim()) patch.salesDiscount = batchDiscount.trim();
      if (batchStockLocation.trim()) patch.stockLocation = batchStockLocation.trim();
      if (batchPinOnSale !== 'keep') patch.pinOnSale = batchPinOnSale === 'true';
      return productsApi.batchUpdateProducts(selectedIds, patch, debugMode);
    },
    onSuccess: (res) => {
      setBatchModalOpen(false);
      setSelectedIds([]);
      setBatchEnabled('keep');
      setBatchDiscount('');
      setBatchStockLocation('');
      setBatchPinOnSale('keep');
      setStatusMsg({ text: `已批量更新 ${res.updatedCount} 个商品属性`, role: 'status' });
      void invalidateProducts();
    },
    onError: (err) => {
      setStatusMsg({ text: err instanceof Error ? err.message : '批量更新失败', role: 'alert' });
    },
  });

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder((p) => (p === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const handleApplySearch = () => {
    setPage(1);
    setApplied({
      keyword: keywordInput,
      brand: brandFilter,
      enabled: enabledFilter,
      isCustomLens: customLensFilter,
      tag: tagFilter,
    });
  };

  const handleResetFilters = () => {
    setKeywordInput('');
    setBrandFilter('all');
    setEnabledFilter('all');
    setCustomLensFilter('all');
    setTagFilter('all');
    setSelectedCategory('all');
    setPage(1);
    setApplied({
      keyword: '',
      brand: 'all',
      enabled: 'all',
      isCustomLens: 'all',
      tag: 'all',
    });
  };

  const handleExportProducts = () => {
    if (!canExport || rows.length === 0) return;
    const targets = selectedIds.length > 0 ? rows.filter((r) => selectedIds.includes(r.id)) : rows;
    downloadCsv('千视林商品档案导出', targets, [
      { key: 'skuCode', header: '商品编码', accessor: (r) => r.skuCode },
      { key: 'name', header: '商品名称', accessor: (r) => r.name },
      { key: 'brandName', header: '品牌', accessor: (r) => r.brandName },
      { key: 'categoryName', header: '品类', accessor: (r) => r.categoryName },
      { key: 'model', header: '型号', accessor: (r) => r.model },
      { key: 'colorOrDiopter', header: '色号/度数', accessor: (r) => r.colorOrDiopter },
      { key: 'series', header: '系列', accessor: (r) => r.series },
      { key: 'refractiveIndex', header: '折射率', accessor: (r) => r.refractiveIndex },
      { key: 'isCustomLens', header: '是否定制镜片', accessor: (r) => (r.isCustomLens ? '是' : '否') },
      { key: 'retailPrice', header: '零售价', accessor: (r) => r.retailPrice },
      { key: 'salesDiscount', header: '销售折扣(%)', accessor: (r) => r.salesDiscount },
      { key: 'discountedPrice', header: '零售价折后', accessor: (r) => r.discountedPrice },
      ...(canSeeCost ? [{ key: 'costPrice', header: '进货价', accessor: (r: ProductRecord) => r.costPrice ?? '' }] : []),
    ]);
  };

  const handleDownloadImportTemplate = () => {
    downloadCsv(
      '千视林商品档案导入模板',
      [
        {
          brandName: '卡尔蔡司',
          categoryName: '单光/防蓝光片',
          name: '蔡司泽锐钻立方防蓝光 1.60',
          model: 'ZEISS-CLEARVIEW-160',
          colorOrDiopter: '0.00 ~ -8.00',
          retailPrice: '1980.00',
          salesDiscount: '100.00',
        },
      ],
      [
        { key: 'brandName', header: '品牌(必填)', accessor: (r) => r.brandName },
        { key: 'categoryName', header: '品类(必填)', accessor: (r) => r.categoryName },
        { key: 'name', header: '商品名称(必填)', accessor: (r) => r.name },
        { key: 'model', header: '型号(必填)', accessor: (r) => r.model },
        { key: 'colorOrDiopter', header: '色号或度数', accessor: (r) => r.colorOrDiopter },
        { key: 'retailPrice', header: '零售价', accessor: (r) => r.retailPrice },
        { key: 'salesDiscount', header: '销售折扣(%)', accessor: (r) => r.salesDiscount },
      ]
    );
  };

  const validateImportCsv = (
    rawRows: Array<{
      brandName: string;
      categoryName: string;
      name: string;
      model: string;
      colorOrDiopter: string;
      retailPrice: string;
      salesDiscount: string;
    }>
  ) => {
    const previews: ImportRowPreview[] = rawRows.map((r, i) => {
      const errors: string[] = [];
      if (!r.brandName.trim()) errors.push('品牌为空');
      if (!r.categoryName.trim()) errors.push('品类为空');
      if (!r.name.trim()) errors.push('商品名称为空');
      if (!r.model.trim()) errors.push('型号为空');
      const priceNum = Number.parseFloat(r.retailPrice || '0');
      if (!Number.isFinite(priceNum) || priceNum < 0) errors.push('零售价格式无效');
      return {
        rowNumber: i + 1,
        skuCode: '',
        brandName: r.brandName.trim(),
        categoryName: r.categoryName.trim(),
        name: r.name.trim(),
        model: r.model.trim(),
        colorOrDiopter: r.colorOrDiopter.trim(),
        retailPrice: Number.isFinite(priceNum) ? priceNum.toFixed(2) : r.retailPrice,
        salesDiscount: r.salesDiscount.trim() || '100.00',
        valid: errors.length === 0,
        errors,
      };
    });
    setImportPreviews(previews);
    setImportResultMsg('');
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const text = await file.text();
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const dataRows = lines.slice(1).map((line) => {
      const cols = line.split(',').map((c) => c.replace(/^"|"$/g, '').trim());
      return {
        brandName: cols[0] ?? '',
        categoryName: cols[1] ?? '',
        name: cols[2] ?? '',
        model: cols[3] ?? '',
        colorOrDiopter: cols[4] ?? '',
        retailPrice: cols[5] ?? '0',
        salesDiscount: cols[6] ?? '100',
      };
    });
    validateImportCsv(dataRows);
  };

  const handleLoadSampleImport = () => {
    validateImportCsv([
      {
        brandName: '依视路',
        categoryName: '单光/防蓝光片',
        name: '依视路钻晶膜岩防蓝光镜片 1.60',
        model: 'ESS-ROCK-160',
        colorOrDiopter: '0.00 ~ -8.00',
        retailPrice: '1680.00',
        salesDiscount: '100.00',
      },
      {
        brandName: 'GOOD4',
        categoryName: '镜架',
        name: 'GOOD4 纯钛商务镜架 1099',
        model: '1099',
        colorOrDiopter: 'BK',
        retailPrice: '4280.00',
        salesDiscount: '100.00',
      },
      {
        brandName: '暴龙',
        categoryName: '太阳镜',
        name: '暴龙偏光太阳镜',
        model: '',
        colorOrDiopter: 'C01',
        retailPrice: 'abc',
        salesDiscount: '100.00',
      },
    ]);
  };

  const handleCommitImport = async () => {
    if (!importPreviews) return;
    const validRows = importPreviews.filter((r) => r.valid);
    if (!validRows.length) return;
    try {
      const res = await productsApi.importProducts(
        validRows.map((r) => ({
          brandName: r.brandName,
          categoryName: r.categoryName,
          name: r.name,
          model: r.model,
          colorOrDiopter: r.colorOrDiopter,
          retailPrice: r.retailPrice,
          salesDiscount: r.salesDiscount,
        })),
        debugMode
      );
      setImportResultMsg(`成功导入 ${res.importedCount} 条商品资料`);
      setImportPreviews(null);
      void invalidateProducts();
    } catch (err) {
      setStatusMsg({ text: err instanceof Error ? err.message : '导入失败', role: 'alert' });
    }
  };

  const openCreateModal = (copyFrom?: ProductRecord) => {
    setFormMode('create');
    setEditingProduct(null);
    setCopyFromProduct(copyFrom ?? null);
    setFormOpen(true);
  };

  const openEditModal = (product: ProductRecord) => {
    setFormMode('edit');
    setEditingProduct(product);
    setCopyFromProduct(null);
    setFormOpen(true);
  };

  const navigateToSubPage = (nodeId: string) => {
    const node = MENU_BY_ID[nodeId];
    if (node) navigateToNode(node);
  };

  const renderCategoryTree = (nodes: CategoryTreeNode[], depth = 0) =>
    nodes.map((node) => {
      const hasChildren = node.children.length > 0;
      const expanded = expandedCatIds.has(node.id);
      const active = selectedCategory === node.id;

      return (
        <div key={node.id}>
          <div
            style={{ paddingLeft: `${8 + depth * 16}px` }}
            className={`group flex items-center justify-between gap-2 pr-2 py-1.5 rounded-lg text-[13px] transition-colors ${
              active
                ? 'bg-[var(--qsl-accent-soft)] text-[#171916] font-semibold'
                : 'text-[#5F645D] hover:bg-[#F8F9F5] hover:text-[#171916]'
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() =>
                    setExpandedCatIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(node.id)) next.delete(node.id);
                      else next.add(node.id);
                      return next;
                    })
                  }
                  aria-label={expanded ? `收起 ${node.name}` : `展开 ${node.name}`}
                  className="text-[#73796F] hover:text-[#171916] cursor-pointer shrink-0"
                >
                  {expanded ? (
                    <MinusSquare className="w-3.5 h-3.5" />
                  ) : (
                    <PlusSquare className="w-3.5 h-3.5" />
                  )}
                </button>
              ) : (
                <FileText className="w-3.5 h-3.5 text-[#9CA198] shrink-0" />
              )}
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory(node.id);
                  setPage(1);
                }}
                className="truncate text-left flex-1 cursor-pointer"
              >
                {node.name}
              </button>
            </div>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[11px] tabular-nums shrink-0 border ${
                active
                  ? 'bg-white border-[var(--qsl-accent-border)] text-[#171916]'
                  : 'bg-[#FFF7ED] border-[#FED7AA] text-[#C2410C]'
              }`}
            >
              {node.productCount}
            </span>
          </div>
          {hasChildren && expanded && renderCategoryTree(node.children, depth + 1)}
        </div>
      );
    });

  const renderCell = (colKey: string, r: ProductRecord) => {
    switch (colKey) {
      case 'name':
        return (
          <div className="flex items-center gap-2 max-w-[230px]">
            {r.imageUrl && (
              <img
                src={r.imageUrl}
                alt={r.name}
                className="w-8 h-8 rounded-md object-cover border border-[#E5E8E0] shrink-0"
              />
            )}
            <div className="min-w-0">
              <div className="font-medium text-[#171916] truncate" title={r.name}>
                {r.name}
              </div>
              <div className="text-[11px] font-mono text-[#73796F] truncate">{r.skuCode}</div>
            </div>
          </div>
        );
      case 'brandName':
        return r.brandName || '-';
      case 'categoryName':
        return r.categoryName || '-';
      case 'model':
        return <span className="font-mono text-[13px]">{r.model || '-'}</span>;
      case 'colorOrDiopter':
        return r.colorOrDiopter || '-';
      case 'series':
        return r.series || '';
      case 'refractiveIndex':
        return r.refractiveIndex || '';
      case 'isCustomLens':
        return r.isCustomLens ? '是' : '';
      case 'axis':
        return r.axis || '';
      case 'coatingType':
        return r.coatingType || '';
      case 'year':
        return r.year ?? '';
      case 'contactLensType':
        return r.contactLensType || '';
      case 'retailPrice':
        return <span className="tabular-nums">{Number(r.retailPrice || 0).toFixed(2)}</span>;
      case 'salesDiscount':
        return <span className="tabular-nums">{Number(r.salesDiscount || 100).toFixed(2)}</span>;
      case 'discountedPrice':
        return (
          <span className="tabular-nums font-semibold text-[#171916]">
            {Number(r.discountedPrice || 0).toFixed(2)}
          </span>
        );
      case 'wholesalePrice':
        return formatCurrency(r.wholesalePrice ?? '0');
      case 'costPrice':
        return formatCurrency(r.costPrice ?? '0');
      case 'skuCode':
        return <span className="font-mono text-[12px]">{r.skuCode}</span>;
      case 'barcode':
        return <span className="font-mono text-[12px]">{r.barcode || '-'}</span>;
      case 'stockLocation':
        return r.stockLocation || '-';
      case 'unit':
        return r.unit || '-';
      case 'supplierName':
        return r.supplierName || '-';
      case 'tags':
        return r.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {r.tags.map((t) => {
              const tagColor = meta?.tags.find((mt) => mt.name === t)?.color ?? 'default';
              return (
                <span
                  key={t}
                  className={`px-1.5 py-0.5 rounded border text-[11px] font-medium ${getTagBadgeClass(tagColor)}`}
                >
                  {t}
                </span>
              );
            })}
          </div>
        ) : (
          '-'
        );
      case 'storeName':
        return r.storeName;
      case 'enabled':
        return <StatusLabel tone={r.enabled ? 'success' : 'neutral'} label={r.enabled ? '启用' : '停用'} />;
      case 'createdAt':
        return <span className="tabular-nums text-[12px] text-[#5F645D]">{formatDate(r.createdAt)}</span>;
      default:
        return '-';
    }
  };

  const allSelectedOnPage = rows.length > 0 && rows.every((r) => selectedIds.includes(r.id));

  return (
    <div className="space-y-4">
      {statusMsg && <OperationStatus role={statusMsg.role}>{statusMsg.text}</OperationStatus>}

      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* Left Category Tree Sidebar matching Screenshot 1 */}
        <aside className="w-full lg:w-[252px] shrink-0 bg-white border border-[#D9DDD4] rounded-[18px] p-3.5 space-y-3">
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#E5E8E0]">
            <span className="text-[15px] font-semibold text-[#171916]">品类</span>
            <Button
              variant="accent"
              size="sm"
              className="!h-7 !px-2.5 !text-[12px]"
              onClick={() => navigateToSubPage('basic.product.categories')}
            >
              操作品类
            </Button>
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={categorySearchInput}
              onChange={(e) => setCategorySearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setCategoryKeyword(categorySearchInput);
              }}
              placeholder="搜索 品类"
              className="flex-1 min-w-0 h-8 px-2.5 rounded-[8px] bg-[#F8F9F5] border border-[#D9DDD4] text-[13px] outline-none focus:border-[#171916]"
            />
            <Button
              variant="accent"
              size="sm"
              className="!h-8 !px-2.5 !text-[12px]"
              onClick={() => setCategoryKeyword(categorySearchInput)}
            >
              搜索
            </Button>
          </div>

          <div className="space-y-0.5 max-h-[600px] overflow-y-auto qsl-scroll pr-0.5">
            <div
              className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg text-[13px] transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-[var(--qsl-accent-soft)] text-[#171916] font-semibold'
                  : 'text-[#5F645D] hover:bg-[#F8F9F5] hover:text-[#171916]'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('all');
                  setPage(1);
                }}
                className="flex items-center gap-1.5 flex-1 text-left cursor-pointer"
              >
                <MinusSquare className="w-3.5 h-3.5 text-[#73796F] shrink-0" />
                <span>全部品类</span>
              </button>
              <span className="px-1.5 py-0.5 rounded-full text-[11px] tabular-nums bg-[#FFF7ED] border border-[#FED7AA] text-[#C2410C]">
                {totalProductsAll}
              </span>
            </div>

            {renderCategoryTree(categoryTree)}
          </div>
        </aside>

        {/* Right Product Workspace matching Screenshot 1 */}
        <div className="flex-1 min-w-0 w-full space-y-3">
          {/* Top Action Toolbar */}
          <div className="bg-white border border-[#D9DDD4] rounded-[18px] p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              {/* Left Action Cluster */}
              <div className="flex flex-wrap items-center gap-2">
                {canCreate && (
                  <Button
                    variant="accent"
                    size="sm"
                    icon={<Plus className="w-3.5 h-3.5" />}
                    onClick={() => openCreateModal()}
                  >
                    新 增
                  </Button>
                )}

                {canImport && (
                  <div ref={importMenuRef} className="relative">
                    <Button
                      variant="accent"
                      size="sm"
                      icon={<Upload className="w-3.5 h-3.5" />}
                      onClick={() => setImportMenuOpen((p) => !p)}
                    >
                      <span>导 入</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </Button>
                    {importMenuOpen && (
                      <div className="absolute left-0 top-full mt-1.5 z-40 w-48 rounded-xl bg-white border border-[#D9DDD4] shadow-lg p-1.5 text-[13px]">
                        <button
                          type="button"
                          onClick={() => {
                            setImportMenuOpen(false);
                            setImportTab('excel_v2');
                            setImportOpen(true);
                          }}
                          className="w-full px-3 py-2 rounded-lg text-left hover:bg-[#F8F9F5] cursor-pointer"
                        >
                          导入新版（Excel / CSV）
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setImportMenuOpen(false);
                            setImportTab('lens_catalog');
                            setImportOpen(true);
                          }}
                          className="w-full px-3 py-2 rounded-lg text-left text-[#5F645D] hover:bg-[#F8F9F5] cursor-pointer"
                        >
                          从镜片画册导入
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setImportMenuOpen(false);
                            setImportTab('trade_sync');
                            setImportOpen(true);
                          }}
                          className="w-full px-3 py-2 rounded-lg text-left text-[#5F645D] hover:bg-[#F8F9F5] cursor-pointer"
                        >
                          从商贸导入
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {canDelete && (
                  <Button
                    variant="danger"
                    size="sm"
                    icon={<Trash2 className="w-3.5 h-3.5" />}
                    disabled={selectedIds.length === 0}
                    onClick={() => {
                      setDeleteTargetLabel(`批量删除选中的 ${selectedIds.length} 个商品`);
                      setDeleteTargetIds(selectedIds);
                    }}
                  >
                    删 除{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
                  </Button>
                )}

                {canUpdate && (
                  <Button
                    variant="accent"
                    size="sm"
                    disabled={selectedIds.length === 0}
                    onClick={() => setBatchModalOpen(true)}
                  >
                    批量设置{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
                  </Button>
                )}

                <div ref={maintMenuRef} className="relative">
                  <Button
                    variant="accent"
                    size="sm"
                    onClick={() => setMaintMenuOpen((p) => !p)}
                  >
                    <span>商品维护管理</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </Button>
                  {maintMenuOpen && (
                    <div className="absolute left-0 top-full mt-1.5 z-40 w-44 rounded-xl bg-white border border-[#D9DDD4] shadow-lg p-1.5 text-[13px]">
                      <button
                        type="button"
                        onClick={() => {
                          setMaintMenuOpen(false);
                          navigateToSubPage('basic.product.categories');
                        }}
                        className="w-full px-3 py-2 rounded-lg text-left hover:bg-[#F8F9F5] cursor-pointer"
                      >
                        商品分类体系
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMaintMenuOpen(false);
                          navigateToSubPage('basic.product.tags');
                        }}
                        className="w-full px-3 py-2 rounded-lg text-left hover:bg-[#F8F9F5] cursor-pointer"
                      >
                        选品标签维护
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMaintMenuOpen(false);
                          navigateToSubPage('basic.product.lens_surcharge');
                        }}
                        className="w-full px-3 py-2 rounded-lg text-left hover:bg-[#F8F9F5] cursor-pointer"
                      >
                        镜片工艺加价
                      </button>
                    </div>
                  )}
                </div>

                <div className="inline-flex items-center gap-1 text-[13px] text-[var(--qsl-brand-dark)] font-medium">
                  <span>说明</span>
                  <HelpTooltip
                    title="商品总览操作说明"
                    content={
                      '1. 左侧品类树支持按分类及子分类实时过滤商品。\n2. 镜片/定制镜片行操作列提供快捷按钮，可直达「镜片工艺加价」配置散光附加费矩阵。\n3. 点击“设置表头”可自定义显示或隐藏价格、条码、供应商等字段。'
                    }
                  />
                </div>
              </div>

              {/* Right Search & Column Cluster */}
              <div className="flex flex-wrap items-center gap-2">
                {canExport && (
                  <Button
                    variant="accent"
                    size="sm"
                    icon={<Download className="w-3.5 h-3.5" />}
                    onClick={handleExportProducts}
                  >
                    导 出
                  </Button>
                )}

                <div className="flex items-center">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#73796F] absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleApplySearch();
                      }}
                      placeholder="模糊搜索"
                      className="w-40 sm:w-48 h-9 pl-8 pr-2.5 rounded-l-[8px] bg-[#F8F9F5] border border-r-0 border-[#D9DDD4] text-[13px] outline-none focus:border-[#171916]"
                    />
                  </div>
                  <Button
                    variant="accent"
                    size="sm"
                    className="!rounded-l-none"
                    onClick={handleApplySearch}
                  >
                    搜 索
                  </Button>
                </div>

                <Button
                  variant={showFilters ? 'primary' : 'accent'}
                  size="sm"
                  icon={<Filter className="w-3.5 h-3.5" />}
                  onClick={() => setShowFilters((p) => !p)}
                >
                  筛选搜索
                </Button>

                <div ref={colPickerRef} className="relative">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Settings2 className="w-3.5 h-3.5" />}
                    onClick={() => setColPickerOpen((p) => !p)}
                  >
                    设置表头
                  </Button>
                  {colPickerOpen && (
                    <div className="absolute right-0 top-full mt-1.5 z-40 w-60 rounded-xl bg-white border border-[#D9DDD4] shadow-xl p-3 space-y-2">
                      <div className="flex items-center justify-between pb-1.5 border-b border-[#E5E8E0] text-[13px] font-semibold">
                        <span>自定义显示列</span>
                        <button
                          type="button"
                          onClick={() =>
                            setVisibleColKeys(columnDefs.filter((c) => c.defaultVisible).map((c) => c.key))
                          }
                          className="text-[12px] text-[var(--qsl-brand-dark)] hover:underline cursor-pointer"
                        >
                          恢复默认
                        </button>
                      </div>
                      <div className="max-h-64 overflow-y-auto space-y-1 qsl-scroll">
                        {columnDefs.map((col) => {
                          const checked = visibleColKeys.includes(col.key);
                          return (
                            <label
                              key={col.key}
                              className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-[#F8F9F5] text-[13px] cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setVisibleColKeys((prev) => [...prev, col.key]);
                                  } else if (visibleColKeys.length > 2) {
                                    setVisibleColKeys((prev) => prev.filter((k) => k !== col.key));
                                  }
                                }}
                                className="accent-[var(--qsl-brand-dark)] cursor-pointer"
                              />
                              <span>{col.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Expandable Filter Search Drawer */}
            {showFilters && (
              <div className="pt-3 border-t border-[#E5E8E0] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div>
                  <label className="block text-[12px] text-[#5F645D] mb-1">品牌</label>
                  <Select
                    ariaLabel="筛选品牌"
                    value={brandFilter}
                    onChange={setBrandFilter}
                    options={[
                      { value: 'all', label: '全部品牌' },
                      ...(meta?.brands ?? []).map((b) => ({ value: b.name, label: b.name })),
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-[12px] text-[#5F645D] mb-1">启用状态</label>
                  <Select
                    ariaLabel="筛选启用状态"
                    value={enabledFilter}
                    onChange={(v) => setEnabledFilter(v as 'all' | 'true' | 'false')}
                    options={[
                      { value: 'all', label: '全部状态' },
                      { value: 'true', label: '启用' },
                      { value: 'false', label: '停用' },
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-[12px] text-[#5F645D] mb-1">是否定制镜片</label>
                  <Select
                    ariaLabel="筛选定制镜片"
                    value={customLensFilter}
                    onChange={(v) => setCustomLensFilter(v as 'all' | 'true' | 'false')}
                    options={[
                      { value: 'all', label: '全部' },
                      { value: 'true', label: '仅定制镜片' },
                      { value: 'false', label: '非定制现片/标品' },
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-[12px] text-[#5F645D] mb-1">选品标签</label>
                  <Select
                    ariaLabel="筛选选品标签"
                    value={tagFilter}
                    onChange={setTagFilter}
                    options={[
                      { value: 'all', label: '全部标签' },
                      ...(meta?.tags ?? []).map((t) => ({ value: t.name, label: t.name })),
                    ]}
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Button variant="primary" size="sm" onClick={handleApplySearch}>
                    应用筛选
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<RotateCcw className="w-3.5 h-3.5" />}
                    onClick={handleResetFilters}
                  >
                    重置
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Product Data Table + PaginationBar */}
          <div className="bg-white border border-[#D9DDD4] rounded-[18px] overflow-hidden">
            {isLoading ? (
              <div className="p-5">
                <LoadingSkeleton rows={6} />
              </div>
            ) : isError ? (
              <div className="p-5">
                <ErrorState onRetry={() => void refetch()} />
              </div>
            ) : rows.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  mode="filtered"
                  actionLabel="清除筛选"
                  onAction={handleResetFilters}
                />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[13px]">
                    <thead>
                      <tr className="bg-[#F8F9F5] border-b border-[#E5E8E0] text-[#5F645D]">
                        <th className="w-10 px-3 py-2.5 text-center border-r border-[#E5E8E0]">
                          <input
                            type="checkbox"
                            aria-label="全选当前页商品"
                            checked={allSelectedOnPage}
                            onChange={(e) => {
                              const pageIds = rows.map((r) => r.id);
                              if (e.target.checked) {
                                setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
                              } else {
                                setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
                              }
                            }}
                            className="w-4 h-4 accent-[var(--qsl-brand-dark)] cursor-pointer"
                          />
                        </th>
                        <th className="w-36 px-3 py-2.5 text-center border-r border-[#E5E8E0] font-semibold whitespace-nowrap">
                          操作
                        </th>
                        {activeColumns.map((col, idx) => {
                          const isStickyName = col.key === 'name' && idx === 0;
                          const isActiveSort = sortBy === col.key;
                          return (
                            <th
                              key={col.key}
                              className={`px-3 py-2.5 border-r last:border-r-0 border-[#E5E8E0] font-semibold whitespace-nowrap ${
                                col.align === 'right'
                                  ? 'text-right'
                                  : col.align === 'center'
                                    ? 'text-center'
                                    : 'text-left'
                              } ${isStickyName ? 'sticky left-0 z-10 bg-[#F8F9F5]' : ''}`}
                            >
                              {col.sortable ? (
                                <button
                                  type="button"
                                  onClick={() => handleSort(col.key)}
                                  className="inline-flex items-center gap-1 hover:text-[#171916] cursor-pointer"
                                >
                                  <span>{col.label}</span>
                                  {isActiveSort ? (
                                    sortOrder === 'asc' ? (
                                      <ArrowUp className="w-3 h-3" />
                                    ) : (
                                      <ArrowDown className="w-3 h-3" />
                                    )
                                  ) : (
                                    <ArrowUpDown className="w-3 h-3 opacity-45" />
                                  )}
                                </button>
                              ) : (
                                col.label
                              )}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-[#E5E8E0]">
                      {rows.map((row) => {
                        const checked = selectedIds.includes(row.id);
                        const isLensRow =
                          row.isCustomLens ||
                          row.categoryName.includes('镜片') ||
                          row.categoryName.includes('离焦') ||
                          row.categoryName.includes('单光');

                        return (
                          <tr
                            key={row.id}
                            className={`transition-colors ${
                              checked
                                ? 'bg-[var(--qsl-accent-soft)]'
                                : 'bg-white hover:bg-[#F8F9F5]'
                            }`}
                          >
                            <td className="px-3 py-2 text-center border-r border-[#E5E8E0]">
                              <input
                                type="checkbox"
                                aria-label={`选择 ${row.name}`}
                                checked={checked}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedIds((p) => [...p, row.id]);
                                  else setSelectedIds((p) => p.filter((x) => x !== row.id));
                                }}
                                className="w-4 h-4 accent-[var(--qsl-brand-dark)] cursor-pointer"
                              />
                            </td>

                            {/* Row operation icon buttons matching Screenshot 1 */}
                            <td className="px-2.5 py-2 border-r border-[#E5E8E0]">
                              <div className="flex items-center justify-center gap-1">
                                {canCreate && (
                                  <button
                                    type="button"
                                    title="复制新增"
                                    onClick={() => openCreateModal(row)}
                                    className="w-7 h-7 rounded-md bg-[var(--qsl-accent)] text-[var(--qsl-accent-ink)] hover:bg-[var(--qsl-accent-hover)] border border-[var(--qsl-accent-border)] inline-flex items-center justify-center cursor-pointer"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {canUpdate && (
                                  <button
                                    type="button"
                                    title="编辑商品"
                                    onClick={() => openEditModal(row)}
                                    className="w-7 h-7 rounded-md bg-[var(--qsl-accent)] text-[var(--qsl-accent-ink)] hover:bg-[var(--qsl-accent-hover)] border border-[var(--qsl-accent-border)] inline-flex items-center justify-center cursor-pointer"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {canDelete && (
                                  <button
                                    type="button"
                                    title="删除商品"
                                    onClick={() => {
                                      setDeleteTargetLabel(`删除商品「${row.name}」`);
                                      setDeleteTargetIds([row.id]);
                                    }}
                                    className="w-7 h-7 rounded-md bg-[#DC2626] text-white hover:bg-[#B91C1C] inline-flex items-center justify-center cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {isLensRow && (
                                  <button
                                    type="button"
                                    title="配置镜片工艺/散光加价"
                                    aria-label="配置镜片工艺/散光加价"
                                    onClick={() => navigateToSubPage('basic.product.lens_surcharge')}
                                    className="w-7 h-7 rounded-md bg-[#E0F2FE] text-[#0369A1] border border-[#7DD3FC] hover:bg-[#BAE6FD] inline-flex items-center justify-center cursor-pointer transition-colors"
                                  >
                                    <SlidersHorizontal className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>

                            {activeColumns.map((col, idx) => {
                              const isStickyName = col.key === 'name' && idx === 0;
                              return (
                                <td
                                  key={col.key}
                                  className={`px-3 py-2 border-r last:border-r-0 border-[#E5E8E0] whitespace-nowrap ${
                                    col.align === 'right'
                                      ? 'text-right'
                                      : col.align === 'center'
                                        ? 'text-center'
                                        : 'text-left'
                                  } ${
                                    isStickyName
                                      ? `sticky left-0 z-10 ${checked ? 'bg-[var(--qsl-accent-soft)]' : 'bg-white'}`
                                      : ''
                                  }`}
                                >
                                  {renderCell(col.key, row)}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
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
                  unit="条商品"
                  summaryExtra={
                    <span className="font-medium text-[#171916]">
                      当前已选: {selectedIds.length}
                    </span>
                  }
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Add / Edit Product Modal (Screenshot 3) */}
      <ProductFormModal
        open={formOpen}
        mode={formMode}
        initialProduct={editingProduct}
        copyFromProduct={copyFromProduct}
        meta={meta}
        defaultStoreId={session.currentStoreId === 'all' ? (session.authorizedStores[0]?.id||'') : session.currentStoreId}
        canSeeCost={canSeeCost}
        canSeeWholesale={canSeeWholesale}
        debugMode={debugMode}
        onRefreshMeta={refetchMeta}
        onClose={() => {
          setFormOpen(false);
          setEditingProduct(null);
          setCopyFromProduct(null);
        }}
        onSaved={(saved, action) => {
          void invalidateProducts();
          setStatusMsg({
            text: `${formMode === 'edit' ? '已更新' : '已新增'}商品「${saved.name}」`,
            role: 'status',
          });
          if (action === 'close') {
            setFormOpen(false);
            setEditingProduct(null);
            setCopyFromProduct(null);
          }
        }}
      />

      {/* Delete Confirm Modal */}
      <Modal
        open={Boolean(deleteTargetIds)}
        onClose={() => setDeleteTargetIds(null)}
        title={deleteTargetLabel || '确认删除商品'}
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
        <p className="text-[14px] text-[#171916]">
          确认删除选中的 <strong>{deleteTargetIds?.length ?? 0}</strong> 项商品档案吗？删除后不可恢复。
        </p>
      </Modal>

      {/* Batch Set Modal */}
      <Modal
        open={batchModalOpen}
        onClose={() => setBatchModalOpen(false)}
        title={`批量设置商品属性（已选 ${selectedIds.length} 项）`}
        maxWidthClass="max-w-lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setBatchModalOpen(false)}>
              取消
            </Button>
            <Button
              variant="primary"
              loading={batchMutation.isPending}
              onClick={() => batchMutation.mutate()}
            >
              应用批量修改
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-medium text-[#171916] mb-1.5">启停状态</label>
              <Select
                ariaLabel="批量设置启停状态"
                variant="white"
                value={batchEnabled}
                onChange={(v) => setBatchEnabled(v as 'keep' | 'true' | 'false')}
                options={[
                  { value: 'keep', label: '保持不变' },
                  { value: 'true', label: '批量启用' },
                  { value: 'false', label: '批量停用' },
                ]}
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[#171916] mb-1.5">销售开单置顶</label>
              <Select
                ariaLabel="批量设置销售置顶"
                variant="white"
                value={batchPinOnSale}
                onChange={(v) => setBatchPinOnSale(v as 'keep' | 'true' | 'false')}
                options={[
                  { value: 'keep', label: '保持不变' },
                  { value: 'true', label: '设为置顶' },
                  { value: 'false', label: '取消置顶' },
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-medium text-[#171916] mb-1.5">
                统一销售折扣（%，留空保持不变）
              </label>
              <input
                type="number"
                step="0.01"
                value={batchDiscount}
                onChange={(e) => setBatchDiscount(e.target.value)}
                placeholder="如 85.00"
                className="w-full h-10 px-3 rounded-[9px] bg-white border border-[#D9DDD4] text-[14px] tabular-nums outline-none focus:border-[#171916]"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[#171916] mb-1.5">
                统一库存摆放位置（留空不变）
              </label>
              <input
                type="text"
                value={batchStockLocation}
                onChange={(e) => setBatchStockLocation(e.target.value)}
                placeholder="如 A区-精品镜架柜"
                className="w-full h-10 px-3 rounded-[9px] bg-white border border-[#D9DDD4] text-[14px] outline-none focus:border-[#171916]"
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* Product Import Modal */}
      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="商品批量导入中心"
        subtitle="支持下载标准 CSV 模板、预校验与一键导入商品档案数据库。"
        maxWidthClass="max-w-4xl"
        footer={
          <Button variant="secondary" onClick={() => setImportOpen(false)}>
            关闭
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 border-b border-[#E5E8E0] pb-3">
            {[
              { id: 'excel_v2', label: '导入新版（Excel / CSV）' },
              { id: 'lens_catalog', label: '从镜片画册导入' },
              { id: 'trade_sync', label: '从商贸导入' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setImportTab(t.id as typeof importTab)}
                className={`h-9 px-4 rounded-full text-[14px] font-medium cursor-pointer ${
                  importTab === t.id
                    ? 'bg-[var(--qsl-brand-dark)] text-white'
                    : 'bg-[#F8F9F5] text-[#5F645D] border border-[#D9DDD4]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {importTab !== 'excel_v2' ? (
            <div className="p-6 rounded-2xl bg-[#F8F9F5] border border-[#D9DDD4] space-y-2 text-[14px]">
              <div className="font-semibold text-[#171916]">该外部对接通道尚未开通</div>
              <p className="text-[#5F645D]">
                「{importTab === 'lens_catalog' ? '从镜片画册导入' : '从商贸导入'}」需对接外部厂商画册接口或旧版商贸导出协议，请先使用「导入新版（Excel / CSV）」完成标准化批量导入。
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2.5">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Download className="w-3.5 h-3.5" />}
                  onClick={handleDownloadImportTemplate}
                >
                  1. 下载模板
                </Button>
                <label className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-white border border-[#D9DDD4] hover:border-[#171916] text-[14px] font-medium cursor-pointer">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>2. 选择 CSV 文件</span>
                  <input type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
                </label>
                <Button variant="accent" size="sm" onClick={handleLoadSampleImport}>
                  载入示例数据并预校验
                </Button>
              </div>

              {importResultMsg && (
                <div className="p-3.5 rounded-xl bg-[#ECFDF3] border border-[#BBF7D0] text-[14px] text-[#166534]">
                  {importResultMsg}
                </div>
              )}

              {importPreviews && (
                <div className="border border-[#D9DDD4] rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-[#F8F9F5] border-b border-[#E5E8E0] flex flex-wrap items-center justify-between gap-2 text-[14px]">
                    <span>
                      共 {importPreviews.length} 行 ·{' '}
                      <strong className="text-[#166534]">
                        通过 {importPreviews.filter((r) => r.valid).length} 行
                      </strong>{' '}
                      ·{' '}
                      <strong className="text-[#DC2626]">
                        失败 {importPreviews.filter((r) => !r.valid).length} 行
                      </strong>
                    </span>
                    <Button
                      size="sm"
                      variant="primary"
                      disabled={importPreviews.filter((r) => r.valid).length === 0}
                      onClick={() => void handleCommitImport()}
                    >
                      确认导入有效数据
                    </Button>
                  </div>
                  <div className="overflow-x-auto max-h-72">
                    <table className="w-full text-left text-[13px]">
                      <thead className="bg-[#F8F9F5] border-b border-[#E5E8E0] text-[#5F645D]">
                        <tr>
                          <th className="px-3 py-2">行号</th>
                          <th className="px-3 py-2">品牌</th>
                          <th className="px-3 py-2">品类</th>
                          <th className="px-3 py-2">商品名称</th>
                          <th className="px-3 py-2">型号</th>
                          <th className="px-3 py-2">零售价</th>
                          <th className="px-3 py-2">校验状态</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E8E0]">
                        {importPreviews.map((r) => (
                          <tr key={r.rowNumber}>
                            <td className="px-3 py-2 tabular-nums">{r.rowNumber}</td>
                            <td className="px-3 py-2">{r.brandName || '-'}</td>
                            <td className="px-3 py-2">{r.categoryName || '-'}</td>
                            <td className="px-3 py-2">{r.name || '-'}</td>
                            <td className="px-3 py-2">{r.model || '-'}</td>
                            <td className="px-3 py-2 tabular-nums">{r.retailPrice}</td>
                            <td className="px-3 py-2">
                              {r.valid ? (
                                <span className="text-[#166534] font-medium">校验通过</span>
                              ) : (
                                <span className="text-[#DC2626]">{r.errors.join('；')}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};
