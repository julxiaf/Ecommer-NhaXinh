import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, ShoppingBag, Eye } from "lucide-react";
import "./ProductCard.css";

import type { Product } from "../types/catalog";
export type { Product };

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
  onToggleWishlist?: (product: Product) => void;
  isWishlisted?: boolean;
}

const vnd = (n: number) => Number(n).toLocaleString("vi-VN") + " VNĐ";

export default function ProductCard({
  product,
  onAddToCart,
  onToggleWishlist,
  isWishlisted = false,
}: ProductCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <article
      className="pc"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="pc-img-wrap">
        <Link to={`/san-pham/${product.slug}`} className="pc-img-link">
          <img
            src={hovered && product.image2 ? product.image2 : product.image}
            alt={product.name}
            className="pc-img"
            loading="lazy"
            onError={(e) => {
              const target = e.currentTarget;
              target.onerror = null;
              target.src = "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80";
            }}
          />
        </Link>

        {/* Badges */}
<div className="pc-badges">
  {product.isPreorder || product.stockStatus === "PRE_ORDER" ? (
    <span className="pc-badge pc-badge-preorder" style={{ background: "#d97706", color: "#fff", fontWeight: 600 }}>
      Đặt trước
    </span>
  ) : product.totalStock !== undefined && product.totalStock <= 0 ? (
    <span className="pc-badge pc-badge-out" style={{ background: "#6b7280", color: "#fff" }}>
      Hết hàng
    </span>
  ) : (
    product.isNew && <span className="pc-badge pc-badge-new">Mới</span>
  )}

  {/* Chỉ hiển thị giảm giá khi KHÔNG phải là hàng đặt trước */}
  {(!product.isPreorder && product.stockStatus !== "PRE_ORDER") && product.discount && product.discount > 0 && (
    <span className="pc-badge pc-badge-sale">-{product.discount}%</span>
  )}
</div>

        {/* Quick Actions */}
        <div className={`pc-actions ${hovered ? "visible" : ""}`}>
          <button
            className={`pc-act-btn ${isWishlisted ? "active" : ""}`}
            onClick={() => onToggleWishlist?.(product)}
            aria-label={isWishlisted ? "Bỏ yêu thích" : "Thêm yêu thích"}
          >
            <Heart size={18} fill={isWishlisted ? "#d26e4b" : "none"} />
          </button>
          <button
            className="pc-act-btn"
            onClick={() => onAddToCart?.(product)}
            aria-label="Thêm vào giỏ hàng"
          >
            <ShoppingBag size={18} />
          </button>
          <Link
            to={`/san-pham/${product.slug}`}
            className="pc-act-btn"
            aria-label="Xem chi tiết"
          >
            <Eye size={18} />
          </Link>
        </div>
      </div>

      <div className="pc-info">
        {/* <span className="pc-category">{product.category}</span> */}
        <Link to={`/san-pham/${product.slug}`} className="pc-name">
          {product.name}
        </Link>
        <div className="pc-price-row">
          {(!product.isPreorder && product.stockStatus !== "PRE_ORDER") && (
            <>
              <span className="pc-price">{vnd(product.price)}</span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="pc-original">{vnd(product.originalPrice)}</span>
              )}
            </>
          )}
        </div>
      </div>
    </article>
  );
}
