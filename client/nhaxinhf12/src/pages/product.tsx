import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ChevronRight,
  Heart,
  ShoppingBag,
  Minus,
  Plus,
  Truck,
  Shield,
  RotateCcw,
  ChevronLeft,
  Clock,
  XCircle,
  Zap,
} from "lucide-react";
import Header from "../components/Headers";
import Footer from "../components/Footer";
import ProductCard from "../components/ProductCard";
import ReviewSection from "../components/ReviewSection";
import { useProductDetail, formatSpecLabel, parseJsonSpecs } from "../hooks/useProductDetail";
import { vnd } from "../util/Constain";

export default function ProductDetailPage() {
  const {
    loading,
    product,
    selectedVariant,
    relatedProducts,
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
  } = useProductDetail();

  // Mobile touch swipe handling for image gallery (Oppo Reno 6Z & iPhone 14 Pro Max)
  const touchStartX = useRef<number | null>(null);
  const thumbContainerRef = useRef<HTMLDivElement | null>(null);
  const thumbWindowStartRef = useRef<number>(0);

  // Tự động trượt dải 5 thumbnail khớp hoàn toàn với khung ảnh chính phía trên
  useEffect(() => {
    const container = thumbContainerRef.current;
    if (!container) return;
    const visibleCount = 5;
    if (mainImage < thumbWindowStartRef.current) {
      thumbWindowStartRef.current = mainImage;
    } else if (mainImage >= thumbWindowStartRef.current + visibleCount) {
      thumbWindowStartRef.current = mainImage - visibleCount + 1;
    }
    const maxStart = Math.max(0, images.length - visibleCount);
    const startIdx = Math.min(thumbWindowStartRef.current, maxStart);
    thumbWindowStartRef.current = startIdx;

    const startThumb = container.children[startIdx] as HTMLElement | undefined;
    if (!startThumb) return;
    container.scrollTo({
      left: startThumb.offsetLeft,
      behavior: "smooth",
    });
  }, [mainImage, images.length]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    if (diff > 45) {
      // Swiped left -> Next image
      setMainImage((i) => (i + 1) % images.length);
    } else if (diff < -45) {
      // Swiped right -> Previous image
      setMainImage((i) => (i - 1 + images.length) % images.length);
    }
    touchStartX.current = null;
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#2c2724] font-sans antialiased flex flex-col justify-between">
      <Header user={user} cartCount={cartCount} wishlistCount={wishlist.length} />

      <main className="w-full max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 flex-1 pb-24 sm:pb-8">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
            <div className="w-10 h-10 border-3 border-[#b86b49] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium">Đang tải thông tin sản phẩm...</p>
          </div>
        ) : (
          <>
            {/* Breadcrumb Navigation - Scrollable on mobile without wrapping clutter */}
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-slate-500 mb-4 sm:mb-6 overflow-x-auto scrollbar-none whitespace-nowrap py-1"
            >
              <Link to="/" className="hover:text-[#b86b49] transition-colors shrink-0">
                Trang chủ
              </Link>
              {/* <ChevronRight size={12} className="text-slate-400 shrink-0" /> */}
              {/* <Link to="/san-pham" className="hover:text-[#b86b49] transition-colors shrink-0">
                Sản phẩm
              </Link> */}
              {product.category && (
                <>
                  <ChevronRight size={12} className="text-slate-400 shrink-0" />
                  <Link
                    to={
                      product.categorySlug
                        ? `/danh-muc/${product.categorySlug}`
                        : `/san-pham?category=${encodeURIComponent(product.category)}`
                    }
                    className="hover:text-[#b86b49] transition-colors cursor-pointer shrink-0"
                  >
                    {product.category}
                  </Link>
                </>
              )}
              <ChevronRight size={12} className="text-slate-400 shrink-0" />
              <span className="text-slate-800 font-semibold truncate max-w-[150px] sm:max-w-xs md:max-w-md">
                {product.name}
              </span>
            </nav>

            {/* Product Details Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 mb-10 sm:mb-16">
              {/* Gallery Column (lg: 7 cols) */}
              <div className="lg:col-span-7 flex flex-col gap-3 sm:gap-4">
                <div
                  className="relative aspect-square sm:aspect-4/3 lg:aspect-16/11 w-full bg-white border border-slate-200/80 shadow-xs overflow-hidden group select-none"
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                >
                  <img
                    src={images[mainImage]}
                    alt={product.name}
                    className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.onerror = null;
                      target.src =
                        "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80";
                    }}
                  />
                  {/* Badges on main image */}
                  <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex flex-col gap-1.5 sm:gap-2 pointer-events-none">
                    {product.isNew && (
                      <span className="bg-[#b86b49] text-white text-[10px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md tracking-wider uppercase shadow-xs">
                        Mới
                      </span>
                    )}
                    {!isPreorder && product.discount && product.discount > 0 ? (
                      <span className="bg-rose-600 text-white text-[10px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md tracking-wider shadow-xs">
                        -{product.discount}%
                      </span>
                    ) : null}
                  </div>

                  {/* Mobile Photo Index Badge */}
                  {images.length > 1 && (
                    <div className="absolute bottom-2.5 right-2.5 sm:bottom-3 sm:right-3 bg-black/60 backdrop-blur-xs text-white text-[10px] sm:text-[11px] font-medium px-2.5 py-0.5 rounded-full select-none pointer-events-none">
                      {mainImage + 1} / {images.length}
                    </div>
                  )}
                </div>

                {/* Thumbnail Navigation */}
                {images.length > 1 && (
                  <div className="relative w-full flex items-center">
                    <button
                      type="button"
                      onClick={() =>
                        setMainImage((i) => (i - 1 + images.length) % images.length)
                      }
                      className="absolute -left-3 sm:-left-3.5 top-1/2 -translate-y-1/2 z-10 w-6 h-10 sm:w-7 sm:h-11 rounded-full bg-white hover:bg-slate-50 text-slate-700 hover:text-[#b86b49] border border-slate-200 shadow-sm flex items-center justify-center transition-all cursor-pointer"
                      aria-label="Thumbnail trước"
                    >
                      <ChevronLeft size={16} strokeWidth={2.2} />
                    </button>

                    <div
                      ref={thumbContainerRef}
                      className="flex gap-2 sm:gap-3 overflow-hidden w-full"
                    >
                      {images.map((img, i) => {
                        const isActive = mainImage === i;
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setMainImage(i)}
                            className={`relative w-[calc((100%-2rem)/5)] sm:w-[calc((100%-3rem)/5)] aspect-square bg-white overflow-hidden border transition-all shrink-0 cursor-pointer group ${
                              isActive
                                ? "border-[#b86b49] ring-1 ring-[#b86b49]"
                                : "border-slate-200/80 opacity-85 hover:opacity-100"
                            }`}
                            aria-label={`Xem ảnh ${i + 1}`}
                          >
                            <img
                              src={img}
                              alt={product.name}
                              className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                              loading="lazy"
                              onError={(e) => {
                                const target = e.currentTarget;
                                target.onerror = null;
                                target.src =
                                  "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80";
                              }}
                            />
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setMainImage((i) => (i + 1) % images.length)
                      }
                      className="absolute -right-3 sm:-right-3.5 top-1/2 -translate-y-1/2 z-10 w-6 h-10 sm:w-7 sm:h-11 rounded-full bg-white hover:bg-slate-50 text-slate-700 hover:text-[#b86b49] border border-slate-200 shadow-sm flex items-center justify-center transition-all cursor-pointer"
                      aria-label="Thumbnail tiếp"
                    >
                      <ChevronRight size={16} strokeWidth={2.2} />
                    </button>
                  </div>
                )}
              </div>

              {/* Product Purchase & Information Column (lg: 5 cols) */}
              <div className="lg:col-span-5 flex flex-col justify-start">
                {/* Header info */}
                <div className="border-b border-slate-200/80 pb-4 sm:pb-5">
                  {/* <span className="text-[11px] sm:text-xs uppercase tracking-wider font-semibold text-[#b86b49]">
                    {product.brand || "Nhà Xinh"}
                  </span> */}
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-serif font-bold text-slate-900 leading-snug">
                    {product.name}
                  </h1>

                  {/* Rating */}
                  {/* <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2 sm:mt-2.5">
                    <div className="flex items-center gap-0.5 text-amber-500">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={14}
                          fill={s <= Math.round(product.rating || 5) ? "currentColor" : "none"}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-semibold text-slate-600">
                      {product.rating ? `${product.rating} / 5` : "5.0 / 5"}
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-500">
                      {reviews.length > 0 ? `${reviews.length} đánh giá` : "Sản phẩm chính hãng"}
                    </span>
                  </div> */}

                  {/* Price Block */}
                  <div className="mt-3 sm:mt-4 flex flex-wrap items-center gap-2.5 sm:gap-3">
                    <span className="text-2xl sm:text-3xl font-extrabold text-[#070707]">
                      {vnd(currentPrice)}
                    </span>
                    {currentOriginalPrice && currentOriginalPrice > currentPrice && (
                      <span className="text-sm sm:text-base text-slate-400 line-through">
                        {vnd(currentOriginalPrice)}
                      </span>
                    )}
                    {!isPreorder && product.discount && product.discount > 0 ? (
                      <span className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                        Tiết kiệm {product.discount}%
                      </span>
                    ) : null}
                    {isPreorder && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-300 text-amber-800 font-bold text-xs">
                        <Clock size={13} className="text-amber-600" />
                        <span>Hàng đặt trước</span>
                      </span>
                    )}
                  </div>

                  {/* Pre-order Informational Banner */}
                  {isPreorder && (
                    <div className="mt-3 p-3.5 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs sm:text-sm">
                      <div className="font-bold flex items-center gap-1.5 text-amber-800 mb-1">
                        {/* <Sparkles size={15} /> */}
                        <span>Sản phẩm sản xuất theo yêu cầu (Đặt trước)</span>
                      </div>
                      <p className="text-amber-700 leading-relaxed text-[12px] sm:text-xs">
                        • Thời gian hoàn thiện và giao hàng dự kiến: <strong>7 - 14 ngày làm việc</strong>.<br />
                        • Đặt trước ngay để được đảm bảo giữ mức giá ưu đãi và giữ lịch lắp đặt sớm nhất.
                      </p>
                    </div>
                  )}
                </div>

                {/* Variant Selector */}
                {product.variants && product.variants.length > 0 && (
                  <div className="py-4 sm:py-5 border-b border-slate-200/80">
                    <div className="flex items-center justify-between mb-2.5 sm:mb-3">
                      {/* <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Tùy chọn phiên bản:
                      </span> */}
                      {/* {selectedVariant && (
                        <span className="text-xs font-semibold text-[#b86b49] truncate max-w-[150px] sm:max-w-none text-right">
                          {selectedVariant.name}
                        </span>
                      )} */}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                      {product.variants.map((v) => {
                        const isSelected = selectedVariant?.id === v.id;
                        const isVarPreorder =
                          Boolean(v.stock?.isPreorder) ||
                          v.stock?.stockStatus === "PRE_ORDER" ||
                          Boolean(product.isPreorder) ||
                          product.stockStatus === "PRE_ORDER";

                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => handleSelectVariant(v)}
                            className={`flex items-center gap-2.5 sm:gap-3 p-2 sm:p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? "border-[#b86b49] bg-[#b86b49]/5 shadow-xs ring-1 ring-[#b86b49]"
                                : "border-slate-200 hover:border-slate-300 bg-white"
                            }`}
                          >
                            {v.image && (
                              <img
                                src={v.image}
                                alt={v.name}
                                className="w-10 h-10 sm:w-11 sm:h-11 object-cover rounded-lg border border-slate-100 shrink-0"
                                onError={(e) => {
                                  (e.currentTarget as HTMLElement).style.display = "none";
                                }}
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">
                                {v.name}
                              </p>
                              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-0.5">
                                {v.price ? (
                                  <span className="text-xs font-semibold text-[#b86b49]">
                                    {vnd(v.price)}
                                  </span>
                                ) : null}

                                {isVarPreorder ? (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                    Đặt trước
                                  </span>
                                ) :null}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* SKU and variant dimensions note */}
                    {selectedVariant?.sku && (
                      <div className="mt-2.5 sm:mt-3 flex flex-wrap items-center gap-2 text-[11px] sm:text-xs text-slate-500">
                        <span>
                          Mã: <strong className="text-slate-700 font-mono">{selectedVariant.sku}</strong>
                        </span>
                        {selectedVariant.stock?.availableQuantity !== undefined && (
                          <span
                            className={`font-semibold ${
                              isPreorder
                                ? "text-amber-700"
                                : selectedVariant.stock.availableQuantity > 0
                                ? "text-emerald-700"
                                : "text-rose-600"
                            }`}
                          >
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Thông tin Kích thước & Chất liệu */}
                {(() => {
                  const variantOpts = parseJsonSpecs(selectedVariant?.optionValues);
                  const prodSpecs = parseJsonSpecs(product.specifications);

                  const findField = (
                    obj: Record<string, string> | null,
                    keys: string[]
                  ): string | null => {
                    if (!obj) return null;
                    for (const [k, v] of Object.entries(obj)) {
                      const norm = k.trim().toLowerCase();
                      if (keys.some((target) => norm.includes(target)) && v) {
                        return String(v);
                      }
                    }
                    return null;
                  };

                  const dimensionFromMm =
                    selectedVariant?.widthMm || selectedVariant?.depthMm || selectedVariant?.heightMm
                      ? [
                          selectedVariant?.widthMm ? `D${selectedVariant.widthMm}` : null,
                          selectedVariant?.depthMm ? `R${selectedVariant.depthMm}` : null,
                          selectedVariant?.heightMm ? `C${selectedVariant.heightMm}` : null,
                        ]
                          .filter(Boolean)
                          .join(" x ") + " mm"
                      : null;

                  const dimensionText =
                    findField(variantOpts, ["kich_thuoc", "kích thước", "dimension", "size", "quy_cach"]) ||
                    dimensionFromMm ||
                    findField(prodSpecs, ["kich_thuoc", "kích thước", "dimension", "size", "quy_cach"]) ||
                    "Tiêu chuẩn Nhà Xinh";

                  const materialText =
                    findField(variantOpts, ["chat_lieu", "chất liệu", "vat_lieu", "vật liệu", "material", "khung", "da", "vai", "gỗ"]) ||
                    findField(prodSpecs, ["chat_lieu", "chất liệu", "vat_lieu", "vật liệu", "material", "khung"]) ||
                    "Gỗ tự nhiên cao cấp, bề mặt hoàn thiện chuẩn Nhà Xinh";

                  return (
                    <div className="py-3.5 sm:py-4 border-b border-slate-200/80 space-y-2.5 text-sm sm:text-base">
                      <div className="flex items-start gap-2.5">
                        <span className="font-bold text-slate-800 min-w-26 shrink-0">Kích thước:</span>
                        <span className="text-slate-600 font-medium">{dimensionText}</span>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="font-bold text-slate-800 min-w-26 shrink-0">Chất liệu:</span>
                        <span className="text-slate-600 font-medium">{materialText}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Realtime Stock Indicator */}
                <div className="py-3 sm:py-4">
                  {isPreorder ? (
                    <div className="p-3 sm:p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900">
                      <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-amber-800">
                        <Clock size={15} />
                        <span>Hàng đặt trước</span>
                      </div>
                      <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                        Sản phẩm sản xuất theo đơn đặt trước (dự kiến hoàn thành sau 7 - 14 ngày làm việc). Quý khách có thể thêm vào giỏ để đặt trước ngay hoặc liên hệ tư vấn viên.
                      </p>
                    </div>
                  ) : availableStock > 0 ? (
                    <div className="text-xs font-semibold">
                      {/* <span className="text-emerald-700 flex items-center gap-1.5">
                        <Check size={16} className="shrink-0 stroke-[3]" />
                        <span>
                          Còn <strong>{availableStock}</strong> sản phẩm sẵn có tại kho
                          {selectedVariant ? ` (${selectedVariant.name})` : ""}
                        </span>
                      </span> */}
                    </div>
                  ) : (
                    <div className="p-3 sm:p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-rose-700">
                        <XCircle size={15} />
                        <span>Tạm hết hàng tại kho</span>
                      </div>
                      <p className="text-xs text-rose-600 mt-1 leading-relaxed">
                        Phiên bản {selectedVariant ? `"${selectedVariant.name}"` : "này"} hiện đã hết hàng sẵn trong kho. Quý khách không thể thêm vào giỏ, vui lòng liên hệ Zalo CSKH để đặt đợt mới!
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions: Số lượng + Mua ngay + Thêm vào giỏ + Wishlist nằm trên 1 hàng */}
                <div className="flex items-center gap-2 sm:gap-2.5 mt-1 sm:mt-2">
                  {/* 1. Bộ chọn số lượng */}
                  <div className="flex items-center border border-slate-300 rounded-xl bg-white overflow-hidden p-1 shadow-2xs shrink-0 h-12">
                    <button
                      type="button"
                      onClick={handleDecreaseQty}
                      disabled={qty <= (availableStock > 0 || isPreorder ? 1 : 0) || (!isPreorder && availableStock <= 0)}
                      className="w-7 sm:w-8 h-full rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
                      aria-label="Giảm số lượng"
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="number"
                      min={availableStock > 0 || isPreorder ? 1 : 0}
                      max={isPreorder ? 99 : availableStock}
                      value={!isPreorder && availableStock <= 0 ? 0 : qty}
                      onChange={(e) => handleQuantityChange(parseInt(e.target.value, 10))}
                      disabled={!isPreorder && availableStock <= 0}
                      className="w-8 sm:w-10 text-center text-xs sm:text-sm font-bold text-slate-800 bg-transparent border-none outline-none focus:ring-0"
                    />
                    <button
                      type="button"
                      onClick={handleIncreaseQty}
                      disabled={(!isPreorder && qty >= availableStock) || (!isPreorder && availableStock <= 0)}
                      className="w-7 sm:w-8 h-full rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
                      aria-label="Tăng số lượng"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  {/* 2. Nút Mua ngay + 3. Nút Thêm vào giỏ */}
                  {isPreorder ? (
                    <>
                      <button
                        type="button"
                        onClick={handleBuyNow}
                        className="flex-1 min-w-0 h-12 flex items-center justify-center gap-1.5 px-2.5 sm:px-4 rounded-xl bg-[#b86b49] hover:bg-[#9e5737] text-white font-bold text-xs sm:text-sm uppercase tracking-wide shadow-sm transition-all cursor-pointer active:scale-[0.99] whitespace-nowrap"
                      >
                        {/* <Zap size={16} className="shrink-0" /> */}
                        <span className="truncate">Mua ngay</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleAddToCart}
                        className="flex-1 min-w-0 h-12 flex items-center justify-center gap-1.5 px-2.5 sm:px-4 rounded-xl bg-[#2c2724] hover:bg-[#1a1715] text-white font-bold text-xs sm:text-sm uppercase tracking-wide shadow-sm transition-all cursor-pointer active:scale-[0.99] whitespace-nowrap"
                      >
                        {/* <Clock size={16} className="shrink-0" /> */}
                        <span className="truncate">Thêm vào giỏ</span>
                      </button>
                    </>
                  ) : availableStock > 0 ? (
                    <>
                      <button
                        type="button"
                        onClick={handleBuyNow}
                        className="flex-1 min-w-0 h-12 flex items-center justify-center gap-1.5 px-2.5 sm:px-4 rounded-xl bg-[#b86b49] hover:bg-[#9e5737] text-white font-bold text-xs sm:text-sm uppercase tracking-wide shadow-sm transition-all cursor-pointer active:scale-[0.99] whitespace-nowrap"
                      >
                        {/* <Zap size={16} className="shrink-0" /> */}
                        <span className="truncate">Mua ngay</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleAddToCart}
                        className="flex-1 min-w-0 h-12 flex items-center justify-center gap-1.5 px-2.5 sm:px-4 rounded-xl bg-[#2c2724] hover:bg-[#1a1715] text-white font-bold text-xs sm:text-sm uppercase tracking-wide shadow-sm transition-all cursor-pointer active:scale-[0.99] whitespace-nowrap"
                      >
                        <ShoppingBag size={16} className="shrink-0" />
                        <span className="truncate">Thêm vào giỏ</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="flex-1 min-w-0 h-12 flex items-center justify-center gap-2 px-3 sm:px-4 rounded-xl bg-slate-200 text-slate-400 font-bold text-xs sm:text-sm cursor-not-allowed whitespace-nowrap"
                    >
                      <XCircle size={17} className="shrink-0" />
                      <span className="truncate">Tạm hết hàng</span>
                    </button>
                  )}

                  {/* 4. Nút Wishlist */}
                  <button
                    type="button"
                    onClick={() => toggleWishlist(product)}
                    className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                      wishlisted
                        ? "border-rose-200 bg-rose-50 text-rose-600"
                        : "border-slate-300 hover:border-slate-400 bg-white text-slate-700"
                    }`}
                    aria-label={wishlisted ? "Bỏ yêu thích" : "Thêm yêu thích"}
                    title={wishlisted ? "Bỏ yêu thích" : "Lưu vào danh sách yêu thích"}
                  >
                    <Heart size={18} fill={wishlisted ? "currentColor" : "none"} className="shrink-0" />
                  </button>
                </div>

                {/* Cart Toast Feedback */}
                <div
                  id="pd-added"
                  className="hidden mt-3 p-3 rounded-xl bg-emerald-600 text-white text-xs font-bold text-center shadow-md animate-fade-in"
                >
                  ✓ Đã thêm vào giỏ hàng!
                </div>

                {/* Value Guarantees / Policies */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-5 sm:mt-6 pt-5 sm:pt-6 border-t border-slate-200/80">
                  <div className="flex flex-col items-center text-center gap-1 p-2 sm:p-2.5 rounded-xl bg-white border border-slate-200/60 shadow-2xs">
                    <Truck size={17} className="text-[#b86b49] shrink-0" />
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 leading-tight">Miễn phí giao hàng</span>
                    <span className="text-[9px] sm:text-[10px] text-slate-500 leading-tight">Đơn từ 5.000.000đ</span>
                  </div>
                  <div className="flex flex-col items-center text-center gap-1 p-2 sm:p-2.5 rounded-xl bg-white border border-slate-200/60 shadow-2xs">
                    <RotateCcw size={17} className="text-[#b86b49] shrink-0" />
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 leading-tight">Đổi trả 7 ngày</span>
                    <span className="text-[9px] sm:text-[10px] text-slate-500 leading-tight">Nếu lỗi sản xuất</span>
                  </div>
                  <div className="flex flex-col items-center text-center gap-1 p-2 sm:p-2.5 rounded-xl bg-white border border-slate-200/60 shadow-2xs">
                    <Shield size={17} className="text-[#b86b49] shrink-0" />
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 leading-tight">Bảo hành 2 năm</span>
                    <span className="text-[9px] sm:text-[10px] text-slate-500 leading-tight">Chính hãng Nhà Xinh</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Tabs Section */}
            <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-xs mb-10 sm:mb-16 overflow-hidden">
              {/* Tab Navigation - Smoothly horizontal scrollable on mobile */}
              <div className="flex border-b border-slate-200 bg-slate-50/50 overflow-x-auto scrollbar-none">
                {(
                  [
                    ["desc", "Mô tả chi tiết"],
                    ["specs", "Thông số kỹ thuật"],
                    ["reviews", `Đánh giá (${reviews.length})`],
                  ] as const
                ).map(([key, label]) => {
                  const isActive = activeTab === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActiveTab(key)}
                      className={`flex-1 sm:flex-none px-3.5 sm:px-6 py-3 sm:py-4 text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer whitespace-nowrap text-center ${
                        isActive
                          ? "border-[#b86b49] text-[#b86b49] bg-white"
                          : "border-transparent text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Tab Content Body */}
              <div className="p-4 sm:p-6 lg:p-8">
                {activeTab === "desc" && (
                  <div className="prose max-w-none text-slate-700 text-xs sm:text-sm leading-relaxed">
                    <p className="text-sm sm:text-base font-semibold text-slate-900 mb-2 sm:mb-3">
                      {product.name}
                    </p>
                    <p>
                      {product.description ||
                        product.shortDescription ||
                        "Sản phẩm nội thất cao cấp từ thương hiệu Nhà Xinh. Được chế tác từ những chất liệu tuyển chọn khắt khe, tối ưu công năng và phong cách hiện đại cho không gian sống của bạn."}
                    </p>
                  </div>
                )}

                {activeTab === "specs" && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] sm:text-xs text-left text-slate-700 border-collapse">
                      <tbody>
                        <tr className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-3 sm:py-3 sm:px-4 font-bold text-slate-900 w-2/5 sm:w-1/3">
                            Thương hiệu
                          </td>
                          <td className="py-2.5 px-3 sm:py-3 sm:px-4">{product.brand || "Nhà Xinh"}</td>
                        </tr>
                        <tr className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-3 sm:py-3 sm:px-4 font-bold text-slate-900">Danh mục</td>
                          <td className="py-2.5 px-3 sm:py-3 sm:px-4">{product.category}</td>
                        </tr>
                        {selectedVariant?.sku && (
                          <tr className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
                            <td className="py-2.5 px-3 sm:py-3 sm:px-4 font-bold text-slate-900">Mã SKU</td>
                            <td className="py-2.5 px-3 sm:py-3 sm:px-4 font-mono font-semibold text-slate-800">
                              {selectedVariant.sku}
                            </td>
                          </tr>
                        )}
                        {selectedVariant?.widthMm &&
                        selectedVariant?.depthMm &&
                        selectedVariant?.heightMm ? (
                          <tr className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
                            <td className="py-2.5 px-3 sm:py-3 sm:px-4 font-bold text-slate-900">Kích thước (D x R x C)</td>
                            <td className="py-2.5 px-3 sm:py-3 sm:px-4">
                              {selectedVariant.widthMm} x {selectedVariant.depthMm} x{" "}
                              {selectedVariant.heightMm} mm
                            </td>
                          </tr>
                        ) : null}
                        {selectedVariant?.weightGrams ? (
                          <tr className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
                            <td className="py-2.5 px-3 sm:py-3 sm:px-4 font-bold text-slate-900">Trọng lượng</td>
                            <td className="py-2.5 px-3 sm:py-3 sm:px-4">
                              {(selectedVariant.weightGrams / 1000).toLocaleString("vi-VN")} kg
                            </td>
                          </tr>
                        ) : null}
                        {/* Option Values JSON Specs */}
                        {(() => {
                          const optObj = parseJsonSpecs(selectedVariant?.optionValues);
                          if (optObj) {
                            return Object.entries(optObj).map(([k, v]) => (
                              <tr
                                key={`opt-${k}`}
                                className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors"
                              >
                                <td className="py-2.5 px-3 sm:py-3 sm:px-4 font-bold text-slate-900">
                                  {formatSpecLabel(k)}
                                </td>
                                <td className="py-2.5 px-3 sm:py-3 sm:px-4">{String(v)}</td>
                              </tr>
                            ));
                          }
                          if (selectedVariant?.optionValues) {
                            return (
                              <tr className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
                                <td className="py-2.5 px-3 sm:py-3 sm:px-4 font-bold text-slate-900">Tùy chọn phiên bản</td>
                                <td className="py-2.5 px-3 sm:py-3 sm:px-4">{String(selectedVariant.optionValues)}</td>
                              </tr>
                            );
                          }
                          return null;
                        })()}
                        {/* Product Specifications */}
                        {(() => {
                          const specObj = parseJsonSpecs(product.specifications);
                          if (specObj) {
                            return Object.entries(specObj).map(([k, v]) => (
                              <tr
                                key={`spec-${k}`}
                                className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors"
                              >
                                <td className="py-2.5 px-3 sm:py-3 sm:px-4 font-bold text-slate-900">
                                  {formatSpecLabel(k)}
                                </td>
                                <td className="py-2.5 px-3 sm:py-3 sm:px-4">{String(v)}</td>
                              </tr>
                            ));
                          }
                          if (product.specifications) {
                            return (
                              <tr className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
                                <td className="py-2.5 px-3 sm:py-3 sm:px-4 font-bold text-slate-900">Thông số kỹ thuật</td>
                                <td className="py-2.5 px-3 sm:py-3 sm:px-4">{product.specifications}</td>
                              </tr>
                            );
                          }
                          return (
                            <>
                              <tr className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
                                <td className="py-2.5 px-3 sm:py-3 sm:px-4 font-bold text-slate-900">Chất liệu</td>
                                <td className="py-2.5 px-3 sm:py-3 sm:px-4">Gỗ tự nhiên cao cấp, bề mặt phủ PU chống thấm</td>
                              </tr>
                              <tr className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
                                <td className="py-2.5 px-3 sm:py-3 sm:px-4 font-bold text-slate-900">Bảo hành</td>
                                <td className="py-2.5 px-3 sm:py-3 sm:px-4">24 tháng chính hãng Nhà Xinh</td>
                              </tr>
                              <tr className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
                                <td className="py-2.5 px-3 sm:py-3 sm:px-4 font-bold text-slate-900">Xuất xứ</td>
                                <td className="py-2.5 px-3 sm:py-3 sm:px-4">Việt Nam</td>
                              </tr>
                            </>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeTab === "reviews" && (
                  <ReviewSection
                    productName={product.name}
                    reviews={reviews}
                    onSubmitReview={handleAddReview}
                  />
                )}
              </div>
            </div>

            {/* Related Products Section */}
            {relatedProducts.length > 0 && (
              <section className="mb-10 sm:mb-16">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <div>
                    <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#b86b49]">
                      Gợi ý cho bạn
                    </span>
                    <h2 className="text-xl sm:text-2xl font-serif font-bold text-slate-900">
                      Sản phẩm tương tự
                    </h2>
                  </div>
                  <Link
                    to={`/san-pham?category=${encodeURIComponent(product.category || "")}`}
                    className="text-xs font-bold text-[#b86b49] hover:text-[#9e5737] flex items-center gap-1 transition-colors"
                  >
                    <span>Xem tất cả</span>
                    <ChevronRight size={14} />
                  </Link>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
                  {relatedProducts.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      onAddToCart={addToCart}
                      onToggleWishlist={toggleWishlist}
                      isWishlisted={isWishlisted(p.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Mobile Sticky Bottom Action Bar (Oppo Reno 6Z & iPhone 14 Pro Max safe-area tuned) */}
            <div className="fixed bottom-0 left-0 right-0 z-40 sm:hidden bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-4 py-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
              <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
                {/* Left: Price and Variant info */}
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="text-[10px] text-slate-500 font-medium truncate">
                    {selectedVariant ? selectedVariant.name : (product.brand || "Nhà Xinh")}
                  </div>
                  <div className="text-base font-extrabold text-[#b86b49] leading-tight truncate flex items-center gap-1">
                    <span>{vnd(currentPrice)}</span>
                    {isPreorder && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                        Đặt trước
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Primary Action Buttons */}
                {isPreorder ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleBuyNow}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3.5 rounded-xl bg-[#b86b49] active:bg-[#9e5737] text-white text-xs font-bold uppercase tracking-wide shadow-sm active:scale-95 transition-transform cursor-pointer"
                    >
                      <Zap size={14} />
                      <span>Mua ngay</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#2c2724] active:bg-[#1a1715] text-white text-xs font-bold uppercase tracking-wide shadow-sm active:scale-95 transition-transform cursor-pointer"
                    >
                      <Clock size={14} />
                      <span>Thêm giỏ</span>
                    </button>
                  </div>
                ) : availableStock > 0 ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleBuyNow}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3.5 rounded-xl bg-[#b86b49] active:bg-[#9e5737] text-white text-xs font-bold uppercase tracking-wide shadow-sm transition-transform active:scale-95 cursor-pointer"
                    >
                      <Zap size={14} />
                      <span>Mua ngay</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#2c2724] active:bg-[#1a1715] text-white text-xs font-bold uppercase tracking-wide shadow-sm transition-transform active:scale-95 cursor-pointer"
                    >
                      <ShoppingBag size={14} />
                      <span>Thêm giỏ</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-slate-200 text-slate-400 text-xs font-bold shrink-0 cursor-not-allowed"
                  >
                    <XCircle size={15} />
                    <span>Hết hàng</span>
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}