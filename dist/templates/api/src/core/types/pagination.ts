export type PaginationInput = {
  page: number;
  limit: number;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export function createPaginationMeta(
  input: PaginationInput,
  total: number
): PaginationMeta {
  return {
    page: input.page,
    limit: input.limit,
    total,
    totalPages:
      total === 0
        ? 0
        : Math.ceil(total / input.limit)
  };
}
