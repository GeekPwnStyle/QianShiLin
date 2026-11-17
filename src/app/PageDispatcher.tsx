import React from 'react';
import { useNavigation } from '@/src/modules/navigation/application/NavigationContext';
import { ProductListPage } from '@/src/modules/basic/products/ui/ProductListPage';
import { BrandPage } from '@/src/modules/basic/brands/ui/BrandPage';
import { SupplierPage } from '@/src/modules/basic/suppliers/ui/SupplierPage';
import { WarehousePage } from '@/src/modules/system/warehouses/ui/WarehousePage';
import { PurchaseOrdersPage } from '@/src/modules/purchase/orders/ui/PurchaseOrdersPage';
import { ManualInboundPage } from '@/src/modules/purchase/manual-inbound/ui/ManualInboundPage';
import { ContactLensCompliancePage } from '@/src/modules/contact-lenses/ui/ContactLensCompliancePage';
import { FinanceLedgerPage } from '@/src/modules/finance/ui/FinanceLedgerPage';
import { InventoryQueryPage } from '@/src/modules/inventory/ui/InventoryQueryPage';
import { FollowupNotificationPage } from '@/src/modules/members/followup/notifications/ui/FollowupNotificationPage';
import type { NotificationCategory } from '@/src/modules/members/followup/notifications/domain/notification';
import { MemberProfilePage } from '@/src/modules/members/member-profile/ui/MemberProfilePage';
import { ProcessingOrderPage } from '@/src/modules/processing/ui/ProcessingOrderPage';
import { AnalyticsDashboardPage } from '@/src/modules/reports/ui/AnalyticsDashboardPage';
import { SalesPosPage } from '@/src/modules/sales/pos/ui/SalesPosPage';
import {
  BrandPortalView,
  DocumentListView,
  HelpDocsPage,
  MasterDataView,
  UnconfirmedPageShell,
  VisionScreeningView,
} from '@/src/modules/shared-business-views/ui/DomainSpecializedViews';
import { SystemParametersPage } from '@/src/modules/system/parameters/ui/SystemParametersPage';
import { RolePermissionsPage } from '@/src/modules/system/roles/ui/RolePermissionsPage';
import { UserAssignmentsPage } from '@/src/modules/system/user-assignments/ui/UserAssignmentsPage';
import { OperationLogsPage } from '@/src/modules/system/audit/ui/OperationLogsPage';
import { NoticeAdminPage } from '@/src/modules/system/notices/ui/NoticeAdminPage';
import { StoreProfilePage } from '@/src/modules/system/stores/ui/StoreProfilePage';
import { VisionRecordPage } from '@/src/modules/vision-records/ui/VisionRecordPage';
import { WorkbenchPage } from '@/src/modules/workbench/ui/WorkbenchPage';

export const PageDispatcher: React.FC = () => {
  const { activeNode } = useNavigation();

  if (activeNode.id === 'workbench') {
    return <WorkbenchPage />;
  }

  switch (activeNode.pageKind) {
    case 'catalog_brand': return <BrandPage />;
    case 'catalog_supplier': return <SupplierPage />;
    case 'catalog_warehouse': return <WarehousePage />;
    case 'purchase_orders': return <PurchaseOrdersPage />;
    case 'purchase_manual_inbound': return <ManualInboundPage />;
    case 'product_list':
      return <ProductListPage />;

    case 'sales_pos':
      return <SalesPosPage />;

    case 'member_profile':
      return (
        <MemberProfilePage
          defaultOpenCreate={activeNode.id === 'members.profile.create'}
        />
      );

    case 'followup_notification': {
      const cat: NotificationCategory =
        activeNode.id === 'members.followup.notifications.pickup_reminder'
          ? 'pickup_reminder'
          : activeNode.id === 'members.followup.notifications.contact_lens_expiry'
            ? 'contact_lens_expiry'
            : 'review_reminder';
      return <FollowupNotificationPage category={cat} />;
    }

    case 'role_permissions':
      return <RolePermissionsPage />;

    case 'user_assignments':
      return <UserAssignmentsPage />;

    case 'operation_logs':
      return <OperationLogsPage />;

    case 'internal_notices':
      return <NoticeAdminPage />;

    case 'store_profiles':
      return <StoreProfilePage />;

    case 'system_parameters':
      return <SystemParametersPage />;

    case 'vision_record':
      return <VisionRecordPage pageTitle={activeNode.label} />;

    case 'orthokeratology':
      return <VisionRecordPage isOrtho pageTitle={activeNode.label} />;

    case 'inventory_query':
      return (
        <InventoryQueryPage
          isCrosstab={activeNode.id === 'inventory.crosstab'}
          pageTitle={activeNode.label}
        />
      );

    case 'finance_ledger':
      return <FinanceLedgerPage pageTitle={activeNode.label} />;

    case 'processing_order':
      return <ProcessingOrderPage />;

    case 'contact_lens_compliance':
      return (
        <ContactLensCompliancePage
          nodeId={activeNode.id}
          pageTitle={activeNode.label}
        />
      );

    case 'analytics':
      return <AnalyticsDashboardPage pageTitle={activeNode.label} />;

    case 'screening':
      return <VisionScreeningView pageTitle={activeNode.label} />;

    case 'brand_portal':
      return <BrandPortalView pageTitle={activeNode.label} />;

    case 'master_data':
      return <MasterDataView node={activeNode} />;

    case 'help_docs':
      return <HelpDocsPage />;

    case 'unconfirmed_shell':
      return <UnconfirmedPageShell node={activeNode} />;

    case 'document_list':
    default:
      return <DocumentListView node={activeNode} />;
  }
};
