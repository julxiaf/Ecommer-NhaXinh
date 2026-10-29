import { useState, useMemo } from "react";
import type { AdminOrder, RoleDefinition, OrderStatusHistory } from "../../services/admin/types";
import { adminApi } from "../../services/admin/adminService";
import { checkoutService } from "../../services/checkoutService";
import { usePagination } from "../usePagination";

interface UseAdminOrdersParams {
  orders: AdminOrder[];
  currentRole: RoleDefinition;
  onUpdateStatus: (orderId: string, newStatus: AdminOrder["status"], note?: string) => Promise<void> | void;
  onConfirmPayment: (orderId: string, paymentStatus?: string, paymentMethod?: string, note?: string) => Promise<void>;
  onUpdateShipping?: (
    orderId: string,
    data: { recipientName: string; recipientPhone: string; shippingAddress: string; customerNote?: string }
  ) => Promise<void>;
  onCancelOrder?: (orderId: string, reason: string) => Promise<void>;
  onRefreshOrders?: () => Promise<void>;
}

export function useAdminOrders({
  orders,
  currentRole,
  onUpdateStatus,
  onConfirmPayment,
  onUpdateShipping,
  onCancelOrder,
  onRefreshOrders,
}: UseAdminOrdersParams) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AdminOrder["status"]>("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");

  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [newStatus, setNewStatus] = useState<AdminOrder["status"]>("pending");
  const [statusNote, setStatusNote] = useState("");
  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);

  const [paymentStatusInput, setPaymentStatusInput] = useState<string>("paid");
  const [paymentMethodInput, setPaymentMethodInput] = useState<string>("cod");
  const [paymentNote, setPaymentNote] = useState("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  const [isEditingShipping, setIsEditingShipping] = useState(false);
  const [shippingForm, setShippingForm] = useState({
    recipientName: "",
    recipientPhone: "",
    shippingAddress: "",
    customerNote: "",
  });
  const [isSubmittingShipping, setIsSubmittingShipping] = useState(false);

  const [cancelModalOrder, setCancelModalOrder] = useState<AdminOrder | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);
  const [isSendingOrderEmail, setIsSendingOrderEmail] = useState(false);

  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchStatus = statusFilter === "all" || o.status === statusFilter;
      const matchPayStatus =
        paymentStatusFilter === "all" ||
        (o.paymentStatus || "unpaid").toLowerCase() === paymentStatusFilter.toLowerCase();
      const matchPayMethod =
        paymentMethodFilter === "all" ||
        (o.paymentMethod || "").toLowerCase() === paymentMethodFilter.toLowerCase();
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        o.orderCode.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.phone.includes(q) ||
        (o.address && o.address.toLowerCase().includes(q));
      return matchStatus && matchPayStatus && matchPayMethod && matchSearch;
    });
  }, [orders, statusFilter, paymentStatusFilter, paymentMethodFilter, search]);

  const pagination = usePagination(filteredOrders, 10, [
    statusFilter,
    paymentStatusFilter,
    paymentMethodFilter,
    search,
  ]);

  const sortedStatusHistory = useMemo(() => {
    if (!selectedOrder?.statusHistory || selectedOrder.statusHistory.length === 0) return [];
    return [...selectedOrder.statusHistory].sort((a, b) => {
      const numA = Number(a.id);
      const numB = Number(b.id);
      if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
        return numB - numA;
      }
      const parseDate = (ts?: string) => {
        if (!ts) return 0;
        const parts = ts.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
        if (parts) {
          return new Date(Number(parts[3]), Number(parts[2]) - 1, Number(parts[1]), Number(parts[4]), Number(parts[5])).getTime();
        }
        const parsed = Date.parse(ts);
        return isNaN(parsed) ? 0 : parsed;
      };
      return parseDate(b.timestamp) - parseDate(a.timestamp);
    });
  }, [selectedOrder]);

  const handleRefresh = async () => {
    if (!onRefreshOrders) return;
    setIsRefreshing(true);
    try {
      await onRefreshOrders();
      showToast("Đã làm mới danh sách đơn hàng từ máy chủ");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Làm mới đơn hàng thất bại", "error");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleOpenDetail = async (order: AdminOrder) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
    setStatusNote("");
    setPaymentStatusInput(order.paymentStatus || "paid");
    setPaymentMethodInput(order.paymentMethod || "cod");
    setPaymentNote("");
    setIsEditingShipping(false);
    setShippingForm({
      recipientName: order.customerName || "",
      recipientPhone: order.phone || "",
      shippingAddress: order.address || "",
      customerNote: order.note || "",
    });

    setIsLoadingDetail(true);
    try {
      const fullDetail = await adminApi.getOrderDetail(order.id);
      setSelectedOrder(fullDetail);
      setNewStatus(fullDetail.status);
      if (fullDetail.paymentStatus) setPaymentStatusInput(fullDetail.paymentStatus);
      if (fullDetail.paymentMethod) setPaymentMethodInput(fullDetail.paymentMethod);
      setShippingForm({
        recipientName: fullDetail.customerName || "",
        recipientPhone: fullDetail.phone || "",
        shippingAddress: fullDetail.address || "",
        customerNote: fullDetail.note || "",
      });
    } catch (e) {
      console.warn("Không thể tải chi tiết đơn hàng bổ sung:", e);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleApplyStatusChange = async () => {
    if (!selectedOrder) return;
    setIsSubmittingStatus(true);
    try {
      await onUpdateStatus(selectedOrder.id, newStatus as AdminOrder["status"], statusNote.trim() || undefined);
      showToast(`Đã cập nhật trạng thái đơn #${selectedOrder.orderCode} sang ${newStatus.toUpperCase()}`);

      const updatedHistory: OrderStatusHistory = {
        id: `hist-${Date.now()}`,
        status: newStatus as AdminOrder["status"],
        timestamp: new Date().toLocaleString("vi-VN"),
        updatedBy: currentRole.name,
        note: statusNote.trim() || `Đổi trạng thái sang ${newStatus}`,
      };
      setSelectedOrder({
        ...selectedOrder,
        status: newStatus as AdminOrder["status"],
        statusHistory: [updatedHistory, ...(selectedOrder.statusHistory || [])],
      });
      setStatusNote("");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Cập nhật trạng thái thất bại", "error");
    } finally {
      setIsSubmittingStatus(false);
    }
  };

  const handleApplyPaymentChange = async () => {
    if (!selectedOrder) return;
    setIsSubmittingPayment(true);
    try {
      await onConfirmPayment(selectedOrder.id, paymentStatusInput, paymentMethodInput, paymentNote.trim() || undefined);
      showToast(`Đã cập nhật thanh toán đơn #${selectedOrder.orderCode}: ${paymentMethodInput.toUpperCase()} - ${paymentStatusInput.toUpperCase()}`);
      setSelectedOrder({
        ...selectedOrder,
        paymentStatus: paymentStatusInput as AdminOrder["paymentStatus"],
        paymentMethod: paymentMethodInput as AdminOrder["paymentMethod"],
      });
      setPaymentNote("");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Cập nhật thanh toán thất bại", "error");
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleSaveShipping = async () => {
    if (!selectedOrder || !onUpdateShipping) return;
    if (!shippingForm.recipientName.trim()) {
      showToast("Tên người nhận không được để trống", "error");
      return;
    }
    if (!shippingForm.recipientPhone.trim()) {
      showToast("Số điện thoại người nhận không được để trống", "error");
      return;
    }
    if (!shippingForm.shippingAddress.trim()) {
      showToast("Địa chỉ giao hàng không được để trống", "error");
      return;
    }

    setIsSubmittingShipping(true);
    try {
      await onUpdateShipping(selectedOrder.id, shippingForm);
      showToast(`Đã cập nhật thông tin giao hàng đơn #${selectedOrder.orderCode}`);
      setSelectedOrder({
        ...selectedOrder,
        customerName: shippingForm.recipientName.trim(),
        phone: shippingForm.recipientPhone.trim(),
        address: shippingForm.shippingAddress.trim(),
        note: shippingForm.customerNote.trim() || undefined,
      });
      setIsEditingShipping(false);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Cập nhật thông tin giao hàng thất bại", "error");
    } finally {
      setIsSubmittingShipping(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelModalOrder || !onCancelOrder) return;
    if (!cancelReason.trim()) {
      showToast("Vui lòng nhập lý do hủy đơn hàng", "error");
      return;
    }

    setIsSubmittingCancel(true);
    try {
      await onCancelOrder(cancelModalOrder.id, cancelReason.trim());
      showToast(`Đã hủy đơn hàng #${cancelModalOrder.orderCode} thành công`);
      if (selectedOrder && selectedOrder.id === cancelModalOrder.id) {
        setSelectedOrder({
          ...selectedOrder,
          status: "cancelled",
        });
      }
      setCancelModalOrder(null);
      setCancelReason("");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Hủy đơn hàng thất bại", "error");
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  const handleSendOrderEmail = async () => {
    if (!selectedOrder) return;
    let targetEmail = selectedOrder.email?.trim() || "";
    if (!targetEmail) {
      const input = window.prompt(
        `Nhập địa chỉ Email khách hàng để gửi thông báo đơn hàng #${selectedOrder.orderCode}:`,
        ""
      );
      if (!input || !input.trim()) return;
      targetEmail = input.trim();
    }

    setIsSendingOrderEmail(true);
    try {
      const res = await checkoutService.resendOrderEmail(selectedOrder.orderCode, targetEmail);
      if (res.success) {
        setSelectedOrder({ ...selectedOrder, email: targetEmail });
        showToast(res.message || `Đã gửi thông báo đơn hàng tới ${targetEmail}`);
      } else {
        showToast(res.error || "Không thể gửi thông báo Email", "error");
      }
    } finally {
      setIsSendingOrderEmail(false);
    }
  };

  return {
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    paymentStatusFilter,
    setPaymentStatusFilter,
    paymentMethodFilter,
    setPaymentMethodFilter,
    filteredOrders,
    pagination,
    selectedOrder,
    setSelectedOrder,
    isLoadingDetail,
    isRefreshing,
    newStatus,
    setNewStatus,
    statusNote,
    setStatusNote,
    isSubmittingStatus,
    paymentStatusInput,
    setPaymentStatusInput,
    paymentMethodInput,
    setPaymentMethodInput,
    paymentNote,
    setPaymentNote,
    isSubmittingPayment,
    isEditingShipping,
    setIsEditingShipping,
    shippingForm,
    setShippingForm,
    isSubmittingShipping,
    cancelModalOrder,
    setCancelModalOrder,
    cancelReason,
    setCancelReason,
    isSubmittingCancel,
    isSendingOrderEmail,
    toast,
    setToast,
    sortedStatusHistory,
    handleRefresh,
    handleOpenDetail,
    handleApplyStatusChange,
    handleApplyPaymentChange,
    handleSaveShipping,
    handleConfirmCancel,
    handleSendOrderEmail,
  };
}

