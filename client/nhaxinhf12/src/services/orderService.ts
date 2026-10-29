import { ENDPOINTS, buildUrlWithQuery } from "./apiEndpoints";

export interface OrderItemResponse {
  id: number;
  productName: string;
  variantName?: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface OrderResponse {
  id: number;
  orderCode: string;
  orderStatus: string;
  paymentStatus: string;
  totalAmount: number;
  subtotal: number;
  shippingFee: number;
  discountAmount: number;
  recipientName: string;
  recipientPhone: string;
  recipientEmail?: string;
  shippingAddress: string;
  customerNote?: string;
  createdAt: string;
  items: OrderItemResponse[];
}

export const orderService = {
  /**
   * Lấy lịch sử đơn hàng của tài khoản đang đăng nhập
   */
  async getMyOrders(page = 0, size = 10): Promise<{ content: OrderResponse[]; totalElements: number }> {
    const token = localStorage.getItem("nhaxinh_auth_token");
    const url = buildUrlWithQuery(ENDPOINTS.ORDERS.MY, { page, size });
    const res = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) throw new Error("Không thể tải danh sách đơn hàng");
    return res.json();
  },

  /**
   * Tra cứu chi tiết đơn hàng theo mã đơn (kèm SĐT nếu là khách vãng lai)
   */
  async getOrderByCode(orderCode: string, phone?: string): Promise<OrderResponse> {
    const url = buildUrlWithQuery(ENDPOINTS.ORDERS.BY_CODE(orderCode), phone ? { phone } : undefined);
    
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error("Không tìm thấy đơn hàng");
    return res.json();
  },

  /**
   * Hủy đơn hàng (khi đơn còn ở trạng thái PENDING/CONFIRMED)
   */
  async cancelOrder(orderCode: string, phone?: string, reason?: string): Promise<void> {
    const res = await fetch(ENDPOINTS.ORDERS.CANCEL(orderCode), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, reason }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || "Không thể hủy đơn hàng này");
    }
  },

  /**
   * (Dành cho Admin/Staff) Lấy toàn bộ danh sách đơn hàng có bộ lọc
   */
  async getAdminOrders(params?: { keyword?: string; orderStatus?: string; paymentStatus?: string; page?: number; size?: number }) {
    const url = buildUrlWithQuery(ENDPOINTS.ADMIN.ORDERS.BASE, params);
    const token = localStorage.getItem("nhaxinh_auth_token");
    const res = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) throw new Error("Không thể tải danh sách đơn quản trị");
    return res.json();
  },
};
