import type { CategoryItem, BackendCategoryResponse } from "../types/catalog";
import { PRODUCT_GROUPS } from "../util/CONSTRAINT";
import { productService } from "./productService";
import { ENDPOINTS } from "./apiEndpoints";

// Cache in-memory để giảm thiểu requests trùng lặp
let cachedCategories: CategoryItem[] | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 60 * 1000; // 1 phút

export const categoryService = {
  /**
   * Lấy toàn bộ danh mục sản phẩm từ backend hoặc fallback thông minh
   */
  async getCategories(): Promise<CategoryItem[]> {
    const now = Date.now();
    if (cachedCategories && now - lastFetchTime < CACHE_TTL) {
      return cachedCategories;
    }

    try {
      // 1. Thử gọi API danh mục công khai
      const response = await fetch(ENDPOINTS.CATEGORIES.BASE, {
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        const data: BackendCategoryResponse[] = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          const items = this.transformApiCategories(data);
          cachedCategories = items;
          lastFetchTime = now;
          return items;
        }
      }
    } catch {
      // Bỏ qua lỗi
    }

    try {
      // 2. Thử gọi API admin danh mục
      const adminRes = await fetch(ENDPOINTS.ADMIN.CATALOG.CATEGORIES, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (adminRes.ok) {
        const data: BackendCategoryResponse[] = await adminRes.json();
        if (Array.isArray(data) && data.length > 0) {
          const items = this.transformApiCategories(data);
          cachedCategories = items;
          lastFetchTime = now;
          return items;
        }
      }
    } catch {
      // Bỏ qua lỗi
    }

    // 3. Khám phá danh mục động từ các sản phẩm đang có trong database backend
    try {
      const products = await productService.getProducts({ size: 100 });
      if (products.length > 0) {
        const categoryMap = new Map<string, { count: number; sampleImage: string }>();

        for (const p of products) {
          if (p.category) {
            const existing = categoryMap.get(p.category) || { count: 0, sampleImage: p.image };
            existing.count += 1;
            categoryMap.set(p.category, existing);
          }
        }

        if (categoryMap.size > 0) {
          const dynamicCategories: CategoryItem[] = Array.from(categoryMap.entries()).map(
            ([name, info], index) => {
              const slug = name
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/đ/g, "d")
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "");

              // Tìm xem có trong PRODUCT_GROUPS không để lấy subitems
              const matchedGroup = PRODUCT_GROUPS.find(
                (g) => g.title.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(g.title.toLowerCase())
              );

              return {
                id: index + 1,
                name,
                slug,
                description: `Các sản phẩm thuộc danh mục ${name}`,
                imageUrl: info.sampleImage,
                productCount: info.count,
                to: `/danh-muc/${slug}`,
                items: matchedGroup?.items,
              };
            }
          );

          cachedCategories = dynamicCategories;
          lastFetchTime = now;
          return dynamicCategories;
        }
      }
    } catch {
      // Bỏ qua lỗi
    }

    // 4. Fallback mặc định về PRODUCT_GROUPS chuẩn
    const fallback = PRODUCT_GROUPS.map((g, idx) => ({
      id: idx + 1,
      name: g.title,
      slug: g.to.replace("/danh-muc/", ""),
      description: `Khám phá các sản phẩm ${g.title} cao cấp`,
      imageUrl: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80",
      to: g.to,
      items: g.items,
    }));

    cachedCategories = fallback;
    lastFetchTime = now;
    return fallback;
  },

  /**
   * Biến đổi danh mục backend thành format chuẩn CategoryItem[]
   */
  transformApiCategories(raw: BackendCategoryResponse[]): CategoryItem[] {
    const activeOnes = raw.filter((c) => c.isActive !== false);

    return activeOnes.map((cat) => {
      const slug = cat.slug || cat.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/[^a-z0-9]+/g, "-");

      const matchedGroup = PRODUCT_GROUPS.find(
        (g) => g.title.toLowerCase().includes(cat.name.toLowerCase()) || cat.name.toLowerCase().includes(g.title.toLowerCase())
      );

      return {
        id: cat.id,
        name: cat.name,
        slug,
        parentId: cat.parentId,
        description: cat.description || undefined,
        imageUrl: cat.imageUrl || undefined,
        to: `/danh-muc/${slug}`,
        items: matchedGroup?.items,
      };
    });
  },

  /**
   * Lấy chi tiết danh mục theo slug
   */
  async getCategoryBySlug(slug: string): Promise<CategoryItem | undefined> {
    const list = await this.getCategories();
    return list.find((c) => c.slug === slug || c.to.endsWith(`/${slug}`));
  },
};
