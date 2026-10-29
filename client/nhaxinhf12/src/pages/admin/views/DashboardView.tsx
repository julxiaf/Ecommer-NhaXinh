import {
  TrendingUp, Package, Tag, ArrowUpRight,
  Clock, CheckCircle2, Truck, XCircle, CreditCard,
  AlertTriangle, RotateCw, LayoutDashboard
} from "lucide-react";
import type { AdminOrder, AdminProduct, AdminDiscount, RoleDefinition } from "../../../services/admin/types";
import AdminCharts from "../AdminCharts";
import { vnd } from "../../../util/Constain";
import { useAdminDashboard, type DashboardTimeRange } from "../../../hooks/admin/useAdminDashboard";

interface DashboardViewProps {
  orders?: AdminOrder[];
  products?: AdminProduct[];
  discounts?: AdminDiscount[];
  currentRole: RoleDefinition;
  onNavigateTab: (tab: any) => void;
  onRestockProduct?: (id: number, amount: number) => void;
}

export default function DashboardView({
  orders: propOrders,
  products: propProducts,
  discounts: propDiscounts,
  currentRole,
  onNavigateTab,
  onRestockProduct,
}: DashboardViewProps) {
  // Sử dụng custom hook tổ chức theo kiến trúc Clean Code: Hook + Service + API
  const {
    orders,
    products,
    metrics,
    isLoading,
    isRefreshing,
    error,
    timeRange,
    setTimeRange,
    handleRefresh,
    handleQuickRestock,
  } = useAdminDashboard({
    orders: propOrders,
    products: propProducts,
    discounts: propDiscounts,
    currentRole,
    onRestockProduct,
  });

  // Skeleton loading khi lần đầu gọi API
  if (isLoading && !metrics) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Skeleton Header */}
        <div className="h-16 bg-white rounded-2xl border border-slate-200/80 p-4 flex items-center justify-between">
          <div className="h-6 bg-slate-200 rounded-lg w-48" />
          <div className="h-8 bg-slate-200 rounded-xl w-32" />
        </div>

        {/* Skeleton KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-white rounded-2xl border border-slate-200/80 p-5 space-y-3">
              <div className="h-8 w-8 bg-slate-200 rounded-lg" />
              <div className="h-4 bg-slate-200 rounded w-28" />
              <div className="h-7 bg-slate-200 rounded w-36" />
            </div>
          ))}
        </div>

        {/* Skeleton Chart */}
        <div className="h-72 bg-white rounded-2xl border border-slate-200/80 p-6" />
      </div>
    );
  }

  // Màn hình lỗi nếu API thất bại
  if (error && !metrics) {
    return (
      <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center space-y-4 shadow-xs">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <AlertTriangle size={24} />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">Không thể tải dữ liệu Dashboard từ API</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">{error}</p>
        </div>
        <button
          type="button"
          onClick={() => handleRefresh()}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-all shadow-xs"
        >
          <RotateCw size={14} /> Thử lại
        </button>
      </div>
    );
  }

  // Dữ liệu an toàn từ metrics
  const m = metrics || {
    totalRevenue: 0,
    revenueGrowthPercent: 0,
    totalOrders: orders.length,
    pendingOrders: 0,
    processingOrders: 0,
    shippingOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    activeProducts: products.length,
    lowStockCount: 0,
    activeDiscounts: 0,
    paymentStats: [],
    recentOrders: orders.slice(0, 5),
    dailyRevenue: [],
    monthlyRevenue: [],
    categoryStats: [],
    lowStockProducts: [],
  };

  const timeRangeOptions: { id: DashboardTimeRange; label: string }[] = [
    { id: "all", label: "Tất cả thời gian" },
    { id: "today", label: "Hôm nay" },
    { id: "7days", label: "7 ngày qua" },
    { id: "month", label: "Tháng này" },
  ];

  return (
    <div className="space-y-6 text-slate-800">
      {/* ════════ HEADER TỔNG QUAN VÀ BỘ LỌC THỜI GIAN THỰC ════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <LayoutDashboard className="text-blue-600" size={24} />
            Tổng quan & Doanh số
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Dữ liệu thống kê thời gian thực từ API đơn hàng và cơ sở dữ liệu nội thất
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Lọc nhanh thời gian */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            {timeRangeOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTimeRange(opt.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  timeRange === opt.id
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Nút làm mới dữ liệu từ API */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all shadow-xs disabled:opacity-60"
            title="Đồng bộ dữ liệu mới nhất từ API"
          >
            <RotateCw size={14} className={isRefreshing ? "animate-spin text-blue-600" : ""} />
            <span>{isRefreshing ? "Đang đồng bộ..." : "Làm mới API"}</span>
          </button>
        </div>
      </div>

      {/* ════════ 1. LƯỚI THẺ KPI CHÍNH ════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Doanh thu */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md hover:border-blue-200 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Tổng doanh thu thực nhận</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-blue-600">{vnd(m.totalRevenue)}</h3>
            <div className="flex items-center gap-1 mt-1 text-xs font-semibold text-emerald-600">
              <ArrowUpRight size={14} /> +{m.revenueGrowthPercent}% so với kỳ trước
            </div>
          </div>
        </div>

        {/* Đơn hàng cần xử lý */}
        <div
          onClick={() => onNavigateTab("orders")}
          className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md hover:border-amber-200 transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Đơn hàng cần xử lý</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Clock size={20} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-amber-600">{m.pendingOrders} đơn</h3>
            <span className="text-xs font-medium text-slate-500 block mt-1">
              +{m.processingOrders} đang đóng gói
            </span>
          </div>
        </div>

        {/* Sản phẩm đang bán */}
        <div
          onClick={() => onNavigateTab("products")}
          className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Sản phẩm đang kinh doanh</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Package size={20} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-emerald-600">{m.activeProducts} mặt hàng</h3>
            {m.lowStockCount > 0 ? (
              <span className="text-xs font-semibold text-rose-600 flex items-center gap-1 mt-1">
                <AlertTriangle size={13} /> {m.lowStockCount} mặt hàng sắp hết kho
              </span>
            ) : (
              <span className="text-xs font-medium text-slate-500 block mt-1">
                Tồn kho an toàn
              </span>
            )}
          </div>
        </div>

        {/* Khuyến mãi đang chạy */}
        <div
          onClick={() => onNavigateTab("discounts")}
          className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md hover:border-pink-200 transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Khuyến mãi đang chạy</span>
            <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Tag size={20} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-pink-600">{m.activeDiscounts} voucher</h3>
            <span className="text-xs font-medium text-slate-500 block mt-1">
              Kích cầu doanh số
            </span>
          </div>
        </div>
      </div>

      {/* ════════ 2. BIỂU ĐỒ DOANH THU & TỒN KHO THEO DANH MỤC ════════ */}
      <AdminCharts
        products={products}
        orders={orders}
        onRestock={handleQuickRestock}
        currentRole={currentRole}
      />

      {/* ════════ 3. TIẾN ĐỘ ĐƠN HÀNG & PHƯƠNG THỨC THANH TOÁN ════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cột trái (7 cols): Phân bổ trạng thái & Bảng đơn hàng mới nhận */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Tổng quan đơn hàng theo trạng thái</h3>
              <p className="text-xs text-slate-500 mt-0.5">Tiến độ luân chuyển và xử lý đơn trên hệ thống</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab("orders")}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 self-start sm:self-auto"
            >
              <span>Xem tất cả ({m.totalOrders})</span>
              <ArrowUpRight size={14} />
            </button>
          </div>

          {/* 5 Thẻ trạng thái đơn hàng */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80">
              <div className="flex items-center justify-between text-amber-700 text-xs font-semibold">
                <span>Chờ xác nhận</span>
                <Clock size={15} />
              </div>
              <div className="text-xl font-black text-amber-900 mt-2">{m.pendingOrders}</div>
            </div>

            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80">
              <div className="flex items-center justify-between text-blue-700 text-xs font-semibold">
                <span>Đang xử lý</span>
                <Package size={15} />
              </div>
              <div className="text-xl font-black text-blue-900 mt-2">{m.processingOrders}</div>
            </div>

            <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200/80">
              <div className="flex items-center justify-between text-indigo-700 text-xs font-semibold">
                <span>Đang giao</span>
                <Truck size={15} />
              </div>
              <div className="text-xl font-black text-indigo-900 mt-2">{m.shippingOrders}</div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
              <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold">
                <span>Hoàn tất</span>
                <CheckCircle2 size={15} />
              </div>
              <div className="text-xl font-black text-emerald-900 mt-2">{m.completedOrders}</div>
            </div>

            <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200/80 col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between text-rose-700 text-xs font-semibold">
                <span>Đã hủy</span>
                <XCircle size={15} />
              </div>
              <div className="text-xl font-black text-rose-900 mt-2">{m.cancelledOrders}</div>
            </div>
          </div>

          {/* Mini Table: Đơn hàng mới nhận */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Đơn hàng mới nhận từ khách hàng
            </h4>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">MÃ ĐƠN</th>
                    <th className="py-2.5 px-3">KHÁCH HÀNG</th>
                    <th className="py-2.5 px-3">TỔNG TIỀN</th>
                    <th className="py-2.5 px-3">THANH TOÁN</th>
                    <th className="py-2.5 px-3">TRẠNG THÁI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {m.recentOrders.length > 0 ? (
                    m.recentOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-600">
                          {ord.orderCode}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {ord.customerName}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {vnd(ord.total)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {ord.paymentMethod}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                              ord.status === "completed"
                                ? "bg-emerald-100 text-emerald-800"
                                : ord.status === "shipping"
                                ? "bg-indigo-100 text-indigo-800"
                                : ord.status === "processing"
                                ? "bg-blue-100 text-blue-800"
                                : ord.status === "cancelled"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {ord.status === "completed" && "Hoàn tất"}
                            {ord.status === "shipping" && "Đang giao"}
                            {ord.status === "processing" && "Đang xử lý"}
                            {ord.status === "cancelled" && "Đã hủy"}
                            {ord.status === "pending" && "Chờ duyệt"}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400 italic">
                        Chưa có đơn hàng nào được ghi nhận.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Cột phải (5 cols): Phương thức thanh toán & Mẹo vận hành */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
              <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                <CreditCard size={18} />
              </span>
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">Phương thức thanh toán</h3>
                <p className="text-xs text-slate-500">Tỷ lệ các kênh khách hàng lựa chọn</p>
              </div>
            </div>

            <div className="space-y-4">
              {m.paymentStats.map((item) => (
                <div key={item.method} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-2 text-slate-800">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block"
                        style={{ backgroundColor: item.color }}
                      />
                      {item.label}
                    </span>
                    <span className="text-slate-600">
                      {item.count} đơn ({item.percent}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${item.percent}%`, backgroundColor: item.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 leading-relaxed">
            <span className="font-bold text-slate-900">💡 Mẹo vận hành:</span> 75% đơn hàng thanh toán trước qua VietQR/VNPAY giúp tối ưu luân chuyển hàng hóa và giảm tỷ lệ hoàn đơn xuống dưới 1.2%.
          </div>
        </div>
      </div>
    </div>
  );
}
