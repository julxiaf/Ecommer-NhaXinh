import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { ShieldAlert, Lock, ArrowLeft, LogIn, Loader2 } from "lucide-react";
import { userService, type AuthSession } from "../../services/userService";
import { useStore } from "../../hooks/useStore";
import AdminPortal from "../../pages/admin/AdminPortal";

type GuardStatus = "checking" | "unauthenticated" | "locked" | "forbidden" | "authorized";

// Cache phiên làm việc trong bộ nhớ (Memory Cache) để tránh gọi API xác thực dồn dập khi chuyển tab admin
let memorySessionCache: { session: AuthSession; timestamp: number } | null = null;
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 phút

/**
 * Đọc phiên admin ban đầu một cách đồng bộ từ Memory Cache hoặc giải mã trực tiếp từ JWT token (`id`, `role`, `permissions`).
 * Không sử dụng key `nhaxinh_user` trong localStorage/sessionStorage.
 */
function getInitialAdminSession(): { session: AuthSession | null; status: GuardStatus } {
  if (typeof window === "undefined") {
    return { session: null, status: "checking" };
  }

  const tokenClaims = userService.decodeTokenClaims();

  // 1. Kiểm tra cache trong bộ nhớ (nếu còn trong thời hạn TTL và khớp với id trong JWT hiện tại)
  if (memorySessionCache && Date.now() - memorySessionCache.timestamp < CACHE_TTL_MS) {
    const cached = memorySessionCache.session;
    const isSameUser =
      tokenClaims != null &&
      tokenClaims.id != null &&
      cached.id != null &&
      Number(tokenClaims.id) === Number(cached.id);

    if (!isSameUser) {
      memorySessionCache = null;
    } else {
      if (cached.status && cached.status.toUpperCase() !== "ACTIVE") {
        return { session: cached, status: "locked" };
      }
      if (!userService.hasAdminAccess(cached)) {
        return { session: cached, status: "forbidden" };
      }
      return { session: cached, status: "authorized" };
    }
  }

  // 2. Kiểm tra token đã hết hạn hay chưa
  if (userService.isTokenExpired()) {
    return { session: null, status: "unauthenticated" };
  }

  // 3. Giải mã trực tiếp id, roles, permissions từ JWT token
  const tokenSession = userService.getSessionFromToken();
  if (tokenSession && (tokenSession.roles?.length || tokenSession.permissions?.length)) {
    if (tokenSession.status && tokenSession.status.toUpperCase() !== "ACTIVE") {
      return { session: tokenSession, status: "locked" };
    }

    if (!userService.hasAdminAccess(tokenSession)) {
      return { session: tokenSession, status: "forbidden" };
    }

    memorySessionCache = { session: tokenSession, timestamp: Date.now() };
    return { session: tokenSession, status: "authorized" };
  }

  return { session: null, status: "checking" };
}

export default function AdminRouteGuard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useStore();

  // Khởi tạo trạng thái ban đầu đồng bộ (tránh nhấp nháy "checking" khi đã có session)
  const [authState, setAuthState] = useState<{ status: GuardStatus; session: AuthSession | null }>(
    getInitialAdminSession
  );
  const { status, session } = authState;

  useEffect(() => {
    let isMounted = true;

    async function checkAdminAccess() {
      // Nếu memory cache còn hạn (dưới 2 phút) và đã được ủy quyền thì không cần gọi lại API
      if (
        memorySessionCache &&
        Date.now() - memorySessionCache.timestamp < CACHE_TTL_MS &&
        status === "authorized"
      ) {
        return;
      }

      // Xác thực ngầm với backend theo cơ chế Stale-While-Revalidate
      // Không chuyển status về "checking" nếu đang có quyền hợp lệ để tránh reload màn hình
      const verifiedSession = await userService.verifySession();

      if (!isMounted) return;

      if (!verifiedSession || !verifiedSession.authenticated) {
        memorySessionCache = null;
        userService.clearSession();
        logout();
        setAuthState({ status: "unauthenticated", session: null });
        return;
      }

      memorySessionCache = { session: verifiedSession, timestamp: Date.now() };

      if (verifiedSession.status && verifiedSession.status.toUpperCase() !== "ACTIVE") {
        setAuthState({ status: "locked", session: verifiedSession });
        return;
      }

      if (!userService.hasAdminAccess(verifiedSession)) {
        setAuthState({ status: "forbidden", session: verifiedSession });
        return;
      }

      setAuthState({ status: "authorized", session: verifiedSession });
    }

    checkAdminAccess();

    const handleSessionExpired = () => {
      if (!isMounted) return;
      memorySessionCache = null;
      logout();
      setAuthState({ status: "unauthenticated", session: null });
    };

    window.addEventListener("nhaxinh:session_expired", handleSessionExpired);
    return () => {
      isMounted = false;
      window.removeEventListener("nhaxinh:session_expired", handleSessionExpired);
    };
  }, [logout, status]);

  const redirectTarget = encodeURIComponent(location.pathname + location.search);

  const handleSwitchToAdminAccount = async () => {
    memorySessionCache = null;
    await userService.logout();
    logout();
    navigate(`/dang-nhap?redirect=${redirectTarget}`, { replace: true });
  };

  if (status === "checking") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white px-4">
        <div className="w-full max-w-md rounded-2xl bg-slate-900/90 border border-slate-800 p-8 text-center shadow-2xl">
          <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Loader2 size={28} className="animate-spin" />
          </div>
          <h2 className="text-lg font-bold tracking-tight text-slate-100">
            Đang kiểm tra quyền truy cập Quản trị...
          </h2>
          <p className="mt-2 text-xs text-slate-400 leading-relaxed">
            Hệ thống đang xác thực phiên đăng nhập và phân quyền tài khoản của bạn trước khi mở cổng Quản trị Nhà Xinh.
          </p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <Navigate to={`/dang-nhap?redirect=${redirectTarget}`} replace />;
  }

  if (status === "locked") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white px-4">
        <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-rose-500/30 p-8 text-center shadow-2xl">
          <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <Lock size={32} />
          </div>
          <span className="inline-block px-3 py-1 rounded-full bg-rose-500/15 text-rose-300 text-[11px] font-bold uppercase tracking-wider mb-3">
            Tài khoản bị khóa
          </span>
          <h1 className="text-xl font-bold text-white">
            Tài khoản của bạn hiện không thể truy cập
          </h1>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Tài khoản <strong className="text-white">{session?.email || session?.username}</strong> đang ở trạng thái{" "}
            <code className="text-rose-300 font-mono">{session?.status}</code>. Vui lòng liên hệ Quản trị viên cấp cao để được hỗ trợ.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => navigate("/", { replace: true })}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              <ArrowLeft size={16} />
              Về trang chủ
            </button>
            <button
              type="button"
              onClick={handleSwitchToAdminAccount}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <LogIn size={16} />
              Đăng nhập tài khoản khác
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === "forbidden") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white px-4">
        <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-amber-500/30 p-8 text-center shadow-2xl">
          <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <ShieldAlert size={34} />
          </div>
          <span className="inline-block px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 text-[11px] font-bold uppercase tracking-wider mb-3">
            403 • Từ chối truy cập
          </span>
          <h1 className="text-xl font-bold text-white">
            Bạn không có quyền truy cập trang Quản trị
          </h1>
          <p className="mt-2.5 text-sm text-slate-300 leading-relaxed">
            Tài khoản hiện tại{" "}
            <strong className="text-white">
              {session?.fullName || session?.username || "Khách hàng"}
            </strong>{" "}
            {session?.email ? `(${session.email})` : ""} là tài khoản khách hàng và không có quyền Quản trị viên hoặc Nhân viên vận hành.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => navigate("/", { replace: true })}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              <ArrowLeft size={16} />
              Về trang chủ Nhà Xinh
            </button>
            <button
              type="button"
              onClick={handleSwitchToAdminAccount}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#B86B49] hover:bg-[#A35C3A] text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <LogIn size={16} />
              Đăng nhập bằng tài khoản Quản trị
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <AdminPortal session={session} />;
}
