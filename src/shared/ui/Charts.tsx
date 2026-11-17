import React, { useState } from 'react';

export interface LineSeriesPoint {
  label: string;
  primary: number;
  secondary?: number;
}

interface ThinLineChartProps {
  data: LineSeriesPoint[];
  primaryLabel: string;
  secondaryLabel?: string;
  valueFormatter?: (v: number) => string;
  height?: number;
}

export const ThinLineChart: React.FC<ThinLineChartProps> = ({
  data,
  primaryLabel,
  secondaryLabel,
  valueFormatter = (v) => v.toLocaleString('zh-CN'),
  height = 220,
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  if (data.length === 0) return null;

  const width = 640;
  const padLeft = 44;
  const padRight = 18;
  const padTop = 18;
  const padBottom = 30;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const allValues = data.flatMap((d) =>
    d.secondary !== undefined ? [d.primary, d.secondary] : [d.primary]
  );
  const maxVal = Math.max(...allValues, 1) * 1.12;
  const minVal = 0;

  const getX = (idx: number) =>
    data.length === 1 ? padLeft + chartW / 2 : padLeft + (idx / (data.length - 1)) * chartW;
  const getY = (val: number) =>
    padTop + chartH - ((val - minVal) / (maxVal - minVal || 1)) * chartH;

  const primaryPath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(d.primary).toFixed(1)}`)
    .join(' ');

  const secondaryPath =
    secondaryLabel && data.every((d) => d.secondary !== undefined)
      ? data
          .map(
            (d, i) =>
              `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(d.secondary ?? 0).toFixed(1)}`
          )
          .join(' ')
      : '';

  const gridTicks = [0, 0.33, 0.66, 1];
  const hovered = hoverIdx !== null ? data[hoverIdx] : null;

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 text-[14px] text-[#5F645D]">
        <div className="flex items-center gap-5">
          <span className="inline-flex items-center gap-2">
            <span className="inline-block w-4 h-[2px] bg-[#171916]" aria-hidden="true" />
            <span className="text-[#171916] font-medium">{primaryLabel}</span>
          </span>
          {secondaryLabel && secondaryPath && (
            <span className="inline-flex items-center gap-2">
              <span
                className="inline-block w-4 h-[2px] border-t-2 border-dashed border-[#8E9489]"
                aria-hidden="true"
              />
              <span>{secondaryLabel}</span>
            </span>
          )}
        </div>
        {hovered ? (
          <div className="tabular-nums text-[14px] text-[var(--qsl-accent-ink)] bg-[var(--qsl-accent)] px-3 py-0.5 rounded-full font-medium">
            {hovered.label} · {primaryLabel}: {valueFormatter(hovered.primary)}
            {hovered.secondary !== undefined && secondaryLabel
              ? ` · ${secondaryLabel}: ${valueFormatter(hovered.secondary)}`
              : ''}
          </div>
        ) : (
          <span className="text-[#73796F]">悬停节点查看精确数值</span>
        )}
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible select-none"
        role="img"
        aria-label={`${primaryLabel}趋势折线图`}
      >
        {gridTicks.map((ratio, idx) => {
          const y = padTop + chartH * (1 - ratio);
          const tickVal = Math.round(maxVal * ratio);
          return (
            <g key={idx}>
              <line
                x1={padLeft}
                y1={y}
                x2={width - padRight}
                y2={y}
                stroke="#E5E8E0"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <text
                x={padLeft - 8}
                y={y + 4}
                textAnchor="end"
                fill="#73796F"
                fontSize="12"
                className="tabular-nums"
              >
                {tickVal >= 10000 ? `${(tickVal / 10000).toFixed(1)}w` : tickVal}
              </text>
            </g>
          );
        })}

        {secondaryPath && (
          <path
            d={secondaryPath}
            fill="none"
            stroke="#9CA198"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
        )}

        <path d={primaryPath} fill="none" stroke="#171916" strokeWidth="2" />

        {data.map((d, idx) => {
          const cx = getX(idx);
          const cy = getY(d.primary);
          const isActive = hoverIdx === idx;
          const showLabel = idx === 0 || idx === data.length - 1 || idx % Math.ceil(data.length / 5) === 0;
          return (
            <g key={d.label}>
              {isActive && (
                <line
                  x1={cx}
                  y1={padTop}
                  x2={cx}
                  y2={padTop + chartH}
                  stroke="#D9DDD4"
                  strokeWidth="1"
                />
              )}
              <circle
                cx={cx}
                cy={cy}
                r={isActive ? 5.5 : 3}
                fill={isActive ? 'var(--qsl-accent)' : 'var(--qsl-brand-dark)'}
                stroke="var(--qsl-brand-dark)"
                strokeWidth={isActive ? 1.5 : 0}
              />
              {showLabel && (
                <text
                  x={cx}
                  y={height - 8}
                  textAnchor="middle"
                  fill="#73796F"
                  fontSize="12"
                  className="tabular-nums"
                >
                  {d.label}
                </text>
              )}
              <rect
                x={cx - chartW / data.length / 2}
                y={padTop}
                width={Math.max(chartW / data.length, 16)}
                height={chartH}
                fill="transparent"
                onMouseEnter={() => setHoverIdx(idx)}
                onMouseLeave={() => setHoverIdx(null)}
                className="cursor-crosshair"
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export interface BarItem {
  label: string;
  value: number;
  highlight?: boolean;
  meta?: string;
}

export const RoundedBarChart: React.FC<{
  data: BarItem[];
  unit?: string;
  valueFormatter?: (v: number) => string;
  height?: number;
}> = ({ data, unit = '', valueFormatter = (v) => v.toLocaleString('zh-CN'), height = 190 }) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  if (data.length === 0) return null;

  const maxVal = Math.max(...data.map((d) => d.value), 1);

  return (
    <div>
      <div className="flex items-center justify-between text-[14px] text-[#5F645D] mb-3">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[var(--qsl-accent)] border border-[var(--qsl-accent-border)]" />
            <span className="text-[#171916]">重点项</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[var(--qsl-brand-dark)]" />
            <span>常规项</span>
          </span>
        </div>
        {hoverIdx !== null ? (
          <span className="tabular-nums text-[#171916] font-medium">
            {data[hoverIdx].label}: {valueFormatter(data[hoverIdx].value)}
            {unit}
          </span>
        ) : (
          <span className="text-[#73796F]">悬停柱体查看明细</span>
        )}
      </div>

      <div
        className="flex items-end gap-3 border-b border-[#E5E8E0] pt-4 pb-1"
        style={{ height }}
      >
        {data.map((item, idx) => {
          const pct = Math.max((item.value / maxVal) * 100, 8);
          const active = hoverIdx === idx;
          return (
            <div
              key={item.label}
              className="flex-1 flex flex-col items-center justify-end h-full group cursor-pointer"
              onMouseEnter={() => setHoverIdx(idx)}
              onMouseLeave={() => setHoverIdx(null)}
            >
              <div className="w-full flex justify-center items-end flex-1 pb-2">
                <div
                  style={{ height: `${pct}%` }}
                  className={`w-full max-w-[26px] rounded-t-full transition-opacity ${
                    item.highlight
                      ? 'bg-[var(--qsl-accent)] border border-[var(--qsl-accent-border)]'
                      : active
                        ? 'bg-[var(--qsl-brand-dark-hover)]'
                        : 'bg-[var(--qsl-brand-dark)]'
                  }`}
                />
              </div>
              <span className="text-[13px] text-[#5F645D] truncate max-w-full text-center">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export interface DotMatrixCell {
  label: string;
  count: number;
  maxDots?: number;
  highlight?: boolean;
}

export const DotMatrixChart: React.FC<{
  items: DotMatrixCell[];
  unit?: string;
}> = ({ items, unit = '单' }) => {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const maxCount = Math.max(...items.map((i) => i.count), 1);

  return (
    <div className="space-y-3">
      {items.map((item, idx) => {
        const totalDots = item.maxDots ?? 14;
        const filled = Math.max(1, Math.round((item.count / maxCount) * totalDots));
        const isHovered = activeIdx === idx;
        return (
          <div
            key={item.label}
            className="flex items-center justify-between gap-3 py-1"
            onMouseEnter={() => setActiveIdx(idx)}
            onMouseLeave={() => setActiveIdx(null)}
          >
            <span className="text-[14px] text-[#5F645D] w-28 truncate shrink-0">
              {item.label}
            </span>
            <div className="flex items-center gap-1 flex-1" aria-hidden="true">
              {Array.from({ length: totalDots }).map((_, dotIdx) => {
                const on = dotIdx < filled;
                return (
                  <span
                    key={dotIdx}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      on
                        ? item.highlight
                          ? 'bg-[var(--qsl-accent)] ring-1 ring-[var(--qsl-accent-border)]'
                          : isHovered
                            ? 'bg-[var(--qsl-brand-dark)]'
                            : 'bg-[#3A3E37]'
                        : 'bg-[#E5E8E0]'
                    }`}
                  />
                );
              })}
            </div>
            <span className="text-[14px] font-medium text-[#171916] tabular-nums w-20 text-right shrink-0">
              {item.count} {unit}
            </span>
          </div>
        );
      })}
    </div>
  );
};
