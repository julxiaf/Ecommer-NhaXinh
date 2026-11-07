import { useState, useCallback } from "react";
import type { Product } from "../components/ProductCard";

export const WISH_KEY = "nhaxinh_wishlist";

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

/**
 * Hook quản lý trạng thái danh sách yêu thích (Wishlist)
 */
export function useWishlistState() {
  const [wishlist, setWishlist] = useState<Product[]>(() => loadJSON(WISH_KEY, []));

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

  return {
    wishlist,
    setWishlist,
    toggleWishlist,
    removeFromWishlist,
    clearWishlist,
    isWishlisted,
  };
}

