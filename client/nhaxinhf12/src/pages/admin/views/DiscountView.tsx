import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Tag, Plus, Trash2, Edit, CheckCircle2, XCircle, Search } from "lucide-react";
import type { AdminDiscount, RoleDefinition } from "../../../services/admin/types";
import PermissionGate from "../../../components/admin/PermissionGate";
import { AdminPagination } from "../../../components/admin/AdminPagination";
import { useAdminDiscounts, type DiscountStatusFilter } from "../../../hooks/admin/useAdminDiscounts";
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
    pagination,
    showModal,
    setShowModal,
    editingDisc,
    code,
    setCode,
    description,
    setDescription,
    discountPercent,
    setDiscountPercent,
    maxDiscount,
    setMaxDiscount,
    minOrder,
    setMinOrder,
    expiresAt,
    setExpiresAt,
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Tag className="text-blue-600" size={24} />
            Quản lý Mã giảm giá & Khuyến mãi
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Tạo mã coupon, hạn mức áp dụng, thời gian hiệu lực và theo dõi lượt sử dụng
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

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as DiscountStatusFilter)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
          >
            <option value="all">Tất cả ({discounts.length})</option>
            <option value="active">Đang hiệu lực ({discounts.filter((d) => d.status === "active").length})</option>
            <option value="expired">Hết hạn ({discounts.filter((d) => d.status !== "active").length})</option>
          </select>

          <PermissionGate permission="discounts.create" currentRole={currentRole}>
            <button
              onClick={openCreate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Plus size={15} /> Thêm mã voucher mới
            </button>
          </PermissionGate>
        </div>
      </div>

      {displayedDiscounts.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-xs text-slate-400">
          Không tìm thấy mã giảm giá nào phù hợp với bộ lọc.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedDiscounts.map((d) => (
            <div
              key={d.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-blue-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-sm font-bold bg-pink-50 text-pink-700 border border-pink-200 px-2.5 py-1 rounded">
                    {d.code}
                  </span>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Giảm {d.discountPercent}%
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-800 mb-2">{d.description}</p>
                <div className="text-[11px] text-slate-500 space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <p>• Đơn tối thiểu: <span className="font-semibold text-slate-700">{vnd(d.minOrder)}</span></p>
                  <p>• Giảm tối đa: <span className="font-semibold text-slate-700">{vnd(d.maxDiscount)}</span></p>
                  <p>• Đã dùng: <span className="font-semibold text-blue-600">{d.usedCount}</span> / {d.usageLimit} lượt</p>
                  <p>• Hạn sử dụng: <span className="font-semibold text-slate-700">{d.expiresAt}</span></p>
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
                      <XCircle size={12} /> Hết hạn
                    </span>
                  )}
                </span>

                <div className="flex items-center gap-1">
                  <PermissionGate permission="discounts.create" currentRole={currentRole}>
                    <button
                      onClick={() => openEdit(d)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                      title="Sửa voucher"
                    >
                      <Edit size={15} />
                    </button>
                  </PermissionGate>
                  <PermissionGate permission="discounts.delete" currentRole={currentRole}>
                    <button
                      onClick={() => onDeleteDiscount(d.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Xóa voucher"
                    >
                      <Trash2 size={15} />
                    </button>
                  </PermissionGate>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <AdminPagination pagination={pagination} pageSizeOptions={[6, 12, 24]} itemLabel="mã giảm giá" />
      </div>

      {showModal &&
        createPortal(
          <div
            className="fixed inset-0 z-9999 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overscroll-contain animate-in fade-in duration-200"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowModal(false);
            }}
          >
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Tag size={18} className="text-blue-600" />
                  {editingDisc ? "Chỉnh sửa mã giảm giá" : "Tạo mã giảm giá mới"}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-md"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleSave}>
              <div className="p-5 space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Mã Voucher (viết hoa)</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: BANMOI15, TET2026..."
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Mô tả chương trình</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Giảm 15% tối đa 2 triệu cho đơn từ 10 triệu"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">% Giảm giá</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={100}
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">Mức giảm tối đa (VNĐ)</label>
                    <input
                      type="number"
                      required
                      step={100000}
                      value={maxDiscount}
                      onChange={(e) => setMaxDiscount(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">Giá trị đơn tối thiểu</label>
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
                    <label className="block font-semibold text-slate-700 mb-1.5">Ngày hết hạn</label>
                    <input
                      type="text"
                      placeholder="DD/MM/YYYY"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50/70">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-all"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 shadow-xs transition-all"
                >
                  Lưu voucher
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
