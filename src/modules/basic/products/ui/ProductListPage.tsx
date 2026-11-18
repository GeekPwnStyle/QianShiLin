import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Copy,
  Download,
  Edit3,
  FileSpreadsheet,
  FolderTree,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { appRepositories } from '@/src/app/composition/container';
import { useAuth } from '@/src/modules/auth/application/AuthContext';
import { STORE_CATALOG } from '@/src/modules/auth/domain/identity';
import {
  PRODUCT_CATEGORY_TREE,
  type ProductCategoryId,
  type ProductCategoryNode,
  type ProductImportRowPreview,
  type ProductItem,
} from '@/src/modules/basic/products/domain/product';
import { downloadCsv } from '@/src/shared/lib/exportCsv';
import { formatCurrency, formatDate } from '@/src/shared/lib/format';
import { Button } from '@/src/shared/ui/Button';
import { DataTable, type TableColumn } from '@/src/shared/ui/DataTable';
import { HelpTooltip } from '@/src/shared/ui/HelpTooltip';
import { Modal } from '@/src/shared/ui/Modal';
import { PaginationBar } from '@/src/shared/ui/PaginationBar';
import { Select } from '@/src/shared/ui/Select';
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
} from '@/src/shared/ui/StateViews';
import { StatusLabel } from '@/src/shared/ui/StatusLabel';

const productFormSchema = z.object({
  skuCode: z.string().min(2, '请输入商品编码'),
  name: z.string().min(2, '请输入商品名称'),
  brand: z.string().min(1, '请输入品牌'),
  categoryId: z.string().min(1, '请选择品类'),
  model: z.string().min(1, '请输入型号'),
  colorOrDiopter: z.string().min(1, '请输入色号或度数'),
  series: z.string(),
  refractiveIndex: z.string(),
  isCustomLens: z.boolean(),
  axis: z.string(),
  coatingType: z.string(),
  year: z.number().int().min(2000).max(2035),
  contactLensType: z.string(),
  retailPrice: z.string().regex(/^\d+(\.\d{1,2})?$/, '请输入合法金额'),
  salesDiscount: z.number().min(0.1).max(1),
  wholesalePrice: z.string().regex(/^\d+(\.\d{1,2})?$/, '请输入合法金额'),
  costPrice: z.string().regex(/^\d+(\.\d{1,2})?$/, '请输入合法金额'),
  stockLocation: z.string(),
  pointsPerAmount: z.number().min(0),
  storeId: z.string(),
  supplierName: z.string().min(1, '请输入供应商'),
  enabled: z.boolean(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

const CATEGORY_LABEL_MAP: Record<string, string> = {
  cat_frame: '光学镜架',
  cat_frame_titan: '纯钛/β钛架',
  cat_frame_acetate: '板材/TR架',
  cat_lens: '光学镜片',
  cat_lens_single: '单光/防蓝光片',
  cat_lens_control: '青少年离焦/渐进片',
  cat_contact: '隐形眼镜',
  cat_sunglass: '太阳镜',
  cat_care: '护理液及配件',
};

export const ProductListPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { session, currentRole, dataScope, hasPermission } = useAuth();

  const canCreate = hasPermission('basic.product.create');
  const canUpdate = hasPermission('basic.product.update');
  const canDelete = hasPermission('basic.product.delete');
  const canImport = hasPermission('basic.product.import');
  const canExport =
    hasPermission('basic.product.export') && Boolean(currentRole?.sensitiveFields.batchExport);
  const canSeeCost =
    hasPermission('basic.product.cost.read') && Boolean(currentRole?.sensitiveFields.viewCostPrice);
  const canSeeWholesale = Boolean(currentRole?.sensitiveFields.viewWholesalePrice);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<ProductCategoryId>('cat_all');
  const [keyword, setKeyword] = useState('');
  const [brandFilter, setBrandFilter] = useState('all');
  const [enabledFilter, setEnabledFilter] = useState<'all' | 'true' | 'false'>('all');
  const [customLensFilter, setCustomLensFilter] = useState<'all' | 'true' | 'false'>('all');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [applied, setApplied] = useState({
    keyword: '',
    brand: 'all',
    enabled: 'all' as 'all' | 'true' | 'false',
    isCustomLens: 'all' as 'all' | 'true' | 'false',
  });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [importPreviewPage, setImportPreviewPage] = useState(1);
  const [importPreviewPageSize, setImportPreviewPageSize] = useState(10);
  const [importHistoryPage, setImportHistoryPage] = useState(1);
  const [importHistoryPageSize, setImportHistoryPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchEnabled, setBatchEnabled] = useState<'keep' | 'true' | 'false'>('keep');
  const [batchDiscount, setBatchDiscount] = useState('');

  // Import Wizard State
  const [importOpen, setImportOpen] = useState(false);
  const [importSourceTab, setImportSourceTab] = useState<'excel_v2' | 'lens_catalog' | 'trade_sync'>('excel_v2');
  const [importFileName, setImportFileName] = useState('');
  const [importPreviews, setImportPreviews] = useState<ProductImportRowPreview[] | null>(null);
  const [importDoneRecord, setImportDoneRecord] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [
      'products',
      selectedCategory,
      applied,
      page,
      pageSize,
      sortBy,
      sortOrder,
      session.roleId,
      session.currentStoreId,
    ],
    queryFn: () =>
      appRepositories.products.queryProducts(
        {
          page,
          pageSize,
          sortBy,
          sortOrder,
          filters: {
            categoryId: selectedCategory,
            ...applied,
          },
        },
        dataScope
      ),
  });

  const { data: importHistory = [] } = useQuery({
    queryKey: ['products', 'import_history'],
    queryFn: () => appRepositories.products.getImportHistory(),
    enabled: importOpen,
  });

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      skuCode: 'QSL-NEW-001',
      name: '',
      brand: '卡尔蔡司',
      categoryId: 'cat_frame_titan',
      model: '',
      colorOrDiopter: '常规色/现片',
      series: '2026秋季系列',
      refractiveIndex: '-',
      isCustomLens: false,
      axis: '-',
      coatingType: '-',
      year: 2026,
      contactLensType: '-',
      retailPrice: '1280.00',
      salesDiscount: 0.9,
      wholesalePrice: '680.00',
      costPrice: '510.00',
      stockLocation: 'A区-待上架',
      pointsPerAmount: 10,
      storeId: 'store_hq_01',
      supplierName: '卡尔蔡司光学华东代理',
      enabled: true,
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: ProductFormValues) => {
      const storeName =
        STORE_CATALOG.find((s) => s.id === values.storeId)?.name ?? '杭州西湖旗舰店';
      const categoryName = CATEGORY_LABEL_MAP[values.categoryId] ?? '光学镜架';
      if (editingProduct) {
        return appRepositories.products.updateProduct(
          editingProduct.id,
          {
            ...values,
            categoryId: values.categoryId as ProductCategoryId,
            categoryName,
            storeName,
          },
          dataScope
        );
      }
      return appRepositories.products.createProduct(
        {
          ...values,
          categoryId: values.categoryId as ProductCategoryId,
          categoryName,
          storeName,
          supplierId: 'sup_zeiss_01',
          tags: ['新增建档'],
          productMark: '常规',
          bindSource: '手工新增',
        },
        dataScope
      );
    },
    onSuccess: () => {
      setFormOpen(false);
      setEditingProduct(null);
      void queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (ids: string[]) => appRepositories.products.deleteProducts(ids, dataScope),
    onSuccess: () => {
      setSelectedIds([]);
      setDeleteConfirmOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const batchMutation = useMutation({
    mutationFn: () => {
      const patch: { enabled?: boolean; salesDiscount?: number } = {};
      if (batchEnabled !== 'keep') patch.enabled = batchEnabled === 'true';
      if (batchDiscount.trim()) {
        const d = Number.parseFloat(batchDiscount);
        if (!Number.isNaN(d)) patch.salesDiscount = Math.min(1, Math.max(0.1, d));
      }
      return appRepositories.products.batchUpdateProducts(selectedIds, patch, dataScope);
    },
    onSuccess: () => {
      setBatchModalOpen(false);
      setSelectedIds([]);
      void queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const openCreateModal = (copyFrom?: ProductItem) => {
    setEditingProduct(null);
    if (copyFrom) {
      form.reset({
        ...copyFrom,
        skuCode: `${copyFrom.skuCode}-COPY`,
        name: `${copyFrom.name}（复制）`,
      });
    } else {
      form.reset({
        skuCode: `QSL-${String(Date.now()).slice(-4)}`,
        name: '',
        brand: '卡尔蔡司',
        categoryId: 'cat_frame_titan',
        model: '',
        colorOrDiopter: '曜石黑',
        series: '2026新品',
        refractiveIndex: '-',
        isCustomLens: false,
        axis: '-',
        coatingType: '-',
        year: 2026,
        contactLensType: '-',
        retailPrice: '1280.00',
        salesDiscount: 0.9,
        wholesalePrice: '680.00',
        costPrice: '510.00',
        stockLocation: 'A区-精品柜',
        pointsPerAmount: 10,
        storeId: session.currentStoreId === 'all' ? 'store_hq_01' : session.currentStoreId,
        supplierName: '卡尔蔡司光学华东代理',
        enabled: true,
      });
    }
    setFormOpen(true);
  };

  const openEditModal = (item: ProductItem) => {
    setEditingProduct(item);
    form.reset({
      ...item,
    });
    setFormOpen(true);
  };

  const handleDownloadTemplate = () => {
    downloadCsv(
      '千视林商品导入模板_新版',
      [
        {
          brand: '卡尔蔡司',
          categoryName: '单光/防蓝光片',
          name: '蔡司泽锐钻立方防蓝光 1.60',
          model: 'ZEISS-CLEARVIEW-160',
          retailPrice: '1980.00',
        },
      ],
      [
        { key: 'brand', header: '品牌(必填)', accessor: (r) => r.brand },
        { key: 'categoryName', header: '品类(必填)', accessor: (r) => r.categoryName },
        { key: 'name', header: '商品(必填)', accessor: (r) => r.name },
        { key: 'model', header: '型号(必填)', accessor: (r) => r.model },
        { key: 'retailPrice', header: '零售价', accessor: (r) => r.retailPrice },
      ]
    );
  };

  const handleLoadSampleImport = async () => {
    setImportFileName('2026冬季镜架镜片导入示例.csv');
    setImportDoneRecord(null);
    const previews = await appRepositories.products.validateImportRows([
      {
        brand: '依视路',
        categoryName: '单光/防蓝光片',
        name: '依视路钻晶A4防蓝光现片 1.60',
        model: 'ESS-A4-160',
        retailPrice: '1680.00',
      },
      {
        brand: '千视林甄选',
        categoryName: '纯钛/β钛架',
        name: '千视林极简圆框纯钛 QSL-T902',
        model: 'QSL-T902-G1',
        retailPrice: '1190.00',
      },
      {
        brand: '暴龙',
        categoryName: '太阳镜',
        name: '暴龙春季新款偏光太阳镜',
        model: '',
        retailPrice: 'abc',
      },
    ]);
    setImportPreviews(previews);
  };

  const handleCsvFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    setImportDoneRecord(null);
    const text = await file.text();
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const dataRows = lines.slice(1).map((line) => {
      const cols = line.split(',').map((c) => c.replace(/^"|"$/g, '').trim());
      return {
        brand: cols[0] ?? '',
        categoryName: cols[1] ?? '',
        name: cols[2] ?? '',
        model: cols[3] ?? '',
        retailPrice: cols[4] ?? '990.00',
      };
    });
    const previews = await appRepositories.products.validateImportRows(dataRows);
    setImportPreviews(previews);
  };

  const handleCommitImport = async () => {
    if (!importPreviews) return;
    const validRows = importPreviews.filter((r) => r.valid);
    const failedCount = importPreviews.length - validRows.length;
    const record = await appRepositories.products.commitImportRows(
      importFileName || '导入批次.csv',
      validRows,
      failedCount,
      session.displayName,
      dataScope
    );
    setImportDoneRecord(record.statusNote);
    setImportPreviews(null);
    void queryClient.invalidateQueries({ queryKey: ['products'] });
  };

  const handleDownloadFailedRows = () => {
    if (!importPreviews) return;
    const bad = importPreviews.filter((r) => !r.valid);
    downloadCsv('商品导入校验失败明细', bad, [
      { key: 'row', header: '行号', accessor: (r) => r.rowNumber },
      { key: 'brand', header: '品牌', accessor: (r) => r.brand },
      { key: 'categoryName', header: '品类', accessor: (r) => r.categoryName },
      { key: 'name', header: '商品名称', accessor: (r) => r.name },
      { key: 'model', header: '型号', accessor: (r) => r.model },
      { key: 'errors', header: '错误原因', accessor: (r) => r.errors.join('；') },
    ]);
  };

  const rows = data?.items ?? [];

  const columns: TableColumn<ProductItem>[] = [
    {
      key: 'name',
      header: '商品名称',
      sticky: true,
      sortable: true,
      render: (r) => (
        <div className="max-w-[230px]">
          <div className="font-medium text-[#171916] truncate" title={r.name}>
            {r.name}
          </div>
          <div className="text-[13px] font-mono text-[#73796F]">{r.skuCode}</div>
        </div>
      ),
    },
    { key: 'brand', header: '品牌', sortable: true, render: (r) => r.brand },
    { key: 'categoryName', header: '品类', render: (r) => r.categoryName },
    { key: 'model', header: '型号', render: (r) => <span className="font-mono text-[14px]">{r.model}</span> },
    { key: 'colorOrDiopter', header: '色号/度数', render: (r) => r.colorOrDiopter },
    { key: 'series', header: '系列', defaultVisible: false, render: (r) => r.series },
    { key: 'refractiveIndex', header: '折射率', render: (r) => r.refractiveIndex },
    {
      key: 'isCustomLens',
      header: '定制镜片',
      render: (r) => (r.isCustomLens ? '是' : '否'),
    },
    { key: 'axis', header: '轴位', defaultVisible: false, render: (r) => r.axis },
    { key: 'coatingType', header: '加膜类型', defaultVisible: false, render: (r) => r.coatingType },
    { key: 'year', header: '年份', defaultVisible: false, render: (r) => r.year },
    { key: 'contactLensType', header: '隐形类型', defaultVisible: false, render: (r) => r.contactLensType },
    {
      key: 'retailPrice',
      header: '零售价',
      align: 'right',
      sortable: true,
      render: (r) => formatCurrency(r.retailPrice),
    },
    {
      key: 'salesDiscount',
      header: '销售折扣',
      align: 'right',
      render: (r) => `${(r.salesDiscount * 10).toFixed(1)} 折`,
    },
    {
      key: 'discountedPrice',
      header: '折后价',
      align: 'right',
      sortable: true,
      render: (r) => <span className="font-medium">{formatCurrency(r.discountedPrice)}</span>,
    },
    ...(canSeeWholesale
      ? [
          {
            key: 'wholesalePrice',
            header: '通用批发价',
            align: 'right' as const,
            defaultVisible: false,
            render: (r: ProductItem) => formatCurrency(r.wholesalePrice),
          },
        ]
      : []),
    ...(canSeeCost
      ? [
          {
            key: 'costPrice',
            header: '进货价',
            align: 'right' as const,
            defaultVisible: false,
            render: (r: ProductItem) => formatCurrency(r.costPrice),
          },
        ]
      : []),
    { key: 'stockLocation', header: '摆放位置', defaultVisible: false, render: (r) => r.stockLocation },
    { key: 'pointsPerAmount', header: '积分基数', defaultVisible: false, align: 'right', render: (r) => r.pointsPerAmount },
    { key: 'storeName', header: '归属门店', render: (r) => r.storeName },
    {
      key: 'enabled',
      header: '启用状态',
      render: (r) => (
        <StatusLabel tone={r.enabled ? 'success' : 'neutral'} label={r.enabled ? '启用' : '停用'} />
      ),
    },
    { key: 'supplierName', header: '供应商', render: (r) => r.supplierName },
    {
      key: 'tags',
      header: '标签',
      defaultVisible: false,
      render: (r) => r.tags.join(' · ') || '-',
    },
    { key: 'productMark', header: '商品标', defaultVisible: false, render: (r) => r.productMark },
    {
      key: 'createdAt',
      header: '创建时间',
      sortable: true,
      render: (r) => <span className="tabular-nums text-[14px] text-[#5F645D]">{formatDate(r.createdAt)}</span>,
    },
    { key: 'bindSource', header: '绑定来源', defaultVisible: false, render: (r) => r.bindSource },
    {
      key: 'actions',
      header: '操作',
      render: (r) => (
        <div className="flex items-center gap-2">
          {canUpdate && (
            <button
              type="button"
              onClick={() => openEditModal(r)}
              className="text-[14px] text-[#171916] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
              <span>编辑</span>
            </button>
          )}
          {canCreate && (
            <button
              type="button"
              onClick={() => openCreateModal(r)}
              className="text-[14px] text-[#5F645D] hover:text-[#171916] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <Copy className="w-4 h-4" />
              <span>复制</span>
            </button>
          )}
        </div>
      ),
    },
  ];

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortOrder('asc');
    }
  };

  const renderCategoryTree = (nodes: ProductCategoryNode[], depth = 0) =>
    nodes.map((node) => {
      const active = selectedCategory === node.id;
      return (
        <div key={node.id}>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory(node.id);
              setPage(1);
            }}
            style={{ paddingLeft: `${12 + depth * 14}px` }}
            className={`w-full text-left pr-3 py-2 rounded-xl text-[15px] transition-colors cursor-pointer ${
              active
                ? 'bg-[var(--qsl-accent-soft)] text-[#171916] font-medium'
                : 'text-[#5F645D] hover:text-[#171916] hover:bg-[#F8F9F5]'
            }`}
          >
            {node.name}
          </button>
          {node.children && renderCategoryTree(node.children, depth + 1)}
        </div>
      );
    });

  const handleExportProducts = () => {
    if (!canExport || rows.length === 0) return;
    const targetRows =
      selectedIds.length > 0 ? rows.filter((r) => selectedIds.includes(r.id)) : rows;
    downloadCsv('千视林商品目录导出', targetRows, [
      { key: 'skuCode', header: 'SKU编码', accessor: (r) => r.skuCode },
      { key: 'name', header: '商品名称', accessor: (r) => r.name },
      { key: 'brand', header: '品牌', accessor: (r) => r.brand },
      { key: 'categoryName', header: '品类', accessor: (r) => r.categoryName },
      { key: 'model', header: '型号', accessor: (r) => r.model },
      { key: 'retailPrice', header: '零售价', accessor: (r) => r.retailPrice },
      { key: 'discountedPrice', header: '折后价', accessor: (r) => r.discountedPrice },
      ...(canSeeCost
        ? [{ key: 'costPrice', header: '进货价', accessor: (r: ProductItem) => r.costPrice }]
        : []),
    ]);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Category Tree Panel */}
        <div className="lg:col-span-3 bg-white border border-[#D9DDD4] rounded-[20px] p-4">
          <div className="flex items-center gap-2 pb-3 mb-2 border-b border-[#E5E8E0]">
            <FolderTree className="w-4 h-4 text-[#171916]" />
            <span className="text-[16px] font-semibold text-[#171916]">商品分类体系</span>
          </div>
          <div className="space-y-0.5">{renderCategoryTree(PRODUCT_CATEGORY_TREE)}</div>
        </div>

        {/* Right Product Workspace */}
        <div className="lg:col-span-9 space-y-4 min-w-0">
          {/* Search & Actions Toolbar */}
          <div className="bg-white border border-[#D9DDD4] rounded-[20px] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="w-4 h-4 text-[#73796F] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="模糊搜索商品名称、编码、型号、品牌"
                    className="w-full h-10 pl-9 pr-3 rounded-[9px] bg-[#F8F9F5] border border-[#D9DDD4] text-[15px] outline-none focus:border-[#171916]"
                  />
                </div>
                <Button
                  variant="primary"
                  onClick={() => {
                    setPage(1);
                    setApplied({
                      keyword,
                      brand: brandFilter,
                      enabled: enabledFilter,
                      isCustomLens: customLensFilter,
                    });
                  }}
                >
                  查询
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowAdvanced((p) => !p)}
                >
                  {showAdvanced ? '收起高级筛选' : '高级筛选'}
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {canCreate && (
                  <Button
                    variant="accent"
                    icon={<Plus className="w-3.5 h-3.5" />}
                    onClick={() => openCreateModal()}
                  >
                    新增商品
                  </Button>
                )}
                {canImport && (
                  <Button
                    variant="secondary"
                    icon={<Upload className="w-3.5 h-3.5" />}
                    onClick={() => setImportOpen(true)}
                  >
                    导入
                  </Button>
                )}
                {canUpdate && selectedIds.length > 0 && (
                  <Button
                    variant="secondary"
                    onClick={() => setBatchModalOpen(true)}
                  >
                    批量设置 ({selectedIds.length})
                  </Button>
                )}
                {canDelete && selectedIds.length > 0 && (
                  <Button
                    variant="danger"
                    icon={<Trash2 className="w-3.5 h-3.5" />}
                    onClick={() => setDeleteConfirmOpen(true)}
                  >
                    删除 ({selectedIds.length})
                  </Button>
                )}
                {canExport && (
                  <Button
                    variant="secondary"
                    icon={<Download className="w-3.5 h-3.5" />}
                    onClick={handleExportProducts}
                  >
                    导出
                  </Button>
                )}
                {!canSeeCost && (
                  <HelpTooltip
                    title="数据权限隔离提示"
                    content="当前角色未授权查看「进货价」列，敏感成本字段已自动隐藏。"
                    placement="bottom-end"
                    ariaLabel="查看成本字段权限说明"
                  />
                )}
              </div>
            </div>

            {showAdvanced && (
              <div className="pt-3 border-t border-[#E5E8E0] grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[14px] text-[#5F645D] mb-1">品牌</label>
                  <Select
                    ariaLabel="筛选品牌"
                    value={brandFilter}
                    onChange={setBrandFilter}
                    options={[
                      { value: 'all', label: '全部品牌' },
                      { value: '卡尔蔡司', label: '卡尔蔡司' },
                      { value: '依视路', label: '依视路' },
                      { value: '林德伯格', label: '林德伯格' },
                      { value: '千视林甄选', label: '千视林甄选' },
                      { value: '强生安视优', label: '强生安视优' },
                      { value: '暴龙', label: '暴龙' },
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-[14px] text-[#5F645D] mb-1">启用状态</label>
                  <Select
                    ariaLabel="筛选启用状态"
                    value={enabledFilter}
                    onChange={(val) => setEnabledFilter(val as 'all' | 'true' | 'false')}
                    options={[
                      { value: 'all', label: '全部状态' },
                      { value: 'true', label: '启用' },
                      { value: 'false', label: '停用' },
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-[14px] text-[#5F645D] mb-1">是否定制镜片</label>
                  <Select
                    ariaLabel="筛选是否定制镜片"
                    value={customLensFilter}
                    onChange={(val) => setCustomLensFilter(val as 'all' | 'true' | 'false')}
                    options={[
                      { value: 'all', label: '全部' },
                      { value: 'true', label: '仅定制镜片' },
                      { value: 'false', label: '非定制标品' },
                    ]}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    variant="secondary"
                    icon={<RotateCcw className="w-3.5 h-3.5" />}
                    onClick={() => {
                      setKeyword('');
                      setBrandFilter('all');
                      setEnabledFilter('all');
                      setCustomLensFilter('all');
                      setSelectedCategory('cat_all');
                      setApplied({ keyword: '', brand: 'all', enabled: 'all', isCustomLens: 'all' });
                    }}
                  >
                    重置全部条件
                  </Button>
                </div>
              </div>
            )}
          </div>

          {isLoading ? (
            <LoadingSkeleton rows={6} />
          ) : isError ? (
            <ErrorState onRetry={() => void refetch()} />
          ) : rows.length === 0 ? (
            <EmptyState
              mode="filtered"
              actionLabel="清除筛选"
              onAction={() => {
                setSelectedCategory('cat_all');
                setKeyword('');
                setApplied({ keyword: '', brand: 'all', enabled: 'all', isCustomLens: 'all' });
              }}
            />
          ) : (
            <DataTable
              columns={columns}
              rows={rows}
              total={data?.total ?? 0}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(next) => {
                setPageSize(next);
                setPage(1);
              }}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={handleSort}
              selectable={canUpdate || canDelete || canExport}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
            />
          )}
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingProduct ? `编辑商品 · ${editingProduct.skuCode}` : '新增商品主数据'}
        subtitle="必填校验由 Zod 执行，折后价将按零售价与销售折扣自动重算。"
        maxWidthClass="max-w-3xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              取消
            </Button>
            <Button
              variant="primary"
              loading={saveMutation.isPending}
              onClick={() => form.handleSubmit((v) => saveMutation.mutate(v))()}
            >
              保存商品档案
            </Button>
          </>
        }
      >
        <form className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-[15px]">
          <div>
            <label className="block text-[14px] text-[#5F645D] mb-1">SKU编码 *</label>
            <input
              {...form.register('skuCode')}
              className="w-full h-10 px-3 rounded-[9px] border border-[#D9DDD4]"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[14px] text-[#5F645D] mb-1">商品名称 *</label>
            <input
              {...form.register('name')}
              placeholder="例如：蔡司新清锐铂金膜非球面镜片 1.67"
              className="w-full h-10 px-3 rounded-[9px] border border-[#D9DDD4]"
            />
            {form.formState.errors.name && (
              <p className="text-[13px] text-[#DC2626] mt-1">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-[14px] text-[#5F645D] mb-1">品牌 *</label>
            <input
              {...form.register('brand')}
              className="w-full h-10 px-3 rounded-[9px] border border-[#D9DDD4]"
            />
          </div>
          <div>
            <label className="block text-[14px] text-[#5F645D] mb-1">品类 *</label>
            <Controller
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <Select
                  ariaLabel="品类"
                  variant="white"
                  value={field.value}
                  onChange={field.onChange}
                  options={Object.entries(CATEGORY_LABEL_MAP).map(([id, label]) => ({
                    value: id,
                    label,
                  }))}
                />
              )}
            />
          </div>
          <div>
            <label className="block text-[14px] text-[#5F645D] mb-1">型号 *</label>
            <input
              {...form.register('model')}
              className="w-full h-10 px-3 rounded-[9px] border border-[#D9DDD4]"
            />
          </div>

          <div>
            <label className="block text-[14px] text-[#5F645D] mb-1">色号或度数</label>
            <input
              {...form.register('colorOrDiopter')}
              className="w-full h-10 px-3 rounded-[9px] border border-[#D9DDD4]"
            />
          </div>
          <div>
            <label className="block text-[14px] text-[#5F645D] mb-1">折射率</label>
            <input
              {...form.register('refractiveIndex')}
              className="w-full h-10 px-3 rounded-[9px] border border-[#D9DDD4]"
            />
          </div>
          <div>
            <label className="block text-[14px] text-[#5F645D] mb-1">零售价 (元) *</label>
            <input
              {...form.register('retailPrice')}
              className="w-full h-10 px-3 rounded-[9px] border border-[#D9DDD4] tabular-nums"
            />
          </div>

          <div>
            <label className="block text-[14px] text-[#5F645D] mb-1">销售折扣 (0.1~1.0)</label>
            <input
              type="number"
              step="0.01"
              {...form.register('salesDiscount', { valueAsNumber: true })}
              className="w-full h-10 px-3 rounded-[9px] border border-[#D9DDD4] tabular-nums"
            />
          </div>
          <div>
            <label className="block text-[14px] text-[#5F645D] mb-1">供应商</label>
            <input
              {...form.register('supplierName')}
              className="w-full h-10 px-3 rounded-[9px] border border-[#D9DDD4]"
            />
          </div>
          <div>
            <label className="block text-[14px] text-[#5F645D] mb-1">归属门店</label>
            <Controller
              control={form.control}
              name="storeId"
              render={({ field }) => (
                <Select
                  ariaLabel="归属门店"
                  variant="white"
                  value={field.value}
                  onChange={field.onChange}
                  options={STORE_CATALOG.map((s) => ({
                    value: s.id,
                    label: s.name,
                  }))}
                />
              )}
            />
          </div>
        </form>
      </Modal>

      {/* Dangerous Delete Confirm Modal */}
      <Modal
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="确认删除选中商品"
        subtitle="危险操作二次确认：删除后本地演示清单将移除所选SKU。"
        maxWidthClass="max-w-md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteConfirmOpen(false)}>
              取消
            </Button>
            <Button
              variant="danger"
              loading={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(selectedIds)}
            >
              确认删除 {selectedIds.length} 项商品
            </Button>
          </>
        }
      >
        <p className="text-[15px] text-[#171916]">
          即将删除选中的 <strong>{selectedIds.length}</strong> 个商品档案。此操作在真实环境中涉及历史单据引用校验，仅演示环境直接移除。
        </p>
      </Modal>

      {/* Batch Update Modal */}
      <Modal
        open={batchModalOpen}
        onClose={() => setBatchModalOpen(false)}
        title={`批量设置商品属性 (${selectedIds.length} 项)`}
        maxWidthClass="max-w-md"
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
        <div className="space-y-4 text-[15px]">
          <div>
            <label className="block text-[14px] text-[#5F645D] mb-1">启停状态</label>
            <Select
              ariaLabel="启停状态"
              variant="white"
              value={batchEnabled}
              onChange={(val) => setBatchEnabled(val as 'keep' | 'true' | 'false')}
              options={[
                { value: 'keep', label: '保持不变' },
                { value: 'true', label: '批量启用' },
                { value: 'false', label: '批量停用' },
              ]}
            />
          </div>
          <div>
            <label className="block text-[14px] text-[#5F645D] mb-1">
              统一调整销售折扣（留空不变，如 0.85）
            </label>
            <input
              type="text"
              value={batchDiscount}
              onChange={(e) => setBatchDiscount(e.target.value)}
              placeholder="0.85"
              className="w-full h-10 px-3 rounded-[9px] border border-[#D9DDD4]"
            />
          </div>
        </div>
      </Modal>

      {/* Product Import Wizard Modal */}
      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="商品批量导入中心"
        subtitle="支持下载标准模板、解析预校验、下载失败明细并追溯历史导入批次。"
        maxWidthClass="max-w-4xl"
        footer={
          <Button variant="secondary" onClick={() => setImportOpen(false)}>
            关闭
          </Button>
        }
      >
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2 border-b border-[#E5E8E0] pb-3">
            {[
              { id: 'excel_v2', label: '导入新版（Excel / CSV）' },
              { id: 'lens_catalog', label: '从镜片画册导入（未接入）' },
              { id: 'trade_sync', label: '从商贸导入（未接入）' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setImportSourceTab(t.id as typeof importSourceTab)}
                className={`h-10 px-4 rounded-full text-[15px] font-medium cursor-pointer ${
                  importSourceTab === t.id
                    ? 'bg-[#171916] text-white'
                    : 'bg-[#F8F9F5] text-[#5F645D] border border-[#D9DDD4]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {importSourceTab !== 'excel_v2' ? (
            <div className="p-6 rounded-2xl bg-[#F8F9F5] border border-[#D9DDD4] space-y-2 text-[15px]">
              <div className="font-semibold text-[#171916]">该导入来源当前尚未接入</div>
              <p className="text-[#5F645D]">
                「{importSourceTab === 'lens_catalog' ? '从镜片画册导入' : '从商贸导入'}」依赖外部厂商画册接口及老商贸系统迁移协议，当前原型阶段明确标注为未接入，请使用「导入新版」验证模板校验流程。
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="secondary"
                  icon={<Download className="w-3.5 h-3.5" />}
                  onClick={handleDownloadTemplate}
                >
                  1. 下载模板
                </Button>
                <label className="inline-flex items-center gap-2 h-10 px-4 rounded-[10px] bg-white border border-[#D9DDD4] hover:border-[#171916] text-[15px] font-medium cursor-pointer">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>2. 选择 CSV 文件</span>
                  <input type="file" accept=".csv" onChange={handleCsvFileUpload} className="hidden" />
                </label>
                <Button variant="accent" onClick={handleLoadSampleImport}>
                  载入含错示例文件并预校验
                </Button>
                <HelpTooltip
                  tone="warning"
                  title="可配置规则提示（待确认）"
                  content="模板必填字段：品牌、品类、商品、型号。重复SKU覆盖/跳过策略、单次文件大小上限与服务端并发锁规则待业务确认。"
                  ariaLabel="查看导入规则提示"
                />
              </div>

              {importDoneRecord && (
                <div className="p-4 rounded-xl bg-[#ECFDF3] border border-[#BBF7D0] text-[15px] text-[#166534]">
                  导入完成：{importDoneRecord}。可在下方历史记录与商品总览中查看新增数据。
                </div>
              )}

              {importPreviews && (
                <div className="border border-[#D9DDD4] rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 bg-[#F8F9F5] border-b border-[#E5E8E0] flex flex-wrap items-center justify-between gap-2 text-[15px]">
                    <span>
                      预校验结果：共 {importPreviews.length} 行 ·{' '}
                      <strong className="text-[#166534]">
                        通过 {importPreviews.filter((r) => r.valid).length} 行
                      </strong>{' '}
                      ·{' '}
                      <strong className="text-[#DC2626]">
                        失败 {importPreviews.filter((r) => !r.valid).length} 行
                      </strong>
                    </span>
                    <div className="flex items-center gap-2">
                      {importPreviews.some((r) => !r.valid) && (
                        <Button size="sm" variant="secondary" onClick={handleDownloadFailedRows}>
                          下载失败信息
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={importPreviews.filter((r) => r.valid).length === 0}
                        onClick={handleCommitImport}
                      >
                        确认导入有效数据
                      </Button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[14px]">
                      <thead className="bg-[#F8F9F5] border-b border-[#E5E8E0] text-[#5F645D]">
                        <tr>
                          <th className="px-3 py-2">行号</th>
                          <th className="px-3 py-2">品牌</th>
                          <th className="px-3 py-2">品类</th>
                          <th className="px-3 py-2">商品</th>
                          <th className="px-3 py-2">型号</th>
                          <th className="px-3 py-2">零售价</th>
                          <th className="px-3 py-2">校验结论</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E8E0]">
                        {importPreviews
                          .slice(
                            (Math.min(importPreviewPage, Math.max(1, Math.ceil(importPreviews.length / importPreviewPageSize))) - 1) * importPreviewPageSize,
                            Math.min(importPreviewPage, Math.max(1, Math.ceil(importPreviews.length / importPreviewPageSize))) * importPreviewPageSize
                          )
                          .map((row) => (
                          <tr key={row.rowNumber}>
                            <td className="px-3 py-2 tabular-nums">{row.rowNumber}</td>
                            <td className="px-3 py-2">{row.brand || '-'}</td>
                            <td className="px-3 py-2">{row.categoryName || '-'}</td>
                            <td className="px-3 py-2">{row.name || '-'}</td>
                            <td className="px-3 py-2">{row.model || '-'}</td>
                            <td className="px-3 py-2 tabular-nums">{row.retailPrice}</td>
                            <td className="px-3 py-2">
                              {row.valid ? (
                                <StatusLabel tone="success" label="校验通过" />
                              ) : (
                                <StatusLabel tone="error" label={row.errors.join('；')} />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <PaginationBar
                    compact
                    total={importPreviews.length}
                    page={importPreviewPage}
                    pageSize={importPreviewPageSize}
                    unit="行"
                    onPageChange={setImportPreviewPage}
                    onPageSizeChange={(next) => {
                      setImportPreviewPageSize(next);
                      setImportPreviewPage(1);
                    }}
                  />
                </div>
              )}

              <div>
                <h4 className="text-[15px] font-semibold text-[#171916] mb-2">最近导入历史记录</h4>
                <div className="rounded-xl border border-[#E5E8E0] overflow-hidden">
                  <div className="space-y-2 p-2.5 bg-[#FAFBF8]">
                    {importHistory
                      .slice(
                        (Math.min(importHistoryPage, Math.max(1, Math.ceil(importHistory.length / importHistoryPageSize))) - 1) * importHistoryPageSize,
                        Math.min(importHistoryPage, Math.max(1, Math.ceil(importHistory.length / importHistoryPageSize))) * importHistoryPageSize
                      )
                      .map((h) => (
                      <div
                        key={h.id}
                        className="p-3 rounded-xl bg-white border border-[#E5E8E0] flex flex-wrap items-center justify-between gap-2 text-[14px]"
                      >
                        <div>
                          <span className="font-medium text-[#171916]">{h.fileName}</span>
                          <span className="text-[#5F645D] ml-2">· {h.statusNote}</span>
                        </div>
                        <div className="text-[#73796F] tabular-nums">
                          {formatDate(h.createdAt)} · {h.operator}
                        </div>
                      </div>
                    ))}
                  </div>
                  {importHistory.length > 0 && (
                    <PaginationBar
                      compact
                      total={importHistory.length}
                      page={importHistoryPage}
                      pageSize={importHistoryPageSize}
                      onPageChange={setImportHistoryPage}
                      onPageSizeChange={(next) => {
                        setImportHistoryPageSize(next);
                        setImportHistoryPage(1);
                      }}
                    />
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};
