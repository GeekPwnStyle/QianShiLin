import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Plus, Save, Search, Trash2 } from 'lucide-react';
import { appRepositories } from '@/src/app/composition/container';
import { useAuth } from '@/src/modules/auth/application/AuthContext';
import type { ProductItem } from '@/src/modules/basic/products/domain/product';
import type { MemberProfile } from '@/src/modules/members/member-profile/domain/member';
import {
  calculateOrderTotals,
  type DeliveryMethod,
  type SalesLineItem,
} from '@/src/modules/sales/pos/domain/salesOrder';
import { formatCurrency, formatDateTime, maskPhone } from '@/src/shared/lib/format';
import { Button } from '@/src/shared/ui/Button';
import { HelpTooltip } from '@/src/shared/ui/HelpTooltip';
import { PaginationBar } from '@/src/shared/ui/PaginationBar';
import { Select } from '@/src/shared/ui/Select';
import { StatusLabel } from '@/src/shared/ui/StatusLabel';

export const SalesPosPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { session, currentRole, dataScope, hasPermission } = useAuth();

  const canOverrideDiscount = hasPermission('sales.discount.override');
  const allowPlainPhone = Boolean(currentRole?.sensitiveFields.viewPlaintextPhone);

  const [selectedMemberId, setSelectedMemberId] = useState('mem_001');
  const [guideName, setGuideName] = useState('苏晓晴');
  const [optometristName, setOptometristName] = useState('许文博');
  const [productSearch, setProductSearch] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('in_store_pickup');
  const [remark, setRemark] = useState('');
  const [items, setItems] = useState<SalesLineItem[]>([]);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);

  const [productPage, setProductPage] = useState(1);
  const [productPageSize, setProductPageSize] = useState(20);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersPageSize, setOrdersPageSize] = useState(20);

  // Mobile step toggle so mobile users don't get overwhelmed
  const [mobileStep, setMobileStep] = useState<1 | 2>(1);

  const { data: membersData } = useQuery({
    queryKey: ['pos', 'members', session.currentStoreId],
    queryFn: () =>
      appRepositories.members.queryMembers({ page: 1, pageSize: 30 }, dataScope),
  });

  const { data: productsData } = useQuery({
    queryKey: ['pos', 'products', productSearch, productPage, productPageSize, session.currentStoreId],
    queryFn: () =>
      appRepositories.products.queryProducts(
        { page: productPage, pageSize: productPageSize, filters: { keyword: productSearch, enabled: 'true' } },
        dataScope
      ),
  });

  const { data: recentOrders } = useQuery({
    queryKey: ['pos', 'recent_orders', ordersPage, ordersPageSize, session.currentStoreId],
    queryFn: () => appRepositories.salesOrders.queryOrders({ page: ordersPage, pageSize: ordersPageSize }, dataScope),
  });

  const members: MemberProfile[] = membersData?.items ?? [];
  const selectedMember = members.find((m) => m.id === selectedMemberId) ?? members[0];
  const catalogProducts: ProductItem[] = productsData?.items ?? [];

  const totals = useMemo(() => calculateOrderTotals(items), [items]);

  const addProductLine = (product: ProductItem) => {
    setSavedNotice(null);
    setItems((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) {
        return prev.map((l) =>
          l.productId === product.id
            ? {
                ...l,
                quantity: l.quantity + 1,
                lineAmount: (
                  Number.parseFloat(l.unitPrice) *
                  (l.quantity + 1) *
                  l.discountRate
                ).toFixed(2),
              }
            : l
        );
      }
      const line: SalesLineItem = {
        id: `line_${Date.now()}_${product.id}`,
        productId: product.id,
        skuCode: product.skuCode,
        productName: product.name,
        categoryName: product.categoryName,
        specLabel: product.colorOrDiopter,
        quantity: 1,
        unitPrice: product.retailPrice,
        discountRate: product.salesDiscount,
        lineAmount: product.discountedPrice,
        eyeSide: product.categoryId.includes('lens') ? 'BOTH' : 'NONE',
      };
      return [...prev, line];
    });
  };

  const updateLine = (lineId: string, patch: { quantity?: number; discountRate?: number }) => {
    setDiscountError(null);
    setItems((prev) =>
      prev.map((l) => {
        if (l.id !== lineId) return l;
        const qty = Math.max(1, patch.quantity ?? l.quantity);
        let disc = patch.discountRate ?? l.discountRate;
        disc = Math.min(1, Math.max(0.5, disc));
        if (!canOverrideDiscount && disc < 0.85) {
          setDiscountError('当前岗位未授权 8.5 折以下超权折扣，已自动拦截为最低 0.85。');
          disc = 0.85;
        }
        const net = (Number.parseFloat(l.unitPrice) * qty * disc).toFixed(2);
        return { ...l, quantity: qty, discountRate: disc, lineAmount: net };
      })
    );
  };

  const removeLine = (lineId: string) => {
    setItems((prev) => prev.filter((l) => l.id !== lineId));
  };

  const saveDraftMutation = useMutation({
    mutationFn: () =>
      appRepositories.salesOrders.saveDraftOrder(
        {
          storeId: selectedMember?.storeId ?? (session.currentStoreId === 'all' ? 'store_hq_01' : session.currentStoreId),
          storeName: selectedMember?.storeName ?? session.currentStoreName,
          customerId: selectedMember?.id ?? 'walk_in',
          customerName: selectedMember?.name ?? '门店散客',
          customerPhone: selectedMember?.phone ?? '',
          guideName,
          optometristName,
          items,
          subtotalAmount: totals.subtotal,
          discountAmount: totals.discount,
          payableAmount: totals.payable,
          deliveryMethod,
          remark,
          status: 'draft',
        },
        dataScope
      ),
    onSuccess: (created) => {
      setSavedNotice(`草稿单 ${created.orderNo} 已保存（演示模式，未执行真实收款与库存扣减）。`);
      setItems([]);
      setRemark('');
      void queryClient.invalidateQueries({ queryKey: ['pos', 'recent_orders'] });
    },
  });

  return (
    <div className="space-y-5">
      {/* Mobile Step Switcher */}
      <div className="flex lg:hidden items-center gap-2">
        <button
          type="button"
          onClick={() => setMobileStep(1)}
          className={`flex-1 h-10 rounded-full text-[15px] font-medium ${
            mobileStep === 1 ? 'bg-[#171916] text-white' : 'bg-white border border-[#D9DDD4]'
          }`}
        >
          1. 选客与选品 ({items.length})
        </button>
        <button
          type="button"
          onClick={() => setMobileStep(2)}
          className={`flex-1 h-10 rounded-full text-[15px] font-medium ${
            mobileStep === 2 ? 'bg-[#171916] text-white' : 'bg-white border border-[#D9DDD4]'
          }`}
        >
          2. 结算摘要与保存草稿
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 cols: Customer + Product Selection */}
        <div className={`lg:col-span-7 space-y-5 ${mobileStep === 2 ? 'hidden lg:block' : ''}`}>
          {/* Customer & Staff Bar */}
          <div className="bg-white border border-[#D9DDD4] rounded-[20px] p-5 space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-[18px] font-semibold text-[#171916]">顾客与接待人员</h2>
              <HelpTooltip
                tone="warning"
                title="开单演示边界说明"
                content="本页面仅演示配镜开单明细组织、授权折扣校验及草稿保存，不接入真实收银支付，也不执行真实仓库库存扣减。"
                ariaLabel="查看开单演示边界说明"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[15px]">
              <div>
              <label className="block text-[14px] text-[#5F645D] mb-1">选择客户档案</label>
                <Select
                ariaLabel="选择客户档案"
                  value={selectedMemberId}
                  onChange={setSelectedMemberId}
                  options={members.map((m) => ({
                    value: m.id,
                    label: `${m.name} (${maskPhone(m.phone, allowPlainPhone)})`,
                  }))}
                />
              </div>

              <div>
                <label className="block text-[14px] text-[#5F645D] mb-1">导购员</label>
                <Select
                  ariaLabel="导购员"
                  value={guideName}
                  onChange={setGuideName}
                  options={[
                    { value: '苏晓晴', label: '苏晓晴' },
                    { value: '周婉宁', label: '周婉宁' },
                    { value: '陈明轩', label: '陈明轩' },
                    { value: '林语嫣', label: '林语嫣' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-[14px] text-[#5F645D] mb-1">验光师</label>
                <Select
                  ariaLabel="验光师"
                  value={optometristName}
                  onChange={setOptometristName}
                  options={[
                    { value: '许文博', label: '许文博（高级验光师）' },
                    { value: '赵青', label: '赵青（主治验光师）' },
                    { value: '冯思远', label: '冯思远（视光主任）' },
                  ]}
                />
              </div>
            </div>

            {selectedMember && (
              <div className="p-3.5 rounded-xl bg-[#F8F9F5] border border-[#E5E8E0] flex flex-wrap items-center justify-between gap-3 text-[14px]">
                <div>
                  <span className="font-semibold text-[#171916]">{selectedMember.name}</span>
                  <span className="mx-2 text-[#73796F]">·</span>
                  <span>{selectedMember.tier}</span>
                  <span className="mx-2 text-[#73796F]">·</span>
                  <span>可用积分 {selectedMember.pointsBalance}</span>
                </div>
                {selectedMember.visionRecords[0] && (
                  <div className="font-mono text-[#5F645D]">
                    最近验光 OD {selectedMember.visionRecords[0].odSph} / OS{' '}
                    {selectedMember.visionRecords[0].osSph} · PD {selectedMember.visionRecords[0].pdMm}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Product Picker */}
          <div className="bg-white border border-[#D9DDD4] rounded-[20px] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-[18px] font-semibold text-[#171916]">选择镜架、镜片或护理品</h2>
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-[#73796F] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setProductPage(1);
                  }}
                  placeholder="搜索商品名称 / SKU / 品牌"
                  className="w-full h-10 pl-9 pr-3 rounded-[9px] bg-[#F8F9F5] border border-[#D9DDD4] text-[15px] outline-none focus:border-[#171916]"
                />
              </div>
            </div>

            <div className="divide-y divide-[#E5E8E0]">
              {catalogProducts.map((p) => (
                <div
                  key={p.id}
                  className="py-3 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-medium text-[#171916] truncate">
                      {p.name}
                    </div>
                    <div className="text-[14px] text-[#5F645D] mt-0.5">
                      {p.brand} · {p.categoryName} · {p.colorOrDiopter}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right tabular-nums">
                      <div className="text-[15px] font-semibold text-[#171916]">
                        {formatCurrency(p.retailPrice)}
                      </div>
                      <div className="text-[13px] text-[#73796F]">
                        默认 {(p.salesDiscount * 10).toFixed(1)} 折
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<Plus className="w-3.5 h-3.5" />}
                      onClick={() => addProductLine(p)}
                    >
                      加入明细
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <PaginationBar
              compact
              className="-mx-5 -mb-5 rounded-b-[20px]"
              total={productsData?.total ?? 0}
              page={productPage}
              pageSize={productPageSize}
              unit="件商品"
              onPageChange={setProductPage}
              onPageSizeChange={(next) => {
                setProductPageSize(next);
                setProductPage(1);
              }}
            />
          </div>
        </div>

        {/* Right 5 cols: Cart Lines & Summary */}
        <div className={`lg:col-span-5 space-y-5 ${mobileStep === 1 ? 'hidden lg:block' : ''}`}>
          <div className="bg-white border border-[#D9DDD4] rounded-[20px] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[18px] font-semibold text-[#171916]">购物明细与金额汇总</h2>
              <span className="text-[14px] text-[#5F645D] tabular-nums">{items.length} 项商品</span>
            </div>

            {discountError && (
              <div className="p-3 rounded-xl bg-[#FEF7EC] border border-[#FDE68A] text-[14px] text-[#B45309]">
                {discountError}
              </div>
            )}

            {savedNotice && (
              <div className="p-3.5 rounded-xl bg-[#ECFDF3] border border-[#BBF7D0] text-[15px] text-[#166534] flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{savedNotice}</span>
              </div>
            )}

            {items.length === 0 ? (
              <div className="py-10 text-center text-[15px] text-[#73796F] border border-dashed border-[#D9DDD4] rounded-2xl">
                请从左侧选择镜架、镜片或护理液加入配镜明细
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((line) => (
                  <div
                    key={line.id}
                    className="p-3.5 rounded-2xl bg-[#F8F9F5] border border-[#E5E8E0] space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[15px] font-medium text-[#171916] leading-snug">
                          {line.productName}
                        </div>
                        <div className="text-[13px] text-[#73796F] mt-0.5">
                          {line.skuCode} · {line.specLabel}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLine(line.id)}
                        aria-label="删除商品行"
                        className="text-[#73796F] hover:text-[#DC2626] p-1 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 items-center text-[14px]">
                      <div>
                        <label className="block text-[13px] text-[#73796F]">数量</label>
                        <input
                          type="number"
                          min={1}
                          value={line.quantity}
                          onChange={(e) =>
                            updateLine(line.id, { quantity: Number.parseInt(e.target.value, 10) || 1 })
                          }
                          className="w-full h-9 px-2 rounded-lg bg-white border border-[#D9DDD4] tabular-nums"
                        />
                      </div>
                      <div>
                        <label className="block text-[13px] text-[#73796F]">
                          折扣 {!canOverrideDiscount && '(最低0.85)'}
                        </label>
                        <input
                          type="number"
                          step="0.05"
                          min={0.5}
                          max={1}
                          value={line.discountRate}
                          onChange={(e) =>
                            updateLine(line.id, {
                              discountRate: Number.parseFloat(e.target.value) || 1,
                            })
                          }
                          className="w-full h-9 px-2 rounded-lg bg-white border border-[#D9DDD4] tabular-nums"
                        />
                      </div>
                      <div className="text-right">
                        <div className="text-[13px] text-[#73796F]">小计</div>
                        <div className="font-semibold text-[#171916] tabular-nums mt-0.5">
                          {formatCurrency(line.lineAmount)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-[#E5E8E0] space-y-3 text-[15px]">
              <div>
                <label className="block text-[14px] text-[#5F645D] mb-1">取货或配送方式</label>
                <Select
                  ariaLabel="取货或配送方式"
                  value={deliveryMethod}
                  onChange={(val) => setDeliveryMethod(val as DeliveryMethod)}
                  options={[
                    { value: 'in_store_pickup', label: '门店自提（含现场调校）' },
                    { value: 'express_delivery', label: '快递配送到家' },
                    { value: 'store_transfer_pickup', label: '跨店调拨后门店自提' },
                  ]}
                />
              </div>
              <div>
                <label className="block text-[14px] text-[#5F645D] mb-1">加工或服务备注</label>
                <textarea
                  rows={2}
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="例如：需测量瞳高，定制片完成后优先微信通知取镜"
                  className="w-full p-2.5 rounded-[9px] bg-[#F8F9F5] border border-[#D9DDD4] text-[15px] outline-none focus:border-[#171916]"
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--qsl-brand-dark)] text-white space-y-2 text-[15px]">
              <div className="flex justify-between text-white/75">
                <span>吊牌原价合计</span>
                <span className="tabular-nums">{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-white/75">
                <span>折扣优惠金额</span>
                <span className="tabular-nums">- {formatCurrency(totals.discount)}</span>
              </div>
              <div className="pt-2 border-t border-white/15 flex items-baseline justify-between">
                <span className="font-medium">应收参考金额（草稿）</span>
                <span className="text-[26px] font-semibold text-[var(--qsl-accent-on-dark)] tabular-nums">
                  {formatCurrency(totals.payable)}
                </span>
              </div>
            </div>

            <Button
              variant="accent"
              size="lg"
              className="w-full"
              disabled={items.length === 0}
              loading={saveDraftMutation.isPending}
              icon={<Save className="w-4 h-4" />}
              onClick={() => saveDraftMutation.mutate()}
            >
              保存销售草稿单（不扣减真实库存）
            </Button>
          </div>

          {/* Recent Drafts List */}
          <div className="bg-white border border-[#D9DDD4] rounded-[20px] p-5 space-y-3">
            <h3 className="text-[16px] font-semibold text-[#171916]">最近门店销售单 / 草稿</h3>
            <div className="space-y-2.5">
              {(recentOrders?.items ?? []).map((ord) => (
                <div
                  key={ord.id}
                  className="p-3 rounded-xl bg-[#F8F9F5] border border-[#E5E8E0] flex items-center justify-between gap-3 text-[14px]"
                >
                  <div className="min-w-0">
                    <div className="font-mono font-medium text-[#171916]">{ord.orderNo}</div>
                    <div className="text-[#5F645D] truncate">
                      {ord.customerName} · 导购 {ord.guideName} · {formatDateTime(ord.createdAt)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-semibold tabular-nums text-[#171916]">
                      {formatCurrency(ord.payableAmount)}
                    </div>
                    <div className="mt-0.5">
                      <StatusLabel
                        tone={ord.status === 'completed_demo' ? 'success' : 'processing'}
                        label={
                          ord.status === 'draft'
                            ? '草稿'
                            : ord.status === 'pending_pickup'
                              ? '待取镜'
                              : '已完成(演示)'
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <PaginationBar
              compact
              className="-mx-5 -mb-5 rounded-b-[20px]"
              total={recentOrders?.total ?? 0}
              page={ordersPage}
              pageSize={ordersPageSize}
              unit="单"
              onPageChange={setOrdersPage}
              onPageSizeChange={(next) => {
                setOrdersPageSize(next);
                setOrdersPage(1);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
