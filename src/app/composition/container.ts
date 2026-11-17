import type { ProductRepository } from '@/src/modules/basic/products/ports/productRepository';
import type { FollowupNotificationRepository } from '@/src/modules/members/followup/notifications/ports/notificationRepository';
import type { MemberRepository } from '@/src/modules/members/member-profile/ports/memberRepository';
import type { SalesOrderRepository } from '@/src/modules/sales/pos/ports/salesOrderRepository';
import type { RoleRepository } from '@/src/modules/system/roles/ports/roleRepository';
import type { WorkbenchRepository } from '@/src/modules/workbench/ports/workbenchRepository';
import {
  MockMemberRepository,
  MockNotificationRepository,
  MockProductRepository,
  MockSalesOrderRepository,
  MockWorkbenchRepository,
} from '@/src/infrastructure/mock/mockRepositories';
import { versionedStorage } from '@/src/infrastructure/storage/versionedStorage';
import { ApiRoleRepository } from '@/src/modules/system/roles/infrastructure/ApiRoleRepository';

export interface AppRepositories {
  products: ProductRepository;
  salesOrders: SalesOrderRepository;
  members: MemberRepository;
  notifications: FollowupNotificationRepository;
  roles: RoleRepository;
  workbench: WorkbenchRepository;
  resetDemoData: () => void;
}

export const appRepositories: AppRepositories = {
  products: new MockProductRepository(),
  salesOrders: new MockSalesOrderRepository(),
  members: new MockMemberRepository(),
  notifications: new MockNotificationRepository(),
  roles: new ApiRoleRepository(),
  workbench: new MockWorkbenchRepository(),
  resetDemoData: () => versionedStorage.resetAll(),
};
