import type { DataScopeContext, PaginatedQuery, PaginatedResult } from '@/src/shared/types/common';
import type {
  BatchNotifyResult,
  FollowupNotificationItem,
  NotificationCategory,
  NotificationChannel,
  NotificationStatus,
} from '../domain/notification';

export interface NotificationQueryFilters extends Record<string, unknown> {
  category: NotificationCategory;
  storeId?: string;
  keyword?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: NotificationStatus | 'all';
  channel?: NotificationChannel | 'all';
  ownerName?: string;
  simulateError?: boolean;
}

export interface FollowupNotificationRepository {
  queryNotifications(
    query: PaginatedQuery<NotificationQueryFilters>,
    scope: DataScopeContext
  ): Promise<PaginatedResult<FollowupNotificationItem>>;

  sendBatchNotifications(
    ids: string[],
    channel: NotificationChannel,
    templateName: string,
    operator: string,
    scope: DataScopeContext
  ): Promise<BatchNotifyResult>;

  markReviewCompleted(
    id: string,
    operator: string,
    scope: DataScopeContext
  ): Promise<FollowupNotificationItem>;
}
