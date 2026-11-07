import type { AdminDiscount } from "./types";
import { API_BASE } from "../apiEndpoints";
import { userService } from "../userService";

interface ApiCoupon {
  id?: number;
  code: string;
  name?: string;
  description?: string;
  discountType?: "PERCENT" | "FIXED" | "FREESHIP";
  discountValue?: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number | null;
  usageLimit?: number | null;
  usagePerUser?: number | null;
  usedCount?: number;
  startsAt?: string | null;
  endsAt?: string | null;
  status?: string;
  targetCustomer?: "ALL" | "FIRST_ORDER";
  scopeType?: "ALL" | "PRODUCT" | "COLLECTION" | "CATEGORY";
  applicableCollections?: string | null;
  applicableCategories?: string | null;
  applicableProductIds?: string | null;
  createdAt?: string;
  updatedAt?: string;
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

async function request<T>(path: string, init?: RequestInit, retries = 2): Promise<T> {
  const url = path.startsWith("http") || path.startsWith(API_BASE) ? path : `${API_BASE}${path}`;
  const method = (init?.method || "GET").toUpperCase();
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        ...init,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...userService.getAuthHeaders(),
          ...init?.headers,
        },
      });
      if ((response.status === 502 || response.status === 503 || response.status === 504) && method === "GET" && attempt < retries) {
        await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
        continue;
      }
      if (!response.ok) throw new Error(await readError(response));
      if (response.status === 204) return undefined as T;
      return (await response.json()) as T;
    } catch (err) {
      if (method === "GET" && attempt < retries && err instanceof TypeError) {
        await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Không thể kết nối máy chủ backend.");
}

function formatDate(iso?: string | null): string {
  if (!iso) return "31/12/2026";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return iso;
  }
}

function parseDateToIso(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  if (dateStr.includes("T")) return dateStr;
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T23:59:59`;
  }
  return dateStr;
}

export function mapApiCouponToAdminDiscount(c: ApiCoupon): AdminDiscount {
  const discountType = (c.discountType || "PERCENT").toUpperCase() as "PERCENT" | "FIXED" | "FREESHIP";
  const discountVal = Number(c.discountValue || 0);
  const discountPercent = discountType === "PERCENT" ? discountVal : 0;
  const maxDiscount = Number(c.maxDiscountAmount ?? (discountType === "FIXED" ? discountVal : 0));

  return {
    id: String(c.id ?? `disc-${Date.now()}`),
    code: c.code,
    name: c.name || c.code,
    description: c.description || "",
    discountType,
    discountValue: discountVal,
    discountPercent,
    maxDiscount,
    minOrder: Number(c.minOrderAmount || 0),
    usageLimit: Number(c.usageLimit || 500),
    usedCount: Number(c.usedCount || 0),
    expiresAt: formatDate(c.endsAt),
    startsAt: c.startsAt || undefined,
    endsAt: c.endsAt || undefined,
    status: (c.status || "ACTIVE").toUpperCase() === "ACTIVE" ? "active" : "expired",
    targetCustomer: c.targetCustomer || "ALL",
    scopeType: c.scopeType || "ALL",
    applicableCollections: c.applicableCollections || "",
    applicableCategories: c.applicableCategories || "",
    applicableProductIds: c.applicableProductIds || "",
  };
}

export function mapAdminDiscountToApiCoupon(d: Partial<AdminDiscount>): ApiCoupon {
  const discountType = d.discountType || (d.discountPercent && d.discountPercent > 0 ? "PERCENT" : "FIXED");
  const discountValue =
    d.discountValue !== undefined
      ? d.discountValue
      : discountType === "PERCENT"
      ? (d.discountPercent || 0)
      : (d.maxDiscount || 0);

  const numericId = d.id && !d.id.startsWith("disc-") ? Number(d.id) : undefined;

  return {
    id: numericId,
    code: (d.code || "").trim().toUpperCase(),
    name: d.name || d.code || "",
    description: d.description || "",
    discountType,
    discountValue,
    minOrderAmount: d.minOrder || 0,
    maxDiscountAmount: d.maxDiscount || null,
    usageLimit: d.usageLimit || 500,
    usagePerUser: 1,
    startsAt: parseDateToIso(d.startsAt),
    endsAt: parseDateToIso(d.endsAt || d.expiresAt),
    status: d.status === "expired" || d.status === "disabled" ? "INACTIVE" : "ACTIVE",
    targetCustomer: d.targetCustomer || "ALL",
    scopeType: d.scopeType || "ALL",
    applicableCollections: d.applicableCollections || null,
    applicableCategories: d.applicableCategories || null,
    applicableProductIds: d.applicableProductIds || null,
  };
}

export const couponApi = {
  async getDiscounts(): Promise<AdminDiscount[]> {
    const list = await request<ApiCoupon[]>("/admin/coupons");
    return list.map(mapApiCouponToAdminDiscount);
  },

  async saveDiscount(disc: Partial<AdminDiscount>): Promise<AdminDiscount> {
    const payload = mapAdminDiscountToApiCoupon(disc);
    if (payload.id) {
      const updated = await request<ApiCoupon>(`/admin/coupons/${payload.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      return mapApiCouponToAdminDiscount(updated);
    } else {
      const created = await request<ApiCoupon>("/admin/coupons", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return mapApiCouponToAdminDiscount(created);
    }
  },

  async deleteDiscount(id: string): Promise<void> {
    const numericId = Number(id);
    if (isNaN(numericId)) return;
    await request<void>(`/admin/coupons/${numericId}`, {
      method: "DELETE",
    });
  },

  async getPublicCoupons(): Promise<AdminDiscount[]> {
    const list = await request<ApiCoupon[]>("/coupons/public");
    return list.map(mapApiCouponToAdminDiscount);
  },
};

