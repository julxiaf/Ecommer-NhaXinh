import type { AdminOrder, AdminOrderItem, OrderStatusHistory } from "./types";
import { API_BASE } from "../apiEndpoints";

interface ApiOrderItem {
  id: number;
  variantId?: number | null;
  sku: string;
  productName: string;
  variantName?: string | null;
  optionValues?: string | null;
  unitPrice: number;
  quantity: number;
  discountAmount?: number | null;
  lineTotal: number;
  image?: string | null;
}

interface ApiStatusHistory {
  id: number;
  oldStatus?: string | null;
  newStatus: string;
  note?: string | null;
  changedByUsername?: string | null;
  createdAt: string;
}

interface ApiOrderSummary {
  id: number;
  orderCode: string;
  userId?: number | null;
  recipientName: string;
  recipientPhone: string;
  recipientEmail?: string | null;
  shippingAddress: string;
  subtotal: number;
  discountAmount?: number | null;
  shippingFee?: number | null;
  totalAmount: number;
  couponCode?: string | null;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod?: string | null;
  customerNote?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  totalItems?: number;
  items?: ApiOrderItem[];
  statusHistory?: ApiStatusHistory[];
}

interface ApiPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = path.startsWith("http") || path.startsWith(API_BASE) ? path : `${API_BASE}${path}`;
  const response = await fetch(url, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!response.ok) throw new Error(await readError(response));
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

function mapStatusToFrontend(status?: string | null): AdminOrder["status"] {
  switch ((status || "").toUpperCase()) {
    case "CONFIRMED":
      return "confirmed" as AdminOrder["status"];
    case "PROCESSING":
      return "processing";
    case "SHIPPING":
      return "shipping";
    case "DELIVERED":
    case "COMPLETED":
      return "completed";
    case "CANCELLED":
    case "REFUNDED":
      return "cancelled";
    case "PENDING":
    default:
      return "pending";
  }
}

function mapStatusToBackend(status: string): string {
  switch (status.toLowerCase()) {
    case "confirmed":
      return "CONFIRMED";
    case "processing":
      return "PROCESSING";
    case "shipping":
      return "SHIPPING";
    case "completed":
    case "delivered":
      return "COMPLETED";
    case "cancelled":
      return "CANCELLED";
    case "refunded":
      return "REFUNDED";
    case "pending":
    default:
      return "PENDING";
  }
}

function mapPaymentStatusToFrontend(paymentStatus?: string | null): AdminOrder["paymentStatus"] {
  switch ((paymentStatus || "").toUpperCase()) {
    case "PAID":
      return "paid";
    case "REFUNDED":
      return "refunded";
    case "PARTIALLY_PAID":
    case "UNPAID":
    default:
      return "pending";
  }
}

function mapPaymentStatusToBackend(paymentStatus: string): string {
  switch (paymentStatus.toLowerCase()) {
    case "paid":
      return "PAID";
    case "refunded":
      return "REFUNDED";
    case "partially_paid":
      return "PARTIALLY_PAID";
    case "unpaid":
    case "pending":
    default:
      return "UNPAID";
  }
}

export function mapPaymentMethodToFrontend(pm?: string | null): AdminOrder["paymentMethod"] {
  const m = (pm || "").toUpperCase();
  if (m.includes("VNPAY") || m === "VNP") return "vnpay";
  if (m.includes("MOMO")) return "momo";
  if (m.includes("BANK") || m.includes("TRANSFER") || m.includes("VIETQR")) return "bank_transfer";
  return "cod";
}

export function mapPaymentMethodToBackend(pm?: string | null): string {
  const m = (pm || "").toLowerCase();
  if (m === "vnpay") return "VNPAY";
  if (m === "momo") return "MOMO";
  if (m === "bank_transfer" || m === "vietqr") return "BANK_TRANSFER";
  return "CASH_ON_DELIVERY";
}

function formatDateTime(dt?: string | null): string {
  if (!dt) return new Date().toLocaleString("vi-VN");
  try {
    const d = new Date(dt);
    if (isNaN(d.getTime())) return dt;
    return d.toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dt;
  }
}

export function orderFromApi(o: ApiOrderSummary): AdminOrder {
  const items: AdminOrderItem[] = (o.items || []).map((it) => ({
    productId: it.variantId || it.id || 0,
    name: it.productName || "Sản phẩm",
    variantSku: it.sku,
    variantDetails: it.variantName || it.optionValues || undefined,
    image: it.image || "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=400&q=80",
    price: Number(it.unitPrice || 0),
    quantity: Number(it.quantity || 1),
  }));

  const statusHistory: OrderStatusHistory[] = (o.statusHistory || []).map((h) => ({
    id: String(h.id),
    status: mapStatusToFrontend(h.newStatus),
    timestamp: formatDateTime(h.createdAt),
    updatedBy: h.changedByUsername || "Hệ thống",
    note: h.note || undefined,
  }));

  return {
    id: String(o.id),
    orderCode: o.orderCode,
    customerName: o.recipientName,
    phone: o.recipientPhone,
    email: o.recipientEmail || "",
    address: o.shippingAddress,
    total: Number(o.totalAmount || 0),
    paymentMethod: mapPaymentMethodToFrontend(o.paymentMethod),
    paymentStatus: mapPaymentStatusToFrontend(o.paymentStatus),
    status: mapStatusToFrontend(o.orderStatus),
    createdAt: formatDateTime(o.createdAt),
    items,
    note: o.customerNote || undefined,
    statusHistory,
  };
}

export const orderApi = {
  /**
   * Lấy danh sách đơn hàng có phân trang và bộ lọc từ backend
   */
  async getOrders(params?: {
    keyword?: string;
    orderStatus?: string;
    paymentStatus?: string;
    page?: number;
    size?: number;
  }): Promise<AdminOrder[]> {
    const query = new URLSearchParams();
    if (params?.keyword) query.set("keyword", params.keyword);
    if (params?.orderStatus && params.orderStatus !== "all") {
      query.set("orderStatus", mapStatusToBackend(params.orderStatus));
    }
    if (params?.paymentStatus && params.paymentStatus !== "all") {
      query.set("paymentStatus", mapPaymentStatusToBackend(params.paymentStatus));
    }
    query.set("page", String(params?.page ?? 0));
    query.set("size", String(params?.size ?? 50));

    const result = await request<ApiPage<ApiOrderSummary>>(`/admin/orders?${query.toString()}`);
    return (result.content || []).map(orderFromApi);
  },

  /**
   * Lấy chi tiết đơn hàng (bao gồm items, statusHistory, deposit)
   */
  async getOrderDetail(id: string | number): Promise<AdminOrder> {
    const result = await request<ApiOrderSummary>(`/admin/orders/${id}`);
    return orderFromApi(result);
  },

  /**
   * Cập nhật trạng thái đơn hàng (PENDING, CONFIRMED, PROCESSING, SHIPPING, COMPLETED, CANCELLED...)
   */
  async updateStatus(
    id: string | number,
    status: string,
    note?: string
  ): Promise<AdminOrder> {
    const backendStatus = mapStatusToBackend(status);
    const result = await request<ApiOrderSummary>(`/admin/orders/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({
        status: backendStatus,
        note: note || undefined,
      }),
    });
    return orderFromApi(result);
  },

  /**
   * Cập nhật trạng thái thanh toán và phương thức thanh toán
   */
  async updatePaymentStatus(
    id: string | number,
    paymentStatus: string,
    paymentMethod?: string,
    note?: string
  ): Promise<AdminOrder> {
    const backendPayment = mapPaymentStatusToBackend(paymentStatus);
    const backendMethod = paymentMethod ? mapPaymentMethodToBackend(paymentMethod) : undefined;
    const result = await request<ApiOrderSummary>(`/admin/orders/${id}/payment`, {
      method: "PUT",
      body: JSON.stringify({
        paymentStatus: backendPayment,
        paymentMethod: backendMethod,
        note: note || undefined,
      }),
    });
    return orderFromApi(result);
  },

  /**
   * Cập nhật thông tin giao hàng & ghi chú đơn hàng
   */
  async updateShippingInfo(
    id: string | number,
    data: {
      recipientName: string;
      recipientPhone: string;
      shippingAddress: string;
      customerNote?: string;
    }
  ): Promise<AdminOrder> {
    const result = await request<ApiOrderSummary>(`/admin/orders/${id}/shipping`, {
      method: "PUT",
      body: JSON.stringify({
        recipientName: data.recipientName.trim(),
        recipientPhone: data.recipientPhone.trim(),
        shippingAddress: data.shippingAddress.trim(),
        customerNote: data.customerNote?.trim() || undefined,
      }),
    });
    return orderFromApi(result);
  },

  /**
   * Hủy đơn hàng kèm lý do
   */
  async cancelOrder(id: string | number, reason: string): Promise<AdminOrder> {
    const result = await request<ApiOrderSummary>(`/admin/orders/${id}/cancel`, {
      method: "PUT",
      body: JSON.stringify({
        reason: reason.trim() || "Admin hủy đơn hàng",
      }),
    });
    return orderFromApi(result);
  },
};
