import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronRight, User as UserIcon, Package, Heart, MapPin, LogOut,
  Edit3, Save, ShieldCheck, Plus, Trash2, CheckCircle2,
  Clock, X, AlertTriangle, KeyRound, Check
} from "lucide-react";
import Header from "../components/Headers";
import Footer from "../components/Footer";
import { useStore } from "../hooks/useStore";
import { userService, type UserAddress, type UserProfile } from "../services/userService";
import type { AdminOrder } from "../services/admin/types";
import "./pages.css";
import "./profile.css";

type Tab = "info" | "orders" | "addresses" | "security";

const vnd = (n: number) => Number(n || 0).toLocaleString("vi-VN") + " ₫";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout, cartCount, wishlist } = useStore();

  const [activeTab, setActiveTab] = useState<Tab>("info");
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

  // 1. Kiểm tra Token bảo mật & Khởi tạo dữ liệu
  useEffect(() => {
    // Nếu token hết hạn hoặc không có user -> Điều hướng về đăng nhập
    if (userService.isTokenExpired() && !user) {
      navigate("/dang-nhap", { replace: true });
      return;
    }

    // Tự sinh session token tạm nếu user đã có trong useStore để tránh văng ra
    if (!userService.getToken()) {
      userService.saveSession("nhaxinh_jwt_" + Date.now(), 24);
    }

    // Tải dữ liệu hồ sơ
    void (async () => {
      const p = await userService.getProfile();
      setProfile(p);
      setProfileForm({
        fullName: p.fullName,
        phone: p.phone,
        address: p.address,
        gender: p.gender || "male",
        birthDate: p.birthDate || "",
      });

      // Tải sổ địa chỉ
      try {
        const addrList = await userService.getAddresses();
        setAddresses(addrList);
      } catch (err) {
        console.warn("Không thể tải sổ địa chỉ:", err);
      }

      // Tải đơn hàng
      setLoadingOrders(true);
      const userOrders = await userService.getUserOrders(p.email, p.phone);
      setOrders(userOrders);
      setLoadingOrders(false);
    })();
  }, [navigate, user]);

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

  // Hủy đơn hàng (nếu đang pending)
  const handleCancelOrder = async (orderCodeOrId: string) => {
    const reason = prompt("Vui lòng nhập lý do bạn muốn hủy đơn hàng này:");
    if (!reason || !reason.trim()) return;

    try {
      await userService.cancelUserOrder(orderCodeOrId, reason);
      if (profile) {
        const updatedOrders = await userService.getUserOrders(profile.email, profile.phone);
        setOrders(updatedOrders);
      }
      if (selectedOrder && (selectedOrder.id === orderCodeOrId || selectedOrder.orderCode === orderCodeOrId)) {
        setSelectedOrder(null);
      }
      showToast("Đã gửi yêu cầu hủy đơn hàng thành công.");
    } catch (err: any) {
      showToast(err?.message || "Không thể hủy đơn hàng.");
    }
  };

  // Đăng xuất an toàn
  const handleLogout = () => {
    if (window.confirm("Bạn có chắc muốn đăng xuất khỏi tài khoản Nhà Xinh?")) {
      userService.clearSession();
      logout();
      navigate("/dang-nhap");
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
        <nav className="breadcrumb py-4 text-xs flex items-center gap-1.5 text-stone-500" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-stone-900 transition-colors">Trang chủ</Link>
          <ChevronRight size={13} />
          <span className="text-stone-800 font-semibold">Tài khoản & Hồ sơ của tôi (/me)</span>
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
              <span>•</span>
              <span className="prof-token-status">
                <ShieldCheck size={14} /> Phiên bảo mật Token 24h
              </span>
            </div>
          </div>

          <div className="prof-hero-tier-card">
            <div className="prof-tier-label">Hạng thành viên VIP</div>
            <div className="prof-tier-points">
              {profile.loyaltyPoints.toLocaleString()} <span>điểm</span>
            </div>
            <div className="prof-tier-progress">
              <div className="prof-tier-progress-bar" style={{ width: "70%" }}></div>
            </div>
            <div className="prof-tier-sub">
              Tổng chi tiêu: <strong>{vnd(profile.totalSpent)}</strong>
            </div>
          </div>
        </section>

        {/* ── Main Layout ── */}
        <div className="prof-layout">
          {/* Sidebar */}
          <aside className="prof-sidebar">
            <nav className="prof-nav">
              <button
                className={`prof-nav-item ${activeTab === "info" ? "active" : ""}`}
                onClick={() => setActiveTab("info")}
              >
                <UserIcon size={18} />
                Hồ sơ cá nhân
              </button>

              <button
                className={`prof-nav-item ${activeTab === "orders" ? "active" : ""}`}
                onClick={() => setActiveTab("orders")}
              >
                <Package size={18} />
                Đơn hàng của tôi
                {orders.length > 0 && <span className="prof-nav-badge">{orders.length}</span>}
              </button>

              <button
                className={`prof-nav-item ${activeTab === "addresses" ? "active" : ""}`}
                onClick={() => setActiveTab("addresses")}
              >
                <MapPin size={18} />
                Sổ địa chỉ
                <span className="prof-nav-badge">{addresses.length}</span>
              </button>

              <button
                className={`prof-nav-item ${activeTab === "security" ? "active" : ""}`}
                onClick={() => setActiveTab("security")}
              >
                <KeyRound size={18} />
                Bảo mật & Cài đặt
              </button>

              <Link to="/yeu-thich" className="prof-nav-item">
                <Heart size={18} />
                Sản phẩm yêu thích
                {wishlist.length > 0 && <span className="prof-nav-badge">{wishlist.length}</span>}
              </Link>

              <div className="prof-nav-divider" />

              <button className="prof-nav-item prof-nav-logout" onClick={handleLogout}>
                <LogOut size={18} />
                Đăng xuất
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
                    <h3><UserIcon size={22} className="text-stone-700" /> Thông tin cá nhân</h3>
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

                    <div className="prof-field prof-field-full">
                      <label>Địa chỉ thường trú</label>
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
                    </div>
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
                    <h3><Package size={22} className="text-stone-700" /> Lịch sử đơn hàng</h3>
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
                      return (
                        <div key={ord.id} className="prof-order-card">
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
                                  src={item.image || "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=200&q=80"}
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
                              {ord.status === "pending" && (
                                <button
                                  className="btn-nx-danger text-xs"
                                  onClick={() => handleCancelOrder(ord.orderCode || ord.id)}
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
                    <h3><MapPin size={22} className="text-stone-700" /> Sổ địa chỉ giao hàng</h3>
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
                    <h3><KeyRound size={22} className="text-stone-700" /> Bảo mật & Phiên làm việc</h3>
                    <p>Quản lý mật khẩu, thời hạn token và cài đặt an toàn tài khoản</p>
                  </div>
                </div>

                {/* Form Đổi Mật Khẩu */}
                <form onSubmit={handleChangePassword} className="max-w-xl space-y-4 mb-8">
                  <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                    <ShieldCheck size={18} className="text-stone-700" /> Đổi mật khẩu đăng nhập
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
                <div className="space-y-4">
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
                </div>
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

                  <div className="grid grid-cols-2 gap-3">
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
        {selectedOrder && (
          <div className="prof-modal-backdrop">
            <div className="prof-modal" style={{ maxWidth: 640 }}>
              <div className="prof-modal-header">
                <div>
                  <h4>Chi tiết đơn hàng #{selectedOrder.orderCode}</h4>
                  <span className="text-xs text-stone-500">Ngày đặt: {selectedOrder.createdAt}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="text-stone-400 hover:text-stone-700 p-1"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="prof-modal-body space-y-4">
                {/* Trạng thái đơn */}
                <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-stone-500">Trạng thái xử lý:</span>
                    <strong className="block text-stone-900 mt-0.5">
                      {statusMap[selectedOrder.status]?.label || selectedOrder.status}
                    </strong>
                  </div>
                  <div>
                    <span className="text-stone-500">Thanh toán:</span>
                    <strong className="block text-stone-900 mt-0.5 uppercase">
                      {selectedOrder.paymentMethod} ({selectedOrder.paymentStatus})
                    </strong>
                  </div>
                </div>

                {/* Thông tin giao hàng */}
                <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1">
                  <div className="font-semibold text-stone-900">Địa chỉ nhận hàng:</div>
                  <div className="text-stone-700 font-medium">
                    {selectedOrder.customerName} - {selectedOrder.phone}
                  </div>
                  <div className="text-stone-500">{selectedOrder.address}</div>
                </div>

                {/* Danh sách mặt hàng */}
                <div>
                  <h5 className="font-bold text-xs text-stone-800 uppercase tracking-wider mb-2">
                    Sản phẩm đã chọn ({selectedOrder.items.length})
                  </h5>
                  <div className="divide-y divide-stone-100 border border-stone-100 rounded-xl overflow-hidden">
                    {selectedOrder.items.map((it, idx) => (
                      <div key={idx} className="p-3 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-semibold text-stone-900 block">{it.name}</span>
                          <span className="text-stone-400">Số lượng: x{it.quantity}</span>
                        </div>
                        <span className="font-bold text-stone-900">{vnd(it.price * it.quantity)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tổng kết */}
                <div className="pt-2 border-t border-stone-200 flex items-center justify-between">
                  <span className="font-semibold text-stone-700 text-sm">Tổng cộng thanh toán:</span>
                  <span className="font-bold text-base text-stone-900">{vnd(selectedOrder.total)}</span>
                </div>
              </div>

              <div className="prof-modal-footer">
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
