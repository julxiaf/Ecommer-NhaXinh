import { useState, useMemo, useEffect } from "react";
import type { Product } from "../components/ProductCard";
import { productService } from "../services/productService";
import { usePagination } from "./usePagination";

export type WishlistPriceFilter = "all" | "under10" | "10to30" | "over30";
export type WishlistPromoFilter = "all" | "sale" | "new";
export type WishlistSortOption =
  | "default"
  | "price-asc"
  | "price-desc"
  | "name-asc"
  | "discount-desc";

interface UseWishlistParams {
  wishlist: Product[];
  onAddToCart: (product: Product) => void;
  onToggleWishlist: (product: Product) => void;
}

export function useWishlist({
  wishlist,
  onAddToCart,
  onToggleWishlist,
}: UseWishlistParams) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [priceFilter, setPriceFilter] = useState<WishlistPriceFilter>("all");
  const [promoFilter, setPromoFilter] = useState<WishlistPromoFilter>("all");
  const [sortBy, setSortBy] = useState<WishlistSortOption>("default");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  useEffect(() => {
    let active = true;
    productService
      .getProducts()
      .then((all) => {
        if (!active) return;
        const wishIds = new Set(wishlist.map((w) => w.id));
        const suggestions = all.filter((p) => !wishIds.has(p.id)).slice(0, 4);
        setRecommendedProducts(suggestions);
      })
      .catch(() => {
        // Ignore error
      });
    return () => {
      active = false;
    };
  }, [wishlist]);

  // Đồng bộ selectedIds khi wishlist thay đổi
  useEffect(() => {
    const wishIds = new Set(wishlist.map((w) => w.id));
    setSelectedIds((prev) => prev.filter((id) => wishIds.has(id)));
  }, [wishlist]);

  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    wishlist.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [wishlist]);

  const stats = useMemo(() => {
    const totalCount = wishlist.length;
    const totalValue = wishlist.reduce((sum, p) => sum + p.price, 0);
    const totalSavings = wishlist.reduce((sum, p) => {
      if (p.originalPrice && p.originalPrice > p.price) {
        return sum + (p.originalPrice - p.price);
      }
      return sum;
    }, 0);
    const discountedCount = wishlist.filter(
      (p) =>
        (p.discount && p.discount > 0) ||
        (p.originalPrice && p.originalPrice > p.price)
    ).length;
    return { totalCount, totalValue, totalSavings, discountedCount };
  }, [wishlist]);

  const filteredWishlist = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = wishlist.filter((p) => {
      if (q) {
        const matchName = p.name.toLowerCase().includes(q);
        const matchCat = (p.category || "").toLowerCase().includes(q);
        const matchSpec = (
          p.specifications ||
          p.shortDescription ||
          p.brand ||
          ""
        )
          .toLowerCase()
          .includes(q);
        if (!matchName && !matchCat && !matchSpec) return false;
      }
      if (selectedCategory !== "all" && p.category !== selectedCategory) {
        return false;
      }
      if (priceFilter === "under10" && p.price >= 10_000_000) return false;
      if (
        priceFilter === "10to30" &&
        (p.price < 10_000_000 || p.price > 30_000_000)
      ) {
        return false;
      }
      if (priceFilter === "over30" && p.price <= 30_000_000) return false;

      if (
        promoFilter === "sale" &&
        !(p.discount && p.discount > 0) &&
        !(p.originalPrice && p.originalPrice > p.price)
      ) {
        return false;
      }
      if (promoFilter === "new" && !p.isNew) return false;

      return true;
    });

    const sorted = [...list];
    if (sortBy === "price-asc") {
      sorted.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-desc") {
      sorted.sort((a, b) => b.price - a.price);
    } else if (sortBy === "name-asc") {
      sorted.sort((a, b) => a.name.localeCompare(b.name, "vi"));
    } else if (sortBy === "discount-desc") {
      sorted.sort((a, b) => (b.discount || 0) - (a.discount || 0));
    }

    return sorted;
  }, [
    wishlist,
    searchQuery,
    selectedCategory,
    priceFilter,
    promoFilter,
    sortBy,
  ]);

  const pagination = usePagination(filteredWishlist, 8, [
    searchQuery,
    selectedCategory,
    priceFilter,
    promoFilter,
    sortBy,
  ]);

  const toggleSelectItem = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllFiltered = () => {
    const filteredIds = filteredWishlist.map((p) => p.id);
    const allSelected =
      filteredIds.length > 0 &&
      filteredIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      const merged = new Set([...selectedIds, ...filteredIds]);
      setSelectedIds(Array.from(merged));
    }
  };

  const handleAddSingleToCart = (product: Product) => {
    onAddToCart(product);
    showToast(`Đã thêm "${product.name}" vào giỏ hàng!`);
  };

  const handleAddAllToCart = () => {
    const targetList =
      selectedIds.length > 0
        ? wishlist.filter((p) => selectedIds.includes(p.id))
        : filteredWishlist;
    if (targetList.length === 0) return;
    targetList.forEach((p) => onAddToCart(p));
    showToast(`Đã thêm ${targetList.length} sản phẩm yêu thích vào giỏ hàng!`);
  };

  const handleRemoveSingle = (product: Product) => {
    onToggleWishlist(product);
    showToast(`Đã xóa "${product.name}" khỏi danh sách yêu thích.`);
  };

  const handleRemoveSelected = () => {
    if (selectedIds.length === 0) return;
    const targets = wishlist.filter((p) => selectedIds.includes(p.id));
    if (
      confirm(
        `Bạn có chắc chắn muốn xóa ${targets.length} sản phẩm đã chọn khỏi danh sách yêu thích?`
      )
    ) {
      targets.forEach((p) => onToggleWishlist(p));
      setSelectedIds([]);
      showToast(`Đã xóa ${targets.length} sản phẩm khỏi danh sách yêu thích.`);
    }
  };

  const handleClearAll = () => {
    if (wishlist.length === 0) return;
    if (
      confirm(
        `Bạn có chắc chắn muốn xóa toàn bộ ${wishlist.length} sản phẩm khỏi danh sách yêu thích?`
      )
    ) {
      wishlist.forEach((p) => onToggleWishlist(p));
      setSelectedIds([]);
      showToast("Đã làm trống danh sách sản phẩm yêu thích.");
    }
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setPriceFilter("all");
    setPromoFilter("all");
    setSortBy("default");
  };

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedCategory !== "all" ||
    priceFilter !== "all" ||
    promoFilter !== "all" ||
    sortBy !== "default";

  return {
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    priceFilter,
    setPriceFilter,
    promoFilter,
    setPromoFilter,
    sortBy,
    setSortBy,
    viewMode,
    setViewMode,
    selectedIds,
    toggleSelectItem,
    toggleSelectAllFiltered,
    availableCategories,
    stats,
    filteredWishlist,
    pagination,
    recommendedProducts,
    toastMessage,
    hasActiveFilters,
    handleAddSingleToCart,
    handleAddAllToCart,
    handleRemoveSingle,
    handleRemoveSelected,
    handleClearAll,
    handleResetFilters,
  };
}
