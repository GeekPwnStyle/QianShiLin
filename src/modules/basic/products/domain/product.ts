import type { DecimalMoneyString } from '@/src/shared/types/common';

export type ProductCategoryId =
  | 'cat_all'
  | 'cat_frame'
  | 'cat_frame_titan'
  | 'cat_frame_acetate'
  | 'cat_lens'
  | 'cat_lens_single'
  | 'cat_lens_control'
  | 'cat_contact'
  | 'cat_sunglass'
  | 'cat_care';

export interface ProductCategoryNode {
  id: ProductCategoryId;
  name: string;
  parentId: ProductCategoryId | null;
  children?: ProductCategoryNode[];
}

export interface ProductItem {
  id: string;
  skuCode: string;
  name: string;
  brand: string;
  categoryId: ProductCategoryId;
  categoryName: string;
  model: string;
  colorOrDiopter: string;
  series: string;
  refractiveIndex: string;
  isCustomLens: boolean;
  axis: string;
  coatingType: string;
  year: number;
  contactLensType: string;
  retailPrice: DecimalMoneyString;
  salesDiscount: number; // e.g. 0.88 means 8.8折
  discountedPrice: DecimalMoneyString;
  wholesalePrice: DecimalMoneyString;
  costPrice: DecimalMoneyString;
  stockLocation: string;
  pointsPerAmount: number;
  storeId: string;
  storeName: string;
  enabled: boolean;
  supplierId: string;
  supplierName: string;
  tags: string[];
  productMark: string;
  createdAt: string;
  bindSource: string;
}

export interface ProductImportRowPreview {
  rowNumber: number;
  brand: string;
  categoryName: string;
  name: string;
  model: string;
  retailPrice: string;
  valid: boolean;
  errors: string[];
}

export interface ProductImportHistoryRecord {
  id: string;
  source: 'excel_v2' | 'lens_catalog' | 'trade_sync';
  fileName: string;
  totalRows: number;
  successRows: number;
  failedRows: number;
  operator: string;
  createdAt: string;
  statusNote: string;
}

export const PRODUCT_CATEGORY_TREE: ProductCategoryNode[] = [
  {
    id: 'cat_all',
    name: '全部商品品类',
    parentId: null,
    children: [
      {
        id: 'cat_frame',
        name: '光学镜架',
        parentId: 'cat_all',
        children: [
          { id: 'cat_frame_titan', name: '纯钛/β钛架', parentId: 'cat_frame' },
          { id: 'cat_frame_acetate', name: '板材/TR架', parentId: 'cat_frame' },
        ],
      },
      {
        id: 'cat_lens',
        name: '光学镜片',
        parentId: 'cat_all',
        children: [
          { id: 'cat_lens_single', name: '单光/防蓝光片', parentId: 'cat_lens' },
          { id: 'cat_lens_control', name: '青少年离焦/渐进片', parentId: 'cat_lens' },
        ],
      },
      { id: 'cat_contact', name: '隐形眼镜', parentId: 'cat_all' },
      { id: 'cat_sunglass', name: '太阳镜', parentId: 'cat_all' },
      { id: 'cat_care', name: '护理液及配件', parentId: 'cat_all' },
    ],
  },
];

export function computeDiscountedPrice(
  retailPrice: DecimalMoneyString,
  discount: number
): DecimalMoneyString {
  const num = Number.parseFloat(retailPrice);
  if (Number.isNaN(num)) return '0.00';
  const clamped = Math.min(1, Math.max(0.1, discount));
  return (Math.round(num * clamped * 100) / 100).toFixed(2);
}
