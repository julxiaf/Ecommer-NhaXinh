import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  Sparkles,
  Plus,
  Edit,
  Trash2,
  RotateCcw,
  Search,
  X,
  EyeOff,
  CheckCircle2,
  Image as ImageIcon,
  AlertTriangle,
  Upload,
  ExternalLink,
  Layers,
  Package,
  Film,
  User,
} from "lucide-react";
import type { AdminCategory, AdminProduct, RoleDefinition } from "../../../services/admin/types";
import PermissionGate from "../../../components/admin/PermissionGate";
import { AdminPagination } from "../../../components/admin/AdminPagination";
import { useAdminCategories } from "../../../hooks/admin/useAdminCategories";

interface CollectionViewProps {
  categories: AdminCategory[];
  products?: AdminProduct[];
  currentRole: RoleDefinition;
  currentUserName?: string;
  onSaveCategory: (cat: Partial<AdminCategory>, imageFile?: File | null) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  onRestoreCategory: (id: string) => Promise<void>;
}

export default function CollectionView({
  categories,
  products = [],
  currentRole,
  currentUserName,
  onSaveCategory,
  onDeleteCategory,
  onRestoreCategory,
}: CollectionViewProps) {
  const [newGalleryUrl, setNewGalleryUrl] = useState("");
  const [productSearch, setProductSearch] = useState("");

  const {
    search,
    setSearch,
    activeTab,
    setActiveTab,
    showModal,
    setShowModal,
    editingCategory,
    formName,
    formSlug,
    setFormSlug,
    isSlugDuplicate,
    suggestedSlug,
    handleApplySuggestedSlug,
    formOrder,
    setFormOrder,
    formDescription,
    setFormDescription,
    formImageUrl,
    setFormImageUrl,
    formImageFile,
    setFormImageFile,
    formPreviewUrl,
    formSubtitle,
    setFormSubtitle,
    formIntroQuote,
    setFormIntroQuote,
    formStoryTitle,
    setFormStoryTitle,
    formVideoUrl,
    setFormVideoUrl,
    formGalleryImages,
    setFormGalleryImages,
    formStyleTag,
    setFormStyleTag,
    formMaterials,
    setFormMaterials,
    formProductIds,
    uploadingMedia,
    handleUploadGalleryFiles,
    handleUploadVideoFile,
    toggleProductInCollection,
    submitError,
    toastMessage,
    isCollectionItem,
    activePagination,
    trashPagination,
    handleOpenAdd,
    handleOpenEdit,
    handleNameChange,
    handleSubmit,
    handleDelete,
    handleRestore,
  } = useAdminCategories({
    categories,
    onSaveCategory,
    onDeleteCategory,
    onRestoreCategory,
    viewMode: "collections_only",
  });

  const currentPagination =
    activeTab === "trash" ? trashPagination : activePagination;

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

  const activeCollections = categories.filter(
    (c) => !c.isDeleted && isCollectionItem(c)
  );
  const trashCollections = categories.filter(
    (c) => c.isDeleted && isCollectionItem(c)
  );
  const totalProductsInCollections = activeCollections.reduce(
    (sum, c) => sum + (c.productCount || 0),
    0
  );

  return (
    <div className="space-y-6 text-slate-800">
      {toastMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800 shadow-xs">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Header Controls ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="text-violet-600" size={24} />
            Quản lý Bộ sưu tập Thiết kế (Lookbook Collections)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý danh sách các Bộ sưu tập nội thất (Victoria, Hùng King, Mây, Osaka...), ảnh bìa Lookbook, SEO Slug (/bo-suu-tap/:slug) và sản phẩm gắn kèm.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto justify-between md:justify-end">
          {/* Tab filter: Đang hiển thị / Thùng rác */}
          <div className="inline-flex p-1 bg-slate-100 rounded-lg text-xs font-semibold">
            <button
              className={`px-3.5 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === "active"
                  ? "bg-white text-violet-600 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              onClick={() => setActiveTab("active")}
            >
              <Sparkles size={14} /> Bộ sưu tập đang chạy ({activeCollections.length})
            </button>
            <button
              className={`px-3.5 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === "trash"
                  ? "bg-white text-rose-600 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              onClick={() => setActiveTab("trash")}
            >
              <EyeOff size={14} /> Thùng rác ({trashCollections.length})
            </button>
          </div>

          {/* Search bar */}
          <div className="relative max-w-xs w-full sm:w-56">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên BST, slug, mô tả..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all"
            />
          </div>

          {/* Add Collection button */}
          <PermissionGate permission="categories.create" currentRole={currentRole}>
            <button
              onClick={() => handleOpenAdd(undefined, true, "COLLECTION")}
              className="px-3.5 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Plus size={15} /> Thêm Bộ sưu tập mới
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* ── Summary Stat Pills ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
            <Layers size={20} />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Bộ sưu tập hoạt động</div>
            <div className="text-lg font-bold text-slate-900">{activeCollections.length}</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Package size={20} />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Sản phẩm trong BST</div>
            <div className="text-lg font-bold text-slate-900">{totalProductsInCollections}</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-3 shadow-xs">
          <div>
            <div className="text-xs text-slate-500 font-medium">Trang Bộ sưu tập trên web</div>
            <div className="text-xs font-bold text-violet-600 mt-0.5">/bo-suu-tap</div>
          </div>
          <Link
            to="/bo-suu-tap"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-violet-50 hover:text-violet-700 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
          >
            <span>Mở trang</span>
            <ExternalLink size={13} />
          </Link>
        </div>
      </div>

      {submitError && (
        <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          {submitError}
        </p>
      )}

      {/* ── Table Card ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px] font-semibold">
                <th className="py-3 px-4">Ảnh bìa Lookbook</th>
                <th className="py-3 px-4">Tên Bộ sưu tập</th>
                <th className="py-3 px-4">Đường dẫn SEO</th>
                <th className="py-3 px-4">Người tạo</th>
                <th className="py-3 px-4 text-center">Thứ tự</th>
                <th className="py-3 px-4 text-center">Sản phẩm</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeTab !== "trash" ? (
                activePagination.paginatedItems.length > 0 ? (
                  activePagination.paginatedItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Ảnh bìa Lookbook */}
                      <td className="py-3 px-4 w-36">
                        {item.imageUrl ? (
                          <div className="w-28 h-16 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shadow-2xs">
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        ) : (
                          <div className="w-28 h-16 rounded-lg border border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-slate-400 gap-1">
                            <ImageIcon size={18} />
                            <span className="text-[10px]">Chưa có ảnh</span>
                          </div>
                        )}
                      </td>

                      {/* Tên & Mô tả */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs sm:text-sm">
                              {item.name}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-200 inline-flex items-center gap-0.5">
                              <Sparkles size={10} /> BST
                            </span>
                          </div>
                          {item.description ? (
                            <p className="text-[11px] text-slate-500 line-clamp-2 max-w-md">
                              {item.description}
                            </p>
                          ) : (
                            <p className="text-[11px] text-slate-400 italic">Chưa có mô tả phong cách</p>
                          )}
                        </div>
                      </td>

                      {/* Đường dẫn SEO */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <code className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px]">
                            /bo-suu-tap/{item.slug}
                          </code>
                          <Link
                            to={`/bo-suu-tap/${item.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-400 hover:text-violet-600 transition-colors p-1"
                            title="Xem trang bộ sưu tập thực tế"
                          >
                            <ExternalLink size={13} />
                          </Link>
                        </div>
                      </td>

                      {/* Người tạo */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          <User size={11} className="text-slate-500" />
                          {item.createdBy || "Quản trị viên"}
                        </span>
                      </td>

                      {/* Thứ tự */}
                      <td className="py-3 px-4 text-center font-medium text-slate-600">
                        {item.order}
                      </td>

                      {/* Số sản phẩm */}
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          <Package size={12} />
                          {item.productCount}
                        </span>
                      </td>

                      {/* Trạng thái */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Đang chạy
                        </span>
                      </td>

                      {/* Thao tác */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <PermissionGate permission="categories.edit" currentRole={currentRole}>
                            <button
                              onClick={() => handleOpenEdit(item)}
                              className="p-1.5 text-slate-500 hover:text-violet-600 hover:bg-violet-50 rounded-md transition-all"
                              title="Chỉnh sửa bộ sưu tập"
                            >
                              <Edit size={14} />
                            </button>
                          </PermissionGate>
                          <PermissionGate permission="categories.delete" currentRole={currentRole}>
                            <button
                              onClick={() => void handleDelete(item.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all"
                              title="Chuyển vào thùng rác (xóa mềm)"
                            >
                              <Trash2 size={14} />
                            </button>
                          </PermissionGate>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                      Không tìm thấy bộ sưu tập nào phù hợp với bộ lọc tìm kiếm.
                    </td>
                  </tr>
                )
              ) : (
                /* ── Tab Thùng rác (Xóa mềm) ── */
                trashPagination.paginatedItems.length > 0 ? (
                  trashPagination.paginatedItems.map((cat) => (
                    <tr key={cat.id} className="bg-rose-50/40 hover:bg-rose-50/70 transition-colors">
                      <td className="py-3 px-4 w-36">
                        {cat.imageUrl ? (
                          <img
                            src={cat.imageUrl}
                            alt={cat.name}
                            className="w-24 h-14 rounded-lg object-cover grayscale opacity-70 border border-rose-200"
                          />
                        ) : (
                          <div className="w-24 h-14 rounded-lg border border-dashed border-rose-200 flex items-center justify-center text-rose-400">
                            <EyeOff size={16} />
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <EyeOff size={16} className="text-rose-500 shrink-0" />
                          <span className="line-through text-slate-500 font-medium">{cat.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                        /bo-suu-tap/{cat.slug}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          <User size={11} className="text-slate-500" />
                          {cat.createdBy || "Quản trị viên"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-slate-500">{cat.order}</td>
                      <td className="py-3 px-4 text-center text-slate-500">{cat.productCount}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-700 border border-rose-200">
                          Đã ẩn (Thùng rác)
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <PermissionGate permission="categories.delete" currentRole={currentRole}>
                          <button
                            onClick={() => void handleRestore(cat.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 ml-auto shadow-xs transition-all"
                          >
                            <RotateCcw size={13} /> Khôi phục
                          </button>
                        </PermissionGate>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                      Thùng rác rỗng. Chưa có bộ sưu tập nào bị xóa mềm.
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
        <AdminPagination pagination={currentPagination} itemLabel="bộ sưu tập" />
      </div>

      {/* ── Modal Thêm / Chỉnh sửa Bộ sưu tập ── */}
      {showModal &&
        createPortal(
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-9999 p-3 sm:p-5 overscroll-contain animate-in fade-in duration-200"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowModal(false);
            }}
          >
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Sparkles className="text-violet-600" size={18} />
                    {editingCategory
                      ? `Chỉnh sửa Bộ sưu tập: ${editingCategory.name}`
                      : "Thêm mới Bộ sưu tập thiết kế"}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-semibold bg-violet-50 text-violet-700 border border-violet-200">
                      <User size={10} />
                      {editingCategory ? `Người tạo: ${editingCategory.createdBy || "Quản trị viên"}` : `Người tạo: ${currentUserName || currentRole.name || "Quản trị viên"}`}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Đóng (Esc)"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col">
                <div className="p-5 space-y-4 text-xs flex-1 overflow-y-auto overscroll-contain">
                  {submitError && (
                    <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                      {submitError}
                    </p>
                  )}

                  <div className="p-3 rounded-xl border border-violet-200 bg-violet-50/50 flex items-center gap-2.5">
                    <Sparkles className="text-violet-600 shrink-0" size={16} />
                    <p className="text-[11px] text-violet-800 leading-relaxed">
                      Bộ sưu tập thiết kế sẽ tự động xuất hiện tại trang <strong>/bo-suu-tap</strong>, trên Mega Menu và liên kết với các sản phẩm tương ứng.
                    </p>
                  </div>

                  {/* Tên Bộ sưu tập */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      Tên Bộ sưu tập <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Bộ sưu tập Victoria II, BST Hùng King..."
                      value={formName}
                      onChange={(e) => handleNameChange(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 focus:outline-none"
                    />
                  </div>

                  {/* SEO Slug */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block font-semibold text-slate-700">
                        Đường dẫn SEO (Slug) - Tự sinh
                      </label>
                      {isSlugDuplicate && (
                        <span className="text-[11px] font-bold text-amber-600 flex items-center gap-1">
                          <AlertTriangle size={12} /> Trùng với bộ sưu tập khác
                        </span>
                      )}
                    </div>
                    <div className="flex items-center">
                      <span className="px-3 py-2 bg-slate-100 border border-r-0 border-slate-300 rounded-l-lg text-slate-500 font-mono text-[11px]">
                        /bo-suu-tap/
                      </span>
                      <input
                        type="text"
                        required
                        placeholder="bo-suu-tap-victoria-2"
                        value={formSlug}
                        onChange={(e) => setFormSlug(e.target.value)}
                        className={`w-full px-3 py-2 text-xs font-mono border rounded-r-lg focus:outline-none transition-all ${
                          isSlugDuplicate
                            ? "border-amber-400 bg-amber-50/40 text-amber-900 focus:ring-2 focus:ring-amber-400"
                            : "border-slate-300 bg-white focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                        }`}
                      />
                    </div>
                    {isSlugDuplicate && (
                      <div className="mt-1.5 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-center justify-between gap-2">
                        <span>
                          Đường dẫn này đã trùng lặp. Gợi ý: <strong>{suggestedSlug}</strong>.
                        </span>
                        <button
                          type="button"
                          onClick={handleApplySuggestedSlug}
                          className="px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] shrink-0 cursor-pointer shadow-2xs"
                        >
                          Áp dụng ngay
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Thứ tự hiển thị */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      Thứ tự hiển thị (Ưu tiên)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={formOrder}
                      onChange={(e) => setFormOrder(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 focus:outline-none"
                    />
                  </div>

                  {/* Upload ảnh bìa Lookbook */}
                  <div>
                    <label className="font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs">
                        <ImageIcon size={13} className="text-violet-600" />
                        Ảnh bìa Lookbook / Banner Bộ sưu tập
                      </span>
                      {formImageFile && (
                        <span className="text-[11px] font-normal text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          File từ máy: {formImageFile.name}
                        </span>
                      )}
                    </label>

                    <div className="flex flex-col gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                      <div className="flex items-center gap-3">
                        <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer shadow-2xs transition-all">
                          <Upload size={14} className="text-violet-600" />
                          <span>Chọn ảnh từ máy tính</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setFormImageFile(file);
                              }
                            }}
                          />
                        </label>
                        <span className="text-[11px] text-slate-400">hoặc dán liên kết URL bên dưới</span>
                      </div>

                      {/* Preview ảnh nếu có */}
                      {formPreviewUrl && (
                        <div className="relative inline-flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-200">
                          <img
                            src={formPreviewUrl}
                            alt="Xem trước ảnh bìa"
                            className="w-24 h-14 object-cover rounded-md border border-slate-100"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = "none";
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-semibold text-slate-700 truncate">
                              {formImageFile ? formImageFile.name : formPreviewUrl}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {formImageFile
                                ? `${(formImageFile.size / 1024).toFixed(1)} KB • Tải lên máy chủ khi Lưu`
                                : "Đường dẫn ảnh trực tuyến"}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setFormImageFile(null);
                              setFormImageUrl("");
                            }}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors"
                            title="Xóa ảnh"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}

                      {/* Nhập URL ảnh */}
                      <input
                        type="url"
                        placeholder="https://example.com/lookbook-banner.webp"
                        value={formImageUrl}
                        onChange={(e) => {
                          setFormImageUrl(e.target.value);
                          if (formImageFile) setFormImageFile(null);
                        }}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>
                  </div>

                  {/* Mô tả phong cách thiết kế */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1.5">
                        Phụ đề trên Banner (Dòng 2 chữ lớn)
                      </label>
                      <input
                        type="text"
                        placeholder="VD: Câu chuyện của sự khởi đầu"
                        value={formSubtitle}
                        onChange={(e) => setFormSubtitle(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1.5">
                        Nhãn phong cách (Style Tag)
                      </label>
                      <input
                        type="text"
                        placeholder="VD: Đông Dương Đương đại, Tân cổ điển..."
                        value={formStyleTag}
                        onChange={(e) => setFormStyleTag(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Câu trích dẫn in nghiêng căn giữa ngay dưới Banner */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      Câu trích dẫn in nghiêng dưới Banner (Quote)
                    </label>
                    <input
                      type="text"
                      placeholder="VD: “ORIENTALE” – một cái tên đầy ý nghĩa với mong muốn tạo ra những kết nối..."
                      value={formIntroQuote}
                      onChange={(e) => setFormIntroQuote(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:outline-none italic"
                    />
                  </div>

                  {/* Tiêu đề câu chuyện & Chất liệu chủ đạo */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1.5">
                        Tiêu đề đoạn câu chuyện (Heading)
                      </label>
                      <input
                        type="text"
                        placeholder="VD: Chất liệu cao cấp tạo trải nghiệm đẳng cấp"
                        value={formStoryTitle}
                        onChange={(e) => setFormStoryTitle(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1.5">
                        Chất liệu chủ đạo (Materials)
                      </label>
                      <input
                        type="text"
                        placeholder="VD: Gỗ Walnut tự nhiên • Da bò thật nhập khẩu"
                        value={formMaterials}
                        onChange={(e) => setFormMaterials(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      Nội dung câu chuyện chất liệu & thiết kế
                    </label>
                    <textarea
                      rows={3}
                      placeholder="VD: Được làm từ gỗ walnut tự nhiên – loại gỗ cao cấp không chỉ nổi tiếng với sắc nâu trầm tinh tế..."
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 focus:outline-none resize-none"
                    />
                  </div>

                  {/* Bộ ảnh chi tiết 2 cột song song (Lookbook Gallery) */}
                  <div>
                    <label className="font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs">
                        <ImageIcon size={13} className="text-violet-600" />
                        Bộ ảnh chi tiết 2 cột song song (Lookbook Gallery)
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Đã chọn {formGalleryImages.length} ảnh
                      </span>
                    </label>

                    <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer shadow-2xs transition-all">
                          <Upload size={13} className="text-violet-600" />
                          <span>{uploadingMedia ? "Đang tải lên..." : "Tải nhiều ảnh từ máy"}</span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            disabled={uploadingMedia}
                            className="hidden"
                            onChange={(e) => {
                              void handleUploadGalleryFiles(e.target.files);
                              e.currentTarget.value = "";
                            }}
                          />
                        </label>

                        <div className="flex-1 flex items-center gap-1.5 min-w-[200px]">
                          <input
                            type="url"
                            placeholder="Hoặc dán URL ảnh chi tiết rồi bấm Thêm..."
                            value={newGalleryUrl}
                            onChange={(e) => setNewGalleryUrl(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (newGalleryUrl.trim()) {
                                setFormGalleryImages((prev) => [...prev, newGalleryUrl.trim()]);
                                setNewGalleryUrl("");
                              }
                            }}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shrink-0"
                          >
                            + Thêm
                          </button>
                        </div>
                      </div>

                      {formGalleryImages.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                          {formGalleryImages.map((img, idx) => (
                            <div
                              key={idx}
                              className="relative group rounded-lg overflow-hidden border border-slate-200 bg-white aspect-4/3"
                            >
                              <img
                                src={img}
                                alt={`Gallery ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setFormGalleryImages((prev) => prev.filter((_, i) => i !== idx))
                                }
                                className="absolute top-1.5 right-1.5 p-1 rounded-full bg-slate-900/75 text-white hover:bg-rose-600 transition-colors"
                                title="Xóa ảnh này"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Video Bộ sưu tập (YouTube / Vimeo hoặc tải file MP4 từ máy) */}
                  <div>
                    <label className="font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <Film size={13} className="text-violet-600" />
                      <span>Video giới thiệu Bộ sưu tập (YouTube / Vimeo / Tải file MP4 từ máy)</span>
                    </label>
                    <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer shadow-2xs transition-all">
                          <Upload size={13} className="text-violet-600" />
                          <span>{uploadingMedia ? "Đang tải lên..." : "Tải video từ máy (.mp4, .webm)"}</span>
                          <input
                            type="file"
                            accept="video/mp4,video/webm,video/quicktime"
                            disabled={uploadingMedia}
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) void handleUploadVideoFile(file);
                              e.currentTarget.value = "";
                            }}
                          />
                        </label>
                        <input
                          type="url"
                          placeholder="Hoặc dán link YouTube (https://www.youtube.com/watch?v=...) / link .mp4"
                          value={formVideoUrl}
                          onChange={(e) => setFormVideoUrl(e.target.value)}
                          className="flex-1 min-w-[220px] px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                        {formVideoUrl && (
                          <button
                            type="button"
                            onClick={() => setFormVideoUrl("")}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                            title="Xóa video"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Sản phẩm thuộc Bộ sưu tập */}
                  {products.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                          <Package size={13} className="text-violet-600" />
                          <span>Sản phẩm thuộc Bộ sưu tập này ({formProductIds.length} đã chọn)</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Tìm nhanh sản phẩm..."
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          className="px-2.5 py-1 text-[11px] border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-violet-500 w-44"
                        />
                      </div>
                      <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/40 divide-y divide-slate-100 p-1.5">
                        {products
                          .filter((p) => {
                            if (p.isDeleted) return false;
                            const q = productSearch.trim().toLowerCase();
                            if (!q) return true;
                            return (
                              p.name.toLowerCase().includes(q) ||
                              (p.category || "").toLowerCase().includes(q)
                            );
                          })
                          .map((p) => {
                            const checked = formProductIds.includes(Number(p.id));
                            return (
                              <label
                                key={p.id}
                                className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ${
                                  checked ? "bg-violet-50/80 text-violet-900" : "hover:bg-white"
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleProductInCollection(Number(p.id))}
                                    className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                                  />
                                  <span className="truncate font-medium text-xs">{p.name}</span>
                                </div>
                                <span className="text-[10px] text-slate-400 shrink-0">
                                  {p.category}
                                </span>
                              </label>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50/70">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-100 transition-all"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5"
                  >
                    <Sparkles size={14} />
                    {editingCategory ? "Lưu thay đổi" : "Tạo Bộ sưu tập"}
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
