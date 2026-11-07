import { useState, useCallback, useEffect, useMemo } from "react";
import type { Product } from "../components/ProductCard";
import { userService } from "../services/userService";
import { cartService } from "../services/cartService";

export interface CartItem {
  product: Product;
  quantity: number;
  qty: number;
  selectedColor?: string;
  variantId?: number;
  variantName?: string;
  variantSku?: string;
  backendItemId?: number;
}

export const CART_KEY = "nhaxinh_cart";
export const SELECTED_CART_KEY = "nhaxinh_selected_cart_keys";

export function getCartItemKey(item: CartItem): string {
  const vId = item.variantId ?? item.product.variantId;
  return vId ? `${item.product.id}_${vId}` : String(item.product.id);
}

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function notifyCartChange(nextCart: CartItem[]) {
  saveJSON(CART_KEY, nextCart);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("nhaxinh:cart_updated", { detail: nextCart }));
  }
}

/**
 * Kiểm tra xem sản phẩm có phải hàng đặt trước (Pre-order) hay không
 */
export function isPreorderItem(product?: Product | null, variantId?: number): boolean {
  if (!product) return false;
  const productIsPreorder = Boolean(product.isPreorder) || product.stockStatus === "PRE_ORDER";

  // Nếu có biến thể cụ thể, ưu tiên kiểm tra biến thể đó
  if (variantId && product.variants && product.variants.length > 0) {
    const v = product.variants.find((item) => item.id === variantId);
    if (v) {
      if (Boolean(v.stock?.isPreorder) || v.stock?.stockStatus === "PRE_ORDER") {
        return true;
      }
      // Nếu sản phẩm cha là Đặt trước thì biến thể cũng thuộc đơn đặt trước
      if (productIsPreorder) {
        return true;
      }
      return false;
    }
  }
  if (productIsPreorder) return true;
  if (product.variants && product.variants.length > 0) {
    return product.variants.some((v) => Boolean(v.stock?.isPreorder) || v.stock?.stockStatus === "PRE_ORDER");
  }
  return false;
}

/**
 * Lấy số lượng hàng tối đa có sẵn trong kho của sản phẩm hoặc biến thể
 */
export function getMaxStock(product: Product, variantId?: number): number {
  if (variantId && product.variants && product.variants.length > 0) {
    const v = product.variants.find((item) => item.id === variantId);
    if (v?.stock) {
      if (Boolean(v.stock.isPreorder) || v.stock.stockStatus === "PRE_ORDER") {
        return 999;
      }
      if (v.stock.availableQuantity !== undefined && v.stock.availableQuantity !== null) {
        return Math.max(0, Number(v.stock.availableQuantity));
      }
    }
  }
  if (isPreorderItem(product, variantId)) {
    return 999; // Hàng đặt trước không giới hạn số lượng chọn, nhưng sẽ chuyển qua Zalo/FB
  }
  if (product.totalStock !== undefined && product.totalStock !== null) {
    return Math.max(0, product.totalStock);
  }
  if (product.inStock !== false) {
    return 99; // Mặc định nếu còn kinh doanh và chưa có chi tiết tồn kho
  }
  return 0; // Mặc định nếu không có thông tin tồn kho
}

/**
 * Hook chuyên biệt quản lý giỏ hàng, đồng bộ máy chủ và thanh toán
 */
export function useCart() {
  const [cart, setCart] = useState<CartItem[]>(() => loadJSON(CART_KEY, []));

  const [selectedCartKeys, setSelectedCartKeys] = useState<string[]>(() => {
    const saved = loadJSON<string[]>(SELECTED_CART_KEY, []);
    const initialCart = loadJSON<CartItem[]>(CART_KEY, []);
    if (saved && Array.isArray(saved) && saved.length > 0) {
      const currentKeys = new Set(initialCart.map(getCartItemKey));
      const validSaved = saved.filter((k) => currentKeys.has(k));
      if (validSaved.length > 0) return validSaved;
    }
    // Mặc định chọn tất cả sản phẩm hợp lệ trong giỏ (loại bỏ hàng hết hàng)
    return initialCart
      .filter((i) => {
        const vId = i.variantId ?? i.product.variantId;
        return isPreorderItem(i.product, vId) || getMaxStock(i.product, vId) > 0;
      })
      .map(getCartItemKey);
  });

  // Lắng nghe sự kiện cập nhật giỏ hàng từ các component khác để đồng bộ state toàn cục
  useEffect(() => {
    const handleCartUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<CartItem[]>;
      if (customEvent.detail && Array.isArray(customEvent.detail)) {
        setCart(customEvent.detail);
      }
    };
    window.addEventListener("nhaxinh:cart_updated", handleCartUpdated);
    return () => {
      window.removeEventListener("nhaxinh:cart_updated", handleCartUpdated);
    };
  }, []);

  // Tự động khôi phục / nạp lại giỏ hàng từ máy chủ (MySQL Database) khi khởi động hoặc reload
  useEffect(() => {
    const isAuth = !userService.isTokenExpired();
    cartService
      .fetchCart()
      .then((res) => {
        if (res.ok && res.items) {
          if (isAuth) {
            // Khi đã đăng nhập: giỏ hàng trong Database MySQL của tài khoản là chuẩn
            setCart(res.items);
            saveJSON(CART_KEY, res.items);
          } else if (res.items.length > 0) {
            // Khách vãng lai: đồng bộ nếu máy chủ có dữ liệu session
            setCart(res.items);
            saveJSON(CART_KEY, res.items);
          }
        }
      })
      .catch(() => {});
  }, []);

  // ── Thêm sản phẩm vào giỏ hàng ──
  const addToCart = useCallback(
    (
      product: Product,
      qty = 1,
      variant?: { id: number; name?: string; sku?: string; price?: number }
    ): { success: boolean; message?: string; finalQty: number; maxStock: number } => {
      const resolvedVariantId =
        variant?.id ?? product.variantId ?? product.variants?.[0]?.id;
      const maxStock = getMaxStock(product, resolvedVariantId);
      const isPre = isPreorderItem(product, resolvedVariantId);

      // Nếu hết hàng trong kho và không phải hàng đặt trước -> Tuyệt đối không cho thêm vào giỏ hàng!
      if (!isPre && maxStock <= 0) {
        return {
          success: false,
          message: `Sản phẩm "${product.name}" hiện đã tạm hết hàng trong kho, không thể thêm vào giỏ hàng.`,
          finalQty: 0,
          maxStock: 0,
        };
      }

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
            isPreorder: isPre,
            stockStatus: isPre ? "PRE_ORDER" : "IN_STOCK",
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
        notifyCartChange(next);

        // Đảm bảo sản phẩm vừa thêm được chọn vào danh sách thanh toán
        setSelectedCartKeys((oldKeys) => {
          if (oldKeys.includes(targetKey)) return oldKeys;
          const updatedKeys = [...oldKeys, targetKey];
          saveJSON(SELECTED_CART_KEY, updatedKeys);
          return updatedKeys;
        });

        return next;
      });

      // Đồng bộ ngầm lên máy chủ Backend vào Database của tài khoản
      (async () => {
        try {
          let vId = resolvedVariantId;
          if (!vId || vId >= 90000) {
            vId = await cartService.resolveVariantId(product.id, vId);
          }
          if (vId && vId < 90000) {
            const serverRes = await cartService.addItem(vId, qty);
            if (serverRes.ok && serverRes.items && serverRes.items.length > 0) {
              setCart(serverRes.items);
              notifyCartChange(serverRes.items);
            }
          }
        } catch (err) {
          console.warn("[Cart] Lỗi khi đồng bộ giỏ hàng lên Database:", err);
        }
      })();

      return result;
    },
    []
  );

  // ── Xóa sản phẩm khỏi giỏ hàng ──
  const removeFromCart = useCallback((productId: number, variantId?: number) => {
    const targetKey = variantId !== undefined ? `${productId}_${variantId}` : String(productId);
    let targetBackendId: number | undefined;

    setCart((prev) => {
      const targetItem = prev.find((i) => {
        if (variantId !== undefined) {
          const itemVId = i.variantId ?? i.product.variantId;
          return i.product.id === productId && itemVId === variantId;
        }
        return i.product.id === productId;
      });
      targetBackendId = targetItem?.backendItemId;

      const next = prev.filter((i) => {
        if (variantId !== undefined) {
          const itemVId = i.variantId ?? i.product.variantId;
          return !(i.product.id === productId && itemVId === variantId);
        }
        return i.product.id !== productId;
      });
      notifyCartChange(next);
      return next;
    });

    setSelectedCartKeys((prev) => {
      const next = prev.filter((k) => k !== targetKey);
      saveJSON(SELECTED_CART_KEY, next);
      return next;
    });

    // Đồng bộ xóa trên máy chủ Backend
    cartService.removeItem(targetBackendId, variantId).catch(() => {});
  }, []);

  // ── Cập nhật số lượng sản phẩm trong giỏ ──
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

      let targetBackendId: number | undefined;

      setCart((prev) => {
        const next = prev.map((i) => {
          const itemVId = i.variantId ?? i.product.variantId;
          const match =
            variantId !== undefined
              ? i.product.id === productId && itemVId === variantId
              : i.product.id === productId;

          if (!match) return i;

          targetBackendId = i.backendItemId;
          const max = getMaxStock(i.product, itemVId);
          const isPre = isPreorderItem(i.product, itemVId);

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
        notifyCartChange(next);
        return next;
      });

      // Đồng bộ cập nhật số lượng lên máy chủ Backend
      if (targetBackendId) {
        cartService.updateItemQty(targetBackendId, result.finalQty).catch(() => {});
      }

      return result;
    },
    []
  );

  const clearCart = useCallback(() => {
    setCart([]);
    notifyCartChange([]);
    setSelectedCartKeys([]);
    saveJSON(SELECTED_CART_KEY, []);
    cartService.clearCart().catch(() => {});
  }, []);

  // ── Chức năng chọn sản phẩm để đặt hàng / thanh toán ──
  const toggleSelectCartItem = useCallback((key: string) => {
    setSelectedCartKeys((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      saveJSON(SELECTED_CART_KEY, next);
      return next;
    });
  }, []);

  const selectAllCartItems = useCallback(() => {
    const selectableKeys = cart
      .filter((i) => {
        const vId = i.variantId ?? i.product.variantId;
        return isPreorderItem(i.product, vId) || getMaxStock(i.product, vId) > 0;
      })
      .map(getCartItemKey);
    setSelectedCartKeys(selectableKeys);
    saveJSON(SELECTED_CART_KEY, selectableKeys);
  }, [cart]);

  const unselectAllCartItems = useCallback(() => {
    setSelectedCartKeys([]);
    saveJSON(SELECTED_CART_KEY, []);
  }, []);

  const removeSelectedCartItems = useCallback(() => {
    setCart((prev) => {
      const next = prev.filter((i) => !selectedCartKeys.includes(getCartItemKey(i)));
      saveJSON(CART_KEY, next);
      return next;
    });
    setSelectedCartKeys([]);
    saveJSON(SELECTED_CART_KEY, []);
  }, [selectedCartKeys]);

  // Đồng bộ giỏ hàng khi người dùng đăng nhập
  const syncCartOnLogin = useCallback(async () => {
    try {
      const localCart = loadJSON<CartItem[]>(CART_KEY, []);
      const serverItems = await cartService.syncAndMergeLocalCart(localCart);
      if (serverItems && serverItems.length > 0) {
        setCart(serverItems);
        notifyCartChange(serverItems);
      }
    } catch (err) {
      console.warn("[Cart] Lỗi đồng bộ giỏ hàng khi đăng nhập:", err);
    }
  }, []);

  // Dọn dẹp giỏ hàng khi người dùng đăng xuất
  const clearCartOnLogout = useCallback(() => {
    setCart([]);
    notifyCartChange([]);
    setSelectedCartKeys([]);
    saveJSON(SELECTED_CART_KEY, []);
  }, []);

  const selectedCartItems = useMemo(() => {
    return cart.filter((i) => selectedCartKeys.includes(getCartItemKey(i)));
  }, [cart, selectedCartKeys]);

  const selectedCartTotal = useMemo(() => {
    return selectedCartItems.reduce(
      (s, i) => s + i.product.price * (i.quantity || i.qty || 1),
      0
    );
  }, [selectedCartItems]);

  const selectedCartCount = useMemo(() => {
    return selectedCartItems.reduce(
      (s, i) => s + (i.quantity || i.qty || 1),
      0
    );
  }, [selectedCartItems]);

  const hasSelectedPreorder = useMemo(() => {
    return selectedCartItems.some((i) =>
      isPreorderItem(i.product, i.variantId ?? i.product.variantId)
    );
  }, [selectedCartItems]);

  const hasSelectedOutOfStock = useMemo(() => {
    return selectedCartItems.some((i) => {
      const vId = i.variantId ?? i.product.variantId;
      return !isPreorderItem(i.product, vId) && getMaxStock(i.product, vId) <= 0;
    });
  }, [selectedCartItems]);

  const cartCount = cart.reduce((s, i) => s + (i.quantity || 1), 0);
  const cartTotal = cart.reduce(
    (s, i) => s + i.product.price * (i.quantity || 1),
    0
  );

  const hasPreorderItems = cart.some((i) =>
    isPreorderItem(i.product, i.variantId ?? i.product.variantId)
  );
  const preorderItems = cart.filter((i) =>
    isPreorderItem(i.product, i.variantId ?? i.product.variantId)
  );
  const hasOutOfStockItems = cart.some((i) => {
    const vId = i.variantId ?? i.product.variantId;
    return !isPreorderItem(i.product, vId) && getMaxStock(i.product, vId) <= 0;
  });

  return {
    cart,
    setCart,
    cartCount,
    cartTotal,
    hasPreorderItems,
    hasOutOfStockItems,
    preorderItems,
    // Selection for checkout
    selectedCartKeys,
    setSelectedCartKeys,
    selectedCartItems,
    selectedCartTotal,
    selectedCartCount,
    hasSelectedPreorder,
    hasSelectedOutOfStock,
    toggleSelectCartItem,
    selectAllCartItems,
    unselectAllCartItems,
    removeSelectedCartItems,
    addToCart,
    removeFromCart,
    updateCartQty,
    updateQty: updateCartQty,
    clearCart,
    syncCartOnLogin,
    clearCartOnLogout,
  };
}

