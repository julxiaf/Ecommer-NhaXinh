import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronRight,
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  ArrowRight,
  AlertTriangle,
  MessageCircle,
} from "lucide-react";
import Header from "../components/Headers";
import Footer from "../components/Footer";
import { useStore, isPreorderItem, getMaxStock } from "../hooks/useStore";
import "./pages.css";
import "./cart.css";

const vnd = (n: number) => Number(n).toLocaleString("vi-VN") + " ₫";

export default function CartPage() {
  const {
    cart,
    cartCount,
    cartTotal,
    hasPreorderItems,
    updateCartQty,
    removeFromCart,
    clearCart,
    wishlist,
    user,
  } = useStore();

  const [cartWarning, setCartWarning] = useState<string | null>(null);

  return (
    <>
      <Header user={user} cartCount={cartCount} wishlistCount={wishlist.length} />

      <main className="page">
        {/* Breadcrumb */}
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Trang chủ</Link>
          <ChevronRight size={14} />
          <span>Giỏ hàng</span>
        </nav>

        <h1 className="page-title">Giỏ hàng của bạn</h1>
        <p className="page-subtitle">{cartCount} sản phẩm trong giỏ hàng</p>

        {cartWarning && (
          <div
            style={{
              marginBottom: "20px",
              padding: "12px 18px",
              borderRadius: "8px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <AlertTriangle size={18} />
              <span>{cartWarning}</span>
            </div>
            <button
              type="button"
              onClick={() => setCartWarning(null)}
              style={{ background: "none", border: "none", cursor: "pointer", fontWeight: "700", color: "#b91c1c" }}
            >
              ✕
            </button>
          </div>
        )}

        {cart.length > 0 ? (
          <div className="cart-layout">
            {/* Cart Items */}
            <div className="cart-items">
              <div className="cart-header-row">
                <span className="cart-col-product">Sản phẩm</span>
                <span className="cart-col-price">Đơn giá</span>
                <span className="cart-col-qty">Số lượng</span>
                <span className="cart-col-total">Thành tiền</span>
                <span className="cart-col-action"></span>
              </div>

              {cart.map((item) => {
                const { product, quantity, variantId, variantName } = item;
                const effectiveVariantId = variantId ?? product.variantId;
                const itemKey = effectiveVariantId ? `${product.id}_${effectiveVariantId}` : String(product.id);
                const isPre = isPreorderItem(product);
                const maxStock = getMaxStock(product, effectiveVariantId);

                return (
                  <div
                    key={itemKey}
                    className="cart-item"
                    style={{
                      background: isPre ? "#fffdf5" : undefined,
                      borderLeft: isPre ? "4px solid #d97706" : undefined,
                      paddingLeft: isPre ? "14px" : undefined,
                    }}
                  >
                    <div className="cart-col-product">
                      <Link to={`/san-pham/${product.slug}`} className="cart-item-img">
                        <img src={product.image} alt={product.name} loading="lazy" />
                      </Link>
                      <div className="cart-item-info">
                        <Link to={`/san-pham/${product.slug}`} className="cart-item-name">
                          {product.name}
                        </Link>
                        {variantName && (
                          <span
                            className="cart-item-variant"
                            style={{
                              display: "inline-block",
                              fontSize: "12px",
                              color: "#6b7280",
                              marginTop: "2px",
                            }}
                          >
                            Phiên bản: {variantName}
                          </span>
                        )}
                        {isPre && (
                          <span
                            style={{
                              display: "inline-block",
                              fontSize: "11px",
                              fontWeight: "700",
                              background: "#fef3c7",
                              color: "#b45309",
                              padding: "2px 8px",
                              borderRadius: "99px",
                              marginTop: "4px",
                              alignSelf: "flex-start",
                            }}
                          >
                            ⏳ Hàng đặt trước (Pre-Order)
                          </span>
                        )}
                        <span className="cart-item-cat">{product.category}</span>
                        {/* Mobile price */}
                        <span className="cart-item-mobile-price">{vnd(product.price)}</span>
                      </div>
                    </div>

                    <span className="cart-col-price">{vnd(product.price)}</span>

                    <div className="cart-col-qty">
                      <div className="cart-qty">
                        <button
                          onClick={() => {
                            setCartWarning(null);
                            updateCartQty(product.id, quantity - 1, effectiveVariantId);
                          }}
                          disabled={quantity <= 1}
                          aria-label="Giảm"
                        >
                          <Minus size={14} />
                        </button>
                        <span>{quantity}</span>
                        <button
                          onClick={() => {
                            if (!isPre && quantity >= maxStock) {
                              setCartWarning(`Số lượng cho '${product.name}' đã đạt mức tối đa có sẵn trong kho (Còn ${maxStock} sản phẩm).`);
                              return;
                            }
                            const res = updateCartQty(product.id, quantity + 1, effectiveVariantId);
                            if (!res.success && res.message) {
                              setCartWarning(res.message);
                            } else {
                              setCartWarning(null);
                            }
                          }}
                          disabled={!isPre && quantity >= maxStock}
                          aria-label="Tăng"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      {!isPre && (
                        <span
                          style={{
                            fontSize: "11px",
                            color: quantity >= maxStock ? "#b45309" : "#6b7280",
                            marginTop: "4px",
                            display: "block",
                            textAlign: "center",
                          }}
                        >
                          {quantity >= maxStock ? `Tối đa kho: ${maxStock}` : `Kho còn: ${maxStock}`}
                        </span>
                      )}
                    </div>

                    <span className="cart-col-total cart-item-total">
                      {vnd(product.price * quantity)}
                    </span>

                    <div className="cart-col-action">
                      <button
                        className="cart-remove"
                        onClick={() => removeFromCart(product.id, effectiveVariantId)}
                        aria-label="Xoá sản phẩm"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}

              <div className="cart-bottom-actions">
                <Link to="/san-pham" className="btn-secondary">
                  ← Tiếp tục mua sắm
                </Link>
                <button className="btn-danger" onClick={clearCart}>
                  <Trash2 size={14} />
                  Xoá tất cả
                </button>
              </div>
            </div>

            {/* Order Summary */}
            <aside className="cart-summary">
              <h3 className="cart-summary-title">Tóm tắt đơn hàng</h3>

              <div className="cart-summary-row">
                <span>Tạm tính</span>
                <span>{vnd(cartTotal)}</span>
              </div>
              <div className="cart-summary-row">
                <span>Phí vận chuyển</span>
                <span className="cart-free">Miễn phí</span>
              </div>

              <div className="cart-summary-divider" />

              <div className="cart-summary-row cart-summary-total">
                <span>Tổng cộng</span>
                <span>{vnd(cartTotal)}</span>
              </div>

              <p className="cart-vat-note">Đã bao gồm VAT</p>

              {/* Xử lý trường hợp hàng đặt trước vs hàng có sẵn */}
              {hasPreorderItems ? (
                <div style={{ marginTop: "16px", padding: "16px", borderRadius: "10px", background: "#fef3c7", border: "1px solid #fde68a" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "700", color: "#92400e", fontSize: "14px" }}>
                    <AlertTriangle size={18} />
                    <span>CÓ SẢN PHẨM ĐẶT TRƯỚC</span>
                  </div>
                  <p style={{ margin: "8px 0 14px", fontSize: "12px", lineHeight: "1.5", color: "#78350f" }}>
                    Giỏ hàng của bạn có sản phẩm cần đặt trước (sản xuất theo yêu cầu riêng), do đó <strong>không thể thanh toán trực tuyến tự động</strong>. Vui lòng kết nối ngay với CSKH để hoàn tất đơn hàng:
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <a
                      href={`https://zalo.me/0974933486?text=${encodeURIComponent(
                        `Chào Nhà Xinh, tôi muốn đặt hàng danh sách sản phẩm gồm:\n` +
                        cart.map((c) => `- ${c.product.name} (SL: ${c.quantity}, Đơn giá: ${vnd(c.product.price)})`).join("\n") +
                        `\nTổng tiền dự tính: ${vnd(cartTotal)}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        padding: "12px",
                        borderRadius: "8px",
                        background: "#0068ff",
                        color: "#fff",
                        fontWeight: "700",
                        fontSize: "13.5px",
                        textDecoration: "none",
                        boxShadow: "0 3px 10px rgba(0, 104, 255, 0.25)",
                      }}
                    >
                      <MessageCircle size={18} />
                      Gửi đơn qua Zalo CSKH
                    </a>

                    <a
                      href="https://m.me/nhaxinh"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        padding: "12px",
                        borderRadius: "8px",
                        background: "#1877f2",
                        color: "#fff",
                        fontWeight: "700",
                        fontSize: "13.5px",
                        textDecoration: "none",
                        boxShadow: "0 3px 10px rgba(24, 119, 242, 0.25)",
                      }}
                    >
                      <span style={{ fontWeight: "900", fontSize: "15px" }}>f</span>
                      Nhắn tin Facebook hỗ trợ
                    </a>
                  </div>
                </div>
              ) : (
                <Link
                  to="/thanh-toan"
                  className="btn-primary cart-checkout-btn"
                  style={{ textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  Tiến hành thanh toán
                  <ArrowRight size={16} />
                </Link>
              )}

              <div className="cart-guarantee">
                <p> Thông tin giao hàng
Đối với những sản phẩm có sẵn tại khu vực, Nhà Xinh sẽ giao hàng trong vòng 2-7 ngày. Đối với những sản phẩm không có sẵn, thời gian giao hàng sẽ được nhân viên Nhà Xinh thông báo đến quý khách.

Từ 2-6: 8:30 - 17:30

Thứ 7, CN: 9:30 - 16:30</p>
              </div>
            </aside>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">
              <ShoppingBag size={32} />
            </div>
            <h2>Giỏ hàng trống</h2>
            <p>Bạn chưa có sản phẩm nào trong giỏ hàng. Hãy khám phá bộ sưu tập của chúng tôi!</p>
            <Link to="/san-pham" className="empty-state-btn">
              Khám phá sản phẩm
            </Link>
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}
