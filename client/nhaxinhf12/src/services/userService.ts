/* eslint-disable @typescript-eslint/no-unused-vars */
import type { AdminOrder } from "./admin/types";
import { ENDPOINTS, buildUrlWithQuery } from "./apiEndpoints";

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
}

const TOKEN_KEY = "nhaxinh_auth_token";
const TOKEN_EXP_KEY = "nhaxinh_auth_token_exp";

export const userService = {
  // ── TOKEN & SECURITY ──
  getToken(): string | null {
    const token = localStorage.getItem(TOKEN_KEY);
    const expStr = localStorage.getItem(TOKEN_EXP_KEY);
    if (!token || !expStr) return null;

    const expTime = parseInt(expStr, 10);
    if (Number.isNaN(expTime) || Date.now() > expTime) {
      this.clearSession();
      return null;
    }
    return token;
  },

  isTokenExpired(): boolean {
    return this.getToken() === null;
  },

  getTokenExpiration(): Date | null {
    const expStr = localStorage.getItem(TOKEN_EXP_KEY);
    if (!expStr) return null;
    const expTime = parseInt(expStr, 10);
    return Number.isNaN(expTime) ? null : new Date(expTime);
  },

  saveSession(token: string, expiresInHours = 24): void {
    const expiresAt = Date.now() + expiresInHours * 60 * 60 * 1000;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(TOKEN_EXP_KEY, expiresAt.toString());
  },

  clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXP_KEY);
    localStorage.removeItem("nhaxinh_user");
    localStorage.removeItem("nhaxinh_user_profile");
  },

  // ── AUTH API (Session Cookie JSESSIONID) ──
  async login(
    identifier: string,
    password: string
  ): Promise<{ ok: boolean; message?: string; data?: AuthSession }> {
    try {
      const res = await fetch(ENDPOINTS.AUTH.LOGIN, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: identifier.trim(), password }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        return { ok: false, message: body?.message || "Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản và mật khẩu." };
      }
      this.saveSession("session", 24);
      if (body) {
        localStorage.setItem(
          "nhaxinh_user",
          JSON.stringify({
            id: body.id,
            username: body.username,
            fullName: body.fullName,
            email: body.email,
            phone: body.phone,
          })
        );
      }
      return { ok: true, data: body as AuthSession };
    } catch {
      return { ok: false, message: "Không thể kết nối máy chủ backend. Vui lòng thử lại sau." };
    }
  },

  async register(payload: {
    username: string;
    password: string;
    email: string;
    phone: string;
    fullName: string;
  }): Promise<{ ok: boolean; message?: string }> {
    try {
      const res = await fetch(ENDPOINTS.AUTH.REGISTER, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, marketingConsent: false }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        const detail = Array.isArray(body?.details) && body.details.length ? ` (${body.details.join("; ")})` : "";
        return { ok: false, message: (body?.message || "Đăng ký thất bại.") + detail };
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
      });
    } catch {
      // bỏ qua lỗi mạng
    }
    this.clearSession();
  },

  async forgotPassword(email: string): Promise<{ ok: boolean; message: string }> {
    try {
      const res = await fetch(ENDPOINTS.AUTH.FORGOT_PASSWORD, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        return { ok: false, message: data?.message || "Không thể gửi yêu cầu đặt lại mật khẩu." };
      }
      return { ok: true, message: data?.message || "Mã xác thực đã được gửi đến email của bạn." };
    } catch {
      return { ok: false, message: "Không thể kết nối máy chủ backend." };
    }
  },

  async resetPassword(payload: { email: string; token: string; newPassword: string }): Promise<{ ok: boolean; message: string }> {
    try {
      const res = await fetch(ENDPOINTS.AUTH.RESET_PASSWORD, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        return { ok: false, message: data?.message || "Đặt lại mật khẩu thất bại." };
      }
      return { ok: true, message: data?.message || "Đặt lại mật khẩu thành công." };
    } catch {
      return { ok: false, message: "Không thể kết nối máy chủ backend." };
    }
  },

  // ── PROFILE API ──
  async getProfile(): Promise<UserProfile> {
    const res = await fetch(ENDPOINTS.USERS.ME, {
      method: "GET",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
      // Nếu 401 unauthenticated, clear session
      if (res.status === 401) {
        this.clearSession();
      }
      throw new Error(`Lỗi tải hồ sơ (${res.status})`);
    }

    const data = await res.json();
    const profile = this.normalizeProfile(data);

    // Đồng bộ nhanh thông tin cơ bản cho Header và Checkout
    localStorage.setItem(
      "nhaxinh_user",
      JSON.stringify({
        id: profile.id,
        fullName: profile.fullName,
        email: profile.email,
        phone: profile.phone,
        address: profile.address,
        avatar: profile.avatar,
      })
    );

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
      gender: raw.gender === "female" ? "female" : raw.gender === "other" ? "other" : "male",
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || "Cập nhật hồ sơ thất bại.");
    }

    const data = await res.json();
    const profile = this.normalizeProfile(data);

    localStorage.setItem(
      "nhaxinh_user",
      JSON.stringify({
        id: profile.id,
        fullName: profile.fullName,
        email: profile.email,
        phone: profile.phone,
        address: profile.address,
        avatar: profile.avatar,
      })
    );

    return profile;
  },

  // ── SỔ ĐỊA CHỈ API (ADDRESSES) ──
  async getAddresses(): Promise<UserAddress[]> {
    const res = await fetch(ENDPOINTS.USERS.ADDRESSES, {
      method: "GET",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
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
      headers: { "Content-Type": "application/json" },
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
      headers: { "Content-Type": "application/json" },
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
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || "Không thể đặt địa chỉ mặc định.");
    }

    const data = await res.json();
    return Array.isArray(data) ? data : [];
  },

  // ── ĐƠN HÀNG CỦA TÔI (MY ORDERS API) ──
  async getUserOrders(_email?: string, _phone?: string): Promise<AdminOrder[]> {
    try {
      const url = buildUrlWithQuery(ENDPOINTS.ORDERS.MY, { page: 0, size: 50 });
      const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        return [];
      }

      const body = await res.json();
      const rawOrders: any[] = Array.isArray(body?.content) ? body.content : Array.isArray(body) ? body : [];

      return rawOrders.map((ord: any): AdminOrder => {
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
              image: it.image || "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=200&q=80",
              price: typeof it.unitPrice === "number" ? it.unitPrice : typeof it.price === "number" ? it.price : 0,
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

        return {
          id: String(ord.id || ord.orderCode),
          orderCode: ord.orderCode || `NX${ord.id}`,
          customerName: ord.recipientName || "Khách hàng",
          phone: ord.recipientPhone || "",
          email: ord.recipientEmail || "",
          address: ord.shippingAddress || "",
          total: typeof ord.totalAmount === "number" ? ord.totalAmount : (ord.total || 0),
          paymentMethod: (ord.paymentMethod || "cod").toLowerCase() as never,
          paymentStatus: (ord.paymentStatus || "pending").toLowerCase() as any,
          status,
          createdAt: createdDate,
          items,
          note: ord.customerNote || "",
          statusHistory,
        };
      });
    } catch {
      return [];
    }
  },

  async cancelUserOrder(orderCode: string, reason: string): Promise<void> {
    const res = await fetch(ENDPOINTS.ORDERS.CANCEL(orderCode), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason.trim() }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || "Không thể hủy đơn hàng này.");
    }
  },

  // ── ĐỔI MẬT KHẨU API ──
  async changePassword(
    currentPass: string,
    newPass: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(ENDPOINTS.USERS.CHANGE_PASSWORD, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPass, newPassword: newPass }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          success: false,
          message: data.message || "Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu hiện tại.",
        };
      }
      return { success: true, message: data.message || "Đổi mật khẩu thành công!" };
    } catch {
      return { success: false, message: "Không thể kết nối máy chủ backend." };
    }
  },
};
