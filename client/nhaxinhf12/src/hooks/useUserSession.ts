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

// Bộ nhớ RAM chia sẻ trạng thái hiển thị người dùng giữa các component (KHÔNG lưu nhaxinh_user vào localStorage/sessionStorage)
let memoryUserCache: UserInfo | null = null;
const USER_UPDATED_EVENT = "nhaxinh:user_updated";

function updateMemoryUser(next: UserInfo | null, broadcast = true): void {
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
        if (!e.newValue) {
          memoryUserCache = null;
          setUser(null);
        } else {
          lastVerifiedAt = 0;
          void userService.verifySession().then((session) => {
            if (session && session.authenticated) {
              const synced: UserInfo = {
                fullName: session.fullName || session.email || "Khách hàng",
                email: session.email || "",
                phone: session.phone || "",
                address: memoryUserCache?.address || "",
                avatar: memoryUserCache?.avatar,
              };
              updateMemoryUser(synced, true);
            }
          });
        }
      }
    };

    window.addEventListener("nhaxinh:session_expired", handleSessionExpired);
    window.addEventListener(USER_UPDATED_EVENT, handleUserUpdated);
    window.addEventListener("storage", handleStorageChange);

    // Xác thực với backend khi mới tải trang hoặc đã qua thời gian cooldown
    const shouldVerify =
      !memoryUserCache || Date.now() - lastVerifiedAt > VERIFY_COOLDOWN_MS;
    if (shouldVerify) {
      lastVerifiedAt = Date.now();
      void userService.verifySession().then((session) => {
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
