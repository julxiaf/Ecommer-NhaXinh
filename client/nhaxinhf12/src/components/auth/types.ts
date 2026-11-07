export type AuthTab = "login" | "register" | "forgot";

export interface LoginSuccessInfo {
  fullName: string;
  email: string;
  phone: string;
  role?: string;
  isAdmin?: boolean;
}

export type FieldErrors = Record<string, string>;

export const OTP_TTL_DEFAULT_SECONDS = 180; // 3 phút
export const OTP_RESEND_COOLDOWN_DEFAULT_SECONDS = 20; // Chống spam bấm liên tục

/**
 * Helper tạo class CSS nổi bật viền đỏ khi trường có lỗi validation
 */
export const getInputClass = (hasError: boolean, extraClass = "") => {
  return `w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-[13px] rounded-lg transition-all focus:outline-none ${
    hasError
      ? "bg-rose-50/50 border-2 border-rose-500 text-rose-950 placeholder:text-rose-300 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/25"
      : "bg-white border border-[#D8D2C9] text-[#1C1917] placeholder:text-[#A8A29E] focus:border-[#B86B49] focus:ring-1 focus:ring-[#B86B49]"
  } ${extraClass}`;
};

