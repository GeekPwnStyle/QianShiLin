import type { DataScopeContext, PaginatedQuery, PaginatedResult } from '@/src/shared/types/common';
import type {
  ProductCategoryId,
  ProductImportHistoryRecord,
  ProductImportRowPreview,
  ProductItem,
} from '../domain/product';

export interface ProductQueryFilters extends Record<string, unknown> {
  keyword?: string;
  categoryId?: ProductCategoryId;
  brand?: string;
  enabled?: 'all' | 'true' | 'false';
  isCustomLens?: 'all' | 'true' | 'false';
  storeId?: string;
  simulateError?: boolean;
}

export interface ProductRepository {
  queryProducts(
    query: PaginatedQuery<ProductQueryFilters>,
    scope: DataScopeContext
  ): Promise<PaginatedResult<ProductItem>>;

  createProduct(
    input: Omit<ProductItem, 'id' | 'createdAt' | 'discountedPrice'>,
    scope: DataScopeContext
  ): Promise<ProductItem>;

  updateProduct(
    id: string,
    patch: Partial<ProductItem>,
    scope: DataScopeContext
  ): Promise<ProductItem>;

  deleteProducts(ids: string[], scope: DataScopeContext): Promise<{ deletedCount: number }>;

  batchUpdateProducts(
    ids: string[],
    patch: { enabled?: boolean; salesDiscount?: number; tags?: string[] },
    scope: DataScopeContext
  ): Promise<{ updatedCount: number }>;

  validateImportRows(
    rows: Array<{ brand: string; categoryName: string; name: string; model: string; retailPrice: string }>
  ): Promise<ProductImportRowPreview[]>;

  commitImportRows(
    fileName: string,
    validRows: ProductImportRowPreview[],
    failedCount: number,
    operator: string,
    scope: DataScopeContext
  ): Promise<ProductImportHistoryRecord>;

  getImportHistory(): Promise<ProductImportHistoryRecord[]>;
}
