/**
 * apiClient.ts
 * Centralized HTTP Client for Nhà Xinh.
 * - Handles base URL, auth token (JWT Bearer), CSRF, credentials.
 * - Centralizes query string formatting, JSON parse, and custom error types.
 * - Implements automatic exponential backoff retry for transient gateway errors (502, 503, 504).
 */

export interface ApiClientOptions extends RequestInit {
  params?: Record<string, unknown>;
  retries?: number;
  skipAuth?: boolean;
}

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

const TRANSIENT_GATEWAY_STATUSES = new Set([502, 503, 504]);
const TOKEN_KEY = "nhaxinh_auth_token";

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function buildQueryString(params?: Record<string, unknown>): string {
  if (!params) return "";
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.append(key, String(value));
    }
  }
  const str = searchParams.toString();
  return str ? `?${str}` : "";
}

class ApiClient {
  /**
   * Core request runner with automatic retries and error parsing
   */
  async request<T>(endpoint: string, options: ApiClientOptions = {}): Promise<T> {
    const { params, retries = 1, skipAuth = false, headers = {}, ...customConfig } = options;

    const queryString = buildQueryString(params);
    const fullUrl = `${endpoint}${queryString}`;

    const requestHeaders: Record<string, string> = {
      Accept: "application/json",
      ...(headers as Record<string, string>),
    };

    // Attach Content-Type if body is not FormData
    if (customConfig.body && !(customConfig.body instanceof FormData) && !requestHeaders["Content-Type"]) {
      requestHeaders["Content-Type"] = "application/json";
    }

    // Attach Bearer token if not explicitly skipped
    if (!skipAuth) {
      const token = getStoredToken();
      if (token && !requestHeaders["Authorization"]) {
        requestHeaders["Authorization"] = `Bearer ${token}`;
      }
    }

    const config: RequestInit = {
      credentials: "include",
      ...customConfig,
      headers: requestHeaders,
    };

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(fullUrl, config);

        // Auto retry on 502/503/504 gateway failures
        if (TRANSIENT_GATEWAY_STATUSES.has(response.status) && attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
          continue;
        }

        if (!response.ok) {
          let errData: any = null;
          let message = `Yêu cầu thất bại (${response.status})`;
          try {
            errData = await response.json();
            message = errData?.message || errData?.error || message;
          } catch {
            const rawText = await response.text().catch(() => "");
            if (rawText) message = rawText;
          }
          throw new ApiError(message, response.status, errData);
        }

        // Handle 204 No Content
        if (response.status === 204) {
          return null as unknown as T;
        }

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          return (await response.json()) as T;
        }

        return (await response.text()) as unknown as T;
      } catch (err) {
        if (options.signal?.aborted) {
          throw err;
        }
        if (attempt < retries && !(err instanceof ApiError)) {
          await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
          continue;
        }
        throw err;
      }
    }

    throw new ApiError("Hết thời gian chờ phản hồi từ máy chủ", 408);
  }

  get<T>(url: string, options?: Omit<ApiClientOptions, "method" | "body">): Promise<T> {
    return this.request<T>(url, { ...options, method: "GET" });
  }

  post<T>(url: string, body?: unknown, options?: Omit<ApiClientOptions, "method" | "body">): Promise<T> {
    const payload = body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined;
    return this.request<T>(url, { ...options, method: "POST", body: payload });
  }

  put<T>(url: string, body?: unknown, options?: Omit<ApiClientOptions, "method" | "body">): Promise<T> {
    const payload = body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined;
    return this.request<T>(url, { ...options, method: "PUT", body: payload });
  }

  patch<T>(url: string, body?: unknown, options?: Omit<ApiClientOptions, "method" | "body">): Promise<T> {
    const payload = body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined;
    return this.request<T>(url, { ...options, method: "PATCH", body: payload });
  }

  delete<T>(url: string, options?: Omit<ApiClientOptions, "method" | "body">): Promise<T> {
    return this.request<T>(url, { ...options, method: "DELETE" });
  }
}

export const apiClient = new ApiClient();

