import type { AdminArticle } from "./admin/types";
import { ENDPOINTS, buildUrlWithQuery } from "./apiEndpoints";

export interface ArticleBackendItem {
  id: number | string;
  title: string;
  slug: string;
  category: string;
  collectionSlug?: string;
  author: string;
  views: number;
  status: string;
  image: string;
  summary: string;
  content: string;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

function mapToAdminArticle(raw: ArticleBackendItem): AdminArticle {
  let formattedDate = "Vừa xong";
  if (raw.createdAt) {
    try {
      const d = new Date(raw.createdAt);
      formattedDate = !isNaN(d.getTime())
        ? d.toLocaleDateString("vi-VN")
        : String(raw.createdAt);
    } catch {
      formattedDate = String(raw.createdAt);
    }
  }

  return {
    id: String(raw.id),
    title: raw.title || "",
    slug: raw.slug || "",
    category: raw.category || "Góc cảm hứng",
    collectionSlug: raw.collectionSlug || undefined,
    author: raw.author || "Ban Biên Tập Nhà Xinh",
    views: Number(raw.views) || 0,
    createdAt: formattedDate,
    status: (raw.status as any) || "published",
    image:
      raw.image ||
      "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=600&q=80",
    summary: raw.summary || "",
    content: raw.content || "",
    isDeleted: Boolean(raw.isDeleted),
  };
}

export const articleService = {
  /**
   * Lấy danh sách bài viết công khai (kèm lọc theo chuyên mục, bộ sưu tập, tìm kiếm)
   */
  async getPublicArticles(params?: {
    category?: string;
    collectionSlug?: string;
    search?: string;
  }): Promise<AdminArticle[]> {
    try {
      const url = buildUrlWithQuery(ENDPOINTS.ARTICLES.BASE, params);
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) return [];
      const list: ArticleBackendItem[] = await res.json();
      return (list || []).map(mapToAdminArticle);
    } catch (err) {
      console.warn("[articleService] Lỗi khi lấy danh sách bài viết công khai:", err);
      return [];
    }
  },

  /**
   * Lấy bài viết thuộc về 1 bộ sưu tập cụ thể từ Server
   */
  async getArticlesByCollection(collectionSlug: string): Promise<AdminArticle[]> {
    try {
      const url = ENDPOINTS.ARTICLES.COLLECTION(collectionSlug);
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) return [];
      const list: ArticleBackendItem[] = await res.json();
      return (list || []).map(mapToAdminArticle);
    } catch (err) {
      console.warn("[articleService] Lỗi khi lấy bài viết bộ sưu tập:", err);
      return [];
    }
  },

  /**
   * Lấy chi tiết 1 bài viết theo ID hoặc Slug
   */
  async getArticleDetail(idOrSlug: string | number): Promise<AdminArticle | null> {
    try {
      const url = ENDPOINTS.ARTICLES.BY_ID_OR_SLUG(idOrSlug);
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) return null;
      const data: ArticleBackendItem = await res.json();
      return mapToAdminArticle(data);
    } catch (err) {
      console.warn("[articleService] Lỗi khi lấy chi tiết bài viết:", err);
      return null;
    }
  },

  /**
   * Lấy danh sách bài viết dành cho Admin (bao gồm cả thùng rác)
   */
  async getAdminArticles(params?: {
    category?: string;
    collectionSlug?: string;
    isDeleted?: boolean;
    status?: string;
    search?: string;
  }): Promise<AdminArticle[]> {
    try {
      const url = buildUrlWithQuery(ENDPOINTS.ADMIN.ARTICLES.BASE, params);
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) return [];
      const list: ArticleBackendItem[] = await res.json();
      return (list || []).map(mapToAdminArticle);
    } catch (err) {
      console.warn("[articleService] Lỗi khi lấy bài viết Admin:", err);
      return [];
    }
  },

  /**
   * Tạo bài viết mới trên server
   */
  async createArticle(art: Partial<AdminArticle>): Promise<AdminArticle | null> {
    try {
      const res = await fetch(ENDPOINTS.ADMIN.ARTICLES.BASE, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: art.title,
          slug: art.slug,
          category: art.category,
          collectionSlug: art.collectionSlug,
          author: art.author,
          status: art.status || "published",
          image: art.image,
          summary: art.summary,
          content: art.content,
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.message || "Không thể tạo bài viết");
      }

      const created: ArticleBackendItem = await res.json();
      return mapToAdminArticle(created);
    } catch (err: any) {
      console.error("[articleService] Lỗi tạo bài viết:", err);
      throw err;
    }
  },

  /**
   * Cập nhật bài viết trên server
   */
  async updateArticle(id: string | number, art: Partial<AdminArticle>): Promise<AdminArticle | null> {
    try {
      const res = await fetch(ENDPOINTS.ADMIN.ARTICLES.BY_ID(id), {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: art.title,
          slug: art.slug,
          category: art.category,
          collectionSlug: art.collectionSlug,
          author: art.author,
          status: art.status || "published",
          image: art.image,
          summary: art.summary,
          content: art.content,
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.message || "Không thể cập nhật bài viết");
      }

      const updated: ArticleBackendItem = await res.json();
      return mapToAdminArticle(updated);
    } catch (err: any) {
      console.error("[articleService] Lỗi cập nhật bài viết:", err);
      throw err;
    }
  },

  /**
   * Thay đổi trạng thái hiển thị (published / hidden) của bài viết
   */
  async toggleArticleStatus(id: string | number, status?: "published" | "hidden"): Promise<AdminArticle | null> {
    try {
      const url = buildUrlWithQuery(ENDPOINTS.ADMIN.ARTICLES.STATUS(id), status ? { status } : undefined);
      const res = await fetch(url, {
        method: "PATCH",
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Không thể cập nhật trạng thái bài viết");
      }
      const data: ArticleBackendItem = await res.json();
      return mapToAdminArticle(data);
    } catch (err: any) {
      console.error("[articleService] Lỗi cập nhật trạng thái bài viết:", err);
      throw err;
    }
  },

  /**
   * Xóa mềm bài viết (đưa vào thùng rác)
   */
  async deleteArticle(id: string | number): Promise<boolean> {
    try {
      const res = await fetch(ENDPOINTS.ADMIN.ARTICLES.BY_ID(id), {
        method: "DELETE",
        credentials: "include",
      });
      return res.ok;
    } catch (err) {
      console.error("[articleService] Lỗi xóa bài viết:", err);
      return false;
    }
  },

  /**
   * Khôi phục bài viết từ thùng rác
   */
  async restoreArticle(id: string | number): Promise<boolean> {
    try {
      const res = await fetch(ENDPOINTS.ADMIN.ARTICLES.RESTORE(id), {
        method: "PATCH",
        credentials: "include",
      });
      return res.ok;
    } catch (err) {
      console.error("[articleService] Lỗi khôi phục bài viết:", err);
      return false;
    }
  },

  /**
   * Xóa vĩnh viễn bài viết khỏi cơ sở dữ liệu
   */
  async permanentDeleteArticle(id: string | number): Promise<boolean> {
    try {
      const res = await fetch(ENDPOINTS.ADMIN.ARTICLES.PERMANENT(id), {
        method: "DELETE",
        credentials: "include",
      });
      return res.ok;
    } catch (err) {
      console.error("[articleService] Lỗi xóa vĩnh viễn bài viết:", err);
      return false;
    }
  },

  /**
   * Tải ảnh bài viết lên máy chủ (kèm fallback sang Base64 Data URL nếu server offline)
   */
  async uploadArticleImage(file: File): Promise<string> {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(ENDPOINTS.ARTICLES.UPLOAD_IMAGE, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.url) {
          return data.url;
        }
      }
      throw new Error("Máy chủ không trả về URL ảnh");
    } catch (err) {
      console.warn("[articleService] Lỗi upload ảnh lên server, tự động fallback sang Data URL:", err);
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
      });
    }
  },
};

