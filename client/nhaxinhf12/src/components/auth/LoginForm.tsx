import type { FormEvent } from "react";
import { Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import { getInputClass, type FieldErrors } from "./types";

interface LoginFormProps {
  loginEmail: string;
  setLoginEmail: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  rememberMe: boolean;
  setRememberMe: (val: boolean) => void;
  showPass: boolean;
  setShowPass: (val: boolean) => void;
  loading: boolean;
  fieldErrors: FieldErrors;
  clearFieldError: (fieldKey: string) => void;
  onSubmit: (e: FormEvent) => void;
  onForgotPassword: () => void;
}

export default function LoginForm({
  loginEmail,
  setLoginEmail,
  password,
  setPassword,
  rememberMe,
  setRememberMe,
  showPass,
  setShowPass,
  loading,
  fieldErrors,
  clearFieldError,
  onSubmit,
  onForgotPassword,
}: LoginFormProps) {
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {/* Email input */}
      <div>
        <label
          className={`block text-xs font-bold mb-1.5 ${
            fieldErrors.loginEmail ? "text-rose-600" : "text-[#2A2521]"
          }`}
        >
          Địa chỉ Email
        </label>
        <div className="relative flex items-center">
          <Mail
            size={18}
            className={`absolute left-3.5 ${
              fieldErrors.loginEmail ? "text-rose-500" : "text-[#A0988F]"
            }`}
          />
          <input
            type="email"
            value={loginEmail}
            onChange={(e) => {
              setLoginEmail(e.target.value);
              clearFieldError("loginEmail");
            }}
            placeholder="Nhập địa chỉ email của bạn (ví dụ: email@domain.com)"
            className={getInputClass(Boolean(fieldErrors.loginEmail))}
            autoComplete="email"
            required
          />
        </div>
        {fieldErrors.loginEmail && (
          <p className="mt-1 text-[11px] font-medium text-rose-600 flex items-center gap-1">
            <AlertCircle size={12} className="shrink-0" />
            <span>{fieldErrors.loginEmail}</span>
          </p>
        )}
      </div>

      {/* Password input */}
      <div>
        <label
          className={`block text-xs font-bold mb-1.5 ${
            fieldErrors.loginPassword ? "text-rose-600" : "text-[#2A2521]"
          }`}
        >
          Mật khẩu
        </label>
        <div className="relative flex items-center">
          <Lock
            size={18}
            className={`absolute left-3.5 ${
              fieldErrors.loginPassword ? "text-rose-500" : "text-[#A0988F]"
            }`}
          />
          <input
            type={showPass ? "text" : "password"}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              clearFieldError("loginPassword");
            }}
            placeholder="Nhập mật khẩu"
            className={getInputClass(Boolean(fieldErrors.loginPassword), "pr-10")}
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="absolute right-3.5 text-[#A0988F] hover:text-[#57534E] p-0.5 transition-colors cursor-pointer"
            title={showPass ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          >
            {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {fieldErrors.loginPassword && (
          <p className="mt-1 text-[11px] font-medium text-rose-600 flex items-center gap-1">
            <AlertCircle size={12} className="shrink-0" />
            <span>{fieldErrors.loginPassword}</span>
          </p>
        )}
      </div>

      {/* Ghi nhớ đăng nhập & Quên mật khẩu */}
      <div className="flex items-center justify-between text-xs pt-0.5">
        <label className="flex items-center gap-2 cursor-pointer text-[#57534E] select-none">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="w-4 h-4 rounded border-[#D8D2C9] text-[#B86B49] focus:ring-[#B86B49] accent-[#B86B49] cursor-pointer"
          />
          <span>Ghi nhớ đăng nhập</span>
        </label>
        <button
          type="button"
          onClick={onForgotPassword}
          className="text-[#B86B49] hover:underline font-semibold cursor-pointer transition-colors"
        >
          Quên mật khẩu?
        </button>
      </div>

      {/* Nút bấm ĐĂNG NHẬP */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-[#B86B49] hover:bg-[#A35C3A] active:bg-[#8F4E2E] text-white text-xs sm:text-sm font-bold tracking-wider uppercase rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
      >
        {loading ? "ĐANG XỬ LÝ..." : "ĐĂNG NHẬP"}
      </button>
    </form>
  );
}
