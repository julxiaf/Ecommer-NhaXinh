import { useEffect, useMemo, useState, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Package, Plus, Edit, Trash2, RotateCcw, Search,
  Layers, X, EyeOff, AlertTriangle, FileSpreadsheet, Eye,
  CheckCircle2, ExternalLink, Image as ImageIcon, Box,
  UploadCloud, Star, User
} from "lucide-react";
import type { AdminProduct, AdminCategory, RoleDefinition } from "../../../services/admin/types";
import type { AdminProductInput } from "../../../services/admin/catalogApi";
import PermissionGate from "../../../components/admin/PermissionGate";
import { AdminPagination } from "../../../components/admin/AdminPagination";
import {
  useAdminProducts,
  type ProductStockFilter,
  type ProductSortBy,
  type ProductBusinessFilter,
} from "../../../hooks/admin/useAdminProducts";
import { vnd } from "../../../util/Constain";
import { exportProductsToExcel } from "../../../util/excelExport";
import { resolveProductImage } from "../../../services/productService";


interface ProductViewProps {
  products: AdminProduct[];
  categories: AdminCategory[];
  currentRole: RoleDefinition;
  currentUserName?: string;
  onSaveProduct: (prod: AdminProductInput) => Promise<void>;
  onDeleteProduct: (id: number) => void;
  onRestoreProduct: (id: number) => void;
}

export default function ProductView({
  products,
  categories,
  currentRole,
  currentUserName,
  onSaveProduct,
  onDeleteProduct,
  onRestoreProduct,
}: ProductViewProps) {
  const {
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    stockFilter,
    setStockFilter,
    businessFilter,
    setBusinessFilter,
    sortBy,
    setSortBy,
    activeTab,
    setActiveTab,
    counts,
    activeCategories,
    pagination,
    getProductTotalStock,
    showProductModal,
    setShowProductModal,
    editingProduct,
    viewingProduct,
    setViewingProduct,
    formName,
    formSlug,
    setFormSlug,
    isSlugDuplicate,
    suggestedSlug,
    handleApplySuggestedSlug,
    formCategoryId,
    setFormCategoryId,
    formPrice,
    setFormPrice,
    formStock,
    handleFormStockChange,
    formDescription,
    setFormDescription,
    formImage,
    setFormImage,
    formImage2,
    setFormImage2,
    formModel3dUrl,
    setFormModel3dUrl,
    formIsPreorder,
    setFormIsPreorder,
    formIsNew,
    setFormIsNew,
    imageFiles,
    setImageFiles,
    model3dFile,
    setModel3dFile,
    submitError,
    setSubmitError,
    isSaving,
    formVariants,
    showVariantModal,
    setShowVariantModal,
    editingVariantIndex,
    varSku,
    setVarSku,
    varColor,
    setVarColor,
    varSize,
    setVarSize,
    varMaterial,
    setVarMaterial,
    varPrice,
    setVarPrice,
    varStock,
    setVarStock,
    handleOpenAdd,
    handleOpenEdit,
    handleNameChange,
    handleSubmitProduct,
    handleOpenAddVariant,
    handleOpenEditVariant,
    handleSaveVariant,
    handleDeleteVariant,
    toastMessage,
    setToastMessage,
    toastType,
    handleDeleteProduct,
    handleRestoreProduct,
  } = useAdminProducts({
    products,
    categories,
    onSaveProduct,
    onDeleteProduct,
    onRestoreProduct,
  });

  // ── Quản lý preview ảnh tải lên từ máy tính trước khi gửi về server ──
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Sinh ObjectURL xem trước cho từng file ảnh được chọn
  const imagePreviews = useMemo(() => {
    return imageFiles.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      name: file.name,
      size:
        file.size > 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.round(file.size / 1024)} KB`,
    }));
  }, [imageFiles]);

  // Thu hồi ObjectURL khi danh sách file thay đổi hoặc modal đóng lại để tránh rò rỉ bộ nhớ
  useEffect(() => {
    return () => {
      imagePreviews.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, [imagePreviews]);

  // Xóa 1 ảnh trong danh sách xem trước
  const handleRemoveImageFile = (indexToRemove: number) => {
    setImageFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Đặt ảnh đã chọn làm ảnh đại diện chính (đưa lên đầu danh sách để isPrimary = true)
  const handleSetPrimaryImage = (indexToPrimary: number) => {
    setImageFiles((prev) => {
      const target = prev[indexToPrimary];
      const others = prev.filter((_, idx) => idx !== indexToPrimary);
      return [target, ...others];
    });
  };

  // Thêm file mới vào danh sách hiện tại (giữ lại các file đã chọn trước đó)
  const handleAddImageFiles = (newFiles: FileList | File[]) => {
    const list = Array.from(newFiles);
    const validFiles: File[] = [];
    for (const file of list) {
      if (file.size > 10 * 1024 * 1024 || !/\.(jpe?g|png|gif|webp)$/i.test(file.name)) {
        setSubmitError(`Ảnh "${file.name}" không đúng định dạng (JPG, PNG, GIF, WebP) hoặc vượt quá 10 MiB.`);
        return;
      }
      validFiles.push(file);
    }
    setSubmitError("");
    setImageFiles((prev) => [...prev, ...validFiles]);
  };

  // Khóa cuộn trang nền khi mở Modal và hỗ trợ đóng modal bằng phím Escape
  useEffect(() => {
    if (showProductModal || showVariantModal || viewingProduct) {
      const originalBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      const adminContent = document.querySelector(".admin-content-area") as HTMLElement | null;
      const originalAdminOverflow = adminContent ? adminContent.style.overflow : "";
      if (adminContent) {
        adminContent.style.overflow = "hidden";
      }

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          if (showVariantModal) {
            setShowVariantModal(false);
          } else if (showProductModal) {
            setShowProductModal(false);
          } else if (viewingProduct) {
            setViewingProduct(null);
          }
        }
      };

      window.addEventListener("keydown", handleKeyDown);

      return () => {
        document.body.style.overflow = originalBodyOverflow;
        if (adminContent) {
          adminContent.style.overflow = originalAdminOverflow;
        }
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [showProductModal, showVariantModal, viewingProduct, setShowProductModal, setShowVariantModal, setViewingProduct]);

  const isFiltered = useMemo(
    () =>
      Boolean(
        search ||
        categoryFilter !== "all" ||
        stockFilter !== "all" ||
        businessFilter !== "all" ||
        sortBy !== "default"
      ),
    [search, categoryFilter, stockFilter, businessFilter, sortBy]
  );

  const handleResetFilters = () => {
    setSearch("");
    setCategoryFilter("all");
    setStockFilter("all");
    setBusinessFilter("all");
    setSortBy("default");
  };

  const { paginatedItems: displayedProducts } = pagination;

  return (
    <div className="space-y-6 text-slate-800">
      {/* ── TOAST ALERT NOTIFICATION ── */}
      {toastMessage && (
        <div
          className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3.5 text-xs font-semibold shadow-xs animate-in fade-in slide-in-from-top-2 duration-200 ${
            toastType === "warning"
              ? "bg-amber-50 border-amber-200 text-amber-900"
              : toastType === "info"
              ? "bg-blue-50 border-blue-200 text-blue-900"
              : "bg-emerald-50 border-emerald-200 text-emerald-900"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {toastType === "warning" ? (
              <Trash2 size={16} className="text-amber-600 shrink-0" />
            ) : (
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            )}
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="p-1 hover:bg-black/5 rounded-md transition-colors cursor-pointer text-slate-500 hover:text-slate-800"
            title="Đóng thông báo"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Header Controls ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        {/* Top bar: Title + Tabs + Action CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs shrink-0">
              <Package size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Quản lý Sản phẩm
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Quản lý danh mục hàng hóa, biến thể, giá bán và theo dõi trạng thái tồn kho
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Active / Trash tab */}
            <div className="inline-flex p-1 bg-slate-100 rounded-lg text-xs font-semibold">
              <button
                className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                  activeTab === "active"
                    ? "bg-white text-blue-600 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                onClick={() => setActiveTab("active")}
              >
                <Package size={14} /> Đang bán ({counts.all})
              </button>
              <button
                className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                  activeTab === "trash"
                    ? "bg-white text-rose-600 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                onClick={() => setActiveTab("trash")}
              >
                <EyeOff size={14} /> Thùng rác ({counts.trash})
              </button>
            </div>

            {/* Export Excel button */}
            <button
              type="button"
              onClick={() => exportProductsToExcel(products)}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              title="Xuất toàn bộ danh sách sản phẩm và các biến thể ra file Excel (.xlsx)"
            >
              <FileSpreadsheet size={15} className="text-emerald-600" />
              <span>Xuất Excel</span>
            </button>

            {/* Add Product button */}
            <PermissionGate permission="products.create" currentRole={currentRole}>
              <button
                onClick={handleOpenAdd}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Plus size={15} /> Thêm sản phẩm
              </button>
            </PermissionGate>
          </div>
        </div>

        {/* Filter bar: Search + Category + Business Classification + Stock + Sort */}
        <div className="pt-3 border-t border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search bar & Result counter */}
          <div className="flex items-center gap-3 w-full lg:w-auto flex-1 max-w-md">
            <div className="relative w-full">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm tên sản phẩm, mã SKU, slug..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors cursor-pointer"
                  title="Xóa tìm kiếm"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="text-xs text-slate-500 font-medium whitespace-nowrap hidden sm:block shrink-0">
              Hiển thị <span className="font-bold text-slate-800">{pagination.totalItems}</span> / {activeTab === "trash" ? counts.trash : counts.all}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
            {/* Business type filter (Sản phẩm mới / Đặt trước / Có sẵn) */}
            <select
              value={businessFilter}
              onChange={(e) => setBusinessFilter(e.target.value as ProductBusinessFilter)}
              className={`px-3 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold cursor-pointer transition-colors ${
                businessFilter === "new"
                  ? "bg-sky-50 text-sky-800 border-sky-300"
                  : businessFilter === "preorder"
                  ? "bg-amber-50 text-amber-800 border-amber-300"
                  : businessFilter === "in_stock"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                  : "bg-slate-50 text-slate-700 border-slate-200"
              }`}
              title="Lọc theo loại kinh doanh: Mới hoặc Đặt trước"
            >
              <option value="all">Tất cả phân loại (Mới / Đặt trước / Có sẵn)</option>
              <option value="new">✨ Sản phẩm mới ({counts.new})</option>
              <option value="preorder">⏳ Hàng đặt trước ({counts.preorder})</option>
              <option value="in_stock">📦 Hàng có sẵn kho</option>
            </select>

            {/* Category filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className={`px-3 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer transition-colors ${
                categoryFilter !== "all"
                  ? "bg-blue-50 text-blue-800 border-blue-300 font-semibold"
                  : "bg-slate-50 text-slate-700 border-slate-200"
              }`}
            >
              <option value="all">Tất cả danh mục</option>
              {activeCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Stock filter */}
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as ProductStockFilter)}
              className={`px-3 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer transition-colors ${
                stockFilter !== "all"
                  ? "bg-amber-50 text-amber-800 border-amber-300 font-semibold"
                  : "bg-slate-50 text-slate-700 border-slate-200"
              }`}
            >
              <option value="all">Mọi tồn kho</option>
              <option value="in_stock">Còn hàng (&ge; 10)</option>
              <option value="low_stock">Sắp hết (1 - 9)</option>
              <option value="out_of_stock">Hết hàng (0)</option>
            </select>

            {/* Sort by */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as ProductSortBy)}
              className={`px-3 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer transition-colors ${
                sortBy !== "default"
                  ? "bg-indigo-50 text-indigo-800 border-indigo-300 font-semibold"
                  : "bg-slate-50 text-slate-700 border-slate-200"
              }`}
            >
              <option value="default">Sắp xếp mặc định</option>
              <option value="price_asc">Giá tăng dần</option>
              <option value="price_desc">Giá giảm dần</option>
              <option value="stock_asc">Tồn kho thấp - cao</option>
              <option value="stock_desc">Tồn kho cao - thấp</option>
              <option value="name_asc">Tên A - Z</option>
            </select>

            {/* Reset Filters button */}
            {isFiltered && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                title="Đặt lại toàn bộ bộ lọc về mặc định"
              >
                <RotateCcw size={13} />
                <span>Đặt lại</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Table of Products ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px] font-semibold">
                <th className="py-3 px-4 w-14">Ảnh</th>
                <th className="py-3 px-4">Tên sản phẩm & Biến thể</th>
                <th className="py-3 px-4">Danh mục</th>
                <th className="py-3 px-4">Người tạo</th>
                <th className="py-3 px-4">Giá niêm yết</th>
                <th className="py-3 px-4 text-center">Tồn kho</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedProducts.length > 0 ? (
                displayedProducts.map((p) => {
                  const totalStock = getProductTotalStock(p);
                  const isLowStock = totalStock < 10;

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        p.isDeleted ? "bg-rose-50/40" : ""
                      }`}
                    >
                      <td className="py-3 px-4">
                        <img
                          src={p.image || resolveProductImage("", p.name, p.category).img1}
                          alt={p.name}
                          className="w-11 h-11 object-cover rounded-lg border border-slate-200 shadow-2xs"
                          onError={(e) => {
                            const fallback = resolveProductImage("", p.name, p.category).img1;
                            if ((e.currentTarget as HTMLImageElement).src !== fallback) {
                              (e.currentTarget as HTMLImageElement).src = fallback;
                            }
                          }}
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`font-bold text-xs ${
                              p.isDeleted ? "line-through text-slate-400" : "text-slate-900"
                            }`}
                          >
                            {p.name}
                          </span>
                          {/* BADGES: NEW & PRE-ORDER */}
                          {p.isPreorder && (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs"
                              title="Sản phẩm Đặt Trước (Pre-order - Chuẩn bị 7-14 ngày)"
                            >
                              ⏳ Đặt trước
                            </span>
                          )}
                          {p.isNew && (
                            <span
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-300 shadow-2xs"
                              title="Sản phẩm Mới ra mắt (New Release)"
                            >
                              ✨ Mới
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                          <span>SKU: <strong className="font-mono text-slate-600">{p.variants?.[0]?.sku || p.slug}</strong></span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-700">{p.category}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          <User size={11} className="text-slate-500" />
                          {p.createdBy || "Quản trị viên"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900">{vnd(p.price)}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span
                            className={`font-bold ${
                              isLowStock ? "text-rose-600" : "text-emerald-600"
                            }`}
                          >
                            {totalStock}
                          </span>
                          {isLowStock && (
                            <span title="Sắp hết hàng!">
                              <AlertTriangle size={13} className="text-rose-500" />
                            </span>
                          )}
                        </div>
                        <span className="text-[10.5px] text-slate-400 block mt-0.5">
                          {p.variants?.length ? `${p.variants.length} biến thể` : "1 quy cách"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          {p.isDeleted ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-rose-100 text-rose-700 border border-rose-200">
                              Đã xóa mềm
                            </span>
                          ) : p.isPreorder ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                              Hàng đặt trước
                            </span>
                          ) : totalStock <= 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-rose-50 text-rose-600 border border-rose-200">
                              Hết hàng
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Đang bán
                            </span>
                          )}

                          {p.isNew && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                              ✨ Hàng mới ra mắt
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <button
                            type="button"
                            onClick={() => setViewingProduct(p)}
                            className="px-2.5 py-1 rounded-md text-[11px] font-semibold border border-blue-200 text-blue-700 bg-blue-50/60 hover:bg-blue-100 flex items-center gap-1 transition-all"
                            title="Xem chi tiết sản phẩm"
                          >
                            <Eye size={12} /> Chi tiết
                          </button>

                          {!p.isDeleted ? (
                            <>
                              <PermissionGate permission="products.edit" currentRole={currentRole}>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(p)}
                                  className="px-2.5 py-1 rounded-md text-[11px] font-semibold border border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center gap-1 transition-all"
                                  title="Chỉnh sửa sản phẩm và biến thể"
                                >
                                  <Edit size={12} /> Sửa
                                </button>
                              </PermissionGate>

                              <PermissionGate permission="products.delete" currentRole={currentRole}>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteProduct(p.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all cursor-pointer"
                                  title="Xóa mềm vào thùng rác"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </PermissionGate>
                            </>
                          ) : (
                            <PermissionGate permission="products.delete" currentRole={currentRole}>
                              <button
                                onClick={() => handleRestoreProduct(p.id)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                              >
                                <RotateCcw size={13} /> Khôi phục
                              </button>
                            </PermissionGate>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    Không tìm thấy sản phẩm nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <AdminPagination pagination={pagination} itemLabel="sản phẩm" />
      </div>

      {/* ── Modal Thêm / Chỉnh sửa Sản phẩm ── */}
      {showProductModal &&
        createPortal(
          <div
            className="fixed inset-0 z-9999 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overscroll-contain animate-in fade-in duration-200"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowProductModal(false);
            }}
          >
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <Package size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      {editingProduct ? `Chỉnh sửa: ${editingProduct.name}` : "Thêm sản phẩm nội thất mới"}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <p className="text-[11px] text-slate-500">
                        {editingProduct ? `Mã ID: #${editingProduct.id} · Cập nhật thông tin và quy cách biến thể` : "Điền đầy đủ thông tin để niêm yết sản phẩm lên trang bán hàng"}
                      </p>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        <User size={10} />
                        {editingProduct ? `Người tạo: ${editingProduct.createdBy || "Quản trị viên"}` : `Người tạo: ${currentUserName || currentRole.name || "Quản trị viên"}`}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
                  title="Đóng (Esc)"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmitProduct} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs overscroll-contain">
                {/* 1. Thông tin cơ bản */}
                <div className="bg-slate-50/60 border border-slate-200/80 rounded-xl p-4.5 space-y-4">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-[11px] flex items-center gap-1.5 text-blue-700">
                    <Box size={14} /> 1. Thông tin chung & Nhận diện
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1.5">
                        Tên sản phẩm <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="VD: Sofa Victoria 3 chỗ da bò Ý"
                        value={formName}
                        onChange={(e) => handleNameChange(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none bg-white transition-all"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block font-semibold text-slate-700">
                          Đường dẫn SEO (Slug) - Tự sinh
                        </label>
                        {isSlugDuplicate && (
                          <span className="text-[11px] font-bold text-amber-600 flex items-center gap-1">
                            <AlertTriangle size={12} /> Trùng với sản phẩm khác
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="sofa-victoria-3-cho"
                        value={formSlug}
                        onChange={(e) => setFormSlug(e.target.value)}
                        className={`w-full px-3.5 py-2 text-xs font-mono border rounded-lg focus:outline-none transition-all ${
                          isSlugDuplicate
                            ? "border-amber-400 bg-amber-50/40 text-amber-900 focus:ring-2 focus:ring-amber-400"
                            : "border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        }`}
                      />
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
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1.5">Danh mục không gian</label>
                      <select
                        value={formCategoryId}
                        onChange={(e) => setFormCategoryId(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none bg-white transition-all"
                      >
                        {activeCategories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1.5">Giá niêm yết (VNĐ) <span className="text-rose-500">*</span></label>
                      <input
                        type="number"
                        step={100000}
                        required
                        value={formPrice}
                        onChange={(e) => setFormPrice(Number(e.target.value))}
                        className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none font-bold text-slate-900 bg-white transition-all"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block font-semibold text-slate-700">Tồn kho cơ bản</label>
                        {formVariants.length > 1 && (
                          <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            Tổng từ {formVariants.length} biến thể
                          </span>
                        )}
                      </div>
                      <input
                        type="number"
                        min={0}
                        value={formStock}
                        disabled={formVariants.length > 1}
                        onChange={(e) => handleFormStockChange(Number(e.target.value))}
                        className={`w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all ${
                          formVariants.length > 1 ? "bg-slate-100 text-slate-600 cursor-not-allowed font-bold" : "bg-white"
                        }`}
                        title={
                          formVariants.length > 1
                            ? `Sản phẩm có ${formVariants.length} biến thể. Tổng tồn kho được tính tự động từ danh sách biến thể bên dưới.`
                            : "Nhập số lượng tồn kho của sản phẩm"
                        }
                      />
                      {formVariants.length > 1 && (
                        <p className="text-[10.5px] text-slate-500 mt-1">
                          💡 Để chỉnh số lượng từng biến thể, bấm icon sửa ở bảng biến thể bên dưới.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Phân loại kinh doanh: Chế độ Đặt Trước & Gắn nhãn Mới */}
                  <div className="pt-3 border-t border-slate-200/80">
                    <label className="block font-semibold text-slate-700 mb-2">
                      Phân loại kinh doanh & Chế độ bán hàng
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Checkbox: Hàng Đặt Trước (Pre-order) */}
                      <label className="flex items-start gap-3 p-3 rounded-xl border border-amber-200 bg-amber-50/60 hover:bg-amber-100/60 transition-colors cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={formIsPreorder}
                          onChange={(e) => setFormIsPreorder(e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
                             Bật chế độ Hàng Đặt Trước 
                          </span>
                          <p className="text-[11px] text-amber-800/80 mt-0.5 leading-relaxed">
                            Sản phẩm sản xuất theo đơn, dự kiến giao sau 7 - 14 ngày làm việc. Khách có thể đặt cọc trước trên web hoặc liên hệ Zalo.
                          </p>
                        </div>
                      </label>

                      {/* Checkbox: Gắn nhãn Hàng Mới (New) */}
                      <label className="flex items-start gap-3 p-3 rounded-xl border border-sky-200 bg-sky-50/60 hover:bg-sky-100/60 transition-colors cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={formIsNew}
                          onChange={(e) => setFormIsNew(e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-sky-400 text-sky-600 focus:ring-sky-500 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-sky-900 text-xs flex items-center gap-1.5">
                           Gắn nhãn Sản phẩm Mới
                          </span>
                          <p className="text-[11px] text-sky-800/80 mt-0.5 leading-relaxed">
                            Hiển thị huy hiệu "Mới" nổi bật trên thẻ sản phẩm và tự động xuất hiện trong trang danh mục Sản phẩm mới.
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* 2. Hình ảnh & File 3D */}
                <div className="bg-slate-50/60 border border-slate-200/80 rounded-xl p-4.5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-[11px] flex items-center gap-1.5 text-blue-700">
                      <ImageIcon size={14} /> 2. Hình ảnh & File 3D tương tác
                    </h4>
                    {imageFiles.length > 0 && (
                      <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                        {imageFiles.length} ảnh đã chọn sẵn sàng tải lên
                      </span>
                    )}
                  </div>

                  {/* KHU VỰC HIỂN THỊ ẢNH HIỆN TẠI TRÊN HỆ THỐNG KHI ĐANG SỬA */}
                  {editingProduct && (formImage || formImage2) && (
                    <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                          <ImageIcon size={14} className="text-amber-600" />
                          <span>Ảnh hiện tại trên hệ thống của sản phẩm:</span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-normal">
                          {imageFiles.length > 0
                            ? `Đã chọn thêm ${imageFiles.length} ảnh mới từ máy tính`
                            : "Có thể tải thêm ảnh mới ở bên dưới để cập nhật"}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-3 items-start">
                        {/* Ảnh chính hiện tại */}
                        {formImage && (
                          <div className="relative group bg-white border border-amber-300 rounded-xl p-1.5 shadow-2xs hover:shadow-sm transition-all flex flex-col items-center">
                            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg overflow-hidden relative bg-slate-100 flex items-center justify-center">
                              <img
                                src={formImage}
                                alt="Ảnh chính hiện tại"
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                onError={(e) => {
                                  const fallback = resolveProductImage("", formName, "").img1;
                                  if ((e.currentTarget as HTMLImageElement).src !== fallback) {
                                    (e.currentTarget as HTMLImageElement).src = fallback;
                                  }
                                }}
                              />
                              <span className="absolute top-1 left-1 bg-amber-500 text-white text-[9.5px] font-bold px-1.5 py-0.5 rounded shadow-xs flex items-center gap-0.5">
                                <Star size={10} className="fill-white" /> Chính
                              </span>
                              <a
                                href={formImage}
                                target="_blank"
                                rel="noreferrer"
                                className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-1 right-1 bg-white/90 hover:bg-white text-slate-800 p-1 rounded shadow-xs"
                                title="Xem ảnh gốc ở tab mới"
                              >
                                <ExternalLink size={12} />
                              </a>
                            </div>
                            <div className="w-full pt-1.5 flex items-center justify-between text-[11px]">
                              <span className="text-slate-600 font-medium">Ảnh đại diện</span>
                              <button
                                type="button"
                                onClick={() => setFormImage("")}
                                className="text-rose-600 hover:text-rose-700 hover:underline cursor-pointer font-medium"
                                title="Gỡ ảnh này khỏi sản phẩm"
                              >
                                Xóa ảnh
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Ảnh phụ hiện tại */}
                        {formImage2 && (
                          <div className="relative group bg-white border border-slate-200 rounded-xl p-1.5 shadow-2xs hover:shadow-sm transition-all flex flex-col items-center">
                            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg overflow-hidden relative bg-slate-100 flex items-center justify-center">
                              <img
                                src={formImage2}
                                alt="Ảnh phụ hiện tại"
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                onError={(e) => {
                                  (e.currentTarget as HTMLElement).style.display = "none";
                                }}
                              />
                              <span className="absolute top-1 left-1 bg-blue-600 text-white text-[9.5px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                                Ảnh phụ
                              </span>
                              <a
                                href={formImage2}
                                target="_blank"
                                rel="noreferrer"
                                className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-1 right-1 bg-white/90 hover:bg-white text-slate-800 p-1 rounded shadow-xs"
                                title="Xem ảnh gốc ở tab mới"
                              >
                                <ExternalLink size={12} />
                              </a>
                            </div>
                            <div className="w-full pt-1.5 flex items-center justify-between text-[11px]">
                              <span className="text-slate-600 font-medium">Ảnh bổ sung</span>
                              <button
                                type="button"
                                onClick={() => setFormImage2("")}
                                className="text-rose-600 hover:text-rose-700 hover:underline cursor-pointer font-medium"
                                title="Gỡ ảnh phụ này"
                              >
                                Xóa ảnh
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500 italic">
                        💡 Ảnh trên đang được áp dụng cho sản phẩm. Nếu bạn muốn thay đổi, hãy chọn hoặc kéo thả ảnh mới từ máy tính ở khung bên dưới.
                      </p>
                    </div>
                  )}

                  {editingProduct && !formImage && !formImage2 && imageFiles.length === 0 && (
                    <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center gap-2.5 text-xs text-amber-800">
                      <AlertTriangle size={15} className="shrink-0 text-amber-600" />
                      <span>Sản phẩm này hiện chưa có ảnh được gán. Hãy chọn hoặc kéo thả tệp ảnh từ máy tính ở khung bên dưới để tải ảnh lên cho sản phẩm.</span>
                    </div>
                  )} 

                  {/* KHU VỰC TẢI TỆP ẢNH TỪ MÁY TÍNH & PREVIEW TRƯỚC KHI LƯU VỀ SERVER */}
                  <div className="pt-2 border-t border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block font-semibold text-slate-800 text-xs">
                          Tải ảnh từ máy tính (Xem trước trực tiếp trước khi gửi về server)
                        </label>
                        <p className="text-[11px] text-slate-500">
                          Bạn có thể chọn hoặc kéo thả nhiều ảnh cùng lúc (.jpg, .png, .webp, .gif tối đa 10MB)
                        </p>
                      </div>
                      {imageFiles.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setImageFiles([]);
                            if (fileInputRef.current) fileInputRef.current.value = "";
                          }}
                          className="text-[11px] text-rose-600 hover:text-rose-700 font-medium hover:underline cursor-pointer"
                        >
                          Xóa tất cả {imageFiles.length} ảnh đã chọn
                        </button>
                      )}
                    </div>

                    {/* Vùng Dropzone Kéo Thả / Bấm Chọn Tệp */}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDraggingOver(true);
                      }}
                      onDragLeave={() => setIsDraggingOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDraggingOver(false);
                        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                          handleAddImageFiles(e.dataTransfer.files);
                        }
                      }}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                        isDraggingOver
                          ? "border-blue-500 bg-blue-50/80 scale-[1.01]"
                          : "border-slate-300 hover:border-blue-400 hover:bg-blue-50/40 bg-white"
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp"
                        onChange={(event) => {
                          if (event.target.files && event.target.files.length > 0) {
                            handleAddImageFiles(event.target.files);
                          }
                          event.target.value = "";
                        }}
                        className="hidden"
                      />
                      <div className="flex flex-col items-center justify-center gap-1.5 py-1">
                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                          <UploadCloud size={20} />
                        </div>
                        <p className="text-xs font-semibold text-slate-800">
                          Nhấp để duyệt ảnh từ máy tính hoặc kéo thả file ảnh vào đây
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Hỗ trợ định dạng JPG, JPEG, PNG, WebP, GIF (tối đa 10 MB/tệp)
                        </p>
                      </div>
                    </div>

                    {/* DANH SÁCH THUMBNAIL XEM TRƯỚC (IMAGE PREVIEWS) */}
                    {imagePreviews.length > 0 && (
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between text-xs text-slate-600 font-semibold">
                          <span>Hình ảnh xem trước ({imagePreviews.length} ảnh):</span>
                          <span className="text-[11px] text-slate-400 font-normal">
                            * Ảnh đầu tiên được gắn nhãn "Ảnh chính" sẽ làm ảnh đại diện sản phẩm
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {imagePreviews.map((preview, idx) => {
                            const isPrimary = idx === 0;
                            return (
                              <div
                                key={idx}
                                className={`group relative bg-white border rounded-xl overflow-hidden shadow-xs transition-all ${
                                  isPrimary ? "border-amber-400 ring-2 ring-amber-400/30" : "border-slate-200 hover:border-blue-300"
                                }`}
                              >
                                {/* Ảnh thumbnail */}
                                <div className="aspect-square w-full relative bg-slate-100 overflow-hidden">
                                  <img
                                    src={preview.url}
                                    alt={preview.name}
                                    className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                                  />

                                  {/* Badge trạng thái ảnh chính */}
                                  <div className="absolute top-2 left-2 z-10">
                                    {isPrimary ? (
                                      <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                                        <Star size={11} className="fill-white" /> Ảnh chính
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSetPrimaryImage(idx);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 bg-slate-900/80 hover:bg-amber-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full transition-all shadow-xs cursor-pointer"
                                        title="Đặt ảnh này làm ảnh đại diện chính"
                                      >
                                        Đặt làm chính
                                      </button>
                                    )}
                                  </div>

                                  {/* Nút xóa ảnh */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveImageFile(idx);
                                    }}
                                    className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-slate-900/70 hover:bg-rose-600 text-white flex items-center justify-center transition-colors shadow-xs cursor-pointer"
                                    title="Xóa ảnh này khỏi danh sách tải lên"
                                  >
                                    <X size={13} />
                                  </button>
                                </div>

                                {/* Thông tin tệp */}
                                <div className="p-2 bg-white">
                                  <p className="text-[11.5px] font-semibold text-slate-800 truncate" title={preview.name}>
                                    {preview.name}
                                  </p>
                                  <div className="flex items-center justify-between mt-0.5 text-[10.5px] text-slate-500">
                                    <span>{preview.size}</span>
                                    <span className="text-blue-600 font-medium">#{idx + 1}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* KHU VỰC MÔ HÌNH 3D (.GLB) */}
                  <div className="pt-2 border-t border-slate-200/80 space-y-3">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block font-semibold text-slate-700 text-xs mb-1.5">Mô hình 3D (URL .glb)</label>
                        <input
                          type="url"
                          placeholder="https://.../model.glb"
                          value={formModel3dUrl}
                          onChange={(event) => setFormModel3dUrl(event.target.value)}
                          className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg font-mono bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 text-xs mb-1.5">Tải tệp mô hình 3D (.glb từ máy)</label>
                        <input
                          type="file"
                          accept=".glb,model/gltf-binary"
                          onChange={(event) => {
                            const file = event.target.files?.[0] || null;
                            if (file && (file.size > 100 * 1024 * 1024 || !/\.glb$/i.test(file.name))) {
                              setSubmitError("Mô hình 3D phải là file GLB và không vượt quá 100 MiB.");
                              event.target.value = "";
                              setModel3dFile(null);
                              return;
                            }
                            setSubmitError("");
                            setModel3dFile(file);
                          }}
                          className="w-full text-xs text-slate-600 file:mr-2.5 file:rounded-lg file:border-0 file:bg-violet-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-violet-700 hover:file:bg-violet-100 cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Hiển thị Card tệp 3D xem trước nếu đã chọn */}
                    {model3dFile && (
                      <div className="p-3 bg-violet-50/80 border border-violet-200 rounded-xl flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-violet-600 text-white flex items-center justify-center shrink-0">
                            <Box size={16} />
                          </div>
                          <div>
                            <p className="font-bold text-violet-900 truncate max-w-xs">{model3dFile.name}</p>
                            <span className="text-violet-600 text-[11px]">
                              Tệp 3D GLB • {(model3dFile.size / (1024 * 1024)).toFixed(2)} MB (Sẵn sàng tải lên)
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setModel3dFile(null)}
                          className="text-violet-500 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                          title="Hủy chọn tệp 3D"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Quản lý Biến thể (Variants Manager) ── */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <Layers size={14} className="text-blue-600" />
                      Danh sách Biến thể thuộc tính ({formVariants.length})
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Mỗi biến thể có mã SKU, màu sắc, kích cỡ, tồn kho và giá bán riêng
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenAddVariant}
                    className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold hover:bg-blue-100 flex items-center gap-1 transition-all"
                  >
                    <Plus size={13} /> Thêm biến thể
                  </button>
                </div>

                {formVariants.length > 0 ? (
                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-semibold">
                        <tr>
                          <th className="py-2 px-3">Mã SKU</th>
                          <th className="py-2 px-3">Màu sắc</th>
                          <th className="py-2 px-3">Kích thước</th>
                          <th className="py-2 px-3">Giá bán</th>
                          <th className="py-2 px-3 text-center">Tồn kho</th>
                          <th className="py-2 px-3 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {formVariants.map((v, idx) => (
                          <tr key={v.id || idx} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-mono font-bold text-blue-700 text-[11px]">{v.sku}</td>
                            <td className="py-2 px-3">{v.color}</td>
                            <td className="py-2 px-3">{v.size}</td>
                            <td className="py-2 px-3 font-bold">{vnd(v.price)}</td>
                            <td className="py-2 px-3 text-center font-bold">{v.stock}</td>
                            <td className="py-2 px-3 text-right">
                              <div className="inline-flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditVariant(idx)}
                                  className="p-1 text-slate-500 hover:text-blue-600"
                                >
                                  <Edit size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteVariant(idx)}
                                  className="p-1 text-slate-400 hover:text-rose-600"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-center py-4 text-slate-400 text-xs italic bg-white rounded-lg border border-dashed border-slate-200">
                    Chưa có biến thể nào. Bấm "Thêm biến thể" để tạo SKU con (Màu/Size/Chất liệu).
                  </p>
                )}
              </div>
      {/* Mô tả chi tiết sản phẩm (Description) */}
                  <div className="pt-3 border-t border-slate-200/60">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block font-semibold text-slate-700 text-xs">
                        Mô tả chi tiết sản phẩm (Description)
                      </label>
                      <span className="text-[11px] text-slate-400">
                        {formDescription.length} ký tự
                      </span>
                    </div>
                    <textarea
                      rows={4}
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Nhập mô tả chi tiết sản phẩm, phong cách thiết kế, chất liệu, tính năng nổi bật, xuất xứ..."
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none bg-white transition-all resize-y leading-relaxed"
                    />
                    <p className="mt-1 text-[11px] text-slate-400">
                      Mô tả này sẽ hiển thị ở trang chi tiết sản phẩm cho khách hàng tham khảo khi mua sắm.
                    </p>
                  </div>
              {submitError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{submitError}</p>}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-100 transition-all"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60 text-white rounded-lg text-xs font-semibold shadow-xs transition-all"
                >
                  {isSaving ? "Đang lưu..." : editingProduct ? "Lưu thay đổi sản phẩm" : "Tạo sản phẩm mới"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── Modal Thêm / Chỉnh sửa Biến thể (Variant) ── */}
      {showVariantModal &&
        createPortal(
          <div
            className="fixed inset-0 z-10000 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overscroll-contain animate-in fade-in duration-150"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowVariantModal(false);
            }}
          >
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/70 shrink-0">
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Layers className="text-blue-600" size={15} />
                  {editingVariantIndex !== null ? "Chỉnh sửa biến thể" : "Thêm biến thể mới"}
                </h4>
                <button
                  type="button"
                  onClick={() => setShowVariantModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Đóng (Esc)"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveVariant} className="flex-1 overflow-y-auto p-5 space-y-3.5 text-xs overscroll-contain">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mã SKU biến thể</label>
                <input
                  type="text"
                  required
                  placeholder="NX-SOFA-BEIGE-M"
                  value={varSku}
                  onChange={(e) => setVarSku(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 font-mono font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Màu sắc</label>
                  <input
                    type="text"
                    required
                    placeholder="Be sáng, Nâu bò..."
                    value={varColor}
                    onChange={(e) => setVarColor(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kích thước</label>
                  <input
                    type="text"
                    placeholder="2.2m x 0.9m"
                    value={varSize}
                    onChange={(e) => setVarSize(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Giá bán riêng (VNĐ)</label>
                  <input
                    type="number"
                    step={100000}
                    required
                    value={varPrice}
                    onChange={(e) => setVarPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 font-semibold border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Số lượng tồn kho</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={varStock}
                    onChange={(e) => setVarStock(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Chất liệu cấu thành</label>
                <input
                  type="text"
                  placeholder="Da bò Ý nhập khẩu / Gỗ sồi Nga..."
                  value={varMaterial}
                  onChange={(e) => setVarMaterial(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowVariantModal(false)}
                  className="px-3.5 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-100 transition-all"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all"
                >
                  Lưu biến thể
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── Modal Chi tiết xem nhanh Sản phẩm (Product Details Modal) ── */}
      {viewingProduct &&
        createPortal(
          <div
            className="fixed inset-0 z-9999 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overscroll-contain animate-in fade-in duration-200"
            onClick={(e) => {
              if (e.target === e.currentTarget) setViewingProduct(null);
            }}
          >
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <Package size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      Chi tiết sản phẩm: {viewingProduct.name}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Mã ID: #{viewingProduct.id} · Danh mục: {viewingProduct.category || "Nội thất"} · Người tạo: <strong className="text-slate-700">{viewingProduct.createdBy || "Quản trị viên"}</strong>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingProduct(null)}
                  className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
                  title="Đóng (Esc)"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs overscroll-contain">
                {/* Ảnh & Thông tin tổng quan */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 items-start">
                  <div className="sm:col-span-1 space-y-2.5">
                    {/* Ảnh chính lớn */}
                    <div className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center shadow-xs">
                      <img
                        src={viewingProduct.image || resolveProductImage("", viewingProduct.name, viewingProduct.category).img1}
                        alt={viewingProduct.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          const fallback = resolveProductImage("", viewingProduct.name, viewingProduct.category).img1;
                          if ((e.currentTarget as HTMLImageElement).src !== fallback) {
                            (e.currentTarget as HTMLImageElement).src = fallback;
                          }
                        }}
                      />
                      <span className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                        <Star size={10} className="fill-amber-400 text-amber-400" /> Ảnh chính
                      </span>
                      {viewingProduct.image && (
                        <a
                          href={viewingProduct.image}
                          target="_blank"
                          rel="noreferrer"
                          className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-2 right-2 bg-white/95 hover:bg-white text-slate-800 p-1.5 rounded-lg shadow-sm"
                          title="Xem ảnh gốc ở tab mới"
                        >
                          <ExternalLink size={13} />
                        </a>
                      )}
                    </div>

                    {/* Ảnh phụ nếu có */}
                    {viewingProduct.image2 && (
                      <div className="relative group aspect-video rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                        <img
                          src={viewingProduct.image2}
                          alt="Ảnh phụ"
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = "none";
                          }}
                        />
                        <span className="absolute top-1.5 left-1.5 bg-slate-900/80 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-xs">
                          Ảnh phụ
                        </span>
                        <a
                          href={viewingProduct.image2}
                          target="_blank"
                          rel="noreferrer"
                          className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-1.5 right-1.5 bg-white/95 hover:bg-white text-slate-800 p-1 rounded-md shadow-sm"
                          title="Xem ảnh gốc ở tab mới"
                        >
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="sm:col-span-2 space-y-3.5">
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Giá niêm yết:</span>
                        <span className="text-base font-extrabold text-[#b86b49]">
                          {vnd(viewingProduct.price)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Tổng tồn kho khả dụng:</span>
                        <span className="font-bold text-slate-800">
                          {getProductTotalStock(viewingProduct)} món
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Đường dẫn SEO (Slug):</span>
                        <span className="font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                          {viewingProduct.slug}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Trạng thái bán:</span>
                        {viewingProduct.isDeleted ? (
                          <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-rose-100 text-rose-700">
                            Đã xóa mềm
                          </span>
                        ) : viewingProduct.isPreorder ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Hàng đặt trước
                          </span>
                        ) : getProductTotalStock(viewingProduct) <= 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-rose-50 text-rose-600">
                            Hết hàng
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                            <CheckCircle2 size={12} className="text-emerald-600" /> Đang kinh doanh
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                        <span className="text-slate-500">Phân loại kinh doanh:</span>
                        <div className="flex items-center gap-1.5">
                          {viewingProduct.isPreorder && (
                            <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              ⏳ Đặt trước (Pre-order)
                            </span>
                          )}
                          {viewingProduct.isNew && (
                            <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-sky-100 text-sky-800 border border-sky-300">
                              ✨ Sản phẩm mới
                            </span>
                          )}
                          {!viewingProduct.isPreorder && !viewingProduct.isNew && (
                            <span className="px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-slate-100 text-slate-600">
                              Hàng tiêu chuẩn
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {viewingProduct.model3dUrl && (
                      <div className="flex items-center justify-between p-3 rounded-lg border border-violet-200 bg-violet-50/60 text-violet-800">
                        <div className="flex items-center gap-2">
                          <Box size={16} className="text-violet-600" />
                          <span className="font-semibold text-xs">Mô hình tương tác 3D (.glb)</span>
                        </div>
                        <a
                          href={viewingProduct.model3dUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-violet-700 hover:underline"
                        >
                          Mở file 3D <ExternalLink size={11} />
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Mô tả chi tiết sản phẩm nếu có */}
                {viewingProduct.description && (
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-1.5">
                    <h4 className="font-bold text-slate-900 text-xs">
                      Mô tả chi tiết sản phẩm
                    </h4>
                    <p className="text-slate-600 text-xs leading-relaxed whitespace-pre-line">
                      {viewingProduct.description}
                    </p>
                  </div>
                )}

                {/* Danh sách biến thể quy cách */}
                <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <Layers size={14} className="text-blue-600" />
                      Quy cách & Biến thể ({viewingProduct.variants?.length || 0})
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      Màu sắc, kích cỡ, chất liệu cấu thành
                    </span>
                  </div>

                  {viewingProduct.variants && viewingProduct.variants.length > 0 ? (
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-semibold">
                          <tr>
                            <th className="py-2.5 px-3">Mã SKU</th>
                            <th className="py-2.5 px-3">Màu sắc</th>
                            <th className="py-2.5 px-3">Kích thước</th>
                            <th className="py-2.5 px-3">Chất liệu</th>
                            <th className="py-2.5 px-3">Đơn giá</th>
                            <th className="py-2.5 px-3 text-center">Tồn kho</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {viewingProduct.variants.map((v, i) => (
                            <tr key={v.id || i} className="hover:bg-slate-50/80">
                              <td className="py-2 px-3 font-mono font-bold text-blue-700 text-[11px]">
                                {v.sku}
                              </td>
                              <td className="py-2 px-3">{v.color || "—"}</td>
                              <td className="py-2 px-3">{v.size || "—"}</td>
                              <td className="py-2 px-3 text-slate-600">{v.material || "—"}</td>
                              <td className="py-2 px-3 font-bold text-slate-900">{vnd(v.price)}</td>
                              <td className="py-2 px-3 text-center font-bold text-emerald-600">{v.stock}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-center py-3 text-slate-400 text-xs italic bg-slate-50 rounded-lg">
                      Sản phẩm này có 1 quy cách cơ bản, không chia biến thể.
                    </p>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 shrink-0">
                <div className="flex items-center gap-2">
                  <PermissionGate permission="products.edit" currentRole={currentRole}>
                    <button
                      type="button"
                      onClick={() => {
                        const target = viewingProduct;
                        setViewingProduct(null);
                        handleOpenEdit(target);
                      }}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                      <Edit size={12} /> Chỉnh sửa sản phẩm này
                    </button>
                  </PermissionGate>
                  <button
                    type="button"
                    onClick={() => setViewingProduct(null)}
                    className="px-4 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-100 transition-all"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
