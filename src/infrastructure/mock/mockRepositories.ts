import {
  DEFAULT_ROLES,
  type PermissionAuditEntry,
  type RoleDefinition,
} from '@/src/modules/auth/domain/identity';
import {
  computeDiscountedPrice,
  type ProductCategoryId,
  type ProductImportHistoryRecord,
  type ProductImportRowPreview,
  type ProductItem,
} from '@/src/modules/basic/products/domain/product';
import type { ProductQueryFilters, ProductRepository } from '@/src/modules/basic/products/ports/productRepository';
import {
  type BatchNotifyResult,
  type FollowupNotificationItem,
  type NotificationChannel,
} from '@/src/modules/members/followup/notifications/domain/notification';
import type {
  FollowupNotificationRepository,
  NotificationQueryFilters,
} from '@/src/modules/members/followup/notifications/ports/notificationRepository';
import type { MemberProfile } from '@/src/modules/members/member-profile/domain/member';
import type { MemberQueryFilters, MemberRepository } from '@/src/modules/members/member-profile/ports/memberRepository';
import type { SalesOrderDraft } from '@/src/modules/sales/pos/domain/salesOrder';
import type { SalesOrderFilters, SalesOrderRepository } from '@/src/modules/sales/pos/ports/salesOrderRepository';
import type { RoleRepository } from '@/src/modules/system/roles/ports/roleRepository';
import type { WorkbenchSnapshot, WorkbenchTimeRange } from '@/src/modules/workbench/domain/workbench';
import type { WorkbenchRepository } from '@/src/modules/workbench/ports/workbenchRepository';
import type { DataScopeContext, PaginatedQuery, PaginatedResult } from '@/src/shared/types/common';
import { versionedStorage } from '../storage/versionedStorage';
import {
  SEED_AUDIT_ENTRIES,
  SEED_IMPORT_HISTORY,
  SEED_MEMBERS,
  SEED_NOTIFICATIONS,
  SEED_PRODUCTS,
  SEED_SALES_ORDERS,
} from './seedData';

const delay = (ms = 180) => new Promise((resolve) => setTimeout(resolve, ms));

function filterByScope<T extends { storeId?: string; supplierId?: string }>(
  items: T[],
  scope: DataScopeContext
): T[] {
  if (scope.identityType === 'admin') {
    if (scope.storeId && scope.storeId !== 'all') {
      return items.filter((i) => !i.storeId || i.storeId === scope.storeId);
    }
    return items;
  }
  if (scope.identityType === 'store') {
    const allowed = new Set(
      scope.storeId && scope.storeId !== 'all' ? [scope.storeId] : scope.authorizedStoreIds
    );
    return items.filter((i) => !i.storeId || allowed.has(i.storeId));
  }
  // supplier scope
  return items.filter((i) => !i.supplierId || i.supplierId === scope.supplierId);
}

function matchesCategory(itemCat: ProductCategoryId, filterCat?: ProductCategoryId): boolean {
  if (!filterCat || filterCat === 'cat_all') return true;
  if (filterCat === 'cat_frame') {
    return itemCat === 'cat_frame' || itemCat === 'cat_frame_titan' || itemCat === 'cat_frame_acetate';
  }
  if (filterCat === 'cat_lens') {
    return itemCat === 'cat_lens' || itemCat === 'cat_lens_single' || itemCat === 'cat_lens_control';
  }
  return itemCat === filterCat;
}

export class MockProductRepository implements ProductRepository {
  private readonly sliceKey = 'products';
  private readonly historyKey = 'product_import_history';

  private readAll(): ProductItem[] {
    return versionedStorage.read<ProductItem[]>(this.sliceKey, () => SEED_PRODUCTS);
  }

  private writeAll(items: ProductItem[]): void {
    versionedStorage.write(this.sliceKey, items);
  }

  async queryProducts(
    query: PaginatedQuery<ProductQueryFilters>,
    scope: DataScopeContext
  ): Promise<PaginatedResult<ProductItem>> {
    await delay(160);
    const f = query.filters ?? {};
    if (f.simulateError) {
      throw new Error('模拟商品查询接口超时（演示错误态验证）');
    }

    let list = filterByScope(this.readAll(), scope);

    if (f.keyword && f.keyword.trim()) {
      const kw = f.keyword.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(kw) ||
          p.skuCode.toLowerCase().includes(kw) ||
          p.model.toLowerCase().includes(kw) ||
          p.brand.toLowerCase().includes(kw)
      );
    }
    if (f.categoryId) {
      list = list.filter((p) => matchesCategory(p.categoryId, f.categoryId));
    }
    if (f.brand && f.brand !== 'all') {
      list = list.filter((p) => p.brand === f.brand);
    }
    if (f.enabled && f.enabled !== 'all') {
      const target = f.enabled === 'true';
      list = list.filter((p) => p.enabled === target);
    }
    if (f.isCustomLens && f.isCustomLens !== 'all') {
      const target = f.isCustomLens === 'true';
      list = list.filter((p) => p.isCustomLens === target);
    }
    if (f.storeId && f.storeId !== 'all') {
      list = list.filter((p) => p.storeId === f.storeId);
    }

    if (query.sortBy) {
      const dir = query.sortOrder === 'asc' ? 1 : -1;
      list = [...list].sort((a, b) => {
        const av = String((a as unknown as Record<string, unknown>)[query.sortBy!] ?? '');
        const bv = String((b as unknown as Record<string, unknown>)[query.sortBy!] ?? '');
        if (query.sortBy === 'retailPrice' || query.sortBy === 'discountedPrice') {
          return (Number.parseFloat(av) - Number.parseFloat(bv)) * dir;
        }
        return av.localeCompare(bv, 'zh-CN') * dir;
      });
    }

    const total = list.length;
    const start = (query.page - 1) * query.pageSize;
    return {
      items: list.slice(start, start + query.pageSize),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async createProduct(
    input: Omit<ProductItem, 'id' | 'createdAt' | 'discountedPrice'>,
    _scope: DataScopeContext
  ): Promise<ProductItem> {
    await delay(140);
    const items = this.readAll();
    const created: ProductItem = {
      ...input,
      id: `prd_${Date.now()}`,
      discountedPrice: computeDiscountedPrice(input.retailPrice, input.salesDiscount),
      createdAt: new Date().toISOString(),
    };
    this.writeAll([created, ...items]);
    return created;
  }

  async updateProduct(
    id: string,
    patch: Partial<ProductItem>,
    _scope: DataScopeContext
  ): Promise<ProductItem> {
    await delay(140);
    const items = this.readAll();
    const idx = items.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('商品记录不存在');
    const merged: ProductItem = { ...items[idx], ...patch };
    merged.discountedPrice = computeDiscountedPrice(merged.retailPrice, merged.salesDiscount);
    items[idx] = merged;
    this.writeAll(items);
    return merged;
  }

  async deleteProducts(ids: string[], _scope: DataScopeContext): Promise<{ deletedCount: number }> {
    await delay(140);
    const idSet = new Set(ids);
    const items = this.readAll();
    const next = items.filter((p) => !idSet.has(p.id));
    this.writeAll(next);
    return { deletedCount: items.length - next.length };
  }

  async batchUpdateProducts(
    ids: string[],
    patch: { enabled?: boolean; salesDiscount?: number; tags?: string[] },
    _scope: DataScopeContext
  ): Promise<{ updatedCount: number }> {
    await delay(140);
    const idSet = new Set(ids);
    let count = 0;
    const next = this.readAll().map((p) => {
      if (!idSet.has(p.id)) return p;
      count += 1;
      const discount = patch.salesDiscount ?? p.salesDiscount;
      return {
        ...p,
        enabled: patch.enabled ?? p.enabled,
        salesDiscount: discount,
        discountedPrice: computeDiscountedPrice(p.retailPrice, discount),
        tags: patch.tags ?? p.tags,
      };
    });
    this.writeAll(next);
    return { updatedCount: count };
  }

  async validateImportRows(
    rows: Array<{ brand: string; categoryName: string; name: string; model: string; retailPrice: string }>
  ): Promise<ProductImportRowPreview[]> {
    await delay(180);
    return rows.map((r, index) => {
      const errors: string[] = [];
      if (!r.brand.trim()) errors.push('品牌为必填字段');
      if (!r.categoryName.trim()) errors.push('品类为必填字段');
      if (!r.name.trim()) errors.push('商品名称为必填字段');
      if (!r.model.trim()) errors.push('型号为必填字段');
      if (r.retailPrice && Number.isNaN(Number.parseFloat(r.retailPrice))) {
        errors.push('零售价格式必须为数字');
      }
      return {
        rowNumber: index + 2,
        ...r,
        valid: errors.length === 0,
        errors,
      };
    });
  }

  async commitImportRows(
    fileName: string,
    validRows: ProductImportRowPreview[],
    failedCount: number,
    operator: string,
    scope: DataScopeContext
  ): Promise<ProductImportHistoryRecord> {
    await delay(200);
    const existing = this.readAll();
    const added: ProductItem[] = validRows.map((row, idx) => {
      const retail = Number.parseFloat(row.retailPrice || '990') || 990;
      return {
        id: `prd_imp_${Date.now()}_${idx}`,
        skuCode: `QSL-IMP-${String(existing.length + idx + 10).padStart(4, '0')}`,
        name: row.name,
        brand: row.brand,
        categoryId: row.categoryName.includes('镜片') ? 'cat_lens_single' : 'cat_frame_titan',
        categoryName: row.categoryName,
        model: row.model,
        colorOrDiopter: '导入默认规格',
        series: 'Excel导入批次',
        refractiveIndex: row.categoryName.includes('镜片') ? '1.60' : '-',
        isCustomLens: false,
        axis: '-',
        coatingType: '-',
        year: 2026,
        contactLensType: '-',
        retailPrice: retail.toFixed(2),
        salesDiscount: 0.9,
        discountedPrice: (retail * 0.9).toFixed(2),
        wholesalePrice: (retail * 0.55).toFixed(2),
        costPrice: (retail * 0.42).toFixed(2),
        stockLocation: '待上架分区',
        pointsPerAmount: 10,
        storeId: scope.storeId === 'all' ? 'store_hq_01' : scope.storeId,
        storeName: scope.storeName.includes('全部') ? '杭州西湖旗舰店' : scope.storeName,
        enabled: true,
        supplierId: 'sup_linberg_03',
        supplierName: '导入待关联供应商',
        tags: ['Excel导入'],
        productMark: '新导入',
        createdAt: new Date().toISOString(),
        bindSource: 'Excel导入新版',
      };
    });

    this.writeAll([...added, ...existing]);

    const history = versionedStorage.read<ProductImportHistoryRecord[]>(
      this.historyKey,
      () => SEED_IMPORT_HISTORY
    );
    const entry: ProductImportHistoryRecord = {
      id: `imp_${Date.now()}`,
      source: 'excel_v2',
      fileName,
      totalRows: validRows.length + failedCount,
      successRows: validRows.length,
      failedRows: failedCount,
      operator,
      createdAt: new Date().toISOString(),
      statusNote:
        failedCount > 0
          ? `导入完成（${validRows.length}条入库，${failedCount}条校验失败待修正）`
          : '全部预校验通过并已入库',
    };
    versionedStorage.write(this.historyKey, [entry, ...history]);
    return entry;
  }

  async getImportHistory(): Promise<ProductImportHistoryRecord[]> {
    await delay(100);
    return versionedStorage.read<ProductImportHistoryRecord[]>(
      this.historyKey,
      () => SEED_IMPORT_HISTORY
    );
  }
}

export class MockSalesOrderRepository implements SalesOrderRepository {
  private readonly sliceKey = 'sales_orders';

  private readAll(): SalesOrderDraft[] {
    return versionedStorage.read<SalesOrderDraft[]>(this.sliceKey, () => SEED_SALES_ORDERS);
  }

  async queryOrders(
    query: PaginatedQuery<SalesOrderFilters>,
    scope: DataScopeContext
  ): Promise<PaginatedResult<SalesOrderDraft>> {
    await delay(150);
    const f = query.filters ?? {};
    let list = filterByScope(this.readAll(), scope);
    if (f.keyword?.trim()) {
      const kw = f.keyword.trim().toLowerCase();
      list = list.filter(
        (o) =>
          o.orderNo.toLowerCase().includes(kw) ||
          o.customerName.toLowerCase().includes(kw) ||
          o.guideName.toLowerCase().includes(kw)
      );
    }
    if (f.status && f.status !== 'all') {
      list = list.filter((o) => o.status === f.status);
    }
    const total = list.length;
    const start = (query.page - 1) * query.pageSize;
    return {
      items: list.slice(start, start + query.pageSize),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async saveDraftOrder(
    draft: Omit<SalesOrderDraft, 'id' | 'orderNo' | 'createdAt'>,
    _scope: DataScopeContext
  ): Promise<SalesOrderDraft> {
    await delay(180);
    const all = this.readAll();
    const order: SalesOrderDraft = {
      ...draft,
      id: `so_${Date.now()}`,
      orderNo: `SO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(
        all.length + 101
      )}`,
      createdAt: new Date().toISOString(),
    };
    versionedStorage.write(this.sliceKey, [order, ...all]);
    return order;
  }
}

export class MockMemberRepository implements MemberRepository {
  private readonly sliceKey = 'members';

  private readAll(): MemberProfile[] {
    return versionedStorage.read<MemberProfile[]>(this.sliceKey, () => SEED_MEMBERS);
  }

  async queryMembers(
    query: PaginatedQuery<MemberQueryFilters>,
    scope: DataScopeContext
  ): Promise<PaginatedResult<MemberProfile>> {
    await delay(150);
    if (scope.identityType === 'supplier') {
      return { items: [], total: 0, page: query.page, pageSize: query.pageSize };
    }
    const f = query.filters ?? {};
    let list = filterByScope(this.readAll(), scope);
    if (f.keyword?.trim()) {
      const kw = f.keyword.trim().toLowerCase();
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(kw) ||
          m.memberNo.toLowerCase().includes(kw) ||
          m.phone.includes(kw)
      );
    }
    if (f.tier && f.tier !== 'all') {
      list = list.filter((m) => m.tier === f.tier);
    }
    if (f.storeId && f.storeId !== 'all') {
      list = list.filter((m) => m.storeId === f.storeId);
    }
    const total = list.length;
    const start = (query.page - 1) * query.pageSize;
    return {
      items: list.slice(start, start + query.pageSize),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async getMemberById(id: string, scope: DataScopeContext): Promise<MemberProfile | null> {
    await delay(100);
    if (scope.identityType === 'supplier') return null;
    const list = filterByScope(this.readAll(), scope);
    return list.find((m) => m.id === id) ?? null;
  }

  async createMember(
    input: {
      name: string;
      gender: '男' | '女';
      age: number;
      phone: string;
      tier: MemberProfile['tier'];
      storeId: string;
      storeName: string;
      guideName: string;
      tags: string[];
    },
    _scope: DataScopeContext
  ): Promise<MemberProfile> {
    await delay(150);
    const all = this.readAll();
    const created: MemberProfile = {
      id: `mem_${Date.now()}`,
      memberNo: `QSL-M-${String(20260000 + all.length + 1)}`,
      name: input.name,
      gender: input.gender,
      age: input.age,
      phone: input.phone,
      tier: input.tier,
      storeId: input.storeId,
      storeName: input.storeName,
      guideName: input.guideName,
      pointsBalance: 200,
      storedValueBalance: '0.00',
      totalSpent: '0.00',
      visitCount: 1,
      lastVisitDate: new Date().toISOString().slice(0, 10),
      nextReviewDate: '2027-02-16',
      tags: input.tags,
      consumptions: [],
      visionRecords: [],
      appointments: [],
      followupLogs: [],
    };
    versionedStorage.write(this.sliceKey, [created, ...all]);
    return created;
  }
}

export class MockNotificationRepository implements FollowupNotificationRepository {
  private readonly sliceKey = 'followup_notifications';

  private readAll(): FollowupNotificationItem[] {
    return versionedStorage.read<FollowupNotificationItem[]>(
      this.sliceKey,
      () => SEED_NOTIFICATIONS
    );
  }

  private writeAll(items: FollowupNotificationItem[]): void {
    versionedStorage.write(this.sliceKey, items);
  }

  async queryNotifications(
    query: PaginatedQuery<NotificationQueryFilters>,
    scope: DataScopeContext
  ): Promise<PaginatedResult<FollowupNotificationItem>> {
    await delay(150);
    const f = query.filters ?? { category: 'review_reminder' };
    if (f.simulateError) {
      throw new Error('模拟通知列表查询失败（用于验证异常重试机制）');
    }
    if (scope.identityType === 'supplier') {
      return { items: [], total: 0, page: query.page, pageSize: query.pageSize };
    }

    let list = filterByScope(this.readAll(), scope).filter(
      (n) => n.category === f.category
    );

    if (f.storeId && f.storeId !== 'all') {
      list = list.filter((n) => n.storeId === f.storeId);
    }
    if (f.keyword?.trim()) {
      const kw = f.keyword.trim().toLowerCase();
      list = list.filter(
        (n) =>
          n.customerName.toLowerCase().includes(kw) ||
          n.phone.includes(kw) ||
          n.orderOrLensRef.toLowerCase().includes(kw)
      );
    }
    if (f.status && f.status !== 'all') {
      list = list.filter((n) => n.status === f.status);
    }
    if (f.channel && f.channel !== 'all') {
      list = list.filter((n) => n.channel === f.channel);
    }
    if (f.ownerName?.trim()) {
      const owner = f.ownerName.trim();
      list = list.filter((n) => n.ownerName.includes(owner));
    }
    if (f.dateFrom) {
      list = list.filter((n) => n.plannedDate >= f.dateFrom!);
    }
    if (f.dateTo) {
      list = list.filter((n) => n.plannedDate <= f.dateTo!);
    }

    const total = list.length;
    const start = (query.page - 1) * query.pageSize;
    return {
      items: list.slice(start, start + query.pageSize),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async sendBatchNotifications(
    ids: string[],
    channel: NotificationChannel,
    templateName: string,
    operator: string,
    _scope: DataScopeContext
  ): Promise<BatchNotifyResult> {
    await delay(240);
    const idSet = new Set(ids);
    const items = this.readAll();
    const now = new Date().toISOString();
    const failures: Array<{ customerName: string; reason: string }> = [];
    let successCount = 0;

    const updated = items.map((item) => {
      if (!idSet.has(item.id)) return item;
      if (item.status === 'review_completed') {
        failures.push({
          customerName: item.customerName,
          reason: '该记录已标记为“已完成复查”，无需重复发送通知',
        });
        return item;
      }
      // Deterministic simulated failure for demo verification if phone ends with '33' and channel is 短信
      if (item.phone.endsWith('33') && channel === '短信') {
        failures.push({
          customerName: item.customerName,
          reason: '模拟通道拦截：该手机号已退订短信或处于屏蔽名单',
        });
        return {
          ...item,
          channel,
          status: 'notify_failed' as const,
          lastNotifiedAt: now,
          logs: [
            {
              id: `nl_${Date.now()}_${item.id}`,
              sentAt: now,
              channel,
              operator,
              templateName,
              result: 'notify_failed' as const,
              detail: '演示模拟发送失败：号码退订短信通知，建议切换微信渠道。',
            },
            ...item.logs,
          ],
        };
      }

      successCount += 1;
      return {
        ...item,
        channel,
        status: 'notified' as const,
        lastNotifiedAt: now,
        logs: [
          {
            id: `nl_${Date.now()}_${item.id}`,
            sentAt: now,
            channel,
            operator,
            templateName,
            result: 'notified' as const,
            detail: `演示模拟触发（未调用真实通道）：使用「${templateName}」发送完成。`,
          },
          ...item.logs,
        ],
      };
    });

    this.writeAll(updated);
    return {
      total: ids.length,
      successCount,
      failedCount: failures.length,
      failures,
    };
  }

  async markReviewCompleted(
    id: string,
    operator: string,
    _scope: DataScopeContext
  ): Promise<FollowupNotificationItem> {
    await delay(140);
    const items = this.readAll();
    const idx = items.findIndex((x) => x.id === id);
    if (idx === -1) throw new Error('通知记录不存在');
    const now = new Date().toISOString();
    const updated: FollowupNotificationItem = {
      ...items[idx],
      status: 'review_completed',
      logs: [
        {
          id: `nl_${Date.now()}`,
          sentAt: now,
          channel: items[idx].channel,
          operator,
          templateName: '门店人工核销复查状态',
          result: 'notified',
          detail: '门店已确认顾客完成本次视力复查或取镜。',
        },
        ...items[idx].logs,
      ],
    };
    items[idx] = updated;
    this.writeAll(items);
    return updated;
  }
}

export class MockRoleRepository implements RoleRepository {
  private readonly rolesKey = 'rbac_roles';
  private readonly auditKey = 'rbac_audit_entries';

  async listRoles(): Promise<RoleDefinition[]> {
    await delay(120);
    return versionedStorage.read<RoleDefinition[]>(this.rolesKey, () => DEFAULT_ROLES);
  }

  async updateRole(
    role: RoleDefinition,
    operator: string,
    summary: string
  ): Promise<RoleDefinition> {
    await delay(160);
    const roles = versionedStorage.read<RoleDefinition[]>(this.rolesKey, () => DEFAULT_ROLES);
    const nextRole: RoleDefinition = {
      ...role,
      updatedAt: new Date().toISOString(),
      updatedBy: operator,
    };
    const nextList = roles.map((r) => (r.id === role.id ? nextRole : r));
    versionedStorage.write(this.rolesKey, nextList);

    const audits = versionedStorage.read<PermissionAuditEntry[]>(
      this.auditKey,
      () => SEED_AUDIT_ENTRIES
    );
    const entry: PermissionAuditEntry = {
      id: `aud_${Date.now()}`,
      roleId: role.id,
      roleName: role.name,
      operator,
      actionSummary: summary,
      changedPermissions: [`权限点共 ${role.permissions.length} 项`, `数据范围: ${role.dataScope}`],
      createdAt: new Date().toISOString(),
    };
    versionedStorage.write(this.auditKey, [entry, ...audits]);
    return nextRole;
  }

  async listAuditEntries(): Promise<PermissionAuditEntry[]> {
    await delay(100);
    return versionedStorage.read<PermissionAuditEntry[]>(
      this.auditKey,
      () => SEED_AUDIT_ENTRIES
    );
  }
}

export class MockWorkbenchRepository implements WorkbenchRepository {
  async getSnapshot(
    timeRange: WorkbenchTimeRange,
    storeScopeId: string,
    scope: DataScopeContext
  ): Promise<WorkbenchSnapshot> {
    await delay(140);

    const factor =
      timeRange === 'today'
        ? 1
        : timeRange === 'week'
          ? 6.4
          : timeRange === 'month'
            ? 24.5
            : 268;

    const rangeLabel =
      timeRange === 'today'
        ? '今日'
        : timeRange === 'week'
          ? '本周'
          : timeRange === 'month'
            ? '本月'
            : '本年';

    if (scope.identityType === 'supplier') {
      const supplyAmount = Math.round(68500 * factor);
      return {
        identityType: 'supplier',
        greetingName: '上午好，顾承泽',
        subtitle: '查看千视林品牌专区采购交付、退换货及对账动态（供应商隔离视图）。',
        scopeLabel: scope.supplierName ?? '合作供应商',
        primaryMetrics: [
          {
            label: `${rangeLabel}供货交付金额`,
            value: `¥${supplyAmount.toLocaleString('zh-CN')}`,
            deltaText: '较上期 +11.4%',
            hint: '仅统计本供应商已确认供货单',
          },
          {
            label: `${rangeLabel}待发货采购单`,
            value: `${Math.max(4, Math.round(6 * (factor > 10 ? 2 : 1)))}`,
            deltaText: '平均发货周期 18h',
            hint: '含车房定制镜片与常规现片',
          },
          {
            label: `${rangeLabel}CCS退货待核对`,
            value: '3',
            deltaText: '待确认 1 笔',
            hint: '不包含门店内部零售毛利',
          },
          {
            label: '待对账往来金额',
            value: '¥142,600',
            deltaText: '账期 T+30',
            hint: '月度对账单待财务复核',
          },
        ],
        focusHighlightCard: {
          kicker: '重点履约指标',
          title: '车房定制片准时交付率',
          metricValue: '96.8%',
          progressPercent: 97,
          caption: '目标基线 ≥ 95.0% · 较上月提升 1.4pt',
        },
        secondaryDarkCard: {
          kicker: '对账与交付概览',
          title: '供应商结算摘要（演示）',
          metricValue: '¥318,450.00',
          subLines: [
            { label: '已入库待核对采购单', value: '12 笔' },
            { label: '本月新上架SKU审核', value: '18 款' },
            { label: '近效期调换预警批次', value: '2 批' },
          ],
        },
        trendTitle: `${rangeLabel}采购供货趋势`,
        trendSubtitle: '按供应商订单金额统计（不含零售毛利与顾客信息）',
        trendPrimaryLabel: '本期供货额 (元)',
        trendSecondaryLabel: '上期对比 (元)',
        trendSeries: [
          { label: 'D1', primary: Math.round(48000 * factor * 0.16), secondary: Math.round(42000 * factor * 0.16) },
          { label: 'D2', primary: Math.round(62000 * factor * 0.16), secondary: Math.round(54000 * factor * 0.16) },
          { label: 'D3', primary: Math.round(58000 * factor * 0.16), secondary: Math.round(59000 * factor * 0.16) },
          { label: 'D4', primary: Math.round(74000 * factor * 0.16), secondary: Math.round(63000 * factor * 0.16) },
          { label: 'D5', primary: Math.round(83000 * factor * 0.16), secondary: Math.round(69000 * factor * 0.16) },
          { label: 'D6', primary: Math.round(91000 * factor * 0.16), secondary: Math.round(77000 * factor * 0.16) },
        ],
        brandRankingTitle: '供货系列出货量分布',
        brandRanking: [
          { label: '新清锐1.67', value: 142, highlight: true },
          { label: '小乐圆控度', value: 118 },
          { label: '智锐渐进', value: 64 },
          { label: '数码防蓝光', value: 53 },
          { label: '清洁套装', value: 89 },
        ],
        productRankingTitle: '近7日门店补货频次',
        productRanking: [
          { label: '西湖旗舰店', count: 28, highlight: true },
          { label: '滨江天街店', count: 19 },
          { label: '上海静安店', count: 24 },
          { label: '南京新街口', count: 14 },
        ],
        workReminders: [
          { id: 'wr_s1', label: '待确认采购订单', count: 6, unit: '单', targetRoute: '/modules/brands/order-list', urgent: true },
          { id: 'wr_s2', label: 'CCS退货待收', count: 3, unit: '单', targetRoute: '/modules/brands/ccs-returns' },
          { id: 'wr_s3', label: '本月待核对账单', count: 2, unit: '份', targetRoute: '/modules/brands/ccs-statements' },
          { id: 'wr_s4', label: '新品线上申请', count: 4, unit: '条', targetRoute: '/modules/brands/online-order-apply' },
        ],
        qualificationAlerts: [
          {
            id: 'qa_s1',
            title: '医疗器械经营许可证',
            entityName: '卡尔蔡司光学华东代理',
            expiryDate: '2027-01-20',
            daysLeft: 65,
            severity: 'warning',
            targetRoute: '/modules/contact-lenses/first-enterprise',
          },
          {
            id: 'qa_s2',
            title: '业务员授权书',
            entityName: '华东大区驻店专员',
            expiryDate: '2026-12-10',
            daysLeft: 24,
            severity: 'error',
            targetRoute: '/modules/contact-lenses/first-enterprise',
          },
        ],
      };
    }

    const isStoreOnly = scope.identityType === 'store' || (storeScopeId !== 'all' && storeScopeId !== '');
    const scale = isStoreOnly ? 0.34 : 1;
    const baseSales = Math.round(42800 * factor * scale);
    const baseOrders = Math.max(8, Math.round(24 * factor * scale));
    const avgTicket = Math.round(baseSales / baseOrders);

    return {
      identityType: scope.identityType,
      greetingName: scope.identityType === 'admin' ? '上午好，林经理' : `上午好，${scope.storeName.slice(0, 4)}团队`,
      subtitle:
        scope.identityType === 'admin'
          ? '查看今天的连锁门店经营与待办事项。'
          : '查看今天所属门店的配镜开单、加工进度与复查提醒。',
      scopeLabel: scope.identityType === 'admin' && storeScopeId === 'all' ? '全部授权门店 (4家)' : scope.storeName,
      primaryMetrics: [
        {
          label: `${rangeLabel}销售额`,
          value: `¥${baseSales.toLocaleString('zh-CN')}`,
          deltaText: '较上期 +14.2%',
          hint: '含框架、镜片、隐形及视光服务',
        },
        {
          label: `${rangeLabel}订单量`,
          value: `${baseOrders}`,
          deltaText: '成交率 68.4%',
          hint: '验光试戴后正式成交单数',
        },
        {
          label: '平均客单价',
          value: `¥${avgTicket.toLocaleString('zh-CN')}`,
          deltaText: '较上期 +¥120',
          hint: '功能性控度镜片占比提升',
        },
        {
          label: '件单量',
          value: '1.86 件',
          deltaText: '连带护理液 +12%',
          hint: '平均每笔订单包含商品件数',
        },
      ],
      focusHighlightCard: {
        kicker: '关键经营目标',
        title: `${rangeLabel}销售目标达成`,
        metricValue: isStoreOnly ? '84.6%' : '88.2%',
        progressPercent: isStoreOnly ? 85 : 88,
        caption: isStoreOnly ? '门店目标 ¥420,000 · 已完成 ¥355,320' : '连锁目标 ¥1,200,000 · 已完成 ¥1,058,400',
      },
      secondaryDarkCard: {
        kicker: '视光与服务健康度',
        title: '复查转化与加工履约',
        metricValue: '92.4%',
        subLines: [
          { label: '青少年复查按期到店率', value: '86.5%' },
          { label: '加工中心24h交付达成', value: '95.1%' },
          { label: '剩余可用短信余量', value: '3,420 条' },
        ],
      },
      trendTitle: `${rangeLabel}销售趋势`,
      trendSubtitle: '主实线为本期营收，虚线为上期同期对比',
      trendPrimaryLabel: '本期销售额 (元)',
      trendSecondaryLabel: '上期同期 (元)',
      trendSeries: [
        { label: '09:00', primary: Math.round(5200 * factor * scale), secondary: Math.round(4600 * factor * scale) },
        { label: '11:00', primary: Math.round(9800 * factor * scale), secondary: Math.round(8100 * factor * scale) },
        { label: '13:00', primary: Math.round(14500 * factor * scale), secondary: Math.round(12900 * factor * scale) },
        { label: '15:00', primary: Math.round(24900 * factor * scale), secondary: Math.round(21200 * factor * scale) },
        { label: '17:00', primary: Math.round(35100 * factor * scale), secondary: Math.round(29800 * factor * scale) },
        { label: '19:00', primary: Math.round(42800 * factor * scale), secondary: Math.round(37500 * factor * scale) },
      ],
      brandRankingTitle: '品牌销售额排行',
      brandRanking: [
        { label: '卡尔蔡司', value: Math.round(18600 * scale), highlight: true },
        { label: '林德伯格', value: Math.round(11400 * scale) },
        { label: '依视路', value: Math.round(9800 * scale) },
        { label: '千视林甄选', value: Math.round(6400 * scale) },
        { label: '暴龙', value: Math.round(3900 * scale) },
      ],
      productRankingTitle: '热销单品销量排行',
      productRanking: [
        { label: '蔡司小乐圆 1.60', count: isStoreOnly ? 9 : 26, highlight: true },
        { label: '蔡司新清锐 1.67', count: isStoreOnly ? 7 : 21 },
        { label: '依视路星趣控', count: isStoreOnly ? 6 : 17 },
        { label: '甄选板材 AC2608', count: isStoreOnly ? 5 : 14 },
        { label: '安视优日抛30片', count: isStoreOnly ? 11 : 31 },
      ],
      workReminders: [
        { id: 'wr_01', label: '待加工', count: isStoreOnly ? 5 : 14, unit: '单', targetRoute: '/modules/processing/orders', urgent: true },
        { id: 'wr_02', label: '待取镜', count: isStoreOnly ? 4 : 11, unit: '人', targetRoute: '/modules/members/followup/notifications/pickup-reminder' },
        { id: 'wr_03', label: '待审核', count: isStoreOnly ? 1 : 4, unit: '笔', targetRoute: '/modules/sales/approvals' },
        { id: 'wr_04', label: '生日提醒', count: isStoreOnly ? 3 : 9, unit: '位', targetRoute: '/modules/members/profile/basic' },
        { id: 'wr_05', label: '复查提醒', count: isStoreOnly ? 4 : 12, unit: '位', targetRoute: '/modules/members/followup/notifications/review-reminder', urgent: true },
        { id: 'wr_06', label: '隐形眼镜过期提醒', count: isStoreOnly ? 2 : 7, unit: '位', targetRoute: '/modules/members/followup/notifications/contact-lens-expiry' },
        { id: 'wr_07', label: '到店预约', count: isStoreOnly ? 6 : 18, unit: '组', targetRoute: '/modules/members/appointments/register' },
        { id: 'wr_08', label: '采购预计到货', count: isStoreOnly ? 2 : 5, unit: '批', targetRoute: '/modules/purchase/in-transit' },
        { id: 'wr_09', label: '待回访', count: isStoreOnly ? 5 : 16, unit: '项', targetRoute: '/modules/members/followup/task-reminders' },
        { id: 'wr_10', label: '调拨未收', count: isStoreOnly ? 1 : 3, unit: '单', targetRoute: '/modules/transfer/inbound' },
        { id: 'wr_11', label: '自定义提醒', count: 2, unit: '条', targetRoute: '/modules/system/notices-history' },
        { id: 'wr_12', label: '剩余短信', count: 3420, unit: '条', targetRoute: '/modules/members/marketing/sms/recharge' },
      ],
      qualificationAlerts: [
        {
          id: 'qa_01',
          title: '商品近效期',
          entityName: '安视优欧舒适日抛（批号 B25091）',
          expiryDate: '2027-01-12',
          daysLeft: 57,
          severity: 'warning',
          targetRoute: '/modules/contact-lenses/near-expiry',
        },
        {
          id: 'qa_02',
          title: '生产许可证',
          entityName: '江苏海伦光学护理液生产商',
          expiryDate: '2027-02-28',
          daysLeft: 104,
          severity: 'processing',
          targetRoute: '/modules/contact-lenses/first-enterprise',
        },
        {
          id: 'qa_03',
          title: '供应商营业执照',
          entityName: '北欧钛架联合供货商',
          expiryDate: '2026-12-30',
          daysLeft: 44,
          severity: 'warning',
          targetRoute: '/modules/basic/suppliers',
        },
        {
          id: 'qa_04',
          title: '医疗器械经营许可证',
          entityName: '杭州西湖旗舰店（三类器械）',
          expiryDate: '2026-12-08',
          daysLeft: 22,
          severity: 'error',
          targetRoute: '/modules/contact-lenses/first-enterprise',
        },
        {
          id: 'qa_05',
          title: '业务员授权书',
          entityName: '依视路驻浙江业务代表',
          expiryDate: '2026-12-20',
          daysLeft: 34,
          severity: 'warning',
          targetRoute: '/modules/contact-lenses/first-enterprise',
        },
        {
          id: 'qa_06',
          title: '医疗器械注册证',
          entityName: '角膜塑形用硬性透气接触镜（国械注准）',
          expiryDate: '2027-03-15',
          daysLeft: 119,
          severity: 'processing',
          targetRoute: '/modules/contact-lenses/first-product',
        },
      ],
    };
  }
}
