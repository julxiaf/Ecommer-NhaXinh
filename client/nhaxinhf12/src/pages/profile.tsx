import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import {
  ChevronRight, User as UserIcon, Package, Heart, MapPin, LogOut,
  Edit3, Save, ShieldCheck, Plus, Trash2, CheckCircle2,
  Clock, X, AlertTriangle, KeyRound, Check, AlertCircle, Truck, Tag, CreditCard, RotateCcw
} from "lucide-react";
import Header from "../components/Headers";
import Footer from "../components/Footer";
import { useStore } from "../hooks/useStore";
import { userService, type UserAddress, type UserProfile } from "../services/userService";
import { DEFAULT_PLACEHOLDER_IMAGE } from "../services/productService";
import type { AdminOrder } from "../services/admin/types";
import "./pages.css";
import "./profile.css";
import { vnd } from "../util/Constain";

type Tab = "info" | "orders" | "addresses" | "security";


export default function ProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, login, logout, cartCount, wishlist } = useStore();
  const isLoggingOutRef = useRef(false);

  const targetOrderCodeParam = (searchParams.get("orderCode") || searchParams.get("order") || "").trim();
  const tabParam = (searchParams.get("tab") || "").trim().toLowerCase();

  const [activeTab, setActiveTab] = useState<Tab>(
    tabParam === "orders" || targetOrderCodeParam ? "orders" : "info"
  );
  const [highlightedOrderCode, setHighlightedOrderCode] = useState<string>(targetOrderCodeParam);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Edit Profile Form State
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: "",
    phone: "",
    address: "",
    gender: "male" as "male" | "female" | "other",
    birthDate: "",
  });

  // Address Modal State
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null);
  const [addressForm, setAddressForm] = useState<Omit<UserAddress, "id">>({
    recipientName: "",
    phone: "",
    province: "TP. Hồ Chí Minh",
    district: "Quận 1",
    ward: "",
    addressDetail: "",
    isDefault: false,
    type: "home",
  });

  // Order Details Modal
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [orderFilter, setOrderFilter] = useState<string>("all");

  // Cancel Order Modal State
  const [orderToCancel, setOrderToCancel] = useState<AdminOrder | null>(null);
  const [cancelReasonPreset, setCancelReasonPreset] = useState<string>("");
  const [cancelReasonCustom, setCancelReasonCustom] = useState<string>("");
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelError, setCancelError] = useState("");

  const CANCEL_REASONS = [
    "Tôi muốn thay đổi địa chỉ nhận hàng hoặc thông tin người nhận",
    "Tôi muốn thay đổi mẫu mã, kích thước hoặc màu sắc sản phẩm",
    "Thời gian giao hàng dự kiến không phù hợp với kế hoạch",
    "Tìm thấy sản phẩm có mức giá tốt hơn ở nơi khác",
    "Tôi thay đổi kế hoạch, hiện tại chưa có nhu cầu mua",
    "Lý do khác",
  ];

  // Change Password Form State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Đồng bộ URL query params (?tab=orders&orderCode=...) khi điều hướng từ nút bấm trong Email
  useEffect(() => {
    if (tabParam === "orders" || targetOrderCodeParam) {
      setActiveTab("orders");
      setOrderFilter("all");
    }
    if (targetOrderCodeParam) {
      setHighlightedOrderCode(targetOrderCodeParam);
    }
  }, [tabParam, targetOrderCodeParam]);

  // 1. Kiểm tra Phiên bảo mật từ Server & Khởi tạo dữ liệu
  useEffect(() => {
    // Nếu đang chủ động bấm nút đăng xuất ngay tại trang này, bỏ qua
    if (isLoggingOutRef.current) {
      return;
    }

    let active = true;

    // Gọi trực tiếp máy chủ (GET /api/v1/users/me kèm session cookie) để xác thực phiên và tải hồ sơ
    void (async () => {
      try {
        const p = await userService.getProfile();
        if (!active) return;

        userService.clearLogoutFlag();
        setProfile(p);
        setProfileForm({
          fullName: p.fullName,
          phone: p.phone,
          address: p.address,
          gender: p.gender || "male",
          birthDate: p.birthDate || "",
        });

        // Đồng bộ lại user vào store nếu localStorage chưa kịp cập nhật
        if (!user || user.email !== p.email || user.fullName !== p.fullName) {
          void login({
            fullName: p.fullName,
            email: p.email,
            phone: p.phone,
            address: p.address || "",
            avatar: p.avatar,
          });
        }

        // Tải sổ địa chỉ
        try {
          const addrList = await userService.getAddresses();
          if (active) setAddresses(addrList);
        } catch (err) {
          console.warn("Không thể tải sổ địa chỉ:", err);
        }

        // Tải đơn hàng (bao gồm cả đơn đã mua và đơn đã hủy)
        setLoadingOrders(true);
        let userOrders = await userService.getUserOrders(p.email, p.phone);

        // Nếu người dùng bấm từ email dẫn tới 1 mã đơn hàng cụ thể (?orderCode=...)
        if (targetOrderCodeParam) {
          const cleanCode = targetOrderCodeParam.replace(/^#/, "").trim().toLowerCase();
          let matched = userOrders.find(
            (o) =>
              o.orderCode?.toLowerCase() === cleanCode ||
              String(o.id).toLowerCase() === cleanCode
          );
          if (!matched) {
            const fetchedOrder = await userService.getOrderByCode(targetOrderCodeParam.replace(/^#/, ""), p.phone);
            if (fetchedOrder) {
              matched = fetchedOrder;
              userOrders = [fetchedOrder, ...userOrders];
            }
          }
          if (active && matched) {
            setActiveTab("orders");
            setOrderFilter("all");
            setSelectedOrder(matched);
            setHighlightedOrderCode(matched.orderCode);
            setTimeout(() => {
              const cardEl = document.getElementById(`order-card-${matched!.orderCode}`);
              if (cardEl) {
                cardEl.scrollIntoView({ behavior: "smooth", block: "center" });
              }
            }, 250);
          }
        }

        if (active) {
          setOrders(userOrders);
          setLoadingOrders(false);
        }
      } catch (err: unknown) {
        console.warn("Phiên đăng nhập trên máy chủ không hợp lệ hoặc đã hết hạn:", err);
        if (!active || isLoggingOutRef.current) {
          return;
        }
        userService.clearSession();
        logout();
        userService.clearLogoutFlag();
        const redirectUrl = encodeURIComponent(location.pathname + location.search);
        navigate(`/dang-nhap?expired=1&redirect=${redirectUrl}`, { replace: true });
      }
    })();

    return () => {
      active = false;
    };
  }, [navigate, user, login, logout, location.pathname, location.search, targetOrderCodeParam]);

  // Cập nhật thông tin hồ sơ
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.fullName.trim()) {
      showToast("Vui lòng điền họ và tên.");
      return;
    }
    const updated = await userService.updateProfile(profileForm);
    setProfile(updated);
    setEditingProfile(false);
    showToast("Cập nhật thông tin thành công!");
  };

  // Mở modal thêm/sửa địa chỉ
  const handleOpenAddressModal = (addr?: UserAddress) => {
    if (addr) {
      setEditingAddress(addr);
      setAddressForm({
        recipientName: addr.recipientName,
        phone: addr.phone,
        province: addr.province,
        district: addr.district,
        ward: addr.ward,
        addressDetail: addr.addressDetail,
        isDefault: addr.isDefault,
        type: addr.type,
      });
    } else {
      setEditingAddress(null);
      setAddressForm({
        recipientName: profile?.fullName || "",
        phone: profile?.phone || "",
        province: "TP. Hồ Chí Minh",
        district: "Quận 1",
        ward: "",
        addressDetail: "",
        isDefault: addresses.length === 0,
        type: "home",
      });
    }
    setShowAddressModal(true);
  };

  // Lưu địa chỉ
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressForm.recipientName || !addressForm.phone || !addressForm.addressDetail) {
      showToast("Vui lòng điền đầy đủ các thông tin địa chỉ bắt buộc.");
      return;
    }

    try {
      const updatedList = await userService.saveAddress(
        editingAddress ? { ...addressForm, id: editingAddress.id } : addressForm
      );
      setAddresses(updatedList);
      setShowAddressModal(false);
      showToast(editingAddress ? "Đã cập nhật địa chỉ." : "Đã thêm địa chỉ mới.");
    } catch (err: any) {
      showToast(err?.message || "Không thể lưu địa chỉ.");
    }
  };

  // Xóa địa chỉ
  const handleDeleteAddress = async (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa địa chỉ này?")) {
      try {
        const remaining = await userService.deleteAddress(id);
        setAddresses(remaining);
        showToast("Đã xóa địa chỉ thành công.");
      } catch (err: any) {
        showToast(err?.message || "Không thể xóa địa chỉ.");
      }
    }
  };

  // Đặt địa chỉ mặc định
  const handleSetDefaultAddress = async (id: string) => {
    try {
      const updated = await userService.setDefaultAddress(id);
      setAddresses(updated);
      showToast("Đã đặt làm địa chỉ giao hàng mặc định.");
    } catch (err: any) {
      showToast(err?.message || "Không thể đặt địa chỉ mặc định.");
    }
  };

  // Đổi mật khẩu
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");

    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setPasswordError("Vui lòng điền đầy đủ mật khẩu hiện tại và mật khẩu mới.");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordError("Mật khẩu mới phải có tối thiểu 6 ký tự.");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setPasswordLoading(true);
    const result = await userService.changePassword(
      passwordForm.currentPassword,
      passwordForm.newPassword
    );
    setPasswordLoading(false);

    if (result.success) {
      showToast(result.message);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } else {
      setPasswordError(result.message);
    }
  };

  // Mở modal xác nhận hủy đơn
  const handleOpenCancelModal = (order: AdminOrder) => {
    setOrderToCancel(order);
    setCancelReasonPreset(CANCEL_REASONS[0]);
    setCancelReasonCustom("");
    setCancelError("");
  };

  // Xác nhận hủy đơn hàng
  const handleConfirmCancelOrder = async () => {
    if (!orderToCancel) return;

    let finalReason = cancelReasonPreset;
    if (cancelReasonPreset === "Lý do khác") {
      if (!cancelReasonCustom.trim()) {
        setCancelError("Vui lòng nhập lý do cụ thể bạn muốn hủy đơn hàng này.");
        return;
      }
      finalReason = cancelReasonCustom.trim();
    } else if (cancelReasonCustom.trim()) {
      finalReason = `${cancelReasonPreset} - Ghi chú: ${cancelReasonCustom.trim()}`;
    }

    setCancelSubmitting(true);
    setCancelError("");

    try {
      const targetOrder = orderToCancel;
      await userService.cancelUserOrder(
        targetOrder.orderCode || targetOrder.id,
        finalReason,
        targetOrder.phone || profile?.phone,
        targetOrder.email || profile?.email
      );

      const newHistoryEntry = {
        id: String(Date.now()),
        status: "cancelled" as const,
        timestamp: new Date().toLocaleString("vi-VN"),
        updatedBy: profile?.fullName || "Khách hàng",
        note: `Khách hàng hủy đơn: ${finalReason}`,
      };

      // Cập nhật ngay trên giao diện để phản hồi tức thì (< 50ms sau khi API trả kết quả)
      setOrders((prev) =>
        prev.map((o) =>
          o.id === targetOrder.id || (targetOrder.orderCode && o.orderCode === targetOrder.orderCode)
            ? {
                ...o,
                status: "cancelled",
                statusHistory: [newHistoryEntry, ...(o.statusHistory || [])],
              }
            : o
        )
      );

      if (selectedOrder && (selectedOrder.id === targetOrder.id || selectedOrder.orderCode === targetOrder.orderCode)) {
        setSelectedOrder({
          ...selectedOrder,
          status: "cancelled",
          statusHistory: [newHistoryEntry, ...(selectedOrder.statusHistory || [])],
        });
      }

      setOrderToCancel(null);
      showToast("Đã hủy đơn hàng thành công.");

      // Đồng bộ lại danh sách đơn hàng chạy ngầm (không chặn UI)
      if (profile) {
        void userService.getUserOrders(profile.email, profile.phone).then((updatedOrders) => {
          setOrders(updatedOrders);
          setSelectedOrder((curr) => {
            if (!curr) return curr;
            return updatedOrders.find((o) => o.id === curr.id || o.orderCode === curr.orderCode) || curr;
          });
        });
      }
    } catch (err: any) {
      setCancelError(err?.message || "Không thể hủy đơn hàng vào lúc này. Vui lòng liên hệ CSKH.");
    } finally {
      setCancelSubmitting(false);
    }
  };

  // Đăng xuất an toàn
  const handleLogout = async () => {
    if (window.confirm("Bạn có chắc muốn đăng xuất khỏi tài khoản Nhà Xinh?")) {
      isLoggingOutRef.current = true;
      if (typeof window !== "undefined") {
        sessionStorage.setItem("nhaxinh_user_logged_out", "1");
      }
      try {
        await userService.logout();
      } finally {
        logout();
        navigate("/dang-nhap?logout=1", { replace: true });
      }
    }
  };

  // Lọc danh sách đơn hàng
  const filteredOrders = useMemo(() => {
    if (orderFilter === "all") return orders;
    return orders.filter((o) => o.status === orderFilter);
  }, [orders, orderFilter]);

  if (!profile) {
    return (
      <>
        <Header user={user} cartCount={cartCount} wishlistCount={wishlist.length} />
        <div className="py-24 text-center text-slate-500 font-medium">Đang tải thông tin tài khoản...</div>
        <Footer />
      </>
    );
  }

  const statusMap: Record<string, { label: string; class: string }> = {
    pending: { label: "Chờ xác nhận", class: "status-pending" },
    confirmed: { label: "Đã xác nhận", class: "status-processing" },
    processing: { label: "Đang xử lý", class: "status-processing" },
    shipping: { label: "Đang giao hàng", class: "status-shipping" },
    completed: { label: "Đã giao thành công", class: "status-completed" },
    cancelled: { label: "Đã hủy", class: "status-cancelled" },
  };

  return (
    <>
      <Header user={user} cartCount={cartCount} wishlistCount={wishlist.length} />

      <main className="prof-container">
        {/* Breadcrumb */}
        <nav className="breadcrumb py-3 sm:py-4 text-[11px] sm:text-xs flex items-center gap-1.5 text-stone-500 overflow-x-auto whitespace-nowrap scrollbar-none" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-[#b86b49] transition-colors shrink-0">Trang chủ</Link>
          <ChevronRight size={12} className="shrink-0 text-stone-400" />
          <span className="text-stone-800 font-semibold truncate">Tài khoản & Hồ sơ của tôi (/me)</span>
        </nav>

        {/* ── Top Member Banner Card ── */}
        <section className="prof-hero-card">
          <div className="prof-avatar-wrap">
            <div className="prof-hero-avatar">
              {profile.fullName.charAt(0).toUpperCase()}
            </div>
            <div className="prof-tier-badge-pill">
              {/* <Award size={12} /> {profile.fullName} */}
            </div>
          </div>

          <div className="prof-hero-info">
            <h2>{profile.fullName}</h2>
            <div className="prof-hero-meta">
              <span>{profile.email}</span>
              <span>•</span>
              <span>{profile.phone || "Chưa cập nhật SĐT"}</span>
              {/* <span>•</span> */}
              {/* <span className="prof-token-status"> */}
                {/* <ShieldCheck size={14} /> Phiên bảo mật Token 24h */}
              {/* </span> */}
            </div>
          </div>

        </section>

        {/* ── Main Layout ── */}
        <div className="prof-layout">
          {/* Sidebar - Compact and sleek on mobile */}
          <aside className="prof-sidebar">
            <nav className="prof-nav">
              <button
                className={`prof-nav-item ${activeTab === "info" ? "active" : ""}`}
                onClick={() => setActiveTab("info")}
              >
                <UserIcon size={15} className="shrink-0" />
                <span>Hồ sơ<span className="hidden md:inline"> cá nhân</span></span>
              </button>

              <button
                className={`prof-nav-item ${activeTab === "orders" ? "active" : ""}`}
                onClick={() => setActiveTab("orders")}
              >
                <Package size={15} className="shrink-0" />
                <span>Đơn hàng<span className="hidden md:inline"> của tôi</span></span>
                {orders.length > 0 && <span className="prof-nav-badge">{orders.length}</span>}
              </button>

              <button
                className={`prof-nav-item ${activeTab === "addresses" ? "active" : ""}`}
                onClick={() => setActiveTab("addresses")}
              >
                <MapPin size={15} className="shrink-0" />
                <span><span className="hidden md:inline">Sổ </span>địa chỉ</span>
                <span className="prof-nav-badge">{addresses.length}</span>
              </button>

              <button
                className={`prof-nav-item ${activeTab === "security" ? "active" : ""}`}
                onClick={() => setActiveTab("security")}
              >
                <KeyRound size={15} className="shrink-0" />
                <span>Bảo mật<span className="hidden md:inline"> & Cài đặt</span></span>
              </button>

              <Link to="/yeu-thich" className="prof-nav-item">
                <Heart size={15} className="shrink-0" />
                <span>Yêu thích<span className="hidden md:inline"> sản phẩm</span></span>
                {wishlist.length > 0 && <span className="prof-nav-badge">{wishlist.length}</span>}
              </Link>

              <div className="prof-nav-divider" />

              <button className="prof-nav-item prof-nav-logout" onClick={handleLogout}>
                <LogOut size={15} className="shrink-0" />
                <span>Đăng xuất</span>
              </button>
            </nav>
          </aside>

          {/* Main Content Area */}
          <section className="prof-content">
            {/* ═════════ TAB 1: THÔNG TIN CÁ NHÂN ═════════ */}
            {activeTab === "info" && (
              <div>
                <div className="prof-section-header">
                  <div>
                    <h3><UserIcon size={22} className="text-[#b86b49]" /> Thông tin cá nhân</h3>
                    <p>Quản lý tên, số điện thoại, ngày sinh để nhận ưu đãi sinh nhật</p>
                  </div>
                  {!editingProfile ? (
                    <button className="btn-nx-secondary" onClick={() => setEditingProfile(true)}>
                      <Edit3 size={15} /> Chỉnh sửa
                    </button>
                  ) : (
                    <button className="btn-nx-secondary" onClick={() => setEditingProfile(false)}>
                      Hủy bỏ
                    </button>
                  )}
                </div>

                <form onSubmit={handleSaveProfile}>
                  <div className="prof-info-grid">
                    <div className="prof-field">
                      <label>Họ và tên</label>
                      {editingProfile ? (
                        <input
                          type="text"
                          value={profileForm.fullName}
                          onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                          required
                        />
                      ) : (
                        <p className="read-only">{profile.fullName}</p>
                      )}
                    </div>

                    <div className="prof-field">
                      <label>Email đăng ký</label>
                      <p className="read-only flex items-center justify-between">
                        {profile.email}
                        <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                          <Check size={14} /> Đã xác minh
                        </span>
                      </p>
                    </div>

                    <div className="prof-field">
                      <label>Số điện thoại</label>
                      {editingProfile ? (
                        <input
                          type="tel"
                          value={profileForm.phone}
                          onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                          placeholder="0903 884 358"
                        />
                      ) : (
                        <p className="read-only">{profile.phone || "Chưa cập nhật"}</p>
                      )}
                    </div>

                    <div className="prof-field">
                      <label>Giới tính</label>
                      {editingProfile ? (
                        <select
                          value={profileForm.gender}
                          onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value as any })}
                        >
                          <option value="male">Nam</option>
                          <option value="female">Nữ</option>
                          <option value="other">Khác</option>
                        </select>
                      ) : (
                        <p className="read-only">
                          {profile.gender === "female" ? "Nữ" : profile.gender === "male" ? "Nam" : "Khác"}
                        </p>
                      )}
                    </div>

                    <div className="prof-field">
                      <label>Ngày sinh</label>
                      {editingProfile ? (
                        <input
                          type="date"
                          value={profileForm.birthDate}
                          onChange={(e) => setProfileForm({ ...profileForm, birthDate: e.target.value })}
                        />
                      ) : (
                        <p className="read-only">{profile.birthDate || "Chưa cập nhật"}</p>
                      )}
                    </div>

                    <div className="prof-field">
                      <label>Ngày tham gia</label>
                      <p className="read-only">{profile.createdAt}</p>
                    </div>

                    {/* <div className="prof-field prof-field-full">
                      <label>Địa chỉ</label>
                      {editingProfile ? (
                        <textarea
                          rows={2}
                          value={profileForm.address}
                          onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                          placeholder="Số nhà, đường, phường, quận..."
                        />
                      ) : (
                        <p className="read-only">{profile.address || "Chưa cập nhật địa chỉ"}</p>
                      )}
                    </div> */}
                  </div>

                  {editingProfile && (
                    <div className="flex justify-end gap-3 pt-4 border-t border-stone-200">
                      <button type="submit" className="btn-nx-primary">
                        <Save size={16} /> Lưu thay đổi hồ sơ
                      </button>
                    </div>
                  )}
                </form>
              </div>
            )}

            {/* ═════════ TAB 2: ĐƠN HÀNG CỦA TÔI ═════════ */}
            {activeTab === "orders" && (
              <div>
                <div className="prof-section-header">
                  <div>
                    <h3><Package size={22} className="text-[#b86b49]" /> Lịch sử đơn hàng</h3>
                    <p>Tra cứu tình trạng vận chuyển, tiến độ bàn giao nội thất của bạn</p>
                  </div>
                </div>

                {/* Filter Pills */}
                <div className="prof-order-filter-bar">
                  {[
                    { key: "all", label: "Tất cả" },
                    { key: "pending", label: "Chờ xác nhận" },
                    { key: "processing", label: "Đang sản xuất/xử lý" },
                    { key: "shipping", label: "Đang giao" },
                    { key: "completed", label: "Đã nhận hàng" },
                    { key: "cancelled", label: "Đã hủy" },
                  ].map((filter) => (
                    <button
                      key={filter.key}
                      className={`prof-filter-pill ${orderFilter === filter.key ? "active" : ""}`}
                      onClick={() => setOrderFilter(filter.key)}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                {loadingOrders ? (
                  <div className="py-12 text-center text-stone-500">Đang đồng bộ đơn hàng...</div>
                ) : filteredOrders.length === 0 ? (
                  <div className="py-16 text-center">
                    <Package size={48} className="mx-auto text-stone-300 mb-3" />
                    <h4 className="text-base font-semibold text-stone-800">Chưa có đơn hàng nào</h4>
                    <p className="text-sm text-stone-500 mt-1 max-w-sm mx-auto">
                      Khám phá các bộ sưu tập nội thất cao cấp của Nhà Xinh để trang hoàng tổ ấm của bạn.
                    </p>
                    <Link to="/san-pham" className="btn-nx-primary inline-flex mt-5">
                      Khám phá sản phẩm ngay
                    </Link>
                  </div>
                ) : (
                  <div className="prof-orders-wrap">
                    {filteredOrders.map((ord) => {
                      const st = statusMap[ord.status] || { label: ord.status, class: "status-pending" };
                      const isHighlighted =
                        highlightedOrderCode &&
                        ord.orderCode?.toLowerCase() === highlightedOrderCode.replace(/^#/, "").toLowerCase();
                      return (
                        <div
                          key={ord.id}
                          id={`order-card-${ord.orderCode}`}
                          className={`prof-order-card transition-all ${
                            isHighlighted ? "ring-2 ring-[#b86b49] border-[#b86b49] bg-[#fdfaf6]" : ""
                          }`}
                        >
                          <div className="prof-order-head">
                            <div>
                              <span className="prof-order-code">Đơn hàng #{ord.orderCode}</span>
                              <span className="prof-order-date">
                                <Clock size={13} /> {ord.createdAt}
                              </span>
                            </div>
                            <span className={`prof-status-badge ${st.class}`}>{st.label}</span>
                          </div>

                          <div className="prof-order-body">
                            {ord.items.map((item, idx) => (
                              <div key={idx} className="prof-order-item-row">
                                <img
                                  src={item.image || DEFAULT_PLACEHOLDER_IMAGE}
                                  alt={item.name}
                                  className="prof-order-thumb"
                                />
                                <div className="prof-order-item-detail">
                                  <h5 className="prof-order-item-title">{item.name}</h5>
                                  <div className="prof-order-item-sub">
                                    Số lượng: x{item.quantity} {item.variantSku ? `• SKU: ${item.variantSku}` : ""}
                                  </div>
                                </div>
                                <div className="prof-order-item-price">{vnd(item.price)}</div>
                              </div>
                            ))}
                          </div>

                          <div className="prof-order-foot">
                            <div className="flex items-center gap-2">
                              <button
                                className="btn-nx-secondary text-xs"
                                onClick={() => setSelectedOrder(ord)}
                              >
                                Xem chi tiết tiến độ
                              </button>
                              {(ord.status === "pending" || ord.status === "confirmed") && (
                                <button
                                  className="btn-nx-danger text-xs"
                                  onClick={() => handleOpenCancelModal(ord)}
                                >
                                  Hủy đơn
                                </button>
                              )}
                            </div>

                            <div className="prof-order-total-sum">
                              Tổng thanh toán: <strong>{vnd(ord.total)}</strong>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ═════════ TAB 3: SỔ ĐỊA CHỈ (ADDRESSES) ═════════ */}
            {activeTab === "addresses" && (
              <div>
                <div className="prof-section-header">
                  <div>
                    <h3><MapPin size={22} className="text-[#b86b49]" /> Sổ địa chỉ giao hàng</h3>
                    <p>Lưu nhiều địa chỉ nhận hàng để tiện đặt mua nội thất nhanh chóng</p>
                  </div>
                  <button className="btn-nx-primary" onClick={() => handleOpenAddressModal()}>
                    <Plus size={16} /> Thêm địa chỉ mới
                  </button>
                </div>

                <div className="prof-address-grid">
                  {addresses.map((addr) => (
                    <div key={addr.id} className={`prof-addr-card ${addr.isDefault ? "is-default" : ""}`}>
                      <div className="prof-addr-header">
                        <div className="prof-addr-badges">
                          <span className="badge-type">
                            {addr.type === "home" ? "Nhà riêng" : "Văn phòng"}
                          </span>
                          {addr.isDefault && <span className="badge-default">Mặc định</span>}
                        </div>
                      </div>

                      <h4 className="prof-addr-name">{addr.recipientName}</h4>
                      <p className="prof-addr-phone">{addr.phone}</p>
                      <p className="prof-addr-text">
                        {addr.addressDetail}, {addr.ward ? `${addr.ward}, ` : ""}{addr.district}, {addr.province}
                      </p>

                      <div className="prof-addr-actions">
                        <button
                          className="btn-nx-secondary text-xs"
                          onClick={() => handleOpenAddressModal(addr)}
                        >
                          <Edit3 size={13} /> Sửa
                        </button>
                        {!addr.isDefault && (
                          <>
                            <button
                              className="btn-nx-secondary text-xs"
                              onClick={() => handleSetDefaultAddress(addr.id)}
                            >
                              Đặt làm mặc định
                            </button>
                            <button
                              className="btn-nx-danger text-xs p-2"
                              title="Xóa địa chỉ"
                              onClick={() => handleDeleteAddress(addr.id)}
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ═════════ TAB 4: BẢO MẬT & CÀI ĐẶT ═════════ */}
            {activeTab === "security" && (
              <div>
                <div className="prof-section-header">
                  <div>
                    <h3><KeyRound size={22} className="text-[#b86b49]" /> Bảo mật & Phiên làm việc</h3>
                    <p>Quản lý mật khẩu, thời hạn token và cài đặt an toàn tài khoản</p>
                  </div>
                </div>

                {/* Form Đổi Mật Khẩu */}
                <form onSubmit={handleChangePassword} className="max-w-xl space-y-4 mb-8">
                  <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                    <ShieldCheck size={18} className="text-[#b86b49]" /> Đổi mật khẩu đăng nhập
                  </h4>

                  {passwordError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
                      <AlertTriangle size={15} /> {passwordError}
                    </div>
                  )}

                  <div className="prof-field">
                    <label>Mật khẩu hiện tại</label>
                    <input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      placeholder="••••••••"
                      required
                    />
                  </div>

                  <div className="prof-field">
                    <label>Mật khẩu mới</label>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      placeholder="Tối thiểu 6 ký tự"
                      required
                    />
                  </div>

                  <div className="prof-field">
                    <label>Xác nhận mật khẩu mới</label>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      placeholder="Nhập lại mật khẩu mới"
                      required
                    />
                  </div>

                  <button type="submit" className="btn-nx-primary" disabled={passwordLoading}>
                    {passwordLoading ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
                  </button>
                </form>

                <hr className="my-6 border-stone-200" />

                {/* Phiên đăng nhập Token */}
                {/* <div className="space-y-4">
                  <h4 className="font-bold text-stone-900 text-sm">Trạng thái xác thực Token</h4>
                  <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-stone-800">Phiên trình duyệt hiện tại</p>
                      <p className="text-stone-500 mt-0.5">Mã JWT Token có hiệu lực 24 giờ kể từ khi đăng nhập</p>
                    </div>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold">
                      Hợp lệ
                    </span>
                  </div>

                  <div className="pt-3">
                    <button className="btn-nx-danger" onClick={handleLogout}>
                      <LogOut size={15} /> Đăng xuất khỏi mọi thiết bị & Hủy Token
                    </button>
                  </div>
                </div> */}
              </div>
            )}
          </section>
        </div>

        {/* ═════════ MODAL THÊM / SỬA ĐỊA CHỈ ═════════ */}
        {showAddressModal && (
          <div className="prof-modal-backdrop">
            <div className="prof-modal">
              <div className="prof-modal-header">
                <h4>{editingAddress ? "Chỉnh sửa địa chỉ" : "Thêm địa chỉ giao hàng mới"}</h4>
                <button
                  type="button"
                  onClick={() => setShowAddressModal(false)}
                  className="text-stone-400 hover:text-stone-700 p-1"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveAddress}>
                <div className="prof-modal-body space-y-4">
                  <div className="prof-field">
                    <label>Họ tên người nhận *</label>
                    <input
                      type="text"
                      value={addressForm.recipientName}
                      onChange={(e) => setAddressForm({ ...addressForm, recipientName: e.target.value })}
                      required
                    />
                  </div>

                  <div className="prof-field">
                    <label>Số điện thoại liên lạc *</label>
                    <input
                      type="tel"
                      value={addressForm.phone}
                      onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                      placeholder="0901 234 567"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="prof-field">
                      <label>Tỉnh / Thành phố *</label>
                      <input
                        type="text"
                        value={addressForm.province}
                        onChange={(e) => setAddressForm({ ...addressForm, province: e.target.value })}
                        required
                      />
                    </div>
                    <div className="prof-field">
                      <label>Quận / Huyện *</label>
                      <input
                        type="text"
                        value={addressForm.district}
                        onChange={(e) => setAddressForm({ ...addressForm, district: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="prof-field">
                    <label>Phường / Xã</label>
                    <input
                      type="text"
                      value={addressForm.ward}
                      onChange={(e) => setAddressForm({ ...addressForm, ward: e.target.value })}
                      placeholder="Phường Bến Nghé"
                    />
                  </div>

                  <div className="prof-field">
                    <label>Địa chỉ cụ thể (Số nhà, tên đường, tòa nhà) *</label>
                    <textarea
                      rows={2}
                      value={addressForm.addressDetail}
                      onChange={(e) => setAddressForm({ ...addressForm, addressDetail: e.target.value })}
                      placeholder="128 Hai Bà Trưng..."
                      required
                    />
                  </div>

                  <div className="prof-field">
                    <label>Loại địa chỉ</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-xs font-normal cursor-pointer">
                        <input
                          type="radio"
                          name="addrType"
                          checked={addressForm.type === "home"}
                          onChange={() => setAddressForm({ ...addressForm, type: "home" })}
                        />
                        Nhà riêng
                      </label>
                      <label className="flex items-center gap-2 text-xs font-normal cursor-pointer">
                        <input
                          type="radio"
                          name="addrType"
                          checked={addressForm.type === "office"}
                          onChange={() => setAddressForm({ ...addressForm, type: "office" })}
                        />
                        Văn phòng / Công ty
                      </label>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-xs text-stone-700 cursor-pointer pt-2">
                    <input
                      type="checkbox"
                      checked={addressForm.isDefault}
                      onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                    />
                    Đặt làm địa chỉ nhận hàng mặc định
                  </label>
                </div>

                <div className="prof-modal-footer">
                  <button
                    type="button"
                    className="btn-nx-secondary"
                    onClick={() => setShowAddressModal(false)}
                  >
                    Hủy
                  </button>
                  <button type="submit" className="btn-nx-primary">
                    <Save size={15} /> Lưu địa chỉ
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ═════════ MODAL CHI TIẾT ĐƠN HÀNG ═════════ */}
        {selectedOrder && (() => {
          const calculatedSubtotal = typeof selectedOrder.subtotal === "number" && selectedOrder.subtotal > 0
            ? selectedOrder.subtotal
            : selectedOrder.items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);

          const isCancelled = selectedOrder.status === "cancelled";
          const canCancel = selectedOrder.status === "pending" || selectedOrder.status === "confirmed";

          // Tìm lý do hủy nếu đơn bị hủy
          const cancelHistoryItem = selectedOrder.statusHistory?.find(
            (h) => h.status === "cancelled" || (h.note && h.note.toLowerCase().includes("hủy"))
          );
          const cancelReasonText = cancelHistoryItem?.note || selectedOrder.note || "Khách hàng yêu cầu hủy đơn";

          return (
            <div className="prof-modal-backdrop">
              <div className="prof-modal" style={{ maxWidth: 720 }}>
                {/* Modal Header */}
                <div className="prof-modal-header">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4>Chi tiết đơn hàng #{selectedOrder.orderCode}</h4>
                      <span className={`prof-status-badge ${statusMap[selectedOrder.status]?.class || "status-pending"}`}>
                        {statusMap[selectedOrder.status]?.label || selectedOrder.status}
                      </span>
                    </div>
                    <span className="text-xs text-stone-500 mt-1 flex items-center gap-1.5">
                      <Clock size={13} /> Thời gian đặt: {selectedOrder.createdAt}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(null)}
                    className="text-stone-400 hover:text-stone-700 p-1 rounded-lg transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="prof-modal-body space-y-5">
                  {/* Cảnh báo nếu Đơn hàng đã bị hủy */}
                  {isCancelled ? (
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1">
                      <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                        <AlertCircle size={18} className="text-rose-600 flex-shrink-0" />
                        Đơn hàng này đã được hủy
                      </div>
                      <p className="text-rose-700">
                        <strong>Lý do:</strong> {cancelReasonText}
                      </p>
                      {cancelHistoryItem?.timestamp && (
                        <p className="text-rose-500 text-[11.5px]">
                          Thời gian ghi nhận hủy: {cancelHistoryItem.timestamp}
                        </p>
                      )}
                    </div>
                  ) : (
                    /* Stepper Tiến trình đơn hàng */
                    <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl">
                      <div className="text-xs font-bold text-stone-800 uppercase tracking-wider mb-3">
                        Tiến trình giao hàng
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 sm:gap-2 text-center text-[10px] sm:text-xs">
                        {[
                          { key: "pending", label: "Đã đặt hàng" },
                          { key: "processing", label: "Xác nhận & Xử lý" },
                          { key: "shipping", label: "Đang giao hàng" },
                          { key: "completed", label: "Giao thành công" },
                        ].map((step, idx) => {
                          const stepsOrder = ["pending", "processing", "shipping", "completed"];
                          const currentIdx = stepsOrder.indexOf(selectedOrder.status);
                          const isDone = currentIdx >= idx;
                          const isCurrent = currentIdx === idx;

                          return (
                            <div key={step.key} className="flex flex-col items-center">
                              <div
                                className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center font-bold text-[10px] sm:text-xs mb-1 sm:mb-1.5 transition-colors ${
                                  isDone
                                    ? "bg-[#b86b49] text-white"
                                    : "bg-stone-200 text-stone-500"
                                } ${isCurrent ? "ring-2 ring-[#b86b49]/40" : ""}`}
                              >
                                {isDone ? "✓" : idx + 1}
                              </div>
                              <span
                                className={`font-semibold leading-tight text-[10px] sm:text-xs ${
                                  isDone ? "text-stone-900" : "text-stone-400"
                                }`}
                              >
                                {step.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Lịch sử & Mốc thời gian chi tiết (Timeline) */}
                  <div>
                    <h5 className="font-bold text-xs text-stone-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Clock size={14} className="text-stone-600" /> Mốc thời gian & Lịch sử xử lý
                    </h5>

                    {selectedOrder.statusHistory && selectedOrder.statusHistory.length > 0 ? (
                      <div className="prof-timeline-wrap">
                        {selectedOrder.statusHistory.map((h, hIdx) => {
                          const histSt = statusMap[h.status] || { label: h.status, class: "status-pending" };
                          const dotClass = `dot-${h.status}`;

                          return (
                            <div key={h.id || hIdx} className="prof-timeline-item">
                              <div className="prof-timeline-line" />
                              <div className={`prof-timeline-dot ${dotClass}`} />
                              <div className="text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-stone-900">{histSt.label}</span>
                                  {h.timestamp && (
                                    <span className="text-stone-400 font-medium">({h.timestamp})</span>
                                  )}
                                </div>
                                {h.note && (
                                  <div className="mt-1 p-2 bg-stone-50 rounded-lg border border-stone-200 text-stone-700 text-[12px]">
                                    {h.note}
                                  </div>
                                )}
                                {h.updatedBy && (
                                  <div className="text-[11px] text-stone-400 mt-0.5">
                                    Thực hiện bởi: {h.updatedBy}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="prof-timeline-wrap">
                        <div className="prof-timeline-item">
                          <div className={`prof-timeline-dot dot-${selectedOrder.status}`} />
                          <div className="text-xs">
                            <span className="font-bold text-stone-900">
                              {statusMap[selectedOrder.status]?.label || selectedOrder.status}
                            </span>
                            <span className="text-stone-400 ml-2">({selectedOrder.createdAt})</span>
                            <div className="text-[11px] text-stone-400 mt-0.5">
                              Đơn hàng được khởi tạo thành công trên hệ thống Nhà Xinh
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Thông tin giao nhận hàng */}
                  <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1.5">
                    <div className="font-bold text-stone-900 flex items-center gap-1.5">
                      <Truck size={14} className="text-stone-600" /> Thông tin giao nhận hàng:
                    </div>
                    <div className="text-stone-800 font-medium">
                      Người nhận: <strong>{selectedOrder.customerName}</strong> ({selectedOrder.phone})
                    </div>
                    <div className="text-stone-600">Địa chỉ giao: {selectedOrder.address}</div>
                    {selectedOrder.note && (
                      <div className="text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-1">
                        <strong>Ghi chú đơn hàng:</strong> {selectedOrder.note}
                      </div>
                    )}
                  </div>

                  {/* Danh sách mặt hàng */}
                  <div>
                    <h5 className="font-bold text-xs text-stone-800 uppercase tracking-wider mb-2">
                      Sản phẩm trong đơn hàng ({selectedOrder.items.length})
                    </h5>
                    <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl overflow-hidden">
                      {selectedOrder.items.map((it, idx) => (
                        <div key={idx} className="p-2.5 sm:p-3 flex items-center justify-between gap-2.5 text-xs hover:bg-stone-50 transition-colors">
                          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                            <img
                              src={it.image || DEFAULT_PLACEHOLDER_IMAGE}
                              alt={it.name}
                              className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg object-cover border border-stone-200 bg-stone-100 flex-shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <span className="font-bold text-stone-900 block truncate max-w-[140px] sm:max-w-none">{it.name}</span>
                              <div className="text-stone-500 text-[11px] sm:text-[11.5px] mt-0.5 truncate">
                                {it.variantDetails ? `${it.variantDetails} • ` : ""}Số lượng: x{it.quantity}
                              </div>
                              <span className="text-stone-500 text-[10.5px] sm:text-[11px]">Đơn giá: {vnd(it.price)}</span>
                            </div>
                          </div>
                          <span className="font-bold text-[#b86b49] text-xs sm:text-sm whitespace-nowrap">{vnd(it.price * it.quantity)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bảng tổng kết tài chính (Breakdown chi tiết: Tạm tính, Phí vận chuyển, Giảm giá, Tổng thanh toán) */}
                  <div className="prof-summary-box">
                    <h5 className="font-bold text-xs text-stone-800 uppercase tracking-wider mb-2">
                      Chi tiết thanh toán
                    </h5>

                    {/* Tạm tính tiền hàng */}
                    <div className="prof-summary-row">
                      <span>Tạm tính tiền hàng:</span>
                      <strong className="text-stone-800">{vnd(calculatedSubtotal)}</strong>
                    </div>

                    {/* Phí vận chuyển */}
                    <div className="prof-summary-row">
                      <span className="flex items-center gap-1.5">
                        <Truck size={14} className="text-stone-500" />
                        Phí vận chuyển giao hàng:
                      </span>
                      {selectedOrder.shippingFee === 0 || !selectedOrder.shippingFee ? (
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold text-xs border border-emerald-200">
                          Miễn phí vận chuyển
                        </span>
                      ) : (
                        <strong className="text-stone-800">+{vnd(selectedOrder.shippingFee)}</strong>
                      )}
                    </div>

                    {/* Giảm giá Voucher (nếu có) */}
                    {selectedOrder.discountAmount && selectedOrder.discountAmount > 0 ? (
                      <div className="prof-summary-row text-rose-600">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Tag size={14} /> Giảm giá voucher
                          {selectedOrder.couponCode && (
                            <span className="bg-rose-100 text-rose-800 text-[11px] px-1.5 py-0.5 rounded font-mono font-bold uppercase">
                              {selectedOrder.couponCode}
                            </span>
                          )}
                          :
                        </span>
                        <strong className="font-bold">-{vnd(selectedOrder.discountAmount)}</strong>
                      </div>
                    ) : null}

                    {/* Tổng cộng thanh toán */}
                    <div className="prof-summary-row total-row">
                      <div>
                        <span>Tổng tiền thanh toán:</span>
                        <span className="block text-[11.5px] font-normal text-stone-500 mt-0.5">
                          (Đã bao gồm thuế GTGT & chi phí lắp đặt nếu có)
                        </span>
                      </div>
                      <span className="text-base sm:text-lg font-extrabold text-[#b86b49]">{vnd(selectedOrder.total)}</span>
                    </div>

                    {/* Phương thức thanh toán */}
                    <div className="mt-3 pt-3 border-t border-stone-200 flex items-center justify-between text-xs text-stone-600">
                      <span className="flex items-center gap-1.5">
                        <CreditCard size={14} /> Phương thức:
                        <strong className="text-stone-800 uppercase ml-1">
                          {selectedOrder.paymentMethod === "cod" ? "Thanh toán khi nhận hàng (COD)" : selectedOrder.paymentMethod}
                        </strong>
                      </span>
                      <span>
                        Tình trạng:{" "}
                        <strong className={selectedOrder.paymentStatus === "paid" ? "text-emerald-700" : "text-amber-700"}>
                          {selectedOrder.paymentStatus === "paid" ? "Đã thanh toán" : "Chưa thanh toán / Thu khi giao"}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="prof-modal-footer">
                  {canCancel && (
                    <button
                      type="button"
                      className="btn-nx-danger text-xs flex items-center gap-1.5 mr-auto"
                      onClick={() => {
                        handleOpenCancelModal(selectedOrder);
                      }}
                    >
                      <RotateCcw size={14} /> Yêu cầu hủy đơn hàng
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-nx-secondary text-xs"
                    onClick={() => setSelectedOrder(null)}
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ═════════ MODAL XÁC NHẬN HỦY ĐƠN HÀNG ═════════ */}
        {orderToCancel && (
          <div className="prof-modal-backdrop">
            <div className="prof-modal" style={{ maxWidth: 560 }}>
              <div className="prof-modal-header">
                <div>
                  <h4 className="text-rose-700 flex items-center gap-2">
                    <AlertTriangle size={20} className="text-rose-600" />
                    Hủy đơn hàng #{orderToCancel.orderCode}
                  </h4>
                  <span className="text-xs text-stone-500">
                    Tổng giá trị: <strong>{vnd(orderToCancel.total)}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setOrderToCancel(null)}
                  className="text-stone-400 hover:text-stone-700 p-1 rounded-lg transition-colors"
                  disabled={cancelSubmitting}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="prof-modal-body space-y-4">
                <p className="text-xs text-stone-600 font-medium">
                  Vui lòng chọn lý do bạn muốn hủy đơn hàng này để Nhà Xinh ghi nhận và cải thiện dịch vụ:
                </p>

                {/* Danh sách các lý do định sẵn */}
                <div className="space-y-2">
                  {CANCEL_REASONS.map((reason) => {
                    const isSelected = cancelReasonPreset === reason;
                    return (
                      <label
                        key={reason}
                        className={`prof-cancel-option ${isSelected ? "selected" : ""}`}
                      >
                        <input
                          type="radio"
                          name="cancelReason"
                          value={reason}
                          checked={isSelected}
                          onChange={() => setCancelReasonPreset(reason)}
                          className="mt-0.5"
                          disabled={cancelSubmitting}
                        />
                        <span>{reason}</span>
                      </label>
                    );
                  })}
                </div>

                {/* Nhập ghi chú chi tiết nếu muốn hoặc khi chọn Lý do khác */}
                <div className="prof-field mt-3">
                  <label>
                    {cancelReasonPreset === "Lý do khác" ? "Lý do chi tiết của bạn *" : "Ghi chú thêm (tùy chọn)"}
                  </label>
                  <textarea
                    rows={3}
                    value={cancelReasonCustom}
                    onChange={(e) => setCancelReasonCustom(e.target.value)}
                    placeholder={
                      cancelReasonPreset === "Lý do khác"
                        ? "Vui lòng cho biết lý do cụ thể bạn muốn hủy đơn..."
                        : "Nhập thêm thông tin phản hồi nếu có..."
                    }
                    disabled={cancelSubmitting}
                  />
                </div>

                {/* Cảnh báo hủy đơn */}
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                  <AlertCircle size={16} className="text-amber-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Lưu ý quan trọng:</strong> Khi xác nhận hủy, đơn hàng sẽ chuyển sang trạng thái
                    "Đã hủy" và không thể khôi phục. Các mã giảm giá áp dụng (nếu có) sẽ không được tự động cấp lại.
                  </div>
                </div>

                {/* Lỗi nếu có */}
                {cancelError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                    <AlertTriangle size={15} /> {cancelError}
                  </div>
                )}
              </div>

              <div className="prof-modal-footer">
                <button
                  type="button"
                  className="btn-nx-secondary text-xs"
                  onClick={() => setOrderToCancel(null)}
                  disabled={cancelSubmitting}
                >
                  Giữ lại đơn hàng
                </button>
                <button
                  type="button"
                  className="btn-nx-danger text-xs flex items-center gap-1.5"
                  onClick={handleConfirmCancelOrder}
                  disabled={cancelSubmitting}
                >
                  {cancelSubmitting ? "Đang xử lý hủy..." : "Xác nhận hủy đơn hàng"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Toast Notification ── */}
        {toastMessage && (
          <div className="prof-toast">
            <CheckCircle2 size={18} className="text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}
