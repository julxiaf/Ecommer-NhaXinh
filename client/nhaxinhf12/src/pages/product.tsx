import { useState, useMemo, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ChevronRight, Heart, ShoppingBag, Minus, Plus, Truck, Shield, RotateCcw, Star,
  ChevronLeft, Share2, MessageCircle, AlertTriangle, Phone
} from "lucide-react";
import Header from "../components/Headers";
import Footer from "../components/Footer";
import ProductCard from "../components/ProductCard";
import ReviewSection from "../components/ReviewSection";
import { type Review } from "../util/CONSTRAINT";
import { useStore, isPreorderItem, getMaxStock } from "../hooks/useStore";
import "./pages.css";
import "./product-detail.css";
import type { Product, ProductVariant } from "../types/catalog";
import { productService } from "../services/productService";
import { vnd } from "../util/Constain";

const SPEC_LABEL_MAP: Record<string, string> = {
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

function formatSpecLabel(rawKey: string): string {
  const norm = rawKey.trim().toLowerCase();
  if (SPEC_LABEL_MAP[norm]) return SPEC_LABEL_MAP[norm];
  return rawKey.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

function parseJsonSpecs(raw?: string | Record<string, any> | null): Record<string, string> | null {
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

export default function ProductDetailPage() {
  const { slug } = useParams();
  const {
    cartCount, wishlist, addToCart, toggleWishlist, isWishlisted, user,
  } = useStore();

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

  useEffect(() => {
    if (!slug) return;
    let active = true;

    productService.getProductBySlug(slug).then((prod) => {
      if (!active || !prod) return;
      setProduct(prod);
      if (prod.variants && prod.variants.length > 0) {
        setSelectedVariant(prod.variants[0]);
      } else {
        setSelectedVariant(null);
      }

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

  const [qty, setQty] = useState(1);
  const [mainImage, setMainImage] = useState(0);
  const [activeTab, setActiveTab] = useState<"desc" | "specs" | "reviews">("desc");
  const [reviews, setReviews] = useState<Review[]>([]);

  const handleAddReview = (newRev: { rating: number; content: string; author: string }) => {
    const item: Review = {
      id: Date.now(),
      author: newRev.author,
      rating: newRev.rating,
      date: new Date().toLocaleDateString("vi-VN"),
      content: newRev.content,
      helpful: 0,
    };
    setReviews((prev) => [item, ...prev]);
  };

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
      : ["https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80"];
  }, [product, selectedVariant]);

  const wishlisted = isWishlisted(product.id);

  // Sản phẩm liên quan
  const related = relatedProducts;

  const isPreorder = isPreorderItem(product) || Boolean(selectedVariant?.stock?.isPreorder);
  const availableStock = getMaxStock(product, selectedVariant?.id);

  const currentPrice = selectedVariant?.price ?? product.price;
  const currentOriginalPrice = selectedVariant?.compareAtPrice ?? product.originalPrice;

  // Xử lý khi click chọn biến thể: đổi giá và chuyển ảnh chính sang ảnh biến thể
  const handleSelectVariant = (v: ProductVariant) => {
    setSelectedVariant(v);
    setMainImage(0);
    setStockMessage(null);
  };

  const handleIncreaseQty = () => {
    if (!isPreorder && qty >= availableStock) {
      setStockMessage(`Số lượng bạn chọn đã đạt mức tối đa có sẵn trong kho (Còn ${availableStock} sản phẩm).`);
      return;
    }
    setStockMessage(null);
    setQty((q) => q + 1);
  };

  const handleDecreaseQty = () => {
    setStockMessage(null);
    setQty((q) => Math.max(1, q - 1));
  };

  const handleAddToCart = () => {
    if (!isPreorder && availableStock <= 0) {
      setStockMessage("Sản phẩm này tạm thời hết hàng sẵn. Bạn có thể liên hệ Zalo/FB để đặt trước.");
      return;
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
    } else {
      setStockMessage(null);
    }

    // Hiển thị feedback
    const el = document.getElementById("pd-added");
    if (el) {
      el.textContent = res.message || (isPreorder ? "✓ Đã lưu sản phẩm đặt trước vào giỏ hàng!" : "✓ Đã thêm vào giỏ hàng!");
      el.classList.add("show");
      setTimeout(() => el.classList.remove("show"), 2500);
    }
  };

  return (
    <>
      <Header user={user} cartCount={cartCount} wishlistCount={wishlist.length} />

      <main className="page">
        {/* Breadcrumb */}
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Trang chủ</Link>
          <ChevronRight size={14} />
          <Link to="/san-pham">Sản phẩm</Link>
          <ChevronRight size={14} />
          <span>{product.name}</span>
        </nav>

        {/* Product Detail */}
        <div className="pd">
          {/* Gallery */}
          <div className="pd-gallery">
            <div className="pd-main-img-wrap">
              <img
                src={images[mainImage]}
                alt={product.name}
                className="pd-main-img"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.onerror = null;
                  target.src = "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80";
                }}
              />
              {images.length > 1 && (
                <>
                  <button
                    className="pd-img-arrow pd-img-prev"
                    onClick={() =>
                      setMainImage((i) => (i - 1 + images.length) % images.length)
                    }
                    aria-label="Ảnh trước"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    className="pd-img-arrow pd-img-next"
                    onClick={() =>
                      setMainImage((i) => (i + 1) % images.length)
                    }
                    aria-label="Ảnh tiếp"
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}
            </div>
            <div className="pd-thumbs">
              {images.map((img, i) => (
                <button
                  key={i}
                  className={`pd-thumb ${mainImage === i ? "active" : ""}`}
                  onClick={() => setMainImage(i)}
                  aria-label={`Xem ảnh ${i + 1}`}
                >
                  <img
                    src={img}
                    alt=""
                    loading="lazy"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.onerror = null;
                      target.src = "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80";
                    }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="pd-info">
            <div className="pd-meta">
              <h1 className="pd-name">{product.name}</h1>

              {product.isNew && <span className="pd-tag pd-tag-new">Mới</span>}
              
              {/* Chỉ hiển thị giảm giá khi KHÔNG phải là hàng đặt trước */}
              {!isPreorder && product.discount && product.discount > 0 && (
                <span className="pd-tag pd-tag-sale">-{product.discount}%</span>
              )}
            </div>


            {product.rating && (
              <div className="pd-rating">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={16}
                    fill={s <= Math.round(product.rating!) ? "#e8a838" : "none"}
                    color={s <= Math.round(product.rating!) ? "#e8a838" : "#ccc"}
                  />
                ))}
                <span className="pd-rating-text">{product.rating} / 5</span>
              </div>
            )}

            {/* Giá sản phẩm: KHÔNG hiển thị giá nếu là hàng đặt trước */}
            <div className="pd-price-block">
              {isPreorder ? (
                <div
                  className="pd-preorder-price-badge"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "6px 14px",
                    borderRadius: "6px",
                    background: "#fef3c7",
                    border: "1px solid #fde68a",
                    color: "#92400e",
                    fontWeight: "700",
                    fontSize: "13.5px",
                  }}
                >
                  <span>⏳</span>
                  <span>Sản phẩm đặt trước (Liên hệ tư vấn)</span>
                </div>
              ) : (
                <>
                  <span className="pd-price">{vnd(currentPrice)}</span>
                  {currentOriginalPrice && currentOriginalPrice > currentPrice && (
                    <span className="pd-original">{vnd(currentOriginalPrice)}</span>
                  )}
                </>
              )}
            </div>

            {/* Biến thể sản phẩm (Kích thước / Màu sắc / Phiên bản) */}
            {product.variants && product.variants.length > 0 && (
              <div className="pd-variants">
                <div className="pd-variants-header">
                  <span className="pd-variants-label">Tùy chọn phiên bản:</span>
                  {selectedVariant && (
                    <span className="pd-variants-current">{selectedVariant.name}</span>
                  )}
                </div>
                <div className="pd-variants-list">
                  {product.variants.map((v) => {
                    const isSelected = selectedVariant?.id === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        className={`pd-variant-chip ${isSelected ? "active" : ""}`}
                        onClick={() => handleSelectVariant(v)}
                      >
                        {v.image && (
                          <img
                            src={v.image}
                            alt={v.name}
                            className="pd-variant-chip-thumb"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = "none";
                            }}
                          />
                        )}
                        <div className="pd-variant-chip-content">
                          <span className="pd-variant-chip-name">{v.name}</span>
                          {!isPreorder && v.price ? (
                            <span className="pd-variant-chip-price">{vnd(v.price)}</span>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {selectedVariant?.sku && (
                  <div className="pd-variant-sku">
                    <span>SKU: <strong>{selectedVariant.sku}</strong></span>
                    {/* {selectedVariant.stock && (
                      // <span className="pd-variant-stock">
                        // (Còn {selectedVariant.stock.availableQuantity} sản phẩm)
                      // </span>
                    )} */}
                  </div>
                )}

                {/* OptionValues & Kích thước chi tiết của biến thể */}
                {(selectedVariant?.optionValues || selectedVariant?.widthMm || selectedVariant?.weightGrams) && (
                  <div className="pd-variant-details">
                    {/* {selectedVariant.optionValues && (
                      <div className="pd-variant-options">
                        {(() => {
                          const parsed = parseJsonSpecs(selectedVariant.optionValues);
                          if (parsed) {
                            return Object.entries(parsed).map(([k, v]) => (
                              <span key={k} className="pd-opt-tag">
                                <strong>{formatSpecLabel(k)}:</strong> {String(v)}
                              </span>
                            ));
                          }
                          return <span className="pd-opt-tag">{String(selectedVariant.optionValues)}</span>;
                        })()}
                      </div>
                    )} */}
                    {(selectedVariant.widthMm || selectedVariant.weightGrams) && (
                      <div className="pd-variant-dimensions">
                        {selectedVariant.widthMm && selectedVariant.depthMm && selectedVariant.heightMm && (
                          <span>
                            Kích thước: <strong>{selectedVariant.widthMm} x {selectedVariant.depthMm} x {selectedVariant.heightMm} mm</strong>
                          </span>
                        )}
                        {selectedVariant.weightGrams && (
                          <span>
                            Khối lượng: <strong>{(selectedVariant.weightGrams / 1000).toLocaleString("vi-VN")} kg</strong>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {/* Stock status indicator */}
            {isPreorder ? (
              <div className="pd-preorder-box" style={{ marginTop: "14px", padding: "14px 18px", borderRadius: "10px", background: "#fef3c7", border: "1px solid #fde68a" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "700", fontSize: "14px", color: "#92400e" }}>
                  <span>⏳</span>
                  <span>HÀNG ĐẶT TRƯỚC (PRE-ORDER)</span>
                </div>
                <p style={{ margin: "6px 0 0", fontSize: "13px", lineHeight: "1.5", color: "#78350f" }}>
                  Sản phẩm hiện không có sẵn ngay tại kho và sẽ được sản xuất / nhập khẩu riêng. Sản phẩm này <strong>không thể thanh toán trực tuyến tự động</strong>, vui lòng kết nối trực tiếp với chuyên viên tư vấn qua Zalo hoặc Facebook để chốt đơn và thời gian bàn giao.
                </p>
              </div>
            ) : (
              <div style={{ marginTop: "10px", fontSize: "13.5px", fontWeight: "600" }}>
                {availableStock > 0 ? (
                  <span style={{ color: "#16a34a", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    {/* <span>✓</span> Còn <strong>{availableStock}</strong> sản phẩm có sẵn tại kho */}
                  </span>
                ) : (
                  <span style={{ color: "#dc2626", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <span>✕</span> Tạm hết hàng có sẵn (Vui lòng liên hệ đặt trước)
                  </span>
                )}
              </div>
            )}

            {/* Quantity & Actions */}
            {isPreorder ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "20px" }}>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  <a
                    href={`https://zalo.me/0974933486?text=${encodeURIComponent(`Xin chào Nhà Xinh, tôi muốn được tư vấn và đặt trước sản phẩm: ${product.name}${selectedVariant ? ` (${selectedVariant.name})` : ""}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      flex: 1,
                      minWidth: "190px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      padding: "14px 20px",
                      borderRadius: "8px",
                      background: "#0068ff",
                      color: "#fff",
                      fontWeight: "700",
                      fontSize: "14px",
                      textDecoration: "none",
                      boxShadow: "0 4px 14px rgba(0, 104, 255, 0.25)",
                    }}
                  >
                    <MessageCircle size={18} />
                    Đặt hàng qua Zalo
                  </a>
                  <a
                    href={`https://m.me/nhaxinh?ref=${encodeURIComponent(`preorder_${product.slug}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      flex: 1,
                      minWidth: "190px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      padding: "14px 20px",
                      borderRadius: "8px",
                      background: "#1877f2",
                      color: "#fff",
                      fontWeight: "700",
                      fontSize: "14px",
                      textDecoration: "none",
                      boxShadow: "0 4px 14px rgba(24, 119, 242, 0.25)",
                    }}
                  >
                    <span style={{ fontWeight: "900", fontSize: "16px" }}>f</span>
                    Tư vấn qua Facebook
                  </a>
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <a
                    href="tel:18006061"
                    className="btn-secondary"
                    style={{
                      flex: 1,
                      padding: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      fontSize: "13.5px",
                      textDecoration: "none",
                      color: "#1f1d1a",
                      border: "1.5px solid #dcd6cd",
                      borderRadius: "8px",
                      fontWeight: "600",
                    }}
                  >
                    <Phone size={16} />
                    Hotline tư vấn: 1800 6061
                  </a>
                  <button
                    className={`pd-wish-btn ${wishlisted ? "active" : ""}`}
                    onClick={() => toggleWishlist(product)}
                    aria-label={wishlisted ? "Bỏ yêu thích" : "Thêm yêu thích"}
                  >
                    <Heart size={20} fill={wishlisted ? "#d26e4b" : "none"} />
                  </button>
                  <button
                    className="pd-share-btn"
                    onClick={() => navigator.clipboard?.writeText(window.location.href)}
                    aria-label="Chia sẻ"
                  >
                    <Share2 size={18} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="pd-actions">
                <div className="pd-qty">
                  <button
                    onClick={handleDecreaseQty}
                    disabled={qty <= 1}
                    aria-label="Giảm số lượng"
                  >
                    <Minus size={16} />
                  </button>
                  <span>{qty}</span>
                  <button
                    onClick={handleIncreaseQty}
                    disabled={qty >= availableStock}
                    aria-label="Tăng số lượng"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <button
                  className="btn-primary pd-add-cart"
                  onClick={handleAddToCart}
                  disabled={availableStock <= 0}
                >
                  <ShoppingBag size={18} />
                  {availableStock > 0 ? "Thêm vào giỏ hàng" : "Tạm hết hàng"}
                </button>

                <button
                  className={`pd-wish-btn ${wishlisted ? "active" : ""}`}
                  onClick={() => toggleWishlist(product)}
                  aria-label={wishlisted ? "Bỏ yêu thích" : "Thêm yêu thích"}
                >
                  <Heart size={20} fill={wishlisted ? "#d26e4b" : "none"} />
                </button>

                <button
                  className="pd-share-btn"
                  onClick={() => navigator.clipboard?.writeText(window.location.href)}
                  aria-label="Chia sẻ"
                >
                  <Share2 size={18} />
                </button>
              </div>
            )}

            {stockMessage && (
              <div style={{ marginTop: "12px", padding: "10px 14px", borderRadius: "8px", background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", fontSize: "13px", fontWeight: "500", display: "flex", alignItems: "center", gap: "8px" }}>
                <AlertTriangle size={16} />
                <span>{stockMessage}</span>
              </div>
            )}

            {/* Added to cart feedback */}
            <div id="pd-added" className="pd-added-msg">
              ✓ Đã thêm vào giỏ hàng!
            </div>

            {/* Policies */}
            <div className="pd-policies">
              <div className="pd-policy">
                <Truck size={20} />
                <div>
                  <strong>Giao hàng miễn phí</strong>
                  <span>Cho đơn hàng trên 5 triệu</span>
                </div>
              </div>
              <div className="pd-policy">
                <RotateCcw size={20} />
                <div>
                  <strong>Đổi trả 7 ngày</strong>
                  <span>Hoàn tiền nếu không hài lòng</span>
                </div>
              </div>
              <div className="pd-policy">
                <Shield size={20} />
                <div>
                  <strong>Bảo hành 2 năm</strong>
                  <span>Bảo hành chính hãng</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="pd-tabs">
          <div className="pd-tab-nav">
            {(
              [
                ["desc", "Mô tả chi tiết"],
                ["specs", "Thông số"],
                ["reviews", "Đánh giá"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                className={`pd-tab-btn ${activeTab === key ? "active" : ""}`}
                onClick={() => setActiveTab(key)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="pd-tab-content">
            {activeTab === "desc" && (
              <div className="pd-tab-desc">
                <p>
                  <strong>{product.name}</strong> {product.description}.
                </p>
              </div>
            )}
            {activeTab === "specs" && (
              <div className="pd-tab-specs">
                <table>
                  <tbody>
                    <tr><td>Thương hiệu</td><td>{product.brand || "Nhà Xinh"}</td></tr>
                    <tr><td>Danh mục</td><td>{product.category}</td></tr>
                    {selectedVariant?.sku && (
                      <tr><td>SKU</td><td>{selectedVariant.sku}</td></tr>
                    )}
                    {/* Kích thước chi tiết từ variant */}
                    {selectedVariant?.widthMm && selectedVariant?.depthMm && selectedVariant?.heightMm ? (
                      <tr>
                        <td>Kích thước (D x R x C)</td>
                        <td>
                          {selectedVariant.widthMm} x {selectedVariant.depthMm} x {selectedVariant.heightMm} mm
                        </td>
                      </tr>
                    ) : null}
                    {/* Khối lượng từ variant */}
                    {selectedVariant?.weightGrams ? (
                      <tr>
                        <td>Trọng lượng</td>
                        <td>{(selectedVariant.weightGrams / 1000).toLocaleString("vi-VN")} kg</td>
                      </tr>
                    ) : null}
                    {/* Tùy chọn optionValues từ variant */}
                    {(() => {
                      const optObj = parseJsonSpecs(selectedVariant?.optionValues);
                      if (optObj) {
                        return Object.entries(optObj).map(([k, v]) => (
                          <tr key={`opt-${k}`}>
                            <td>{formatSpecLabel(k)}</td>
                            <td>{String(v)}</td>
                          </tr>
                        ));
                      }
                      if (selectedVariant?.optionValues) {
                        return (
                          <tr>
                            <td>Tùy chọn phiên bản</td>
                            <td>{String(selectedVariant.optionValues)}</td>
                          </tr>
                        );
                      }
                      return null;
                    })()}
                    {/* Thông số kỹ thuật chung từ product.specifications */}
                    {(() => {
                      const specObj = parseJsonSpecs(product.specifications);
                      if (specObj) {
                        return Object.entries(specObj).map(([k, v]) => (
                          <tr key={`spec-${k}`}>
                            <td>{formatSpecLabel(k)}</td>
                            <td>{String(v)}</td>
                          </tr>
                        ));
                      }
                      if (product.specifications) {
                        return (
                          <tr>
                            <td>Thông số kỹ thuật</td>
                            <td>{product.specifications}</td>
                          </tr>
                        );
                      }
                      return (
                        <>
                          <tr><td>Chất liệu</td><td>Gỗ tự nhiên cao cấp, bề mặt phủ PU chống thấm</td></tr>
                          <tr><td>Bảo hành</td><td>24 tháng chính hãng</td></tr>
                          <tr><td>Xuất xứ</td><td>Việt Nam</td></tr>
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

        {/* Related Products */}
        {related.length > 0 && (
          <section className="pd-related">
            <h2 className="pd-related-title">Sản phẩm liên quan</h2>
            <div className="product-grid">
              {related.map((p) => (
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
      </main>
 
      <Footer />
    </>
  );
}