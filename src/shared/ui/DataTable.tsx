import React, { useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Columns3 } from 'lucide-react';
import { Button } from './Button';

export interface TableColumn<T> {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
  sticky?: boolean;
  defaultVisible?: boolean;
  render: (row: T) => React.ReactNode;
}

interface DataTableProps<T extends { id: string }> {
  columns: TableColumn<T>[];
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (key: string) => void;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  showColumnSettings?: boolean;
  extraToolbar?: React.ReactNode;
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  total,
  page,
  pageSize,
  onPageChange,
  sortBy,
  sortOrder,
  onSortChange,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  showColumnSettings = true,
  extraToolbar,
}: DataTableProps<T>) {
  const [hiddenCols, setHiddenCols] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const c of columns) {
      if (c.defaultVisible === false) initial[c.key] = true;
    }
    return initial;
  });
  const [colMenuOpen, setColMenuOpen] = useState(false);

  const visibleColumns = columns.filter((c) => !hiddenCols[c.key]);
  const allOnPageSelected =
    rows.length > 0 && rows.every((r) => selectedIds.includes(r.id));

  const toggleAll = () => {
    if (!onSelectionChange) return;
    if (allOnPageSelected) {
      const pageIdSet = new Set(rows.map((r) => r.id));
      onSelectionChange(selectedIds.filter((id) => !pageIdSet.has(id)));
    } else {
      const merged = Array.from(new Set([...selectedIds, ...rows.map((r) => r.id)]));
      onSelectionChange(merged);
    }
  };

  const toggleRow = (id: string) => {
    if (!onSelectionChange) return;
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((x) => x !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startIdx = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIdx = Math.min(total, page * pageSize);

  return (
    <div className="bg-white border border-[#D9DDD4] rounded-[20px] overflow-hidden">
      {(selectable || showColumnSettings || extraToolbar) && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-[#E5E8E0] bg-[#F8F9F5]">
          <div className="flex items-center gap-3 text-[15px] text-[#5F645D]">
            {selectable && (
              <span className="tabular-nums">
                已选择 <strong className="font-semibold text-[#171916]">{selectedIds.length}</strong> 项
                {selectedIds.length > 0 && onSelectionChange && (
                  <button
                    type="button"
                    onClick={() => onSelectionChange([])}
                    className="ml-2 text-[#171916] underline underline-offset-2 cursor-pointer"
                  >
                    清空选择
                  </button>
                )}
              </span>
            )}
            {extraToolbar}
          </div>

          {showColumnSettings && (
            <div className="relative">
              <Button
                size="sm"
                variant="secondary"
                icon={<Columns3 className="w-3.5 h-3.5" />}
                onClick={() => setColMenuOpen((prev) => !prev)}
              >
                列设置
              </Button>
              {colMenuOpen && (
                <div className="absolute right-0 mt-2 w-60 bg-white border border-[#D9DDD4] rounded-2xl shadow-lg p-3 z-30">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E5E8E0]">
                    <span className="text-[14px] font-semibold text-[#171916]">显示列配置</span>
                    <button
                      type="button"
                      onClick={() => setColMenuOpen(false)}
                      className="text-[14px] text-[#5F645D] hover:text-[#171916] cursor-pointer"
                    >
                      完成
                    </button>
                  </div>
                  <div className="max-h-60 overflow-y-auto qsl-scroll space-y-1.5">
                    {columns.map((col) => {
                      const checked = !hiddenCols[col.key];
                      return (
                        <label
                          key={col.key}
                          className="flex items-center gap-2 text-[15px] text-[#171916] py-1 px-1.5 rounded hover:bg-[#F8F9F5] cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={col.sticky}
                            onChange={() =>
                              setHiddenCols((prev) => ({
                                ...prev,
                                [col.key]: checked,
                              }))
                            }
                            className="accent-[#171916]"
                          />
                          <span className="truncate">{col.header}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="overflow-x-auto qsl-scroll">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-[#E5E8E0] bg-[#F8F9F5]/70">
              {selectable && (
                <th className="w-11 px-4 py-3 text-center sticky left-0 bg-[#F8F9F5] z-10">
                  <input
                    type="checkbox"
                    aria-label="全选本页"
                    checked={allOnPageSelected}
                    onChange={toggleAll}
                    className="accent-[#171916] w-4 h-4 cursor-pointer"
                  />
                </th>
              )}
              {visibleColumns.map((col, idx) => {
                const isSorted = sortBy === col.key;
                const alignClass =
                  col.align === 'right'
                    ? 'text-right'
                    : col.align === 'center'
                      ? 'text-center'
                      : 'text-left';
                const stickyClass =
                  col.sticky && idx === 0
                    ? `sticky ${selectable ? 'left-11' : 'left-0'} bg-[#F8F9F5] z-10`
                    : '';
                return (
                  <th
                    key={col.key}
                    style={col.width ? { minWidth: col.width } : undefined}
                    className={`px-4 py-3.5 text-[14px] font-semibold text-[#5F645D] whitespace-nowrap ${alignClass} ${stickyClass}`}
                  >
                    {col.sortable && onSortChange ? (
                      <button
                        type="button"
                        onClick={() => onSortChange(col.key)}
                        className="inline-flex items-center gap-1 hover:text-[#171916] cursor-pointer"
                      >
                        <span>{col.header}</span>
                        {isSorted ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-[#171916]" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-[#171916]" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-45" />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E8E0]">
            {rows.map((row) => {
              const checked = selectedIds.includes(row.id);
              return (
                <tr
                  key={row.id}
                  className={`h-[50px] transition-colors ${
                    checked ? 'bg-[var(--qsl-accent-soft-35)]' : 'hover:bg-[#F8F9F5]'
                  }`}
                >
                  {selectable && (
                    <td className="w-11 px-4 py-2 text-center sticky left-0 bg-white z-10">
                      <input
                        type="checkbox"
                        aria-label={`选择行 ${row.id}`}
                        checked={checked}
                        onChange={() => toggleRow(row.id)}
                        className="accent-[#171916] w-4 h-4 cursor-pointer"
                      />
                    </td>
                  )}
                  {visibleColumns.map((col, idx) => {
                    const alignClass =
                      col.align === 'right'
                        ? 'text-right tabular-nums'
                        : col.align === 'center'
                          ? 'text-center'
                          : 'text-left';
                    const stickyClass =
                      col.sticky && idx === 0
                        ? `sticky ${selectable ? 'left-11' : 'left-0'} bg-white z-10`
                        : '';
                    return (
                      <td
                        key={col.key}
                        className={`px-4 py-2.5 text-[15px] text-[#171916] whitespace-nowrap ${alignClass} ${stickyClass}`}
                      >
                        {col.render(row)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-t border-[#E5E8E0] bg-white text-[15px] text-[#5F645D]">
        <div className="tabular-nums">
          第 {startIdx}–{endIdx} 条 · 共 {total} 条记录
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            icon={<ChevronLeft className="w-3.5 h-3.5" />}
          >
            上一页
          </Button>
          <span className="px-2 tabular-nums text-[14px] text-[#171916]">
            {page} / {totalPages}
          </span>
          <Button
            size="sm"
            variant="secondary"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            <span>下一页</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
