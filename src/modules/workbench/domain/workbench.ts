import type { IdentityType } from '@/src/modules/auth/domain/identity';
import type { DecimalMoneyString } from '@/src/shared/types/common';
import type { BarItem, DotMatrixCell, LineSeriesPoint } from '@/src/shared/ui/Charts';

export type WorkbenchTimeRange = 'today' | 'week' | 'month' | 'year';

export interface WorkReminderItem {
  id: string;
  label: string;
  count: number;
  unit: string;
  targetRoute: string;
  urgent?: boolean;
}

export interface QualificationAlertItem {
  id: string;
  title: string;
  entityName: string;
  expiryDate: string;
  daysLeft: number;
  severity: 'warning' | 'error' | 'processing';
  targetRoute: string;
}

export interface WorkbenchSnapshot {
  identityType: IdentityType;
  greetingName: string;
  subtitle: string;
  scopeLabel: string;
  primaryMetrics: Array<{
    label: string;
    value: string;
    deltaText: string;
    hint: string;
  }>;
  focusHighlightCard: {
    kicker: string;
    title: string;
    metricValue: string;
    progressPercent: number;
    caption: string;
  };
  secondaryDarkCard: {
    kicker: string;
    title: string;
    metricValue: string;
    subLines: Array<{ label: string; value: DecimalMoneyString | string }>;
  };
  trendTitle: string;
  trendSubtitle: string;
  trendSeries: LineSeriesPoint[];
  trendPrimaryLabel: string;
  trendSecondaryLabel: string;
  brandRankingTitle: string;
  brandRanking: BarItem[];
  productRankingTitle: string;
  productRanking: DotMatrixCell[];
  workReminders: WorkReminderItem[];
  qualificationAlerts: QualificationAlertItem[];
}
