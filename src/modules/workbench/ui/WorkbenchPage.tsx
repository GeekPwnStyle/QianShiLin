import React, { useEffect, useState } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, AlertTriangle, CalendarClock, ShieldAlert } from 'lucide-react';
import { appRepositories } from '@/src/app/composition/container';
import { useAuth } from '@/src/modules/auth/application/AuthContext';
import { useNavigation } from '@/src/modules/navigation/application/NavigationContext';
import type { WorkbenchTimeRange } from '@/src/modules/workbench/domain/workbench';
import { DotMatrixChart, RoundedBarChart, ThinLineChart } from '@/src/shared/ui/Charts';
import { HelpTooltip } from '@/src/shared/ui/HelpTooltip';
import { ErrorState, LoadingSkeleton } from '@/src/shared/ui/StateViews';
import { StatusLabel } from '@/src/shared/ui/StatusLabel';

const TIME_RANGES: Array<{ key: WorkbenchTimeRange; label: string }> = [
  { key: 'today', label: '今天' },
  { key: 'week', label: '本周' },
  { key: 'month', label: '本月' },
  { key: 'year', label: '本年' },
];

export const WorkbenchPage: React.FC = () => {
  const { session, dataScope } = useAuth();
  const { navigateToRoute } = useNavigation();
  const queryClient = useQueryClient();
  const [timeRange, setTimeRange] = useState<WorkbenchTimeRange>('today');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['workbench', timeRange, session.currentStoreId, session.roleId],
    queryFn: () =>
      appRepositories.workbench.getSnapshot(timeRange, session.currentStoreId, dataScope),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  useEffect(() => {
    for (const tr of TIME_RANGES) {
      if (tr.key === timeRange) continue;
      void queryClient.prefetchQuery({
        queryKey: ['workbench', tr.key, session.currentStoreId, session.roleId],
        queryFn: () =>
          appRepositories.workbench.getSnapshot(tr.key, session.currentStoreId, dataScope),
        staleTime: 60_000,
      });
    }
  }, [queryClient, session.currentStoreId, session.roleId, dataScope, timeRange]);

  if (isLoading && !data) return <LoadingSkeleton rows={6} />;
  if (isError || !data) return <ErrorState onRetry={() => void refetch()} />;

  return (
    <div className="space-y-7">
      {/* Top Editorial Greeting & Time Range Capsule */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-5 border-b border-[#D9DDD4]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[34px] sm:text-[38px] font-semibold tracking-tight text-[#171916] leading-tight">
              {session.displayName ? `上午好，${session.displayName}` : data.greetingName}
            </h1>
            <HelpTooltip
              title="工作台范围说明"
              content={`${data.subtitle}\n当前数据范围：${data.scopeLabel}`}
              ariaLabel="查看工作台说明"
            />
          </div>
          <p className="mt-1 text-[15px] text-[#73796F]">
            {data.scopeLabel}
          </p>
        </div>

        <div
          role="group"
          aria-label="统计时间范围"
          className="inline-flex items-center p-1 rounded-full bg-[#EAECE6] border border-[#D9DDD4]"
        >
          {TIME_RANGES.map((tr) => {
            const active = timeRange === tr.key;
            return (
              <button
                key={tr.key}
                type="button"
                onClick={() => setTimeRange(tr.key)}
                className={`h-9 px-4 rounded-full text-[15px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-[#171916] text-white'
                    : 'text-[#5F645D] hover:text-[#171916]'
                }`}
              >
                {tr.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main 2/3 Left + 1/3 Right Asymmetric Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-7 items-start">
        {/* Left ~2/3 Column */}
        <div className="xl:col-span-8 space-y-7">
          {/* Open-Air 4 KPI Strip separated by hairline dividers */}
          <div className="bg-white border border-[#D9DDD4] rounded-[22px] p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-[#E5E8E0]">
              {data.primaryMetrics.map((metric, idx) => (
                <div
                  key={metric.label}
                  className={idx > 0 ? 'pt-4 sm:pt-0 sm:pl-6' : ''}
                >
                  <div className="text-[14px] text-[#5F645D]">{metric.label}</div>
                  <div className="mt-2 text-[34px] leading-none font-semibold tracking-tight text-[#171916] tabular-nums">
                    {metric.value}
                  </div>
                  <div className="mt-2.5 text-[14px] font-medium text-[#166534] tabular-nums">
                    {metric.deltaText}
                  </div>
                  <div className="mt-1 text-[13px] text-[#73796F]">{metric.hint}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Trend Thin-Line Chart */}
          <div className="bg-white border border-[#D9DDD4] rounded-[22px] p-6">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-[19px] font-semibold text-[#171916]">{data.trendTitle}</h2>
              {data.trendSubtitle && (
                <HelpTooltip content={data.trendSubtitle} ariaLabel="查看趋势图说明" />
              )}
            </div>
            <ThinLineChart
              data={data.trendSeries}
              primaryLabel={data.trendPrimaryLabel}
              secondaryLabel={data.trendSecondaryLabel}
              valueFormatter={(v) => `¥${v.toLocaleString('zh-CN')}`}
            />
          </div>

          {/* Brand Bar Chart + Product Dot-Matrix Ranking */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-[#D9DDD4] rounded-[22px] p-6">
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-[18px] font-semibold text-[#171916]">
                  {data.brandRankingTitle}
                </h2>
                <HelpTooltip
                  content="主题高亮柱体表示本期贡献最高品牌"
                  ariaLabel="查看品牌排行说明"
                />
              </div>
              <RoundedBarChart
                data={data.brandRanking}
                valueFormatter={(v) =>
                  data.identityType === 'supplier' ? `${v} 件` : `¥${v.toLocaleString('zh-CN')}`
                }
              />
            </div>

            <div className="bg-white border border-[#D9DDD4] rounded-[22px] p-6">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-[18px] font-semibold text-[#171916]">
                  {data.productRankingTitle}
                </h2>
                <HelpTooltip
                  content="按单品销售或补货频次排列"
                  ariaLabel="查看单品排行说明"
                />
              </div>
              <DotMatrixChart
                items={data.productRanking}
                unit={data.identityType === 'supplier' ? '次' : '副/盒'}
              />
            </div>
          </div>

          {/* Qualification & Expiry Alerts */}
          <div className="bg-white border border-[#D9DDD4] rounded-[22px] p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#B45309]" />
                <h2 className="text-[18px] font-semibold text-[#171916]">
                  资质与效期合规提醒
                </h2>
                <HelpTooltip
                  tone="warning"
                  content="含医疗器械许可证、近效期商品及授权书到期预警"
                  ariaLabel="查看合规提醒说明"
                />
              </div>
            </div>

            <div className="divide-y divide-[#E5E8E0]">
              {data.qualificationAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="py-3 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <span className="text-[16px] font-medium text-[#171916]">{alert.title}</span>
                      <StatusLabel
                        tone={alert.severity}
                        label={`剩余 ${alert.daysLeft} 天`}
                      />
                    </div>
                    <div className="text-[14px] text-[#5F645D] mt-0.5">
                      {alert.entityName} · 到期日期 {alert.expiryDate}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigateToRoute(alert.targetRoute)}
                    className="text-[14px] font-medium text-[#171916] hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>查看台账</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right ~1/3 Column */}
        <div className="xl:col-span-4 space-y-5">
          {/* Theme Focus Metric Card */}
          <div className="bg-[var(--qsl-accent)] text-[var(--qsl-accent-ink)] rounded-[22px] p-6 border border-[var(--qsl-accent-border)]">
            <div className="text-[14px] font-medium opacity-80">
              {data.focusHighlightCard.kicker}
            </div>
            <div className="mt-1 text-[18px] font-semibold">
              {data.focusHighlightCard.title}
            </div>
            <div className="mt-4 text-[44px] leading-none font-semibold tracking-tight tabular-nums">
              {data.focusHighlightCard.metricValue}
            </div>
            <div className="relative mt-4 h-2 w-full rounded-full overflow-hidden">
              <div className="absolute inset-0 bg-[var(--qsl-accent-ink)] opacity-20" />
              <div
                className="relative h-full rounded-full bg-[var(--qsl-accent-ink)]"
                style={{ width: `${data.focusHighlightCard.progressPercent}%` }}
              />
            </div>
            <p className="mt-3 text-[14px] opacity-85 tabular-nums">
              {data.focusHighlightCard.caption}
            </p>
          </div>

          {/* Secondary Dark Metric Card */}
          <div className="bg-[var(--qsl-brand-dark)] text-white rounded-[22px] p-6">
            <div className="text-[14px] text-[#A8B0A0]">
              {data.secondaryDarkCard.kicker}
            </div>
            <div className="mt-1 text-[17px] font-medium">
              {data.secondaryDarkCard.title}
            </div>
            <div className="mt-3 text-[34px] leading-none font-semibold tracking-tight tabular-nums text-[var(--qsl-accent-on-dark)]">
              {data.secondaryDarkCard.metricValue}
            </div>
            <div className="mt-5 pt-4 border-t border-white/15 space-y-2.5 text-[15px]">
              {data.secondaryDarkCard.subLines.map((line) => (
                <div key={line.label} className="flex items-center justify-between gap-2">
                  <span className="text-white/75">{line.label}</span>
                  <span className="font-medium tabular-nums">{line.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Work Reminders List */}
          <div className="bg-white border border-[#D9DDD4] rounded-[22px] p-6">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-[#171916]" />
                <h2 className="text-[18px] font-semibold text-[#171916]">工作提醒</h2>
                <HelpTooltip
                  content="点击下方待办卡片即可直达对应业务页面处理"
                  placement="bottom-end"
                  ariaLabel="查看工作提醒说明"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {data.workReminders.map((rem) => (
                <button
                  key={rem.id}
                  type="button"
                  onClick={() => navigateToRoute(rem.targetRoute)}
                  className="text-left p-3 rounded-2xl border border-[#E5E8E0] bg-[#F8F9F5] hover:bg-white hover:border-[#171916] transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[14px] text-[#5F645D] truncate">{rem.label}</span>
                    {rem.urgent && (
                      <AlertTriangle className="w-4 h-4 text-[#B45309] shrink-0" />
                    )}
                  </div>
                  <div className="mt-1.5 flex items-baseline gap-1">
                    <span className="text-[22px] font-semibold text-[#171916] tabular-nums">
                      {rem.count.toLocaleString('zh-CN')}
                    </span>
                    <span className="text-[13px] text-[#73796F]">{rem.unit}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
