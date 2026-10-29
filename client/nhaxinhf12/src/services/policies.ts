import { ENDPOINTS } from "./apiEndpoints";

export interface PolicyPageContent {
  title: string;
  introduction: string;
  purchasePolicy: string;
  returnPolicy: string;
  updatedAt: string;
}

interface AdminSession {
  authenticated: boolean;
  username?: string;
}

interface CsrfResponse {
  token: string;
}

async function readError(response: Response): Promise<string> {
  const text = await response.text();
  if (!text) return `Yêu cầu thất bại (${response.status}).`;
  try {
    const body = JSON.parse(text) as { message?: string; error?: string };
    return body.message || body.error || text;
  } catch {
    return text;
  }
}

async function getCsrfToken(): Promise<string> {
  const response = await fetch(ENDPOINTS.AUTH.CSRF, { credentials: "include" });
  if (!response.ok) throw new Error(await readError(response));
  const body = (await response.json()) as CsrfResponse;
  return body.token;
}

export async function fetchPolicyPage(): Promise<PolicyPageContent> {
  const response = await fetch(ENDPOINTS.POLICIES.BASE, { credentials: "include" });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as PolicyPageContent;
}

export async function fetchAdminSession(): Promise<AdminSession> {
  const response = await fetch(ENDPOINTS.AUTH.ME, { credentials: "include" });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as AdminSession;
}

export async function signInAdmin(username: string, password: string): Promise<void> {
  const csrfToken = await getCsrfToken();
  const response = await fetch(ENDPOINTS.AUTH.LOGIN, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-XSRF-TOKEN": csrfToken,
    },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) throw new Error(await readError(response));
}

export async function savePolicyPage(
  content: Pick<PolicyPageContent, "title" | "introduction" | "purchasePolicy" | "returnPolicy">,
): Promise<PolicyPageContent> {
  const csrfToken = await getCsrfToken();
  const response = await fetch(ENDPOINTS.POLICIES.BASE, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-XSRF-TOKEN": csrfToken,
    },
    body: JSON.stringify(content),
  });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as PolicyPageContent;
}

export async function signOutAdmin(): Promise<void> {
  const csrfToken = await getCsrfToken();
  const response = await fetch(ENDPOINTS.AUTH.LOGOUT, {
    method: "POST",
    credentials: "include",
    headers: { "X-XSRF-TOKEN": csrfToken },
  });
  if (!response.ok) throw new Error(await readError(response));
}
