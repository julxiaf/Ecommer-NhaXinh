import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { User, Mail, Phone, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import { getInputClass, type FieldErrors } from "./types";

interface RegisterFormProps {
  fullName: string;
  setFullName: (val: string) => void;
  email: string;
  setEmail: (val: string) => void;
  phone: string;
  setPhone: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  confirmPass: string;
  setConfirmPass: (val: string) => void;
  termsAgreed: boolean;
  setTermsAgreed: (val: boolean) => void;
  showPass: boolean;
  setShowPass: (val: boolean) => void;
  showConfirmPass: boolean;
  setShowConfirmPass: (val: boolean) => void;
  loading: boolean;
  fieldErrors: FieldErrors;
  clearFieldError: (fieldKey: string) => void;
  onSubmit: (e: FormEvent) => void;
}

export default function RegisterForm({
  fullName,
  setFullName,
  email,
  setEmail,
  phone,
  setPhone,
  password,
  setPassword,
  confirmPass,
  setConfirmPass,
  termsAgreed,
  setTermsAgreed,
  showPass,
  setShowPass,
  showConfirmPass,
  setShowConfirmPass,
  loading,
  fieldErrors,
  clearFieldError,
  onSubmit,
}: RegisterFormProps) {
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-3.5">
      {/* Họ và tên */}
      <div>
        <label
          className={`block text-xs font-bold mb-1 ${
            fieldErrors.fullName ? "text-rose-600" : "text-[#2A2521]"
          }`}
        >
          Họ và tên
        </label>
        <div className="relative flex items-center">
          <User
            size={18}
            className={`absolute left-3.5 ${
              fieldErrors.fullName ? "text-rose-500" : "text-[#A0988F]"
            }`}
          />
          <input
            type="text"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              clearFieldError("fullName");
            }}
            placeholder="Nhập họ và tên của bạn"
            className={getInputClass(Boolean(fieldErrors.fullName), "py-2")}
            required
          />
        </div>
        {fieldErrors.fullName && (
          <p className="mt-1 text-[11px] font-medium text-rose-600 flex items-center gap-1">
            <AlertCircle size={12} className="shrink-0" />
            <span>{fieldErrors.fullName}</span>
          </p>
        )}
      </div>

      {/* Email & Số điện thoại */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label
            className={`block text-xs font-bold mb-1 ${
              fieldErrors.email ? "text-rose-600" : "text-[#2A2521]"
            }`}
          >
            Email
          </label>
          <div className="relative flex items-center">
            <Mail
              size={18}
              className={`absolute left-3.5 ${
                fieldErrors.email ? "text-rose-500" : "text-[#A0988F]"
              }`}
            />
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearFieldError("email");
              }}
              placeholder="email@example.com"
              className={getInputClass(Boolean(fieldErrors.email), "py-2")}
              required
            />
          </div>
          {fieldErrors.email && (
            <p className="mt-1 text-[11px] font-medium text-rose-600 flex items-center gap-1">
              <AlertCircle size={12} className="shrink-0" />
              <span>{fieldErrors.email}</span>
            </p>
          )}
        </div>

        <div>
          <label
            className={`block text-xs font-bold mb-1 ${
              fieldErrors.phone ? "text-rose-600" : "text-[#2A2521]"
            }`}
          >
            Số điện thoại
          </label>
          <div className="relative flex items-center">
            <Phone
              size={18}
              className={`absolute left-3.5 ${
                fieldErrors.phone ? "text-rose-500" : "text-[#A0988F]"
              }`}
            />
            <input
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                clearFieldError("phone");
              }}
              placeholder="0901 234 567"
              className={getInputClass(Boolean(fieldErrors.phone), "py-2")}
              required
            />
          </div>
          {fieldErrors.phone && (
            <p className="mt-1 text-[11px] font-medium text-rose-600 flex items-center gap-1">
              <AlertCircle size={12} className="shrink-0" />
              <span>{fieldErrors.phone}</span>
            </p>
          )}
        </div>
      </div>

      {/* Mật khẩu */}
      <div>
        <label
          className={`block text-xs font-bold mb-1 ${
            fieldErrors.password ? "text-rose-600" : "text-[#2A2521]"
          }`}
        >
          Mật khẩu
        </label>
        <div className="relative flex items-center">
          <Lock
            size={18}
            className={`absolute left-3.5 ${
              fieldErrors.password ? "text-rose-500" : "text-[#A0988F]"
            }`}
          />
          <input
            type={showPass ? "text" : "password"}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              clearFieldError("password");
            }}
            placeholder="Mật khẩu tối thiểu 8 ký tự"
            className={getInputClass(Boolean(fieldErrors.password), "py-2 pr-10")}
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
        {fieldErrors.password && (
          <p className="mt-1 text-[11px] font-medium text-rose-600 flex items-center gap-1">
            <AlertCircle size={12} className="shrink-0" />
            <span>{fieldErrors.password}</span>
          </p>
        )}
      </div>

      {/* Xác nhận mật khẩu */}
      <div>
        <label
          className={`block text-xs font-bold mb-1 ${
            fieldErrors.confirmPass ? "text-rose-600" : "text-[#2A2521]"
          }`}
        >
          Xác nhận mật khẩu
        </label>
        <div className="relative flex items-center">
          <Lock
            size={18}
            className={`absolute left-3.5 ${
              fieldErrors.confirmPass ? "text-rose-500" : "text-[#A0988F]"
            }`}
          />
          <input
            type={showConfirmPass ? "text" : "password"}
            value={confirmPass}
            onChange={(e) => {
              setConfirmPass(e.target.value);
              clearFieldError("confirmPass");
            }}
            placeholder="Nhập lại mật khẩu"
            className={getInputClass(Boolean(fieldErrors.confirmPass), "py-2 pr-10")}
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
        {fieldErrors.confirmPass && (
          <p className="mt-1 text-[11px] font-medium text-rose-600 flex items-center gap-1">
            <AlertCircle size={12} className="shrink-0" />
            <span>{fieldErrors.confirmPass}</span>
          </p>
        )}
      </div>

      {/* Điều khoản sử dụng & Chính sách bảo mật */}
      <div>
        <label
          className={`flex items-start gap-2 cursor-pointer text-xs select-none pt-1 ${
            fieldErrors.terms ? "text-rose-600 font-semibold" : "text-[#57534E]"
          }`}
        >
          <input
            type="checkbox"
            checked={termsAgreed}
            onChange={(e) => {
              setTermsAgreed(e.target.checked);
              clearFieldError("terms");
            }}
            className={`w-4 h-4 mt-0.5 rounded cursor-pointer ${
              fieldErrors.terms
                ? "border-rose-500 ring-2 ring-rose-500/30 accent-rose-600"
                : "border-[#D8D2C9] text-[#B86B49] focus:ring-[#B86B49] accent-[#B86B49]"
            }`}
          />
          <span className="leading-relaxed">
            Tôi đồng ý với{" "}
            <Link to="/dieu-khoan-su-dung" className="text-[#B86B49] hover:underline font-medium">
              Điều khoản sử dụng
            </Link>{" "}
            và{" "}
            <Link to="/chinh-sach-bao-mat" className="text-[#B86B49] hover:underline font-medium">
              Chính sách bảo mật
            </Link>{" "}
            của Nhà Xinh.
          </span>
        </label>
        {fieldErrors.terms && (
          <p className="mt-1 text-[11px] font-medium text-rose-600 flex items-center gap-1">
            <AlertCircle size={12} className="shrink-0" />
            <span>{fieldErrors.terms}</span>
          </p>
        )}
      </div>

      {/* Nút bấm ĐĂNG KÝ */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-[#B86B49] hover:bg-[#A35C3A] active:bg-[#8F4E2E] text-white text-xs sm:text-sm font-bold tracking-wider uppercase rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
      >
        {loading ? "ĐANG TẠO TÀI KHOẢN..." : "ĐĂNG KÝ TÀI KHOẢN"}
      </button>
    </form>
  );
}
