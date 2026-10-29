import { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Package, Plus, Edit, Trash2, RotateCcw, Search,
  Layers, X, EyeOff, AlertTriangle, FileSpreadsheet
} from "lucide-react";
import type { AdminProduct, AdminCategory, RoleDefinition } from "../../../services/admin/types";
import type { AdminProductInput } from "../../../services/admin/catalogApi";
import PermissionGate from "../../../components/admin/PermissionGate";
import { AdminPagination } from "../../../components/admin/AdminPagination";
import { useAdminProducts, type ProductStockFilter, type ProductSortBy } from "../../../hooks/admin/useAdminProducts";
import { vnd } from "../../../util/Constain";
import { exportProductsToExcel } from "../../../util/excelExport";


interface ProductViewProps {
  products: AdminProduct[];
  categories: AdminCategory[];
  currentRole: RoleDefinition;
  onSaveProduct: (prod: AdminProductInput) => Promise<void>;
  onDeleteProduct: (id: number) => void;
  onRestoreProduct: (id: number) => void;
}

export default function ProductView({
  products,
  categories,
  currentRole,
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
    sortBy,
    setSortBy,
    activeTab,
    setActiveTab,
    activeCategories,
    pagination,
    getProductTotalStock,
    showProductModal,
    setShowProductModal,
    editingProduct,
    formName,
    formSlug,
    setFormSlug,
    formCategoryId,
    setFormCategoryId,
    formPrice,
    setFormPrice,
    formStock,
    setFormStock,
    formImage,
    setFormImage,
    formImage2,
    setFormImage2,
    formModel3dUrl,
    setFormModel3dUrl,
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
  } = useAdminProducts({ products, categories, onSaveProduct });

  // Khóa cuộn trang nền khi mở Modal và hỗ trợ đóng modal bằng phím Escape
  useEffect(() => {
    if (showProductModal || showVariantModal) {
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
  }, [showProductModal, showVariantModal, setShowProductModal, setShowVariantModal]);

  const { paginatedItems: displayedProducts } = pagination;

  return (
    <div className="space-y-6 text-slate-800">
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
                <Package size={14} /> Đang bán ({products.filter((p) => !p.isDeleted).length})
              </button>
              <button
                className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                  activeTab === "trash"
                    ? "bg-white text-rose-600 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                onClick={() => setActiveTab("trash")}
              >
                <EyeOff size={14} /> Thùng rác ({products.filter((p) => p.isDeleted).length})
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
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Plus size={15} /> Thêm sản phẩm
              </button>
            </PermissionGate>
          </div>
        </div>

        {/* Filter bar: Search + Category + Stock + Sort */}
        <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative w-full md:w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm tên, SKU, slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium"
            />
          </div>

          <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto">
            {/* Category filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 cursor-pointer"
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
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 cursor-pointer"
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
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 cursor-pointer"
            >
              <option value="default">Sắp xếp mặc định</option>
              <option value="price_asc">Giá tăng dần</option>
              <option value="price_desc">Giá giảm dần</option>
              <option value="stock_asc">Tồn kho thấp - cao</option>
              <option value="stock_desc">Tồn kho cao - thấp</option>
              <option value="name_asc">Tên A - Z</option>
            </select>
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
                          src={p.image}
                          alt={p.name}
                          className="w-11 h-11 object-cover rounded-lg border border-slate-200"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-bold text-xs block ${
                            p.isDeleted ? "line-through text-slate-400" : "text-slate-900"
                          }`}
                        >
                          {p.name}
                        </span>
                        <div className="text-[11px] text-slate-500 mt-0.5"></div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-700">{p.category}</span>
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
                        {p.isDeleted ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-rose-100 text-rose-700 border border-rose-200">
                            Đã xóa mềm
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
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          {!p.isDeleted ? (
                            <>
                              <PermissionGate permission="products.edit" currentRole={currentRole}>
                                <button
                                  onClick={() => handleOpenEdit(p)}
                                  className="px-2.5 py-1 rounded-md text-[11px] font-semibold border border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center gap-1 transition-all"
                                  title="Chỉnh sửa sản phẩm và biến thể"
                                >
                                  <Edit size={12} /> Sửa
                                </button>
                              </PermissionGate>

                              <PermissionGate permission="products.delete" currentRole={currentRole}>
                                <button
                                  onClick={() => onDeleteProduct(p.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all"
                                  title="Xóa mềm vào thùng rác"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </PermissionGate>
                            </>
                          ) : (
                            <PermissionGate permission="products.delete" currentRole={currentRole}>
                              <button
                                onClick={() => onRestoreProduct(p.id)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-xs transition-all"
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
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
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
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Package className="text-blue-600" size={18} />
                  {editingProduct ? `Chỉnh sửa: ${editingProduct.name}` : "Thêm sản phẩm mới"}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Đóng (Esc)"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmitProduct} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs overscroll-contain">
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
                    placeholder="sofa-victoria-3-cho"
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Danh mục</label>
                  <select
                    value={formCategoryId}
                    onChange={(e) => setFormCategoryId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none bg-white"
                  >
                    {activeCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Giá bán niêm yết (VNĐ)</label>
                  <input
                    type="number"
                    step={100000}
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Tồn kho mặc định</label>
                  <input
                    type="number"
                    min={0}
                    value={formStock}
                    onChange={(e) => setFormStock(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Ảnh đại diện (URL nếu có)</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://... hoặc chọn file ở bên dưới"
                    value={formImage}
                    onChange={(e) => setFormImage(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none font-mono"
                  />
                  {formImage && (
                    <img
                      src={formImage}
                      alt="Preview"
                      className="w-9 h-9 object-cover rounded-lg border border-slate-200 shrink-0"
                    />
                  )}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Ảnh bổ sung (URL, không bắt buộc)</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={formImage2}
                    onChange={(event) => setFormImage2(event.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Tải ảnh lên</label>
                  <input
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp"
                    onChange={(event) => {
                      const files = Array.from(event.target.files || []);
                      const invalidFile = files.find((file) =>
                        file.size > 10 * 1024 * 1024 ||
                        !/\.(jpe?g|png|gif|webp)$/i.test(file.name)
                      );
                      if (invalidFile) {
                        setSubmitError(`Ảnh ${invalidFile.name} không đúng định dạng JPG, PNG, GIF, WebP hoặc vượt quá 10 MiB.`);
                        event.target.value = "";
                        return;
                      }
                      setSubmitError("");
                      setImageFiles(files);
                    }}
                    className="w-full text-xs text-slate-600 file:mr-2 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-blue-700"
                  />
                  <p className="mt-1 text-[10px] text-slate-400">JPG, PNG, GIF, WebP; tối đa 10 MiB mỗi ảnh.</p>
                  {imageFiles.length > 0 && <p className="mt-1 text-[11px] text-blue-700">Đã chọn {imageFiles.length} ảnh để tải lên.</p>}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Mô hình 3D (URL, không bắt buộc)</label>
                  <input
                    type="url"
                    placeholder="https://.../model.glb"
                    value={formModel3dUrl}
                    onChange={(event) => setFormModel3dUrl(event.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Tải mô hình 3D lên</label>
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
                    className="w-full text-xs text-slate-600 file:mr-2 file:rounded-md file:border-0 file:bg-violet-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-violet-700"
                  />
                  <p className="mt-1 text-[10px] text-slate-400">Chỉ GLB, tối đa 100 MiB theo cấu hình API hiện tại.</p>
                  {model3dFile && <p className="mt-1 truncate text-[11px] text-violet-700">{model3dFile.name}</p>}
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
    </div>
  );
}
