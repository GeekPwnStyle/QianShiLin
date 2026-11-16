import type { DecimalMoneyString } from '@/src/shared/types/common';

export type DeliveryMethod = 'in_store_pickup' | 'express_delivery' | 'store_transfer_pickup';

export interface SalesLineItem {
  id: string;
  productId: string;
  skuCode: string;
  productName: string;
  categoryName: string;
  specLabel: string;
  quantity: number;
  unitPrice: DecimalMoneyString;
  discountRate: number; // 0.1 - 1.0
  lineAmount: DecimalMoneyString;
  eyeSide?: 'OD' | 'OS' | 'BOTH' | 'NONE';
}

export interface SalesOrderDraft {
  id: string;
  orderNo: string;
  storeId: string;
  storeName: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  guideName: string;
  optometristName: string;
  items: SalesLineItem[];
  subtotalAmount: DecimalMoneyString;
  discountAmount: DecimalMoneyString;
  payableAmount: DecimalMoneyString;
  deliveryMethod: DeliveryMethod;
  remark: string;
  status: 'draft' | 'pending_pickup' | 'completed_demo';
  createdAt: string;
}

export function calculateOrderTotals(items: SalesLineItem[]): {
  subtotal: DecimalMoneyString;
  discount: DecimalMoneyString;
  payable: DecimalMoneyString;
} {
  let subtotalCents = 0;
  let payableCents = 0;
  for (const item of items) {
    const unitCents = Math.round(Number.parseFloat(item.unitPrice || '0') * 100);
    const gross = unitCents * item.quantity;
    const net = Math.round(gross * item.discountRate);
    subtotalCents += gross;
    payableCents += net;
  }
  const discountCents = Math.max(0, subtotalCents - payableCents);
  return {
    subtotal: (subtotalCents / 100).toFixed(2),
    discount: (discountCents / 100).toFixed(2),
    payable: (payableCents / 100).toFixed(2),
  };
}
