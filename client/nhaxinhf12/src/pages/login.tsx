import { AlertCircle, CheckCircle2 } from "lucide-react";
import Header from "../components/Headers";
import Footer from "../components/Footer";
import { useAuthPage } from "../hooks/useAuthPage";
import LoginForm from "../components/auth/LoginForm";
import RegisterForm from "../components/auth/RegisterForm";
import ForgotPasswordForm from "../components/auth/ForgotPasswordForm";
// import SocialLoginButtons from "../components/auth/SocialLoginButtons";
import LoginSuccessModal from "../components/auth/LoginSuccessModal";
import "./pages.css";

export default function LoginPage() {
  const {
    cartCount,
    wishlistCount,
    activeTab,
    handleSwitchTab,
    showPass,
    setShowPass,
    showConfirmPass,
    setShowConfirmPass,
    loading,
    resendingOtp,
    error,
    successMsg,
    loginSuccessData,
    fieldErrors,
    clearFieldError,
    loginEmail,
    setLoginEmail,
    password,
    setPassword,
    rememberMe,
    setRememberMe,
    fullName,
    setFullName,
    email,
    setEmail,
    phone,
    setPhone,
    confirmPass,
    setConfirmPass,
    termsAgreed,
    setTermsAgreed,
    forgotEmail,
    setForgotEmail,
    otpToken,
    setOtpToken,
    newPassword,
    setNewPassword,
    confirmNewPass,
    setConfirmNewPass,
    otpSent,
    otpSecondsLeft,
    resendCooldownLeft,
    formatCountdown,
    handleLoginSubmit,
    handleRegisterSubmit,
    requestOtpCode,
    handleForgotSubmit,
    handleResetSubmit,
    handleProceedNow,
  } = useAuthPage();

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2] font-sans antialiased text-[#2D231E]">
      <Header user={null} cartCount={cartCount} wishlistCount={wishlistCount} />

      {/* ── KHU VỰC THẺ ĐĂNG NHẬP / ĐĂNG KÝ TRUNG TÂM ── */}
      <main className="flex-1 flex items-center justify-center py-10 px-4 sm:px-6">
        <div className="w-full max-w-[490px] bg-white rounded-2xl shadow-xl shadow-stone-200/60 border border-[#EDE7DF] p-7 sm:p-9 transition-all">
          {/* Header Tiêu đề & Lời chào */}
          <div className="text-center mb-6">
            <h1 className="text-xl sm:text-[23px] font-extrabold text-[#231F20] tracking-tight">
              {activeTab === "login" && "Chào mừng bạn đến với Nhà Xinh"}
              {activeTab === "register" && "Đăng ký tài khoản Nhà Xinh"}
              {activeTab === "forgot" && "Quên mật khẩu?"}
            </h1>
            <p className="text-xs sm:text-[13px] text-[#78716C] mt-1.5 leading-relaxed">
              {activeTab === "login" && "Đăng nhập bằng email để theo dõi đơn hàng và lưu sản phẩm yêu thích."}
              {activeTab === "register" && "Đăng ký bằng email để nhận ưu đãi đặc biệt và lưu sản phẩm yêu thích."}
              {activeTab === "forgot" &&
                (otpSent
                  ? "Nhập mã OTP 6 chữ số mới nhất (hiệu lực trong 3 phút) và mật khẩu mới của bạn."
                  : "Nhập email đã đăng ký, hệ thống sẽ gửi mã OTP có hiệu lực trong 3 phút.")}
            </p>
          </div>

          {/* Thanh chuyển đổi Tab (Đăng nhập / Đăng ký) */}
          {activeTab !== "forgot" && (
            <div className="flex border-b border-[#E7E2DA] mb-6">
              <button
                type="button"
                onClick={() => handleSwitchTab("login")}
                className={`flex-1 py-3 text-center text-sm font-semibold transition-all cursor-pointer relative ${
                  activeTab === "login"
                    ? "text-[#B86B49] border-b-2 border-[#B86B49] -mb-px"
                    : "text-[#78716C] hover:text-[#231F20]"
                }`}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                onClick={() => handleSwitchTab("register")}
                className={`flex-1 py-3 text-center text-sm font-semibold transition-all cursor-pointer relative ${
                  activeTab === "register"
                    ? "text-[#B86B49] border-b-2 border-[#B86B49] -mb-px"
                    : "text-[#78716C] hover:text-[#231F20]"
                }`}
              >
                Đăng ký
              </button>
            </div>
          )}

          {/* Thông báo lỗi & thành công */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
              <div className="flex-1 space-y-1.5">
                <div>{error}</div>
                {(activeTab === "forgot" || activeTab === "login") &&
                  error.toLowerCase().includes("chưa được đăng ký") && (
                    <button
                      type="button"
                      onClick={() => {
                        setEmail(
                          (activeTab === "forgot" ? forgotEmail : loginEmail).trim().toLowerCase()
                        );
                        handleSwitchTab("register");
                      }}
                      className="inline-flex items-center gap-1 font-bold text-[#B86B49] hover:text-[#8F4E2E] underline underline-offset-2 cursor-pointer"
                    >
                      Đăng ký tài khoản với email này →
                    </button>
                  )}
              </div>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2 animate-in fade-in">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: FORM ĐĂNG NHẬP */}
          {activeTab === "login" && (
            <LoginForm
              loginEmail={loginEmail}
              setLoginEmail={setLoginEmail}
              password={password}
              setPassword={setPassword}
              rememberMe={rememberMe}
              setRememberMe={setRememberMe}
              showPass={showPass}
              setShowPass={setShowPass}
              loading={loading}
              fieldErrors={fieldErrors}
              clearFieldError={clearFieldError}
              onSubmit={handleLoginSubmit}
              onForgotPassword={() => {
                if (loginEmail.trim()) {
                  setForgotEmail(loginEmail.trim());
                }
                handleSwitchTab("forgot");
              }}
            />
          )}

          {/* TAB 2: FORM ĐĂNG KÝ */}
          {activeTab === "register" && (
            <RegisterForm
              fullName={fullName}
              setFullName={setFullName}
              email={email}
              setEmail={setEmail}
              phone={phone}
              setPhone={setPhone}
              password={password}
              setPassword={setPassword}
              confirmPass={confirmPass}
              setConfirmPass={setConfirmPass}
              termsAgreed={termsAgreed}
              setTermsAgreed={setTermsAgreed}
              showPass={showPass}
              setShowPass={setShowPass}
              showConfirmPass={showConfirmPass}
              setShowConfirmPass={setShowConfirmPass}
              loading={loading}
              fieldErrors={fieldErrors}
              clearFieldError={clearFieldError}
              onSubmit={handleRegisterSubmit}
            />
          )}

          {/* TAB 3: QUÊN MẬT KHẨU & ĐẶT LẠI MẬT KHẨU BẰNG OTP */}
          {activeTab === "forgot" && (
            <ForgotPasswordForm
              forgotEmail={forgotEmail}
              setForgotEmail={setForgotEmail}
              otpToken={otpToken}
              setOtpToken={setOtpToken}
              newPassword={newPassword}
              setNewPassword={setNewPassword}
              confirmNewPass={confirmNewPass}
              setConfirmNewPass={setConfirmNewPass}
              showPass={showPass}
              setShowPass={setShowPass}
              showConfirmPass={showConfirmPass}
              setShowConfirmPass={setShowConfirmPass}
              otpSent={otpSent}
              otpSecondsLeft={otpSecondsLeft}
              resendCooldownLeft={resendCooldownLeft}
              loading={loading}
              resendingOtp={resendingOtp}
              fieldErrors={fieldErrors}
              clearFieldError={clearFieldError}
              onForgotSubmit={handleForgotSubmit}
              onResetSubmit={handleResetSubmit}
              onResendOtp={() => requestOtpCode(true)}
              onBackToLogin={() => {
                setForgotEmail("");
                setOtpToken("");
                setNewPassword("");
                setConfirmNewPass("");
                handleSwitchTab("login");
              }}
              formatCountdown={formatCountdown}
            />
          )}

          {/* ĐĂNG NHẬP MẠNG XÃ HỘI */}
          {/* <SocialLoginButtons
            activeTab={activeTab}
            onSocialClick={handleSocialClick}
          /> */}
        </div>
      </main>

      {/* MODAL THÔNG BÁO ĐĂNG NHẬP THÀNH CÔNG */}
      {loginSuccessData && (
        <LoginSuccessModal
          data={loginSuccessData}
          onProceed={handleProceedNow}
        />
      )}

      <Footer />
    </div>
  );
}
