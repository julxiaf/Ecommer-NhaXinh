import { useEffect } from "react";
import { ShoppingBag, X, ArrowRight, BellRing } from "lucide-react";

export interface NewOrderAlertData {
  id: string;
  orderCode: string;
  customerName: string;
  total: number;
  itemsCount: number;
  createdAt: string;
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

  return (
    <div className="fixed top-5 right-5 z-[999999] max-w-sm w-full transition-all duration-300 animate-in slide-in-from-top-4 fade-in">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border-2 border-emerald-500 overflow-hidden text-slate-800">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-white/20 animate-pulse">
              <BellRing size={16} />
            </span>
            <span className="text-xs font-black tracking-wide uppercase">
              Đơn hàng mới vừa về!
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
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
            <ShoppingBag size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-bold text-slate-900 truncate">
                Mã: #{alert.orderCode}
              </span>
              <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                Mới nhận
              </span>
            </div>

            <p className="text-xs text-slate-600 mt-1 line-clamp-1">
              Khách hàng: <strong className="text-slate-800">{alert.customerName}</strong>
            </p>

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-500">
                {alert.itemsCount} sản phẩm
              </span>
              <span className="font-extrabold text-emerald-600 text-sm">
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
            className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
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
