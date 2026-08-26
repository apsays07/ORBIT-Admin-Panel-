export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: Record<string, any>;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export function successResponse<T>(data: T, meta?: Record<string, any>): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    ...(meta ? { meta } : {}),
  };
}

export function errorResponse(message: string, code = "INTERNAL_ERROR", details?: any): ApiErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  };
}
