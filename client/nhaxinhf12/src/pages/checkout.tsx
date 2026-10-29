import { Link } from "react-router-dom";
import {
  ChevronRight, CheckCircle2, CreditCard,
  Banknote, Copy, Check, ShoppingBag, AlertCircle, Lock,
  Landmark, FileText
} from "lucide-react";
import Header from "../components/Headers";
import Footer from "../components/Footer";
import { useCheckout } from "../hooks/useCheckout";
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
                <Link to="/san-pham" className="btn-primary">
                  Tiếp tục mua sắm
                </Link>
                <Link to="/" className="btn-secondary">
                  Về trang chủ
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
                    <h2 className="checkout-section-header">Địa chỉ giao hàng</h2>

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
                              <Lock size={10} style={{ display: "inline", verticalAlign: "middle" }} /> Đồng bộ tài khoản
                            </span>
                          )}
                        </label>
                        <input
                          id="em"
                          type="email"
                          placeholder="Địa chỉ email nhận hóa đơn"
                          value={email}
                          readOnly={isCustomer}
                          onChange={(e) => setEmail(e.target.value)}
                          style={isCustomer ? { backgroundColor: "#f8f9fa", color: "#64748b", cursor: "not-allowed" } : {}}
                        />
                      </div>
                    </div>

                    {/* Tỉnh / Thành phố & Phường / Xã */}
                    <div className="form-row">
                      <div className="form-field">
                        <label htmlFor="city">Tỉnh / Thành phố <span className="req">*</span></label>
                        <select id="city" value={city} onChange={(e) => setCity(e.target.value)}>
                          <option value="Thành phố Hà Nội">Thành phố Hà Nội</option>
                          <option value="Thành phố Hồ Chí Minh">Thành phố Hồ Chí Minh</option>
                          <option value="Thành phố Đà Nẵng">Thành phố Đà Nẵng</option>
                          <option value="Tỉnh Bình Dương">Tỉnh Bình Dương</option>
                          <option value="Tỉnh Đồng Nai">Tỉnh Đồng Nai</option>
                          <option value="Thành phố Cần Thơ">Thành phố Cần Thơ</option>
                          <option value="Thành phố Hải Phòng">Thành phố Hải Phòng</option>
                        </select>
                      </div>

                      <div className="form-field">
                        <label htmlFor="district">Phường / Xã / Quận <span className="req">*</span></label>
                        <select id="district" value={district} onChange={(e) => setDistrict(e.target.value)}>
                          {city.includes("Hà Nội") ? (
                            <>
                              <option value="Phường Hoàng Mai">Phường Hoàng Mai</option>
                              <option value="Quận Cầu Giấy">Quận Cầu Giấy</option>
                              <option value="Quận Hoàn Kiếm">Quận Hoàn Kiếm</option>
                              <option value="Quận Ba Đình">Quận Ba Đình</option>
                              <option value="Quận Đống Đa">Quận Đống Đa</option>
                              <option value="Quận Tây Hồ">Quận Tây Hồ</option>
                              <option value="Quận Nam Từ Liêm">Quận Nam Từ Liêm</option>
                            </>
                          ) : city.includes("Đà Nẵng") ? (
                            <>
                              <option value="Quận Hải Châu">Quận Hải Châu</option>
                              <option value="Quận Thanh Khê">Quận Thanh Khê</option>
                              <option value="Quận Sơn Trà">Quận Sơn Trà</option>
                              <option value="Quận Ngũ Hành Sơn">Quận Ngũ Hành Sơn</option>
                            </>
                          ) : (
                            <>
                              <option value="Quận 1">Quận 1</option>
                              <option value="TP. Thủ Đức (Quận 2)">TP. Thủ Đức (Quận 2)</option>
                              <option value="Quận 3">Quận 3</option>
                              <option value="Quận 7">Quận 7</option>
                              <option value="Quận Bình Thạnh">Quận Bình Thạnh</option>
                              <option value="Quận Phú Nhuận">Quận Phú Nhuận</option>
                              <option value="Quận Tân Bình">Quận Tân Bình</option>
                            </>
                          )}
                        </select>
                      </div>
                    </div>

                    {/* Địa chỉ cụ thể */}
                    <div className="form-field full">
                      <label htmlFor="addr">Địa chỉ cụ thể (Số nhà, tên đường, căn hộ) <span className="req">*</span></label>
                      <input
                        id="addr"
                        type="text"
                        placeholder="Ví dụ: 560 Giải Phóng, Phường Giáp Bát"
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
                        <span>Tạo tài khoản thành viên để theo dõi đơn hàng & tích luỹ điểm?</span>
                      </label>
                    )}
                  </div>

                  {/* 2. THÔNG TIN THÊM */}
                  <div className="checkout-section">
                    <h2 className="checkout-section-header">Thông tin thêm</h2>
                    <div className="form-field full">
                      <label htmlFor="note">Lưu ý cho đơn hàng (tuỳ chọn)</label>
                      <textarea
                        id="note"
                        rows={3}
                        placeholder="Viết các lưu ý cho đơn hàng của bạn, ví dụ: lưu ý đặc biệt khi vận chuyển, thang máy chung cư, giờ nhận hàng phù hợp."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* 3. PHƯƠNG THỨC THANH TOÁN (Theo phong cách Card đối xứng trong ảnh mẫu) */}
                  <div className="checkout-section">
                    <h2 className="checkout-section-header">Phương thức thanh toán</h2>

                    <div className="payment-cards-grid">
                      {/* Thẻ 1: Chuyển khoản ngân hàng */}
                      <div
                        className={`payment-card-tab ${paymentMethod === "vietqr" ? "selected" : ""}`}
                        onClick={() => setPaymentMethod("vietqr")}
                      >
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
                        <div className="payment-card-tab-icon">
                          <CreditCard size={20} />
                        </div>
                        <span className="payment-card-tab-label">Thanh toán qua VNPAY / Thẻ</span>
                      </div>
                    </div>

                    {/* Chi tiết tài khoản ngân hàng khi chọn "Chuyển khoản ngân hàng" (chuẩn như ảnh) */}
                    {paymentMethod === "vietqr" && (
                      <div className="bank-info-box">
                        <div className="bank-info-header">
                          <Landmark size={18} className="text-[#b86b49]" />
                          <span>Ngân hàng Vietcombank</span>
                        </div>
                        <div className="bank-info-row">
                          Số tài khoản : <span className="bank-account-num">0071000745809</span>
                          <button
                            type="button"
                            className="copy-btn"
                            onClick={() => {
                              navigator.clipboard.writeText("0071000745809");
                              alert("Đã sao chép số tài khoản Vietcombank: 0071000745809");
                            }}
                          >
                            <Copy size={11} /> Sao chép
                          </button>
                        </div>
                        <div className="bank-info-row">
                          Tên chủ tài khoản:
                          <strong style={{ display: "block", color: "#1a1714", marginTop: 2 }}>
                            CT CP NOI THAT AKA VIETCOMBANK – CHI NHÁNH TP.HCM.
                          </strong>
                        </div>
                        <p style={{ margin: "10px 0 0", fontSize: 12, color: "#777", borderTop: "1px dashed #e2dbd0", paddingTop: 8 }}>
                          💡 Sau khi bấm <strong>ĐẶT MUA</strong>, hệ thống sẽ cấp mã đơn hàng riêng để quý khách điền vào nội dung chuyển khoản hoặc quét mã QR tự động.
                        </p>
                      </div>
                    )}

                    {paymentMethod === "cod" && (
                      <div className="bank-info-box" style={{ borderLeftColor: "#1a1714" }}>
                        <div className="bank-info-header">
                          <Banknote size={18} />
                          <span>Thanh toán tiền mặt khi nhận hàng (COD)</span>
                        </div>
                        <p style={{ margin: 0, fontSize: 13, color: "#555" }}>
                          Quý khách kiểm tra sản phẩm nội thất hoàn thiện và thanh toán tiền mặt trực tiếp cho nhân viên kỹ thuật giao lắp Nhà Xinh tại nhà.
                        </p>
                      </div>
                    )}

                    {paymentMethod === "vnpay" && (
                      <div className="bank-info-box" style={{ borderLeftColor: "#0284c7" }}>
                        <div className="bank-info-header">
                          <CreditCard size={18} className="text-[#0284c7]" />
                          <span>Cổng thanh toán điện tử VNPAY</span>
                        </div>
                        <p style={{ margin: 0, fontSize: 13, color: "#555" }}>
                          Hỗ trợ thanh toán nhanh bằng ứng dụng Mobile Banking quét VNPAY-QR, Thẻ ATM 40+ ngân hàng nội địa hoặc thẻ quốc tế Visa, Master, JCB an toàn tuyệt đối.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Cột Phải: Tóm tắt đơn hàng (Order Summary Sidebar) ── */}
                <aside className="checkout-summary-card">
                  <h3 className="checkout-summary-title">Tóm tắt đơn hàng</h3>

                  {/* Thành tiền */}
                  <div className="summary-line-item subtotal">
                    <span className="label-bold">Thành tiền</span>
                    <strong style={{ fontSize: "14px", color: "#1a1714" }}>{vnd(cartTotal)}</strong>
                  </div>

                  {/* Vận chuyển */}
                  <div className="summary-line-item">
                    <span className="label-bold">Vận chuyển</span>
                    <div className="shipping-desc">
                      Giao hàng & Lắp đặt tận nhà Nhà Xinh
                      <div style={{ color: shippingFee === 0 ? "#16a34a" : "#1a1714", fontWeight: 700, marginTop: 2 }}>
                        {shippingFee === 0 ? "Miễn phí (Đơn từ 5.000.000 đ)" : vnd(shippingFee)}
                      </div>
                    </div>
                  </div>

                  {/* Giảm giá (nếu có) */}
                  {discountAmount > 0 && (
                    <div className="summary-line-item" style={{ color: "#dc2626" }}>
                      <span className="label-bold" style={{ color: "#dc2626" }}>Giảm giá</span>
                      <strong>-{vnd(discountAmount)}</strong>
                    </div>
                  )}

                  {/* Tổng cộng */}
                  <div className="summary-line-item total-line">
                    <span className="total-label">Tổng cộng</span>
                    <span className="total-amount">{vnd(finalTotal)}</span>
                  </div>

                  {/* Danh sách sản phẩm */}
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
                            src={item.product.image || "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=150&q=80"}
                            alt={item.product.name}
                            className="summary-product-img"
                          />
                          <div className="summary-product-details">
                            <div className="summary-product-name">{item.product.name}</div>
                            <div className="summary-product-sub">
                              {item.variantName ? `${item.variantName} · ` : ""}Số lượng: {qty}
                            </div>
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
                    <p style={{ color: "#dc2626", fontSize: "12px", margin: "-10px 0 10px" }}>
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

                  {/* Khung Chính sách bán hàng (theo đúng ảnh mẫu) */}
                  <div className="policy-box-wrapper">
                    <div className="policy-box-header">
                      <FileText size={14} />
                      <span>Chính sách bán hàng</span>
                    </div>
                    <div className="policy-box-content">
                      <strong>1. Thanh toán</strong>
                      Nhà Xinh áp dụng hình thức chuyển khoản qua ngân hàng, thanh toán tiền mặt khi nhận hàng (COD) hoặc thanh toán online qua cổng VNPAY / thẻ tín dụng.
                      <strong>2. Giao nhận & Lắp đặt</strong>
                      Miễn phí vận chuyển và lắp ráp trọn gói tận nhà cho mọi đơn hàng từ 5.000.000 VNĐ. Kỹ thuật viên Nhà Xinh bàn giao sản phẩm chỉn chu.
                      <strong>3. Đổi trả & Bảo hành</strong>
                      Bảo hành chính hãng 24 tháng cho mọi sản phẩm nội thất và bảo trì trọn đời. Đổi trả linh hoạt trong vòng 7 ngày nếu lỗi từ nhà sản xuất.
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

                  {/* Nút ĐẶT MUA lớn (chính xác như ảnh mẫu) */}
                  <button
                    type="submit"
                    disabled={isSubmitting || hasPreorderItems}
                    className="btn-submit-order"
                  >
                    {hasPreorderItems
                      ? "Vui lòng đặt hàng qua Hotline / Zalo"
                      : isSubmitting
                      ? "Đang xử lý đơn hàng..."
                      : "Đặt mua"}
                  </button>

                  <div style={{ marginTop: 14, textAlign: "center", fontSize: "11.5px", color: "#8c857b" }}>
                    🔒 Cam kết bảo mật thanh toán SSL 256-bit chuẩn quốc tế
                  </div>
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
