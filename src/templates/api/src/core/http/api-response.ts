export type ApiSuccessResponse<T> = {
  data: T;
  meta?: Record<string, unknown>;
};

export function successResponse<T>(
  data: T,
  meta?: Record<string, unknown>
): ApiSuccessResponse<T> {
  return meta
    ? {
        data,
        meta
      }
    : {
        data
      };
}
