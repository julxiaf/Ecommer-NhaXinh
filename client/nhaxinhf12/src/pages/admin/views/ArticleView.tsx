import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FileText, Plus, Trash2, Edit, Eye, Search, RotateCcw, EyeOff, Sparkles, Upload, Loader2, X, ExternalLink, BookOpen } from "lucide-react";
import type { AdminArticle, RoleDefinition } from "../../../services/admin/types";
import PermissionGate from "../../../components/admin/PermissionGate";
import { AdminPagination } from "../../../components/admin/AdminPagination";
import { useAdminArticles } from "../../../hooks/admin/useAdminArticles";
import TiptapEditor from "../../../components/admin/TiptapEditor";
import { articleService } from "../../../services/articleService";
import { productService } from "../../../services/productService";
import type { Product } from "../../../types/catalog";

interface ArticleViewProps {
  articles: AdminArticle[];
  currentRole: RoleDefinition;
  onSaveArticle: (art: Partial<AdminArticle>) => void;
  onDeleteArticle: (id: string) => void;
  onRestoreArticle?: (id: string) => void;
  onToggleStatus?: (id: string, status?: "published" | "hidden") => void;
}

export default function ArticleView({
  articles,
  currentRole,
  onSaveArticle,
  onDeleteArticle,
  onRestoreArticle,
  onToggleStatus,
}: ArticleViewProps) {
  const {
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    statusFilter,
    setStatusFilter,
    activeTab,
    setActiveTab,
    pagination,
    showModal,
    setShowModal,
    editingArt,
    title,
    setTitle,
    category,
    setCategory,
    collectionSlug,
    setCollectionSlug,
    status,
    setStatus,
    summary,
    setSummary,
    content,
    setContent,
    image,
    setImage,
    openCreate,
    openEdit,
    handleSave,
  } = useAdminArticles({ articles, onSaveArticle });

  const { paginatedItems: displayedArticles } = pagination;

  const [isCoverUploading, setIsCoverUploading] = useState(false);
  const [previewArticle, setPreviewArticle] = useState<AdminArticle | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  // Tải danh sách sản phẩm để hiển thị liên kết bộ sưu tập trong preview
  useEffect(() => {
    productService
      .getProducts({ size: 100 })
      .then((prods) => {
        if (prods && prods.length > 0) setAllProducts(prods);
      })
      .catch(() => {});
  }, []);

  const getLinkedProducts = (colSlug?: string): Product[] => {
    if (!colSlug) return [];
    const s = colSlug.toLowerCase().trim();
    const keywords = s.split(/[-_\s]+/);
    return allProducts.filter((p) => {
      const hay = `${p.name} ${p.category} ${p.description || ""} ${p.slug}`.toLowerCase();
      return keywords.some((kw) => kw.length > 2 && hay.includes(kw));
    });
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsCoverUploading(true);
      const url = await articleService.uploadArticleImage(file);
      setImage(url);
    } catch (err: any) {
      alert("Không thể tải ảnh bìa: " + (err.message || "Lỗi không xác định"));
    } finally {
      setIsCoverUploading(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };

  // Khóa cuộn trang nền khi mở Modal và hỗ trợ phím Escape
  useEffect(() => {
    if (showModal || previewArticle) {
      const prevBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setShowModal(false);
          setPreviewArticle(null);
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = prevBodyOverflow;
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [showModal, setShowModal, previewArticle]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="text-blue-600" size={24} />
            Quản lý Bài viết & Cẩm nang
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Đăng tải mẹo trang trí, xu hướng thiết kế và tin tức nội thất
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
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
              <FileText size={14} /> Danh sách ({articles.filter((a) => !a.isDeleted).length})
            </button>
            <button
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === "trash"
                  ? "bg-white text-rose-600 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              onClick={() => setActiveTab("trash")}
            >
              <Trash2 size={14} /> Thùng rác ({articles.filter((a) => a.isDeleted).length})
            </button>
          </div>

          <div className="relative w-full sm:w-56">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm tiêu đề, tóm tắt..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
          >
            <option value="all">Tất cả chuyên mục</option>
            <option value="Bộ sưu tập">Bộ sưu tập</option>
            <option value="Góc cảm hứng">Góc cảm hứng</option>
            <option value="Xu hướng nội thất">Xu hướng nội thất</option>
            <option value="Cẩm nang bảo quản">Cẩm nang bảo quản</option>
            <option value="Tin tức">Tin tức</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
            title="Lọc bài viết theo trạng thái hiển thị hoặc ẩn"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="published">Đang hiển thị (Công khai)</option>
            <option value="hidden">Đang ẩn (Tạm khóa)</option>
          </select>

          <PermissionGate permission="articles.create" currentRole={currentRole}>
            <button
              onClick={openCreate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Plus size={15} /> Viết bài mới
            </button>
          </PermissionGate>
        </div>
      </div>

      {displayedArticles.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-xs text-slate-400">
          Không tìm thấy bài viết nào phù hợp với bộ lọc.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayedArticles.map((art) => (
            <div
              key={art.id}
              className={`bg-white rounded-xl border overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
                art.isDeleted ? "border-rose-200 bg-rose-50/20" : "border-slate-200"
              }`}
            >
              <div>
                <div className="h-44 w-full overflow-hidden relative">
                  <img src={art.image} alt={art.title} className="w-full h-full object-cover" />
                  <span className={`absolute top-2.5 left-2.5 text-white text-[10px] font-bold px-2.5 py-1 rounded-md shadow-sm flex items-center gap-1 ${
                    art.category === "Bộ sưu tập" ? "bg-amber-600" : "bg-blue-600"
                  }`}>
                    {art.category === "Bộ sưu tập" && <Sparkles size={11} />}
                    {art.category}
                  </span>
                  {art.collectionSlug && (
                    <a
                      href={`/bo-suu-tap/${art.collectionSlug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="absolute bottom-2.5 left-2.5 bg-slate-900/80 hover:bg-amber-900 backdrop-blur-xs text-amber-300 hover:text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm transition-colors flex items-center gap-1"
                      title={`Mở URL /bo-suu-tap/${art.collectionSlug}`}
                    >
                      <span>BST: {art.collectionSlug}</span>
                      <ExternalLink size={10} />
                    </a>
                  )}
                  {art.isDeleted ? (
                    <span className="absolute top-2.5 right-2.5 bg-rose-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-md shadow-sm">
                      Đã xóa mềm
                    </span>
                  ) : art.status === "hidden" ? (
                    <span className="absolute top-2.5 right-2.5 bg-slate-900/85 backdrop-blur-xs text-amber-300 border border-amber-500/40 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm flex items-center gap-1">
                      <EyeOff size={11} /> Đang ẩn
                    </span>
                  ) : (
                    <span className="absolute top-2.5 right-2.5 bg-emerald-600/90 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm flex items-center gap-1">
                      <Eye size={11} /> Đang hiển thị
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-slate-900 text-sm line-clamp-2 mb-1.5">{art.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{art.summary}</p>
                </div>
              </div>

              <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Eye size={13} /> {art.views} lượt xem
                </span>
                <div className="flex items-center gap-1.5">
                  {art.isDeleted ? (
                    onRestoreArticle && (
                      <button
                        type="button"
                        onClick={() => onRestoreArticle(art.id)}
                        className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md flex items-center gap-1 transition-all"
                        title="Khôi phục bài viết này"
                      >
                        <RotateCcw size={12} /> Khôi phục
                      </button>
                    )
                  ) : (
                    <>
                      <PermissionGate permission="articles.edit" currentRole={currentRole}>
                        <button
                          type="button"
                          onClick={() => {
                            const nextStatus = art.status === "hidden" ? "published" : "hidden";
                            if (onToggleStatus) {
                              onToggleStatus(art.id, nextStatus);
                            } else {
                              onSaveArticle({ id: art.id, status: nextStatus });
                            }
                          }}
                          className={`px-2 py-1 rounded-md text-[11px] font-semibold border flex items-center gap-1 transition-all cursor-pointer ${
                            art.status === "hidden"
                              ? "bg-amber-50 border-amber-300 text-amber-800 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300"
                              : "bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300"
                          }`}
                          title={
                            art.status === "hidden"
                              ? "Đang ẩn. Bấm để hiển thị công khai bài viết cho khách hàng"
                              : "Đang hiển thị. Bấm để ẩn bài viết khỏi khách hàng"
                          }
                        >
                          {art.status === "hidden" ? (
                            <>
                              <EyeOff size={12} className="text-amber-600" />
                              <span>Ẩn</span>
                            </>
                          ) : (
                            <>
                              <Eye size={12} className="text-emerald-600" />
                              <span>Hiện</span>
                            </>
                          )}
                        </button>
                      </PermissionGate>

                      <button
                        type="button"
                        onClick={() => setPreviewArticle(art)}
                        className="p-1 text-slate-600 hover:text-amber-600 rounded transition-colors"
                        title="Xem trước bài viết (kèm ảnh & sản phẩm BST)"
                      >
                        <BookOpen size={14} />
                      </button>
                      <PermissionGate permission="articles.edit" currentRole={currentRole}>
                        <button
                          onClick={() => openEdit(art)}
                          className="p-1 text-slate-600 hover:text-blue-600 rounded"
                          title="Sửa bài viết"
                        >
                          <Edit size={14} />
                        </button>
                      </PermissionGate>
                      <PermissionGate permission="articles.delete" currentRole={currentRole}>
                        <button
                          onClick={() => onDeleteArticle(art.id)}
                          className="p-1 text-slate-600 hover:text-rose-600 rounded"
                          title="Xóa vào thùng rác"
                        >
                          <Trash2 size={14} />
                        </button>
                      </PermissionGate>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <AdminPagination pagination={pagination} pageSizeOptions={[6, 12, 24]} itemLabel="bài viết" />
      </div>

      {showModal &&
        createPortal(
          <div
            className="fixed inset-0 z-9999 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overscroll-contain animate-in fade-in duration-200"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowModal(false);
            }}
          >
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <FileText size={18} className="text-blue-600" />
                  {editingArt ? "Chỉnh sửa bài viết" : "Viết bài mới"}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Đóng (Esc)"
                >
                  <X size={18} />
                </button>
              </div>
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Tiêu đề bài viết</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Nhập tiêu đề bài viết..."
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Chuyên mục</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as AdminArticle["category"])}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium"
                  >
                    <option value="Bộ sưu tập">Bộ sưu tập (Collections)</option>
                    <option value="Góc cảm hứng">Góc cảm hứng</option>
                    <option value="Xu hướng nội thất">Xu hướng nội thất</option>
                    <option value="Cẩm nang bảo quản">Cẩm nang bảo quản</option>
                    <option value="Tin tức">Tin tức</option>
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block font-semibold text-slate-700">Ảnh đại diện (Cover)</label>
                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      disabled={isCoverUploading}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      {isCoverUploading ? (
                        <>
                          <Loader2 size={12} className="animate-spin text-blue-600" />
                          <span>Đang tải...</span>
                        </>
                      ) : (
                        <>
                          <Upload size={12} />
                          <span>Tải ảnh từ máy</span>
                        </>
                      )}
                    </button>
                    <input
                      type="file"
                      ref={coverInputRef}
                      onChange={handleCoverUpload}
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={image}
                      onChange={(e) => setImage(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-[11px]"
                      placeholder="https://images.unsplash.com/... hoặc /uploads/..."
                    />
                    {image && (
                      <div className="relative shrink-0 w-8 h-8 rounded border border-slate-200 overflow-hidden" title="Xem trước ảnh bìa">
                        <img src={image} alt="Cover Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {category === "Bộ sưu tập" && (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg">
                  <label className="block font-semibold text-amber-900 mb-1">
                    Gắn với Bộ sưu tập (Collection Slug)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={collectionSlug}
                      onChange={(e) => setCollectionSlug(e.target.value)}
                      placeholder="VD: victoria, net-duong-dai, may..."
                      className="w-full px-3 py-1.5 border border-amber-300 rounded-md bg-white text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                    <select
                      onChange={(e) => {
                        if (e.target.value) setCollectionSlug(e.target.value);
                      }}
                      className="px-2 py-1.5 border border-amber-300 rounded-md bg-white text-xs font-medium text-slate-700 shrink-0"
                    >
                      <option value="">-- Chọn nhanh --</option>
                      <option value="coastal-living">Coastal Living</option>
                      <option value="victoria">Victoria</option>
                      <option value="net-duong-dai">Nét Đương Đại</option>
                      <option value="osaka">Osaka (Japandi)</option>
                      <option value="may">Mây</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-amber-700 mt-1">
                    <span>Bài viết sẽ tự động dẫn tới URL trang chi tiết bộ sưu tập tương ứng.</span>
                    {collectionSlug && (
                      <a
                        href={`/bo-suu-tap/${collectionSlug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono font-semibold text-amber-900 underline hover:text-blue-600"
                      >
                        /bo-suu-tap/{collectionSlug} ↗
                      </a>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Tóm tắt ngắn (Lead / Giới thiệu)</label>
                <textarea
                  rows={2}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Mô tả tóm tắt ngắn về bộ sưu tập hoặc bài viết..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-semibold text-slate-700">
                    Nội dung chi tiết (Trình soạn thảo TipTap WYSIWYG)
                  </label>
                  <span className="text-[11px] text-blue-600 font-medium">Hỗ trợ TipTap Editor</span>
                </div>
                <TiptapEditor content={content} onChange={setContent} />
              </div>

              {/* Trạng thái xuất bản / ẩn */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <label className="block font-semibold text-slate-700 mb-2">Trạng thái bài viết</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setStatus("published")}
                    className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      status === "published"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    <Eye size={14} />
                    <span>Hiển thị công khai</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus("hidden")}
                    className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      status === "hidden"
                        ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                        : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    <EyeOff size={14} />
                    <span>Ẩn bài viết</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  {status === "published"
                    ? "✓ Bài viết sẽ được xuất bản công khai cho khách hàng trên website và trang bộ sưu tập."
                    : "✕ Bài viết chỉ lưu nội bộ trong hệ thống Admin, ẩn hoàn toàn trên website đối với khách hàng."}
                </p>
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
                  {editingArt
                    ? "Lưu thay đổi bài viết"
                    : status === "published"
                    ? "Xuất bản bài viết"
                    : "Lưu bài viết (ở chế độ Ẩn)"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL XEM TRƯỚC BÀI VIẾT (HIỂN THỊ CẢ ẢNH & SẢN PHẨM BỘ SƯU TẬP) ── */}
      {previewArticle &&
        createPortal(
          <div
            className="fixed inset-0 z-9999 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overscroll-contain animate-in fade-in duration-200"
            onClick={(e) => {
              if (e.target === e.currentTarget) setPreviewArticle(null);
            }}
          >
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                    {previewArticle.category}
                  </span>
                  {previewArticle.collectionSlug && (
                    <span className="px-2.5 py-1 rounded text-xs font-mono font-semibold bg-amber-100 text-amber-800">
                      BST: {previewArticle.collectionSlug}
                    </span>
                  )}
                  <span className="text-xs text-slate-500">• Xem trước bài viết</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewArticle(null)}
                  className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Đóng (Esc)"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* 1. HIỂN THỊ CẢ ẢNH ĐẠI DIỆN BÀI VIẾT */}
                {previewArticle.image && (
                  <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm max-h-[380px]">
                    <img
                      src={previewArticle.image}
                      alt={previewArticle.title}
                      className="w-full h-full object-cover max-h-[380px]"
                    />
                  </div>
                )}

                <div>
                  <h1 className="text-2xl font-bold text-slate-900 mb-2 leading-snug">
                    {previewArticle.title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pb-3 border-b border-slate-200">
                    <span>Tác giả: <strong className="text-slate-700">{previewArticle.author}</strong></span>
                    <span>•</span>
                    <span>Ngày đăng: {previewArticle.createdAt}</span>
                    <span>•</span>
                    <span>{previewArticle.views} lượt xem</span>
                  </div>
                </div>

                {previewArticle.summary && (
                  <div className="p-3 bg-amber-50/80 border-l-4 border-amber-600 rounded text-slate-700 text-xs italic leading-relaxed">
                    {previewArticle.summary}
                  </div>
                )}

                {/* 2. NỘI DUNG TIPTAP VỚI ĐẦY ĐỦ CÁC HÌNH ẢNH TRONG BÀI */}
                <div
                  className="prose prose-sm max-w-none text-slate-800 leading-relaxed border-t border-slate-100 pt-4"
                  dangerouslySetInnerHTML={{ __html: previewArticle.content }}
                />

                {/* 3. CẢ CÁC SẢN PHẨM TRONG BỘ SƯU TẬP NẾU CÓ */}
                {(() => {
                  const linkedProducts = getLinkedProducts(previewArticle.collectionSlug);
                  if (linkedProducts.length === 0) return null;
                  return (
                    <div className="mt-8 pt-6 border-t border-slate-200">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                          <Sparkles size={15} className="text-amber-600" />
                          Sản phẩm trong Bộ sưu tập "{previewArticle.collectionSlug}" ({linkedProducts.length})
                        </h4>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {linkedProducts.slice(0, 4).map((p) => (
                          <div
                            key={p.id}
                            className="border border-slate-200 rounded-lg p-2.5 bg-slate-50/50 flex flex-col justify-between"
                          >
                            <img
                              src={p.image}
                              alt={p.name}
                              className="w-full h-24 object-cover rounded mb-2"
                            />
                            <div>
                              <p className="text-xs font-semibold text-slate-800 line-clamp-1">{p.name}</p>
                              <p className="text-[11px] font-bold text-amber-700 mt-0.5">
                                {Number(p.price).toLocaleString("vi-VN")} ₫
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="flex items-center justify-end px-6 py-3 border-t border-slate-100 bg-slate-50 shrink-0">
                <button
                  type="button"
                  onClick={() => setPreviewArticle(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  Đóng xem trước
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
