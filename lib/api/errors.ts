import type { ApiErrorCode } from "@/types";

export class ApiError extends Error {
  constructor(public code: ApiErrorCode, message: string, public details?: Record<string, unknown>) {
    super(message);
    this.name = "ApiError";
  }
}

export const isApiError = (e: unknown): e is ApiError => e instanceof ApiError;
