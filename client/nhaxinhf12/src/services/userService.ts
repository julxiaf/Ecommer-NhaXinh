/* eslint-disable @typescript-eslint/no-unused-vars */
import type { AdminOrder } from "./admin/types";
import { ENDPOINTS, buildUrlWithQuery } from "./apiEndpoints";
import { DEFAULT_PLACEHOLDER_IMAGE } from "./productService";

export interface UserAddress {
  id: string;
  recipientName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  addressDetail: string;
  isDefault: boolean;
  type: "home" | "office";
}

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  avatar?: string;
  gender?: "male" | "female" | "other";
  birthDate?: string;
  memberTier: "bronze" | "silver" | "gold" | "diamond";
  loyaltyPoints: number;
  totalSpent: number;
  createdAt: string;
}

export interface AuthSession {
  authenticated: boolean;
  id: number | null;
  username: string | null;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  accountType: string | null;
  status: string | null;
  roles: string[];
  permissions: string[];
  token?: string | null;
  expiresIn?: number | null;
}

export interface JwtClaimsPayload {
  id: number | null;
  role: string | null;
  roles: string[];
  permissions: string[];
  iat?: number;
  exp?: number;
}

const TOKEN_KEY = "nhaxinh_auth_token";
const TOKEN_EXP_KEY = "nhaxinh_auth_token_exp";
const LOGGED_OUT_FLAG_KEY = "nhaxinh_user_logged_out";

// Cache phiên trong bộ nhớ RAM (không lưu thông tin cá nhân vào key nhaxinh_user trên trình duyệt)
let inMemorySession: AuthSession | null = null;

// Tự động dọn dẹp key nhaxinh_user cũ nếu còn sót lại trong trình duyệt
if (typeof window !== "undefined") {
  try {
    localStorage.removeItem("nhaxinh_user");
    sessionStorage.removeItem("nhaxinh_user");
  } catch {
    // ignore
  }
}

function decodeJwtClaims(jwt: string): JwtClaimsPayload | null {
  try {
    const parts = jwt.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = atob(padded);
    const raw = JSON.parse(json) as {
      id?: number | string | null;
      uid?: number | string | null;
      role?: string | null;
      roles?: string[];
      permissions?: string[];
      iat?: number;
      exp?: number;
    };
    const parsedId =
      raw.id != null
        ? Number(raw.id)
        : raw.uid != null
          ? Number(raw.uid)
          : null;
    const roles = Array.isArray(raw.roles)
      ? raw.roles.map((r) => String(r))
      : raw.role
        ? [String(raw.role)]
        : [];
    const primaryRole = raw.role ? String(raw.role) : roles[0] || null;
    const permissions = Array.isArray(raw.permissions)
      ? raw.permissions.map((p) => String(p))
      : [];

    return {
      id: parsedId != null && !Number.isNaN(parsedId) ? parsedId : null,
      role: primaryRole,
      roles,
      permissions,
      iat: typeof raw.iat === "number" ? raw.iat : undefined,
      exp: typeof raw.exp === "number" ? raw.exp : undefined,
    };
  } catch {
    return null;
  }
}

function decodeJwtExpMs(jwt: string): number | null {
  const claims = decodeJwtClaims(jwt);
  if (claims && typeof claims.exp === "number" && claims.exp > 0) {
    return claims.exp * 1000;
  }
  return null;
}

let activeVerifyPromise: Promise<AuthSession | null> | null = null;
let lastVerifyTimestamp = 0;
let lastVerifySessionCache: AuthSession | null = null;

export const userService = {
  // ── SERVER JWT & SESSION HELPERS (JWT chuẩn HS256 chỉ chứa id, role, permissions) ──
  saveJwtToken(token?: string | null, expiresInSeconds?: number | null): void {
    if (typeof window === "undefined" || !token) return;
    try {
      const cleanToken = token.trim();
      if (!cleanToken) return;
      const currentToken = localStorage.getItem(TOKEN_KEY);
      const decodedExpMs = decodeJwtExpMs(cleanToken);
      const expMs =
        decodedExpMs ??
        Date.now() + (typeof expiresInSeconds === "number" && expiresInSeconds > 0 ? expiresInSeconds * 1000 : 24 * 3600 * 1000);
      
      // CHỈ ghi lại localStorage nếu token thực sự thay đổi để tránh kích hoạt vòng lặp StorageEvent giữa các tab
      if (currentToken !== cleanToken) {
        localStorage.setItem(TOKEN_KEY, cleanToken);
      }
      const currentExp = localStorage.getItem(TOKEN_EXP_KEY);
      const newExpStr = String(expMs);
      if (currentExp !== newExpStr) {
        localStorage.setItem(TOKEN_EXP_KEY, newExpStr);
      }
      localStorage.removeItem("nhaxinh_user");
      sessionStorage.removeItem("nhaxinh_user");
    } catch {
      // ignore storage errors
    }
  },

  getToken(): string | null {
    if (typeof window === "undefined") return null;
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) return null;
      const expRaw = localStorage.getItem(TOKEN_EXP_KEY);
      if (expRaw) {
        const expMs = Number(expRaw);
        if (!Number.isNaN(expMs) && Date.now() >= expMs) {
          return null;
        }
      } else {
        const decodedExpMs = decodeJwtExpMs(token);
        if (decodedExpMs && Date.now() >= decodedExpMs) {
          return null;
        }
      }
      return token;
    } catch {
      return null;
    }
  },

  decodeTokenClaims(token?: string | null): JwtClaimsPayload | null {
    const target = token ?? this.getToken();
    if (!target) return null;
    return decodeJwtClaims(target);
  },

  /**
   * Trích xuất phiên từ JWT token (id, roles, permissions) kết hợp với bộ nhớ RAM nếu có.
   */
  getSessionFromToken(): AuthSession | null {
    const token = this.getToken();
    if (!token) return inMemorySession;
    const claims = decodeJwtClaims(token);
    if (!claims) return inMemorySession;
    if (inMemorySession && inMemorySession.authenticated && (claims.id == null || inMemorySession.id === claims.id)) {
      return {
        ...inMemorySession,
        id: claims.id ?? inMemorySession.id,
        roles: claims.roles.length > 0 ? claims.roles : inMemorySession.roles,
        permissions: claims.permissions.length > 0 ? claims.permissions : inMemorySession.permissions,
      };
    }
    return {
      authenticated: true,
      id: claims.id,
      username: null,
      fullName: null,
      email: null,
      phone: null,
      accountType: null,
      status: "ACTIVE",
      roles: claims.roles,
      permissions: claims.permissions,
      token,
    };
  },

  getCachedSession(): AuthSession | null {
    return inMemorySession;
  },

  getAuthHeaders(): Record<string, string> {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },

  hasStoredSession(): boolean {
    if (typeof window === "undefined") return false;
    return Boolean(this.getToken() || (inMemorySession && inMemorySession.authenticated));
  },

  /**
   * Kiểm tra JWT do Server cấp còn hạn hay không.
   */
  isTokenExpired(): boolean {
    if (typeof window === "undefined") return false;
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      const expRaw = localStorage.getItem(TOKEN_EXP_KEY);
      if (expRaw) {
        const expMs = Number(expRaw);
        if (!Number.isNaN(expMs)) {
          return Date.now() >= expMs;
        }
      }
      const decodedExpMs = decodeJwtExpMs(token);
      if (decodedExpMs) {
        return Date.now() >= decodedExpMs;
      }
      return false;
    }
    return !this.hasStoredSession();
  },

  clearLogoutFlag(): void {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem(LOGGED_OUT_FLAG_KEY);
      } catch {
        // ignore
      }
    }
  },

  clearSession(notifyExpired = false): void {
    const hadSession = Boolean(inMemorySession) || Boolean(this.getToken());
    inMemorySession = null;
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(TOKEN_EXP_KEY);
        localStorage.removeItem("nhaxinh_user");
        sessionStorage.removeItem("nhaxinh_user");
        localStorage.removeItem("nhaxinh_user_profile");
      } catch {
        // ignore
      }
      if (notifyExpired && hadSession) {
        window.dispatchEvent(new CustomEvent("nhaxinh:session_expired"));
      }
    }
  },

  /**
   * Xác thực trạng thái phiên làm việc & JWT thực tế với backend (`/api/v1/auth/me`).
   * Tích hợp deduplication: tái sử dụng in-flight promise nếu có nhiều lời gọi đồng thời,
   * và cache kết quả 3 giây để chống spam API.
   */
  async verifySession(force = false): Promise<AuthSession | null> {
    if (!force && activeVerifyPromise) {
      return activeVerifyPromise;
    }
    // Tránh gọi API dồn dập trong khoảng 3 giây nếu đã có kết quả
    if (!force && Date.now() - lastVerifyTimestamp < 3000 && lastVerifySessionCache) {
      return lastVerifySessionCache;
    }

    activeVerifyPromise = (async () => {
      try {
        const res = await fetch(ENDPOINTS.AUTH.ME, {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...this.getAuthHeaders(),
          },
        });
        if (!res.ok) {
          this.clearSession(false);
          lastVerifySessionCache = null;
          return null;
        }
        const data: AuthSession = await res.json();
        if (!data || !data.authenticated) {
          this.clearSession(false);
          lastVerifySessionCache = null;
          return null;
        }

        this.clearLogoutFlag();
        if (data.token) {
          this.saveJwtToken(data.token, data.expiresIn);
        }
        const claims = data.token ? decodeJwtClaims(data.token) : this.decodeTokenClaims();
        inMemorySession = {
          ...data,
          id: data.id ?? claims?.id ?? null,
          roles: data.roles?.length ? data.roles : claims?.roles || [],
          permissions: data.permissions?.length ? data.permissions : claims?.permissions || [],
        };
        lastVerifySessionCache = inMemorySession;
        lastVerifyTimestamp = Date.now();
        return inMemorySession;
      } catch {
        return null;
      } finally {
        activeVerifyPromise = null;
      }
    })();

    return activeVerifyPromise;
  },

  /**
   * Kiểm tra tài khoản có quyền truy cập vào cổng Quản trị (/admin) hay không.
   * Tài khoản Khách hàng (CUSTOMER / REGISTERED / GUEST) tuyệt đối KHÔNG được vào /admin.
   */
  hasAdminAccess(session: AuthSession | null | undefined): boolean {
    if (!session || !session.authenticated) return false;
    if (session.status && session.status.toUpperCase() !== "ACTIVE") {
      return false;
    }

    const normalizedRoles = (session.roles || [])
      .map((r) => String(r).replace(/^ROLE_/i, "").trim().toUpperCase())
      .filter((r) => r.length > 0);

    const nonAdminRoles = new Set(["CUSTOMER", "USER", "GUEST", "MEMBER"]);
    const hasStaffOrAdminRole = normalizedRoles.some((role) => !nonAdminRoles.has(role));

    if (hasStaffOrAdminRole) {
      return true;
    }

    // Nếu tài khoản có vai trò nhưng TẤT CẢ đều là vai trò khách hàng (VD: ["CUSTOMER"]) -> Từ chối ngay lập tức!
    if (normalizedRoles.length > 0) {
      return false;
    }

    // Chỉ khi mảng roles trống mới kiểm tra tiếp accountType nội bộ
    const accountType = (session.accountType || "").trim().toUpperCase();
    return accountType === "ADMIN" || accountType === "STAFF" || accountType === "INTERNAL";
  },

  // ── AUTH API (JWT Token HS256 do Server cấp phát) ──
  async login(
    email: string,
    password: string,
  ): Promise<{ ok: boolean; code?: string; field?: string; message?: string; data?: AuthSession }> {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const res = await fetch(ENDPOINTS.AUTH.LOGIN, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        return {
          ok: false,
          code: body?.code,
          field: body?.field,
          message:
            body?.message || "Đăng nhập thất bại. Vui lòng kiểm tra lại email và mật khẩu.",
        };
      }

      this.clearLogoutFlag();
      if (body) {
        if (body.token) {
          this.saveJwtToken(body.token, body.expiresIn);
        }
        const claims = body.token ? decodeJwtClaims(body.token) : this.decodeTokenClaims();
        inMemorySession = {
          ...(body as AuthSession),
          id: body.id ?? claims?.id ?? null,
          roles: body.roles?.length ? body.roles : claims?.roles || [],
          permissions: body.permissions?.length ? body.permissions : claims?.permissions || [],
        };
      }
      return { ok: true, data: inMemorySession || (body as AuthSession) };
    } catch {
      return { ok: false, message: "Không thể kết nối máy chủ backend. Vui lòng thử lại sau." };
    }
  },

  async register(payload: {
    password: string;
    email: string;
    phone: string;
    fullName: string;
  }): Promise<{
    ok: boolean;
    code?: string;
    field?: string;
    fieldErrors?: Record<string, string>;
    message?: string;
  }> {
    try {
      const res = await fetch(ENDPOINTS.AUTH.REGISTER, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, marketingConsent: false }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        const fieldErrors: Record<string, string> = {};
        if (body?.field) {
          fieldErrors[String(body.field)] = body?.message || "Thông tin không hợp lệ.";
        }
        if (Array.isArray(body?.details)) {
          for (const d of body.details) {
            if (d && typeof d === "object" && d.field) {
              fieldErrors[String(d.field)] = String(d.message || "Thông tin không hợp lệ.");
            }
          }
        }
        const firstDetailMsg =
          Array.isArray(body?.details) && body.details.length
            ? typeof body.details[0] === "string"
              ? ` (${body.details.join("; ")})`
              : body.details[0]?.message
                ? `: ${body.details[0].message}`
                : ""
            : "";
        return {
          ok: false,
          code: body?.code,
          field: body?.field || Object.keys(fieldErrors)[0],
          fieldErrors,
          message: (body?.message || "Đăng ký thất bại.") + firstDetailMsg,
        };
      }
      return { ok: true };
    } catch {
      return { ok: false, message: "Không thể kết nối máy chủ backend. Vui lòng thử lại sau." };
    }
  },

  async logout(): Promise<void> {
    try {
      await fetch(ENDPOINTS.AUTH.LOGOUT, {
        method: "POST",
        credentials: "include",
        headers: {
          ...this.getAuthHeaders(),
        },
      });
    } catch {
      // bỏ qua lỗi mạng
    }
    this.clearSession(false);
  },

  async forgotPassword(email: string): Promise<{
    ok: boolean;
    code?: string;
    field?: string;
    expiresInSeconds?: number;
    resendCooldownSeconds?: number;
    retryAfterSeconds?: number;
    message: string;
  }> {
    try {
      const res = await fetch(ENDPOINTS.AUTH.FORGOT_PASSWORD, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.success === false) {
        return {
          ok: false,
          code: data?.code,
          field: data?.field || "forgotEmail",
          retryAfterSeconds:
            typeof data?.retryAfterSeconds === "number" ? data.retryAfterSeconds : undefined,
          message:
            data?.message ||
            (res.status === 404
              ? "Email này chưa được đăng ký trên hệ thống. Vui lòng kiểm tra lại hoặc đăng ký tài khoản mới."
              : "Không thể gửi yêu cầu đặt lại mật khẩu."),
        };
      }
      return {
        ok: true,
        expiresInSeconds:
          typeof data?.expiresInSeconds === "number" ? data.expiresInSeconds : 180,
        resendCooldownSeconds:
          typeof data?.resendCooldownSeconds === "number" ? data.resendCooldownSeconds : 20,
        message:
          data?.message ||
          "Mã xác thực OTP (hiệu lực 3 phút) đã được gửi đến email của bạn.",
      };
    } catch {
      return { ok: false, message: "Không thể kết nối máy chủ backend." };
    }
  },

  async resetPassword(payload: {
    email: string;
    token: string;
    newPassword: string;
  }): Promise<{ ok: boolean; code?: string; field?: string; message: string }> {
    try {
      const res = await fetch(ENDPOINTS.AUTH.RESET_PASSWORD, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.success === false) {
        return {
          ok: false,
          code: data?.code,
          field: data?.field,
          message: data?.message || "Đặt lại mật khẩu thất bại.",
        };
      }
      return { ok: true, message: data?.message || "Đặt lại mật khẩu thành công." };
    } catch {
      return { ok: false, message: "Không thể kết nối máy chủ backend." };
    }
  },

  // ── PROFILE API (Xác thực qua JWT Bearer Token & Phiên Server) ──
  async getProfile(): Promise<UserProfile> {
    const res = await fetch(ENDPOINTS.USERS.ME, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...this.getAuthHeaders(),
      },
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        this.clearSession();
        throw new Error("UNAUTHORIZED");
      }
      throw new Error(`Lỗi tải hồ sơ (${res.status})`);
    }

    const data = await res.json();
    const profile = this.normalizeProfile(data);

    this.clearLogoutFlag();
    if (inMemorySession) {
      inMemorySession = {
        ...inMemorySession,
        fullName: profile.fullName,
        email: profile.email,
        phone: profile.phone,
      };
    }

    return profile;
  },

  normalizeProfile(raw: any): UserProfile {
    return {
      id: String(raw.id || ""),
      fullName: raw.fullName || raw.name || "Khách hàng",
      email: raw.email || "",
      phone: raw.phone || "",
      address: raw.address || "",
      avatar: raw.avatar,
      gender:
        raw.gender === "female" ? "female" : raw.gender === "other" ? "other" : "male",
      birthDate: raw.birthDate || "",
      memberTier: raw.memberTier || "bronze",
      loyaltyPoints: typeof raw.loyaltyPoints === "number" ? raw.loyaltyPoints : 0,
      totalSpent: typeof raw.totalSpent === "number" ? raw.totalSpent : 0,
      createdAt: raw.createdAt || "",
    };
  },

  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    const res = await fetch(ENDPOINTS.USERS.ME, {
      method: "PUT",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || "Cập nhật hồ sơ thất bại.");
    }

    const data = await res.json();
    const profile = this.normalizeProfile(data);

    if (inMemorySession) {
      inMemorySession = {
        ...inMemorySession,
        fullName: profile.fullName,
        email: profile.email,
        phone: profile.phone,
      };
    }

    return profile;
  },

  // ── SỔ ĐỊA CHỈ API (ADDRESSES) ──
  async getAddresses(): Promise<UserAddress[]> {
    const res = await fetch(ENDPOINTS.USERS.ADDRESSES, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...this.getAuthHeaders(),
      },
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    return Array.isArray(data) ? data : [];
  },

  async saveAddress(address: Omit<UserAddress, "id"> & { id?: string }): Promise<UserAddress[]> {
    const res = await fetch(ENDPOINTS.USERS.ADDRESSES, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(address),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || "Không thể lưu địa chỉ.");
    }

    const data = await res.json();
    return Array.isArray(data) ? data : [];
  },

  async deleteAddress(id: string): Promise<UserAddress[]> {
    const res = await fetch(ENDPOINTS.USERS.ADDRESS_BY_ID(id), {
      method: "DELETE",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...this.getAuthHeaders(),
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || "Không thể xóa địa chỉ.");
    }

    const data = await res.json();
    return Array.isArray(data) ? data : [];
  },

  async setDefaultAddress(id: string): Promise<UserAddress[]> {
    const res = await fetch(ENDPOINTS.USERS.ADDRESS_DEFAULT(id), {
      method: "PUT",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...this.getAuthHeaders(),
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || "Không thể đặt địa chỉ mặc định.");
    }

    const data = await res.json();
    return Array.isArray(data) ? data : [];
  },

  // ── ĐƠN HÀNG CỦA TÔI (MY ORDERS API) ──
  mapRawOrderToAdminOrder(ord: any): AdminOrder {
    const rawStatus = (ord.orderStatus || ord.status || "PENDING").toLowerCase();
    let status: AdminOrder["status"] = "pending";
    if (rawStatus.includes("confirm")) status = "processing";
    else if (rawStatus.includes("process")) status = "processing";
    else if (rawStatus.includes("ship")) status = "shipping";
    else if (rawStatus.includes("complete") || rawStatus.includes("deliver")) status = "completed";
    else if (rawStatus.includes("cancel")) status = "cancelled";
    else status = "pending";

    const items = Array.isArray(ord.items)
      ? ord.items.map((it: any) => ({
          productId: it.variantId || it.id || 0,
          name: it.productName || it.name || "Sản phẩm",
          variantSku: it.sku || "",
          variantDetails: it.variantName || it.optionValues || "",
          image: it.image || DEFAULT_PLACEHOLDER_IMAGE,
          price:
            typeof it.unitPrice === "number"
              ? it.unitPrice
              : typeof it.price === "number"
                ? it.price
                : 0,
          quantity: it.quantity || 1,
        }))
      : [];

    const statusHistory = Array.isArray(ord.statusHistory)
      ? ord.statusHistory.map((h: any) => ({
          id: String(h.id || Math.random()),
          status: (h.newStatus || h.status || "pending").toLowerCase(),
          timestamp: h.createdAt ? new Date(h.createdAt).toLocaleString("vi-VN") : "",
          updatedBy: h.changedByUsername || "Hệ thống Nhà Xinh",
          note: h.note || "",
        }))
      : [];

    const createdDate = ord.createdAt
      ? new Date(ord.createdAt).toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";

    const subtotal = typeof ord.subtotal === "number" ? ord.subtotal : undefined;
    const discountAmount =
      typeof ord.discountAmount === "number" ? ord.discountAmount : ord.discount || 0;
    const shippingFee = typeof ord.shippingFee === "number" ? ord.shippingFee : 0;
    const couponCode = ord.couponCode || "";

    return {
      id: String(ord.id || ord.orderCode),
      orderCode: ord.orderCode || `NX${ord.id}`,
      customerName: ord.recipientName || "Khách hàng",
      phone: ord.recipientPhone || "",
      email: ord.recipientEmail || "",
      address: ord.shippingAddress || "",
      subtotal,
      discountAmount,
      shippingFee,
      couponCode,
      total: typeof ord.totalAmount === "number" ? ord.totalAmount : ord.total || 0,
      paymentMethod: (ord.paymentMethod || "cod").toLowerCase() as never,
      paymentStatus: (ord.paymentStatus || "pending").toLowerCase() as any,
      status,
      createdAt: createdDate,
      items,
      note: ord.customerNote || "",
      statusHistory,
    };
  },

  async getUserOrders(_email?: string, _phone?: string): Promise<AdminOrder[]> {
    try {
      const url = buildUrlWithQuery(ENDPOINTS.ORDERS.MY, { page: 0, size: 50 });
      const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...this.getAuthHeaders(),
        },
      });

      if (!res.ok) {
        return [];
      }

      const body = await res.json();
      const rawOrders: any[] = Array.isArray(body?.content)
        ? body.content
        : Array.isArray(body)
          ? body
          : [];

      return rawOrders.map((ord: any) => this.mapRawOrderToAdminOrder(ord));
    } catch {
      return [];
    }
  },

  async getOrderByCode(orderCode: string, phone?: string): Promise<AdminOrder | null> {
    if (!orderCode || !orderCode.trim()) return null;
    try {
      const url = buildUrlWithQuery(ENDPOINTS.ORDERS.BY_CODE(orderCode.trim()), {
        phone: phone?.trim() || undefined,
      });
      const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...this.getAuthHeaders(),
        },
      });
      if (!res.ok) return null;
      const raw = await res.json();
      return this.mapRawOrderToAdminOrder(raw);
    } catch {
      return null;
    }
  },

  async cancelUserOrder(
    orderCode: string,
    reason: string,
    phone?: string,
    email?: string,
  ): Promise<void> {
    const cleanPhone = phone?.trim() || undefined;
    const cleanEmail = email?.trim() || undefined;
    const url = buildUrlWithQuery(ENDPOINTS.ORDERS.CANCEL(orderCode), {
      phone: cleanPhone,
    });

    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify({
        reason: reason.trim(),
        phone: cleanPhone,
        email: cleanEmail,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || "Không thể hủy đơn hàng này.");
    }
  },

  // ── ĐỔI MẬT KHẨU API ──
  async changePassword(
    currentPass: string,
    newPass: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(ENDPOINTS.USERS.CHANGE_PASSWORD, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...this.getAuthHeaders(),
        },
        body: JSON.stringify({ currentPassword: currentPass, newPassword: newPass }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          success: false,
          message:
            data.message ||
            "Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu hiện tại.",
        };
      }
      return { success: true, message: data.message || "Đổi mật khẩu thành công!" };
    } catch {
      return { success: false, message: "Không thể kết nối máy chủ backend." };
    }
  },
};
