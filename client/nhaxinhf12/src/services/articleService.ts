/**
 * articleService.ts
 * Service công khai (Client) phục vụ hiển thị bài viết, tin tức, cẩm nang và bài viết bộ sưu tập.
 * Tích hợp apiClient trung tâm và phân tách rõ ràng với articleAdminApi (Admin).
 */

import type { AdminArticle } from "./admin/types";
import { ENDPOINTS } from "./apiEndpoints";
import { apiClient } from "./apiClient";
import {
  articleAdminApi,
  mapToAdminArticle,
  type ArticleBackendItem,
  type AdminArticleQueryParams,
} from "./admin/articleAdminApi";

export { mapToAdminArticle, type ArticleBackendItem, type AdminArticleQueryParams };

export interface PublicArticleQueryParams {
  category?: string;
  collectionSlug?: string;
  search?: string;
}

export const articleService = {
  // ───────────────────────────────────────────────
  // 1. CLIENT PUBLIC METHODS
  // ───────────────────────────────────────────────

  /**
   * Lấy danh sách bài viết công khai (kèm bộ lọc linh hoạt: chuyên mục, bộ sưu tập, tìm kiếm)
   */
  async getPublicArticles(params?: PublicArticleQueryParams): Promise<AdminArticle[]> {
    try {
      const list = await apiClient.get<ArticleBackendItem[]>(ENDPOINTS.ARTICLES.BASE, {
        params: params as Record<string, unknown>,
      });
      return (list || []).map(mapToAdminArticle);
    } catch (err) {
      console.warn("[articleService] Lỗi khi lấy danh sách bài viết công khai:", err);
      return [];
    }
  },

  /**
   * Lấy danh sách bài viết thuộc về 1 bộ sưu tập cụ thể
   */
  async getArticlesByCollection(collectionSlug: string): Promise<AdminArticle[]> {
    try {
      const list = await apiClient.get<ArticleBackendItem[]>(
        ENDPOINTS.ARTICLES.COLLECTION(collectionSlug)
      );
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
      const data = await apiClient.get<ArticleBackendItem>(
        ENDPOINTS.ARTICLES.BY_ID_OR_SLUG(idOrSlug)
      );
      return data ? mapToAdminArticle(data) : null;
    } catch (err) {
      console.warn("[articleService] Lỗi khi lấy chi tiết bài viết:", err);
      return null;
    }
  },

  // ───────────────────────────────────────────────
  // 2. ADMIN DELEGATION METHODS (Giữ 100% tương thích ngược)
  // ───────────────────────────────────────────────
  getAdminArticles: articleAdminApi.getAdminArticles.bind(articleAdminApi),
  createArticle: articleAdminApi.createArticle.bind(articleAdminApi),
  updateArticle: articleAdminApi.updateArticle.bind(articleAdminApi),
  toggleArticleStatus: articleAdminApi.toggleArticleStatus.bind(articleAdminApi),
  deleteArticle: articleAdminApi.deleteArticle.bind(articleAdminApi),
  restoreArticle: articleAdminApi.restoreArticle.bind(articleAdminApi),
  permanentDeleteArticle: articleAdminApi.permanentDeleteArticle.bind(articleAdminApi),
  uploadArticleImage: articleAdminApi.uploadArticleImage.bind(articleAdminApi),
};
