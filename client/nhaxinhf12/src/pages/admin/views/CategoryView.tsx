import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  FolderTree,
  Plus,
  Edit,
  Trash2,
  RotateCcw,
  Search,
  FolderOpen,
  Folder,
  X,
  EyeOff,
  CornerDownRight,
  Sparkles,
  CheckCircle2,
  Image as ImageIcon,
} from "lucide-react";
import type { AdminCategory, RoleDefinition } from "../../../services/admin/types";
import PermissionGate from "../../../components/admin/PermissionGate";
import { AdminPagination } from "../../../components/admin/AdminPagination";
import {
  useAdminCategories,
  type CategoryLevelFilter,
} from "../../../hooks/admin/useAdminCategories";

interface CategoryViewProps {
  categories: AdminCategory[];
  currentRole: RoleDefinition;
  onSaveCategory: (cat: Partial<AdminCategory>) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  onRestoreCategory: (id: string) => Promise<void>;
}

export default function CategoryView({
  categories,
  currentRole,
  onSaveCategory,
  onDeleteCategory,
  onRestoreCategory,
}: CategoryViewProps) {
  const {
    search,
    setSearch,
    levelFilter,
    setLevelFilter,
    activeTab,
    setActiveTab,
    showModal,
    setShowModal,
    editingCategory,
    formName,
    formSlug,
    setFormSlug,
    formParentId,
    setFormParentId,
    formOrder,
    setFormOrder,
    formDescription,
    setFormDescription,
    formImageUrl,
    setFormImageUrl,
    formIsCollection,
    setFormIsCollection,
    submitError,
    toastMessage,
    parentCategories,
    collectionsList,
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
            <FolderTree className="text-blue-600" size={24} />
            Cấu trúc Phân cấp Danh mục & Bộ sưu tập
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý cây Danh mục Cha/Con, Bộ sưu tập thiết kế (/bo-suu-tap), đường dẫn SEO slug và tự động ghi Nhật ký Hoạt động
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto justify-between md:justify-end">
          {/* Tab filter: Đang hiển thị / Bộ sưu tập / Thùng rác */}
          <div className="inline-flex p-1 bg-slate-100 rounded-lg text-xs font-semibold">
            <button
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === "active"
                  ? "bg-white text-blue-600 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              onClick={() => setActiveTab("active")}
            >
              <Folder size={14} /> Danh mục ({categories.filter((c) => !c.isDeleted).length})
            </button>
            <button
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === "collections"
                  ? "bg-white text-violet-600 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              onClick={() => setActiveTab("collections")}
            >
              <Sparkles size={14} /> Bộ sưu tập ({collectionsList.length})
            </button>
            <button
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === "trash"
                  ? "bg-white text-rose-600 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              onClick={() => setActiveTab("trash")}
            >
              <EyeOff size={14} /> Thùng rác ({categories.filter((c) => c.isDeleted).length})
            </button>
          </div>

          {/* Level filter */}
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value as CategoryLevelFilter)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
          >
            <option value="all">Mọi cấp độ</option>
            <option value="parent">Chỉ cấp cha</option>
            <option value="child">Chỉ cấp con</option>
            <option value="collection">Chỉ Bộ sưu tập</option>
          </select>

          {/* Search bar */}
          <div className="relative max-w-xs w-full sm:w-52">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm tên, slug, mô tả..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          {/* Add Category & Collection buttons */}
          <PermissionGate permission="categories.create" currentRole={currentRole}>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleOpenAdd(undefined, true)}
                className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Sparkles size={14} /> Thêm Bộ sưu tập
              </button>
              <button
                onClick={() => handleOpenAdd(undefined, false)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Plus size={15} /> Thêm Danh mục
              </button>
            </div>
          </PermissionGate>
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
                <th className="py-3 px-4">Tên danh mục / Bộ sưu tập</th>
                <th className="py-3 px-4">Đường dẫn SEO (Slug)</th>
                <th className="py-3 px-4 text-center">Thứ tự</th>
                <th className="py-3 px-4 text-center">Sản phẩm</th>
                <th className="py-3 px-4"> Trạng thái</th>
                <th className="py-3 px-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeTab !== "trash" ? (
                activePagination.paginatedItems.length > 0 ? (
                  activePagination.paginatedItems.map((parent) => {
                    const isCol = isCollectionItem(parent);
                    return (
                      <React.Fragment key={parent.id}>
                        {/* ── Cấp Cha / Item ── */}
                        <tr className="bg-slate-50/50 hover:bg-slate-100/60 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              {parent.imageUrl ? (
                                <img
                                  src={parent.imageUrl}
                                  alt={parent.name}
                                  className="w-9 h-9 rounded-lg object-cover border border-slate-200 shrink-0"
                                />
                              ) : (
                                <div
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                    isCol
                                      ? "bg-violet-100 text-violet-600"
                                      : "bg-blue-100 text-blue-600"
                                  }`}
                                >
                                  {isCol ? <Sparkles size={16} /> : <FolderOpen size={16} />}
                                </div>
                              )}
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-slate-900 text-xs">{parent.name}</span>
                                  {isCol && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-200 inline-flex items-center gap-0.5">
                                      <Sparkles size={10} /> Bộ sưu tập
                                    </span>
                                  )}
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                    {parent.parentId ? "Cấp con" : "Cấp cha"}
                                  </span>
                                </div>
                                {parent.description && (
                                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1 max-w-md">
                                    {parent.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <code className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px]">
                              /{parent.slug}
                            </code>
                          </td>
                          <td className="py-3 px-4 text-center font-medium text-slate-600">{parent.order}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="font-bold text-slate-800">{parent.productCount}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Hoạt động
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              {!parent.parentId && (
                                <PermissionGate permission="categories.create" currentRole={currentRole}>
                                  <button
                                    onClick={() => handleOpenAdd(parent.id, isCol)}
                                    className="px-2 py-1 rounded-md text-[11px] font-semibold border border-blue-200 text-blue-600 hover:bg-blue-50 flex items-center gap-1 transition-all"
                                    title="Thêm danh mục con hoặc bộ sưu tập con"
                                  >
                                    <Plus size={12} /> Thêm con
                                  </button>
                                </PermissionGate>
                              )}
                              <PermissionGate permission="categories.edit" currentRole={currentRole}>
                                <button
                                  onClick={() => handleOpenEdit(parent)}
                                  className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-md transition-all"
                                  title="Chỉnh sửa"
                                >
                                  <Edit size={14} />
                                </button>
                              </PermissionGate>
                              <PermissionGate permission="categories.delete" currentRole={currentRole}>
                                <button
                                  onClick={() => void handleDelete(parent.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all"
                                  title="Xóa mềm vào thùng rác"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </PermissionGate>
                            </div>
                          </td>
                        </tr>

                        {/* ── Cấp Con (Children) ── */}
                        {parent.children &&
                          parent.children.map((child) => {
                            const isChildCol = isCollectionItem(child);
                            return (
                              <tr key={child.id} className="hover:bg-slate-50 transition-colors">
                                <td className="py-2.5 px-4">
                                  <div className="flex items-center gap-2 pl-6">
                                    <CornerDownRight size={14} className="text-slate-400 shrink-0" />
                                    {child.imageUrl ? (
                                      <img
                                        src={child.imageUrl}
                                        alt={child.name}
                                        className="w-7 h-7 rounded object-cover border border-slate-200 shrink-0"
                                      />
                                    ) : isChildCol ? (
                                      <Sparkles size={14} className="text-violet-500 shrink-0" />
                                    ) : (
                                      <Folder size={15} className="text-slate-400 shrink-0" />
                                    )}
                                    <div>
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-medium text-slate-800">{child.name}</span>
                                        {isChildCol && (
                                          <span className="px-1.5 py-0.2 rounded text-[9.5px] font-semibold bg-violet-50 text-violet-700 border border-violet-200">
                                            Bộ sưu tập
                                          </span>
                                        )}
                                      </div>
                                      {child.description && (
                                        <p className="text-[10.5px] text-slate-400 line-clamp-1 max-w-sm">
                                          {child.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="py-2.5 px-4">
                                  <code className="px-2 py-0.5 rounded bg-slate-50 text-slate-500 font-mono text-[11px]">
                                    /{child.slug}
                                  </code>
                                </td>
                                <td className="py-2.5 px-4 text-center font-medium text-slate-500">{child.order}</td>
                                <td className="py-2.5 px-4 text-center font-semibold text-slate-700">{child.productCount}</td>
                                <td className="py-2.5 px-4">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-slate-100 text-slate-600">
                                    {isChildCol ? "BST Con" : "Con"}
                                  </span>
                                </td>
                                <td className="py-2.5 px-4 text-right">
                                  <div className="inline-flex items-center gap-1">
                                    <PermissionGate permission="categories.edit" currentRole={currentRole}>
                                      <button
                                        onClick={() => handleOpenEdit(child)}
                                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-md transition-all"
                                        title="Chỉnh sửa"
                                      >
                                        <Edit size={13} />
                                      </button>
                                    </PermissionGate>
                                    <PermissionGate permission="categories.delete" currentRole={currentRole}>
                                      <button
                                        onClick={() => void handleDelete(child.id)}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all"
                                        title="Xóa mềm"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </PermissionGate>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                      Không tìm thấy danh mục / bộ sưu tập nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                )
              ) : (
                /* ── Tab Thùng rác (Xóa mềm) ── */
                trashPagination.paginatedItems.length > 0 ? (
                  trashPagination.paginatedItems.map((cat) => (
                    <tr key={cat.id} className="bg-rose-50/40 hover:bg-rose-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <EyeOff size={16} className="text-rose-500 shrink-0" />
                          <span className="line-through text-slate-500 font-medium">{cat.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">/{cat.slug}</td>
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
                    <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                      Thùng rác rỗng. Chưa có danh mục hoặc bộ sưu tập nào bị xóa mềm.
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
        <AdminPagination pagination={currentPagination} itemLabel="danh mục / bộ sưu tập" />
      </div>

      {/* ── Modal Thêm / Chỉnh sửa Danh mục & Bộ sưu tập ── */}
      {showModal &&
        createPortal(
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-9999 p-3 sm:p-5 overscroll-contain animate-in fade-in duration-200"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowModal(false);
            }}
          >
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  {formIsCollection ? (
                    <Sparkles className="text-violet-600" size={18} />
                  ) : (
                    <FolderTree className="text-blue-600" size={18} />
                  )}
                  {editingCategory
                    ? `Chỉnh sửa ${formIsCollection ? "Bộ sưu tập" : "Danh mục"}`
                    : `Thêm mới ${formIsCollection ? "Bộ sưu tập thiết kế" : "Danh mục sản phẩm"}`}
                </h3>
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
                <div className="p-5 space-y-3.5 text-xs flex-1 overflow-y-auto overscroll-contain">
                {submitError && (
                  <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                    {submitError}
                  </p>
                )}

                <label className="flex items-center gap-2.5 p-3 rounded-lg border border-violet-200 bg-violet-50/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsCollection}
                    onChange={(e) => setFormIsCollection(e.target.checked)}
                    className="accent-violet-600 w-4 h-4"
                  />
                  <div>
                    <div className="font-bold text-violet-900 flex items-center gap-1">
                      <Sparkles size={13} /> Đánh dấu là Bộ sưu tập Thiết kế (Collection)
                    </div>
                    <div className="text-[11px] text-violet-700">
                      Hiển thị nổi bật tại trang Bộ sưu tập (/bo-suu-tap) và tự động ghi nhật ký phân hệ Bộ sưu tập
                    </div>
                  </div>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      Tên {formIsCollection ? "bộ sưu tập" : "danh mục"} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={
                        formIsCollection
                          ? "VD: Bộ sưu tập Indochine..."
                          : "VD: Sofa da thật, Bàn trà tròn..."
                      }
                      value={formName}
                      onChange={(e) => handleNameChange(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      Đường dẫn SEO (Slug) - Tự sinh
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="bo-suu-tap-indochine"
                      value={formSlug}
                      onChange={(e) => setFormSlug(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      Thuộc danh mục cha (Phân cấp)
                    </label>
                    <select
                      value={formParentId}
                      onChange={(e) => setFormParentId(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none bg-white"
                    >
                      <option value="none">-- Là cấp cao nhất (Cha) --</option>
                      {parentCategories
                        .filter((c) => c.id !== editingCategory?.id)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (Cấp cha)
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      Thứ tự hiển thị (Order)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={formOrder}
                      onChange={(e) => setFormOrder(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                    <ImageIcon size={13} className="text-slate-500" />
                    URL Ảnh bìa / Banner Bộ sưu tập
                  </label>
                  <input
                    type="text"
                    placeholder="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=80"
                    value={formImageUrl}
                    onChange={(e) => setFormImageUrl(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    Câu chuyện / Mô tả {formIsCollection ? "Bộ sưu tập" : "Danh mục"}
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Mô tả phong cách thiết kế, nguồn cảm hứng và chất liệu chủ đạo..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
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
                  className={`px-4 py-2 text-white rounded-lg text-xs font-semibold shadow-xs transition-all ${
                    formIsCollection
                      ? "bg-violet-600 hover:bg-violet-700"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {editingCategory
                    ? "Lưu thay đổi"
                    : formIsCollection
                    ? "Tạo Bộ sưu tập"
                    : "Tạo Danh mục"}
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
