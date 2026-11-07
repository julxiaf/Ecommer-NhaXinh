import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useStore } from "./useStore";
import { userService } from "../services/userService";
import {
  type AuthTab,
  type LoginSuccessInfo,
  type FieldErrors,
  OTP_TTL_DEFAULT_SECONDS,
  OTP_RESEND_COOLDOWN_DEFAULT_SECONDS,
} from "../components/auth/types";

// Helper regex kiểm tra tính hợp lệ của Email & SĐT
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VN_PHONE_REGEX = /^(0|\+84)[0-9]{8,10}$/;

const isValidEmail = (email: string) => EMAIL_REGEX.test(email.trim());
const isValidPhone = (phone: string) => VN_PHONE_REGEX.test(phone.replace(/\s+/g, ""));

export function useAuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const isExplicitLogout =
    searchParams.get("logout") === "1" ||
    (typeof window !== "undefined" && sessionStorage.getItem("nhaxinh_user_logged_out") === "1");
  const isExpired = !isExplicitLogout && searchParams.get("expired") === "1";
  const redirectParam = searchParams.get("redirect");
  const isAdminRedirect = Boolean(redirectParam && redirectParam.startsWith("/admin"));
  const { user, login, logout, cartCount, wishlist } = useStore();

  const [activeTab, setActiveTab] = useState<AuthTab>("login");
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendingOtp, setResendingOtp] = useState(false);
  const [error, setError] = useState(
    isExpired
      ? "Phiên đăng nhập của bạn đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại."
      : isAdminRedirect
      ? "Vui lòng đăng nhập bằng tài khoản Quản trị viên hoặc Nhân viên để truy cập trang Quản trị (/admin)."
      : ""
  );
  const [successMsg, setSuccessMsg] = useState("");
  const [loginSuccessData, setLoginSuccessData] = useState<LoginSuccessInfo | null>(null);

  // Lưu trạng thái lỗi theo từng trường để highlight ô nhập
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // Ref lưu timer tự động chuyển trang sau khi đăng nhập thành công (tránh memory leak)
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  const clearFieldError = useCallback((fieldKey: string) => {
    setFieldErrors((prev) => {
      if (!prev[fieldKey]) return prev;
      const next = { ...prev };
      delete next[fieldKey];
      return next;
    });
  }, []);

  // Xử lý dọn dẹp cờ logout và phiên đăng nhập khi vào trang
  useEffect(() => {
    if (isExplicitLogout) {
      userService.clearSession(false);
      logout();
      userService.clearLogoutFlag();
      if (searchParams.get("logout") === "1" || searchParams.get("expired") === "1") {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete("logout");
        nextParams.delete("expired");
        const queryStr = nextParams.toString();
        navigate(`/dang-nhap${queryStr ? `?${queryStr}` : ""}`, { replace: true });
      }
      return;
    }

    if (isExpired) {
      userService.clearSession();
      logout();
      userService.clearLogoutFlag();
    }
  }, [isExplicitLogout, isExpired, logout, searchParams, navigate]);

  // Form states - Login
  const [loginEmail, setLoginEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  // Form states - Register
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [termsAgreed, setTermsAgreed] = useState(true);

  // Form states - Forgot & Reset Password
  const [forgotEmail, setForgotEmail] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPass, setConfirmNewPass] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpSecondsLeft, setOtpSecondsLeft] = useState(0);
  const [resendCooldownLeft, setResendCooldownLeft] = useState(0);

  // Bộ đếm ngược thời gian sống của mã OTP (3 phút) và thời gian chờ gửi lại (chỉ chạy khi bộ đếm > 0)
  useEffect(() => {
    if (!otpSent || (otpSecondsLeft <= 0 && resendCooldownLeft <= 0)) return;

    const timer = setInterval(() => {
      setOtpSecondsLeft((prev) => {
        if (prev <= 1) {
          if (prev === 1) {
            setFieldErrors((errs) => ({
              ...errs,
              otp: "Mã xác thực OTP đã hết thời gian hiệu lực (3 phút). Vui lòng lấy lại mã OTP mới.",
            }));
            setSuccessMsg("");
            setError(
              "Mã xác thực OTP đã hết thời gian sống (3 phút) và không thể sử dụng. Vui lòng bấm lấy lại mã OTP mới."
            );
          }
          return 0;
        }
        return prev - 1;
      });
      setResendCooldownLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [otpSent, otpSecondsLeft, resendCooldownLeft]);

  // Nếu người dùng đã đăng nhập hợp lệ và không có cờ expired
  useEffect(() => {
    if (user && !loginSuccessData && !isExpired && !isAdminRedirect) {
      const target = redirectParam && redirectParam.startsWith("/") ? redirectParam : "/";
      navigate(target, { replace: true });
    }
  }, [user, loginSuccessData, isExpired, isAdminRedirect, redirectParam, navigate]);

  const formatCountdown = useCallback((totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, []);

  const handleSwitchTab = useCallback((tab: AuthTab) => {
    setActiveTab(tab);
    setError("");
    setSuccessMsg("");
    setFieldErrors({});
  }, []);

  // 1. Xử lý ĐĂNG NHẬP
  const handleLoginSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      setSuccessMsg("");

      const nextErrors: Record<string, string> = {};
      const cleanEmail = loginEmail.trim().toLowerCase();

      if (!cleanEmail) {
        nextErrors.loginEmail = "Vui lòng nhập địa chỉ email của bạn.";
      } else if (!isValidEmail(cleanEmail)) {
        nextErrors.loginEmail = "Địa chỉ email không đúng định dạng (ví dụ: ten@email.com).";
      }

      if (!password) {
        nextErrors.loginPassword = "Vui lòng nhập mật khẩu.";
      }

      if (Object.keys(nextErrors).length > 0) {
        setFieldErrors(nextErrors);
        setError(Object.values(nextErrors)[0]);
        return;
      }

      setFieldErrors({});
      setLoading(true);
      const result = await userService.login(cleanEmail, password);
      setLoading(false);

      if (!result.ok || !result.data) {
        const msg = result.message || "Email hoặc mật khẩu không chính xác.";
        setError(msg);

        if (result.field === "password" || result.code === "INVALID_PASSWORD") {
          setFieldErrors({ loginPassword: msg });
        } else if (
          result.field === "email" ||
          result.code === "EMAIL_NOT_REGISTERED" ||
          result.code === "ACCOUNT_LOCKED"
        ) {
          setFieldErrors({ loginEmail: msg });
        } else {
          setFieldErrors({
            loginEmail: "Kiểm tra lại địa chỉ email",
            loginPassword: "Kiểm tra lại mật khẩu",
          });
        }
        return;
      }

      const s = result.data;
      const isAdminUser = userService.hasAdminAccess(s);

      if (isAdminRedirect && !isAdminUser) {
        await userService.logout();
        logout();
        const denyMsg =
          "Tài khoản này là tài khoản Khách hàng, không có quyền truy cập vào cổng Quản trị (/admin). Vui lòng đăng nhập bằng tài khoản Quản trị viên hoặc Nhân viên.";
        setError(denyMsg);
        setFieldErrors({ loginEmail: "Tài khoản không có quyền Quản trị (/admin)" });
        return;
      }

      const name = s.fullName || s.email || "Khách hàng";
      const successInfo: LoginSuccessInfo = {
        fullName: name,
        email: s.email || cleanEmail,
        phone: s.phone || "",
        role: s.roles?.[0] || (isAdminUser ? "ADMIN" : undefined),
        isAdmin: isAdminUser,
      };

      setLoginSuccessData(successInfo);
      setSuccessMsg(`Đăng nhập thành công! Chào mừng ${name} quay trở lại Nhà Xinh.`);

      void login({
        fullName: successInfo.fullName,
        email: successInfo.email,
        phone: successInfo.phone,
        address: "",
      });

      const destination =
        redirectParam && redirectParam.startsWith("/")
          ? redirectParam
          : isAdminUser
          ? "/admin"
          : "/tai-khoan";

      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
      redirectTimerRef.current = setTimeout(() => {
        navigate(destination);
      }, 1800);
    },
    [loginEmail, password, isAdminRedirect, redirectParam, login, logout, navigate]
  );

  const handleProceedNow = useCallback(
    (targetPath: string = "/tai-khoan") => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
      if (loginSuccessData) {
        void login({
          fullName: loginSuccessData.fullName,
          email: loginSuccessData.email,
          phone: loginSuccessData.phone,
          address: "",
        });
      }
      const destination =
        targetPath === "/tai-khoan" && redirectParam && redirectParam.startsWith("/")
          ? redirectParam
          : targetPath;
      navigate(destination);
    },
    [loginSuccessData, login, redirectParam, navigate]
  );

  // 2. Xử lý ĐĂNG KÝ
  const handleRegisterSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      setSuccessMsg("");

      const nextErrors: Record<string, string> = {};
      const cleanName = fullName.trim();
      const cleanEmail = email.trim().toLowerCase();
      const cleanPhone = phone.replace(/\s+/g, "");

      if (!cleanName) {
        nextErrors.fullName = "Vui lòng nhập họ và tên của bạn.";
      }

      if (!cleanEmail) {
        nextErrors.email = "Vui lòng nhập địa chỉ email.";
      } else if (!isValidEmail(cleanEmail)) {
        nextErrors.email = "Địa chỉ email không đúng định dạng.";
      }

      if (!cleanPhone) {
        nextErrors.phone = "Vui lòng nhập số điện thoại.";
      } else if (!isValidPhone(cleanPhone)) {
        nextErrors.phone = "Số điện thoại không đúng định dạng Việt Nam (10 số).";
      }

      if (!password) {
        nextErrors.password = "Vui lòng nhập mật khẩu.";
      } else if (password.length < 8) {
        nextErrors.password = "Mật khẩu phải có độ dài tối thiểu từ 8 ký tự trở lên.";
      }

      if (!confirmPass) {
        nextErrors.confirmPass = "Vui lòng nhập lại mật khẩu xác nhận.";
      } else if (password !== confirmPass) {
        nextErrors.confirmPass = "Mật khẩu xác nhận không khớp với mật khẩu đã nhập.";
      }

      if (!termsAgreed) {
        nextErrors.terms = "Vui lòng đồng ý với Điều khoản sử dụng & Chính sách bảo mật.";
      }

      if (Object.keys(nextErrors).length > 0) {
        setFieldErrors(nextErrors);
        setError(Object.values(nextErrors)[0]);
        return;
      }

      setFieldErrors({});
      setLoading(true);
      const reg = await userService.register({
        password,
        email: cleanEmail,
        phone: cleanPhone,
        fullName: cleanName,
      });

      if (!reg.ok) {
        setLoading(false);
        const errMsg = reg.message || "Đăng ký thất bại. Email hoặc số điện thoại có thể đã tồn tại.";
        setError(errMsg);

        const backendFieldErrors: Record<string, string> = { ...(reg.fieldErrors || {}) };
        if (reg.code === "EMAIL_TAKEN" || reg.field === "email") {
          backendFieldErrors.email = errMsg;
        } else if (reg.code === "PHONE_TAKEN" || reg.field === "phone") {
          backendFieldErrors.phone = errMsg;
        } else if (Object.keys(backendFieldErrors).length === 0) {
          backendFieldErrors.email = errMsg;
        }
        setFieldErrors(backendFieldErrors);
        return;
      }

      const result = await userService.login(cleanEmail, password);
      setLoading(false);

      if (!result.ok || !result.data) {
        setActiveTab("login");
        setLoginEmail(cleanEmail);
        setSuccessMsg("Đăng ký thành công! Quý khách vui lòng đăng nhập.");
        return;
      }

      void login({
        fullName: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        address: "",
      });
      navigate("/tai-khoan");
    },
    [fullName, email, phone, password, confirmPass, termsAgreed, login, navigate]
  );

  // 3. Xử lý GỬI MÃ OTP QUÊN MẬT KHẨU
  const requestOtpCode = useCallback(
    async (isResend = false) => {
      setError("");
      setSuccessMsg("");

      const cleanEmail = forgotEmail.trim().toLowerCase();
      if (!cleanEmail) {
        const msg = "Vui lòng nhập email đã đăng ký của bạn.";
        setFieldErrors({ forgotEmail: msg });
        setError(msg);
        return;
      }

      if (!isValidEmail(cleanEmail)) {
        const msg = "Địa chỉ email không đúng định dạng. Vui lòng kiểm tra lại.";
        setFieldErrors({ forgotEmail: msg });
        setError(msg);
        return;
      }

      setFieldErrors({});
      if (isResend) {
        setResendingOtp(true);
      } else {
        setLoading(true);
      }

      const res = await userService.forgotPassword(cleanEmail);

      if (isResend) {
        setResendingOtp(false);
      } else {
        setLoading(false);
      }

      if (!res.ok) {
        setError(res.message);
        if (res.code === "OTP_SPAM_COOLDOWN" && res.retryAfterSeconds) {
          setResendCooldownLeft(res.retryAfterSeconds);
        } else if (!isResend) {
          setOtpSent(false);
          setFieldErrors({ forgotEmail: res.message });
        }
        return;
      }

      setOtpSent(true);
      setOtpToken("");
      setOtpSecondsLeft(res.expiresInSeconds || OTP_TTL_DEFAULT_SECONDS);
      setResendCooldownLeft(res.resendCooldownSeconds || OTP_RESEND_COOLDOWN_DEFAULT_SECONDS);
      setFieldErrors({});
      setSuccessMsg(
        isResend
          ? "Đã gửi mã OTP mới! Mã OTP trước đó đã bị vô hiệu hóa, vui lòng chỉ sử dụng mã mới nhất trong email (hiệu lực 3 phút)."
          : res.message || "Mã xác thực 6 chữ số (hiệu lực 3 phút) đã được gửi đến email của bạn."
      );
    },
    [forgotEmail]
  );

  const handleForgotSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      await requestOtpCode(false);
    },
    [requestOtpCode]
  );

  // 4. Xử lý ĐẶT LẠI MẬT KHẨU
  const handleResetSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      setSuccessMsg("");

      const nextErrors: Record<string, string> = {};
      const cleanOtp = otpToken.trim();

      if (otpSecondsLeft <= 0) {
        const msg = "Mã xác thực OTP đã hết thời gian sống (3 phút). Vui lòng bấm lấy lại mã OTP mới.";
        setFieldErrors({ otp: msg });
        setError(msg);
        return;
      }

      if (!cleanOtp) {
        nextErrors.otp = "Vui lòng nhập mã OTP 6 chữ số.";
      } else if (!/^\d{6}$/.test(cleanOtp)) {
        nextErrors.otp = "Mã OTP phải gồm đúng 6 chữ số.";
      }

      if (!newPassword) {
        nextErrors.newPassword = "Vui lòng nhập mật khẩu mới.";
      } else if (newPassword.length < 6) {
        nextErrors.newPassword = "Mật khẩu mới phải có ít nhất 6 ký tự.";
      }

      if (!confirmNewPass) {
        nextErrors.confirmNewPass = "Vui lòng nhập lại mật khẩu xác nhận.";
      } else if (newPassword !== confirmNewPass) {
        nextErrors.confirmNewPass = "Mật khẩu xác nhận không khớp.";
      }

      if (Object.keys(nextErrors).length > 0) {
        setFieldErrors(nextErrors);
        setError(Object.values(nextErrors)[0]);
        return;
      }

      setFieldErrors({});
      setLoading(true);
      const res = await userService.resetPassword({
        email: forgotEmail.trim().toLowerCase(),
        token: cleanOtp,
        newPassword,
      });
      setLoading(false);

      if (!res.ok) {
        setError(res.message);
        if (res.code === "OTP_EXPIRED") {
          setOtpSecondsLeft(0);
        }
        setFieldErrors({ otp: res.message });
        return;
      }

      alert("Đặt lại mật khẩu thành công! Mời bạn đăng nhập với mật khẩu mới.");
      setOtpSent(false);
      setOtpSecondsLeft(0);
      setResendCooldownLeft(0);
      setLoginEmail(forgotEmail.trim().toLowerCase());
      setForgotEmail("");
      setOtpToken("");
      setNewPassword("");
      setConfirmNewPass("");
      handleSwitchTab("login");
    },
    [
      otpToken,
      otpSecondsLeft,
      newPassword,
      confirmNewPass,
      forgotEmail,
      handleSwitchTab,
    ]
  );

  const handleSocialClick = useCallback((provider: "Google" | "Facebook") => {
    alert(
      `Tính năng đăng nhập với ${provider} đang kết nối trực tiếp với hệ thống bảo mật OAuth2 Nhà Xinh. Bạn có thể đăng nhập bằng địa chỉ email.`
    );
  }, []);

  return {
    cartCount,
    wishlistCount: wishlist.length,
    activeTab,
    setActiveTab,
    handleSwitchTab,
    showPass,
    setShowPass,
    showConfirmPass,
    setShowConfirmPass,
    loading,
    resendingOtp,
    error,
    setError,
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
    handleSocialClick,
    handleProceedNow,
  };
}
