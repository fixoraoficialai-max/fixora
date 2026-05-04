import { NextResponse } from "next/server";

type ApiSuccessResponse<T> = {
  success: true;
  data: T;
};

type ApiErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export function apiSuccess<T>(data: T, status = 200): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiError(
  code: string,
  message: string,
  status = 400,
  details?: unknown
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: { code, message, ...(details ? { details } : {}) },
    },
    { status }
  );
}

export const ApiErrors = {
  unauthorized: () => apiError("UNAUTHORIZED", "Authentication required", 401),
  forbidden: () => apiError("FORBIDDEN", "You do not have permission to perform this action", 403),
  notFound: (resource = "Resource") => apiError("NOT_FOUND", `${resource} not found`, 404),
  validation: (details: unknown) => apiError("VALIDATION_ERROR", "Invalid input", 400, details),
  internal: (message = "An unexpected error occurred") => apiError("INTERNAL_ERROR", message, 500),
  conflict: (message: string) => apiError("CONFLICT", message, 409),
  tooManyRequests: () => apiError("RATE_LIMITED", "Too many requests", 429),
  insufficientCredits: () =>
    apiError("INSUFFICIENT_CREDITS", "Not enough credits to perform this action", 402),
} as const;
