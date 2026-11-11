import type { CartItem } from "../hooks/useStore";
import { ENDPOINTS } from "./apiEndpoints";
import { userService } from "./userService";
import { apiClient } from "./apiClient";

const CART_TOKEN_KEY = "nhaxinh_cart_token";

export interface BackendCartItemResponse {
  id: number;
  productId?: number;
  productSlug?: string;
  variantId: number;
  sku: string;
  productName: string;
  variantName?: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  imageUrl?: string;
  isPreorder?: boolean;
  stockStatus?: string;
  availableStock?: number;
}

export interface BackendCartResponse {
  id: number;
  status: string;
  items: BackendCartItemResponse[];
}

let inFlightCartFetch: Promise<{ ok: boolean; items: CartItem[]; message?: string }> | null = null;
let lastCartFetchTime = 0;
let cachedCartResult: { ok: boolean; items: CartItem[]; message?: string } | null = null;
const CART_CACHE_TTL = 30_000; // 30s TTL in-memory

export const cartService = {
  /** Xóa cache giỏ hàng in-memory khi có thao tác thay đổi */
  invalidateCartCache() {
    cachedCartResult = null;
    lastCartFetchTime = 0;
  },

  /**
   * Lấy hoặc yêu cầu máy chủ cấp mới X-Cart-Token cho khách vãng lai (POST /api/v1/cart/session)
   */
  async getOrCreateCartToken(): Promise<string> {
    const token = localStorage.getItem(CART_TOKEN_KEY);
    if (token && token.length >= 40 && token.length <= 128) {
      return token;
    }
    try {
      const data = await apiClient.post<{ cartToken?: string }>(
        ENDPOINTS.CART.SESSION,
        {},
        { skipAuth: true, retries: 1 }
      );
      if (data?.cartToken) {
        localStorage.setItem(CART_TOKEN_KEY, data.cartToken);
        return data.cartToken;
      }
    } catch {
      // Bỏ qua lỗi mạng
    }
    return "";
  },

  async getHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...userService.getAuthHeaders(),
    };
    if (userService.hasStoredSession()) {
      // Khi đã đăng nhập (xác thực qua JWT Bearer Token & HttpOnly Cookie trên máy chủ),
      // chỉ gửi X-Cart-Token nếu còn token khách cũ do server cấp đang chờ merge
      const pendingGuestToken = localStorage.getItem(CART_TOKEN_KEY);
      if (pendingGuestToken && pendingGuestToken.length >= 40 && pendingGuestToken.length <= 128) {
        headers["X-Cart-Token"] = pendingGuestToken;
      }
    } else {
      const cartToken = await this.getOrCreateCartToken();
      if (cartToken) {
        headers["X-Cart-Token"] = cartToken;
      }
    }
    return headers;
  },

  mapBackendItemToCartItem(item: BackendCartItemResponse): CartItem {
    const isPre = Boolean(item.isPreorder) || item.stockStatus === "PRE_ORDER";
    const availStock = item.availableStock !== undefined && item.availableStock !== null ? item.availableStock : 99;
    const resolvedPrice = Number(item.unitPrice) || 0;

    return {
      product: {
        id: item.productId || item.variantId,
        name: item.productName,
        slug: item.productSlug || `san-pham-${item.productId || item.variantId}`,
        price: resolvedPrice,
        image: item.imageUrl || "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80",
        category: "Nội thất",
        brand: "Nhà Xinh",
        totalStock: availStock,
        inStock: isPre || availStock > 0,
        isPreorder: isPre,
        stockStatus: (item.stockStatus as any) || (isPre ? "PRE_ORDER" : (availStock > 0 ? "IN_STOCK" : "OUT_OF_STOCK")),
        variantId: item.variantId,
      },
      quantity: item.quantity,
      qty: item.quantity,
      variantId: item.variantId,
      variantName: item.variantName,
      variantSku: item.sku,
      backendItemId: item.id,
    };
  },

  /**
   * Tải giỏ hàng hiện tại từ máy chủ (tự động nhận diện session tài khoản hoặc X-Cart-Token)
   * Có TTL cache 30s và in-flight promise deduplication để nhiều component (Header, Home, Pandora) không gọi đồng thời.
   */
  async fetchCart(force = false): Promise<{ ok: boolean; items: CartItem[]; message?: string }> {
    const now = Date.now();
    if (!force && cachedCartResult && now - lastCartFetchTime < CART_CACHE_TTL) {
      return cachedCartResult;
    }
    if (inFlightCartFetch) {
      return inFlightCartFetch;
    }

    inFlightCartFetch = (async () => {
      try {
        const headers = await this.getHeaders();
        const data = await apiClient.get<BackendCartResponse>(ENDPOINTS.CART.BASE, {
          headers,
          retries: 2,
        });

        // Khi đã đăng nhập và tải thành công giỏ hàng, xóa token giỏ tạm cũ
        if (userService.hasStoredSession()) {
          localStorage.removeItem(CART_TOKEN_KEY);
        }

        const items = (data.items || []).map((i) => this.mapBackendItemToCartItem(i));
        const result = { ok: true, items };
        cachedCartResult = result;
        lastCartFetchTime = Date.now();
        return result;
      } catch (err: any) {
        return { ok: false, items: [], message: err?.message || "Không thể kết nối đến máy chủ" };
      }
    })().finally(() => {
      inFlightCartFetch = null;
    });

    return inFlightCartFetch;
  },

  /**
   * Thêm sản phẩm vào giỏ hàng trên máy chủ
   */
  async addItem(variantId: number, quantity = 1): Promise<{ ok: boolean; items?: CartItem[]; message?: string }> {
    this.invalidateCartCache();
    try {
      const headers = await this.getHeaders();
      const data = await apiClient.post<BackendCartResponse>(
        ENDPOINTS.CART.ITEMS,
        { variantId, quantity },
        { headers }
      );

      const items = (data.items || []).map((i) => this.mapBackendItemToCartItem(i));
      return { ok: true, items };
    } catch (err: any) {
      return { ok: false, message: err?.message || "Lỗi kết nối máy chủ" };
    }
  },

  /**
   * Cập nhật số lượng sản phẩm trong giỏ hàng trên máy chủ
   */
  async updateItemQty(cartItemId: number, quantity: number): Promise<{ ok: boolean; items?: CartItem[]; message?: string }> {
    this.invalidateCartCache();
    try {
      const headers = await this.getHeaders();
      const data = await apiClient.patch<BackendCartResponse>(
        ENDPOINTS.CART.ITEM_BY_ID(cartItemId),
        { quantity },
        { headers }
      );

      const items = (data.items || []).map((i) => this.mapBackendItemToCartItem(i));
      return { ok: true, items };
    } catch (err: any) {
      return { ok: false, message: err?.message || "Không thể cập nhật số lượng" };
    }
  },

  /**
   * Xóa sản phẩm khỏi giỏ hàng trên máy chủ (hỗ trợ cả theo itemId hoặc variantId)
   */
  async removeItem(cartItemId?: number, variantId?: number): Promise<{ ok: boolean; items?: CartItem[]; message?: string }> {
    this.invalidateCartCache();
    try {
      const headers = await this.getHeaders();
      let url = "";
      if (cartItemId) {
        url = ENDPOINTS.CART.ITEM_BY_ID(cartItemId);
      } else if (variantId) {
        url = ENDPOINTS.CART.ITEM_BY_VARIANT(variantId);
      } else {
        return { ok: false, message: "Thiếu thông tin sản phẩm để xóa" };
      }

      const data = await apiClient.delete<BackendCartResponse>(url, { headers });
      const items = (data?.items || []).map((i) => this.mapBackendItemToCartItem(i));
      return { ok: true, items };
    } catch (err: any) {
      return { ok: false, message: err?.message || "Lỗi kết nối máy chủ" };
    }
  },

  /**
   * Xóa sạch toàn bộ giỏ hàng trên máy chủ
   */
  async clearCart(): Promise<boolean> {
    this.invalidateCartCache();
    try {
      const headers = await this.getHeaders();
      await apiClient.delete(ENDPOINTS.CART.CLEAR, { headers });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Tìm variantId cho một sản phẩm nếu chưa có
   */
  async resolveVariantId(productId: number, variantId?: number): Promise<number | undefined> {
    if (variantId && variantId < 90000) return variantId;
    try {
      const detail = await apiClient.get<{ variants?: Array<{ id: number }> }>(
        ENDPOINTS.PRODUCTS.BY_ID(productId),
        { skipAuth: true }
      );
      if (detail.variants && detail.variants.length > 0) {
        return detail.variants[0].id;
      }
    } catch {
      // Bỏ qua
    }
    return undefined;
  },

  /**
   * Đồng bộ (merge) các sản phẩm từ local cart lên giỏ hàng máy chủ của tài khoản vừa đăng nhập
   */
  async syncAndMergeLocalCart(localItems: CartItem[]): Promise<CartItem[]> {
    this.invalidateCartCache();
    // 1. Tải giỏ hàng: Backend tự động gộp giỏ khách (qua X-Cart-Token) vào giỏ tài khoản
    const res = await this.fetchCart();

    // 2. Xóa guest cart token sau khi đã kích hoạt merge trên backend
    localStorage.removeItem(CART_TOKEN_KEY);

    if (res.ok && res.items) {
      // 3. Nếu còn sản phẩm nào trong local chưa có trên server (ví dụ rớt mạng khi thêm trước đó), đẩy bổ sung
      const serverVariantIds = new Set(res.items.map((i) => i.variantId));
      for (const item of (localItems || [])) {
        let vId = item.variantId ?? item.product?.variantId;
        if (!vId || vId >= 90000) {
          vId = await this.resolveVariantId(item.product.id, vId);
        }
        if (vId && vId < 90000 && !serverVariantIds.has(vId)) {
          const addRes = await this.addItem(vId, item.quantity || item.qty || 1);
          if (addRes.ok && addRes.items) {
            res.items = addRes.items;
            serverVariantIds.add(vId);
          }
        }
      }
      return res.items;
    }
    return [];
  },
};

