import { CheckCircle2 } from "lucide-react";
import type { LoginSuccessInfo } from "./types";

interface LoginSuccessModalProps {
  data: LoginSuccessInfo;
  onProceed: (destination: string) => void;
}

export default function LoginSuccessModal({
  data,
  onProceed,
}: LoginSuccessModalProps) {
  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-emerald-100 p-6 sm:p-8 text-center relative overflow-hidden transform scale-100 transition-all">
        {/* Vệt trang trí phía trên */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-linear-to-r from-emerald-500 via-[#B86B49] to-amber-500" />

        {/* Icon Thành Công */}
        <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 border-4 border-emerald-50 flex items-center justify-center text-emerald-600 mb-4 shadow-sm animate-bounce">
          <CheckCircle2 size={36} />
        </div>

        <h3 className="text-xl font-bold text-gray-900 mb-2">
          Đăng nhập thành công!
        </h3>

        <p className="text-sm text-gray-600 mb-2">
          Chào mừng <span className="font-bold text-[#B86B49]">{data.fullName}</span> đã quay trở lại với <strong className="text-gray-900">Nhà Xinh</strong>.
        </p>

        {data.email && (
          <p className="text-xs text-gray-400 mb-5">
            Tài khoản: {data.email}
          </p>
        )}

        {/* Thanh tiến trình tự động chuyển trang */}
        <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-emerald-500 transition-all duration-1800 ease-out"
            style={{ width: "100%" }}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => onProceed("/tai-khoan")}
            className="flex-1 py-2.5 px-4 rounded-xl bg-[#B86B49] hover:bg-[#9E5738] text-white font-medium text-xs sm:text-sm transition-colors shadow-sm cursor-pointer"
          >
            Vào tài khoản ngay →
          </button>

          {data.isAdmin && (
            <button
              type="button"
              onClick={() => onProceed("/admin")}
              className="py-2.5 px-4 rounded-xl bg-gray-900 hover:bg-black text-amber-400 font-semibold text-xs sm:text-sm transition-colors shadow-sm cursor-pointer"
            >
              Trang Quản trị ⚡
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
