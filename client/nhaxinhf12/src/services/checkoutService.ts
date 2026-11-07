import type { CartItem } from "../hooks/useStore";
import { ENDPOINTS, buildUrlWithQuery } from "./apiEndpoints";
import { cartService } from "./cartService";

export interface CheckoutApiRequest {
  recipientName: string;
  recipientPhone: string;
  recipientEmail?: string;
  shippingAddress: string;
  paymentMethod: "CASH_ON_DELIVERY" | "BANK_TRANSFER" | "VNPAY";
  customerNote?: string;
  couponCode?: string;
  shippingFee?: number;
}

export interface CheckoutApiResponse {
  orderId: number;
  orderCode: string;
  orderStatus: string;
  paymentStatus: string;
  totalAmount: number;
  paymentId: number;
  paymentMethod: string;
  paymentRecordStatus: string;
  paymentUrl?: string | null;
}

export interface OrderItemDetail {
  id: number;
  variantId?: number;
  productName: string;
  variantName?: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  imageUrl?: string;
}

export interface OrderDetailData {
  id: number;
  orderCode: string;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string;
  recipientName: string;
  recipientPhone: string;
  recipientEmail?: string;
  shippingAddress: string;
  subtotal?: number;
  discountAmount?: number;
  shippingFee?: number;
  couponCode?: string;
  totalAmount: number;
  customerNote?: string;
  createdAt: string;
  items?: OrderItemDetail[];
}
export const apiaddress = {
  async getAllProvince() {
    try {
      const res = await fetch(ENDPOINTS.ADDRESSKIT.PROVINCEALL);
      if (!res.ok) {
        throw new Error(`Lỗi HTTP! Trạng thái: ${res.status}`);
      }
      const data = await res.json();
      return data.provinces || [];
    } catch (error) {
      console.error("Không thể lấy danh sách tỉnh/thành phố:", error);
      return [];
    }
  },
  async getProvinceDetail(id: string | number) {
    try {
      const res = await fetch(ENDPOINTS.ADDRESSKIT.PROVINCECODE(String(id)));
      if (!res.ok) {
        throw new Error(`Lỗi HTTP! Trạng thái: ${res.status}`);
      }
      const data = await res.json();
      return data.communes || [];
    } catch (error) {
      console.error("Không thể lấy danh sách xã/phường:", error);
      return [];
    }
  }
};
export const checkoutService = {
  /**
   * Lấy hoặc yêu cầu máy chủ cấp mới X-Cart-Token cho khách vãng lai
   * (Cấp trực tiếp bởi CartController: POST /api/v1/cart/session)
   */
  async getOrCreateCartToken(): Promise<string> {
    return cartService.getOrCreateCartToken();
  },

  /**
   * Lấy Headers chuẩn cho Cart & Checkout
   */
  async getAuthHeaders(): Promise<Record<string, string>> {
    return cartService.getHeaders();
  },

  /**
   * Đồng bộ giỏ hàng từ Client vào giỏ hàng Server (/api/v1/cart/items)
   */
  async syncCartToServer(cartItems: CartItem[]): Promise<boolean> {
    if (!cartItems || cartItems.length === 0) return false;

    // Nếu toàn bộ các món trong giỏ đã có backendItemId (đã được đồng bộ với server qua cartService),
    // không cần xóa và gửi lại tuần tự từng món làm chậm quá trình thanh toán.
    const allSyncedOnServer = cartItems.every((item) => Boolean(item.backendItemId));
    if (allSyncedOnServer) {
      return true;
    }

    try {
      const headers = await this.getAuthHeaders();

      // Dọn dẹp giỏ hàng cũ trên máy chủ trước khi đồng bộ để tránh cộng dồn
      try {
        await fetch(ENDPOINTS.CART.ITEMS, {
          method: "DELETE",
          headers,
          credentials: "include",
        });
      } catch {
        // Bỏ qua nếu endpoint DELETE chưa sẵn sàng
      }

      await Promise.all(
        cartItems.map(async (item) => {
          // Tìm variant ID ưu tiên từ item.variantId -> item.product.variantId -> variants[0].id
          let variantId = item.variantId ?? item.product.variantId;
          if (!variantId && item.product.variants && item.product.variants.length > 0) {
            variantId = item.product.variants[0].id;
          }

          // Nếu sản phẩm chưa có variantId (ví dụ thêm từ danh sách), map với variant từ backend
          if (!variantId) {
            try {
              const res = await fetch(ENDPOINTS.PRODUCTS.BY_ID(item.product.id), {
                credentials: "include",
              });
              if (res.ok) {
                const detail = await res.json();
                if (detail.variants && detail.variants.length > 0) {
                  variantId = detail.variants[0].id;
                }
              }
            } catch {
              // Bỏ qua
            }
          }

          // Bỏ qua các ID demo không có trong database thật (> 90000)
          if (variantId && variantId < 90000) {
            await fetch(ENDPOINTS.CART.ITEMS, {
              method: "POST",
              headers,
              credentials: "include",
              body: JSON.stringify({
                variantId,
                quantity: item.quantity,
              }),
            });
          }
        })
      );
      return true;
    } catch (err) {
      console.warn("[checkoutService] Lỗi khi đồng bộ giỏ hàng lên server:", err);
      return false;
    }
  },

  /**
   * Gọi API đặt hàng và thanh toán: POST /api/v1/checkout
   */
  async processCheckout(
    request: CheckoutApiRequest,
    cartItems?: CartItem[]
  ): Promise<{ success: boolean; data?: CheckoutApiResponse; error?: string }> {
    try {
      // 1. Đồng bộ giỏ hàng lên server trước khi checkout
      if (cartItems && cartItems.length > 0) {
        await this.syncCartToServer(cartItems);
      }

      // 2. Gửi request checkout
      const headers = await this.getAuthHeaders();
      const res = await fetch(ENDPOINTS.CHECKOUT.BASE, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify(request),
      });
      console.log("Checkout",res)
      if (res.ok) {
        const data: CheckoutApiResponse = await res.json();
        return { success: true, data };
      }

      // Xử lý lỗi từ server (400, 422, 500)
      let errorMessage = "Thanh toán không thành công. Vui lòng kiểm tra lại thông tin.";
      try {
        const errJson = await res.json();
        if (errJson.message) {
          errorMessage = errJson.message;
        } else if (errJson.error) {
          errorMessage = errJson.error;
        }
      } catch {
        // Bỏ qua lỗi parse
      }

      return { success: false, error: errorMessage };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Lỗi kết nối tới máy chủ thanh toán. Vui lòng thử lại sau.",
      };
    }
  },

  /**
   * Tra cứu chi tiết đơn hàng: GET /api/v1/orders/{orderCode}?phone={phone}
   */
  async getOrderDetail(orderCode: string, phone?: string): Promise<OrderDetailData | null> {
    try {
      const headers = await this.getAuthHeaders();
      const url = buildUrlWithQuery(ENDPOINTS.ORDERS.BY_CODE(orderCode), phone ? { phone } : undefined);
      const res = await fetch(url, { headers });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Bỏ qua
    }
    return null;
  },

  /**
   * Thanh toán lại đơn hàng: POST /api/v1/checkout/payments/order/{orderCode}/retry
   */
  async retryPayment(
    orderCode: string,
    paymentMethod: "CASH_ON_DELIVERY" | "BANK_TRANSFER" | "VNPAY",
    phone?: string
  ): Promise<{ success: boolean; data?: CheckoutApiResponse; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const url = buildUrlWithQuery(ENDPOINTS.CHECKOUT.RETRY_PAYMENT(orderCode), phone ? { phone } : undefined);
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ paymentMethod }),
      });

      if (res.ok) {
        const data: CheckoutApiResponse = await res.json();
        return { success: true, data };
      }

      let errorMessage = "Không thể thanh toán lại. Vui lòng thử lại.";
      try {
        const errJson = await res.json();
        if (errJson.message) errorMessage = errJson.message;
      } catch {
        // Bỏ qua
      }
      return { success: false, error: errorMessage };
    } catch (err: any) {
      return { success: false, error: err.message || "Lỗi kết nối máy chủ." };
    }
  },

  /**
   * Kiểm tra và tính toán số tiền giảm giá của mã coupon: GET /api/v1/coupons/validate
   */
  async validateCoupon(
    code: string,
    subtotal: number,
    shippingFee: number,
    phone?: string
  ): Promise<{
    valid: boolean;
    code?: string;
    discountAmount?: number;
    error?: string;
  }> {
    try {
      const headers = await this.getAuthHeaders();
      const params: Record<string, string> = {
        code: code.trim().toUpperCase(),
        subtotal: String(Math.max(0, Math.round(subtotal))),
        shippingFee: String(Math.max(0, Math.round(shippingFee))),
      };
      if (phone && phone.trim()) {
        params.phone = phone.trim();
      }
      const url = buildUrlWithQuery(ENDPOINTS.COUPONS.VALIDATE, params);
      const res = await fetch(url, {
        method: "GET",
        headers,
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        return {
          valid: true,
          code: data.code,
          discountAmount: Number(data.discountAmount || 0),
        };
      }
      let errorMessage = "Mã giảm giá không hợp lệ hoặc đã hết hạn.";
      try {
        const errJson = await res.json();
        if (errJson.message) errorMessage = errJson.message;
      } catch {
        // Bỏ qua
      }
      return { valid: false, error: errorMessage };
    } catch {
      return { valid: false, error: "OFFLINE" };
    }
  },

  /**
   * Lấy danh sách các mã giảm giá công khai đang áp dụng: GET /api/v1/coupons/public
   */
  async getPublicCoupons(): Promise<Array<{
    code: string;
    name: string;
    description: string;
    discountType: string;
    discountValue: number;
    minOrderAmount: number;
    targetCustomer: string;
    scopeType: string;
  }>> {
    try {
      const res = await fetch(ENDPOINTS.COUPONS.PUBLIC, {
        method: "GET",
        credentials: "include",
      });
      if (res.ok) {
        return (await res.json()) as Array<{
          code: string;
          name: string;
          description: string;
          discountType: string;
          discountValue: number;
          minOrderAmount: number;
          targetCustomer: string;
          scopeType: string;
        }>;
      }
      return [];
    } catch {
      return [];
    }
  },

  /**
   * Gửi hoặc gửi lại email thông báo xác nhận đơn hàng: POST /api/v1/notifications/emails/order/{orderCode}/resend
   */
  async resendOrderEmail(
    orderCode: string,
    email?: string
  ): Promise<{
    success: boolean;
    recipientEmail?: string;
    message?: string;
    error?: string;
  }> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(
        ENDPOINTS.NOTIFICATIONS.RESEND_ORDER_EMAIL(orderCode),
        {
          method: "POST",
          headers,
          credentials: "include",
          body: JSON.stringify({ email: email?.trim() || undefined }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        return {
          success: Boolean(data.success),
          recipientEmail: data.recipientEmail,
          message:
            data.message ||
            `Đã gửi thông báo đơn hàng #${orderCode} tới email ${data.recipientEmail || email}`,
        };
      }
      return {
        success: false,
        error: data.message || "Không thể gửi thông báo email lúc này.",
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Lỗi kết nối máy chủ khi gửi thông báo email.",
      };
    }
  },
};
