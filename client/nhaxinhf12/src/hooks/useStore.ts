import { useCallback } from "react";
import {
  useCart,
  type CartItem,
  getCartItemKey,
  isPreorderItem,
  getMaxStock,
} from "./useCart";
import { useWishlistState } from "./useWishlistState";
import { useUserSession, type UserInfo } from "./useUserSession";

export type { CartItem };
export type { UserInfo };
export { getCartItemKey, isPreorderItem, getMaxStock };
export { useCart } from "./useCart";
export { useWishlistState } from "./useWishlistState";
export { useUserSession } from "./useUserSession";

/**
 * Composite store hook kết hợp các hook chuyên biệt:
 * - useCart: Quản lý giỏ hàng, đồng bộ API MySQL, chọn sản phẩm thanh toán
 * - useWishlistState: Quản lý danh sách sản phẩm yêu thích
 * - useUserSession: Quản lý phiên đăng nhập và thông tin tài khoản người dùng
 */
export function useStore() {
  const cartState = useCart();
  const wishlistState = useWishlistState();
  const userSession = useUserSession();

  const { syncCartOnLogin, clearCartOnLogout } = cartState;
  const { login: sessionLogin, logout: sessionLogout } = userSession;

  const login = useCallback(
    async (info: UserInfo) => {
      await sessionLogin(info);
      await syncCartOnLogin();
    },
    [sessionLogin, syncCartOnLogin]
  );

  const logout = useCallback(() => {
    sessionLogout();
    clearCartOnLogout();
  }, [sessionLogout, clearCartOnLogout]);

  return {
    ...cartState,
    ...wishlistState,
    ...userSession,
    login,
    logout,
  };
}
