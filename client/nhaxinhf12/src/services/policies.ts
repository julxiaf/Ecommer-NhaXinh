import { ENDPOINTS } from "./apiEndpoints";

/**
 * Interface cho dữ liệu chính sách thực tế từ Server backend.
 * Khớp 100% với PolicyResponse từ backend Spring Boot.
 */
export interface PolicyItem {
  id: number;
  slug: string;
  title: string;
  shortTitle: string;
  intro: string;
  content: string;
  templateType: string;
  fontFamily: string;
  fontSize: string;
  lineHeight: string;
  accentColor: string;
  status: "PUBLISHED" | "DRAFT" | "ARCHIVED" | string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Type aliases để tương thích ngược
export type DynamicPolicy = PolicyItem;
export type PublicPolicy = PolicyItem;

/**
 * Legacy interface cho trang quản trị cũ (nếu có)
 */
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

/**
 * 1. Tải toàn bộ danh sách chính sách ĐÃ XUẤT BẢN (PUBLISHED) từ Server
 * Tuyệt đối không dùng dữ liệu mock/test, chỉ lấy dữ liệu thực tế từ backend.
 */
export async function fetchPublishedPolicies(): Promise<PolicyItem[]> {
  const response = await fetch(ENDPOINTS.POLICIES.ALL, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  const data = (await response.json()) as PolicyItem[];
  // Đảm bảo nghiêm ngặt chỉ trả về những chính sách có trạng thái PUBLISHED
  if (!Array.isArray(data)) return [];
  return data.filter((p) => (p.status || "PUBLISHED").toUpperCase() === "PUBLISHED");
}

/**
 * 2. Tải chi tiết 1 chính sách cụ thể theo slug hoặc templateType từ Server
 */
export async function fetchPolicyBySlug(slug: string): Promise<PolicyItem> {
  const cleanSlug = encodeURIComponent(slug.trim());
  const response = await fetch(ENDPOINTS.POLICIES.BY_SLUG(cleanSlug), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  const policy = (await response.json()) as PolicyItem;
  if ((policy.status || "PUBLISHED").toUpperCase() !== "PUBLISHED") {
    throw new Error("Chính sách này chưa được công bố.");
  }
  return policy;
}

/**
 * 3. Sinh URL định tuyến chuẩn cho từng chính sách
 */
export function getPolicyRoute(p: Pick<PolicyItem, "slug">): string {
  const slug = (p.slug || "").trim().toLowerCase();
  if (slug === "chinh-sach-doi-tra" || slug === "return" || slug === "chinh-sach-mua-ban-doi-tra") {
    return "/chinh-sach-doi-tra";
  }
  if (slug === "chinh-sach-giao-hang" || slug === "shipping") {
    return "/chinh-sach-giao-hang";
  }
  if (slug === "chinh-sach-bao-hanh" || slug === "warranty") {
    return "/chinh-sach-bao-hanh";
  }
  if (slug === "chinh-sach-bao-mat" || slug === "privacy") {
    return "/chinh-sach-bao-mat";
  }
  if (slug === "dieu-khoan-su-dung" || slug === "terms") {
    return "/dieu-khoan-su-dung";
  }
  if (slug === "khach-hang-than-thiet" || slug === "vip") {
    return "/khach-hang-than-thiet";
  }
  if (slug.startsWith("chinh-sach-")) {
    return `/${slug}`;
  }
  return `/chinh-sach/${slug}`;
}

/**
 * 4. Khớp chính sách phù hợp nhất dựa theo URL hiện tại hoặc route slug
 */
export function matchPolicyByPath(
  policies: PolicyItem[],
  pathname: string,
  slugParam?: string
): PolicyItem | null {
  if (!Array.isArray(policies) || policies.length === 0) return null;

  const cleanPath = pathname.replace(/^\/+|\/+$/g, "").toLowerCase();
  const cleanParam = slugParam ? slugParam.trim().toLowerCase() : "";

  // 4.1 Khớp chính xác slug từ params
  if (cleanParam) {
    const byParam = policies.find(
      (p) =>
        p.slug.toLowerCase() === cleanParam ||
        (p.templateType && p.templateType.toLowerCase() === cleanParam)
    );
    if (byParam) return byParam;
  }

  // 4.2 Khớp đường dẫn định tuyến chuẩn
  const byExactPath = policies.find(
    (p) => getPolicyRoute(p).replace(/^\/+|\/+$/g, "").toLowerCase() === cleanPath
  );
  if (byExactPath) return byExactPath;

  // 4.3 Khớp slug hoặc templateType trong URL
  const bySlugInPath = policies.find((p) => {
    const s = p.slug.toLowerCase();
    const t = (p.templateType || "").toLowerCase();
    return cleanPath === s || cleanPath.endsWith(s) || (t && (cleanPath === t || cleanPath.includes(t)));
  });
  if (bySlugInPath) return bySlugInPath;

  // 4.4 Khớp biến thể không có tiền tố "chinh-sach-"
  const withoutPrefix = cleanPath.replace(/^chinh-sach-/, "");
  const bySubstr = policies.find((p) => {
    const s = p.slug.toLowerCase().replace(/^chinh-sach-/, "");
    return (
      s === withoutPrefix ||
      withoutPrefix.includes(s) ||
      (p.templateType && withoutPrefix.includes(p.templateType.toLowerCase()))
    );
  });
  if (bySubstr) return bySubstr;

  // Mặc định trả về chính sách đầu tiên
  return policies[0] || null;
}

// ───────────────────────────────────────────────
// Legacy Methods (giữ tương thích ngược)
// ───────────────────────────────────────────────

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
  content: Pick<PolicyPageContent, "title" | "introduction" | "purchasePolicy" | "returnPolicy">
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
