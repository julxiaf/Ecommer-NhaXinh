import type { FormEvent } from "react";
import {
  Mail,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  Clock,
  RefreshCw,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";
import { getInputClass, type FieldErrors } from "./types";

interface ForgotPasswordFormProps {
  forgotEmail: string;
  setForgotEmail: (val: string) => void;
  otpToken: string;
  setOtpToken: (val: string) => void;
  newPassword: string;
  setNewPassword: (val: string) => void;
  confirmNewPass: string;
  setConfirmNewPass: (val: string) => void;
  showPass: boolean;
  setShowPass: (val: boolean) => void;
  showConfirmPass: boolean;
  setShowConfirmPass: (val: boolean) => void;
  otpSent: boolean;
  otpSecondsLeft: number;
  resendCooldownLeft: number;
  loading: boolean;
  resendingOtp: boolean;
  fieldErrors: FieldErrors;
  clearFieldError: (fieldKey: string) => void;
  onForgotSubmit: (e: FormEvent) => void;
  onResetSubmit: (e: FormEvent) => void;
  onResendOtp: () => void;
  onBackToLogin: () => void;
  formatCountdown: (totalSeconds: number) => string;
}

export default function ForgotPasswordForm({
  forgotEmail,
  setForgotEmail,
  otpToken,
  setOtpToken,
  newPassword,
  setNewPassword,
  confirmNewPass,
  setConfirmNewPass,
  showPass,
  setShowPass,
  showConfirmPass,
  setShowConfirmPass,
  otpSent,
  otpSecondsLeft,
  resendCooldownLeft,
  loading,
  resendingOtp,
  fieldErrors,
  clearFieldError,
  onForgotSubmit,
  onResetSubmit,
  onResendOtp,
  onBackToLogin,
  formatCountdown,
}: ForgotPasswordFormProps) {
  return (
    <div className="space-y-4">
      {!otpSent ? (
        // ── BƯỚC 1: NHẬP EMAIL ĐỂ GỬI MÃ OTP ──
        <form onSubmit={onForgotSubmit} noValidate className="space-y-4">
          <div>
            <label
              className={`block text-xs font-bold mb-1.5 ${
                fieldErrors.forgotEmail ? "text-rose-600" : "text-[#2A2521]"
              }`}
            >
              Email đã đăng ký
            </label>
            <div className="relative flex items-center">
              <Mail
                size={18}
                className={`absolute left-3.5 ${
                  fieldErrors.forgotEmail ? "text-rose-500" : "text-[#A0988F]"
                }`}
              />
              <input
                type="email"
                value={forgotEmail}
                onChange={(e) => {
                  setForgotEmail(e.target.value);
                  clearFieldError("forgotEmail");
                }}
                placeholder="Nhập email của bạn (ví dụ: email@example.com)"
                className={getInputClass(Boolean(fieldErrors.forgotEmail))}
                required
              />
            </div>
            {fieldErrors.forgotEmail && (
              <p className="mt-1 text-[11px] font-medium text-rose-600 flex items-center gap-1">
                <AlertCircle size={12} className="shrink-0" />
                <span>{fieldErrors.forgotEmail}</span>
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#B86B49] hover:bg-[#A35C3A] active:bg-[#8F4E2E] text-white text-xs sm:text-sm font-bold tracking-wider uppercase rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {loading ? "ĐANG GỬI MÃ..." : "GỬI MÃ XÁC THỰC (OTP)"}
          </button>
        </form>
      ) : (
        // ── BƯỚC 2: NHẬP MÃ OTP & MẬT KHẨU MỚI ──
        <form onSubmit={onResetSubmit} noValidate className="space-y-3.5">
          {/* Thanh trạng thái thời gian sống 3 phút của OTP & nút Lấy lại mã */}
          <div
            className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${
              otpSecondsLeft > 0
                ? "bg-amber-50/70 border-amber-200 text-amber-900"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock
                size={16}
                className={otpSecondsLeft > 0 ? "text-amber-600 shrink-0" : "text-rose-600 shrink-0"}
              />
              {otpSecondsLeft > 0 ? (
                <span>
                  Mã OTP còn hiệu lực:{" "}
                  <strong className="font-mono text-sm text-[#B86B49]">
                    {formatCountdown(otpSecondsLeft)}
                  </strong>
                </span>
              ) : (
                <span className="font-semibold">
                  Mã OTP đã hết hạn (quá 3 phút). Vui lòng lấy mã mới!
                </span>
              )}
            </div>

            <button
              type="button"
              disabled={resendingOtp || resendCooldownLeft > 0}
              onClick={onResendOtp}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-[#D8D2C9] hover:border-[#B86B49] text-[#B86B49] font-bold text-[11px] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              <RefreshCw size={12} className={resendingOtp ? "animate-spin" : ""} />
              <span>
                {resendingOtp
                  ? "Đang gửi..."
                  : resendCooldownLeft > 0
                  ? `Gửi lại (${resendCooldownLeft}s)`
                  : "Lấy lại mã OTP"}
              </span>
            </button>
          </div>

          {/* Ô nhập OTP 6 số */}
          <div>
            <label
              className={`block text-xs font-bold mb-1 ${
                fieldErrors.otp ? "text-rose-600" : "text-[#2A2521]"
              }`}
            >
              Mã xác thực OTP (6 chữ số mới nhất)
            </label>
            <div className="relative flex items-center">
              <ShieldCheck
                size={18}
                className={`absolute left-3.5 ${
                  fieldErrors.otp ? "text-rose-500" : "text-[#B86B49]"
                }`}
              />
              <input
                type="text"
                inputMode="numeric"
                value={otpToken}
                onChange={(e) => {
                  setOtpToken(e.target.value.replace(/\D/g, "").slice(0, 6));
                  if (otpSecondsLeft > 0) {
                    clearFieldError("otp");
                  }
                }}
                disabled={otpSecondsLeft <= 0}
                placeholder={
                  otpSecondsLeft > 0
                    ? "Nhập mã 6 chữ số mới nhất từ email"
                    : "Mã OTP đã hết hạn - Vui lòng bấm Lấy lại mã OTP"
                }
                maxLength={6}
                className={getInputClass(
                  Boolean(fieldErrors.otp),
                  "py-2 tracking-widest font-mono font-bold disabled:bg-rose-50/80 disabled:cursor-not-allowed"
                )}
                required
              />
            </div>
            {fieldErrors.otp && (
              <p className="mt-1 text-[11px] font-medium text-rose-600 flex items-center gap-1">
                <AlertCircle size={12} className="shrink-0" />
                <span>{fieldErrors.otp}</span>
              </p>
            )}
          </div>

          {/* Mật khẩu mới */}
          <div>
            <label
              className={`block text-xs font-bold mb-1 ${
                fieldErrors.newPassword ? "text-rose-600" : "text-[#2A2521]"
              }`}
            >
              Mật khẩu mới
            </label>
            <div className="relative flex items-center">
              <Lock
                size={18}
                className={`absolute left-3.5 ${
                  fieldErrors.newPassword ? "text-rose-500" : "text-[#A0988F]"
                }`}
              />
              <input
                type={showPass ? "text" : "password"}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  clearFieldError("newPassword");
                }}
                placeholder="Tối thiểu 6 ký tự"
                className={getInputClass(Boolean(fieldErrors.newPassword), "py-2 pr-10")}
                required
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3.5 text-[#A0988F] hover:text-[#57534E] p-0.5 cursor-pointer"
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {fieldErrors.newPassword && (
              <p className="mt-1 text-[11px] font-medium text-rose-600 flex items-center gap-1">
                <AlertCircle size={12} className="shrink-0" />
                <span>{fieldErrors.newPassword}</span>
              </p>
            )}
          </div>

          {/* Xác nhận mật khẩu mới */}
          <div>
            <label
              className={`block text-xs font-bold mb-1 ${
                fieldErrors.confirmNewPass ? "text-rose-600" : "text-[#2A2521]"
              }`}
            >
              Xác nhận mật khẩu mới
            </label>
            <div className="relative flex items-center">
              <Lock
                size={18}
                className={`absolute left-3.5 ${
                  fieldErrors.confirmNewPass ? "text-rose-500" : "text-[#A0988F]"
                }`}
              />
              <input
                type={showConfirmPass ? "text" : "password"}
                value={confirmNewPass}
                onChange={(e) => {
                  setConfirmNewPass(e.target.value);
                  clearFieldError("confirmNewPass");
                }}
                placeholder="Nhập lại mật khẩu mới"
                className={getInputClass(Boolean(fieldErrors.confirmNewPass), "py-2 pr-10")}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPass(!showConfirmPass)}
                className="absolute right-3.5 text-[#A0988F] hover:text-[#57534E] p-0.5 cursor-pointer"
              >
                {showConfirmPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {fieldErrors.confirmNewPass && (
              <p className="mt-1 text-[11px] font-medium text-rose-600 flex items-center gap-1">
                <AlertCircle size={12} className="shrink-0" />
                <span>{fieldErrors.confirmNewPass}</span>
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || otpSecondsLeft <= 0}
            className="w-full py-3 bg-[#B86B49] hover:bg-[#A35C3A] active:bg-[#8F4E2E] text-white text-xs sm:text-sm font-bold tracking-wider uppercase rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-1"
          >
            {loading
              ? "ĐANG ĐẶT LẠI..."
              : otpSecondsLeft <= 0
              ? "MÃ OTP ĐÃ HẾT HẠN - VUI LÒNG LẤY MÃ MỚI"
              : "ĐẶT LẠI MẬT KHẨU"}
          </button>
        </form>
      )}

      {/* Nút quay lại đăng nhập */}
      <div className="text-center pt-2">
        <button
          type="button"
          onClick={onBackToLogin}
          className="inline-flex items-center gap-1.5 text-xs text-[#78716C] hover:text-[#B86B49] font-semibold cursor-pointer transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Quay lại trang Đăng nhập</span>
        </button>
      </div>
    </div>
  );
}
