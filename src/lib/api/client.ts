  import { getAppNowIso, isAppTimeOverridden } from "@/lib/date-utils";

  export class ApiError extends Error {
    status: number;

    constructor(message: string, status = 400) {
      super(message);
      this.status = status;
    }
  }

  const API_TIMEOUT_MS = 15_000;
  const SESSION_API_TIMEOUT_MS =
    typeof process !== "undefined" && process.env.NODE_ENV === "development" ? 20_000 : 30_000;
  const DATA_API_TIMEOUT_MS =
    typeof process !== "undefined" && process.env.NODE_ENV === "development" ? 90_000 : 25_000;

  function buildApiHeaders(init?: RequestInit): HeadersInit {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(init?.headers as Record<string, string> | undefined),
    };

    if (typeof window !== "undefined" && isAppTimeOverridden()) {
      headers["X-App-Now"] = getAppNowIso();
    }

    return headers;
  }

  export async function apiFetch<T>(
    input: RequestInfo,
    init?: RequestInit,
    timeoutMs = API_TIMEOUT_MS,
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(input, {
        ...init,
        credentials: "include",
        signal: controller.signal,
        headers: buildApiHeaders(init),
      });

      const bodyText = await response.text();
      let payload: T & { error?: string } = {} as T & { error?: string };
      try {
        payload = JSON.parse(bodyText);
      } catch {
        // body is not JSON, keep default empty payload
      }

      if (!response.ok) {
        throw new ApiError(payload.error ?? "API request failed", response.status);
      }

      return payload;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new ApiError("API request timed out", 408);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  export async function apiGet<T>(path: string, timeoutMs = API_TIMEOUT_MS): Promise<T> {
    return apiFetch<T>(path, undefined, timeoutMs);
  }

  export async function apiGetData<T>(path: string): Promise<T> {
    return apiFetch<T>(path, undefined, DATA_API_TIMEOUT_MS);
  }

  /** Session hydrate can be slow on cold Supabase pooler — allow more time than generic API calls. */
  export async function apiGetSession<T>(path = "/api/auth/session"): Promise<T> {
    return apiFetch<T>(path, undefined, SESSION_API_TIMEOUT_MS);
  }

  export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
    return apiFetch<T>(path, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
    return apiFetch<T>(path, {
      method: "PATCH",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  export async function apiDelete<T>(path: string): Promise<T> {
    return apiFetch<T>(path, { method: "DELETE" });
  }
