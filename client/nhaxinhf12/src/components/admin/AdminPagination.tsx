import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import type { PaginationState } from '../../hooks/usePagination';

interface AdminPaginationProps<T = unknown> {
  pagination: PaginationState<T>;
  pageSizeOptions?: number[];
  itemLabel?: string;
  compact?: boolean;
}

export const AdminPagination = <T,>({
  pagination,
  pageSizeOptions = [5, 10, 20, 50],
  itemLabel = 'mục',
  compact = false,
}: AdminPaginationProps<T>): React.ReactElement | null => {
  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalItems,
    totalPages,
    startIndex,
    endIndex,
  } = pagination;

  if (totalItems === 0) return null;

  // Build visible page numbers around currentPage
  const getPageNumbers = () => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }
    pages.push(1);
    if (currentPage > 3) pages.push('...');
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
    return pages;
  };

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 bg-stone-50/60 ${
        compact ? 'px-3 py-2.5 text-xs' : 'px-5 py-3.5 text-xs'
      }`}
    >
      <div className="flex flex-wrap items-center gap-3 text-stone-600">
        <span>
          Hiển thị <strong className="font-semibold text-stone-900">{startIndex}</strong> –{' '}
          <strong className="font-semibold text-stone-900">{endIndex}</strong> trên tổng{' '}
          <strong className="font-semibold text-stone-900">{totalItems}</strong> {itemLabel}
        </span>
        {!compact && (
          <div className="flex items-center gap-1.5">
            <span className="text-stone-400">|</span>
            <label className="text-stone-500">Số dòng:</label>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs font-medium text-stone-700 outline-none focus:border-amber-500"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size} / trang
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setCurrentPage(1)}
          disabled={currentPage <= 1}
          title="Trang đầu"
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-600 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronsLeft className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setCurrentPage(currentPage - 1)}
          disabled={currentPage <= 1}
          title="Trang trước"
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-600 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>

        {getPageNumbers().map((p, idx) =>
          p === '...' ? (
            <span key={`ellipsis-${idx}`} className="px-1.5 text-stone-400">
              ...
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => setCurrentPage(p)}
              className={`flex h-7 min-w-[28px] items-center justify-center rounded-lg px-2 text-xs font-semibold transition ${
                p === currentPage
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'border border-stone-200 bg-white text-stone-700 hover:bg-stone-100'
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => setCurrentPage(currentPage + 1)}
          disabled={currentPage >= totalPages}
          title="Trang sau"
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-600 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setCurrentPage(totalPages)}
          disabled={currentPage >= totalPages}
          title="Trang cuối"
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-600 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronsRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

