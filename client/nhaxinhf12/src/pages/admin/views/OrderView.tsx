import { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  ShoppingCart, Search, Eye, Printer, CheckCircle2,
  Clock, XCircle, Package, Phone, MapPin, CreditCard,
  Send, AlertCircle, RotateCw, Edit3, Save, Trash2, Mail, X,
  FileSpreadsheet
} from "lucide-react";
import type { AdminOrder, RoleDefinition } from "../../../services/admin/types";
import PermissionGate, { hasPermission } from "../../../components/admin/PermissionGate";
import { AdminPagination } from "../../../components/admin/AdminPagination";
import { useAdminOrders } from "../../../hooks/admin/useAdminOrders";
import { vnd } from "../../../util/Constain";
import { exportOrdersToExcel } from "../../../util/excelExport";
interface OrderViewProps {
  orders: AdminOrder[];
  currentRole: RoleDefinition;
  onUpdateStatus: (orderId: string, newStatus: AdminOrder["status"], note?: string) => Promise<void> | void;
  onConfirmPayment: (orderId: string, paymentStatus?: string, paymentMethod?: string, note?: string) => Promise<void>;
  onUpdateShipping?: (
    orderId: string,
    data: { recipientName: string; recipientPhone: string; shippingAddress: string; customerNote?: string }
  ) => Promise<void>;
  onCancelOrder?: (orderId: string, reason: string) => Promise<void>;
  onRefreshOrders?: () => Promise<void>;
}

export default function OrderView({
  orders,
  currentRole,
  onUpdateStatus,
  onConfirmPayment,
  onUpdateShipping,
  onCancelOrder,
  onRefreshOrders,
}: OrderViewProps) {
  const {
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    paymentStatusFilter,
    setPaymentStatusFilter,
    paymentMethodFilter,
    setPaymentMethodFilter,
    filteredOrders,
    pagination,
    selectedOrder,
    setSelectedOrder,
    isLoadingDetail,
    isRefreshing,
    newStatus,
    setNewStatus,
    statusNote,
    setStatusNote,
    isSubmittingStatus,
    paymentStatusInput,
    setPaymentStatusInput,
    paymentMethodInput,
    setPaymentMethodInput,
    paymentNote,
    setPaymentNote,
    isSubmittingPayment,
    isEditingShipping,
    setIsEditingShipping,
    shippingForm,
    setShippingForm,
    isSubmittingShipping,
    cancelModalOrder,
    setCancelModalOrder,
    cancelReason,
    setCancelReason,
    isSubmittingCancel,
    isSendingOrderEmail,
    toast,
    setToast,
    sortedStatusHistory,
    handleRefresh,
    handleOpenDetail,
    handleApplyStatusChange,
    handleApplyPaymentChange,
    handleSaveShipping,
    handleConfirmCancel,
    handleSendOrderEmail,
  } = useAdminOrders({
    orders,
    currentRole,
    onUpdateStatus,
    onConfirmPayment,
    onUpdateShipping,
    onCancelOrder,
    onRefreshOrders,
  });

  const { paginatedItems: displayedOrders } = pagination;

  // Khóa cuộn trang nền khi mở Modal và hỗ trợ phím Escape
  useEffect(() => {
    if (selectedOrder || cancelModalOrder) {
      const prevBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          if (cancelModalOrder) setCancelModalOrder(null);
          else if (selectedOrder) setSelectedOrder(null);
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = prevBodyOverflow;
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [selectedOrder, cancelModalOrder, setCancelModalOrder, setSelectedOrder]);

  const statusBadge = (st: string) => {
    switch (st?.toLowerCase()) {
      case "pending":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Chờ xác nhận
          </span>
        );
      case "confirmed":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            Đã xác nhận
          </span>
        );
      case "processing":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Đang xử lý
          </span>
        );
      case "shipping":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            Đang giao hàng
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Hoàn tất
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            Đã hủy
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {st}
          </span>
        );
    }
  };

  const paymentBadge = (pst?: string) => {
    switch (pst?.toLowerCase()) {
      case "paid":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
            ĐÃ THANH TOÁN
          </span>
        );
      case "partially_paid":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
            ĐÃ CỌC MỘT PHẦN
          </span>
        );
      case "refunded":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
            ĐÃ HOÀN TIỀN
          </span>
        );
      case "pending":
      case "unpaid":
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
            CHỜ THANH TOÁN
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 text-slate-800 relative">
      {toast &&
        createPortal(
          <div
            className={`fixed top-6 right-6 z-100005 px-4 py-3.5 rounded-2xl shadow-2xl border text-xs font-semibold flex items-center gap-3 backdrop-blur-md animate-in slide-in-from-top-3 duration-200 max-w-md ${
              toast.type === "success"
                ? "bg-emerald-600 text-white border-emerald-500 shadow-emerald-950/25"
                : "bg-rose-600 text-white border-rose-500 shadow-rose-950/25"
            }`}
            style={{ zIndex: 100005 }}
          >
            {toast.type === "success" ? (
              <CheckCircle2 size={18} className="shrink-0 text-emerald-100" />
            ) : (
              <AlertCircle size={18} className="shrink-0 text-rose-100" />
            )}
            <span className="leading-relaxed flex-1">{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors text-white/80 hover:text-white shrink-0"
              title="Đóng thông báo"
            >
              <X size={14} />
            </button>
          </div>,
          document.body
        )}

      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShoppingCart className="text-blue-600" size={24} />
            Quản lý Đơn hàng
          </h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Export Excel button */}
          <button
            type="button"
            onClick={() => exportOrdersToExcel(orders)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold transition-all shadow-xs cursor-pointer"
            title="Xuất toàn bộ danh sách đơn hàng và chi tiết sản phẩm ra file Excel (.xlsx)"
          >
            <FileSpreadsheet size={14} className="text-emerald-600" />
            <span>Xuất Excel</span>
          </button>

          {onRefreshOrders && (
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all shadow-xs disabled:opacity-60"
            >
              <RotateCw size={14} className={isRefreshing ? "animate-spin text-blue-600" : ""} />
              {isRefreshing ? "Đang đồng bộ..." : "Làm mới"}
            </button>
          )}

          {/* Filter status tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {(["all", "pending", "confirmed", "processing", "shipping", "completed", "cancelled"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === st
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {st === "all" && `Tất cả (${orders.length})`}
                {st === "pending" && `Chờ duyệt (${orders.filter((o) => o.status === "pending").length})`}
                {st === "confirmed" && `Đã xác nhận (${orders.filter((o) => o.status === "confirmed").length})`}
                {st === "processing" && "Đang xử lý"}
                {st === "shipping" && "Đang giao"}
                {st === "completed" && "Hoàn tất"}
                {st === "cancelled" && "Đã hủy"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search & Extra Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative max-w-md w-full sm:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo mã đơn (DH-...), tên khách, SĐT, địa chỉ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <select
            value={paymentStatusFilter}
            onChange={(e) => setPaymentStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
          >
            <option value="all">Mọi TT thanh toán</option>
            <option value="paid">Đã thanh toán</option>
            <option value="unpaid">Chờ thanh toán</option>
            <option value="partially_paid">Đã cọc một phần</option>
            <option value="refunded">Đã hoàn tiền</option>
          </select>

          <select
            value={paymentMethodFilter}
            onChange={(e) => setPaymentMethodFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
          >
            <option value="all">Mọi phương thức</option>
            <option value="cod">COD</option>
            <option value="vnpay">VNPay</option>
            <option value="bank_transfer">Chuyển khoản</option>
            <option value="momo">MoMo</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Lọc được <span className="font-bold text-slate-800">{filteredOrders.length}</span> / {orders.length} đơn hàng
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px] font-semibold">
                <th className="py-3 px-4 text-center">MÃ ĐƠN</th>
                <th className="py-3 px-4">KHÁCH HÀNG & LIÊN HỆ</th>
                <th className="py-3 px-4">TỔNG TIỀN</th>
                <th className="py-3 px-4">THANH TOÁN</th>
                <th className="py-3 px-4">TRẠNG THÁI</th>
                <th className="py-3 px-4">THỜI GIAN</th>
                <th className="py-3 px-4 text-center">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 text-xs">
                    Không tìm thấy đơn hàng nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                displayedOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs border border-blue-200">
                        {ord.orderCode}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-semibold text-slate-900 text-xs">{ord.customerName}</p>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone size={10} /> {ord.phone}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 text-xs">{vnd(ord.total)}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <span className="uppercase text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 block w-fit">
                          {ord.paymentMethod}
                        </span>
                        {paymentBadge(ord.paymentStatus)}
                      </div>
                    </td>
                    <td className="py-3 px-4">{statusBadge(ord.status)}</td>
                    <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">{ord.createdAt}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(ord)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 text-xs font-semibold transition-all shadow-xs"
                        >
                          <Eye size={11} /> Chi tiết
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCancelModalOrder(ord);
                            setCancelReason("");
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-all shadow-xs"
                          title="Hủy đơn hàng"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <AdminPagination pagination={pagination} itemLabel="đơn hàng" />
      </div>

      {/* Modal Chi tiết đơn hàng & Snapshot & Status History */}
      {selectedOrder &&
        createPortal(
          <div
            className="fixed inset-0 z-9999 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overscroll-contain animate-in fade-in duration-200"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedOrder(null);
            }}
          >
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                  <Package size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    Chi tiết đơn hàng {selectedOrder.orderCode}
                  </h3>
                  <span className="text-xs text-slate-500">
                    Đặt lúc: {selectedOrder.createdAt} • Trạng thái: {statusBadge(selectedOrder.status)} • Thanh toán: {paymentBadge(selectedOrder.paymentStatus)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => exportOrdersToExcel([selectedOrder], `DonHang_${selectedOrder.orderCode}.xlsx`)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                  title="Xuất phiếu chi tiết đơn hàng này ra Excel"
                >
                  <FileSpreadsheet size={13} className="text-emerald-600" />
                  <span className="hidden sm:inline">Xuất Excel đơn</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="text-slate-400 hover:text-slate-600 font-bold p-1.5 rounded-md hover:bg-slate-100 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {toast && (
                <div
                  className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in duration-200 ${
                    toast.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-rose-50 text-rose-800 border-rose-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {toast.type === "success" ? (
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle size={16} className="text-rose-600 shrink-0" />
                    )}
                    <span>{toast.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setToast(null)}
                    className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}

              {isLoadingDetail && (
                <div className="p-3 bg-blue-50 text-blue-700 rounded-lg text-xs flex items-center gap-2 font-medium">
                  <RotateCw size={14} className="animate-spin" />
                  Đang đồng bộ dữ liệu snapshot chi tiết mới nhất từ hệ thống...
                </div>
              )}

              {/* Thông tin khách hàng & Giao hàng */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200">
                  <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                    <MapPin size={15} className="text-blue-600" /> Thông tin người nhận & Địa chỉ giao hàng
                  </h4>
                  <PermissionGate permission="orders.update" currentRole={currentRole}>
                    {!isEditingShipping ? (
                      <button
                        type="button"
                        onClick={() => setIsEditingShipping(true)}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-semibold text-xs py-1 px-2.5 rounded border border-blue-200 bg-white hover:bg-blue-50 shadow-2xs"
                      >
                        <Edit3 size={12} /> Chỉnh sửa thông tin
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsEditingShipping(false)}
                          disabled={isSubmittingShipping}
                          className="px-2.5 py-1 text-slate-600 hover:text-slate-800 font-medium rounded border border-slate-200 bg-white"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveShipping}
                          disabled={isSubmittingShipping}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 shadow-2xs"
                        >
                          <Save size={12} /> {isSubmittingShipping ? "Đang lưu..." : "Lưu thay đổi"}
                        </button>
                      </div>
                    )}
                  </PermissionGate>
                </div>

                {!isEditingShipping ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-slate-500">Tên người nhận:</p>
                      <p className="font-semibold text-slate-900 text-sm mt-0.5">{selectedOrder.customerName}</p>
                      <p className="text-slate-600 mt-1">Điện thoại: <span className="font-semibold text-slate-800">{selectedOrder.phone}</span></p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-slate-600">
                          Email: <strong className="text-slate-800">{selectedOrder.email || "(Chưa có email)"}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={handleSendOrderEmail}
                          disabled={isSendingOrderEmail}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-700 font-semibold text-[11px] transition-colors disabled:opacity-60"
                        >
                          <Mail size={11} />
                          {isSendingOrderEmail ? "Đang gửi..." : "Gửi thông báo Email"}
                        </button>
                      </div>
                    </div>
                    <div>
                      <p className="text-slate-500">Địa chỉ giao hàng:</p>
                      <p className="text-slate-800 font-medium leading-relaxed mt-0.5">{selectedOrder.address}</p>
                      {selectedOrder.note && (
                        <div className="mt-2 text-amber-900 bg-amber-50 p-2 rounded border border-amber-200">
                          <span className="font-bold">Ghi chú:</span> {selectedOrder.note}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Tên người nhận (*)</label>
                      <input
                        type="text"
                        value={shippingForm.recipientName}
                        onChange={(e) => setShippingForm({ ...shippingForm, recipientName: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded bg-white font-medium focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Số điện thoại (*)</label>
                      <input
                        type="text"
                        value={shippingForm.recipientPhone}
                        onChange={(e) => setShippingForm({ ...shippingForm, recipientPhone: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded bg-white font-medium focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block font-semibold text-slate-700 mb-1">Địa chỉ giao hàng (*)</label>
                      <textarea
                        rows={2}
                        value={shippingForm.shippingAddress}
                        onChange={(e) => setShippingForm({ ...shippingForm, shippingAddress: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded bg-white font-medium focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block font-semibold text-slate-700 mb-1">Ghi chú đơn hàng / Giao hàng</label>
                      <input
                        type="text"
                        value={shippingForm.customerNote}
                        onChange={(e) => setShippingForm({ ...shippingForm, customerNote: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded bg-white focus:ring-2 focus:ring-blue-500"
                        placeholder="Ví dụ: Giao giờ hành chính, gọi trước khi đến..."
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Thanh toán & Quản lý thanh toán */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                      <CreditCard size={15} className="text-emerald-600" />
                      Phương thức: <span className="uppercase text-blue-600">{selectedOrder.paymentMethod}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span>Trạng thái hiện tại:</span>
                      {paymentBadge(selectedOrder.paymentStatus)}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500">Tổng thanh toán:</span>
                    <p className="text-base font-bold text-blue-600">{vnd(selectedOrder.total)}</p>
                  </div>
                </div>

                <PermissionGate permission="payments.confirm" currentRole={currentRole}>
                  <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1 text-[11px]">Phương thức thanh toán</label>
                      <select
                        value={paymentMethodInput}
                        onChange={(e) => setPaymentMethodInput(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white font-medium focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="cod">TIỀN MẶT KHI GIAO (COD)</option>
                        <option value="vnpay">CỔNG VNPAY (QR / ATM)</option>
                        <option value="bank_transfer">CHUYỂN KHOẢN (VIETQR)</option>
                        <option value="momo">VÍ MOMO</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1 text-[11px]">Trạng thái thanh toán</label>
                      <select
                        value={paymentStatusInput}
                        onChange={(e) => setPaymentStatusInput(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white font-medium focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="paid">ĐÃ THANH TOÁN ĐỦ (PAID)</option>
                        <option value="unpaid">CHỜ THANH TOÁN (UNPAID)</option>
                        <option value="partially_paid">ĐÃ CỌC MỘT PHẦN (PARTIALLY_PAID)</option>
                        <option value="refunded">ĐÃ HOÀN TIỀN (REFUNDED)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1 text-[11px]">Ghi chú thanh toán</label>
                      <input
                        type="text"
                        value={paymentNote}
                        onChange={(e) => setPaymentNote(e.target.value)}
                        placeholder="VD: Xác nhận qua VNPAY / Chuyển khoản ngân hàng..."
                        className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={handleApplyPaymentChange}
                        disabled={isSubmittingPayment}
                        className="w-full py-2 px-3 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 shadow-xs transition-all disabled:opacity-60"
                      >
                        {isSubmittingPayment ? "Đang lưu..." : "Lưu thanh toán"}
                      </button>
                    </div>
                  </div>
                </PermissionGate>
              </div>

              {/* Cart / Bundles Snapshot Table */}
              <div>
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ShoppingCart size={14} className="text-blue-600" /> Danh sách sản phẩm đặt ({selectedOrder.items?.length || 0})
                </h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3 text-left">Sản phẩm</th>
                        <th className="py-2.5 px-3 text-left">Biến thể / SKU</th>
                        <th className="py-2.5 px-3 text-right">Đơn giá</th>
                        <th className="py-2.5 px-3 text-center">SL</th>
                        <th className="py-2.5 px-3 text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedOrder.items && selectedOrder.items.length > 0 ? (
                        selectedOrder.items.map((it, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2.5">
                                <img
                                  src={it.image}
                                  alt={it.name}
                                  className="w-10 h-10 object-cover rounded border border-slate-200 shrink-0"
                                />
                                <span className="font-semibold text-slate-900">{it.name}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                                {it.variantSku || "SKU-DEFAULT"}
                              </span>
                              {it.variantDetails && (
                                <p className="text-[11px] text-slate-500 mt-0.5">{it.variantDetails}</p>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium text-slate-700">{vnd(it.price)}</td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-900">{it.quantity}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                              {vnd(it.price * it.quantity)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-slate-400 italic">
                            Chưa có sản phẩm nào trong snapshot đơn hàng.
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot className="bg-slate-50 font-semibold border-t border-slate-200">
                      <tr>
                        <td colSpan={4} className="py-2.5 px-3 text-right text-slate-600">Tổng thanh toán:</td>
                        <td className="py-2.5 px-3 text-right text-blue-600 font-bold text-sm">
                          {vnd(selectedOrder.total)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Cập nhật tiến độ xử lý đơn hàng */}
              <PermissionGate permission="orders.update" currentRole={currentRole}>
                <div className="border border-blue-200 bg-blue-50/40 p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <Send size={14} className="text-blue-600" /> Cập nhật tiến độ xử lý đơn hàng
                    </h4>
                    {selectedOrder.status !== "cancelled" && hasPermission(currentRole, "orders.cancel") && (
                      <button
                        type="button"
                        onClick={() => {
                          setCancelModalOrder(selectedOrder);
                          setCancelReason("");
                        }}
                        className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-700 font-semibold text-xs py-1 px-2.5 rounded border border-rose-200 bg-white hover:bg-rose-50"
                      >
                        <XCircle size={13} /> Hủy đơn hàng này
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-1">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Trạng thái mới</label>
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value as AdminOrder["status"])}
                        className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white font-medium focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="pending">Chờ xác nhận (PENDING)</option>
                        <option value="confirmed">Đã xác nhận (CONFIRMED)</option>
                        <option value="processing">Đang đóng gói / Xử lý (PROCESSING)</option>
                        <option value="shipping">Bàn giao ĐVVC / Đang giao (SHIPPING)</option>
                        <option value="completed">Đã giao thành công (COMPLETED)</option>
                        {hasPermission(currentRole, "orders.cancel") && <option value="cancelled">Hủy đơn hàng (CANCELLED)</option>}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Ghi chú xử lý / Mã vận đơn</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Ví dụ: Đã đóng gói xong, giao shipper Viettel Post..."
                          value={statusNote}
                          onChange={(e) => setStatusNote(e.target.value)}
                          className="flex-1 p-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={handleApplyStatusChange}
                          disabled={isSubmittingStatus}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 shadow-xs transition-all disabled:opacity-60"
                        >
                          {isSubmittingStatus ? "Đang lưu..." : "Lưu & Ghi nhận"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </PermissionGate>

              {/* Lịch sử trạng thái xử lý */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Clock size={14} className="text-blue-600" /> Nhật ký luân chuyển đơn hàng (Status History)
                  </h4>
                  <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    Sắp xếp: Mới nhất đến cũ nhất
                  </span>
                </div>
                <div className="border border-slate-200 rounded-lg p-4 bg-white space-y-4">
                  {sortedStatusHistory.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Chưa có lịch sử cập nhật trạng thái.</p>
                  ) : (
                    <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                      {sortedStatusHistory.map((hist, idx) => (
                        <div key={hist.id || idx} className="relative">
                          <span className={`absolute -left-6 top-1 w-3 h-3 rounded-full ${idx === 0 ? "bg-emerald-600 ring-4 ring-emerald-100 animate-pulse" : "bg-blue-600 ring-4 ring-blue-100"}`}></span>
                          <div className="flex items-center gap-2 flex-wrap">
                            {statusBadge(hist.status)}
                            {idx === 0 && (
                              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                MỚI NHẤT
                              </span>
                            )}
                            <span className="text-xs text-slate-400">• {hist.timestamp}</span>
                            <span className="text-xs font-semibold text-slate-700">bởi {hist.updatedBy}</span>
                          </div>
                          {hist.note && (
                            <p className="text-xs text-slate-600 mt-1 bg-slate-50 p-2 rounded border border-slate-100">
                              {hist.note}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-slate-50/70">
              <PermissionGate permission="orders.export" currentRole={currentRole}>
                <button
                  type="button"
                  onClick={() => alert(`Đang chuẩn bị in Hóa đơn VAT điện tử cho đơn hàng ${selectedOrder.orderCode}...`)}
                  className="px-3.5 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs"
                >
                  <Printer size={14} /> In Hóa đơn VAT
                </button>
              </PermissionGate>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-1.5 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-lg text-xs font-semibold transition-all"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal xác nhận HỦY ĐƠN HÀNG */}
      {cancelModalOrder &&
        createPortal(
          <div
            className="fixed inset-0 z-10000 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overscroll-contain animate-in fade-in duration-150"
            onClick={(e) => {
              if (e.target === e.currentTarget) setCancelModalOrder(null);
            }}
          >
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <AlertCircle size={22} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Xác nhận Hủy Đơn Hàng</h3>
                <p className="text-xs text-slate-500">Mã đơn: <span className="font-mono font-bold text-slate-800">{cancelModalOrder.orderCode}</span></p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Hành động này sẽ đánh dấu đơn hàng là <strong>ĐÃ HỦY (CANCELLED)</strong> và ghi log kiểm toán. Vui lòng nhập lý do hủy:
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Lý do hủy đơn (*)</label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="VD: Khách hàng đổi ý, hết hàng biến thể, số điện thoại không liên lạc được..."
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setCancelModalOrder(null);
                  setCancelReason("");
                }}
                disabled={isSubmittingCancel}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
              >
                Bỏ qua
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isSubmittingCancel}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-xs disabled:opacity-60"
              >
                {isSubmittingCancel ? "Đang hủy đơn..." : "Xác nhận Hủy"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
