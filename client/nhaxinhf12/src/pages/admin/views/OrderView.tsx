import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  ShoppingCart, Search, Eye, Printer, CheckCircle2,
  Clock, XCircle, Package, Phone, MapPin, CreditCard,
  Send, AlertCircle, RotateCw, Edit3, Save, Trash2, Mail, X,
  FileSpreadsheet, Plus, Minus, Receipt, FilePlus, User
} from "lucide-react";
import type { AdminOrder, AdminOrderItem, AdminProduct, RoleDefinition } from "../../../services/admin/types";
import PermissionGate, { hasPermission } from "../../../components/admin/PermissionGate";
import { AdminPagination } from "../../../components/admin/AdminPagination";
import { useAdminOrders } from "../../../hooks/admin/useAdminOrders";
import { vnd } from "../../../util/Constain";
import { exportOrdersToExcel } from "../../../util/excelExport";
import { resolveProductImage } from "../../../services/productService";

interface OrderViewProps {
  orders: AdminOrder[];
  products?: AdminProduct[];
  currentRole: RoleDefinition;
  currentUserName?: string;
  onUpdateStatus: (orderId: string, newStatus: AdminOrder["status"], note?: string) => Promise<AdminOrder | void> | void;
  onConfirmPayment: (orderId: string, paymentStatus?: string, paymentMethod?: string, note?: string) => Promise<AdminOrder | void>;
  onUpdateShipping?: (
    orderId: string,
    data: { recipientName: string; recipientPhone: string; shippingAddress: string; customerNote?: string }
  ) => Promise<AdminOrder | void>;
  onCancelOrder?: (orderId: string, reason: string) => Promise<AdminOrder | void>;
  onDeleteOrder?: (orderId: string) => Promise<void> | void;
  onRestoreOrder?: (orderId: string) => Promise<void> | void;
  onRefreshOrders?: () => Promise<void>;
  onCreateOrder?: (order: Omit<AdminOrder, "id" | "statusHistory">) => Promise<AdminOrder | void> | void;
}

export default function OrderView({
  orders,
  products = [],
  currentRole,
  currentUserName,
  onUpdateStatus,
  onConfirmPayment,
  onUpdateShipping,
  onCancelOrder,
  onDeleteOrder,
  onRestoreOrder,
  onRefreshOrders,
  onCreateOrder,
}: OrderViewProps) {
  const {
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
    handleDeleteOrder,
    handleRestoreOrder,
    handleSendOrderEmail,
  } = useAdminOrders({
    orders,
    currentRole,
    onUpdateStatus,
    onConfirmPayment,
    onUpdateShipping,
    onCancelOrder,
    onDeleteOrder,
    onRestoreOrder,
    onRefreshOrders,
  });

  const { paginatedItems: displayedOrders } = pagination;

  // ── Modal Tạo hóa đơn bán hàng tại quầy (Create Invoice Modal State) ──
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [invCustomerName, setInvCustomerName] = useState("");
  const [invPhone, setInvPhone] = useState("");
  const [invEmail, setInvEmail] = useState("");
  const [invAddress, setInvAddress] = useState("");
  const [invNote, setInvNote] = useState("");
  const [invPaymentMethod, setInvPaymentMethod] = useState<AdminOrder["paymentMethod"]>("cod");
  const [invPaymentStatus, setInvPaymentStatus] = useState<"pending" | "paid">("paid");
  const [invShippingFee, setInvShippingFee] = useState<number>(0);
  const [invDiscountAmount, setInvDiscountAmount] = useState<number>(0);
  const [invItems, setInvItems] = useState<AdminOrderItem[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [invError, setInvError] = useState("");
  const [isSubmittingInvoice, setIsSubmittingInvoice] = useState(false);

  // ── Khách hàng đã có trên hệ thống (Trích xuất & Tổng hợp từ lịch sử đơn hàng) ──
  const [customerMode, setCustomerMode] = useState<"existing" | "new">("existing");
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<{
    name: string;
    phone: string;
    email: string;
    address: string;
    ordersCount: number;
    totalSpent: number;
  } | null>(null);

  const systemCustomers = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        phone: string;
        email: string;
        address: string;
        ordersCount: number;
        totalSpent: number;
      }
    >();

    for (const ord of orders) {
      const phoneKey = (ord.phone || "").trim().replace(/[^0-9]/g, "");
      const emailKey = (ord.email || "").trim().toLowerCase();
      const key = phoneKey || emailKey || (ord.customerName || "").trim().toLowerCase();
      if (!key) continue;

      const existing = map.get(key);
      if (existing) {
        existing.ordersCount += 1;
        existing.totalSpent += Number(ord.total) || 0;
        if (!existing.address && ord.address) existing.address = ord.address;
        if (!existing.email && ord.email) existing.email = ord.email;
        if ((!existing.name || existing.name === "Khách hàng") && ord.customerName) {
          existing.name = ord.customerName;
        }
      } else {
        map.set(key, {
          name: ord.customerName || "Khách hàng",
          phone: ord.phone || "",
          email: ord.email || "",
          address: ord.address || "",
          ordersCount: 1,
          totalSpent: Number(ord.total) || 0,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.ordersCount - a.ordersCount);
  }, [orders]);

  const matchedCustomers = useMemo(() => {
    const q = customerSearchQuery.trim().toLowerCase();
    if (!q) return systemCustomers.slice(0, 6);
    return systemCustomers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.address.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [systemCustomers, customerSearchQuery]);

  const handleSelectCustomer = (cust: (typeof systemCustomers)[0]) => {
    setSelectedCustomer(cust);
    setInvCustomerName(cust.name);
    setInvPhone(cust.phone);
    setInvEmail(cust.email);
    setInvAddress(cust.address || "Nhận tại showroom Nhà Xinh");
    setCustomerSearchQuery("");
  };

  const handleClearSelectedCustomer = () => {
    setSelectedCustomer(null);
    setInvCustomerName("");
    setInvPhone("");
    setInvEmail("");
    setInvAddress("");
  };

  // Tính toán tài chính cho hóa đơn mới
  const invSubtotal = useMemo(
    () => invItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [invItems]
  );
  const invTotal = Math.max(0, invSubtotal + Number(invShippingFee || 0) - Number(invDiscountAmount || 0));

  // Danh sách sản phẩm gợi ý tìm kiếm
  const availableProducts = useMemo(() => {
    if (!products || products.length === 0) return [];
    const q = productSearch.toLowerCase().trim();
    if (!q) return products.filter((p) => !p.isDeleted).slice(0, 6);
    return products
      .filter(
        (p) =>
          !p.isDeleted &&
          (p.name.toLowerCase().includes(q) ||
            p.slug.toLowerCase().includes(q) ||
            p.category?.toLowerCase().includes(q) ||
            p.variants?.some((v) => v.sku.toLowerCase().includes(q)))
      )
      .slice(0, 10);
  }, [products, productSearch]);

  const handleAddItemToInvoice = (prod: AdminProduct, variant?: AdminProduct["variants"][0]) => {
    // 1. Kiểm tra sản phẩm ngừng kinh doanh hoặc bản nháp
    if (prod.isDeleted || prod.status === "draft") {
      setInvError(`Sản phẩm "${prod.name}" đang ngừng kinh doanh hoặc ở trạng thái nháp. Không thể đưa vào hóa đơn.`);
      return;
    }

    // 2. Kiểm tra hàng đặt trước (pre-order)
    const isPreorder = Boolean(
      (prod.status as string) === "preorder" ||
      prod.name.toLowerCase().includes("pre-order") ||
      prod.name.toLowerCase().includes("đặt trước")
    );

    // 3. Kiểm tra tồn kho đối với hàng thương mại thông thường
    const currentStock = variant ? variant.stock : prod.stock;
    if (!isPreorder && currentStock <= 0) {
      setInvError(`Sản phẩm/Biến thể "${variant ? variant.sku : prod.name}" hiện đã hết hàng trong kho.`);
      return;
    }

    setInvError("");
    setInvItems((prev) => {
      const sku = variant ? variant.sku : `${prod.slug.toUpperCase().slice(0, 8)}-STD`;
      const existingIndex = prev.findIndex(
        (it) => it.productId === prod.id && it.variantSku === sku
      );
      if (existingIndex > -1) {
        if (!isPreorder && prev[existingIndex].quantity >= currentStock) {
          setInvError(`Số lượng vượt quá tồn kho khả dụng (${currentStock} món).`);
          return prev;
        }
        return prev.map((it, idx) =>
          idx === existingIndex ? { ...it, quantity: it.quantity + 1 } : it
        );
      }

      const itemPrice = variant ? variant.price : prod.price;
      const variantDescParts = [variant?.color, variant?.size, variant?.material].filter(Boolean);
      if (isPreorder) {
        variantDescParts.push("Hàng đặt trước (Pre-order) - Giao sau 15-30 ngày");
      }

      const itemName = isPreorder && !prod.name.includes("[Đặt trước]")
        ? `[Đặt trước] ${prod.name}`
        : prod.name;

      return [
        ...prev,
        {
          productId: prod.id,
          name: itemName,
          variantSku: sku,
          variantDetails: variantDescParts.length > 0 ? variantDescParts.join(" · ") : undefined,
          image: prod.image || resolveProductImage("", prod.name, prod.category).img1,
          price: itemPrice,
          quantity: 1,
        },
      ];
    });
  };

  const handleUpdateItemQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      setInvItems((prev) => prev.filter((_, idx) => idx !== index));
    } else {
      setInvItems((prev) =>
        prev.map((it, idx) => (idx === index ? { ...it, quantity: newQty } : it))
      );
    }
  };

  const handleRemoveItem = (index: number) => {
    setInvItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleOpenCreateInvoice = () => {
    setCustomerMode(systemCustomers.length > 0 ? "existing" : "new");
    setSelectedCustomer(null);
    setCustomerSearchQuery("");
    setInvCustomerName("");
    setInvPhone("");
    setInvEmail("");
    setInvAddress("Nhận trực tiếp tại showroom Nhà Xinh");
    setInvNote("Tạo hóa đơn bán hàng tại quầy.");
    setInvPaymentMethod("cod");
    setInvPaymentStatus("paid");
    setInvShippingFee(0);
    setInvDiscountAmount(0);
    setInvItems([]);
    setProductSearch("");
    setInvError("");
    setShowCreateModal(true);
  };

  const handleSubmitInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invCustomerName.trim()) {
      setInvError("Vui lòng nhập họ tên khách hàng.");
      return;
    }
    if (!invPhone.trim()) {
      setInvError("Vui lòng nhập số điện thoại khách hàng.");
      return;
    }
    if (invItems.length === 0) {
      setInvError("Vui lòng thêm ít nhất một sản phẩm vào hóa đơn.");
      return;
    }

    setInvError("");
    setIsSubmittingInvoice(true);

    try {
      const orderCode = `NX-HD-${Date.now().toString().slice(-6)}`;
      const creator = currentUserName || currentRole.name || "Quản trị viên";
      const newOrderPayload: Omit<AdminOrder, "id" | "statusHistory"> = {
        orderCode,
        customerName: invCustomerName.trim(),
        phone: invPhone.trim(),
        email: invEmail.trim() || `${invPhone.trim()}@guest.nhaxinh.com`,
        address: invAddress.trim() || "Nhận trực tiếp tại showroom",
        subtotal: invSubtotal,
        discountAmount: Number(invDiscountAmount || 0),
        shippingFee: Number(invShippingFee || 0),
        total: invTotal,
        paymentMethod: invPaymentMethod,
        paymentStatus: invPaymentStatus,
        status: invPaymentStatus === "paid" ? "confirmed" : "pending",
        createdAt: new Date().toLocaleString("vi-VN"),
        items: invItems,
        note: invNote.trim() || undefined,
        createdBy: creator,
      };

      if (onCreateOrder) {
        await onCreateOrder(newOrderPayload);
      }
      setShowCreateModal(false);
      setToast({
        type: "success",
        message: `Đã tạo hóa đơn #${orderCode} thành công với tổng giá trị ${vnd(invTotal)}.`,
      });
    } catch (err) {
      setInvError(err instanceof Error ? err.message : "Không thể tạo hóa đơn.");
    } finally {
      setIsSubmittingInvoice(false);
    }
  };

  // Khóa cuộn trang nền khi mở Modal và hỗ trợ phím Escape
  useEffect(() => {
    if (selectedOrder || cancelModalOrder || showCreateModal) {
      const prevBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          if (cancelModalOrder) setCancelModalOrder(null);
          else if (showCreateModal) setShowCreateModal(false);
          else if (selectedOrder) setSelectedOrder(null);
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = prevBodyOverflow;
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [selectedOrder, cancelModalOrder, showCreateModal, setCancelModalOrder, setSelectedOrder]);

  const statusBadge = (st: string) => {
    switch (st?.toLowerCase()) {
      case "pending":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Chờ xác nhận
          </span>
        );
      case "confirmed":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            Đã xác nhận
          </span>
        );
      case "processing":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Đang xử lý
          </span>
        );
      case "shipping":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            Đang giao hàng
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Hoàn tất
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            Đã hủy
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {st}
          </span>
        );
    }
  };

  const paymentBadge = (pst?: string) => {
    switch (pst?.toLowerCase()) {
      case "paid":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
            ĐÃ THANH TOÁN
          </span>
        );
      case "partially_paid":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
            ĐÃ CỌC MỘT PHẦN
          </span>
        );
      case "refunded":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
            ĐÃ HOÀN TIỀN
          </span>
        );
      case "pending":
      case "unpaid":
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
            CHỜ THANH TOÁN
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 text-slate-800 relative">
      {toast &&
        createPortal(
          <div
            className={`fixed top-6 right-6 z-100005 px-4 py-3.5 rounded-2xl shadow-2xl border text-xs font-semibold flex items-center gap-3 backdrop-blur-md animate-in slide-in-from-top-3 duration-200 max-w-md ${
              toast.type === "success"
                ? "bg-emerald-600 text-white border-emerald-500 shadow-emerald-950/25"
                : "bg-rose-600 text-white border-rose-500 shadow-rose-950/25"
            }`}
            style={{ zIndex: 100005 }}
          >
            {toast.type === "success" ? (
              <CheckCircle2 size={18} className="shrink-0 text-emerald-100" />
            ) : (
              <AlertCircle size={18} className="shrink-0 text-rose-100" />
            )}
            <span className="leading-relaxed flex-1">{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors text-white/80 hover:text-white shrink-0"
              title="Đóng thông báo"
            >
              <X size={14} />
            </button>
          </div>,
          document.body
        )}

      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShoppingCart className="text-blue-600" size={24} />
            Quản lý Đơn hàng
          </h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Refresh button */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-50"
            title="Tải lại danh sách đơn hàng"
          >
            <RotateCw size={14} className={isRefreshing ? "animate-spin text-blue-600" : "text-slate-500"} />
            <span>Làm mới</span>
          </button>

          {/* Export Excel button */}
          <button
            type="button"
            onClick={() => exportOrdersToExcel(orders)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold transition-all shadow-xs cursor-pointer"
            title="Xuất toàn bộ danh sách đơn hàng và chi tiết sản phẩm ra file Excel (.xlsx)"
          >
            <FileSpreadsheet size={14} className="text-emerald-600" />
            <span>Xuất Excel</span>
          </button>

          {/* Nút Tạo hóa đơn mới */}
          <PermissionGate permission="orders.create" currentRole={currentRole}>
            <button
              type="button"
              onClick={handleOpenCreateInvoice}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="Tạo đơn hàng mới / Lập hóa đơn bán hàng tại quầy"
            >
              <Plus size={15} />
              <span>Tạo hóa đơn</span>
            </button>
          </PermissionGate>

          {/* Filter status tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {(["all", "pending", "confirmed", "processing", "shipping", "completed", "cancelled"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === st
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {st === "all" && `Tất cả (${orders.filter((o) => !o.isDeleted).length})`}
                {st === "pending" && `Chờ duyệt (${orders.filter((o) => !o.isDeleted && o.status === "pending").length})`}
                {st === "confirmed" && `Đã xác nhận (${orders.filter((o) => !o.isDeleted && o.status === "confirmed").length})`}
                {st === "processing" && "Đang xử lý"}
                {st === "shipping" && "Đang giao"}
                {st === "completed" && "Hoàn tất"}
                {st === "cancelled" && "Đã hủy"}
              </button>
            ))}

            {/* Tab Thùng rác (Đơn hàng bị xóa mềm) */}
            <button
              type="button"
              onClick={() => setStatusFilter("trash")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                statusFilter === "trash"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
              }`}
              title="Xem danh sách các đơn hàng đã bị xóa mềm vào thùng rác"
            >
              <Trash2 size={13} />
              <span>Thùng rác ({orders.filter((o) => o.isDeleted).length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search & Extra Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative max-w-md w-full sm:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo mã đơn (DH-...), tên khách, SĐT, địa chỉ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <select
            value={paymentStatusFilter}
            onChange={(e) => setPaymentStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
          >
            <option value="all">Mọi TT thanh toán</option>
            <option value="paid">Đã thanh toán</option>
            <option value="unpaid">Chờ thanh toán</option>
            <option value="partially_paid">Đã cọc một phần</option>
            <option value="refunded">Đã hoàn tiền</option>
          </select>

          <select
            value={paymentMethodFilter}
            onChange={(e) => setPaymentMethodFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
          >
            <option value="all">Mọi phương thức</option>
            <option value="cod">COD</option>
            <option value="vnpay">VNPay</option>
            <option value="bank_transfer">Chuyển khoản</option>
            <option value="momo">MoMo</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Lọc được <span className="font-bold text-slate-800">{filteredOrders.length}</span> / {orders.length} đơn hàng
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px] font-semibold">
                <th className="py-3 px-4 text-center">MÃ ĐƠN</th>
                <th className="py-3 px-4">KHÁCH HÀNG & LIÊN HỆ</th>
                <th className="py-3 px-4">NGƯỜI TẠO</th>
                <th className="py-3 px-4">TỔNG TIỀN</th>
                <th className="py-3 px-4">THANH TOÁN</th>
                <th className="py-3 px-4">TRẠNG THÁI</th>
                <th className="py-3 px-4">THỜI GIAN</th>
                <th className="py-3 px-4 text-center">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400 text-xs">
                    Không tìm thấy đơn hàng nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                displayedOrders.map((ord) => (
                  <tr
                    key={ord.id}
                    className={`transition-colors ${
                      ord.isDeleted ? "bg-rose-50/40 hover:bg-rose-50/70" : "hover:bg-slate-50"
                    }`}
                  >
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs border border-blue-200">
                        {ord.orderCode}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-semibold text-slate-900 text-xs">{ord.customerName}</p>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone size={10} /> {ord.phone}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        <User size={11} className="text-slate-500" />
                        {ord.createdBy || "Khách trực tuyến"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 text-xs">{vnd(ord.total)}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <span className="uppercase text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 block w-fit">
                          {ord.paymentMethod}
                        </span>
                        {paymentBadge(ord.paymentStatus)}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {ord.isDeleted ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                          Đã xóa mềm
                        </span>
                      ) : (
                        statusBadge(ord.status)
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">{ord.createdAt}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(ord)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 text-xs font-semibold transition-all shadow-xs"
                          title="Xem chi tiết đơn hàng"
                        >
                          <Eye size={11} /> Chi tiết
                        </button>

                        {ord.isDeleted ? (
                          /* Nút khôi phục đơn hàng khi đang trong thùng rác */
                          <button
                            type="button"
                            onClick={() => handleRestoreOrder(ord.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold transition-all shadow-xs"
                            title="Khôi phục đơn hàng này từ thùng rác"
                          >
                            <RotateCw size={12} /> Khôi phục
                          </button>
                        ) : ord.status === "completed" ? (
                          /* Đơn hàng đã giao thành công: chỉ xem chi tiết, không cho phép hủy hoặc xóa */
                          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                            Đã giao xong
                          </span>
                        ) : (
                          <>
                            {/* Chỉ cho phép hủy khi đơn hàng CHƯA ĐƯỢC GIAO ĐI (pending, confirmed, processing) */}
                            {ord.status !== "cancelled" && ord.status !== "shipping" && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCancelModalOrder(ord);
                                  setCancelReason("");
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 text-xs font-semibold transition-all shadow-xs"
                                title="Hủy đơn hàng (khi chưa giao đi)"
                              >
                                <XCircle size={13} />
                              </button>
                            )}

                            {/* Nút xóa mềm vào thùng rác (không áp dụng với đơn đã giao thành công) */}
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Bạn có chắc chắn muốn đưa đơn hàng #${ord.orderCode} vào thùng rác?`)) {
                                  handleDeleteOrder(ord.id);
                                }
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-all shadow-xs"
                              title="Xóa mềm vào thùng rác"
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <AdminPagination pagination={pagination} itemLabel="đơn hàng" />
      </div>

      {/* Modal Chi tiết đơn hàng & Snapshot & Status History */}
      {selectedOrder &&
        createPortal(
          <div
            className="fixed inset-0 z-9999 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overscroll-contain animate-in fade-in duration-200"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedOrder(null);
            }}
          >
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                  <Package size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    Chi tiết đơn hàng {selectedOrder.orderCode}
                  </h3>
                  <span className="text-xs text-slate-500">
                    Đặt lúc: {selectedOrder.createdAt} • Người tạo: <strong className="text-slate-700 font-semibold">{selectedOrder.createdBy || "Khách hàng đặt trực tuyến"}</strong> • Trạng thái: {statusBadge(selectedOrder.status)} • Thanh toán: {paymentBadge(selectedOrder.paymentStatus)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => exportOrdersToExcel([selectedOrder], `DonHang_${selectedOrder.orderCode}.xlsx`)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                  title="Xuất phiếu chi tiết đơn hàng này ra Excel"
                >
                  <FileSpreadsheet size={13} className="text-emerald-600" />
                  <span className="hidden sm:inline">Xuất Excel đơn</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="text-slate-400 hover:text-slate-600 font-bold p-1.5 rounded-md hover:bg-slate-100 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {toast && (
                <div
                  className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in duration-200 ${
                    toast.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-rose-50 text-rose-800 border-rose-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {toast.type === "success" ? (
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle size={16} className="text-rose-600 shrink-0" />
                    )}
                    <span>{toast.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setToast(null)}
                    className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}

              {isLoadingDetail && (
                <div className="p-3 bg-blue-50 text-blue-700 rounded-lg text-xs flex items-center gap-2 font-medium">
                  <RotateCw size={14} className="animate-spin" />
                  Đang đồng bộ dữ liệu snapshot chi tiết mới nhất từ hệ thống...
                </div>
              )}

              {/* Banner trạng thái đơn hàng */}
              {selectedOrder.status === "completed" && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-emerald-900">Đơn hàng đã giao thành công (COMPLETED)</h4>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      Đơn hàng đã hoàn tất giao hàng và kết thúc quy trình. Dữ liệu chỉ ở chế độ xem chi tiết, không thể cập nhật hoặc sửa đổi.
                    </p>
                  </div>
                </div>
              )}

              {selectedOrder.status === "shipping" && (
                <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 flex items-center gap-2.5 text-xs font-medium">
                  <Package size={17} className="text-sky-600 shrink-0" />
                  <span>
                    Đơn hàng đang trong quá trình vận chuyển (Đã bàn giao ĐVVC / Đang giao đi). Thông tin người nhận và địa chỉ giao hàng không thể thay đổi.
                  </span>
                </div>
              )}

              {selectedOrder.status === "cancelled" && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-center gap-2.5 text-xs font-medium">
                  <XCircle size={17} className="text-rose-600 shrink-0" />
                  <span>
                    Đơn hàng này đã bị hủy. Toàn bộ thông tin chỉ ở chế độ xem chi tiết snapshot và lịch sử trạng thái.
                  </span>
                </div>
              )}

              {/* Thông tin khách hàng & Giao hàng */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200">
                  <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                    <MapPin size={15} className="text-blue-600" /> Thông tin người nhận & Địa chỉ giao hàng
                  </h4>
                  <PermissionGate permission="orders.update" currentRole={currentRole}>
                    {selectedOrder.status === "completed" ? (
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                        Đã giao thành công (Chỉ xem)
                      </span>
                    ) : selectedOrder.status === "shipping" ? (
                      <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-md border border-sky-200">
                        Đã giao đi (Không thể sửa)
                      </span>
                    ) : selectedOrder.status === "cancelled" ? (
                      <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200">
                        Đã hủy (Không thể sửa)
                      </span>
                    ) : !isEditingShipping ? (
                      <button
                        type="button"
                        onClick={() => setIsEditingShipping(true)}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-semibold text-xs py-1 px-2.5 rounded border border-blue-200 bg-white hover:bg-blue-50 shadow-2xs"
                      >
                        <Edit3 size={12} /> Chỉnh sửa thông tin
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsEditingShipping(false)}
                          disabled={isSubmittingShipping}
                          className="px-2.5 py-1 text-slate-600 hover:text-slate-800 font-medium rounded border border-slate-200 bg-white"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveShipping}
                          disabled={isSubmittingShipping}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 shadow-2xs"
                        >
                          <Save size={12} /> {isSubmittingShipping ? "Đang lưu..." : "Lưu thay đổi"}
                        </button>
                      </div>
                    )}
                  </PermissionGate>
                </div>

                {!isEditingShipping ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-slate-500">Tên người nhận:</p>
                      <p className="font-semibold text-slate-900 text-sm mt-0.5">{selectedOrder.customerName}</p>
                      <p className="text-slate-600 mt-1">Điện thoại: <span className="font-semibold text-slate-800">{selectedOrder.phone}</span></p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-slate-600">
                          Email: <strong className="text-slate-800">{selectedOrder.email || "(Chưa có email)"}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={handleSendOrderEmail}
                          disabled={isSendingOrderEmail}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-700 font-semibold text-[11px] transition-colors disabled:opacity-60"
                        >
                          <Mail size={11} />
                          {isSendingOrderEmail ? "Đang gửi..." : "Gửi thông báo Email"}
                        </button>
                      </div>
                    </div>
                    <div>
                      <p className="text-slate-500">Địa chỉ giao hàng:</p>
                      <p className="text-slate-800 font-medium leading-relaxed mt-0.5">{selectedOrder.address}</p>
                      <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200">
                        <User size={13} className="text-blue-600" />
                        <span>Người lập / tạo đơn: <strong className="text-slate-800">{selectedOrder.createdBy || "Khách hàng đặt trực tuyến"}</strong></span>
                      </div>
                      {selectedOrder.note && (
                        <div className="mt-2 text-amber-900 bg-amber-50 p-2 rounded border border-amber-200">
                          <span className="font-bold">Ghi chú:</span> {selectedOrder.note}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Tên người nhận (*)</label>
                      <input
                        type="text"
                        value={shippingForm.recipientName}
                        onChange={(e) => setShippingForm({ ...shippingForm, recipientName: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded bg-white font-medium focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Số điện thoại (*)</label>
                      <input
                        type="text"
                        value={shippingForm.recipientPhone}
                        onChange={(e) => setShippingForm({ ...shippingForm, recipientPhone: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded bg-white font-medium focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block font-semibold text-slate-700 mb-1">Địa chỉ giao hàng (*)</label>
                      <textarea
                        rows={2}
                        value={shippingForm.shippingAddress}
                        onChange={(e) => setShippingForm({ ...shippingForm, shippingAddress: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded bg-white font-medium focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block font-semibold text-slate-700 mb-1">Ghi chú đơn hàng / Giao hàng</label>
                      <input
                        type="text"
                        value={shippingForm.customerNote}
                        onChange={(e) => setShippingForm({ ...shippingForm, customerNote: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded bg-white focus:ring-2 focus:ring-blue-500"
                        placeholder="Ví dụ: Giao giờ hành chính, gọi trước khi đến..."
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Thanh toán & Quản lý thanh toán */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                      <CreditCard size={15} className="text-emerald-600" />
                      Phương thức: <span className="uppercase text-blue-600">{selectedOrder.paymentMethod}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span>Trạng thái hiện tại:</span>
                      {paymentBadge(selectedOrder.paymentStatus)}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500">Tổng thanh toán:</span>
                    <p className="text-base font-bold text-blue-600">{vnd(selectedOrder.total)}</p>
                  </div>
                </div>

                <PermissionGate permission="payments.confirm" currentRole={currentRole}>
                  {selectedOrder.status === "completed" ? (
                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <span>Đơn hàng đã hoàn tất giao hàng thành công. Dữ liệu thanh toán được lưu trữ cố định.</span>
                      <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Đã chốt sổ
                      </span>
                    </div>
                  ) : selectedOrder.status === "cancelled" ? (
                    <div className="pt-2.5 border-t border-slate-100 text-xs text-slate-500 italic">
                      Đơn hàng đã bị hủy, không thể thay đổi thông tin thanh toán.
                    </div>
                  ) : (
                    <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1 text-[11px]">Phương thức thanh toán</label>
                        <select
                          value={paymentMethodInput}
                          onChange={(e) => setPaymentMethodInput(e.target.value)}
                          className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white font-medium focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="cod">TIỀN MẶT KHI GIAO (COD)</option>
                          <option value="vnpay">CỔNG VNPAY (QR / ATM)</option>
                          <option value="bank_transfer">CHUYỂN KHOẢN (VIETQR)</option>
                          <option value="momo">VÍ MOMO</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1 text-[11px]">Trạng thái thanh toán</label>
                        <select
                          value={paymentStatusInput}
                          onChange={(e) => setPaymentStatusInput(e.target.value)}
                          className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white font-medium focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="paid">ĐÃ THANH TOÁN ĐỦ (PAID)</option>
                          <option value="unpaid">CHỜ THANH TOÁN (UNPAID)</option>
                          <option value="partially_paid">ĐÃ CỌC MỘT PHẦN (PARTIALLY_PAID)</option>
                          <option value="refunded">ĐÃ HOÀN TIỀN (REFUNDED)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1 text-[11px]">Ghi chú thanh toán</label>
                        <input
                          type="text"
                          value={paymentNote}
                          onChange={(e) => setPaymentNote(e.target.value)}
                          placeholder="VD: Xác nhận qua VNPAY / Chuyển khoản ngân hàng..."
                          className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <button
                          type="button"
                          onClick={handleApplyPaymentChange}
                          disabled={isSubmittingPayment}
                          className="w-full py-2 px-3 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 shadow-xs transition-all disabled:opacity-60"
                        >
                          {isSubmittingPayment ? "Đang lưu..." : "Lưu thanh toán"}
                        </button>
                      </div>
                    </div>
                  )}
                </PermissionGate>
              </div>

              {/* Cart / Bundles Snapshot Table */}
              <div>
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ShoppingCart size={14} className="text-blue-600" /> Danh sách sản phẩm đặt ({selectedOrder.items?.length || 0})
                </h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3 text-left">Sản phẩm</th>
                        <th className="py-2.5 px-3 text-left">Biến thể / SKU</th>
                        <th className="py-2.5 px-3 text-right">Đơn giá</th>
                        <th className="py-2.5 px-3 text-center">SL</th>
                        <th className="py-2.5 px-3 text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedOrder.items && selectedOrder.items.length > 0 ? (
                        selectedOrder.items.map((it, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2.5">
                                <img
                                  src={it.image || resolveProductImage("", it.name, "").img1}
                                  alt={it.name}
                                  className="w-10 h-10 object-cover rounded border border-slate-200 shrink-0"
                                  onError={(e) => {
                                    const fallback = resolveProductImage("", it.name, "").img1;
                                    if ((e.currentTarget as HTMLImageElement).src !== fallback) {
                                      (e.currentTarget as HTMLImageElement).src = fallback;
                                    }
                                  }}
                                />
                                <span className="font-semibold text-slate-900">{it.name}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                                {it.variantSku || "SKU-DEFAULT"}
                              </span>
                              {it.variantDetails && (
                                <p className="text-[11px] text-slate-500 mt-0.5">{it.variantDetails}</p>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium text-slate-700">{vnd(it.price)}</td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-900">{it.quantity}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                              {vnd(it.price * it.quantity)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-slate-400 italic">
                            Chưa có sản phẩm nào trong snapshot đơn hàng.
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot className="bg-slate-50 font-semibold border-t border-slate-200">
                      <tr>
                        <td colSpan={4} className="py-2.5 px-3 text-right text-slate-600">Tổng thanh toán:</td>
                        <td className="py-2.5 px-3 text-right text-blue-600 font-bold text-sm">
                          {vnd(selectedOrder.total)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Cập nhật tiến độ xử lý đơn hàng */}
              <PermissionGate permission="orders.update" currentRole={currentRole}>
                {selectedOrder.status === "completed" ? (
                  <div className="border border-emerald-200 bg-emerald-50/50 p-4 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5 text-xs font-bold text-emerald-800">
                      <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                      <span>ĐƠN HÀNG ĐÃ GIAO THÀNH CÔNG (COMPLETED)</span>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-md border border-emerald-200">
                      Quy trình hoàn tất (Chỉ xem)
                    </span>
                  </div>
                ) : selectedOrder.status === "cancelled" ? (
                  <div className="border border-rose-200 bg-rose-50/50 p-4 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5 text-xs font-bold text-rose-800">
                      <XCircle size={18} className="text-rose-600 shrink-0" />
                      <span>ĐƠN HÀNG ĐÃ BỊ HỦY (CANCELLED)</span>
                    </div>
                    <span className="text-[11px] font-semibold text-rose-700 bg-rose-100/80 px-2.5 py-1 rounded-md border border-rose-200">
                      Đã kết thúc
                    </span>
                  </div>
                ) : (
                  <div className="border border-blue-200 bg-blue-50/40 p-4 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Send size={14} className="text-blue-600" /> Cập nhật tiến độ xử lý đơn hàng
                      </h4>
                      {/* Chỉ cho phép hủy khi đơn hàng CHƯA ĐƯỢC GIAO ĐI (không thể hủy khi shipping hoặc completed) */}
                      {selectedOrder.status !== "shipping" && hasPermission(currentRole, "orders.cancel") && (
                        <button
                          type="button"
                          onClick={() => {
                            setCancelModalOrder(selectedOrder);
                            setCancelReason("");
                          }}
                          className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-700 font-semibold text-xs py-1 px-2.5 rounded border border-rose-200 bg-white hover:bg-rose-50"
                        >
                          <XCircle size={13} /> Hủy đơn hàng này
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-1">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Trạng thái mới</label>
                        <select
                          value={newStatus}
                          onChange={(e) => setNewStatus(e.target.value as AdminOrder["status"])}
                          className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white font-medium focus:ring-2 focus:ring-blue-500"
                        >
                          {selectedOrder.status === "shipping" ? (
                            <>
                              <option value="shipping">Bàn giao ĐVVC / Đang giao (SHIPPING)</option>
                              <option value="completed">Đã giao thành công (COMPLETED)</option>
                            </>
                          ) : (
                            <>
                              <option value="pending">Chờ xác nhận (PENDING)</option>
                              <option value="confirmed">Đã xác nhận (CONFIRMED)</option>
                              <option value="processing">Đang đóng gói / Xử lý (PROCESSING)</option>
                              <option value="shipping">Bàn giao ĐVVC / Đang giao (SHIPPING)</option>
                              <option value="completed">Đã giao thành công (COMPLETED)</option>
                              {hasPermission(currentRole, "orders.cancel") && (
                                <option value="cancelled">Hủy đơn hàng (CANCELLED)</option>
                              )}
                            </>
                          )}
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Ghi chú xử lý / Mã vận đơn</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder={
                              selectedOrder.status === "shipping"
                                ? "Ví dụ: Đã giao thành công cho khách hàng..."
                                : "Ví dụ: Đã đóng gói xong, giao shipper Viettel Post..."
                            }
                            value={statusNote}
                            onChange={(e) => setStatusNote(e.target.value)}
                            className="flex-1 p-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            type="button"
                            onClick={handleApplyStatusChange}
                            disabled={isSubmittingStatus}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 shadow-xs transition-all disabled:opacity-60"
                          >
                            {isSubmittingStatus ? "Đang lưu..." : "Lưu & Ghi nhận"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </PermissionGate>

              {/* Lịch sử trạng thái xử lý */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Clock size={14} className="text-blue-600" /> Nhật ký luân chuyển đơn hàng (Status History)
                  </h4>
                  <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    Sắp xếp: Mới nhất đến cũ nhất
                  </span>
                </div>
                <div className="border border-slate-200 rounded-lg p-4 bg-white space-y-4">
                  {sortedStatusHistory.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Chưa có lịch sử cập nhật trạng thái.</p>
                  ) : (
                    <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                      {sortedStatusHistory.map((hist, idx) => (
                        <div key={hist.id || idx} className="relative">
                          <span className={`absolute -left-6 top-1 w-3 h-3 rounded-full ${idx === 0 ? "bg-emerald-600 ring-4 ring-emerald-100 animate-pulse" : "bg-blue-600 ring-4 ring-blue-100"}`}></span>
                          <div className="flex items-center gap-2 flex-wrap">
                            {statusBadge(hist.status)}
                            {idx === 0 && (
                              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                MỚI NHẤT
                              </span>
                            )}
                            <span className="text-xs text-slate-400">• {hist.timestamp}</span>
                            <span className="text-xs font-semibold text-slate-700">bởi {hist.updatedBy}</span>
                          </div>
                          {hist.note && (
                            <p className="text-xs text-slate-600 mt-1 bg-slate-50 p-2 rounded border border-slate-100">
                              {hist.note}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-slate-50/70">
              <PermissionGate permission="orders.export" currentRole={currentRole}>
                <button
                  type="button"
                  onClick={() => alert(`Đang chuẩn bị in Hóa đơn VAT điện tử cho đơn hàng ${selectedOrder.orderCode}...`)}
                  className="px-3.5 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs"
                >
                  <Printer size={14} /> In Hóa đơn VAT
                </button>
              </PermissionGate>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-1.5 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-lg text-xs font-semibold transition-all"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal xác nhận HỦY ĐƠN HÀNG */}
      {cancelModalOrder &&
        createPortal(
          <div
            className="fixed inset-0 z-10000 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overscroll-contain animate-in fade-in duration-150"
            onClick={(e) => {
              if (e.target === e.currentTarget) setCancelModalOrder(null);
            }}
          >
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <AlertCircle size={22} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Xác nhận Hủy Đơn Hàng</h3>
                <p className="text-xs text-slate-500">Mã đơn: <span className="font-mono font-bold text-slate-800">{cancelModalOrder.orderCode}</span></p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Hành động này sẽ đánh dấu đơn hàng là <strong>ĐÃ HỦY (CANCELLED)</strong> và ghi log kiểm toán. Vui lòng nhập lý do hủy:
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Lý do hủy đơn (*)</label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="VD: Khách hàng đổi ý, hết hàng biến thể, số điện thoại không liên lạc được..."
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setCancelModalOrder(null);
                  setCancelReason("");
                }}
                disabled={isSubmittingCancel}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
              >
                Bỏ qua
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isSubmittingCancel}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-xs disabled:opacity-60"
              >
                {isSubmittingCancel ? "Đang hủy đơn..." : "Xác nhận Hủy"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Modal Tạo hóa đơn bán hàng tại quầy / Đơn hàng mới ── */}
      {showCreateModal &&
        createPortal(
          <div
            className="fixed inset-0 z-9999 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overscroll-contain animate-in fade-in duration-200"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowCreateModal(false);
            }}
          >
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                    <Receipt size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      Tạo hóa đơn bán hàng / Đơn hàng mới
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <p className="text-[11px] text-slate-500">
                        Lập hóa đơn thanh toán trực tiếp tại quầy hoặc tạo đơn đặt hàng qua điện thoại
                      </p>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        <User size={10} />
                        Nhân viên lập: {currentUserName || currentRole.name || "Quản trị viên"}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
                  title="Đóng (Esc)"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSubmitInvoice} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs overscroll-contain">
                {invError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2 animate-in fade-in duration-200">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{invError}</span>
                  </div>
                )}

                {/* 1. Thông tin khách hàng & Giao hàng (Hỗ trợ tra cứu & Tự động điền khách hàng đã có trên hệ thống) */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 uppercase tracking-wide">
                      <User size={14} className="text-blue-600" />
                      1. Thông tin người mua & Giao nhận
                    </h4>

                    {/* Bộ chuyển chế độ: Khách có sẵn vs Khách mới */}
                    <div className="inline-flex p-1 bg-slate-100 rounded-lg text-[11px] font-semibold self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setCustomerMode("existing")}
                        className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                          customerMode === "existing"
                            ? "bg-white text-blue-600 shadow-2xs font-bold"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <User size={12} />
                        Khách có sẵn ({systemCustomers.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerMode("new");
                          handleClearSelectedCustomer();
                        }}
                        className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                          customerMode === "new"
                            ? "bg-white text-blue-600 shadow-2xs font-bold"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <Plus size={12} />
                        Khách mới / Vãng lai
                      </button>
                    </div>
                  </div>

                  {/* Khi chọn chế độ "Khách hàng đã có trên hệ thống" */}
                  {customerMode === "existing" && (
                    <div className="space-y-2 bg-blue-50/50 border border-blue-200/80 p-3.5 rounded-xl">
                      {selectedCustomer ? (
                        <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-lg border border-emerald-300 shadow-2xs">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                              {selectedCustomer.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 text-xs truncate">
                                  {selectedCustomer.name}
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  {selectedCustomer.ordersCount} đơn hàng cũ
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                SĐT: <strong className="text-slate-700">{selectedCustomer.phone}</strong>
                                {selectedCustomer.email && ` · Email: ${selectedCustomer.email}`}
                                {selectedCustomer.address && ` · Đ/C: ${selectedCustomer.address}`}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handleClearSelectedCustomer}
                            className="text-xs text-rose-600 hover:text-rose-700 font-semibold hover:underline shrink-0 cursor-pointer"
                          >
                            Đổi khách khác
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              value={customerSearchQuery}
                              onChange={(e) => setCustomerSearchQuery(e.target.value)}
                              placeholder="Gõ số điện thoại, họ tên hoặc email khách hàng để tìm nhanh & tự động điền..."
                              className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 text-xs font-medium"
                            />
                          </div>

                          {/* Danh sách gợi ý khách hàng khớp */}
                          {matchedCustomers.length > 0 && (
                            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs divide-y divide-slate-100 max-h-40 overflow-y-auto">
                              {matchedCustomers.map((c, i) => (
                                <div
                                  key={i}
                                  onClick={() => handleSelectCustomer(c)}
                                  className="p-2.5 hover:bg-blue-50/70 flex items-center justify-between gap-2 cursor-pointer transition-colors"
                                >
                                  <div className="min-w-0">
                                    <p className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                      <span>{c.name}</span>
                                      <span className="text-[10px] text-slate-500 font-normal">({c.phone})</span>
                                    </p>
                                    <p className="text-[11px] text-slate-500 truncate">
                                      {c.address || c.email || "Khách hàng Nhà Xinh"}
                                    </p>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className="text-[10.5px] font-semibold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-full">
                                      {c.ordersCount} đơn cũ
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Form thông tin chi tiết */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-slate-700 mb-1">
                        Họ tên khách hàng <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={invCustomerName}
                        onChange={(e) => setInvCustomerName(e.target.value)}
                        placeholder="VD: Nguyễn Văn A"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Số điện thoại <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={invPhone}
                        onChange={(e) => {
                          const val = e.target.value;
                          setInvPhone(val);
                          // Nếu đang ở tab khách mới mà gõ SĐT trùng với khách cũ, tự động gợi ý
                          if (!selectedCustomer && val.length >= 8) {
                            const found = systemCustomers.find((c) => c.phone.replace(/[^0-9]/g, "") === val.replace(/[^0-9]/g, ""));
                            if (found) {
                              handleSelectCustomer(found);
                            }
                          }
                        }}
                        placeholder="VD: 0901234567"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Email nhận hóa đơn VAT
                      </label>
                      <input
                        type="email"
                        value={invEmail}
                        onChange={(e) => setInvEmail(e.target.value)}
                        placeholder="khachhang@email.com"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block font-semibold text-slate-700 mb-1">
                        Địa chỉ nhận hàng / Giao hàng
                      </label>
                      <input
                        type="text"
                        value={invAddress}
                        onChange={(e) => setInvAddress(e.target.value)}
                        placeholder="VD: Nhận tại showroom hoặc Số nhà, tên đường, phường xã..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <label className="block font-semibold text-slate-700 mb-1">
                        Ghi chú hóa đơn
                      </label>
                      <input
                        type="text"
                        value={invNote}
                        onChange={(e) => setInvNote(e.target.value)}
                        placeholder="Ghi chú thêm..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Thêm sản phẩm vào hóa đơn (Có hình ảnh hiển thị rõ ràng) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 uppercase tracking-wide">
                      <Package size={14} className="text-blue-600" />
                      2. Sản phẩm trong hóa đơn ({invItems.length} món)
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      Chọn sản phẩm từ danh mục để đưa vào hóa đơn
                    </span>
                  </div>

                  {/* Thanh tìm kiếm sản phẩm nhanh */}
                  <div className="space-y-2">
                    <div className="relative">
                      <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        placeholder="Tìm kiếm sản phẩm theo tên, danh mục hoặc mã SKU để thêm..."
                        className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all font-medium text-xs"
                      />
                    </div>

                    {/* Danh sách gợi ý sản phẩm kèm ảnh, biến thể và trạng thái tồn kho */}
                    {availableProducts.length > 0 && (
                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs divide-y divide-slate-100 max-h-64 overflow-y-auto">
                        {availableProducts.map((p) => {
                          const imgSrc = p.image || resolveProductImage("", p.name, p.category).img1;
                          const isDraftOrArchived = Boolean(p.isDeleted || p.status === "draft");
                          const isPreorder = Boolean(
                            (p.status as string) === "preorder" ||
                            p.name.toLowerCase().includes("pre-order") ||
                            p.name.toLowerCase().includes("đặt trước")
                          );
                          const variants = p.variants || [];
                          const hasVariants = variants.length > 0;
                          const totalStock = hasVariants
                            ? variants.reduce((s, v) => s + v.stock, 0)
                            : p.stock;
                          const isOutOfStock = !isPreorder && totalStock <= 0;

                          return (
                            <div
                              key={p.id}
                              className={`p-3 transition-colors ${
                                isDraftOrArchived
                                  ? "bg-slate-50/70 opacity-60"
                                  : isOutOfStock
                                  ? "bg-rose-50/20"
                                  : "hover:bg-slate-50/80"
                              }`}
                            >
                              {/* Thông tin sản phẩm chính */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                <div className="flex items-center gap-3 min-w-0">
                                  <img
                                    src={imgSrc}
                                    alt={p.name}
                                    className="w-11 h-11 object-cover rounded-lg border border-slate-200 shrink-0 shadow-2xs"
                                    onError={(e) => {
                                      const fallback = resolveProductImage("", p.name, p.category).img1;
                                      if ((e.currentTarget as HTMLImageElement).src !== fallback) {
                                        (e.currentTarget as HTMLImageElement).src = fallback;
                                      }
                                    }}
                                  />
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <p className="font-bold text-slate-900 text-xs truncate">{p.name}</p>
                                      {isDraftOrArchived && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                                          Tạm ẩn / Ngừng bán
                                        </span>
                                      )}
                                      {isPreorder && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                                          Đặt trước (Pre-order)
                                        </span>
                                      )}
                                      {isOutOfStock && !isDraftOrArchived && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200">
                                          Hết hàng (0)
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                      {p.category} · Tổng kho:{" "}
                                      <span className={isOutOfStock ? "text-rose-600 font-bold" : "text-slate-700 font-semibold"}>
                                        {totalStock} món
                                      </span>
                                    </p>
                                  </div>
                                </div>

                                {/* Nếu không có biến thể riêng: nút Thêm trực tiếp */}
                                {!hasVariants && (
                                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                                    <span className="font-extrabold text-[#b86b49] text-xs">
                                      {vnd(p.price)}
                                    </span>
                                    <button
                                      type="button"
                                      disabled={isDraftOrArchived || isOutOfStock}
                                      onClick={() => handleAddItemToInvoice(p)}
                                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all shadow-2xs ${
                                        isDraftOrArchived || isOutOfStock
                                          ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                                          : isPreorder
                                          ? "bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                                          : "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                                      }`}
                                      title={
                                        isDraftOrArchived
                                          ? "Sản phẩm đang ngừng bán"
                                          : isOutOfStock
                                          ? "Sản phẩm đã hết hàng trong kho"
                                          : "Thêm vào hóa đơn"
                                      }
                                    >
                                      <Plus size={12} />
                                      {isPreorder ? "Thêm đặt trước" : isOutOfStock ? "Hết hàng" : "Thêm vào đơn"}
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Nếu có biến thể: danh sách các biến thể cụ thể để chọn */}
                              {hasVariants && (
                                <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1.5">
                                  <p className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                    <span>Chọn biến thể quy cách ({variants.length} lựa chọn):</span>
                                  </p>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                    {variants.map((v) => {
                                      const isVarOut = !isPreorder && v.stock <= 0;
                                      const varDesc = [v.color, v.size, v.material].filter(Boolean).join(" - ") || v.sku;
                                      return (
                                        <div
                                          key={v.id || v.sku}
                                          className={`flex items-center justify-between p-2 rounded-lg border text-xs transition-all ${
                                            isVarOut
                                              ? "bg-slate-50 border-slate-200 text-slate-400"
                                              : "bg-white border-slate-200/90 hover:border-blue-300"
                                          }`}
                                        >
                                          <div className="min-w-0 pr-2">
                                            <p className="font-semibold text-slate-800 text-[11px] truncate" title={varDesc}>
                                              {varDesc}
                                            </p>
                                            <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                                              <span className="font-mono bg-slate-100 px-1 rounded">{v.sku}</span>
                                              <span>·</span>
                                              <span className={isVarOut ? "text-rose-500 font-bold" : "text-emerald-600 font-semibold"}>
                                                {isVarOut ? "Hết hàng" : `Kho: ${v.stock}`}
                                              </span>
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-2 shrink-0">
                                            <span className="font-bold text-slate-900 text-[11px]">
                                              {vnd(v.price)}
                                            </span>
                                            <button
                                              type="button"
                                              disabled={isDraftOrArchived || isVarOut}
                                              onClick={() => handleAddItemToInvoice(p, v)}
                                              className={`px-2 py-1 rounded text-[10.5px] font-bold flex items-center gap-0.5 transition-all ${
                                                isDraftOrArchived || isVarOut
                                                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                                  : isPreorder
                                                  ? "bg-amber-50 hover:bg-amber-600 text-amber-700 hover:text-white border border-amber-300 cursor-pointer"
                                                  : "bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 cursor-pointer"
                                              }`}
                                              title={isVarOut ? "Biến thể này đã hết hàng" : "Chọn biến thể này"}
                                            >
                                              <Plus size={11} /> {isVarOut ? "Hết" : "Chọn"}
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Bảng danh sách sản phẩm đã đưa vào hóa đơn */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3">Sản phẩm</th>
                          <th className="py-2.5 px-3 text-right">Đơn giá</th>
                          <th className="py-2.5 px-3 text-center">Số lượng</th>
                          <th className="py-2.5 px-3 text-right">Thành tiền</th>
                          <th className="py-2.5 px-3 text-center w-12">Xóa</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {invItems.length > 0 ? (
                          invItems.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/80">
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-2.5">
                                  <img
                                    src={item.image || resolveProductImage("", item.name, "").img1}
                                    alt={item.name}
                                    className="w-11 h-11 object-cover rounded-lg border border-slate-200 shrink-0 shadow-2xs"
                                    onError={(e) => {
                                      const fallback = resolveProductImage("", item.name, "").img1;
                                      if ((e.currentTarget as HTMLImageElement).src !== fallback) {
                                        (e.currentTarget as HTMLImageElement).src = fallback;
                                      }
                                    }}
                                  />
                                  <div>
                                    <p className="font-bold text-slate-900">{item.name}</p>
                                    <span className="font-mono text-[10.5px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                      {item.variantSku}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-right font-semibold text-slate-700">
                                {vnd(item.price)}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <div className="inline-flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateItemQuantity(idx, item.quantity - 1)}
                                    className="p-1 hover:bg-slate-100 text-slate-600 transition-colors"
                                  >
                                    <Minus size={12} />
                                  </button>
                                  <input
                                    type="number"
                                    min={1}
                                    value={item.quantity}
                                    onChange={(e) =>
                                      handleUpdateItemQuantity(idx, Math.max(1, parseInt(e.target.value) || 1))
                                    }
                                    className="w-10 text-center font-bold text-slate-900 text-xs py-0.5 border-x border-slate-200 focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateItemQuantity(idx, item.quantity + 1)}
                                    className="p-1 hover:bg-slate-100 text-slate-600 transition-colors"
                                  >
                                    <Plus size={12} />
                                  </button>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-right font-extrabold text-[#b86b49]">
                                {vnd(item.price * item.quantity)}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(idx)}
                                  className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Gỡ sản phẩm này khỏi hóa đơn"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                              Hóa đơn chưa có sản phẩm nào. Hãy tìm kiếm và bấm "+ Thêm" ở trên.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 3. Thanh toán & Tổng kết tài chính */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-3">
                    <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 uppercase tracking-wide">
                      <CreditCard size={14} className="text-emerald-600" />
                      Phương thức & Trạng thái thanh toán
                    </h4>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1 text-[11px]">
                          Phương thức
                        </label>
                        <select
                          value={invPaymentMethod}
                          onChange={(e) => setInvPaymentMethod(e.target.value as AdminOrder["paymentMethod"])}
                          className="w-full p-2 border border-slate-300 rounded-lg bg-white text-xs font-medium focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="cod">Tiền mặt tại quầy / COD</option>
                          <option value="vietqr">Chuyển khoản VietQR</option>
                          <option value="vnpay">Cổng VNPay (Thẻ/ATM)</option>
                          <option value="momo">Ví MoMo</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1 text-[11px]">
                          Trạng thái thanh toán
                        </label>
                        <select
                          value={invPaymentStatus}
                          onChange={(e) => setInvPaymentStatus(e.target.value as "pending" | "paid")}
                          className="w-full p-2 border border-slate-300 rounded-lg bg-white text-xs font-medium focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="paid">Đã thanh toán đủ (Paid)</option>
                          <option value="pending">Chờ thanh toán (Pending)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1 text-[11px]">
                          Phí vận chuyển (₫)
                        </label>
                        <input
                          type="number"
                          min={0}
                          step={10000}
                          value={invShippingFee}
                          onChange={(e) => setInvShippingFee(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full p-2 border border-slate-300 rounded-lg bg-white text-xs font-medium focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1 text-[11px]">
                          Giảm giá / Voucher (₫)
                        </label>
                        <input
                          type="number"
                          min={0}
                          step={10000}
                          value={invDiscountAmount}
                          onChange={(e) => setInvDiscountAmount(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full p-2 border border-slate-300 rounded-lg bg-white text-xs font-medium focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bảng tổng kết số tiền */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-white flex flex-col justify-between space-y-2">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Tiền hàng (Tạm tính):</span>
                        <span className="font-semibold text-slate-800">{vnd(invSubtotal)}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Phí vận chuyển:</span>
                        <span className="font-semibold text-slate-800">
                          {invShippingFee > 0 ? vnd(invShippingFee) : "Miễn phí"}
                        </span>
                      </div>
                      {invDiscountAmount > 0 && (
                        <div className="flex items-center justify-between text-emerald-600">
                          <span>Chiết khấu / Giảm giá:</span>
                          <span className="font-semibold">-{vnd(invDiscountAmount)}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-slate-500 block text-[11px]">Tổng tiền hóa đơn:</span>
                        <span className="text-lg font-black text-[#b86b49]">{vnd(invTotal)}</span>
                      </div>
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        {invPaymentStatus === "paid" ? "Thu đủ ngay" : "Ghi nhận công nợ"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    disabled={isSubmittingInvoice}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-100 transition-all text-xs"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingInvoice || invItems.length === 0}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm transition-all text-xs disabled:opacity-60 cursor-pointer"
                  >
                    <FilePlus size={15} />
                    {isSubmittingInvoice ? "Đang lập hóa đơn..." : "Tạo hóa đơn & Lưu"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
