import { ENDPOINTS } from "./apiEndpoints";
import { apiClient } from "./apiClient";

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

/**
 * 1. Tải toàn bộ danh sách chính sách ĐÃ XUẤT BẢN (PUBLISHED) từ Server
 * Tuyệt đối không dùng dữ liệu mock/test, chỉ lấy dữ liệu thực tế từ backend.
 */
export async function fetchPublishedPolicies(): Promise<PolicyItem[]> {
  const data = await apiClient.get<PolicyItem[]>(ENDPOINTS.POLICIES.ALL, {
    skipAuth: true,
    retries: 2,
  });

  if (!Array.isArray(data)) return [];
  return data.filter((p) => (p.status || "PUBLISHED").toUpperCase() === "PUBLISHED");
}

/**
 * 2. Tải chi tiết 1 chính sách cụ thể theo slug hoặc templateType từ Server
 */
export async function fetchPolicyBySlug(slug: string): Promise<PolicyItem> {
  const cleanSlug = encodeURIComponent(slug.trim());
  const policy = await apiClient.get<PolicyItem>(ENDPOINTS.POLICIES.BY_SLUG(cleanSlug), {
    skipAuth: true,
    retries: 2,
  });

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
  return apiClient.get<PolicyPageContent>(ENDPOINTS.POLICIES.BASE);
}

export async function fetchAdminSession(): Promise<AdminSession> {
  return apiClient.get<AdminSession>(ENDPOINTS.AUTH.ME);
}

export async function signInAdmin(username: string, password: string): Promise<void> {
  await apiClient.post(ENDPOINTS.AUTH.LOGIN, { username, password });
}

export async function savePolicyPage(
  content: Pick<PolicyPageContent, "title" | "introduction" | "purchasePolicy" | "returnPolicy">
): Promise<PolicyPageContent> {
  return apiClient.put<PolicyPageContent>(ENDPOINTS.POLICIES.BASE, content);
}

export async function signOutAdmin(): Promise<void> {
  await apiClient.post(ENDPOINTS.AUTH.LOGOUT, {});
}
