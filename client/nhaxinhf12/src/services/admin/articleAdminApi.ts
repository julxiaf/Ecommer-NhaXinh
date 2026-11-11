/**
 * articleAdminApi.ts
 * API quản trị bài viết, tin tức, cẩm nang và bộ sưu tập dành riêng cho Admin.
 */

import { ENDPOINTS } from "../apiEndpoints";
import { apiClient } from "../apiClient";
import type { AdminArticle } from "./types";

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

export function mapToAdminArticle(raw: ArticleBackendItem): AdminArticle {
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

export interface AdminArticleQueryParams {
  category?: string;
  collectionSlug?: string;
  isDeleted?: boolean;
  status?: string;
  search?: string;
}

export const articleAdminApi = {
  /**
   * Lấy danh sách bài viết dành cho Admin (bao gồm cả trạng thái bản nháp & thùng rác)
   */
  async getAdminArticles(params?: AdminArticleQueryParams): Promise<AdminArticle[]> {
    try {
      const list = await apiClient.get<ArticleBackendItem[]>(ENDPOINTS.ADMIN.ARTICLES.BASE, {
        params: params as Record<string, unknown>,
      });
      return (list || []).map(mapToAdminArticle);
    } catch (err) {
      console.warn("[articleAdminApi] Lỗi khi lấy danh sách bài viết Admin:", err);
      return [];
    }
  },

  /**
   * Tạo bài viết mới
   */
  async createArticle(art: Partial<AdminArticle>): Promise<AdminArticle | null> {
    try {
      const created = await apiClient.post<ArticleBackendItem>(
        ENDPOINTS.ADMIN.ARTICLES.BASE,
        {
          title: art.title,
          slug: art.slug,
          category: art.category,
          collectionSlug: art.collectionSlug,
          author: art.author,
          status: art.status || "published",
          image: art.image,
          summary: art.summary,
          content: art.content,
        }
      );
      return mapToAdminArticle(created);
    } catch (err) {
      console.error("[articleAdminApi] Lỗi tạo bài viết:", err);
      throw err;
    }
  },

  /**
   * Cập nhật thông tin bài viết
   */
  async updateArticle(id: string | number, art: Partial<AdminArticle>): Promise<AdminArticle | null> {
    try {
      const updated = await apiClient.put<ArticleBackendItem>(
        ENDPOINTS.ADMIN.ARTICLES.BY_ID(id),
        {
          title: art.title,
          slug: art.slug,
          category: art.category,
          collectionSlug: art.collectionSlug,
          author: art.author,
          status: art.status || "published",
          image: art.image,
          summary: art.summary,
          content: art.content,
        }
      );
      return mapToAdminArticle(updated);
    } catch (err) {
      console.error("[articleAdminApi] Lỗi cập nhật bài viết:", err);
      throw err;
    }
  },

  /**
   * Cập nhật trạng thái bài viết (published / hidden)
   */
  async toggleArticleStatus(id: string | number, status?: "published" | "hidden"): Promise<AdminArticle | null> {
    try {
      const updated = await apiClient.patch<ArticleBackendItem>(
        ENDPOINTS.ADMIN.ARTICLES.STATUS(id),
        undefined,
        { params: status ? { status } : undefined }
      );
      return mapToAdminArticle(updated);
    } catch (err) {
      console.error("[articleAdminApi] Lỗi thay đổi trạng thái bài viết:", err);
      throw err;
    }
  },

  /**
   * Xóa mềm bài viết
   */
  async deleteArticle(id: string | number): Promise<boolean> {
    try {
      await apiClient.delete(ENDPOINTS.ADMIN.ARTICLES.BY_ID(id));
      return true;
    } catch (err) {
      console.error("[articleAdminApi] Lỗi xóa bài viết:", err);
      return false;
    }
  },

  /**
   * Khôi phục bài viết từ thùng rác
   */
  async restoreArticle(id: string | number): Promise<boolean> {
    try {
      await apiClient.patch(ENDPOINTS.ADMIN.ARTICLES.RESTORE(id));
      return true;
    } catch (err) {
      console.error("[articleAdminApi] Lỗi khôi phục bài viết:", err);
      return false;
    }
  },

  /**
   * Xóa vĩnh viễn bài viết
   */
  async permanentDeleteArticle(id: string | number): Promise<boolean> {
    try {
      await apiClient.delete(ENDPOINTS.ADMIN.ARTICLES.PERMANENT(id));
      return true;
    } catch (err) {
      console.error("[articleAdminApi] Lỗi xóa vĩnh viễn bài viết:", err);
      return false;
    }
  },

  /**
   * Upload hình ảnh bài viết
   */
  async uploadArticleImage(file: File): Promise<string> {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await apiClient.post<{ url?: string }>(ENDPOINTS.ARTICLES.UPLOAD_IMAGE, formData);
      if (res && res.url) {
        return res.url;
      }
      throw new Error("Máy chủ không trả về URL ảnh hợp lệ");
    } catch (err) {
      console.warn("[articleAdminApi] Lỗi upload ảnh lên server, fallback sang Data URL:", err);
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
      });
    }
  },
};

