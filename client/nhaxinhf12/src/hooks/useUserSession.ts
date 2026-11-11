import { useState, useCallback, useEffect } from "react";
import { userService } from "../services/userService";

export interface UserInfo {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  avatar?: string;
}

// Cooldown trong bộ nhớ để tránh gọi verifySession() dồn dập khi nhiều component dùng useStore() cùng mount
let lastVerifiedAt = 0;
const VERIFY_COOLDOWN_MS = 60_000; // 1 phút
let lastKnownToken: string | null = null;
let isVerifyingSession = false;

// Bộ nhớ RAM chia sẻ trạng thái hiển thị người dùng giữa các component (KHÔNG lưu nhaxinh_user vào localStorage/sessionStorage)
let memoryUserCache: UserInfo | null = null;
const USER_UPDATED_EVENT = "nhaxinh:user_updated";

function updateMemoryUser(next: UserInfo | null, broadcast = true): void {
  // Tránh dispatch event lặp lại nếu thông tin user không thay đổi
  if (
    memoryUserCache === next ||
    (memoryUserCache &&
      next &&
      memoryUserCache.email === next.email &&
      memoryUserCache.fullName === next.fullName &&
      memoryUserCache.phone === next.phone &&
      memoryUserCache.address === next.address &&
      memoryUserCache.avatar === next.avatar)
  ) {
    return;
  }

  memoryUserCache = next;
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem("nhaxinh_user");
      sessionStorage.removeItem("nhaxinh_user");
    } catch {
      // ignore
    }
    if (broadcast) {
      window.dispatchEvent(new CustomEvent(USER_UPDATED_EVENT, { detail: next }));
    }
  }
}

/**
 * Hook quản lý phiên người dùng dựa trên JWT token (chỉ chứa id, role, permissions) và xác thực từ Server.
 * Không lưu trữ đối tượng nhaxinh_user trong localStorage/sessionStorage của trình duyệt.
 */
export function useUserSession() {
  const [user, setUser] = useState<UserInfo | null>(() => {
    if (memoryUserCache) return memoryUserCache;
    const cachedSession = userService.getCachedSession();
    if (cachedSession && cachedSession.authenticated) {
      const initial: UserInfo = {
        fullName: cachedSession.fullName || cachedSession.email || "Khách hàng",
        email: cachedSession.email || "",
        phone: cachedSession.phone || "",
        address: "",
      };
      memoryUserCache = initial;
      return initial;
    }
    return null;
  });

  // Lắng nghe các sự kiện hết hạn phiên, đồng bộ trong cùng tab & đa tab, và xác thực với backend
  useEffect(() => {
    const handleSessionExpired = () => {
      memoryUserCache = null;
      setUser(null);
    };

    const handleUserUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<UserInfo | null>;
      setUser(customEvent.detail ?? memoryUserCache);
    };

    // Đồng bộ giữa các tab trình duyệt khi token thay đổi
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "nhaxinh_auth_token") {
        const newToken = e.newValue ? e.newValue.trim() : null;
        const oldToken = e.oldValue ? e.oldValue.trim() : null;

        // Nếu token không thay đổi gì cả -> bỏ qua ngay lập tức để chặn đứt vòng lặp StorageEvent
        if (newToken === oldToken || (newToken && newToken === lastKnownToken)) {
          return;
        }

        lastKnownToken = newToken;

        if (!newToken) {
          // Token bị xóa -> Đăng xuất
          memoryUserCache = null;
          setUser(null);
          return;
        }

        // Bỏ qua nếu vừa xác thực gần đây (cooldown tối thiểu 10 giây giữa các sự kiện storage)
        if (Date.now() - lastVerifiedAt < 10_000 || isVerifyingSession) {
          return;
        }

        lastVerifiedAt = Date.now();
        isVerifyingSession = true;

        void userService
          .verifySession()
          .then((session) => {
            if (session && session.authenticated) {
              const synced: UserInfo = {
                fullName: session.fullName || session.email || "Khách hàng",
                email: session.email || "",
                phone: session.phone || "",
                address: memoryUserCache?.address || "",
                avatar: memoryUserCache?.avatar,
              };
              updateMemoryUser(synced, true);
            } else {
              updateMemoryUser(null, true);
            }
          })
          .catch(() => {
            // ignore network error
          })
          .finally(() => {
            isVerifyingSession = false;
          });
      }
    };

    window.addEventListener("nhaxinh:session_expired", handleSessionExpired);
    window.addEventListener(USER_UPDATED_EVENT, handleUserUpdated);
    window.addEventListener("storage", handleStorageChange);

    // Xác thực với backend khi mới tải trang hoặc đã qua thời gian cooldown
    const currentToken = typeof window !== "undefined" ? localStorage.getItem("nhaxinh_auth_token") : null;
    const hasToken = Boolean(currentToken);
    const shouldVerify =
      !isVerifyingSession &&
      (hasToken ? Date.now() - lastVerifiedAt > VERIFY_COOLDOWN_MS : lastVerifiedAt === 0);

    if (shouldVerify) {
      lastVerifiedAt = Date.now();
      isVerifyingSession = true;
      if (currentToken) {
        lastKnownToken = currentToken.trim();
      }

      void userService
        .verifySession()
        .then((session) => {
          if (!session || !session.authenticated) {
            updateMemoryUser(null, true);
          } else {
            const updated: UserInfo = {
              fullName: session.fullName || memoryUserCache?.fullName || session.email || "Khách hàng",
              email: session.email || memoryUserCache?.email || "",
              phone: session.phone || memoryUserCache?.phone || "",
              address: memoryUserCache?.address || "",
              avatar: memoryUserCache?.avatar,
            };
            updateMemoryUser(updated, true);
          }
        })
        .catch(() => {
          // ignore network error
        })
        .finally(() => {
          isVerifyingSession = false;
        });
    }

    return () => {
      window.removeEventListener("nhaxinh:session_expired", handleSessionExpired);
      window.removeEventListener(USER_UPDATED_EVENT, handleUserUpdated);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const login = useCallback((info: UserInfo) => {
    lastVerifiedAt = Date.now();
    userService.clearLogoutFlag();
    setUser(info);
    updateMemoryUser(info, true);
    return Promise.resolve();
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    updateMemoryUser(null, true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("nhaxinh_user_logged_out", "1");
    }
    // Gọi clearSession(false) để không phát event hết hạn phiên khi chủ động đăng xuất
    userService.clearSession(false);
    localStorage.removeItem("nhaxinh_cart_token");
  }, []);

  const updateProfile = useCallback((updates: Partial<UserInfo>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...updates };
      updateMemoryUser(next, true);
      return next;
    });
  }, []);

  return {
    user,
    setUser,
    login,
    logout,
    updateProfile,
  };
}
