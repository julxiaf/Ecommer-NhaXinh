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
  Clock,
  Truck,
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
    selectedCartKeys,
    selectedCartItems,
    selectedCartTotal,
    selectedCartCount,
    hasSelectedPreorder,
    hasSelectedOutOfStock,
    toggleSelectCartItem,
    selectAllCartItems,
    unselectAllCartItems,
    removeSelectedCartItems,
    updateCartQty,
    removeFromCart,
    clearCart,
    wishlist,
    user,
  } = useStore();

  const [cartWarning, setCartWarning] = useState<string | null>(null);

  // Danh sách key của các sản phẩm có thể chọn (không bị hết hàng)
  const selectableKeys = cart
    .filter((i) => {
      const vId = i.variantId ?? i.product.variantId;
      return isPreorderItem(i.product, vId) || getMaxStock(i.product, vId) > 0;
    })
    .map((i) => {
      const vId = i.variantId ?? i.product.variantId;
      return vId ? `${i.product.id}_${vId}` : String(i.product.id);
    });

  const isAllSelected =
    selectableKeys.length > 0 &&
    selectableKeys.every((key) => selectedCartKeys.includes(key));

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
              {/* Select All Toolbar */}
              <div className="cart-select-toolbar">
                <label className="cart-select-all-label">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={(e) =>
                      e.target.checked ? selectAllCartItems() : unselectAllCartItems()
                    }
                    disabled={selectableKeys.length === 0}
                  />
                  <span>
                    Chọn tất cả ({selectedCartItems.length}/{cart.length} món)
                  </span>
                </label>

                {selectedCartItems.length > 0 && (
                  <button
                    type="button"
                    className="cart-delete-selected-btn"
                    onClick={removeSelectedCartItems}
                    title="Xóa các mục đã đánh dấu chọn khỏi giỏ hàng"
                  >
                    <Trash2 size={13} />
                    Xóa mục đã chọn ({selectedCartItems.length})
                  </button>
                )}
              </div>

              <div className="cart-header-row">
                <span className="cart-col-check"></span>
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
                const isPre = isPreorderItem(product, effectiveVariantId);
                const maxStock = getMaxStock(product, effectiveVariantId);
                const isOutOfStock = !isPre && maxStock <= 0;
                const isChecked = selectedCartKeys.includes(itemKey);

                return (
                  <div
                    key={itemKey}
                    className={`cart-item ${isPre ? "cart-item-preorder" : ""}`}
                    style={{ opacity: isOutOfStock ? 0.65 : 1 }}
                  >
                    <span className="cart-col-check">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelectCartItem(itemKey)}
                        disabled={isOutOfStock}
                        title={isOutOfStock ? "Sản phẩm tạm hết hàng" : "Chọn để thanh toán"}
                        aria-label={`Chọn sản phẩm ${product.name}`}
                      />
                    </span>

                    <div className="cart-col-product">
                      <Link to={`/san-pham/${product.slug}`} className="cart-item-img">
                        <img src={product.image} alt={product.name} loading="lazy" />
                      </Link>
                      <div className="cart-item-info">
                        <Link to={`/san-pham/${product.slug}`} className="cart-item-name">
                          {product.name}
                        </Link>
                        {variantName && (
                          <span className="cart-item-variant">
                            Phiên bản: {variantName}
                          </span>
                        )}
                        {isPre && (
                          <span className="cart-item-badge-preorder">
                            ⏳ Hàng đặt trước (Pre-Order - Giao sau 7-14 ngày)
                          </span>
                        )}
                        {isOutOfStock && (
                          <span className="cart-item-badge-outofstock">
                            ✕ Tạm hết hàng (Vui lòng bỏ chọn)
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
                        <span className="cart-item-stock-hint">
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
                        title="Xoá khỏi giỏ hàng"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}

              <div className="cart-bottom-actions">
                <Link to="/san-pham" className="cart-back-shopping-btn">
                  ← Tiếp tục mua sắm
                </Link>
                <button className="cart-clear-all-btn" onClick={clearCart}>
                  <Trash2 size={14} />
                  Xoá tất cả
                </button>
              </div>
            </div>

            {/* Order Summary */}
            <aside className="cart-summary">
              <h3 className="cart-summary-title">Tóm tắt đơn hàng</h3>

              <div className="cart-summary-row">
                <span>
                  Tạm tính {selectedCartCount > 0 ? `(${selectedCartCount} món)` : ""}
                </span>
                <span>{vnd(selectedCartTotal)}</span>
              </div>
              <div className="cart-summary-row">
                <span>Phí vận chuyển</span>
                <span className="cart-free">Miễn phí</span>
              </div>

              <div className="cart-summary-divider" />

              <div className="cart-summary-row cart-summary-total">
                <span>Tổng cộng</span>
                <span>{vnd(selectedCartTotal)}</span>
              </div>

              <p className="cart-vat-note">Đã bao gồm VAT</p>

              {/* Nút thanh toán chính */}
              {selectedCartItems.length === 0 ? (
                <div>
                  <button
                    type="button"
                    disabled
                    className="cart-checkout-btn"
                  >
                    Vui lòng chọn sản phẩm để thanh toán
                  </button>
                  <p style={{ fontSize: "12px", color: "#64748b", marginTop: "8px", textAlign: "center" }}>
                    Đánh dấu vào ô chọn sản phẩm bạn muốn đặt mua trước khi tiếp tục.
                  </p>
                </div>
              ) : hasSelectedOutOfStock ? (
                <div>
                  <button
                    type="button"
                    disabled
                    className="cart-checkout-btn"
                  >
                    Có sản phẩm hết hàng trong mục đã chọn
                  </button>
                  <p style={{ fontSize: "12px", color: "#b91c1c", marginTop: "8px", textAlign: "center" }}>
                    Vui lòng bỏ chọn các sản phẩm tạm hết hàng để tiếp tục thanh toán.
                  </p>
                </div>
              ) : (
                <div>
                  <Link
                    to="/thanh-toan"
                    className="cart-checkout-btn"
                  >
                    <span>Tiến hành thanh toán ({selectedCartCount})</span>
                    <ArrowRight size={17} />
                  </Link>
                </div>
              )}

              {/* Thông báo hàng đặt trước nếu có trong danh sách chọn */}
              {hasSelectedPreorder && (
                <div className="cart-preorder-notice">
                  <div className="cart-preorder-notice-header">
                    <Clock size={15} />
                    <span>Đơn hàng có sản phẩm đặt trước (Pre-Order)</span>
                  </div>
                  <p className="cart-preorder-notice-text">
                    Sản phẩm sản xuất theo yêu cầu (chuẩn bị 7 - 14 ngày làm việc). Quý khách có thể bấm thanh toán trực tuyến ngay hoặc liên hệ để được tư vấn:
                  </p>

                  <a
                    href={`https://zalo.me/0974933486?text=${encodeURIComponent(
                      `Chào Nhà Xinh, tôi muốn được tư vấn giỏ hàng gồm:\n` +
                      selectedCartItems.map((c) => `- ${c.product.name} (SL: ${c.quantity}, Đơn giá: ${vnd(c.product.price)})`).join("\n") +
                      `\nTổng tiền dự tính: ${vnd(selectedCartTotal)}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cart-zalo-btn"
                  >
                    <MessageCircle size={15} />
                    <span>Tư vấn đơn hàng qua Zalo</span>
                  </a>
                </div>
              )}

              {/* Thông tin giao nhận */}
              <div className="cart-guarantee">
                <div className="cart-guarantee-header">
                  <Truck size={15} className="text-[#d26e4b]" />
                  <span>Chính sách giao nhận Nhà Xinh</span>
                </div>
                <ul className="cart-guarantee-list">
                  <li>• <strong>Sản phẩm có sẵn:</strong> Giao hàng tiêu chuẩn 2 – 7 ngày.</li>
                  <li>• <strong>Hàng đặt trước:</strong> Giao hàng theo lịch hẹn (7 – 14 ngày làm việc).</li>
                  <li>• <strong>Giờ giao hàng:</strong> T2 – T6: 8:30 – 17:30 | T7 – CN: 9:30 – 16:30.</li>
                </ul>
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
