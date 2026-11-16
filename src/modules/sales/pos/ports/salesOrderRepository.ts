import type { DataScopeContext, PaginatedQuery, PaginatedResult } from '@/src/shared/types/common';
import type { SalesOrderDraft } from '../domain/salesOrder';

export interface SalesOrderFilters extends Record<string, unknown> {
  keyword?: string;
  status?: 'all' | 'draft' | 'pending_pickup' | 'completed_demo';
  storeId?: string;
}

export interface SalesOrderRepository {
  queryOrders(
    query: PaginatedQuery<SalesOrderFilters>,
    scope: DataScopeContext
  ): Promise<PaginatedResult<SalesOrderDraft>>;

  saveDraftOrder(
    draft: Omit<SalesOrderDraft, 'id' | 'orderNo' | 'createdAt'>,
    scope: DataScopeContext
  ): Promise<SalesOrderDraft>;
}
