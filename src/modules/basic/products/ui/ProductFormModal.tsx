import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  ImagePlus,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { STORE_CATALOG } from '@/src/modules/auth/domain/identity';
import {
  productsApi,
  type ProductDictionaryRecord,
  type ProductMetaResponse,
  type ProductRecord,
  type ProductWritePayload,
} from '@/src/modules/basic/products/infrastructure/productsApi';
import { Button } from '@/src/shared/ui/Button';
import { HelpTooltip } from '@/src/shared/ui/HelpTooltip';
import { Modal } from '@/src/shared/ui/Modal';
import { Select } from '@/src/shared/ui/Select';

export interface ProductFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialProduct: ProductRecord | null;
  copyFromProduct?: ProductRecord | null;
  meta: ProductMetaResponse | undefined;
  defaultStoreId: string;
  canSeeCost: boolean;
  canSeeWholesale: boolean;
  debugMode: boolean;
  onRefreshMeta: () => Promise<unknown>;
  onClose: () => void;
  onSaved: (item: ProductRecord, action: 'close' | 'continue') => void;
}

interface ProductFormState {
  skuCode: string;
  brandId: string;
  brandName: string;
  categoryId: string;
  categoryName: string;
  model: string;
  colorOrDiopter: string;
  series: string;
  year: string;
  name: string;
  refractiveIndex: string;
  isCustomLens: boolean;
  axis: string;
  coatingType: string;
  contactLensType: string;
  retailPrice: string;
  salesDiscount: string;
  discountedPrice: string;
  costPrice: string;
  wholesalePrice: string;
  barcode: string;
  stockLocation: string;
  unit: string;
  pinOnSale: boolean;
  tags: string[];
  imageUrl: string | null;
  supplierId: string;
  supplierName: string;
  minStock: string;
  maxStock: string;
  manufacturer: string;
  productionLicenseNo: string;
  filingCertNo: string;
  originPlace: string;
  licenseExpiresOn: string;
  licenseImageUrl: string | null;
  storeId: string;
  enabled: boolean;
}

const REFRACTIVE_INDEX_OPTIONS = ['1.50', '1.56', '1.59', '1.60', '1.67', '1.74'];
const UNIT_OPTIONS = ['副', '片', '盒', '瓶', '件', '套'];

function formatMoneyStr(val: number): string {
  if (!Number.isFinite(val) || val < 0) return '0.00';
  return (Math.round(val * 100) / 100).toFixed(2);
}

function suggestUnitByCategory(catName: string): string {
  if (catName.includes('镜片')) return '片';
  if (catName.includes('隐形')) return '盒';
  if (catName.includes('护理') || catName.includes('洗眼')) return '瓶';
  if (catName.includes('镜架') || catName.includes('太阳镜') || catName.includes('老花')) return '副';
  return '件';
}

function buildInitialFormState(
  mode: 'create' | 'edit',
  source: ProductRecord | null,
  defaultStoreId: string,
  meta?: ProductMetaResponse
): ProductFormState {
  if (source) {
    const isCopy = mode === 'create';
    return {
      skuCode: isCopy ? `${source.skuCode}-COPY` : source.skuCode,
      brandId: source.brandId || '',
      brandName: source.brandName || '',
      categoryId: source.categoryId || '',
      categoryName: source.categoryName || '',
      model: source.model || '',
      colorOrDiopter: source.colorOrDiopter || '',
      series: source.series || '',
      year: source.year ? String(source.year) : String(new Date().getFullYear()),
      name: isCopy ? `${source.name}（复制）` : source.name,
      refractiveIndex: source.refractiveIndex || '',
      isCustomLens: Boolean(source.isCustomLens),
      axis: source.axis || '',
      coatingType: source.coatingType || '',
      contactLensType: source.contactLensType || '',
      retailPrice: source.retailPrice || '0.00',
      salesDiscount: source.salesDiscount || '100.00',
      discountedPrice: source.discountedPrice || source.retailPrice || '0.00',
      costPrice: source.costPrice || '',
      wholesalePrice: source.wholesalePrice || '',
      barcode: isCopy ? '' : source.barcode || '',
      stockLocation: source.stockLocation || '',
      unit: source.unit || suggestUnitByCategory(source.categoryName || ''),
      pinOnSale: Boolean(source.pinOnSale),
      tags: Array.isArray(source.tags) ? source.tags : [],
      imageUrl: source.imageUrl ?? null,
      supplierId: source.supplierId || '',
      supplierName: source.supplierName || '',
      minStock: source.minStock !== null && source.minStock !== undefined ? String(source.minStock) : '',
      maxStock: source.maxStock !== null && source.maxStock !== undefined ? String(source.maxStock) : '',
      manufacturer: source.manufacturer || '',
      productionLicenseNo: source.productionLicenseNo || '',
      filingCertNo: source.filingCertNo || '',
      originPlace: source.originPlace || '',
      licenseExpiresOn: source.licenseExpiresOn || '',
      licenseImageUrl: source.licenseImageUrl ?? null,
      storeId: source.storeId || defaultStoreId,
      enabled: source.enabled ?? true,
    };
  }

  const defaultCat = meta?.categories.find((c) => c.name === '镜架') ?? meta?.categories[0];
  return {
    skuCode: '',
    brandId: '',
    brandName: '',
    categoryId: defaultCat?.id ?? '',
    categoryName: defaultCat?.name ?? '',
    model: '',
    colorOrDiopter: '',
    series: '',
    year: String(new Date().getFullYear()),
    name: '',
    refractiveIndex: '',
    isCustomLens: false,
    axis: '',
    coatingType: '',
    contactLensType: '',
    retailPrice: '',
    salesDiscount: '100.00',
    discountedPrice: '',
    costPrice: '',
    wholesalePrice: '',
    barcode: '',
    stockLocation: '',
    unit: defaultCat ? suggestUnitByCategory(defaultCat.name) : '副',
    pinOnSale: false,
    tags: [],
    imageUrl: null,
    supplierId: '',
    supplierName: '',
    minStock: '',
    maxStock: '',
    manufacturer: '',
    productionLicenseNo: '',
    filingCertNo: '',
    originPlace: '',
    licenseExpiresOn: '',
    licenseImageUrl: null,
    storeId: defaultStoreId,
    enabled: true,
  };
}

function compressImageToDataUrl(
  file: File,
  maxWidth: number,
  onSuccess: (dataUrl: string) => void,
  onError: (msg: string) => void
): void {
  if (!file.type.startsWith('image/')) {
    onError('请选择 JPG / PNG / WebP 格式图片。');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    onError('图片大小请控制在 5MB 以内。');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const result = typeof reader.result === 'string' ? reader.result : '';
    if (!result) {
      onError('图片读取失败，请重试。');
      return;
    }
    const img = new Image();
    img.onload = () => {
      const scale = img.width > maxWidth ? maxWidth / img.width : 1;
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        onSuccess(result);
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      onSuccess(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => onError('无法解析该图片文件，请更换其他图片。');
    img.src = result;
  };
  reader.onerror = () => onError('图片读取失败，请重试。');
  reader.readAsDataURL(file);
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  open,
  mode,
  initialProduct,
  copyFromProduct = null,
  meta,
  defaultStoreId,
  canSeeCost,
  canSeeWholesale,
  debugMode,
  onRefreshMeta,
  onClose,
  onSaved,
}) => {
  const sourceRecord = mode === 'edit' ? initialProduct : copyFromProduct;
  const [form, setForm] = useState<ProductFormState>(() =>
    buildInitialFormState(mode, sourceRecord, defaultStoreId, meta)
  );
  const [moreExpanded, setMoreExpanded] = useState(true);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState<'close' | 'continue' | null>(null);
  const [savedToast, setSavedToast] = useState('');

  // Quick add brand modal
  const [quickBrandOpen, setQuickBrandOpen] = useState(false);
  const [quickBrandName, setQuickBrandName] = useState('');
  const [quickBrandKind, setQuickBrandKind] = useState<'代理品牌' | '自营品牌'>('代理品牌');
  const [quickBrandSaving, setQuickBrandSaving] = useState(false);
  const [quickBrandError, setQuickBrandError] = useState('');

  // Tag selector & quick tag setting
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const [tagManagerOpen, setTagManagerOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [tagBusy, setTagBusy] = useState(false);
  const [tagError, setTagError] = useState('');

  // Dictionary setting modal (stock_location / manufacturer)
  const [dictModalType, setDictModalType] = useState<'stock_location' | 'manufacturer' | null>(null);
  const [dictItems, setDictItems] = useState<ProductDictionaryRecord[]>([]);
  const [newDictName, setNewDictName] = useState('');
  const [dictBusy, setDictBusy] = useState(false);
  const [dictError, setDictError] = useState('');

  // Supplier picker modal
  const [supplierPickerOpen, setSupplierPickerOpen] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState('');

  const [refreshingDict, setRefreshingDict] = useState(false);

  const mainImageRef = useRef<HTMLInputElement>(null);
  const licenseImageRef = useRef<HTMLInputElement>(null);
  const tagDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setForm(buildInitialFormState(mode, sourceRecord, defaultStoreId, meta));
    setFormError('');
    setSavedToast('');
    setSubmitting(null);
    setTagDropdownOpen(false);
    setMoreExpanded(true);
  }, [open, mode, initialProduct?.id, copyFromProduct?.id, defaultStoreId]);

  useEffect(() => {
    if (!tagDropdownOpen) return;
    const onDown = (e: MouseEvent) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target as Node)) {
        setTagDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [tagDropdownOpen]);

  // Flatten hierarchical categories with visual indentation
  const categoryOptions = useMemo(() => {
    const cats = meta?.categories ?? [];
    const roots = cats.filter((c) => !c.parent_id).sort((a, b) => a.sort_order - b.sort_order);
    const byParent = new Map<string, typeof cats>();
    for (const c of cats) {
      if (c.parent_id) {
        const list = byParent.get(c.parent_id) ?? [];
        list.push(c);
        byParent.set(c.parent_id, list);
      }
    }
    const result: Array<{ value: string; label: string; rawName: string }> = [];
    const walk = (nodes: typeof cats, depth: number) => {
      for (const n of nodes) {
        const prefix = depth === 0 ? '' : `${'　'.repeat(depth)}└ `;
        result.push({ value: n.id, label: `${prefix}${n.name}`, rawName: n.name });
        const children = (byParent.get(n.id) ?? []).sort((a, b) => a.sort_order - b.sort_order);
        if (children.length > 0) walk(children, depth + 1);
      }
    };
    walk(roots, 0);
    return result;
  }, [meta?.categories]);

  const brandOptions = useMemo(
    () =>
      (meta?.brands ?? []).map((b) => ({
        value: b.name,
        label: b.name,
      })),
    [meta?.brands]
  );

  const selectedBrandSeries = useMemo(() => {
    const found = meta?.brands.find((b) => b.name === form.brandName);
    return found?.series ?? [];
  }, [meta?.brands, form.brandName]);

  const stockLocationOptions = useMemo(
    () =>
      (meta?.dictionaries ?? [])
        .filter((d) => d.dict_type === 'stock_location')
        .map((d) => ({ value: d.name, label: d.name })),
    [meta?.dictionaries]
  );

  const manufacturerOptions = useMemo(
    () =>
      (meta?.dictionaries ?? [])
        .filter((d) => d.dict_type === 'manufacturer')
        .map((d) => ({ value: d.name, label: d.name })),
    [meta?.dictionaries]
  );

  const filteredSuppliers = useMemo(() => {
    const kw = supplierSearch.trim().toLowerCase();
    return (meta?.suppliers ?? []).filter(
      (s) =>
        !kw ||
        s.name.toLowerCase().includes(kw) ||
        s.contact.toLowerCase().includes(kw) ||
        s.phone.toLowerCase().includes(kw)
    );
  }, [meta?.suppliers, supplierSearch]);

  const handleSmartGenerateName = () => {
    const cleanCat = form.categoryName.replace(/.*└\s*/, '');
    const parts = [
      form.brandName.trim(),
      cleanCat,
      form.series.trim(),
      form.model.trim(),
      form.colorOrDiopter.trim(),
      form.refractiveIndex.trim(),
      form.coatingType.trim(),
    ].filter(Boolean);
    if (parts.length === 0) {
      setFormError('请先填写品牌、品类、型号或系列后再点击智能生成。');
      return;
    }
    setFormError('');
    setForm((prev) => ({ ...prev, name: parts.join(' ') }));
  };

  // Bidirectional price/discount calculation
  const handleRetailPriceChange = (val: string) => {
    const retail = Number.parseFloat(val);
    const disc = Number.parseFloat(form.salesDiscount);
    setForm((prev) => ({
      ...prev,
      retailPrice: val,
      discountedPrice:
        Number.isFinite(retail) && Number.isFinite(disc)
          ? formatMoneyStr(retail * (disc / 100))
          : prev.discountedPrice,
    }));
  };

  const handleDiscountChange = (val: string) => {
    const retail = Number.parseFloat(form.retailPrice);
    const disc = Number.parseFloat(val);
    setForm((prev) => ({
      ...prev,
      salesDiscount: val,
      discountedPrice:
        Number.isFinite(retail) && Number.isFinite(disc)
          ? formatMoneyStr(retail * (disc / 100))
          : prev.discountedPrice,
    }));
  };

  const handleDiscountedPriceChange = (val: string) => {
    const retail = Number.parseFloat(form.retailPrice);
    const discPrice = Number.parseFloat(val);
    setForm((prev) => ({
      ...prev,
      discountedPrice: val,
      salesDiscount:
        Number.isFinite(retail) && retail > 0 && Number.isFinite(discPrice)
          ? formatMoneyStr((discPrice / retail) * 100)
          : prev.salesDiscount,
    }));
  };

  const handleRefreshDictionaries = async () => {
    setRefreshingDict(true);
    try {
      await onRefreshMeta();
    } finally {
      setRefreshingDict(false);
    }
  };

  const handleQuickAddBrand = async () => {
    const name = quickBrandName.trim();
    if (!name) {
      setQuickBrandError('请输入品牌名称');
      return;
    }
    setQuickBrandSaving(true);
    setQuickBrandError('');
    try {
      const created = await productsApi.quickAddBrand(name, quickBrandKind, debugMode);
      await onRefreshMeta();
      setForm((prev) => ({ ...prev, brandId: created.id, brandName: created.name }));
      setQuickBrandName('');
      setQuickBrandOpen(false);
    } catch (err) {
      setQuickBrandError(err instanceof Error ? err.message : '新增品牌失败');
    } finally {
      setQuickBrandSaving(false);
    }
  };

  const openDictManager = async (dictType: 'stock_location' | 'manufacturer') => {
    setDictModalType(dictType);
    setDictError('');
    setNewDictName('');
    try {
      const list = await productsApi.listDictionaries(dictType, debugMode);
      setDictItems(list);
    } catch (err) {
      setDictError(err instanceof Error ? err.message : '加载字典失败');
    }
  };

  const handleAddDictItem = async () => {
    if (!dictModalType || !newDictName.trim()) return;
    setDictBusy(true);
    setDictError('');
    try {
      const created = await productsApi.createDictionary(dictModalType, newDictName.trim(), debugMode);
      setDictItems((prev) => [...prev, created]);
      setNewDictName('');
      await onRefreshMeta();
      if (dictModalType === 'stock_location') {
        setForm((prev) => ({ ...prev, stockLocation: created.name }));
      } else {
        setForm((prev) => ({ ...prev, manufacturer: created.name }));
      }
    } catch (err) {
      setDictError(err instanceof Error ? err.message : '新增失败');
    } finally {
      setDictBusy(false);
    }
  };

  const handleDeleteDictItem = async (id: string) => {
    setDictBusy(true);
    setDictError('');
    try {
      await productsApi.deleteDictionary(id, debugMode);
      setDictItems((prev) => prev.filter((d) => d.id !== id));
      await onRefreshMeta();
    } catch (err) {
      setDictError(err instanceof Error ? err.message : '删除失败');
    } finally {
      setDictBusy(false);
    }
  };

  const handleQuickAddTag = async () => {
    const name = newTagName.trim();
    if (!name) return;
    setTagBusy(true);
    setTagError('');
    try {
      const created = await productsApi.createTag({ name, color: 'emerald' }, debugMode);
      setNewTagName('');
      await onRefreshMeta();
      setForm((prev) => ({
        ...prev,
        tags: prev.tags.includes(created.name) ? prev.tags : [...prev.tags, created.name],
      }));
    } catch (err) {
      setTagError(err instanceof Error ? err.message : '新增标签失败');
    } finally {
      setTagBusy(false);
    }
  };

  const handleQuickDeleteTag = async (id: string, name: string) => {
    setTagBusy(true);
    setTagError('');
    try {
      await productsApi.deleteTag(id, debugMode);
      await onRefreshMeta();
      setForm((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== name) }));
    } catch (err) {
      setTagError(err instanceof Error ? err.message : '删除标签失败');
    } finally {
      setTagBusy(false);
    }
  };

  const handleSubmit = async (action: 'close' | 'continue') => {
    if (!form.brandName.trim()) {
      setFormError('请选择商品品牌。');
      return;
    }
    if (!form.categoryId && !form.categoryName) {
      setFormError('请选择商品品类。');
      return;
    }
    if (!form.model.trim()) {
      setFormError('请输入商品型号。');
      return;
    }
    if (!form.name.trim()) {
      setFormError('请输入商品名称或点击“智能生成”。');
      return;
    }

    const retail = Number.parseFloat(form.retailPrice || '0');
    if (!Number.isFinite(retail) || retail < 0) {
      setFormError('请输入有效的零售价金额。');
      return;
    }
    const discount = Number.parseFloat(form.salesDiscount || '100');
    if (!Number.isFinite(discount) || discount < 0 || discount > 1000) {
      setFormError('请输入有效的销售折扣百分比（例如 100.00）。');
      return;
    }

    const storeName =
      STORE_CATALOG.find((s) => s.id === form.storeId)?.name ?? '杭州西湖旗舰店';

    const payload: ProductWritePayload = {
      ...(form.skuCode.trim() ? { skuCode: form.skuCode.trim() } : {}),
      name: form.name.trim(),
      brandId: form.brandId || undefined,
      brandName: form.brandName.trim(),
      categoryId: form.categoryId,
      categoryName: form.categoryName,
      model: form.model.trim(),
      colorOrDiopter: form.colorOrDiopter.trim(),
      series: form.series.trim(),
      year: form.year.trim() ? Number.parseInt(form.year.trim(), 10) || null : null,
      refractiveIndex: form.refractiveIndex.trim(),
      isCustomLens: form.isCustomLens,
      axis: form.axis.trim(),
      coatingType: form.coatingType.trim(),
      contactLensType: form.contactLensType.trim(),
      retailPrice: formatMoneyStr(retail),
      salesDiscount: formatMoneyStr(discount),
      discountedPrice: formatMoneyStr(
        form.discountedPrice.trim() ? Number.parseFloat(form.discountedPrice) : retail * (discount / 100)
      ),
      ...(canSeeCost ? { costPrice: formatMoneyStr(Number.parseFloat(form.costPrice || '0')) } : {}),
      ...(canSeeWholesale
        ? { wholesalePrice: formatMoneyStr(Number.parseFloat(form.wholesalePrice || '0')) }
        : {}),
      barcode: form.barcode.trim(),
      stockLocation: form.stockLocation.trim(),
      unit: form.unit.trim(),
      pinOnSale: form.pinOnSale,
      tags: form.tags,
      imageUrl: form.imageUrl,
      supplierId: form.supplierId || undefined,
      supplierName: form.supplierName.trim(),
      minStock: form.minStock.trim() ? Number.parseInt(form.minStock.trim(), 10) : null,
      maxStock: form.maxStock.trim() ? Number.parseInt(form.maxStock.trim(), 10) : null,
      manufacturer: form.manufacturer.trim(),
      productionLicenseNo: form.productionLicenseNo.trim(),
      filingCertNo: form.filingCertNo.trim(),
      originPlace: form.originPlace.slice(0, 100),
      licenseExpiresOn: form.licenseExpiresOn,
      licenseImageUrl: form.licenseImageUrl,
      storeId: form.storeId,
      storeName,
      enabled: form.enabled,
    };

    setFormError('');
    setSavedToast('');
    setSubmitting(action);
    try {
      const saved =
        mode === 'edit' && initialProduct
          ? await productsApi.updateProduct(initialProduct.id, payload, debugMode)
          : await productsApi.createProduct(payload, debugMode);

      onSaved(saved, action);
      if (action === 'continue') {
        setSavedToast(`已保存「${saved.name}」，可继续录入下一件商品`);
        setForm((prev) => ({
          ...prev,
          skuCode: '',
          model: '',
          colorOrDiopter: '',
          name: '',
          barcode: '',
          imageUrl: null,
        }));
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '保存商品资料失败');
    } finally {
      setSubmitting(null);
    }
  };

  const inputClass =
    'w-full h-10 px-3 rounded-[9px] bg-white border border-[#D9DDD4] text-[14px] text-[#171916] outline-none focus:border-[#171916] transition-colors';
  const labelClass = 'flex items-center gap-1 text-[13px] font-medium text-[#171916] mb-1.5';

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={mode === 'edit' ? `编辑商品资料 · ${initialProduct?.skuCode ?? ''}` : '新增商品资料'}
        maxWidthClass="max-w-5xl"
        footer={
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            <div className="text-[13px] text-[#5F645D]">
              {savedToast ? (
                <span className="inline-flex items-center gap-1.5 text-[#166534] font-medium">
                  <Check className="w-4 h-4" />
                  {savedToast}
                </span>
              ) : (
                <span>带 * 为必填项；零售价与折扣支持双向联动计算</span>
              )}
            </div>
            <div className="flex items-center gap-2.5">
              <Button variant="secondary" onClick={onClose} disabled={Boolean(submitting)}>
                取消
              </Button>
              <Button
                variant="primary"
                loading={submitting === 'close'}
                disabled={Boolean(submitting)}
                onClick={() => void handleSubmit('close')}
              >
                {mode === 'edit' ? '保存修改' : '保存并关闭'}
              </Button>
              {mode === 'create' && (
                <Button
                  variant="accent"
                  loading={submitting === 'continue'}
                  disabled={Boolean(submitting)}
                  onClick={() => void handleSubmit('continue')}
                >
                  保存&amp;新增
                </Button>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-5">
          {formError && (
            <div className="rounded-xl bg-[#FEF2F2] border border-[#FECACA] px-4 py-2.5 text-[14px] text-[#B91C1C]">
              {formError}
            </div>
          )}

          {/* 基本信息分割线 */}
          <div className="flex items-center gap-3">
            <span className="h-[1px] w-6 bg-[var(--qsl-accent-border)]" />
            <span className="text-[14px] font-semibold text-[#171916]">基本信息</span>
            <span className="h-[1px] flex-1 bg-[var(--qsl-accent-border)]" />
          </div>

          {/* Row 1: 品牌 + 品类 + 型号 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>
                <span className="text-[#DC2626]">*</span>
                <span>品牌</span>
              </label>
              <div className="flex items-center gap-1.5">
                <div className="flex-1 min-w-0">
                  <Select
                    ariaLabel="商品品牌"
                    variant="white"
                    value={form.brandName}
                    placeholder="请选择品牌"
                    onChange={(val) => {
                      const found = meta?.brands.find((b) => b.name === val);
                      setForm((prev) => ({
                        ...prev,
                        brandId: found?.id ?? '',
                        brandName: val,
                      }));
                    }}
                    options={
                      form.brandName && !brandOptions.some((b) => b.value === form.brandName)
                        ? [{ value: form.brandName, label: form.brandName }, ...brandOptions]
                        : brandOptions
                    }
                  />
                </div>
                <Button
                  variant="accent"
                  size="sm"
                  className="!h-10 !px-3"
                  onClick={() => {
                    setQuickBrandName('');
                    setQuickBrandError('');
                    setQuickBrandOpen(true);
                  }}
                >
                  新 增
                </Button>
              </div>
            </div>

            <div>
              <label className={labelClass}>
                <span className="text-[#DC2626]">*</span>
                <span>品类</span>
                <HelpTooltip
                  title="品类联动说明"
                  content="选择品类后系统将自动匹配默认计价单位与所属分类统计；若需调整层级可在「商品分类体系」维护。"
                />
              </label>
              <Select
                ariaLabel="商品品类"
                variant="white"
                value={form.categoryId}
                placeholder="请选择品类"
                onChange={(nextId) => {
                  const opt = categoryOptions.find((c) => c.value === nextId);
                  const catName = opt?.rawName ?? '';
                  setForm((prev) => ({
                    ...prev,
                    categoryId: nextId,
                    categoryName: catName,
                    unit: prev.unit ? prev.unit : suggestUnitByCategory(catName),
                  }));
                }}
                options={categoryOptions.map((c) => ({ value: c.value, label: c.label }))}
              />
            </div>

            <div>
              <label className={labelClass}>
                <span className="text-[#DC2626]">*</span>
                <span>型号</span>
              </label>
              <input
                type="text"
                value={form.model}
                onChange={(e) => setForm((prev) => ({ ...prev, model: e.target.value }))}
                placeholder="例如：1064 / ZEISS-MYOCARE"
                className={inputClass}
              />
            </div>
          </div>

          {/* Row 2: 色号/度数 + 系列 + 年份 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>色号/度数</label>
              <input
                type="text"
                value={form.colorOrDiopter}
                onChange={(e) => setForm((prev) => ({ ...prev, colorOrDiopter: e.target.value }))}
                placeholder="如 BK / GM / 0.00 ~ -8.00"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                <span>系列</span>
                <HelpTooltip
                  title="品牌系列"
                  content="可直接输入系列名，或从当前品牌已配置的系列中快速选用。"
                />
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={form.series}
                  onChange={(e) => setForm((prev) => ({ ...prev, series: e.target.value }))}
                  placeholder="输入或右侧选择系列"
                  className={inputClass}
                />
                {selectedBrandSeries.length > 0 && (
                  <div className="w-28 shrink-0">
                    <Select
                      ariaLabel="选用品牌系列"
                      variant="white"
                      value=""
                      placeholder="选用"
                      onChange={(val) => setForm((prev) => ({ ...prev, series: val }))}
                      options={selectedBrandSeries.map((s) => ({ value: s, label: s }))}
                    />
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className={labelClass}>年份</label>
              <input
                type="number"
                min={1990}
                max={2099}
                value={form.year}
                onChange={(e) => setForm((prev) => ({ ...prev, year: e.target.value }))}
                placeholder="例如：2026"
                className={`${inputClass} tabular-nums`}
              />
            </div>
          </div>

          {/* Row 3: 商品名称 + 智能生成 */}
          <div>
            <label className={labelClass}>
              <span className="text-[#DC2626]">*</span>
              <span>商品名称</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="可点击右侧“智能生成”，或手工录入完整商品名称"
                className={`${inputClass} flex-1`}
              />
              <Button
                variant="accent"
                icon={<Sparkles className="w-3.5 h-3.5" />}
                onClick={handleSmartGenerateName}
              >
                智能生成
              </Button>
            </div>
          </div>

          {/* Row 4: 光学参数 */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3 rounded-xl bg-[#F8F9F5] border border-[#E5E8E0]">
            <div>
              <label className={labelClass}>折射率</label>
              <input
                type="text"
                list="qsl-refractive-options"
                value={form.refractiveIndex}
                onChange={(e) => setForm((prev) => ({ ...prev, refractiveIndex: e.target.value }))}
                placeholder="如 1.60 / 1.67"
                className={inputClass}
              />
              <datalist id="qsl-refractive-options">
                {REFRACTIVE_INDEX_OPTIONS.map((idx) => (
                  <option key={idx} value={idx} />
                ))}
              </datalist>
            </div>

            <div>
              <label className={labelClass}>是否定制镜片</label>
              <Select
                ariaLabel="是否定制镜片"
                variant="white"
                value={form.isCustomLens ? 'true' : 'false'}
                onChange={(val) => setForm((prev) => ({ ...prev, isCustomLens: val === 'true' }))}
                options={[
                  { value: 'false', label: '否（现片/标品）' },
                  { value: 'true', label: '是（定制车房片）' },
                ]}
              />
            </div>

            <div>
              <label className={labelClass}>轴位</label>
              <input
                type="text"
                value={form.axis}
                onChange={(e) => setForm((prev) => ({ ...prev, axis: e.target.value }))}
                placeholder="如 0-180"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>加膜类型</label>
              <input
                type="text"
                value={form.coatingType}
                onChange={(e) => setForm((prev) => ({ ...prev, coatingType: e.target.value }))}
                placeholder="如 钻立方爱动膜"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>隐形眼镜类型</label>
              <input
                type="text"
                value={form.contactLensType}
                onChange={(e) => setForm((prev) => ({ ...prev, contactLensType: e.target.value }))}
                placeholder="如 日抛 / 月抛"
                className={inputClass}
              />
            </div>
          </div>

          {/* Row 5: 价格体系 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div>
              <label className={labelClass}>零售价</label>
              <div className="flex items-center">
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.retailPrice}
                  onChange={(e) => handleRetailPriceChange(e.target.value)}
                  placeholder="0.00"
                  className="w-full h-10 px-3 rounded-l-[9px] bg-white border border-r-0 border-[#D9DDD4] text-[14px] tabular-nums outline-none focus:border-[#171916]"
                />
                <span className="h-10 px-2.5 inline-flex items-center bg-[#F8F9F5] border border-[#D9DDD4] rounded-r-[9px] text-[13px] text-[#5F645D]">
                  元
                </span>
              </div>
            </div>

            <div>
              <label className={labelClass}>
                <span>销售折扣</span>
                <HelpTooltip content="100.00 表示全价（10折），85.00 表示八五折。修改折扣将自动重算折后价。" />
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  max={1000}
                  value={form.salesDiscount}
                  onChange={(e) => handleDiscountChange(e.target.value)}
                  placeholder="100.00"
                  className="w-full h-10 px-3 rounded-l-[9px] bg-white border border-r-0 border-[#D9DDD4] text-[14px] tabular-nums outline-none focus:border-[#171916]"
                />
                <span className="h-10 px-2.5 inline-flex items-center bg-[#F8F9F5] border border-[#D9DDD4] rounded-r-[9px] text-[13px] text-[#5F645D]">
                  %
                </span>
              </div>
            </div>

            <div>
              <label className={labelClass}>
                <span>零售价折后</span>
                <HelpTooltip content="直接修改折后价将自动反算销售折扣百分比。" />
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.discountedPrice}
                  onChange={(e) => handleDiscountedPriceChange(e.target.value)}
                  placeholder="0.00"
                  className="w-full h-10 px-3 rounded-l-[9px] bg-white border border-r-0 border-[#D9DDD4] text-[14px] tabular-nums outline-none focus:border-[#171916]"
                />
                <span className="h-10 px-2.5 inline-flex items-center bg-[#F8F9F5] border border-[#D9DDD4] rounded-r-[9px] text-[13px] text-[#5F645D]">
                  元
                </span>
              </div>
            </div>

            {canSeeCost && (
              <div>
                <label className={labelClass}>进货价</label>
                <div className="flex items-center">
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={form.costPrice}
                    onChange={(e) => setForm((prev) => ({ ...prev, costPrice: e.target.value }))}
                    placeholder="0.00"
                    className="w-full h-10 px-3 rounded-l-[9px] bg-white border border-r-0 border-[#D9DDD4] text-[14px] tabular-nums outline-none focus:border-[#171916]"
                  />
                  <span className="h-10 px-2.5 inline-flex items-center bg-[#F8F9F5] border border-[#D9DDD4] rounded-r-[9px] text-[13px] text-[#5F645D]">
                    元
                  </span>
                </div>
              </div>
            )}

            {canSeeWholesale && (
              <div>
                <label className={labelClass}>通用批发价</label>
                <div className="flex items-center">
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={form.wholesalePrice}
                    onChange={(e) => setForm((prev) => ({ ...prev, wholesalePrice: e.target.value }))}
                    placeholder="0.00"
                    className="w-full h-10 px-3 rounded-l-[9px] bg-white border border-r-0 border-[#D9DDD4] text-[14px] tabular-nums outline-none focus:border-[#171916]"
                  />
                  <span className="h-10 px-2.5 inline-flex items-center bg-[#F8F9F5] border border-[#D9DDD4] rounded-r-[9px] text-[13px] text-[#5F645D]">
                    元
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Row 6: 条码 + 库存摆放位置 + 单位 + 销售开单置顶 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className={labelClass}>
                <span>商品条码</span>
                <HelpTooltip content="支持扫描枪录入69码/厂商条码；留空将由系统按SKU自动标识。" />
              </label>
              <input
                type="text"
                value={form.barcode}
                onChange={(e) => setForm((prev) => ({ ...prev, barcode: e.target.value }))}
                placeholder="扫码或输入条码"
                className={`${inputClass} font-mono`}
              />
            </div>

            <div>
              <label className={labelClass}>库存摆放位置</label>
              <div className="flex items-center gap-1.5">
                <div className="flex-1 min-w-0">
                  <Select
                    ariaLabel="库存摆放位置"
                    variant="white"
                    value={form.stockLocation}
                    placeholder="请选择"
                    onChange={(val) => setForm((prev) => ({ ...prev, stockLocation: val }))}
                    options={
                      form.stockLocation && !stockLocationOptions.some((o) => o.value === form.stockLocation)
                        ? [{ value: form.stockLocation, label: form.stockLocation }, ...stockLocationOptions]
                        : stockLocationOptions
                    }
                  />
                </div>
                <Button
                  variant="accent"
                  size="sm"
                  className="!h-10 !px-2.5"
                  onClick={() => void openDictManager('stock_location')}
                >
                  设置
                </Button>
                <button
                  type="button"
                  onClick={() => void handleRefreshDictionaries()}
                  title="刷新摆放位置列表"
                  className="h-10 w-9 inline-flex items-center justify-center rounded-[9px] border border-[#D9DDD4] bg-white text-[#5F645D] hover:text-[#171916] cursor-pointer shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshingDict ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            <div>
              <label className={labelClass}>单位</label>
              <input
                type="text"
                list="qsl-unit-options"
                value={form.unit}
                onChange={(e) => setForm((prev) => ({ ...prev, unit: e.target.value }))}
                placeholder="副 / 片 / 盒 / 瓶"
                className={inputClass}
              />
              <datalist id="qsl-unit-options">
                {UNIT_OPTIONS.map((u) => (
                  <option key={u} value={u} />
                ))}
              </datalist>
            </div>

            <div>
              <label className={labelClass}>
                <span>销售开单置顶</span>
                <HelpTooltip content="设为“是”后，该商品将在收银开单与商品总览默认列表中优先置顶显示。" />
              </label>
              <div className="h-10 flex items-center gap-5 px-2">
                <label className="inline-flex items-center gap-1.5 text-[14px] text-[#171916] cursor-pointer">
                  <input
                    type="radio"
                    name="pinOnSale"
                    checked={form.pinOnSale === true}
                    onChange={() => setForm((prev) => ({ ...prev, pinOnSale: true }))}
                    className="accent-[var(--qsl-brand-dark)] cursor-pointer"
                  />
                  <span>是</span>
                </label>
                <label className="inline-flex items-center gap-1.5 text-[14px] text-[#171916] cursor-pointer">
                  <input
                    type="radio"
                    name="pinOnSale"
                    checked={form.pinOnSale === false}
                    onChange={() => setForm((prev) => ({ ...prev, pinOnSale: false }))}
                    className="accent-[var(--qsl-brand-dark)] cursor-pointer"
                  />
                  <span>否</span>
                </label>
              </div>
            </div>
          </div>

          {/* Row 7: 标签 + 商品主图 + 供应商 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            <div className="lg:col-span-6">
              <label className={labelClass}>标签</label>
              <div className="flex items-start gap-1.5">
                <div ref={tagDropdownRef} className="relative flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => setTagDropdownOpen((p) => !p)}
                    className="w-full min-h-10 px-3 py-1.5 rounded-[9px] bg-white border border-[#D9DDD4] flex items-center justify-between gap-2 text-left cursor-pointer hover:border-[#B8BEB2]"
                  >
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0 flex-1">
                      {form.tags.length === 0 ? (
                        <span className="text-[14px] text-[#73796F]">请选择</span>
                      ) : (
                        form.tags.map((t) => (
                          <span
                            key={t}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--qsl-accent-soft)] text-[12px] font-medium text-[#171916]"
                          >
                            {t}
                            <span
                              role="button"
                              tabIndex={-1}
                              onClick={(e) => {
                                e.stopPropagation();
                                setForm((prev) => ({
                                  ...prev,
                                  tags: prev.tags.filter((x) => x !== t),
                                }));
                              }}
                              className="hover:text-[#DC2626] cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </span>
                          </span>
                        ))
                      )}
                    </div>
                    <ChevronDown className="w-4 h-4 text-[#5F645D] shrink-0" />
                  </button>

                  {tagDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-40 rounded-xl bg-white border border-[#D9DDD4] shadow-lg p-1.5 max-h-56 overflow-y-auto qsl-scroll">
                      {(meta?.tags ?? []).length === 0 ? (
                        <div className="px-3 py-2 text-[13px] text-[#73796F]">暂无标签，请点击右侧设置添加</div>
                      ) : (
                        (meta?.tags ?? []).map((t) => {
                          const checked = form.tags.includes(t.name);
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() =>
                                setForm((prev) => ({
                                  ...prev,
                                  tags: checked
                                    ? prev.tags.filter((x) => x !== t.name)
                                    : [...prev.tags, t.name],
                                }))
                              }
                              className={`w-full px-3 py-2 rounded-lg flex items-center justify-between text-[14px] text-left cursor-pointer ${
                                checked ? 'bg-[var(--qsl-accent-soft)] font-medium' : 'hover:bg-[#F8F9F5]'
                              }`}
                            >
                              <span>{t.name}</span>
                              {checked && <Check className="w-4 h-4 text-[#171916]" />}
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                <Button
                  variant="accent"
                  size="sm"
                  className="!h-10 !px-2.5"
                  onClick={() => {
                    setTagError('');
                    setTagManagerOpen(true);
                  }}
                >
                  设置
                </Button>
                <button
                  type="button"
                  onClick={() => void handleRefreshDictionaries()}
                  title="刷新选品标签"
                  className="h-10 w-9 inline-flex items-center justify-center rounded-[9px] border border-[#D9DDD4] bg-white text-[#5F645D] hover:text-[#171916] cursor-pointer shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshingDict ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            <div className="lg:col-span-2">
              <label className={labelClass}>商品主图</label>
              <input
                ref={mainImageRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (!file) return;
                  compressImageToDataUrl(
                    file,
                    480,
                    (url) => setForm((prev) => ({ ...prev, imageUrl: url })),
                    (msg) => setFormError(msg)
                  );
                }}
              />
              {form.imageUrl ? (
                <div className="relative w-24 h-20 rounded-xl border border-[#D9DDD4] overflow-hidden group bg-[#F8F9F5]">
                  <img src={form.imageUrl} alt="商品主图" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, imageUrl: null }))}
                    aria-label="移除商品主图"
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white inline-flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => mainImageRef.current?.click()}
                  className="w-28 h-20 rounded-xl border border-dashed border-[#C8CEC0] bg-[#F8F9F5] hover:border-[#171916] flex flex-col items-center justify-center gap-1 text-[12px] text-[#5F645D] cursor-pointer transition-colors"
                >
                  <ImagePlus className="w-5 h-5 text-[var(--qsl-brand-dark)]" />
                  <span>上传图片</span>
                </button>
              )}
            </div>

            <div className="lg:col-span-4">
              <label className={labelClass}>
                <span>供应商</span>
                <HelpTooltip content="关联商品默认采购供应商，便于采购补货与供应链数据隔离。" />
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={form.supplierName}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, supplierName: e.target.value, supplierId: '' }))
                  }
                  placeholder="点击选择或填写供应商"
                  className={inputClass}
                />
                <Button
                  variant="accent"
                  size="sm"
                  className="!h-10 !px-3"
                  onClick={() => {
                    setSupplierSearch('');
                    setSupplierPickerOpen(true);
                  }}
                >
                  选择
                </Button>
              </div>
            </div>
          </div>

          {/* 更多信息折叠栏 */}
          <div className="border border-[#E5E8E0] rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setMoreExpanded((p) => !p)}
              className="w-full px-4 py-2.5 bg-[var(--qsl-brand-dark)] text-white flex items-center gap-2 text-[14px] font-medium cursor-pointer"
            >
              {moreExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <span>更多信息</span>
            </button>

            {moreExpanded && (
              <div className="p-4 space-y-4 bg-white">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className={labelClass}>
                      <span>最低库存</span>
                      <HelpTooltip content="低于该数量时库存预警模块将触发低库存补货提醒。" />
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={form.minStock}
                      onChange={(e) => setForm((prev) => ({ ...prev, minStock: e.target.value }))}
                      placeholder="例如：2"
                      className={`${inputClass} tabular-nums`}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      <span>最高库存</span>
                      <HelpTooltip content="高于该数量时将提示库存积压预警。" />
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={form.maxStock}
                      onChange={(e) => setForm((prev) => ({ ...prev, maxStock: e.target.value }))}
                      placeholder="例如：50"
                      className={`${inputClass} tabular-nums`}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>归属门店</label>
                    <Select
                      ariaLabel="归属门店"
                      variant="white"
                      value={form.storeId}
                      onChange={(val) => setForm((prev) => ({ ...prev, storeId: val }))}
                      options={STORE_CATALOG.map((s) => ({ value: s.id, label: s.name }))}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>启用状态</label>
                    <Select
                      ariaLabel="启用状态"
                      variant="white"
                      value={form.enabled ? 'true' : 'false'}
                      onChange={(val) => setForm((prev) => ({ ...prev, enabled: val === 'true' }))}
                      options={[
                        { value: 'true', label: '启用' },
                        { value: 'false', label: '停用' },
                      ]}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>生产企业</label>
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 min-w-0">
                        <Select
                          ariaLabel="生产企业"
                          variant="white"
                          value={form.manufacturer}
                          placeholder="请选择生产企业"
                          onChange={(val) => setForm((prev) => ({ ...prev, manufacturer: val }))}
                          options={
                            form.manufacturer && !manufacturerOptions.some((o) => o.value === form.manufacturer)
                              ? [{ value: form.manufacturer, label: form.manufacturer }, ...manufacturerOptions]
                              : manufacturerOptions
                          }
                        />
                      </div>
                      <Button
                        variant="accent"
                        size="sm"
                        className="!h-10 !px-2.5"
                        onClick={() => void openDictManager('manufacturer')}
                      >
                        设置
                      </Button>
                      <button
                        type="button"
                        onClick={() => void handleRefreshDictionaries()}
                        title="刷新生产企业"
                        className="h-10 w-9 inline-flex items-center justify-center rounded-[9px] border border-[#D9DDD4] bg-white text-[#5F645D] hover:text-[#171916] cursor-pointer shrink-0"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${refreshingDict ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>生产许可证号</label>
                    <input
                      type="text"
                      value={form.productionLicenseNo}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, productionLicenseNo: e.target.value }))
                      }
                      placeholder="填写医疗器械生产许可证号"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>备案凭证号</label>
                    <input
                      type="text"
                      value={form.filingCertNo}
                      onChange={(e) => setForm((prev) => ({ ...prev, filingCertNo: e.target.value }))}
                      placeholder="填写产品注册/备案凭证号"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                  <div>
                    <label className={labelClass}>商品产地</label>
                    <textarea
                      rows={3}
                      maxLength={100}
                      value={form.originPlace}
                      onChange={(e) => setForm((prev) => ({ ...prev, originPlace: e.target.value }))}
                      placeholder="填写商品产地说明"
                      className="w-full p-2.5 rounded-[9px] bg-white border border-[#D9DDD4] text-[14px] text-[#171916] outline-none focus:border-[#171916] resize-none"
                    />
                    <div className="text-right text-[12px] text-[#73796F] tabular-nums">
                      {form.originPlace.length} / 100
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>生产许可证过期时间</label>
                    <input
                      type="date"
                      value={form.licenseExpiresOn}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, licenseExpiresOn: e.target.value }))
                      }
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>生产许可证</label>
                    <input
                      ref={licenseImageRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (!file) return;
                        compressImageToDataUrl(
                          file,
                          640,
                          (url) => setForm((prev) => ({ ...prev, licenseImageUrl: url })),
                          (msg) => setFormError(msg)
                        );
                      }}
                    />
                    {form.licenseImageUrl ? (
                      <div className="relative w-28 h-24 rounded-xl border border-[#D9DDD4] overflow-hidden group bg-[#F8F9F5]">
                        <img
                          src={form.licenseImageUrl}
                          alt="生产许可证图片"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, licenseImageUrl: null }))}
                          aria-label="移除生产许可证图片"
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white inline-flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => licenseImageRef.current?.click()}
                        className="w-28 h-24 rounded-xl border border-dashed border-[#C8CEC0] bg-[#F8F9F5] hover:border-[#171916] flex flex-col items-center justify-center gap-1 text-[12px] text-[#5F645D] cursor-pointer transition-colors"
                      >
                        <ImagePlus className="w-5 h-5 text-[var(--qsl-brand-dark)]" />
                        <span>上传图片</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Quick Brand Modal */}
      <Modal
        open={quickBrandOpen}
        onClose={() => setQuickBrandOpen(false)}
        title="快速新增品牌"
        maxWidthClass="max-w-md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setQuickBrandOpen(false)}>
              取消
            </Button>
            <Button variant="primary" loading={quickBrandSaving} onClick={() => void handleQuickAddBrand()}>
              确认新增并选中
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {quickBrandError && (
            <div className="rounded-xl bg-[#FEF2F2] border border-[#FECACA] px-3 py-2 text-[13px] text-[#B91C1C]">
              {quickBrandError}
            </div>
          )}
          <div>
            <label className={labelClass}>
              <span className="text-[#DC2626]">*</span>
              <span>品牌名称</span>
            </label>
            <input
              type="text"
              value={quickBrandName}
              onChange={(e) => setQuickBrandName(e.target.value)}
              placeholder="例如：明月镜片 / 万新"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>品牌类型</label>
            <Select
              ariaLabel="品牌类型"
              variant="white"
              value={quickBrandKind}
              onChange={(val) => setQuickBrandKind(val as '代理品牌' | '自营品牌')}
              options={[
                { value: '代理品牌', label: '代理品牌' },
                { value: '自营品牌', label: '自营品牌' },
              ]}
            />
          </div>
        </div>
      </Modal>

      {/* Dictionary Setting Modal */}
      <Modal
        open={Boolean(dictModalType)}
        onClose={() => setDictModalType(null)}
        title={dictModalType === 'stock_location' ? '维护库存摆放位置' : '维护生产企业字典'}
        maxWidthClass="max-w-lg"
        footer={
          <Button variant="secondary" onClick={() => setDictModalType(null)}>
            完成
          </Button>
        }
      >
        <div className="space-y-4">
          {dictError && (
            <div className="rounded-xl bg-[#FEF2F2] border border-[#FECACA] px-3 py-2 text-[13px] text-[#B91C1C]">
              {dictError}
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newDictName}
              onChange={(e) => setNewDictName(e.target.value)}
              placeholder={dictModalType === 'stock_location' ? '输入新摆放货位名称' : '输入新生产企业名称'}
              className={`${inputClass} flex-1`}
            />
            <Button variant="accent" loading={dictBusy} onClick={() => void handleAddDictItem()}>
              添加
            </Button>
          </div>
          <div className="max-h-64 overflow-y-auto divide-y divide-[#E5E8E0] border border-[#E5E8E0] rounded-xl">
            {dictItems.length === 0 ? (
              <div className="p-4 text-center text-[13px] text-[#73796F]">暂无选项</div>
            ) : (
              dictItems.map((d) => (
                <div key={d.id} className="px-3 py-2 flex items-center justify-between text-[14px]">
                  <span className="text-[#171916]">{d.name}</span>
                  <button
                    type="button"
                    disabled={dictBusy}
                    onClick={() => void handleDeleteDictItem(d.id)}
                    className="text-[#DC2626] hover:bg-[#FEF2F2] p-1.5 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* Quick Tag Setting Modal */}
      <Modal
        open={tagManagerOpen}
        onClose={() => setTagManagerOpen(false)}
        title="快速维护选品标签"
        maxWidthClass="max-w-lg"
        footer={
          <Button variant="secondary" onClick={() => setTagManagerOpen(false)}>
            关闭
          </Button>
        }
      >
        <div className="space-y-4">
          {tagError && (
            <div className="rounded-xl bg-[#FEF2F2] border border-[#FECACA] px-3 py-2 text-[13px] text-[#B91C1C]">
              {tagError}
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="输入新选品标签名，如：变色镜片"
              className={`${inputClass} flex-1`}
            />
            <Button variant="accent" loading={tagBusy} onClick={() => void handleQuickAddTag()}>
              新增标签
            </Button>
          </div>
          <div className="max-h-64 overflow-y-auto divide-y divide-[#E5E8E0] border border-[#E5E8E0] rounded-xl">
            {(meta?.tags ?? []).map((t) => (
              <div key={t.id} className="px-3 py-2 flex items-center justify-between text-[14px]">
                <div className="flex items-center gap-2">
                  <Settings className="w-3.5 h-3.5 text-[#73796F]" />
                  <span>{t.name}</span>
                </div>
                <button
                  type="button"
                  disabled={tagBusy}
                  onClick={() => void handleQuickDeleteTag(t.id, t.name)}
                  className="text-[#DC2626] hover:bg-[#FEF2F2] p-1.5 rounded-lg cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Supplier Picker Modal */}
      <Modal
        open={supplierPickerOpen}
        onClose={() => setSupplierPickerOpen(false)}
        title="选择供应商"
        maxWidthClass="max-w-xl"
        footer={
          <Button variant="secondary" onClick={() => setSupplierPickerOpen(false)}>
            取消
          </Button>
        }
      >
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#73796F] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={supplierSearch}
              onChange={(e) => setSupplierSearch(e.target.value)}
              placeholder="搜索供应商名称、联系人或手机号"
              className={`${inputClass} pl-9`}
            />
          </div>
          <div className="max-h-72 overflow-y-auto border border-[#E5E8E0] rounded-xl divide-y divide-[#E5E8E0]">
            {filteredSuppliers.length === 0 ? (
              <div className="p-6 text-center text-[14px] text-[#73796F]">未找到匹配的供应商</div>
            ) : (
              filteredSuppliers.map((sup) => (
                <button
                  key={sup.id}
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({
                      ...prev,
                      supplierId: sup.id,
                      supplierName: sup.name,
                    }));
                    setSupplierPickerOpen(false);
                  }}
                  className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-[#F8F9F5] cursor-pointer"
                >
                  <div>
                    <div className="text-[14px] font-medium text-[#171916]">{sup.name}</div>
                    <div className="text-[12px] text-[#73796F] mt-0.5">
                      联系人：{sup.contact || '-'} · 电话：{sup.phone || '-'}
                    </div>
                  </div>
                  {form.supplierId === sup.id && <Check className="w-4 h-4 text-[var(--qsl-brand-dark)]" />}
                </button>
              ))
            )}
          </div>
        </div>
      </Modal>
    </>
  );
};
