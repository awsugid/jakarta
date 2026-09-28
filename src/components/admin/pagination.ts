export const PAGE_SIZE = 50;

export type PaginationState = {
  page: number;
  /** 1-based index of first shown item; 0 when page empty. */
  from: number;
  /** 1-based index of last shown item. */
  to: number;
  /** Stringified total when server reported one, else null. */
  totalLabel: string | null;
  hasPrev: boolean;
  hasNext: boolean;
};

export function computePagination({
  total,
  itemCount,
  offset,
  limit = PAGE_SIZE,
}: {
  total: number | null;
  itemCount: number;
  offset: number;
  limit?: number;
}): PaginationState {
  const page = Math.floor(offset / limit) + 1;
  const hasPrev = offset > 0;
  // Unknown total: a full page is the only signal another page may exist.
  const hasNext =
    total != null ? offset + itemCount < total : itemCount === limit;
  const from = itemCount === 0 ? 0 : offset + 1;
  const to = offset + itemCount;
  return {
    page,
    from,
    to,
    totalLabel: total != null ? String(total) : null,
    hasPrev,
    hasNext,
  };
}

export function paginationSummary(state: PaginationState): string {
  if (state.from === 0) return "No responses on this page";
  return state.totalLabel != null
    ? `Showing ${state.from}–${state.to} of ${state.totalLabel}`
    : `Showing ${state.from}–${state.to}`;
}
