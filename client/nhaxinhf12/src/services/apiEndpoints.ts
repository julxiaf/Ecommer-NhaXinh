/**
 * apiEndpoints.ts
 * Single Source of Truth tập trung toàn bộ endpoint API của hệ thống Nhà Xinh.
 * Tách biệt hoàn toàn giữa định nghĩa endpoint và logic nghiệp vụ của các service.
 */

export const API_BASE = "/api/v1";

export const ENDPOINTS = {
  // ── 1. AUTHENTICATION & SESSION ──
  AUTH: {
    LOGIN: `${API_BASE}/auth/login`,
    LOGOUT: `${API_BASE}/auth/logout`,
    ME: `${API_BASE}/auth/me`,
    REGISTER: `${API_BASE}/auth/register`,
    CSRF: `${API_BASE}/auth/csrf`,
    FORGOT_PASSWORD: `${API_BASE}/auth/forgot-password`,
    RESET_PASSWORD: `${API_BASE}/auth/reset-password`,
    VERIFY_EMAIL: `${API_BASE}/auth/verify-email`,
  },

  // ── 2. USERS & PROFILES ──
  USERS: {
    ME: `${API_BASE}/users/me`,
    CHANGE_PASSWORD: `${API_BASE}/users/change-password`,
    ADDRESSES: `${API_BASE}/users/me/addresses`,
    ADDRESS_BY_ID: (id: string | number) => `${API_BASE}/users/me/addresses/${id}`,
    ADDRESS_DEFAULT: (id: string | number) => `${API_BASE}/users/me/addresses/${id}/default`,
  },

  // ── 3. PRODUCTS & CATALOG (PUBLIC) ──
  PRODUCTS: {
    BASE: `${API_BASE}/products`,
    SEARCH: `${API_BASE}/products/search`,
    BY_ID: (id: number | string) => `${API_BASE}/products/${id}`,
    BY_SLUG: (slug: string) => `${API_BASE}/products/slug/${encodeURIComponent(slug)}`,
    BY_CATEGORY: (categoryId: number | string) => `${API_BASE}/products/category/${categoryId}`,
    FEATURED: `${API_BASE}/products/featured`,
    MEDIA: (idOrSlug: number | string) =>
      typeof idOrSlug === "number" || !isNaN(Number(idOrSlug))
        ? `${API_BASE}/products/${idOrSlug}/media`
        : `${API_BASE}/products/slug/${encodeURIComponent(idOrSlug)}/media`,
    IMAGES: (idOrSlug: number | string) =>
      typeof idOrSlug === "number" || !isNaN(Number(idOrSlug))
        ? `${API_BASE}/products/${idOrSlug}/images`
        : `${API_BASE}/products/slug/${encodeURIComponent(idOrSlug)}/images`,
    MEDIA_IMAGE: (mediaId: number | string) => `${API_BASE}/products/media/${mediaId}/image`,
  },

  // ── 4. CATEGORIES (PUBLIC) ──
  CATEGORIES: {
    BASE: `${API_BASE}/categories`,
    BY_ID: (id: number | string) => `${API_BASE}/categories/${id}`,
    BY_SLUG: (slug: string) => `${API_BASE}/categories/slug/${encodeURIComponent(slug)}`,
  },

  // ── 5. SHOPPING CART (X-Cart-Token) ──
  CART: {
    BASE: `${API_BASE}/cart`,
    SESSION: `${API_BASE}/cart/session`,
    ITEMS: `${API_BASE}/cart/items`,
    ITEM_BY_ID: (itemId: number | string) => `${API_BASE}/cart/items/${itemId}`,
    CLEAR: `${API_BASE}/cart`,
  },

  // ── 6. ORDERS (PUBLIC / CUSTOMER) ──
  ORDERS: {
    BASE: `${API_BASE}/orders`,
    MY: `${API_BASE}/orders/my`,
    BY_CODE: (orderCode: string) => `${API_BASE}/orders/${encodeURIComponent(orderCode)}`,
    CANCEL: (orderCode: string) => `${API_BASE}/orders/${encodeURIComponent(orderCode)}/cancel`,
    CHECKOUT: `${API_BASE}/orders/checkout`,
  },

  // ── 7. CHECKOUT & PAYMENTS ──
  CHECKOUT: {
    BASE: `${API_BASE}/checkout`,
    APPLY_COUPON: `${API_BASE}/checkout/apply-coupon`,
    PAYMENT_METHODS: `${API_BASE}/checkout/payment-methods`,
    RETRY_PAYMENT: (orderCode: string) =>
      `${API_BASE}/checkout/payments/order/${encodeURIComponent(orderCode)}/retry`,
    VNPAY_RETURN: `${API_BASE}/payments/vnpay/return`,
  },

  // ── 8. COUPONS & DISCOUNTS ──
  COUPONS: {
    VALIDATE: `${API_BASE}/coupons/validate`,
  },

  // ── 9. NOTIFICATIONS & EMAILS ──
  NOTIFICATIONS: {
    RESEND_ORDER_EMAIL: (orderCode: string) =>
      `${API_BASE}/notifications/emails/order/${encodeURIComponent(orderCode)}/resend`,
  },

  // ── 10. CHATBOT & LIVE SUPPORT ──
  CHATBOT: {
    MESSAGE: `${API_BASE}/chatbot/message`,
    SWITCH_MODE: `${API_BASE}/chatbot/switch-mode`,
    HISTORY: `${API_BASE}/chatbot/history`,
    CONVERSATION_MESSAGES: (conversationId: number | string) =>
      `${API_BASE}/chatbot/conversations/${conversationId}/messages`,
    ADMIN_CONVERSATIONS: `${API_BASE}/chatbot/admin/conversations`,
    ADMIN_REPLY: (conversationId: number | string) =>
      `${API_BASE}/chatbot/admin/conversations/${conversationId}/reply`,
    ADMIN_OVERRIDE: (messageId: number | string) =>
      `${API_BASE}/chatbot/admin/messages/${messageId}/override`,
    ADMIN_CLOSE: (conversationId: number | string) =>
      `${API_BASE}/chatbot/admin/conversations/${conversationId}/close`,
  },

  // ── 9. POLICIES (CHÍNH SÁCH) ──
  POLICIES: {
    BASE: `${API_BASE}/policies`,
    BY_SLUG: (slug: string) => `${API_BASE}/policies/${encodeURIComponent(slug)}`,
  },

  // ── 10. ADMIN PORTAL ──
  ADMIN: {
    // Dashboard & Metrics
    DASHBOARD: {
      STATS: `${API_BASE}/admin/dashboard/stats`,
      REVENUE: `${API_BASE}/admin/dashboard/revenue`,
    },

    // Quản lý Catalog & Kho
    CATALOG: {
      CATEGORIES: `${API_BASE}/admin/categories`,
      CATEGORY_BY_ID: (id: number | string) => `${API_BASE}/admin/categories/${id}`,
      CATEGORY_STATUS: (id: number | string) => `${API_BASE}/admin/categories/${id}/status`,
      PRODUCTS: `${API_BASE}/admin/products`,
      PRODUCT_BY_ID: (id: number | string) => `${API_BASE}/admin/products/${id}`,
      PRODUCT_STATUS: (id: number | string) => `${API_BASE}/admin/products/${id}/status`,
      PRODUCT_VARIANTS: (id: number | string) => `${API_BASE}/admin/products/${id}/variants`,
      PRODUCT_VARIANT_BY_ID: (productId: number | string, variantId: number | string) =>
        `${API_BASE}/admin/products/${productId}/variants/${variantId}`,
      PRODUCT_MEDIA: (id: number | string) => `${API_BASE}/admin/products/${id}/media`,
      PRODUCT_MEDIA_BY_ID: (productId: number | string, mediaId: number | string) =>
        `${API_BASE}/admin/products/${productId}/media/${mediaId}`,
    },

    // Quản lý Đơn hàng
    ORDERS: {
      BASE: `${API_BASE}/admin/orders`,
      BY_ID: (id: number | string) => `${API_BASE}/admin/orders/${id}`,
      STATUS: (id: number | string) => `${API_BASE}/admin/orders/${id}/status`,
      PAYMENT: (id: number | string) => `${API_BASE}/admin/orders/${id}/payment`,
      SHIPPING: (id: number | string) => `${API_BASE}/admin/orders/${id}/shipping`,
      CANCEL: (id: number | string) => `${API_BASE}/admin/orders/${id}/cancel`,
    },

    // Phân quyền RBAC & Quản trị User
    RBAC: {
      ROLES: `${API_BASE}/admin/roles`,
      ROLE_BY_ID: (id: number | string) => `${API_BASE}/admin/roles/${id}`,
      PERMISSIONS: `${API_BASE}/admin/permissions`,
      PERMISSION_BY_ID: (id: number | string) => `${API_BASE}/admin/permissions/${id}`,
      USERS: `${API_BASE}/admin/users`,
      USER_BY_ID: (id: number | string) => `${API_BASE}/admin/users/${id}`,
      USER_STATUS: (id: number | string) => `${API_BASE}/admin/users/${id}/status`,
      AUDIT_LOGS: `${API_BASE}/admin/audit-logs`,
    },

    // Quản lý Chính sách Admin
    POLICIES: {
      BASE: `${API_BASE}/admin/policies`,
      BY_ID: (id: number | string) => `${API_BASE}/admin/policies/${id}`,
    },
  },
} as const;

/**
 * Tiện ích ghép query parameters vào endpoint URL một cách an toàn và sạch sẽ.
 */
export function buildUrlWithQuery(url: string, params?: Record<string, any>): string {
  if (!params) return url;
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.append(key, String(value));
    }
  }
  const queryString = searchParams.toString();
  return queryString ? `${url}?${queryString}` : url;
}
