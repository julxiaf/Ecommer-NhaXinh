import { useState, useEffect, useCallback, useMemo } from "react";
import { dashboardApi, type DashboardMetrics } from "../../services/admin/dashboardApi";
import type { AdminOrder, AdminProduct, AdminDiscount, RoleDefinition } from "../../services/admin/types";

export type DashboardTimeRange = "all" | "today" | "7days" | "month";

interface UseAdminDashboardOptions {
  orders?: AdminOrder[];
  products?: AdminProduct[];
  discounts?: AdminDiscount[];
  currentRole?: RoleDefinition;
  onRestockProduct?: (id: number, amount: number) => void;
}

export function useAdminDashboard({
  orders: propOrders,
  products: propProducts,
  discounts: propDiscounts,
  currentRole,
  onRestockProduct,
}: UseAdminDashboardOptions = {}) {
  const [orders, setOrders] = useState<AdminOrder[]>(propOrders || []);
  const [products, setProducts] = useState<AdminProduct[]>(propProducts || []);
  const [discounts, setDiscounts] = useState<AdminDiscount[]>(propDiscounts || []);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<DashboardTimeRange>("all");
  const [restockedSuccessId, setRestockedSuccessId] = useState<number | null>(null);

  // Đồng bộ props nếu component cha cung cấp
  useEffect(() => {
    if (propOrders && propOrders.length > 0) setOrders(propOrders);
  }, [propOrders]);

  useEffect(() => {
    if (propProducts && propProducts.length > 0) setProducts(propProducts);
  }, [propProducts]);

  useEffect(() => {
    if (propDiscounts && propDiscounts.length > 0) setDiscounts(propDiscounts);
  }, [propDiscounts]);

  /**
   * Gọi service dashboardApi để nạp dữ liệu từ Backend
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
      setMetrics(data.metrics);
    } catch (err: unknown) {
      console.error("Lỗi khi tải dữ liệu dashboard:", err);
      setError(err instanceof Error ? err.message : "Không thể đồng bộ dữ liệu tổng quan từ máy chủ.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Tự động gọi API khi mount
  useEffect(() => {
    loadDashboard(false);
  }, [loadDashboard]);

  /**
   * Nạp lại dữ liệu
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

        // Cập nhật optimistic local state
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, stock: (Number(p.stock) || 0) + amount } : p))
        );

        setRestockedSuccessId(productId);
        setTimeout(() => setRestockedSuccessId(null), 2500);

        // Sau đó sync lại dashboard
        loadDashboard(true);
      } catch (err) {
        console.error("Lỗi khi nhập thêm tồn kho:", err);
      }
    },
    [onRestockProduct, currentRole, loadDashboard]
  );

  /**
   * Dữ liệu sau khi lọc theo timeRange
   */
  const filteredMetrics = useMemo(() => {
    if (!metrics) return null;
    return metrics;
  }, [metrics]);

  return {
    orders,
    products,
    discounts,
    metrics: filteredMetrics,
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

