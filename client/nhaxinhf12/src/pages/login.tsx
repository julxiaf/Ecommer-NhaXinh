import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Eye, EyeOff, Mail, Lock, User, Phone,
  UserCheck, ArrowLeft, CheckCircle2, ShieldCheck,
  AlertCircle
} from "lucide-react";
import Header from "../components/Headers";
import Footer from "../components/Footer";
import { useStore } from "../hooks/useStore";
import { userService } from "../services/userService";
import "./pages.css";

type AuthTab = "login" | "register" | "forgot";

interface LoginSuccessInfo {
  fullName: string;
  email: string;
  phone: string;
  role?: string;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, login, cartCount, wishlist } = useStore();

  const [activeTab, setActiveTab] = useState<AuthTab>("login");
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loginSuccessData, setLoginSuccessData] = useState<LoginSuccessInfo | null>(null);

  // Form states
  const [identifier, setIdentifier] = useState(""); // username, email or phone
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  // Register form fields
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [termsAgreed, setTermsAgreed] = useState(true);

  // Forgot password fields
  const [forgotEmail, setForgotEmail] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPass, setConfirmNewPass] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  // Nếu người dùng đã đăng nhập từ trước và không trong quá trình hiển thị thông báo thì tự động chuyển về trang cá nhân
  if (user && !loginSuccessData) {
    navigate("/tai-khoan", { replace: true });
    return null;
  }

  // Chuyển tab và reset lỗi
  const handleSwitchTab = (tab: AuthTab) => {
    setActiveTab(tab);
    setError("");
    setSuccessMsg("");
  };

  // 1. Xử lý ĐĂNG NHẬP
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!identifier.trim() || !password) {
      setError("Vui lòng nhập tên đăng nhập / email / SĐT và mật khẩu.");
      return;
    }

    setLoading(true);
    const result = await userService.login(identifier, password);
    setLoading(false);

    if (!result.ok || !result.data) {
      setError(result.message || "Tên đăng nhập hoặc mật khẩu không chính xác.");
      return;
    }

    const s = result.data;
    const name = s.fullName || s.username || "Khách hàng";
    const successInfo: LoginSuccessInfo = {
      fullName: name,
      email: s.email || "",
      phone: s.phone || "",
      role: (s as any).role || s.roles?.[0] || (s.username === "admin" ? "admin" : undefined),
    };

    setLoginSuccessData(successInfo);
    setSuccessMsg(`Đăng nhập thành công! Chào mừng ${name} quay trở lại Nhà Xinh.`);

    // Sau 1.5s tự động đăng nhập vào store và chuyển trang
    setTimeout(() => {
      login({
        fullName: successInfo.fullName,
        email: successInfo.email,
        phone: successInfo.phone,
        address: "",
      });
      navigate("/tai-khoan");
    }, 1800);
  };

  const handleProceedNow = (targetPath: string = "/tai-khoan") => {
    if (loginSuccessData) {
      login({
        fullName: loginSuccessData.fullName,
        email: loginSuccessData.email,
        phone: loginSuccessData.phone,
        address: "",
      });
    }
    navigate(targetPath);
  };

  // 2. Xử lý ĐĂNG KÝ
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!fullName.trim() || !username.trim() || !email.trim() || !phone.trim() || !password || !confirmPass) {
      setError("Vui lòng điền đầy đủ tất cả các trường thông tin.");
      return;
    }

    if (!/^[a-zA-Z0-9_.]{4,30}$/.test(username.trim())) {
      setError("Tên đăng nhập từ 4-30 ký tự, chỉ gồm chữ, số, dấu gạch dưới hoặc dấu chấm.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Địa chỉ email không đúng định dạng.");
      return;
    }

    if (password.length < 8) {
      setError("Mật khẩu phải có độ dài tối thiểu từ 8 ký tự trở lên.");
      return;
    }

    if (password !== confirmPass) {
      setError("Mật khẩu xác nhận không khớp với mật khẩu đã nhập.");
      return;
    }

    if (!termsAgreed) {
      setError("Vui lòng đồng ý với Điều khoản sử dụng & Chính sách bảo mật của Nhà Xinh.");
      return;
    }

    setLoading(true);
    const reg = await userService.register({
      username: username.trim(),
      password,
      email: email.trim().toLowerCase(),
      phone: phone.replace(/\s+/g, ""),
      fullName: fullName.trim(),
    });

    if (!reg.ok) {
      setLoading(false);
      setError(reg.message || "Đăng ký thất bại. Tên đăng nhập hoặc email có thể đã tồn tại.");
      return;
    }

    // Đăng ký thành công, tự động đăng nhập luôn
    const result = await userService.login(username.trim(), password);
    setLoading(false);

    if (!result.ok || !result.data) {
      setActiveTab("login");
      setSuccessMsg("Đăng ký thành công! Quý khách vui lòng đăng nhập.");
      return;
    }

    login({
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.replace(/\s+/g, ""),
      address: "",
    });
    navigate("/tai-khoan");
  };

  // 3. Xử lý GỬI YÊU CẦU QUÊN MẬT KHẨU
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!forgotEmail.trim()) {
      setError("Vui lòng nhập email đã đăng ký của bạn.");
      return;
    }

    setLoading(true);
    const res = await userService.forgotPassword(forgotEmail.trim());
    setLoading(false);

    if (!res.ok) {
      setError(res.message);
      return;
    }

    setOtpSent(true);
    setSuccessMsg(res.message || "Mã xác thực 6 chữ số đã được gửi đến email của bạn.");
  };

  // 4. Xử lý ĐẶT LẠI MẬT KHẨU (RESET PASSWORD BẰNG OTP)
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!otpToken.trim() || !newPassword || !confirmNewPass) {
      setError("Vui lòng nhập đầy đủ mã OTP và mật khẩu mới.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }

    if (newPassword !== confirmNewPass) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setLoading(true);
    const res = await userService.resetPassword({
      email: forgotEmail.trim().toLowerCase(),
      token: otpToken.trim(),
      newPassword,
    });
    setLoading(false);

    if (!res.ok) {
      setError(res.message);
      return;
    }

    alert("Đặt lại mật khẩu thành công! Mời bạn đăng nhập với mật khẩu mới.");
    setOtpSent(false);
    setForgotEmail("");
    setOtpToken("");
    setNewPassword("");
    setConfirmNewPass("");
    handleSwitchTab("login");
  };

  // Thông báo tính năng Social Login
  const handleSocialClick = (provider: "Google" | "Facebook") => {
    alert(`Tính năng đăng nhập với ${provider} đang kết nối trực tiếp với hệ thống bảo mật OAuth2 Nhà Xinh. Bạn có thể đăng nhập bằng tài khoản hoặc email.`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2] font-sans antialiased text-[#2D231E]">
      <Header user={null} cartCount={cartCount} wishlistCount={wishlist.length} />

      {/* ── KHU VỰC THẺ ĐĂNG NHẬP / ĐĂNG KÝ TRUNG TÂM ── */}
      <main className="flex-1 flex items-center justify-center py-10 px-4 sm:px-6">
        <div className="w-full max-w-122.5 bg-white rounded-2xl shadow-xl shadow-stone-200/60 border border-[#EDE7DF] p-7 sm:p-9 transition-all">
          
          {/* Header Tiêu đề & Lời chào */}
          <div className="text-center mb-6">
            <h1 className="text-xl sm:text-[23px] font-extrabold text-[#231F20] tracking-tight">
              {activeTab === "login" && "Chào mừng bạn đến với Nhà Xinh"}
              {activeTab === "register" && "Đăng ký tài khoản Nhà Xinh"}
              {activeTab === "forgot" && "Quên mật khẩu?"}
            </h1>
            <p className="text-xs sm:text-[13px] text-[#78716C] mt-1.5 leading-relaxed">
              {activeTab === "login" && "Đăng nhập để theo dõi đơn hàng và lưu sản phẩm yêu thích."}
              {activeTab === "register" && "Đăng ký để nhận ưu đãi đặc biệt và lưu sản phẩm yêu thích."}
              {activeTab === "forgot" && (
                otpSent
                  ? "Nhập mã xác thực 6 chữ số vừa nhận và mật khẩu mới của bạn."
                  : "Nhập email của bạn, chúng tôi sẽ gửi mã xác thực để đặt lại mật khẩu."
              )}
            </p>
          </div>

          {/* Thanh chuyển đổi Tab (Đăng nhập / Đăng ký) - Chỉ hiện khi không ở form Quên mật khẩu */}
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
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2 animate-in fade-in">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              TAB 1: FORM ĐĂNG NHẬP (Chuẩn giao diện ảnh mẫu Nhà Xinh)
              ════════════════════════════════════════════════════════════ */}
          {activeTab === "login" && (
            <form onSubmit={handleLoginSubmit} noValidate className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#2A2521] mb-1.5">
                  Tên đăng nhập / Email / SĐT
                </label>
                <div className="relative flex items-center">
                  <User size={18} className="absolute left-3.5 text-[#A0988F]" />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Nhập tên đăng nhập, email hoặc số điện thoại"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-[13px] bg-white border border-[#D8D2C9] rounded-lg focus:outline-none focus:border-[#B86B49] focus:ring-1 focus:ring-[#B86B49] text-[#1C1917] placeholder:text-[#A8A29E] transition-all"
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2A2521] mb-1.5">
                  Mật khẩu
                </label>
                <div className="relative flex items-center">
                  <Lock size={18} className="absolute left-3.5 text-[#A0988F]" />
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu"
                    className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-[13px] bg-white border border-[#D8D2C9] rounded-lg focus:outline-none focus:border-[#B86B49] focus:ring-1 focus:ring-[#B86B49] text-[#1C1917] placeholder:text-[#A8A29E] transition-all"
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
              </div>

              {/* Dòng Ghi nhớ đăng nhập & Quên mật khẩu */}
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
                  onClick={() => handleSwitchTab("forgot")}
                  className="text-[#B86B49] hover:underline font-semibold cursor-pointer transition-colors"
                >
                  Quên mật khẩu?
                </button>
              </div>

              {/* Nút bấm ĐĂNG NHẬP màu Terracotta chuẩn Nhà Xinh */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#B86B49] hover:bg-[#A35C3A] active:bg-[#8F4E2E] text-white text-xs sm:text-sm font-bold tracking-wider uppercase rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {loading ? "ĐANG XỬ LÝ..." : "ĐĂNG NHẬP"}
              </button>
            </form>
          )}

          {/* ════════════════════════════════════════════════════════════
              TAB 2: FORM ĐĂNG KÝ TÀI KHOẢN MỚI
              ════════════════════════════════════════════════════════════ */}
          {activeTab === "register" && (
            <form onSubmit={handleRegisterSubmit} noValidate className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#2A2521] mb-1">
                  Họ và tên
                </label>
                <div className="relative flex items-center">
                  <User size={18} className="absolute left-3.5 text-[#A0988F]" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nhập họ và tên của bạn"
                    className="w-full pl-10 pr-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#D8D2C9] rounded-lg focus:outline-none focus:border-[#B86B49] focus:ring-1 focus:ring-[#B86B49] text-[#1C1917] placeholder:text-[#A8A29E]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2A2521] mb-1">
                  Tên đăng nhập
                </label>
                <div className="relative flex items-center">
                  <UserCheck size={18} className="absolute left-3.5 text-[#A0988F]" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Nhập tên đăng nhập (4-30 ký tự)"
                    className="w-full pl-10 pr-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#D8D2C9] rounded-lg focus:outline-none focus:border-[#B86B49] focus:ring-1 focus:ring-[#B86B49] text-[#1C1917] placeholder:text-[#A8A29E]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#2A2521] mb-1">
                    Email
                  </label>
                  <div className="relative flex items-center">
                    <Mail size={18} className="absolute left-3.5 text-[#A0988F]" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="w-full pl-10 pr-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#D8D2C9] rounded-lg focus:outline-none focus:border-[#B86B49] focus:ring-1 focus:ring-[#B86B49] text-[#1C1917] placeholder:text-[#A8A29E]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2A2521] mb-1">
                    Số điện thoại
                  </label>
                  <div className="relative flex items-center">
                    <Phone size={18} className="absolute left-3.5 text-[#A0988F]" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0901 234 567"
                      className="w-full pl-10 pr-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#D8D2C9] rounded-lg focus:outline-none focus:border-[#B86B49] focus:ring-1 focus:ring-[#B86B49] text-[#1C1917] placeholder:text-[#A8A29E]"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2A2521] mb-1">
                  Mật khẩu
                </label>
                <div className="relative flex items-center">
                  <Lock size={18} className="absolute left-3.5 text-[#A0988F]" />
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mật khẩu tối thiểu 8 ký tự"
                    className="w-full pl-10 pr-10 py-2 text-xs sm:text-[13px] bg-white border border-[#D8D2C9] rounded-lg focus:outline-none focus:border-[#B86B49] focus:ring-1 focus:ring-[#B86B49] text-[#1C1917] placeholder:text-[#A8A29E]"
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
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2A2521] mb-1">
                  Xác nhận mật khẩu
                </label>
                <div className="relative flex items-center">
                  <Lock size={18} className="absolute left-3.5 text-[#A0988F]" />
                  <input
                    type={showConfirmPass ? "text" : "password"}
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    placeholder="Nhập lại mật khẩu"
                    className="w-full pl-10 pr-10 py-2 text-xs sm:text-[13px] bg-white border border-[#D8D2C9] rounded-lg focus:outline-none focus:border-[#B86B49] focus:ring-1 focus:ring-[#B86B49] text-[#1C1917] placeholder:text-[#A8A29E]"
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
              </div>

              {/* Điều khoản sử dụng */}
              <label className="flex items-start gap-2 cursor-pointer text-xs text-[#57534E] select-none pt-1">
                <input
                  type="checkbox"
                  checked={termsAgreed}
                  onChange={(e) => setTermsAgreed(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-[#D8D2C9] text-[#B86B49] focus:ring-[#B86B49] accent-[#B86B49] cursor-pointer"
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

              {/* Nút bấm ĐĂNG KÝ */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#B86B49] hover:bg-[#A35C3A] active:bg-[#8F4E2E] text-white text-xs sm:text-sm font-bold tracking-wider uppercase rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {loading ? "ĐANG TẠO TÀI KHOẢN..." : "ĐĂNG KÝ TÀI KHOẢN"}
              </button>
            </form>
          )}

          {/* ════════════════════════════════════════════════════════════
              TAB 3: QUÊN MẬT KHẨU & ĐẶT LẠI MẬT KHẨU BẰNG MÃ OTP
              ════════════════════════════════════════════════════════════ */}
          {activeTab === "forgot" && (
            <div className="space-y-4">
              {!otpSent ? (
                // BƯỚC 1: NHẬP EMAIL ĐỂ GỬI MÃ OTP
                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#2A2521] mb-1.5">
                      Email đã đăng ký
                    </label>
                    <div className="relative flex items-center">
                      <Mail size={18} className="absolute left-3.5 text-[#A0988F]" />
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="Nhập email của bạn (ví dụ: email@example.com)"
                        className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-[13px] bg-white border border-[#D8D2C9] rounded-lg focus:outline-none focus:border-[#B86B49] focus:ring-1 focus:ring-[#B86B49] text-[#1C1917] placeholder:text-[#A8A29E]"
                        required
                      />
                    </div>
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
                // BƯỚC 2: NHẬP MÃ OTP & MẬT KHẨU MỚI
                <form onSubmit={handleResetSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-[#2A2521] mb-1">
                      Mã xác thực OTP (6 chữ số)
                    </label>
                    <div className="relative flex items-center">
                      <ShieldCheck size={18} className="absolute left-3.5 text-[#B86B49]" />
                      <input
                        type="text"
                        value={otpToken}
                        onChange={(e) => setOtpToken(e.target.value)}
                        placeholder="Nhập mã 6 chữ số từ email"
                        maxLength={6}
                        className="w-full pl-10 pr-3.5 py-2 text-xs sm:text-[13px] bg-white border border-[#D8D2C9] rounded-lg focus:outline-none focus:border-[#B86B49] focus:ring-1 focus:ring-[#B86B49] text-[#1C1917] tracking-widest font-mono font-bold"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2A2521] mb-1">
                      Mật khẩu mới
                    </label>
                    <div className="relative flex items-center">
                      <Lock size={18} className="absolute left-3.5 text-[#A0988F]" />
                      <input
                        type={showPass ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Tối thiểu 6 ký tự"
                        className="w-full pl-10 pr-10 py-2 text-xs sm:text-[13px] bg-white border border-[#D8D2C9] rounded-lg focus:outline-none focus:border-[#B86B49] focus:ring-1 focus:ring-[#B86B49] text-[#1C1917]"
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
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2A2521] mb-1">
                      Xác nhận mật khẩu mới
                    </label>
                    <div className="relative flex items-center">
                      <Lock size={18} className="absolute left-3.5 text-[#A0988F]" />
                      <input
                        type={showConfirmPass ? "text" : "password"}
                        value={confirmNewPass}
                        onChange={(e) => setConfirmNewPass(e.target.value)}
                        placeholder="Nhập lại mật khẩu mới"
                        className="w-full pl-10 pr-10 py-2 text-xs sm:text-[13px] bg-white border border-[#D8D2C9] rounded-lg focus:outline-none focus:border-[#B86B49] focus:ring-1 focus:ring-[#B86B49] text-[#1C1917]"
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
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-[#B86B49] hover:bg-[#A35C3A] active:bg-[#8F4E2E] text-white text-xs sm:text-sm font-bold tracking-wider uppercase rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 mt-1"
                  >
                    {loading ? "ĐANG ĐẶT LẠI..." : "ĐẶT LẠI MẬT KHẨU"}
                  </button>
                </form>
              )}

              {/* Nút quay lại đăng nhập */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setOtpSent(false);
                    handleSwitchTab("login");
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-[#78716C] hover:text-[#B86B49] font-semibold cursor-pointer transition-colors"
                >
                  <ArrowLeft size={14} />
                  <span>Quay lại trang Đăng nhập</span>
                </button>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              PHẦN ĐĂNG NHẬP MẠNG XÃ HỘI (GOOGLE & FACEBOOK)
              ════════════════════════════════════════════════════════════ */}
          {activeTab !== "forgot" && (
            <>
              {/* Dòng phân cách "hoặc" */}
              <div className="relative my-5 flex items-center justify-center">
                <div className="w-full border-t border-[#E7E2DA]" />
                <span className="absolute bg-white px-3 text-xs text-[#A8A29E]">
                  hoặc
                </span>
              </div>

              {/* 2 nút Đăng nhập qua Google & Facebook */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleSocialClick("Google")}
                  className="w-full py-2.5 px-3 border border-[#D8D2C9] bg-white hover:bg-[#FAF8F5] active:bg-[#F2EDE6] rounded-lg flex items-center justify-center gap-2 text-xs font-semibold text-[#3A342E] transition-all cursor-pointer shadow-2xs"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18">
                    <path
                      d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
                      fill="#4285F4"
                    />
                    <path
                      d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
                      fill="#34A853"
                    />
                    <path
                      d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
                      fill="#EA4335"
                    />
                  </svg>
                  <span className="truncate">
                    {activeTab === "login" ? "Đăng nhập bằng Google" : "Đăng ký bằng Google"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSocialClick("Facebook")}
                  className="w-full py-2.5 px-3 border border-[#D8D2C9] bg-white hover:bg-[#FAF8F5] active:bg-[#F2EDE6] rounded-lg flex items-center justify-center gap-2 text-xs font-semibold text-[#3A342E] transition-all cursor-pointer shadow-2xs"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18">
                    <path
                      d="M18 9a9 9 0 10-10.406 8.89v-6.29H5.309V9h2.285V7.017c0-2.255 1.343-3.501 3.4-3.501.984 0 2.014.176 2.014.176v2.215h-1.135c-1.118 0-1.467.694-1.467 1.406V9h2.496l-.399 2.6h-2.097v6.29A9.003 9.003 0 0018 9z"
                      fill="#1877F2"
                    />
                  </svg>
                  <span className="truncate">
                    {activeTab === "login" ? "Đăng nhập bằng Facebook" : "Đăng ký bằng Facebook"}
                  </span>
                </button>
              </div>
            </>
          )}

        </div>
      </main>

      {/* ── MODAL THÔNG BÁO ĐĂNG NHẬP THÀNH CÔNG ── */}
      {loginSuccessData && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-emerald-100 p-6 sm:p-8 text-center relative overflow-hidden transform scale-100 transition-all">
            {/* Vệt trang trí phía trên */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-[#B86B49] to-amber-500" />

            {/* Icon Thành Công */}
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 border-4 border-emerald-50 flex items-center justify-center text-emerald-600 mb-4 shadow-sm animate-bounce">
              <CheckCircle2 size={36} />
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Đăng nhập thành công!
            </h3>

            <p className="text-sm text-gray-600 mb-2">
              Chào mừng <span className="font-bold text-[#B86B49]">{loginSuccessData.fullName}</span> đã quay trở lại với <strong className="text-gray-900">Nhà Xinh</strong>.
            </p>

            {loginSuccessData.email && (
              <p className="text-xs text-gray-400 mb-5">
                Tài khoản: {loginSuccessData.email}
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
                onClick={() => handleProceedNow("/tai-khoan")}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#B86B49] hover:bg-[#9E5738] text-white font-medium text-xs sm:text-sm transition-colors shadow-sm cursor-pointer"
              >
                Vào tài khoản ngay →
              </button>

              {(loginSuccessData.role === "admin" || loginSuccessData.email.includes("admin")) && (
                <button
                  type="button"
                  onClick={() => handleProceedNow("/admin")}
                  className="py-2.5 px-4 rounded-xl bg-gray-900 hover:bg-black text-amber-400 font-semibold text-xs sm:text-sm transition-colors shadow-sm cursor-pointer"
                >
                  Trang Quản trị ⚡
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
