export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export function parsePaginationParams(
  params: PaginationParams,
  defaultLimit = 25,
  maxLimit = 100
): { page: number; limit: number; skip: number } {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.max(1, Math.min(Number(params.limit) || defaultLimit, maxLimit));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function calculatePaginationMeta(
  total: number,
  page: number,
  limit: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit) || 1;
  const currentPage = Math.max(1, Math.min(page, totalPages));
  return {
    page: currentPage,
    limit,
    total,
    totalPages,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
  };
}
