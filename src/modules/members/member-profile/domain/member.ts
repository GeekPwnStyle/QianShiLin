import type { DecimalMoneyString } from '@/src/shared/types/common';

export type MemberTier = '银卡会员' | '金卡会员' | '黑卡会员' | '青少年护眼会员';

export interface MemberConsumptionItem {
  id: string;
  orderNo: string;
  date: string;
  storeName: string;
  itemsSummary: string;
  amount: DecimalMoneyString;
  guideName: string;
}

export interface MemberVisionSnapshot {
  id: string;
  examDate: string;
  optometrist: string;
  odSph: string;
  odCyl: string;
  odAxis: string;
  osSph: string;
  osCyl: string;
  osAxis: string;
  pdMm: string;
  note: string;
}

export interface MemberProfile {
  id: string;
  memberNo: string;
  name: string;
  gender: '男' | '女';
  age: number;
  phone: string;
  tier: MemberTier;
  storeId: string;
  storeName: string;
  guideName: string;
  pointsBalance: number;
  storedValueBalance: DecimalMoneyString;
  totalSpent: DecimalMoneyString;
  visitCount: number;
  lastVisitDate: string;
  nextReviewDate: string;
  tags: string[];
  consumptions: MemberConsumptionItem[];
  visionRecords: MemberVisionSnapshot[];
  appointments: Array<{ id: string; date: string; type: string; status: string }>;
  followupLogs: Array<{ id: string; date: string; channel: string; summary: string }>;
}
