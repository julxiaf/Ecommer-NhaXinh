/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useMemo, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useStore, isPreorderItem, getMaxStock } from "./useStore";
import type { Product, ProductVariant } from "../types/catalog";
import { productService, DEFAULT_PLACEHOLDER_IMAGE } from "../services/productService";
import { type Review } from "../util/CONSTRAINT";

export const SPEC_LABEL_MAP: Record<string, string> = {
  bao_hanh: "Bảo hành",
  chat_lieu: "Chất liệu",
  kich_thuoc: "Kích thước",
  so_cho: "Số chỗ ngồi",
  mau_sac: "Màu sắc",
  mau: "Màu sắc",
  xuat_xu: "Xuất xứ",
  trong_luong: "Trọng lượng",
  phong_cach: "Phong cách",
  khung: "Khung sườn",
  dem_mut: "Đệm mút",
};

export function formatSpecLabel(rawKey: string): string {
  const norm = rawKey.trim().toLowerCase();
  if (SPEC_LABEL_MAP[norm]) return SPEC_LABEL_MAP[norm];
  return rawKey.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export function parseJsonSpecs(raw?: string | Record<string, unknown> | null): Record<string, string> | null {
  if (!raw) return null;
  if (typeof raw === "object") return raw as Record<string, string>;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) {
      return parsed;
    }
  } catch {
    // Không phải JSON
  }
  return null;
}

export function useProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const {
    cartCount,
    wishlist,
    addToCart,
    toggleWishlist,
    isWishlisted,
    user,
  } = useStore();

  const [loading, setLoading] = useState<boolean>(true);
  const [product, setProduct] = useState<Product>({
    id: 0,
    name: "Đang tải thông tin sản phẩm...",
    slug: slug || "",
    price: 0,
    image: "",
    category: "",
    totalStock: 0,
  });

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [stockMessage, setStockMessage] = useState<string | null>(null);
  const [qty, setQty] = useState<number>(1);
  const [mainImage, setMainImage] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"desc" | "specs" | "reviews">("desc");
  const [reviews, setReviews] = useState<Review[]>([]);

  // Tải thông tin sản phẩm theo slug & sản phẩm liên quan
  useEffect(() => {
    if (!slug) return;
    let active = true;
    setLoading(true);

    productService.getProductBySlug(slug).then((prod) => {
      if (!active || !prod) {
        setLoading(false);
        return;
      }
      setProduct(prod);

      if (prod.variants && prod.variants.length > 0) {
        const firstVariant = prod.variants[0];
        setSelectedVariant(firstVariant);
        const initStock = getMaxStock(prod, firstVariant.id);
        const isPre =
          Boolean(firstVariant.stock?.isPreorder) ||
          firstVariant.stock?.stockStatus === "PRE_ORDER" ||
          isPreorderItem(prod, firstVariant.id);
        if (!isPre && initStock <= 0) {
          setQty(0);
        } else {
          setQty(1);
        }
      } else {
        setSelectedVariant(null);
        const initStock = getMaxStock(prod);
        const isPre = isPreorderItem(prod);
        if (!isPre && initStock <= 0) {
          setQty(0);
        } else {
          setQty(1);
        }
      }

      setLoading(false);

      // Lấy sản phẩm tương tự cùng danh mục
      productService.getProductsFromApi({ category: prod.category, size: 8 }).then((all) => {
        if (!active) return;
        const rel = all.filter((p) => p.id !== prod.id).slice(0, 4);
        setRelatedProducts(rel);
      });
    });

    return () => {
      active = false;
    };
  }, [slug]);

  // Danh sách hình ảnh gallery: ưu tiên ảnh của variant đang chọn, kèm toàn bộ ảnh IMAGE từ media backend
  const images = useMemo(() => {
    const list: string[] = [];

    // 1. Ảnh của variant đang được chọn (nếu có)
    if (selectedVariant?.image) {
      list.push(selectedVariant.image);
    }

    // 2. Ảnh từ media backend (chỉ lấy loại IMAGE)
    if (product.media && product.media.length > 0) {
      const mediaImgs = product.media
        .filter((m) => (m.mediaType === "IMAGE" || !m.mediaType) && m.mediaUrl)
        .map((m) => productService.getMediaImageUrl(m));

      mediaImgs.forEach((url) => {
        if (!list.includes(url)) list.push(url);
      });
    }

    // 3. Ảnh chính & ảnh phụ của sản phẩm
    if (product.image && !list.includes(product.image)) {
      list.push(product.image);
    }
    if (product.image2 && !list.includes(product.image2)) {
      list.push(product.image2);
    }

    return list.length > 0
      ? list
      : [DEFAULT_PLACEHOLDER_IMAGE];
  }, [product, selectedVariant]);

  const wishlisted = isWishlisted(product.id);

  const isPreorder =
    Boolean(selectedVariant?.stock?.isPreorder) ||
    selectedVariant?.stock?.stockStatus === "PRE_ORDER" ||
    isPreorderItem(product, selectedVariant?.id);

  const availableStock = getMaxStock(product, selectedVariant?.id);

  const currentPrice = selectedVariant?.price ?? product.price;
  const currentOriginalPrice = selectedVariant?.compareAtPrice ?? product.originalPrice;

  // Xử lý khi click chọn biến thể: đổi giá, ảnh và tự động đồng bộ số lượng theo tồn kho của biến thể đó
  const handleSelectVariant = useCallback(
    (v: ProductVariant) => {
      setSelectedVariant(v);
      setMainImage(0);

      const vStock = getMaxStock(product, v.id);
      const vIsPre =
        Boolean(v.stock?.isPreorder) ||
        v.stock?.stockStatus === "PRE_ORDER" ||
        isPreorderItem(product, v.id);

      if (!vIsPre) {
        if (vStock <= 0) {
          setQty(0);
          setStockMessage(null);
        } else if (qty > vStock) {
          setQty(vStock);
          setStockMessage(null);
        } else if (qty <= 0) {
          setQty(1);
          setStockMessage(null);
        } else {
          setStockMessage(null);
        }
      } else {
        if (qty <= 0) setQty(1);
        setStockMessage(null);
      }
    },
    [product, qty]
  );

  const handleIncreaseQty = useCallback(() => {
    if (!isPreorder && qty >= availableStock) {
      return;
    }
    setStockMessage(null);
    setQty((q) => q + 1);
  }, [isPreorder, qty, availableStock]);

  const handleDecreaseQty = useCallback(() => {
    setStockMessage(null);
    setQty((q) => Math.max(availableStock > 0 ? 1 : 0, q - 1));
  }, [availableStock]);

  const handleQuantityChange = useCallback(
    (rawVal: number) => {
      if (isNaN(rawVal)) return;
      if (rawVal <= 0) {
        setQty(availableStock > 0 ? 1 : 0);
        setStockMessage(null);
      } else if (!isPreorder && rawVal > availableStock) {
        setQty(availableStock);
        setStockMessage(null);
      } else {
        setQty(rawVal);
        setStockMessage(null);
      }
    },
    [availableStock, isPreorder]
  );

  const handleAddToCart = useCallback((): boolean => {
    if (!isPreorder && availableStock <= 0) {
      setStockMessage(
        `Phiên bản "${selectedVariant?.name || product.name}" hiện tại đã hết hàng sẵn. Bạn có thể liên hệ Zalo/FB để đặt trước.`
      );
      return false;
    }
    if (!isPreorder && qty > availableStock) {
      setQty(availableStock);
      setStockMessage(
        `Số lượng yêu cầu vượt quá tồn kho. Đã tự động điều chỉnh về tối đa ${availableStock} sản phẩm.`
      );
      return false;
    }
    if (!isPreorder && qty <= 0) {
      setStockMessage("Vui lòng chọn số lượng tối thiểu là 1 sản phẩm.");
      return false;
    }

    const productToAdd: Product = selectedVariant
      ? {
          ...product,
          price: selectedVariant.price,
          originalPrice: selectedVariant.compareAtPrice ?? product.originalPrice,
          name: `${product.name} (${selectedVariant.name})`,
          variantId: selectedVariant.id,
          isPreorder,
          stockStatus: isPreorder ? "PRE_ORDER" : "IN_STOCK",
        }
      : {
          ...product,
          variantId: product.variants?.[0]?.id,
          isPreorder,
          stockStatus: isPreorder ? "PRE_ORDER" : "IN_STOCK",
        };

    const res = addToCart(productToAdd, qty, selectedVariant || undefined);
    if (!res.success && res.message) {
      setStockMessage(res.message);
      return false;
    }
    setStockMessage(null);

    // Hiển thị feedback
    const el = document.getElementById("pd-added");
    if (el) {
      el.textContent =
        res.message ||
        (isPreorder
          ? "✓ Đã lưu sản phẩm đặt trước vào giỏ hàng!"
          : "✓ Đã thêm vào giỏ hàng!");
      el.classList.add("show");
      setTimeout(() => el.classList.remove("show"), 2500);
    }
    return true;
  }, [isPreorder, availableStock, selectedVariant, product, qty, addToCart]);

  const handleBuyNow = useCallback(() => {
    const added = handleAddToCart();
    if (added) {
      navigate("/thanh-toan");
    }
  }, [handleAddToCart, navigate]);

  const handleAddReview = useCallback(
    (newRev: { rating: number; content: string; author: string }) => {
      const item: Review = {
        id: Date.now(),
        author: newRev.author,
        rating: newRev.rating,
        date: new Date().toLocaleDateString("vi-VN"),
        content: newRev.content,
        helpful: 0,
      };
      setReviews((prev) => [item, ...prev]);
    },
    []
  );

  return {
    loading,
    product,
    selectedVariant,
    relatedProducts,
    stockMessage,
    qty,
    mainImage,
    activeTab,
    reviews,
    images,
    isPreorder,
    availableStock,
    currentPrice,
    currentOriginalPrice,
    wishlisted,
    user,
    cartCount,
    wishlist,
    setMainImage,
    setActiveTab,
    handleSelectVariant,
    handleIncreaseQty,
    handleDecreaseQty,
    handleQuantityChange,
    handleAddToCart,
    handleBuyNow,
    handleAddReview,
    toggleWishlist,
    addToCart,
    isWishlisted,
  };
}

