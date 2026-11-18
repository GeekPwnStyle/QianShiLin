import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Select } from './Select';

export const DEFAULT_PAGE_SIZE_OPTIONS = [10, 50, 100] as const;

export type PageToken =
  | number
  | { type: 'ellipsis'; key: 'left' | 'right'; targetPage: number };

export function buildPageTokens(
  currentPage: number,
  totalPages: number,
  compact = false
): PageToken[] {
  const total = Math.max(1, totalPages);
  const current = Math.min(Math.max(1, currentPage), total);
  if (total <= (compact ? 6 : 8)) {
    return Array.from({ length: total }, (_, idx) => idx + 1);
  }

  const pages = new Set<number>();
  pages.add(1);
  pages.add(total);
  if (!compact) {
    pages.add(total - 1);
  }

  if (current <= 4) {
    const end = Math.min(total, current === 4 ? 5 : 4);
    for (let p = 1; p <= end; p += 1) {
      pages.add(p);
    }
  } else if (current >= total - 3) {
    const start = Math.max(1, current === total - 3 ? total - 4 : total - 3);
    for (let p = start; p <= total; p += 1) {
      pages.add(p);
    }
    if (!compact) {
      pages.add(2);
    }
  } else {
    pages.add(current - 1);
    pages.add(current);
    pages.add(current + 1);
  }

  const sorted = Array.from(pages).sort((a, b) => a - b);
  const tokens: PageToken[] = [];
  for (let i = 0; i < sorted.length; i += 1) {
    const p = sorted[i];
    if (i > 0) {
      const prev = sorted[i - 1];
      if (p - prev === 2) {
        tokens.push(prev + 1);
      } else if (p - prev > 2) {
        tokens.push({
          type: 'ellipsis',
          key: p <= current ? 'left' : 'right',
          targetPage:
            p <= current
              ? Math.max(1, current - 3)
              : Math.min(total, current + 3),
        });
      }
    }
    tokens.push(p);
  }
  return tokens;
}

export interface PaginationBarProps {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: readonly number[];
  unit?: string;
  summaryExtra?: React.ReactNode;
  compact?: boolean;
  className?: string;
}

export const PaginationBar: React.FC<PaginationBarProps> = ({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  unit = '条记录',
  summaryExtra,
  compact = false,
  className = '',
}) => {
  const safePageSize = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIdx = total === 0 ? 0 : (safePage - 1) * safePageSize + 1;
  const endIdx = Math.min(total, safePage * safePageSize);
  const tokens = buildPageTokens(safePage, totalPages, compact);

  const normalizedOptions = pageSizeOptions.includes(safePageSize)
    ? [...pageSizeOptions]
    : [...pageSizeOptions, safePageSize].sort((a, b) => a - b);

  const navBtnBase = compact
    ? 'inline-flex items-center justify-center gap-1 h-8 px-2.5 rounded-[8px] border border-[#D9DDD4] bg-white text-[13px] text-[#171916] hover:bg-[#F8F9F5] disabled:opacity-45 disabled:pointer-events-none cursor-pointer transition-colors'
    : 'inline-flex items-center justify-center gap-1 h-8 px-3 rounded-[9px] border border-[#D9DDD4] bg-white text-[13px] text-[#171916] hover:bg-[#F8F9F5] disabled:opacity-45 disabled:pointer-events-none cursor-pointer transition-colors';

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 border-t border-[#E5E8E0] bg-white text-[#5F645D] ${
        compact ? 'px-3 py-2.5 text-[13px]' : 'px-5 py-3.5 text-[14px]'
      } ${className}`}
    >
      {/* Bottom-left: Page size selector + range/total summary */}
      <div className="flex flex-wrap items-center gap-2.5 tabular-nums">
        {onPageSizeChange && (
          <Select
            ariaLabel="每页显示条数"
            variant="compact"
            align="left"
            menuMinWidth={112}
            buttonClassName="!h-8 !text-[13px] !rounded-[8px]"
            value={String(safePageSize)}
            onChange={(nextVal) => {
              const nextSize = Number.parseInt(nextVal, 10);
              if (Number.isFinite(nextSize) && nextSize > 0 && nextSize !== safePageSize) {
                onPageSizeChange(nextSize);
              }
            }}
            options={normalizedOptions.map((size) => ({
              value: String(size),
              label: `${size} 条/页`,
            }))}
          />
        )}
        <span aria-live="polite">
          第 {startIdx}–{endIdx} 条 · 共 <strong className="font-semibold text-[#171916]">{total}</strong> {unit}
        </span>
        {summaryExtra && (
          <>
            <span className="text-[#D9DDD4]" aria-hidden="true">|</span>
            {summaryExtra}
          </>
        )}
      </div>

      {/* Bottom-right: Dynamic total pages + Prev + Numbered Ellipsis Pages + Next */}
      <nav aria-label="分页导航" className="flex flex-wrap items-center justify-end gap-1.5 tabular-nums">
        <span className="mr-1 text-[13px] text-[#73796F]">
          共 <strong className="font-semibold text-[#171916]">{totalPages}</strong> 页
        </span>

        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          aria-label="上一页"
          className={navBtnBase}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>上一页</span>
        </button>

        <div className="flex items-center gap-1">
          {tokens.map((token) => {
            if (typeof token !== 'number') {
              return (
                <button
                  key={`ellipsis-${token.key}`}
                  type="button"
                  onClick={() => onPageChange(token.targetPage)}
                  title={token.key === 'left' ? '向前跳转 3 页' : '向后跳转 3 页'}
                  aria-label={token.key === 'left' ? '向前跳转多页' : '向后跳转多页'}
                  className="inline-flex items-center justify-center min-w-[30px] h-8 px-1.5 rounded-[8px] text-[13px] text-[#73796F] hover:bg-[#F8F9F5] hover:text-[#171916] cursor-pointer transition-colors"
                >
                  ···
                </button>
              );
            }

            const isActive = token === safePage;
            return (
              <button
                key={token}
                type="button"
                onClick={() => {
                  if (!isActive) onPageChange(token);
                }}
                aria-current={isActive ? 'page' : undefined}
                aria-label={`第 ${token} 页`}
                className={`inline-flex items-center justify-center min-w-[32px] h-8 px-2 rounded-[8px] border text-[13px] cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-[var(--qsl-nav-active-bg)] text-[var(--qsl-nav-active-ink)] border-[var(--qsl-nav-active-bg)] font-semibold'
                    : 'bg-white border-[#D9DDD4] text-[#171916] hover:bg-[#F8F9F5]'
                }`}
              >
                {token}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          aria-label="下一页"
          className={navBtnBase}
        >
          <span>下一页</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </nav>
    </div>
  );
};
