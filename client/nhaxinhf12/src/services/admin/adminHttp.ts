import { API_BASE } from "../apiEndpoints";
import { userService } from "../userService";

const TRANSIENT_GATEWAY_STATUSES = new Set([502, 503, 504]);

export async function readError(response: Response): Promise<string> {
  const text = await response.text();
  if (!text) return `Yêu cầu thất bại (${response.status}).`;
  try {
    const body = JSON.parse(text) as { message?: string; error?: string };
    return body.message || body.error || text;
  } catch {
    return text;
  }
}

export async function adminRequest<T>(
  path: string,
  init?: RequestInit,
  retries = 2
): Promise<T> {
  const url =
    path.startsWith("http") || path.startsWith(API_BASE) ? path : `${API_BASE}${path}`;
  const isGet = !init?.method || init.method.toUpperCase() === "GET";

  for (let attempt = 0; attempt <= (isGet ? retries : 0); attempt++) {
    try {
      const response = await fetch(url, {
        ...init,
        credentials: "include",
        headers: {
          ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
          ...userService.getAuthHeaders(),
          ...init?.headers,
        },
      });

      if (isGet && TRANSIENT_GATEWAY_STATUSES.has(response.status) && attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
        continue;
      }

      if (!response.ok) throw new Error(await readError(response));
      if (response.status === 204) return undefined as T;
      return (await response.json()) as T;
    } catch (err) {
      if (isGet && attempt < retries && err instanceof TypeError) {
        await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }

  throw new Error(`Yêu cầu thất bại: ${url}`);
}

