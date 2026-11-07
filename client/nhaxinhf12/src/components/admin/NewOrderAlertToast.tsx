import { useEffect } from "react";
import { ShoppingBag, X, ArrowRight, BellRing, CreditCard, UserCheck } from "lucide-react";

export interface NewOrderAlertData {
  id: string;
  orderCode: string;
  customerName: string;
  total: number;
  itemsCount: number;
  createdAt: string;
  alertType?: "customer_order" | "staff_order" | "payment_confirmed";
  actorName?: string;
  paymentMethod?: string;
}

interface NewOrderAlertToastProps {
  alert: NewOrderAlertData | null;
  onClose: () => void;
  onViewOrder: (orderId: string) => void;
}

export default function NewOrderAlertToast({
  alert,
  onClose,
  onViewOrder,
}: NewOrderAlertToastProps) {
  useEffect(() => {
    if (!alert) return;
    const timer = setTimeout(() => {
      onClose();
    }, 10000); // Tự động đóng sau 10 giây
    return () => clearTimeout(timer);
  }, [alert, onClose]);

  if (!alert) return null;

  const isStaffOrder = alert.alertType === "staff_order";
  const isPayment = alert.alertType === "payment_confirmed";

  const borderClass = isPayment
    ? "border-amber-500"
    : isStaffOrder
    ? "border-blue-500"
    : "border-emerald-500";

  const headerGradient = isPayment
    ? "from-amber-500 to-orange-600"
    : isStaffOrder
    ? "from-blue-600 to-indigo-600"
    : "from-emerald-600 to-teal-600";

  const headerTitle = isPayment
    ? "Xác nhận thanh toán thành công!"
    : isStaffOrder
    ? "Nhân viên vừa tạo đơn mới!"
    : "Đơn hàng mới vừa về!";

  const badgeLabel = isPayment
    ? `Đã thu (${(alert.paymentMethod || "Online").toUpperCase()})`
    : isStaffOrder
    ? `NV: ${alert.actorName || "Showroom"}`
    : "Khách đặt Web";

  const btnClass = isPayment
    ? "bg-amber-600 hover:bg-amber-700"
    : isStaffOrder
    ? "bg-blue-600 hover:bg-blue-700"
    : "bg-emerald-600 hover:bg-emerald-700";

  return (
    <div className="fixed top-5 right-5 z-[999999] max-w-sm w-full transition-all duration-300 animate-in slide-in-from-top-4 fade-in">
      <div className={`bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border-2 ${borderClass} overflow-hidden text-slate-800`}>
        {/* Top Header Banner */}
        <div className={`bg-gradient-to-r ${headerGradient} px-4 py-2.5 flex items-center justify-between text-white`}>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-white/20 animate-pulse">
              <BellRing size={16} />
            </span>
            <span className="text-xs font-black tracking-wide uppercase">
              {headerTitle}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/20 transition-colors text-white/90 hover:text-white"
            title="Đóng thông báo"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 flex gap-3.5 items-start">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
              isPayment
                ? "bg-amber-100 text-amber-700"
                : isStaffOrder
                ? "bg-blue-100 text-blue-700"
                : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {isPayment ? <CreditCard size={20} /> : isStaffOrder ? <UserCheck size={20} /> : <ShoppingBag size={20} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-bold text-slate-900 truncate">
                Mã: #{alert.orderCode}
              </span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${
                  isPayment
                    ? "text-amber-700 bg-amber-50 border-amber-200"
                    : isStaffOrder
                    ? "text-blue-700 bg-blue-50 border-blue-200"
                    : "text-emerald-700 bg-emerald-50 border-emerald-200"
                }`}
              >
                {badgeLabel}
              </span>
            </div>

            <p className="text-xs text-slate-600 mt-1 line-clamp-1">
              Khách hàng: <strong className="text-slate-800">{alert.customerName}</strong>
            </p>

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-500">
                {alert.itemsCount} sản phẩm
              </span>
              <span className={`font-extrabold text-sm ${isPayment ? "text-amber-600" : isStaffOrder ? "text-blue-600" : "text-emerald-600"}`}>
                {Number(alert.total).toLocaleString("vi-VN")} ₫
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-4 pb-3.5 pt-1 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onViewOrder(alert.id)}
            className={`flex-1 py-2 px-3 rounded-xl ${btnClass} text-white text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-1.5 cursor-pointer`}
          >
            <span>Xem chi tiết đơn</span>
            <ArrowRight size={13} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
          >
            Để sau
          </button>
        </div>
      </div>
    </div>
  );
}
