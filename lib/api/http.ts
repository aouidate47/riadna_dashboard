import { session } from "@/lib/auth/session";
import type { ApiErrorCode } from "@/types";
import { ApiError } from "./errors";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

const STATUS_TO_CODE: Record<number, ApiErrorCode> = {
  400: "VALIDATION",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
};

/** Calls platform-api. Sends the session token unless `token` is passed explicitly (needed during login). */
export async function http<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const { token = session.get()?.token, headers, ...rest } = init;
  // For FormData (file uploads) the browser sets the multipart Content-Type itself.
  const isFormData = rest.body instanceof FormData;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...rest,
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });
  } catch {
    throw new Error("Cannot reach the server. Is platform-api running?");
  }

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    // NestJS errors look like { statusCode, message: string | string[], error }
    const message = Array.isArray(body?.message) ? body.message.join(", ") : body?.message ?? res.statusText;
    throw new ApiError(STATUS_TO_CODE[res.status] ?? "VALIDATION", message);
  }

  return body as T;
}
