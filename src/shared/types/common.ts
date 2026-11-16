export type DecimalMoneyString = string;

export interface PaginatedQuery<TFilters extends Record<string, unknown> = Record<string, unknown>> {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: TFilters;
}

export interface PaginatedResult<TItem> {
  items: TItem[];
  total: number;
  page: number;
  pageSize: number;
}

export type AsyncViewState =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'empty_initial'
  | 'empty_filtered'
  | 'error'
  | 'no_permission'
  | 'readonly';

export type SemanticTone = 'success' | 'warning' | 'error' | 'processing' | 'neutral' | 'accent';

export interface DataScopeContext {
  identityType: 'admin' | 'store' | 'supplier';
  roleId: string;
  storeId: string;
  storeName: string;
  supplierId?: string;
  supplierName?: string;
  authorizedStoreIds: string[];
}

export interface ApiEnvelope<T> {
  code: string;
  message: string;
  data: T;
  requestId: string;
  timestamp: string;
}
