/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useStore, isPreorderItem, getMaxStock } from "./useStore";
import { adminApi } from "../services/admin/adminService";
import { checkoutService } from "../services/checkoutService";

export type PaymentMethod = "cod" | "vnpay" | "vietqr" | "momo";
export type ShippingMethod = "standard" | "express";

export interface OrderSubmitted {
  orderCode: string;
  orderId?: number;
  customerName: string;
  phone: string;
  email?: string;
  address: string;
  paymentMethod: PaymentMethod;
  backendPaymentMethod?: string;
  paymentUrl?: string | null;
  couponCode?: string;
  discountAmount?: number;
  shippingFee?: number;
  total: number;
  date: string;
  itemsCount: number;
}

export interface VnpayNotification {
  type: "success" | "error";
  message: string;
}

const PENDING_VNPAY_KEY = "nhaxinh_pending_vnpay";

export function useCheckout() {
  const { cart, cartTotal, hasPreorderItems, preorderItems, clearCart, user, wishlist } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();

  // Xác định người mua là Customer (đã có tài khoản đăng nhập) hay Guest (khách vãng lai)
  const isCustomer = Boolean(user && user.email);
  const isGuest = !isCustomer;

  // Form State
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [email, setEmail] = useState(user?.email || "");
  const [city, setCity] = useState("Hồ Chí Minh");
  const [district, setDistrict] = useState("Quận 1");
  const [address, setAddress] = useState(user?.address || "");
  const [note, setNote] = useState("");

  // Khi có user đăng nhập (Customer), tự động đồng bộ và cố định email theo tài khoản khách hàng
  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
      if (!fullName && user.fullName) setFullName(user.fullName);
      if (!phone && user.phone) setPhone(user.phone);
      if (!address && user.address) setAddress(user.address);
    }
  }, [user]);

  // Ngăn chặn Customer sửa đổi email khi thanh toán (chỉ Guest mới được tự do nhập email)
  const handleSetEmail = (val: string) => {
    if (isCustomer && user?.email) {
      return; // Khách hàng thành viên không thể thay đổi email hóa đơn
    }
    setEmail(val);
  };

  // Shipping & Payment
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>("standard");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");

  // Voucher
  const [couponCode, setCouponCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    percent?: number;
    amount?: number;
  } | null>(null);
  const [couponError, setCouponError] = useState("");

  // Điều khoản & Tạo tài khoản
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [createAccount, setCreateAccount] = useState(false);

  // Submission & Notification state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState<OrderSubmitted | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [vnpayNotification, setVnpayNotification] = useState<VnpayNotification | null>(null);
  const [resendEmailAddress, setResendEmailAddress] = useState("");
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [emailNotificationMsg, setEmailNotificationMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Tính toán phí vận chuyển
  const shippingFee =
    shippingMethod === "express" ? 300000 : cartTotal >= 5000000 ? 0 : 150000;

  // Tính toán giảm giá
  let discountAmount = 0;
  if (appliedDiscount) {
    if (appliedDiscount.percent) {
      discountAmount = Math.round((cartTotal * appliedDiscount.percent) / 100);
    } else if (appliedDiscount.amount) {
      discountAmount = appliedDiscount.amount;
    }
  }

  const finalTotal = Math.max(0, cartTotal + shippingFee - discountAmount);

  // Xử lý khi người dùng quay lại từ cổng thanh toán VNPAY (/thanh-toan?vnpay=success|failed)
  useEffect(() => {
    const vnpayStatus = searchParams.get("vnpay");
    if (!vnpayStatus) return;

    const savedDraftRaw = sessionStorage.getItem(PENDING_VNPAY_KEY);
    let savedDraft: any = null;
    if (savedDraftRaw) {
      try {
        savedDraft = JSON.parse(savedDraftRaw);
      } catch {
        // Bỏ qua lỗi parse
      }
    }

    if (vnpayStatus === "failed") {
      if (savedDraft) {
        if (savedDraft.fullName) setFullName(savedDraft.fullName);
        if (savedDraft.phone) setPhone(savedDraft.phone);
        if (savedDraft.email) setEmail(savedDraft.email);
        if (savedDraft.city) setCity(savedDraft.city);
        if (savedDraft.district) setDistrict(savedDraft.district);
        if (savedDraft.address) setAddress(savedDraft.address);
        if (savedDraft.note) setNote(savedDraft.note);
        if (savedDraft.shippingMethod) setShippingMethod(savedDraft.shippingMethod);
        if (savedDraft.couponCode) setCouponCode(savedDraft.couponCode);
        if (savedDraft.appliedDiscount) setAppliedDiscount(savedDraft.appliedDiscount);
      }
      setPaymentMethod("vnpay");
      setVnpayNotification({
        type: "error",
        message:
          "Thanh toán VNPAY không thành công hoặc đã bị hủy. Đơn hàng chưa được tạo, quý khách vui lòng kiểm tra lại và thử thanh toán lại hoặc chọn phương thức thanh toán khác.",
      });
      setSearchParams({}, { replace: true });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (vnpayStatus === "success") {
      const orderCode = searchParams.get("orderCode") || savedDraft?.orderCode || "";
      const orderPhone = searchParams.get("phone") || savedDraft?.phone || phone;

      setVnpayNotification({
        type: "success",
        message:
          "Thanh toán VNPAY thành công! Đơn hàng và giao dịch thanh toán của quý khách đã được ghi nhận.",
      });
      sessionStorage.removeItem(PENDING_VNPAY_KEY);
      clearCart();
      setSearchParams({}, { replace: true });

      void (async () => {
        const detail = orderCode
          ? await checkoutService.getOrderDetail(orderCode, orderPhone || undefined)
          : null;

        const resolvedVnpayEmail =
          detail?.recipientEmail || savedDraft?.email || email.trim() || user?.email || "";
        const order: OrderSubmitted = {
          orderCode: detail?.orderCode || orderCode || "NX-VNPAY",
          orderId: detail?.id,
          customerName:
            detail?.recipientName || savedDraft?.fullName || fullName || "Quý khách",
          phone: detail?.recipientPhone || orderPhone || "",
          email: resolvedVnpayEmail || undefined,
          address:
            detail?.shippingAddress ||
            savedDraft?.fullShippingAddress ||
            `${address}, ${district}, ${city}`,
          paymentMethod: "vnpay",
          backendPaymentMethod: "VNPAY",
          couponCode: detail?.couponCode || savedDraft?.couponCode,
          discountAmount:
            detail?.discountAmount !== undefined
              ? Number(detail.discountAmount)
              : savedDraft?.discountAmount,
          shippingFee:
            detail?.shippingFee !== undefined
              ? Number(detail.shippingFee)
              : savedDraft?.shippingFee,
          total: detail?.totalAmount
            ? Number(detail.totalAmount)
            : savedDraft?.total || finalTotal,
          date: detail?.createdAt
            ? new Date(detail.createdAt).toLocaleString("vi-VN")
            : new Date().toLocaleString("vi-VN"),
          itemsCount: detail?.items
            ? detail.items.reduce((s, i) => s + i.quantity, 0)
            : savedDraft?.itemsCount || 1,
        };
        setSubmittedOrder(order);
        setResendEmailAddress(resolvedVnpayEmail);
        if (resolvedVnpayEmail) {
          setEmailNotificationMsg({
            type: "success",
            text: `Thông báo xác nhận đơn hàng & hóa đơn điện tử đã được gửi tới email ${resolvedVnpayEmail}.`,
          });
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
      })();
    }
  }, [searchParams]);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const code = couponCode.trim().toUpperCase();
    setCouponError("");

    if (!code) {
      setCouponError("Vui lòng nhập mã giảm giá.");
      return;
    }

    void (async () => {
      const apiRes = await checkoutService.validateCoupon(code, cartTotal, shippingFee);
      if (apiRes.valid && apiRes.discountAmount !== undefined) {
        setAppliedDiscount({
          code: apiRes.code || code,
          amount: apiRes.discountAmount,
        });
        return;
      }

      if (apiRes.error && apiRes.error !== "OFFLINE") {
        setAppliedDiscount(null);
        setCouponError(apiRes.error);
        return;
      }

      // Fallback offline cho các mã mặc định
      if (code === "NHAXINH10") {
        setAppliedDiscount({ code: "NHAXINH10", percent: 10 });
      } else if (code === "FREESHIP") {
        setAppliedDiscount({ code: "FREESHIP", amount: shippingFee > 0 ? shippingFee : 150000 });
      } else if (code === "VIP500") {
        setAppliedDiscount({ code: "VIP500", amount: 500000 });
      } else {
        setAppliedDiscount(null);
        setCouponError("Mã giảm giá không hợp lệ hoặc đã hết hạn.");
      }
    })();
  };

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();

    if (!agreeTerms) {
      alert("Quý khách vui lòng đọc và tích chọn đồng ý với điều kiện đổi trả và chính sách bán hàng của Nhà Xinh trước khi đặt mua!");
      return;
    }

    if (hasPreorderItems) {
      alert("Đơn hàng của bạn có chứa sản phẩm Đặt Trước (Pre-order). Vui lòng liên hệ nhân viên tư vấn qua Zalo hoặc Hotline để xác nhận, không thể thanh toán trực tuyến tự động!");
      return;
    }

    // Kiểm tra từng sản phẩm có vượt tồn kho hay không
    for (const item of cart) {
      const isPre = isPreorderItem(item.product);
      const effectiveVariantId = item.variantId ?? item.product.variantId;
      const max = getMaxStock(item.product, effectiveVariantId);
      const itemQty = item.qty || item.quantity;
      if (!isPre && itemQty > max) {
        alert(`Sản phẩm '${item.product.name}' có số lượng (${itemQty}) vượt quá tồn kho khả dụng (${max}). Vui lòng điều chỉnh lại giỏ hàng trước khi đặt hàng!`);
        return;
      }
    }

    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim();
    const trimmedAddress = address.trim();

    if (!trimmedName || !trimmedPhone || !trimmedAddress) {
      alert("Vui lòng điền đầy đủ họ tên, số điện thoại và địa chỉ giao hàng!");
      return;
    }

    const vnPhoneRegex = /^(0[35789])[0-9]{8}$/;
    if (!vnPhoneRegex.test(trimmedPhone)) {
      alert(
        "Số điện thoại không hợp lệ. Vui lòng nhập số di động 10 số (bắt đầu bằng 03, 05, 07, 08, 09)!"
      );
      return;
    }

    const fullShippingAddress = `${trimmedAddress}, ${district}, ${city}`;
    if (fullShippingAddress.length < 12) {
      alert("Địa chỉ giao hàng quá ngắn. Vui lòng nhập chi tiết số nhà, tên đường!");
      return;
    }

    let backendPaymentMethod: "CASH_ON_DELIVERY" | "BANK_TRANSFER" | "VNPAY" =
      "CASH_ON_DELIVERY";
    if (paymentMethod === "vnpay") {
      backendPaymentMethod = "VNPAY";
    } else if (paymentMethod === "vietqr" || paymentMethod === "momo") {
      backendPaymentMethod = "BANK_TRANSFER";
    }

    setIsSubmitting(true);

    const effectiveEmail = (isCustomer && user?.email ? user.email.trim() : email.trim()) || undefined;

    void (async () => {
      try {
        const checkoutRes = await checkoutService.processCheckout(
          {
            recipientName: trimmedName,
            recipientPhone: trimmedPhone,
            recipientEmail: effectiveEmail,
            shippingAddress: fullShippingAddress,
            paymentMethod: backendPaymentMethod,
            customerNote: note.trim() || undefined,
            couponCode: appliedDiscount?.code || undefined,
            shippingFee,
          },
          cart
        );

        if (!checkoutRes.success || !checkoutRes.data) {
          alert(checkoutRes.error || "Thanh toán không thành công. Vui lòng thử lại!");
          setIsSubmitting(false);
          return;
        }

        const data = checkoutRes.data;
        const realOrderCode = data.orderCode;
        const createdAt = new Date().toLocaleString("vi-VN");

        // Nếu là VNPAY: Chuyển hướng đến URL thanh toán VNPAY mà CHƯA xóa giỏ hàng (chỉ tạo Order & Payment khi VNPAY báo thành công)
        if (backendPaymentMethod === "VNPAY") {
          if (data.paymentUrl) {
            sessionStorage.setItem(
              PENDING_VNPAY_KEY,
              JSON.stringify({
                orderCode: realOrderCode,
                fullName: trimmedName,
                phone: trimmedPhone,
                email: effectiveEmail || "",
                city,
                district,
                address: trimmedAddress,
                fullShippingAddress,
                note: note.trim(),
                shippingMethod,
                couponCode: appliedDiscount?.code,
                appliedDiscount,
                discountAmount,
                shippingFee,
                total: data.totalAmount ? Number(data.totalAmount) : finalTotal,
                itemsCount: cart.reduce((sum, item) => sum + item.qty, 0),
              })
            );
            window.location.assign(data.paymentUrl);
            return;
          } else {
            alert(
              "Cổng thanh toán VNPay tạm thời chưa sẵn sàng hoặc không thể khởi tạo giao dịch."
            );
            setIsSubmitting(false);
            return;
          }
        }

        // Lưu vết admin local (nếu dùng dashboard offline)
        try {
          const orderItems = cart.map(({ product, quantity }) => ({
            productId: product.id,
            name: product.name,
            image: product.image,
            price: product.price,
            quantity,
          }));
          await adminApi.createOrder(
            {
              orderCode: realOrderCode,
              customerName: trimmedName,
              phone: trimmedPhone,
              email: email || "",
              address: fullShippingAddress,
              total: data.totalAmount ? Number(data.totalAmount) : finalTotal,
              paymentMethod,
              paymentStatus: "pending",
              status: "pending",
              createdAt,
              items: orderItems,
              note: note.trim() || undefined,
            },
            {
              name: trimmedName,
              email: email || undefined,
              role: "Khách hàng",
            }
          );
        } catch {
          // Bỏ qua lỗi phụ
        }

        const resolvedOrderEmail = email.trim() || user?.email || "";
        const order: OrderSubmitted = {
          orderCode: realOrderCode,
          orderId: data.orderId,
          customerName: trimmedName,
          phone: trimmedPhone,
          email: resolvedOrderEmail || undefined,
          address: fullShippingAddress,
          paymentMethod,
          backendPaymentMethod: data.paymentMethod,
          paymentUrl: data.paymentUrl,
          couponCode: appliedDiscount?.code,
          discountAmount,
          shippingFee,
          total: data.totalAmount ? Number(data.totalAmount) : finalTotal,
          date: createdAt,
          itemsCount: cart.reduce((sum, item) => sum + item.qty, 0),
        };

        setSubmittedOrder(order);
        setResendEmailAddress(resolvedOrderEmail);
        if (resolvedOrderEmail) {
          setEmailNotificationMsg({
            type: "success",
            text: `Thông báo xác nhận đơn hàng & hóa đơn điện tử đã được gửi tới email ${resolvedOrderEmail}.`,
          });
        }
        clearCart();
        setIsSubmitting(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch (error: any) {
        console.error("Không thể tạo đơn hàng:", error);
        alert(error?.message || "Không thể lưu đơn hàng. Vui lòng thử lại.");
        setIsSubmitting(false);
      }
    })();
  };

  const handleResendOrderEmail = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!submittedOrder) return;
    const targetEmail = (resendEmailAddress || submittedOrder.email || "").trim();
    if (!targetEmail || !targetEmail.includes("@")) {
      setEmailNotificationMsg({
        type: "error",
        text: "Vui lòng nhập địa chỉ Email hợp lệ để nhận thông báo đơn hàng.",
      });
      return;
    }

    setIsResendingEmail(true);
    setEmailNotificationMsg(null);
    void (async () => {
      const res = await checkoutService.resendOrderEmail(submittedOrder.orderCode, targetEmail);
      setIsResendingEmail(false);
      if (res.success) {
        setSubmittedOrder((prev) => (prev ? { ...prev, email: targetEmail } : prev));
        setEmailNotificationMsg({
          type: "success",
          text:
            res.message ||
            `Đã gửi thông báo đơn hàng #${submittedOrder.orderCode} tới email ${targetEmail}.`,
        });
      } else {
        setEmailNotificationMsg({
          type: "error",
          text: res.error || "Không thể gửi thông báo email lúc này. Vui lòng thử lại sau.",
        });
      }
    })();
  };

  const copyOrderCode = () => {
    if (submittedOrder) {
      navigator.clipboard?.writeText(submittedOrder.orderCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return {
    // Store data
    cart,
    cartTotal,
    hasPreorderItems,
    preorderItems,
    user,
    wishlist,
    // Customer vs Guest status
    isCustomer,
    isGuest,
    // Form state & setters
    fullName,
    setFullName,
    phone,
    setPhone,
    email,
    setEmail: handleSetEmail,
    city,
    setCity,
    district,
    setDistrict,
    address,
    setAddress,
    note,
    setNote,
    // Shipping & Payment
    shippingMethod,
    setShippingMethod,
    paymentMethod,
    setPaymentMethod,
    // Voucher
    couponCode,
    setCouponCode,
    appliedDiscount,
    setAppliedDiscount,
    couponError,
    agreeTerms,
    setAgreeTerms,
    createAccount,
    setCreateAccount,
    // Calculated amounts
    shippingFee,
    discountAmount,
    finalTotal,
    // Submission & Notification
    isSubmitting,
    submittedOrder,
    copiedCode,
    vnpayNotification,
    setVnpayNotification,
    resendEmailAddress,
    setResendEmailAddress,
    isResendingEmail,
    emailNotificationMsg,
    // Handlers
    handleApplyCoupon,
    handleSubmitOrder,
    handleResendOrderEmail,
    copyOrderCode,
  };
}

