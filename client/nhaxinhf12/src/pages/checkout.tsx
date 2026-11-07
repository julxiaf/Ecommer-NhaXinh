import { Link } from "react-router-dom";
import {
  ChevronRight, CheckCircle2, CreditCard,
  Banknote, Copy, Check, ShoppingBag, AlertCircle, Lock,
  Landmark
} from "lucide-react";
import Header from "../components/Headers";
import Footer from "../components/Footer";
import { useCheckout } from "../hooks/useCheckout";
import { DEFAULT_PLACEHOLDER_IMAGE } from "../services/productService";
import "./pages.css";
import "./checkout.css";
import { vnd } from "../util/Constain";

export default function CheckoutPage() {
  const {
    cart,
    cartTotal,
    hasPreorderItems,
    preorderItems,
    user,
    isCustomer,
    wishlist,
    fullName,
    setFullName,
    phone,
    setPhone,
    email,
    setEmail,
    city,
    setCity,
    district,
    setDistrict,
    address,
    setAddress,
    note,
    setNote,
    paymentMethod,
    setPaymentMethod,
    couponCode,
    setCouponCode,
    appliedDiscount,
    setAppliedDiscount,
    couponError,
    availableCoupons,
    applyCouponCode,
    agreeTerms,
    setAgreeTerms,
    createAccount,
    setCreateAccount,
    shippingFee,
    discountAmount,
    finalTotal,
    isSubmitting,
    submittedOrder,
    copiedCode,
    vnpayNotification,
    setVnpayNotification,
    handleApplyCoupon,
    handleSubmitOrder,
    copyOrderCode,
    provinces,
    communes,
    isLoadingAddress,
  } = useCheckout();

  const totalQuantity = cart.reduce((s, i) => s + (i.qty || i.quantity || 1), 0);

  return (
    <>
      <Header user={user} cartCount={totalQuantity} wishlistCount={wishlist.length} />

      <main className="page checkout-page page-enter">
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px" }}>
          {/* Breadcrumb */}
          <nav className="breadcrumb" aria-label="Breadcrumb" style={{ marginBottom: 20 }}>
            <Link to="/">Trang chủ</Link>
            <ChevronRight size={14} />
            <Link to="/gio-hang">Giỏ hàng</Link>
            <ChevronRight size={14} />
            <span>Thanh toán</span>
          </nav>

          {/* Thông báo kết quả thanh toán VNPAY */}
          {vnpayNotification && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "14px 18px",
                marginBottom: 20,
                borderRadius: 8,
                background: vnpayNotification.type === "success" ? "#ecfdf5" : "#fef2f2",
                border: `1px solid ${vnpayNotification.type === "success" ? "#6ee7b7" : "#fca5a5"}`,
                color: vnpayNotification.type === "success" ? "#065f46" : "#991b1b",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {vnpayNotification.type === "success" ? (
                  <CheckCircle2 size={20} color="#16a34a" />
                ) : (
                  <AlertCircle size={20} color="#dc2626" />
                )}
                <span>{vnpayNotification.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setVnpayNotification(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "inherit",
                  fontWeight: 700,
                  fontSize: 18,
                  padding: "0 4px",
                }}
                aria-label="Đóng thông báo"
              >
                ×
              </button>
            </div>
          )}

          {/* Cảnh báo đơn hàng có sản phẩm Đặt Trước (Pre-order) */}
          {!submittedOrder && hasPreorderItems && (
            <div
              style={{
                marginBottom: "24px",
                padding: "18px 24px",
                borderRadius: "8px",
                background: "#fffbeb",
                border: "1.5px solid #f59e0b",
                color: "#92400e",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "15px", fontWeight: "700" }}>
                <AlertCircle size={20} color="#d97706" />
                <span>Đơn hàng chứa sản phẩm Đặt Trước (Pre-order)</span>
              </div>
              <p style={{ margin: "8px 0 16px", fontSize: "13.5px", lineHeight: "1.6", color: "#78350f" }}>
                Giỏ hàng của quý khách có chứa sản phẩm nội thất đặt trước ({preorderItems.map((i) => i.product.name).join(", ")}). Quý khách vui lòng liên hệ tư vấn viên qua Hotline/Zalo để hoàn tất thủ tục đặt cọc và xếp lịch sản xuất:
              </p>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <a
                  href={`https://zalo.me/0974933486?text=${encodeURIComponent(
                    `Chào Nhà Xinh, tôi muốn liên hệ đặt hàng các sản phẩm:\n` +
                    cart.map((c) => `- ${c.product.name} (SL: ${c.quantity || c.qty}, Giá: ${vnd(c.product.price)})`).join("\n") +
                    `\nTổng dự tính: ${vnd(cartTotal)}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 18px",
                    borderRadius: "4px",
                    background: "#0068ff",
                    color: "#fff",
                    fontWeight: "600",
                    fontSize: "13.5px",
                    textDecoration: "none",
                  }}
                >
                  Tư vấn qua Zalo (0974 933 486)
                </a>
                <Link
                  to="/gio-hang"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 18px",
                    borderRadius: "4px",
                    background: "#ede8e0",
                    color: "#1a1714",
                    fontWeight: "600",
                    fontSize: "13.5px",
                    textDecoration: "none",
                  }}
                >
                  Quay lại giỏ hàng
                </Link>
              </div>
            </div>
          )}

          {submittedOrder ? (
            /* Màn hình đặt hàng thành công */
            <div className="order-success-screen">
              <div className="order-success-icon">
                <CheckCircle2 size={38} />
              </div>
              <h1 className="order-success-title">Đặt hàng thành công!</h1>
              <p className="order-success-subtitle">
                Cảm ơn quý khách <strong>{submittedOrder.customerName}</strong> đã tin chọn Nội Thất Nhà Xinh.
                Nhân viên CSKH sẽ liên hệ trong vòng 30 phút để xác nhận đơn hàng và lịch giao lắp tận nhà.
              </p>

              <div className="order-code-badge">
                Mã đơn hàng: <strong style={{ marginLeft: 6 }}>{submittedOrder.orderCode}</strong>
                <button
                  type="button"
                  onClick={copyOrderCode}
                  style={{ marginLeft: 10, background: "none", border: "none", cursor: "pointer", verticalAlign: "middle" }}
                  title="Sao chép mã đơn"
                >
                  {copiedCode ? <Check size={16} color="#16a34a" /> : <Copy size={16} />}
                </button>
              </div>

              <div className="order-details-box">
                <h4>Thông tin đơn hàng</h4>
                <div className="order-details-row">
                  <span>Khách hàng:</span>
                  <strong>{submittedOrder.customerName} - {submittedOrder.phone}</strong>
                </div>
                <div className="order-details-row">
                  <span>Địa chỉ giao hàng:</span>
                  <strong>{submittedOrder.address}</strong>
                </div>
                <div className="order-details-row">
                  <span>Hình thức thanh toán:</span>
                  <strong>
                    {submittedOrder.paymentMethod === "cod" && "Thanh toán tiền mặt khi nhận hàng (COD)"}
                    {submittedOrder.paymentMethod === "vietqr" && "Chuyển khoản ngân hàng (Vietcombank)"}
                    {submittedOrder.paymentMethod === "vnpay" && "Cổng thanh toán VNPAY / Thẻ tín dụng"}
                    {submittedOrder.paymentMethod === "momo" && "Ví điện tử MoMo"}
                  </strong>
                </div>
                <div className="order-details-row">
                  <span>Phí vận chuyển & lắp đặt:</span>
                  <strong style={{ color: "#16a34a" }}>
                    {submittedOrder.shippingFee === 0 ? "Miễn phí" : vnd(submittedOrder.shippingFee || 0)}
                  </strong>
                </div>
                {(submittedOrder.discountAmount ?? 0) > 0 && (
                  <div className="order-details-row">
                    <span>Ưu đãi giảm giá:</span>
                    <strong style={{ color: "#dc2626" }}>-{vnd(submittedOrder.discountAmount || 0)}</strong>
                  </div>
                )}
                <div className="order-details-row" style={{ fontSize: "16px", paddingTop: 10 }}>
                  <span>Tổng tiền thanh toán:</span>
                  <strong style={{ color: "#b86b49", fontSize: "18px" }}>{vnd(submittedOrder.total)}</strong>
                </div>
              </div>

              {/* Box thông tin chuyển khoản nếu chọn ngân hàng */}
              {submittedOrder.paymentMethod === "vietqr" && (
                <div className="bank-info-box" style={{ textAlign: "left", marginBottom: 24 }}>
                  <div className="bank-info-header">
                    <Landmark size={18} className="text-[#b86b49]" />
                    <span>Thông tin chuyển khoản chính thức của Nhà Xinh</span>
                  </div>
                  <div className="bank-info-row">
                    Ngân hàng: <strong>Vietcombank (Ngân hàng Ngoại Thương Việt Nam)</strong>
                  </div>
                  <div className="bank-info-row">
                    Số tài khoản: <span className="bank-account-num">0071000745809</span>
                  </div>
                  <div className="bank-info-row">
                    Tên chủ tài khoản: <strong>CT CP NOI THAT AKA VIETCOMBANK – CHI NHÁNH TP.HCM.</strong>
                  </div>
                  <div className="bank-info-row" style={{ marginTop: 8, padding: "8px 12px", background: "#f0ebe1", borderRadius: 4 }}>
                    Nội dung chuyển khoản: <strong style={{ color: "#b86b49" }}>{submittedOrder.orderCode} {submittedOrder.phone}</strong>
                  </div>
                </div>
              )}

              <div className="order-success-actions">
                <Link
                  to={`/tai-khoan?tab=orders&orderCode=${encodeURIComponent(submittedOrder.orderCode)}`}
                  className="btn-primary"
                  style={{ textDecoration: "none" }}
                >
                  Xem chi tiết đơn hàng
                </Link>
                <Link to="/san-pham" className="btn-secondary" style={{ textDecoration: "none" }}>
                  Tiếp tục mua sắm
                </Link>
              </div>
            </div>
          ) : cart.length === 0 ? (
            /* Giỏ hàng trống */
            <div className="empty-state">
              <div className="empty-state-icon">
                <ShoppingBag size={32} />
              </div>
              <h2>Giỏ hàng của bạn đang trống</h2>
              <p>Vui lòng thêm sản phẩm vào giỏ hàng trước khi tiến hành thanh toán.</p>
              <Link to="/san-pham" className="empty-state-btn">
                Khám phá sản phẩm
              </Link>
            </div>
          ) : (
            /* Giao diện Thanh toán chính (Đồng bộ theo hình mẫu thiết kế) */
            <>
              {/* Stepper tiến trình */}
              <div className="checkout-steps">
                <div className="checkout-step completed">
                  <span className="checkout-step-num">✓</span>
                  <span>1. Giỏ hàng</span>
                </div>
                <div className="checkout-step-divider" />
                <div className="checkout-step active">
                  <span className="checkout-step-num">2</span>
                  <span>2. Thông tin & Thanh toán</span>
                </div>
                <div className="checkout-step-divider" />
                <div className="checkout-step">
                  <span className="checkout-step-num">3</span>
                  <span>3. Hoàn tất</span>
                </div>
              </div>

              <form onSubmit={handleSubmitOrder} className="checkout-grid">
                {/* ── Cột Trái: Thông tin giao hàng & Phương thức thanh toán ── */}
                <div className="checkout-main">
                  {/* 1. ĐỊA CHỈ GIAO HÀNG */}
                  <div className="checkout-section">
                    <h2 className="checkout-section-header">ĐỊA CHỈ GIAO HÀNG</h2>

                    {/* Họ và tên */}
                    <div className="form-field full">
                      <label htmlFor="fn">Họ và tên <span className="req">*</span></label>
                      <input
                        id="fn"
                        type="text"
                        placeholder="Nhập họ và tên người nhận"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                      />
                    </div>

                    {/* Số điện thoại & Email */}
                    <div className="form-row">
                      <div className="form-field">
                        <label htmlFor="ph">Số điện thoại <span className="req">*</span></label>
                        <input
                          id="ph"
                          type="tel"
                          placeholder="Số điện thoại nhận hàng"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-field">
                        <label htmlFor="em">
                          Địa chỉ email (tuỳ chọn)
                          {isCustomer && (
                            <span style={{ fontSize: 11, color: "#b86b49", marginLeft: 6, fontWeight: 500 }}>
                              <Lock size={10} style={{ display: "inline", verticalAlign: "middle" }} /> Đã đồng bộ
                            </span>
                          )}
                        </label>
                        <input
                          id="em"
                          type="email"
                          placeholder="Địa chỉ email nhận hóa đơn (VD: anhlong70@gmail.com)"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Tỉnh / Thành phố & Phường / Xã */}
                    <div className="form-row">
                      <div className="form-field">
                        <label htmlFor="city">
                          Tỉnh / Thành phố <span className="req">*</span>
                          {isLoadingAddress && (
                            <span style={{ fontSize: 11, color: "#b86b49", marginLeft: 6 }}>
                              (Đang tải...)
                            </span>
                          )}
                        </label>
                        <select
                          id="city"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          required
                        >
                          {provinces && provinces.length > 0 ? (
                            provinces.map((p: any) => {
                              const val = p.code || p.id || p.name;
                              return (
                                <option key={val} value={val}>
                                  {p.name || val}
                                </option>
                              );
                            })
                          ) : (
                            <>
                              <option value="Thành phố Hà Nội">Thành phố Hà Nội</option>
                              <option value="Thành phố Hồ Chí Minh">Thành phố Hồ Chí Minh</option>
                              <option value="Thành phố Đà Nẵng">Thành phố Đà Nẵng</option>
                            </>
                          )}
                        </select>
                      </div>

                      <div className="form-field">
                        <label htmlFor="district">
                          Phường / Xã <span className="req">*</span>
                        </label>
                        <select
                          id="district"
                          value={district}
                          onChange={(e) => setDistrict(e.target.value)}
                          required
                        >
                          {communes && communes.length > 0 ? (
                            communes.map((c: any) => {
                              const val = c.code || c.id || c.name;
                              return (
                                <option key={val} value={val}>
                                  {c.name || val}
                                </option>
                              );
                            })
                          ) : (
                            <option value={district || "Phường Hoàng Mai"}>
                              {district || "Đang tải dữ liệu phường/xã..."}
                            </option>
                          )}
                        </select>
                      </div>
                    </div>

                    {/* Địa chỉ */}
                    <div className="form-field full">
                      <label htmlFor="addr">Địa chỉ <span className="req">*</span></label>
                      <input
                        id="addr"
                        type="text"
                        placeholder="Số nhà, tên đường, tòa nhà/căn hộ"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        required
                      />
                    </div>

                    {/* Checkbox tạo tài khoản (theo ảnh mẫu) */}
                    {!isCustomer && (
                      <label className="form-checkbox-row">
                        <input
                          type="checkbox"
                          checked={createAccount}
                          onChange={(e) => setCreateAccount(e.target.checked)}
                        />
                        <span>Create an account? (Tạo tài khoản thành viên để theo dõi đơn hàng)</span>
                      </label>
                    )}
                  </div>

                  {/* 2. THÔNG TIN THÊM */}
                  <div className="checkout-section">
                    <h2 className="checkout-section-header">THÔNG TIN THÊM</h2>
                    <div className="form-field full">
                      <label htmlFor="note">Lưu ý cho đơn hàng (tuỳ chọn)</label>
                      <textarea
                        id="note"
                        rows={3}
                        placeholder="Viết các lưu ý cho đơn hàng của bạn, ví dụ: lưu ý đặc biệt khi vận chuyển."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* 3. PHƯƠNG THỨC THANH TOÁN */}
                  <div className="checkout-section">
                    <h2 className="checkout-section-header">PHƯƠNG THỨC THANH TOÁN</h2>

                    <div className="payment-cards-grid">
                      {/* Thẻ 1: Chuyển khoản ngân hàng */}
                      <div
                        className={`payment-card-tab ${paymentMethod === "vietqr" ? "selected" : ""}`}
                        onClick={() => setPaymentMethod("vietqr")}
                      >
                        {paymentMethod === "vietqr" && (
                          <div className="payment-card-badge-check">
                            <Check size={11} strokeWidth={3} />
                          </div>
                        )}
                        <div className="payment-card-tab-icon">
                          <Landmark size={20} />
                        </div>
                        <span className="payment-card-tab-label">Chuyển khoản ngân hàng</span>
                      </div>

                      {/* Thẻ 2: Thanh toán tiền mặt (COD) */}
                      <div
                        className={`payment-card-tab ${paymentMethod === "cod" ? "selected" : ""}`}
                        onClick={() => setPaymentMethod("cod")}
                      >
                        {paymentMethod === "cod" && (
                          <div className="payment-card-badge-check">
                            <Check size={11} strokeWidth={3} />
                          </div>
                        )}
                        <div className="payment-card-tab-icon">
                          <Banknote size={20} />
                        </div>
                        <span className="payment-card-tab-label">Thanh toán tiền mặt</span>
                      </div>

                      {/* Thẻ 3: Cổng VNPAY / Thẻ tín dụng */}
                      <div
                        className={`payment-card-tab ${paymentMethod === "vnpay" ? "selected" : ""}`}
                        onClick={() => setPaymentMethod("vnpay")}
                      >
                        {paymentMethod === "vnpay" && (
                          <div className="payment-card-badge-check">
                            <Check size={11} strokeWidth={3} />
                          </div>
                        )}
                        <div className="payment-card-tab-icon">
                          <CreditCard size={20} />
                        </div>
                        <span className="payment-card-tab-label">Thẻ tín dụng / VNPAY</span>
                      </div>
                    </div>

                    {/* Chi tiết tài khoản ngân hàng khi chọn "Chuyển khoản ngân hàng" (chuẩn như ảnh) */}
                    {paymentMethod === "vietqr" && (
                      <div className="bank-info-clean">
                        <div className="bank-line-title">Ngân hàng Vietcombank</div>
                        <div className="bank-line-row">
                          <span>Số tài khoản : </span>
                          <strong className="bank-num-text">0071000745809</strong>
                          <button
                            type="button"
                            className="bank-copy-pill"
                            onClick={() => {
                              navigator.clipboard.writeText("0071000745809");
                              alert("Đã sao chép số tài khoản Vietcombank: 0071000745809");
                            }}
                          >
                            <Copy size={11} /> Sao chép
                          </button>
                        </div>
                        <div className="bank-line-row">Tên chủ tài khoản:</div>
                        <div className="bank-holder-strong">
                          CT CP NOI THAT AKA VIETCOMBANK – CHI NHÁNH TP.HCM.
                        </div>
                      </div>
                    )}

                    {paymentMethod === "cod" && (
                      <div className="bank-info-clean">
                        <div className="bank-line-title">Thanh toán tiền mặt khi nhận hàng (COD)</div>
                        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#666", lineHeight: 1.6 }}>
                          Quý khách kiểm tra sản phẩm nội thất và thanh toán trực tiếp cho nhân viên kỹ thuật giao nhận của Nhà Xinh.
                        </p>
                      </div>
                    )}

                    {paymentMethod === "vnpay" && (
                      <div className="bank-info-clean">
                        <div className="bank-line-title">Cổng thanh toán điện tử VNPAY-QR / Thẻ Quốc tế</div>
                        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#666", lineHeight: 1.6 }}>
                          Sau khi bấm Đặt Mua, quý khách sẽ được chuyển hướng tới cổng VNPAY để quét mã QR hoặc thanh toán thẻ Visa / Master / JCB an toàn.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Cột Phải: Tóm tắt đơn hàng (Order Summary Sidebar chuẩn theo hình ảnh mẫu) ── */}
                <aside className="checkout-summary-card">
                  <h3 className="checkout-summary-title">Tóm tắt đơn hàng</h3>

                  {/* Thành tiền */}
                  <div className="summary-line-item subtotal">
                    <span className="label-bold">Thành tiền</span>
                    <span className="val-amount">{vnd(cartTotal)}</span>
                  </div>

                  {/* VẬN CHUYỂN */}
                  <div className="summary-line-item shipping">
                    <span className="label-bold">VẬN CHUYỂN</span>
                    <div className="shipping-desc">
                      {shippingFee === 0 ? "Miễn phí giao hàng & lắp đặt tận nơi" : vnd(shippingFee)}
                    </div>
                  </div>

                  {/* Giảm giá (nếu có) */}
                  {discountAmount > 0 && (
                    <div className="summary-line-item discount">
                      <span className="label-bold" style={{ color: "#dc2626" }}>Giảm giá</span>
                      <strong style={{ color: "#dc2626" }}>-{vnd(discountAmount)}</strong>
                    </div>
                  )}

                  {/* TỔNG CỘNG */}
                  <div className="summary-line-item total-line">
                    <span className="total-label">TỔNG CỘNG</span>
                    <span className="total-amount">{vnd(finalTotal)}</span>
                  </div>

                  {/* Sản phẩm */}
                  <div className="summary-products-header">
                    <span>Sản phẩm</span>
                    <span className="summary-products-badge">{totalQuantity}</span>
                  </div>

                  <div className="summary-products-list">
                    {cart.map((item) => {
                      const qty = item.qty || item.quantity || 1;
                      const itemPrice = (item.product.price || 0) * qty;

                      return (
                        <div key={item.product.id} className="summary-product-item">
                          <img
                            src={item.product.image || DEFAULT_PLACEHOLDER_IMAGE}
                            alt={item.product.name}
                            className="summary-product-img"
                          />
                          <div className="summary-product-details">
                            <div className="summary-product-name">
                              {item.product.name} × {qty}
                            </div>
                            {item.variantName && (
                              <div className="summary-product-sub">{item.variantName}</div>
                            )}
                          </div>
                          <div className="summary-product-price">
                            {vnd(itemPrice)}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Mã ưu đãi Coupon */}
                  <div className="summary-coupon-box">
                    <input
                      type="text"
                      placeholder="Mã giảm giá (ví dụ: NHAXINH10)"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="summary-coupon-input"
                    />
                    <button type="button" onClick={handleApplyCoupon} className="summary-coupon-btn">
                      Áp dụng
                    </button>
                  </div>

                  {couponError && (
                    <p style={{ color: "#dc2626", fontSize: "12px", margin: "-8px 0 10px" }}>
                      {couponError}
                    </p>
                  )}

                  {appliedDiscount && (
                    <div className="coupon-applied-msg" style={{ marginBottom: 12 }}>
                      <span>Đã áp dụng mã <strong>{appliedDiscount.code}</strong> (-{vnd(discountAmount)})</span>
                      <button
                        type="button"
                        className="coupon-remove-btn"
                        onClick={() => setAppliedDiscount(null)}
                      >
                        Xoá
                      </button>
                    </div>
                  )}

                  {/* Danh sách voucher có sẵn */}
                  {availableCoupons && availableCoupons.length > 0 && !appliedDiscount && (
                    <div style={{ marginBottom: 12, fontSize: 12 }}>
                      <span style={{ color: "#64748b", fontWeight: 600, display: "block", marginBottom: 6 }}>
                        Mã ưu đãi dành cho bạn:
                      </span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {availableCoupons.slice(0, 4).map((c) => (
                          <button
                            key={c.code}
                            type="button"
                            onClick={() => applyCouponCode(c.code)}
                            title={c.description}
                            style={{
                              padding: "4px 8px",
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 600,
                              background: "#f8fafc",
                              border: "1px dashed #cbd5e1",
                              color: "#334155",
                              cursor: "pointer",
                            }}
                          >
                            🏷️ {c.code} {c.targetCustomer === "FIRST_ORDER" ? "(Khách mới)" : ""}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Khung Chính sách bán hàng (Cuộn như trong ảnh mẫu) */}
                  <div className="policy-box-wrapper">
                    <div className="policy-box-title">CHÍNH SÁCH BÁN HÀNG</div>
                    <div className="policy-box-content">
                      <p><strong>1. Thanh toán</strong></p>
                      <p>
                        Nhà Xinh áp dụng hình thức thanh toán online qua thẻ tín dụng, chuyển khoản hoặc tiền mặt khi nhận hàng (COD), cụ thể:
                      </p>
                      <p><strong>Bước 1:</strong> Khách hàng tìm hiểu thông tin về sản phẩm.</p>
                      <p><strong>Bước 2:</strong> Khách hàng kiểm tra và xác nhận đơn hàng tại website.</p>
                      <p><strong>Bước 3:</strong> Nhà Xinh liên hệ xác nhận và tiến hành giao nhận hoàn thiện.</p>
                      <p><strong>2. Giao nhận & Lắp đặt</strong></p>
                      <p>
                        Miễn phí vận chuyển và lắp ráp trọn gói tận nhà cho mọi đơn hàng nội thất Nhà Xinh. Đội ngũ kỹ thuật viên bàn giao sản phẩm chỉn chu, vệ sinh sạch sẽ.
                      </p>
                      <p><strong>3. Đổi trả & Bảo hành</strong></p>
                      <p>
                        Bảo hành chính hãng 24 tháng cho mọi sản phẩm nội thất và hỗ trợ bảo trì trọn đời. Đổi trả linh hoạt trong vòng 7 ngày nếu lỗi từ nhà sản xuất.
                      </p>
                    </div>
                  </div>

                  {/* Checkbox Đồng ý điều khoản bán hàng (chuẩn như ảnh) */}
                  <label className="terms-agreement-row">
                    <input
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      required
                    />
                    <span>
                      Tôi đã đọc và đồng ý <strong>điều kiện đổi trả hàng, giao hàng, chính sách bảo mật, điều khoản dịch vụ mua hàng online *</strong>
                    </span>
                  </label>

                  {/* Nút ĐẶT MUA lớn (chính xác như ảnh mẫu: nền đen, chữ hoa trắng) */}
                  <button
                    type="submit"
                    disabled={isSubmitting || hasPreorderItems}
                    className="btn-submit-order"
                  >
                    {hasPreorderItems
                      ? "Vui lòng đặt hàng qua Hotline / Zalo"
                      : isSubmitting
                      ? "Đang xử lý đơn hàng..."
                      : "ĐẶT MUA"}
                  </button>
                </aside>
              </form>
            </>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
