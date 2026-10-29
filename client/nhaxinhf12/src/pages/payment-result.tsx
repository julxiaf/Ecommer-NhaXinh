import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle, RotateCcw, ShieldCheck } from "lucide-react";
import Header from "../components/Headers";
import Footer from "../components/Footer";
import { useStore } from "../hooks/useStore";
import { checkoutService, type OrderDetailData } from "../services/checkoutService";
import "./pages.css";
import "./checkout.css";

const vnd = (n: number) => Number(n).toLocaleString("vi-VN") + " ₫";

export default function PaymentResultPage() {
  const [searchParams] = useSearchParams();
  const { user, cart, wishlist, clearCart } = useStore();

  const rawResult = searchParams.get("result") || (searchParams.get("vnpay") === "success" ? "success" : searchParams.get("vnpay") === "failed" ? "failed" : null);
  const result = rawResult || "failed";
  const orderReference = searchParams.get("orderReference") || searchParams.get("orderCode");
  const phone = searchParams.get("phone") || undefined;

  const [order, setOrder] = useState<OrderDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (result === "pending-confirmation" || result === "success") {
      clearCart();
    }

    if (!orderReference) {
      setLoading(false);
      return;
    }

    checkoutService.getOrderDetail(orderReference, phone).then((data) => {
      setOrder(data);
      setLoading(false);
    });
  }, [orderReference, result, phone, clearCart]);

  const isSuccess = result === "pending-confirmation" || result === "success";

  const handleRetryPayment = async (method: "VNPAY" | "BANK_TRANSFER" | "CASH_ON_DELIVERY") => {
    if (!orderReference) return;
    setRetrying(true);
    const res = await checkoutService.retryPayment(orderReference, method, order?.recipientPhone);
    setRetrying(false);

    if (res.success && res.data) {
      if (res.data.paymentUrl) {
        window.location.href = res.data.paymentUrl;
      } else {
        alert("Đã cập nhật phương thức thanh toán thành công!");
        window.location.reload();
      }
    } else {
      alert(res.error || "Không thể thực hiện lại thanh toán. Vui lòng thử lại sau.");
    }
  };

  return (
    <>
      <Header user={user} cartCount={cart.reduce((s, i) => s + i.quantity, 0)} wishlistCount={wishlist.length} />

      <main className="page checkout-page page-enter">
        <div className="order-success-screen" style={{ margin: "40px auto" }}>
          {loading ? (
            <div style={{ padding: "40px 0", textAlign: "center" }}>
              <div className="admin-loading-spinner" style={{ margin: "0 auto 16px" }} />
              <p>Đang tải thông tin kết quả giao dịch...</p>
            </div>
          ) : isSuccess ? (
            <>
              <div className="order-success-icon" style={{ background: "#dcfce7", color: "#16a34a" }}>
                <CheckCircle2 size={48} />
              </div>
              <h1 className="order-success-title">Thanh toán VNPAY thành công!</h1>
              <p className="order-success-subtitle">
                Giao dịch thanh toán trực tuyến của quý khách đã được ghi nhận thành công trên hệ thống Nhà Xinh.
              </p>

              {orderReference && (
                <div className="order-code-badge">
                  Mã đơn hàng: <strong>{orderReference}</strong>
                </div>
              )}

              {order && (
                <div className="order-details-box">
                  <h4>Thông tin đơn hàng</h4>
                  <div className="order-details-row">
                    <span>Người nhận:</span>
                    <strong>{order.recipientName} - {order.recipientPhone}</strong>
                  </div>
                  <div className="order-details-row">
                    <span>Địa chỉ giao hàng:</span>
                    <strong>{order.shippingAddress}</strong>
                  </div>
                  <div className="order-details-row">
                    <span>Phương thức:</span>
                    <strong>Cổng thanh toán VNPAY</strong>
                  </div>
                  <div className="order-details-row">
                    <span>Tổng tiền thanh toán:</span>
                    <strong style={{ fontSize: "16px", color: "#16a34a" }}>{vnd(order.totalAmount)}</strong>
                  </div>
                  <div className="order-details-row">
                    <span>Trạng thái thanh toán:</span>
                    <strong style={{ color: "#16a34a" }}>Đã thanh toán / Chờ xác nhận đối soát</strong>
                  </div>
                </div>
              )}

              <div className="order-success-actions">
                <Link to="/tai-khoan" className="btn-primary" style={{ textDecoration: "none" }}>
                  Xem lịch sử đơn hàng
                </Link>
                <Link to="/san-pham" className="btn-secondary" style={{ textDecoration: "none" }}>
                  Tiếp tục mua sắm
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="order-success-icon" style={{ background: "#fee2e2", color: "#ef4444" }}>
                <XCircle size={48} />
              </div>
              <h1 className="order-success-title" style={{ color: "#b91c1c" }}>Giao dịch chưa hoàn tất</h1>
              <p className="order-success-subtitle">
                Giao dịch thanh toán qua VNPAY bị hủy hoặc không thành công. Quý khách có thể thử lại hoặc đổi phương thức thanh toán sang Chuyển khoản ngân hàng / COD.
              </p>

              {orderReference && (
                <div className="order-code-badge" style={{ background: "#fef2f2", borderColor: "#fca5a5" }}>
                  Mã đơn hàng: <strong>{orderReference}</strong>
                </div>
              )}

              <div style={{ margin: "24px 0", display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={retrying}
                  onClick={() => handleRetryPayment("VNPAY")}
                  style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
                >
                  <RotateCcw size={16} /> Thử lại qua VNPAY
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={retrying}
                  onClick={() => handleRetryPayment("BANK_TRANSFER")}
                  style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
                >
                  <ShieldCheck size={16} /> Đổi sang Chuyển khoản ngân hàng
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={retrying}
                  onClick={() => handleRetryPayment("CASH_ON_DELIVERY")}
                  style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
                >
                  Đổi sang Thanh toán khi nhận hàng (COD)
                </button>
              </div>

              <div className="order-success-actions">
                <Link to="/gio-hang" className="btn-secondary" style={{ textDecoration: "none" }}>
                  Quay lại giỏ hàng
                </Link>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
