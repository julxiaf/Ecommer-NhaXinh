import { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Tag,
  Plus,
  Trash2,
  Edit,
  CheckCircle2,
  XCircle,
  Search,
  Sparkles,
  Layers,
  Calendar,
  Users,
  Percent,
  Coins,
  Truck,
  Package,
} from "lucide-react";
import type { AdminDiscount, RoleDefinition } from "../../../services/admin/types";
import PermissionGate from "../../../components/admin/PermissionGate";
import { AdminPagination } from "../../../components/admin/AdminPagination";
import {
  useAdminDiscounts,
  type DiscountStatusFilter,
  type DiscountTargetFilter,
} from "../../../hooks/admin/useAdminDiscounts";
import { vnd } from "../../../util/Constain";

interface DiscountViewProps {
  discounts: AdminDiscount[];
  currentRole: RoleDefinition;
  onSaveDiscount: (d: Partial<AdminDiscount>) => void;
  onDeleteDiscount: (id: string) => void;
}

export default function DiscountView({
  discounts,
  currentRole,
  onSaveDiscount,
  onDeleteDiscount,
}: DiscountViewProps) {
  const {
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    targetFilter,
    setTargetFilter,
    pagination,
    showModal,
    setShowModal,
    editingDisc,
    code,
    setCode,
    name,
    setName,
    description,
    setDescription,
    discountType,
    setDiscountType,
    discountValue,
    setDiscountValue,
    maxDiscount,
    setMaxDiscount,
    minOrder,
    setMinOrder,
    targetCustomer,
    setTargetCustomer,
    scopeType,
    setScopeType,
    applicableCollections,
    setApplicableCollections,
    applicableProductIds,
    setApplicableProductIds,
    startsAt,
    setStartsAt,
    expiresAt,
    setExpiresAt,
    usageLimit,
    setUsageLimit,
    status,
    setStatus,
    openCreate,
    openEdit,
    handleSave,
  } = useAdminDiscounts({ discounts, onSaveDiscount });

  const { paginatedItems: displayedDiscounts } = pagination;

  // Khóa cuộn trang nền khi mở Modal và hỗ trợ phím Escape
  useEffect(() => {
    if (showModal) {
      const prevBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") setShowModal(false);
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = prevBodyOverflow;
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [showModal, setShowModal]);

  // Thống kê nhanh
  const totalCount = discounts.length;
  const activeCount = discounts.filter((d) => d.status === "active").length;
  const newUserCount = discounts.filter((d) => d.targetCustomer === "FIRST_ORDER").length;
  const collectionCount = discounts.filter((d) => d.scopeType === "COLLECTION").length;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Tag size={20} />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Tổng mã ưu đãi</p>
            <p className="text-xl font-bold text-slate-900">{totalCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Đang hiệu lực</p>
            <p className="text-xl font-bold text-emerald-600">{activeCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Sparkles size={20} />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Khách hàng mới</p>
            <p className="text-xl font-bold text-amber-600">{newUserCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Layers size={20} />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Theo Bộ sưu tập</p>
            <p className="text-xl font-bold text-indigo-600">{collectionCount}</p>
          </div>
        </div>
      </div>

      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Tag className="text-blue-600" size={24} />
            Quản lý Mã giảm giá & Khuyến mãi
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Thiết lập giảm giá % cho người mới đăng ký (thanh toán lần đầu), theo bộ sưu tập, sản phẩm và ngày hiệu lực
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative w-full sm:w-56">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm mã voucher, mô tả..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          {/* Type Filter */}
          <select
            value={targetFilter}
            onChange={(e) => setTargetFilter(e.target.value as DiscountTargetFilter)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
          >
            <option value="all">Tất cả hình thức</option>
            <option value="first_order">⭐ Người mới (Lần đầu)</option>
            <option value="collection">🏛️ Theo Bộ sưu tập</option>
            <option value="percent">% Giảm giá</option>
            <option value="fixed">Tiền mặt cố định</option>
            <option value="freeship">Freeship</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as DiscountStatusFilter)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
          >
            <option value="all">Tất cả trạng thái ({totalCount})</option>
            <option value="active">Đang hiệu lực ({activeCount})</option>
            <option value="expired">Hết hạn ({totalCount - activeCount})</option>
          </select>

          <PermissionGate permission="discounts.create" currentRole={currentRole}>
            <button
              onClick={openCreate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Plus size={15} /> Thêm mã voucher mới
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* Discount Cards Grid */}
      {displayedDiscounts.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-xs text-slate-400">
          Không tìm thấy mã giảm giá nào phù hợp với bộ lọc hiện tại.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedDiscounts.map((d) => {
            const isPercent = d.discountType === "PERCENT" || (!d.discountType && d.discountPercent > 0);
            const isFreeShip = d.discountType === "FREESHIP";
            const isFirstOrder = d.targetCustomer === "FIRST_ORDER";
            const isCollection = d.scopeType === "COLLECTION";
            const isProduct = d.scopeType === "PRODUCT";

            return (
              <div
                key={d.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-blue-300 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-sm font-bold bg-pink-50 text-pink-700 border border-pink-200 px-2.5 py-1 rounded">
                      {d.code}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {isPercent && (
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                          <Percent size={12} /> Giảm {d.discountValue ?? d.discountPercent}%
                        </span>
                      )}
                      {!isPercent && !isFreeShip && (
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200 flex items-center gap-1">
                          <Coins size={12} /> Giảm {vnd(d.discountValue ?? d.maxDiscount)}
                        </span>
                      )}
                      {isFreeShip && (
                        <span className="text-xs font-bold text-sky-600 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200 flex items-center gap-1">
                          <Truck size={12} /> Miễn phí ship
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Special criteria tags */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                    {isFirstOrder && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Sparkles size={11} className="text-amber-500" /> Khách mới (Lần đầu)
                      </span>
                    )}
                    {isCollection && (
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Layers size={11} className="text-purple-500" /> BST: {d.applicableCollections || "Chỉ định"}
                      </span>
                    )}
                    {isProduct && (
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Package size={11} className="text-blue-500" /> SP chỉ định ({d.applicableProductIds || "Nhiều SP"})
                      </span>
                    )}
                    {!isFirstOrder && !isCollection && !isProduct && (
                      <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        Toàn bộ sản phẩm
                      </span>
                    )}
                  </div>

                  <p className="text-xs font-semibold text-slate-900 mb-1">{d.name || d.code}</p>
                  <p className="text-xs text-slate-600 mb-3 line-clamp-2">{d.description}</p>

                  <div className="text-[11px] text-slate-500 space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <p>
                      • Đơn tối thiểu: <span className="font-semibold text-slate-700">{vnd(d.minOrder)}</span>
                    </p>
                    {isPercent && d.maxDiscount > 0 && (
                      <p>
                        • Giảm tối đa: <span className="font-semibold text-slate-700">{vnd(d.maxDiscount)}</span>
                      </p>
                    )}
                    <p>
                      • Đã dùng: <span className="font-semibold text-blue-600">{d.usedCount}</span> / {d.usageLimit} lượt
                    </p>
                    <p>
                      • Hiệu lực:{" "}
                      <span className="font-semibold text-slate-700">
                        {d.startsAt ? `${d.startsAt.split("T")[0]} → ` : ""}
                        {d.expiresAt}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    {d.status === "active" ? (
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 size={12} /> Đang hiệu lực
                      </span>
                    ) : (
                      <span className="text-slate-400 flex items-center gap-1">
                        <XCircle size={12} /> Hết hạn / Tạm khóa
                      </span>
                    )}
                  </span>

                  <div className="flex items-center gap-1">
                    <PermissionGate permission="discounts.create" currentRole={currentRole}>
                      <button
                        onClick={() => openEdit(d)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                        title="Sửa voucher"
                      >
                        <Edit size={15} />
                      </button>
                    </PermissionGate>
                    <PermissionGate permission="discounts.delete" currentRole={currentRole}>
                      <button
                        onClick={() => onDeleteDiscount(d.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Xóa voucher"
                      >
                        <Trash2 size={15} />
                      </button>
                    </PermissionGate>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <AdminPagination pagination={pagination} pageSizeOptions={[6, 12, 24]} itemLabel="mã giảm giá" />
      </div>

      {/* Modal Tạo / Chỉnh sửa Voucher */}
      {showModal &&
        createPortal(
          <div
            className="fixed inset-0 z-9999 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overscroll-contain animate-in fade-in duration-200"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowModal(false);
            }}
          >
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Tag size={18} className="text-blue-600" />
                  {editingDisc ? `Chỉnh sửa mã giảm giá: ${editingDisc.code}` : "Tạo mã giảm giá mới"}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-md cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
                {/* 1. Mã & Tên chương trình */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      Mã Voucher <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="VD: NEWUSER15, VICTORIA10"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">Tên chương trình ưu đãi</label>
                    <input
                      type="text"
                      placeholder="VD: Giảm 15% Thành viên mới"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Mô tả chương trình</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Ưu đãi 15% tối đa 1 triệu cho đơn hàng đầu tiên của khách mới"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {/* 2. Loại giảm giá & Giá trị */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <p className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Coins size={14} className="text-blue-600" /> Loại ưu đãi & Mức giảm
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setDiscountType("PERCENT")}
                      className={`py-2 px-3 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                        discountType === "PERCENT"
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      % Giảm giá
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType("FIXED")}
                      className={`py-2 px-3 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                        discountType === "FIXED"
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      Tiền mặt cố định
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType("FREESHIP")}
                      className={`py-2 px-3 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                        discountType === "FREESHIP"
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      Miễn phí ship
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {discountType === "PERCENT" && (
                      <div>
                        <label className="block font-medium text-slate-700 mb-1">% Giảm giá (1-100)</label>
                        <input
                          type="number"
                          required
                          min={1}
                          max={100}
                          value={discountValue}
                          onChange={(e) => setDiscountValue(Number(e.target.value))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                    )}
                    {discountType === "FIXED" && (
                      <div>
                        <label className="block font-medium text-slate-700 mb-1">Số tiền giảm (VNĐ)</label>
                        <input
                          type="number"
                          required
                          step={50000}
                          value={discountValue}
                          onChange={(e) => setDiscountValue(Number(e.target.value))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold"
                        />
                      </div>
                    )}
                    {discountType === "PERCENT" && (
                      <div>
                        <label className="block font-medium text-slate-700 mb-1">Mức giảm tối đa (VNĐ)</label>
                        <input
                          type="number"
                          step={100000}
                          placeholder="0 = Không giới hạn"
                          value={maxDiscount}
                          onChange={(e) => setMaxDiscount(Number(e.target.value))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Đối tượng & Phạm vi áp dụng */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <p className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Users size={14} className="text-amber-600" /> Đối tượng & Phạm vi áp dụng
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Đối tượng khách hàng</label>
                      <select
                        value={targetCustomer}
                        onChange={(e) => setTargetCustomer(e.target.value as "ALL" | "FIRST_ORDER")}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 font-medium"
                      >
                        <option value="ALL">Tất cả khách hàng</option>
                        <option value="FIRST_ORDER">⭐ Khách mới (Thanh toán lần đầu)</option>
                      </select>
                      {targetCustomer === "FIRST_ORDER" && (
                        <p className="mt-1 text-[11px] text-amber-600">
                          Áp dụng cho tài khoản đăng ký mới chưa có đơn hàng nào trước đó.
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Phạm vi áp dụng</label>
                      <select
                        value={scopeType}
                        onChange={(e) =>
                          setScopeType(e.target.value as "ALL" | "PRODUCT" | "COLLECTION" | "CATEGORY")
                        }
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 font-medium"
                      >
                        <option value="ALL">Toàn bộ giỏ hàng</option>
                        <option value="COLLECTION">Theo Bộ sưu tập cụ thể</option>
                        <option value="PRODUCT">Theo Sản phẩm chỉ định (ID)</option>
                      </select>
                    </div>
                  </div>

                  {scopeType === "COLLECTION" && (
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Slug Bộ sưu tập (cách nhau bằng dấu phẩy)
                      </label>
                      <input
                        type="text"
                        placeholder="VD: victoria, coastal, sofa-collection"
                        value={applicableCollections}
                        onChange={(e) => setApplicableCollections(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  )}

                  {scopeType === "PRODUCT" && (
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Danh sách Product IDs (cách nhau bằng dấu phẩy)
                      </label>
                      <input
                        type="text"
                        placeholder="VD: 1, 2, 15, 28"
                        value={applicableProductIds}
                        onChange={(e) => setApplicableProductIds(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* 4. Điều kiện đơn hàng & Thời gian hiệu lực */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">Giá trị đơn tối thiểu (VNĐ)</label>
                    <input
                      type="number"
                      required
                      step={500000}
                      value={minOrder}
                      onChange={(e) => setMinOrder(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">Tổng lượt dùng tối đa</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={usageLimit}
                      onChange={(e) => setUsageLimit(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                      <Calendar size={13} className="text-slate-400" /> Ngày bắt đầu
                    </label>
                    <input
                      type="text"
                      placeholder="DD/MM/YYYY (để trống = hiệu lực ngay)"
                      value={startsAt}
                      onChange={(e) => setStartsAt(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                      <Calendar size={13} className="text-slate-400" /> Ngày hết hạn
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="DD/MM/YYYY"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Trạng thái mã giảm giá</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as "active" | "expired")}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    <option value="active">Đang hiệu lực (Active)</option>
                    <option value="expired">Tạm ngưng / Đã hết hạn (Inactive)</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 shadow-xs transition-all cursor-pointer"
                  >
                    {editingDisc ? "Cập nhật voucher" : "Tạo voucher mới"}
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
