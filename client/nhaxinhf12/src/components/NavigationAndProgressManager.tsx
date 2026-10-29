import { useEffect, useState, useRef, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Loader2, AlertCircle, RefreshCw, X } from "lucide-react";
import { apiTracker } from "../services/apiProgressTracker";

interface NavigationAndProgressManagerProps {
  children: ReactNode;
}

export default function NavigationAndProgressManager({ children }: NavigationAndProgressManagerProps) {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [apiState, setApiState] = useState(apiTracker.getState());
  const [dismissSlowNotice, setDismissSlowNotice] = useState(false);
  const prevPathRef = useRef(location.pathname);

  // Khởi tạo interceptor bắt request API toàn cục
  useEffect(() => {
    apiTracker.initGlobalFetchTracker();
    const unsubscribe = apiTracker.subscribe(() => {
      setApiState(apiTracker.getState());
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Xử lý thanh tiến trình khi API đang gọi
  useEffect(() => {
    if (apiState.isLoading) {
      setDismissSlowNotice(false);
      setIsVisible(true);
      setProgress((prev) => (prev < 40 ? 55 : Math.min(prev + 15, 88)));
    } else {
      // Khi API hoàn tất
      setProgress(100);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setProgress(0);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [apiState.isLoading]);

  // Xử lý chuyển đổi URL: Scroll to top & kích hoạt thanh tiến trình mượt mà
  useEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      prevPathRef.current = location.pathname;
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });

      // Kích hoạt thanh tiến trình chuyển trang mượt mà
      setIsVisible(true);
      setProgress(30);
      const t1 = setTimeout(() => setProgress(75), 100);
      const t2 = setTimeout(() => setProgress(100), 280);
      const t3 = setTimeout(() => {
        setIsVisible(false);
        setProgress(0);
      }, 450);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [location.pathname, location.search]);

  return (
    <>
      {/* ── Top Progress Bar (Thanh tiến trình mạ vàng Nhà Xinh) ── */}
      {isVisible && (
        <div
          className="global-route-progressbar"
          style={{
            width: `${progress}%`,
            opacity: progress === 100 ? 0 : 1,
          }}
        />
      )}

      {/* ── Thông báo tiến trình khi API phản hồi lâu (> 2.5s hoặc > 8s) ── */}
      {apiState.isLoading && apiState.isSlow && !dismissSlowNotice && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-999999 flex items-start sm:items-center gap-3.5 bg-white/95 backdrop-blur-md px-4 py-3.5 rounded-2xl border border-amber-200/90 shadow-2xl max-w-md animate-in fade-in slide-in-from-bottom-5 text-slate-800"
        >
          <div className="relative flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
            {apiState.isVerySlow ? (
              <AlertCircle size={22} className="text-amber-600 animate-pulse" />
            ) : (
              <Loader2 size={22} className="text-amber-600 animate-spin" />
            )}
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-500 animate-ping" />
          </div>

          <div className="text-xs space-y-0.5 flex-1 pr-1">
            <p className="font-bold text-slate-900 flex items-center gap-1.5">
              {apiState.isVerySlow
                ? "Máy chủ đang xử lý lâu hơn dự kiến..."
                : "Đang tải dữ liệu từ hệ thống..."}
            </p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {apiState.isVerySlow
                ? "Kết nối mạng hoặc máy chủ đang phản hồi chậm. Bạn có thể đợi trong giây lát hoặc làm mới lại trang."
                : "Hệ thống đang đồng bộ dữ liệu sản phẩm & đơn hàng, vui lòng kiên nhẫn chờ trong giây lát."}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {apiState.isVerySlow && (
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all shadow-sm"
                title="Làm mới lại trang"
              >
                <RefreshCw size={12} /> Tải lại
              </button>
            )}
            <button
              type="button"
              onClick={() => setDismissSlowNotice(true)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              title="Đóng thông báo"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ── Khung chuyển đổi URL với Animation mượt mà ── */}
      <div key={location.pathname} className="route-page-container route-page-enter">
        {children}
      </div>
    </>
  );
}

