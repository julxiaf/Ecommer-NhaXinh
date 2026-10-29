import { useState, useCallback } from "react";
import type { Product } from "../components/ProductCard";

export interface CartItem {
  product: Product;
  quantity: number;
  qty: number;
  selectedColor?: string;
  variantId?: number;
  variantName?: string;
  variantSku?: string;
}

const CART_KEY = "nhaxinh_cart";
const WISH_KEY = "nhaxinh_wishlist";
const USER_KEY = "nhaxinh_user";

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON<T>(key: string, data: T) {
  localStorage.setItem(key, JSON.stringify(data));
}

export interface UserInfo {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  avatar?: string;
}

/**
 * Kiểm tra xem sản phẩm có phải hàng đặt trước (Pre-order) hay không
 */
export function isPreorderItem(product?: Product | null): boolean {
  if (!product) return false;
  if (product.isPreorder === true) return true;
  if (product.stockStatus === "PRE_ORDER") return true;
  // Nếu số lượng tồn kho được định nghĩa rõ ràng <= 0 hoặc inStock = false
  if (product.totalStock !== undefined && product.totalStock <= 0) return true;
  if (product.inStock === false) return true;
  return false;
}

/**
 * Lấy số lượng hàng tối đa có sẵn trong kho của sản phẩm hoặc biến thể
 */
export function getMaxStock(product: Product, variantId?: number): number {
  if (isPreorderItem(product)) {
    return 999; // Hàng đặt trước không giới hạn số lượng chọn, nhưng sẽ chuyển qua Zalo/FB
  }
  if (variantId && product.variants && product.variants.length > 0) {
    const v = product.variants.find((item) => item.id === variantId);
    if (v?.stock?.availableQuantity !== undefined) {
      return v.stock.availableQuantity;
    }
  }
  if (product.totalStock !== undefined && product.totalStock !== null) {
    return Math.max(0, product.totalStock);
  }
  return 99; // Mặc định nếu chưa nạp được tồn kho
}

/**
 * Custom hook quản lý state toàn cục: giỏ hàng, wishlist, user.
 * Dữ liệu được persist vào localStorage.
 */
export function useStore() {
  const [cart, setCart] = useState<CartItem[]>(() => loadJSON(CART_KEY, []));
  const [wishlist, setWishlist] = useState<Product[]>(() => loadJSON(WISH_KEY, []));
  const [user, setUser] = useState<UserInfo | null>(() => loadJSON(USER_KEY, null));

  // ── Cart ──
  const addToCart = useCallback(
    (
      product: Product,
      qty = 1,
      variant?: { id: number; name?: string; sku?: string; price?: number }
    ): { success: boolean; message?: string; finalQty: number; maxStock: number } => {
      const resolvedVariantId =
        variant?.id ?? product.variantId ?? product.variants?.[0]?.id;
      const maxStock = getMaxStock(product, resolvedVariantId);
      const isPre = isPreorderItem(product);

      let result = {
        success: true,
        message: undefined as string | undefined,
        finalQty: qty,
        maxStock,
      };

      setCart((prev) => {
        const resolvedVariantName = variant?.name;
        const resolvedVariantSku = variant?.sku;
        const resolvedPrice = variant?.price ?? product.price;

        const getItemKey = (item: CartItem) => {
          const vId = item.variantId ?? item.product.variantId;
          return vId ? `${item.product.id}_${vId}` : `${item.product.id}`;
        };

        const targetKey = resolvedVariantId
          ? `${product.id}_${resolvedVariantId}`
          : `${product.id}`;

        const idx = prev.findIndex((i) => getItemKey(i) === targetKey);
        let next: CartItem[];

        if (idx >= 0) {
          const currentQty = prev[idx].quantity;
          let newQty = currentQty + qty;

          if (!isPre && newQty > maxStock) {
            newQty = Math.max(currentQty, maxStock);
            result = {
              success: false,
              message: `Kho chỉ còn ${maxStock} sản phẩm có sẵn. Đã điều chỉnh số lượng trong giỏ về ${newQty}.`,
              finalQty: newQty,
              maxStock,
            };
          } else {
            result = {
              success: true,
              message: "Đã thêm vào giỏ hàng thành công!",
              finalQty: newQty,
              maxStock,
            };
          }

          next = prev.map((item, i) =>
            i === idx
              ? {
                  ...item,
                  quantity: newQty,
                  qty: newQty,
                }
              : item
          );
        } else {
          let initialQty = qty;
          if (!isPre && initialQty > maxStock) {
            initialQty = maxStock;
            result = {
              success: false,
              message: `Số lượng chọn vượt quá tồn kho (Còn ${maxStock} sản phẩm). Đã điều chỉnh về ${maxStock}.`,
              finalQty: initialQty,
              maxStock,
            };
          } else {
            result = {
              success: true,
              message: "Đã thêm vào giỏ hàng thành công!",
              finalQty: initialQty,
              maxStock,
            };
          }

          const finalProduct: Product = {
            ...product,
            price: resolvedPrice,
            name:
              resolvedVariantName && !product.name.includes(resolvedVariantName)
                ? `${product.name} (${resolvedVariantName})`
                : product.name,
            variantId: resolvedVariantId,
          };

          next = [
            ...prev,
            {
              product: finalProduct,
              quantity: initialQty,
              qty: initialQty,
              variantId: resolvedVariantId,
              variantName: resolvedVariantName,
              variantSku: resolvedVariantSku,
            },
          ];
        }
        saveJSON(CART_KEY, next);
        return next;
      });

      return result;
    },
    []
  );

  const removeFromCart = useCallback((productId: number, variantId?: number) => {
    setCart((prev) => {
      const next = prev.filter((i) => {
        if (variantId !== undefined) {
          const itemVId = i.variantId ?? i.product.variantId;
          return !(i.product.id === productId && itemVId === variantId);
        }
        return i.product.id !== productId;
      });
      saveJSON(CART_KEY, next);
      return next;
    });
  }, []);

  const updateCartQty = useCallback(
    (
      productId: number,
      quantity: number,
      variantId?: number
    ): { success: boolean; maxStock: number; finalQty: number; message?: string } => {
      if (quantity < 1) return { success: false, maxStock: 1, finalQty: 1 };

      let result = {
        success: true,
        maxStock: 99,
        finalQty: quantity,
        message: undefined as string | undefined,
      };

      setCart((prev) => {
        const next = prev.map((i) => {
          const itemVId = i.variantId ?? i.product.variantId;
          const match =
            variantId !== undefined
              ? i.product.id === productId && itemVId === variantId
              : i.product.id === productId;

          if (!match) return i;

          const max = getMaxStock(i.product, itemVId);
          const isPre = isPreorderItem(i.product);

          if (!isPre && quantity > max) {
            result = {
              success: false,
              maxStock: max,
              finalQty: max,
              message: `Số lượng vượt quá số lượng còn lại trong kho (Chỉ còn ${max} sản phẩm).`,
            };
            return { ...i, quantity: max, qty: max };
          }

          result = {
            success: true,
            maxStock: max,
            finalQty: quantity,
            message: undefined,
          };
          return { ...i, quantity, qty: quantity };
        });
        saveJSON(CART_KEY, next);
        return next;
      });

      return result;
    },
    []
  );

  const clearCart = useCallback(() => {
    setCart([]);
    saveJSON(CART_KEY, []);
  }, []);

  const cartCount = cart.reduce((s, i) => s + (i.quantity || 1), 0);
  const cartTotal = cart.reduce(
    (s, i) => s + i.product.price * (i.quantity || 1),
    0
  );

  const hasPreorderItems = cart.some((i) => isPreorderItem(i.product));
  const preorderItems = cart.filter((i) => isPreorderItem(i.product));

  // ── Wishlist ──
  const toggleWishlist = useCallback((product: Product) => {
    setWishlist((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      const next = exists
        ? prev.filter((p) => p.id !== product.id)
        : [...prev, product];
      saveJSON(WISH_KEY, next);
      return next;
    });
  }, []);

  const removeFromWishlist = useCallback((productId: number) => {
    setWishlist((prev) => {
      const next = prev.filter((p) => p.id !== productId);
      saveJSON(WISH_KEY, next);
      return next;
    });
  }, []);

  const clearWishlist = useCallback(() => {
    setWishlist([]);
    saveJSON(WISH_KEY, []);
  }, []);

  const isWishlisted = useCallback(
    (productId: number) => wishlist.some((p) => p.id === productId),
    [wishlist]
  );

  // ── User ──
  const login = useCallback((info: UserInfo) => {
    setUser(info);
    saveJSON(USER_KEY, info);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(USER_KEY);
  }, []);

  const updateProfile = useCallback((updates: Partial<UserInfo>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...updates };
      saveJSON(USER_KEY, next);
      return next;
    });
  }, []);

  return {
    // Cart
    cart,
    cartCount,
    cartTotal,
    hasPreorderItems,
    preorderItems,
    addToCart,
    removeFromCart,
    updateCartQty,
    updateQty: updateCartQty,
    clearCart,
    // Wishlist
    wishlist,
    toggleWishlist,
    removeFromWishlist,
    clearWishlist,
    isWishlisted,
    // User
    user,
    login,
    logout,
    updateProfile,
  };
}
