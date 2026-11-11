import { useState, useEffect, useCallback, useMemo } from "react";
import {
  dashboardApi,
  calculateDashboardMetrics,
  type DashboardMetrics,
  type DashboardTimeRange,
} from "../../services/admin/dashboardApi";
import type { AdminOrder, AdminProduct, AdminDiscount, RoleDefinition } from "../../services/admin/types";

export type { DashboardTimeRange };

interface UseAdminDashboardOptions {
  orders?: AdminOrder[];
  products?: AdminProduct[];
  discounts?: AdminDiscount[];
  currentRole?: RoleDefinition;
  onRestockProduct?: (id: number, amount: number) => void;
}

/**
 * useAdminDashboard - Hook quản trị tổng quan theo kiến trúc Props-First & Pure In-Memory Computation.
 *
 * 1. Props-First: Tận dụng dữ liệu orders, products, discounts đã có từ AdminPortal cha,
 *    loại bỏ 100% tình trạng gọi API trùng lặp (Double-Fetch) khi mở tab Tổng quan.
 * 2. Instant In-Memory Filter: Bộ lọc thời gian (All, Today, 7 days, Month) được tính toán tức thì (< 5ms)
 *    bằng useMemo mà không cần gửi request round-trip lên máy chủ.
 * 3. Graceful Fallback: Vẫn hỗ trợ tự động fetch từ backend nếu hook được gọi độc lập không có props.
 */
export function useAdminDashboard({
  orders: propOrders,
  products: propProducts,
  discounts: propDiscounts,
  currentRole,
  onRestockProduct,
}: UseAdminDashboardOptions = {}) {
  // Kiểm tra xem đã có dữ liệu props truyền từ AdminPortal hay chưa
  const hasProps = Boolean(propOrders && propOrders.length > 0) || Boolean(propProducts && propProducts.length > 0);

  const [orders, setOrders] = useState<AdminOrder[]>(propOrders || []);
  const [products, setProducts] = useState<AdminProduct[]>(propProducts || []);
  const [discounts, setDiscounts] = useState<AdminDiscount[]>(propDiscounts || []);

  const [isLoading, setIsLoading] = useState<boolean>(!hasProps);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<DashboardTimeRange>("all");
  const [restockedSuccessId, setRestockedSuccessId] = useState<number | null>(null);

  // Đồng bộ props nếu component cha (AdminPortal) cung cấp hoặc cập nhật mới
  useEffect(() => {
    if (propOrders) {
      setOrders(propOrders);
      setIsLoading(false);
    }
  }, [propOrders]);

  useEffect(() => {
    if (propProducts) {
      setProducts(propProducts);
      setIsLoading(false);
    }
  }, [propProducts]);

  useEffect(() => {
    if (propDiscounts) {
      setDiscounts(propDiscounts);
    }
  }, [propDiscounts]);

  /**
   * Gọi service dashboardApi để nạp dữ liệu từ Backend khi người dùng bấm "Làm mới" hoặc khi chạy độc lập
   */
  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const data = await dashboardApi.getDashboardData();
      setOrders(data.orders);
      setProducts(data.products);
      setDiscounts(data.discounts);
    } catch (err: unknown) {
      console.error("Lỗi khi tải dữ liệu dashboard:", err);
      setError(err instanceof Error ? err.message : "Không thể đồng bộ dữ liệu tổng quan từ máy chủ.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Chỉ tự động gọi API mạng nếu KHÔNG có props được truyền từ component cha
  useEffect(() => {
    if (!hasProps) {
      loadDashboard(false);
    }
  }, [hasProps, loadDashboard]);

  /**
   * Nạp lại dữ liệu chủ động từ Backend khi người dùng bấm nút Refresh
   */
  const handleRefresh = useCallback(async () => {
    await loadDashboard(true);
  }, [loadDashboard]);

  /**
   * Nhập hàng nhanh vào kho (+10 sản phẩm)
   */
  const handleQuickRestock = useCallback(
    async (productId: number, amount = 10) => {
      try {
        if (onRestockProduct) {
          onRestockProduct(productId, amount);
        } else {
          await dashboardApi.restockProduct(productId, amount, currentRole);
        }

        // Cập nhật optimistic local state ngay lập tức
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, stock: (Number(p.stock) || 0) + amount } : p))
        );

        setRestockedSuccessId(productId);
        setTimeout(() => setRestockedSuccessId(null), 2500);
      } catch (err) {
        console.error("Lỗi khi nhập thêm tồn kho:", err);
      }
    },
    [onRestockProduct, currentRole]
  );

  /**
   * Tính toán toàn bộ chỉ số Dashboard trực tiếp trong bộ nhớ (< 5ms)
   * Thay đổi timeRange cho kết quả hiển thị tức thì, siêu mượt.
   */
  const metrics = useMemo<DashboardMetrics>(() => {
    return calculateDashboardMetrics(orders, products, discounts, timeRange);
  }, [orders, products, discounts, timeRange]);

  return {
    orders,
    products,
    discounts,
    metrics,
    isLoading,
    isRefreshing,
    error,
    timeRange,
    setTimeRange,
    restockedSuccessId,
    handleRefresh,
    handleQuickRestock,
  };
}
