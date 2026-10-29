import { useEffect } from "react";
import { createPortal } from "react-dom";
import { FileText, Plus, Trash2, Edit, Eye, Search } from "lucide-react";
import type { AdminArticle, RoleDefinition } from "../../../services/admin/types";
import PermissionGate from "../../../components/admin/PermissionGate";
import { AdminPagination } from "../../../components/admin/AdminPagination";
import { useAdminArticles } from "../../../hooks/admin/useAdminArticles";

interface ArticleViewProps {
  articles: AdminArticle[];
  currentRole: RoleDefinition;
  onSaveArticle: (art: Partial<AdminArticle>) => void;
  onDeleteArticle: (id: string) => void;
}

export default function ArticleView({
  articles,
  currentRole,
  onSaveArticle,
  onDeleteArticle,
}: ArticleViewProps) {
  const {
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    pagination,
    showModal,
    setShowModal,
    editingArt,
    title,
    setTitle,
    category,
    setCategory,
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
            <FileText className="text-blue-600" size={24} />
            Quản lý Bài viết & Cẩm nang
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Đăng tải mẹo trang trí, xu hướng thiết kế và tin tức nội thất
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
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
            <option value="Góc cảm hứng">Góc cảm hứng</option>
            <option value="Xu hướng nội thất">Xu hướng nội thất</option>
            <option value="Cẩm nang bảo quản">Cẩm nang bảo quản</option>
            <option value="Tin tức">Tin tức</option>
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
              className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="h-44 w-full overflow-hidden relative">
                  <img src={art.image} alt={art.title} className="w-full h-full object-cover" />
                  <span className="absolute top-2.5 left-2.5 bg-blue-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-md shadow-sm">
                    {art.category}
                  </span>
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
                <div className="flex items-center gap-1">
                  <PermissionGate permission="articles.edit" currentRole={currentRole}>
                    <button
                      onClick={() => openEdit(art)}
                      className="p-1 text-slate-600 hover:text-blue-600 rounded"
                      title="Sửa"
                    >
                      <Edit size={14} />
                    </button>
                  </PermissionGate>
                  <PermissionGate permission="articles.delete" currentRole={currentRole}>
                    <button
                      onClick={() => onDeleteArticle(art.id)}
                      className="p-1 text-slate-600 hover:text-rose-600 rounded"
                      title="Xóa"
                    >
                      <Trash2 size={14} />
                    </button>
                  </PermissionGate>
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
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
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
                  ✕
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
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Chuyên mục</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as AdminArticle["category"])}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  >
                    <option value="Góc cảm hứng">Góc cảm hứng</option>
                    <option value="Xu hướng nội thất">Xu hướng nội thất</option>
                    <option value="Cẩm nang bảo quản">Cẩm nang bảo quản</option>
                    <option value="Tin tức">Tin tức</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Link ảnh cover</label>
                  <input
                    type="url"
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Tóm tắt ngắn (Lead)</label>
                <textarea
                  rows={2}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Nội dung chi tiết (HTML / Markdown)</label>
                <textarea
                  rows={6}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-all"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 shadow-xs transition-all"
                >
                  Xuất bản bài viết
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
