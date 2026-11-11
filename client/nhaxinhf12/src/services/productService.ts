/**
 * productService.ts
 * Service công khai (Client) phục vụ truy vấn sản phẩm, bộ lọc, tìm kiếm và chi tiết sản phẩm.
 * Sử dụng apiClient chung để chuẩn hóa các yêu cầu HTTP và xử lý lỗi.
 */

import type {
  Product,
  ProductQueryParams,
  BackendProductSummary,
  BackendProductDetail,
  ProductMediaItem,
} from "../types/catalog";
import { ENDPOINTS } from "./apiEndpoints";
import { apiClient } from "./apiClient";
import { isCollectionCategory } from "./categoryService";

// Re-export để tương thích ngược với các file đã import từ productService
export { isCollectionCategory };

// ══════════════════════════════════════════════════════════
// 1. SHARED PRODUCT CONSTANTS & HELPERS
// ══════════════════════════════════════════════════════════

export const DEFAULT_PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80";

/**
 * Chuẩn hóa đường dẫn ảnh sản phẩm (trả về `{ img1, img2 }` tương thích với toàn bộ UI Client & Admin).
 */
export function resolveProductImage(
  url?: string | null,
  _name = "",
  _category = "",
): { img1: string; img2?: string } {
  const trimmed = url?.trim();
  if (!trimmed) {
    return { img1: DEFAULT_PLACEHOLDER_IMAGE };
  }
  return { img1: trimmed };
}

function computeDiscount(price: number, originalPrice?: number): number | undefined {
  if (originalPrice && originalPrice > price && originalPrice > 0) {
    return Math.round(((originalPrice - price) / originalPrice) * 100);
  }
  return undefined;
}

function extractSummaryContent(
  data: BackendProductSummary[] | { content?: BackendProductSummary[] } | null,
): BackendProductSummary[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.content)) return data.content;
  return [];
}

// ══════════════════════════════════════════════════════════
// 2. BACKEND DTO -> FRONTEND MODEL MAPPERS
// ══════════════════════════════════════════════════════════

export function mapSummaryToProduct(summary: BackendProductSummary): Product {
  const price = summary.minPrice ? Number(summary.minPrice) : Number(summary.price || 0);
  const originalPrice = summary.compareAtPrice
    ? Number(summary.compareAtPrice)
    : summary.originalPrice
      ? Number(summary.originalPrice)
      : undefined;

  const discount = summary.discount ?? computeDiscount(price, originalPrice);
  const images = resolveProductImage(
    summary.image || summary.thumbnailUrl,
    summary.name,
    summary.category || "",
  );
  const totalStock =
    summary.totalStock !== undefined && summary.totalStock !== null
      ? Number(summary.totalStock)
      : 0;
  const isPreorder = Boolean(summary.isPreorder) || summary.stockStatus === "PRE_ORDER";

  return {
    id: summary.id,
    name: summary.name,
    slug: summary.slug,
    price,
    originalPrice,
    discount,
    image: images.img1,
    image2: summary.image2 || images.img2,
    category: summary.category || "Nội thất",
    brand: summary.brand || "Nhà Xinh",
    isNew: discount === undefined || discount === 0,
    rating: 4.8,
    shortDescription: summary.shortDescription || undefined,
    totalStock,
    inStock: summary.inStock ?? totalStock > 0,
    isPreorder,
    stockStatus:
      summary.stockStatus ||
      (isPreorder ? "PRE_ORDER" : totalStock > 0 ? "IN_STOCK" : "OUT_OF_STOCK"),
    variantId: summary.defaultVariantId ? Number(summary.defaultVariantId) : undefined,
  };
}

export function mapDetailToProduct(detail: BackendProductDetail): Product {
  const primaryMedia = detail.media?.find((m) => m.isPrimary) || detail.media?.[0];
  const secondaryMedia =
    detail.media?.find((m) => !m.isPrimary && (m.mediaType === "IMAGE" || !m.mediaType)) ||
    detail.media?.[1];

  let minPrice = 0;
  let maxComparePrice: number | undefined;

  if (detail.variants && detail.variants.length > 0) {
    minPrice = Math.min(...detail.variants.map((v) => Number(v.price || 0)));
    const comp = detail.variants.find((v) => v.compareAtPrice)?.compareAtPrice;
    if (comp) maxComparePrice = Number(comp);
  }

  const realCategory =
    detail.categories?.find((c) => !isCollectionCategory(c)) || detail.categories?.[0];
  const categoryName = realCategory?.name || "Nội thất";
  const categorySlug = realCategory?.slug;

  const images = resolveProductImage(primaryMedia?.mediaUrl, detail.name, categoryName);
  const discount = computeDiscount(minPrice, maxComparePrice);

  const mappedVariants = detail.variants?.map((v) => {
    const matchedMedia = detail.media?.find(
      (m) => m.variantId === v.id && (m.mediaType === "IMAGE" || !m.mediaType),
    );
    const variantImg = matchedMedia
      ? productService.getMediaImageUrl(matchedMedia)
      : v.image || images.img1;

    return {
      ...v,
      image: variantImg,
    };
  });

  const hasVariantPreorder = detail.variants?.some(
    (v) => Boolean(v.stock?.isPreorder) || v.stock?.stockStatus === "PRE_ORDER",
  );
  const isPreorder =
    Boolean(detail.isPreorder) ||
    detail.stockStatus === "PRE_ORDER" ||
    Boolean(hasVariantPreorder);

  return {
    id: detail.id,
    name: detail.name,
    slug: detail.slug,
    price: minPrice,
    originalPrice: maxComparePrice,
    discount,
    image: images.img1,
    image2: secondaryMedia?.mediaUrl || images.img2,
    category: categoryName,
    categorySlug,
    categoryId: realCategory?.id,
    brand: detail.brand?.name || "Nhà Xinh",
    shortDescription: detail.shortDescription || undefined,
    description: detail.description || undefined,
    specifications: detail.specifications || undefined,
    isNew: discount === undefined || discount === 0,
    rating: 4.9,
    inStock: detail.status === "ACTIVE",
    totalStock:
      detail.variants?.reduce((s, v) => s + (v.stock?.availableQuantity || 0), 0) ?? 0,
    isPreorder,
    stockStatus: detail.stockStatus || (isPreorder ? "PRE_ORDER" : "IN_STOCK"),
    variantId: mappedVariants?.[0]?.id,
    variants: mappedVariants,
    media: detail.media,
  };
}

// ══════════════════════════════════════════════════════════
// 3. PUBLIC PRODUCT SERVICE (GENERIC CONSOLIDATED METHODS)
// ══════════════════════════════════════════════════════════

const cachedFeaturedMap = new Map<number, { data: Product[]; time: number }>();
const inFlightFeaturedMap = new Map<number, Promise<Product[]>>();
const FEATURED_CACHE_TTL = 60_000;

export const productService = {
  /**
   * Lấy danh sách gợi ý tìm kiếm nhanh cho Header / Search bar
   */
  async getSearchSuggestions(
    query: string,
    signal?: AbortSignal,
  ): Promise<
    Array<{
      id: number;
      name: string;
      slug: string;
      price: number;
      image?: string;
      category?: string;
    }>
  > {
    const term = query.trim().toLowerCase();
    if (term.length < 2) return [];

    try {
      const data = await apiClient.get<BackendProductSummary[] | { content?: BackendProductSummary[] }>(
        ENDPOINTS.PRODUCTS.SEARCH,
        {
          params: { keyword: term, size: 6 },
          signal,
          retries: 0,
        }
      );

      return extractSummaryContent(data).map((item) => {
        const p = mapSummaryToProduct(item);
        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          price: p.price,
          image: p.image,
          category: p.category,
        };
      });
    } catch {
      return [];
    }
  },

  /**
   * Hàm tổng quát duy nhất (Generic/Consolidated) lấy danh sách sản phẩm:
   * Hỗ trợ tìm kiếm theo từ khóa (keyword), theo danh mục (categoryId), phân trang (page, size), sắp xếp (sort, dir).
   */
  async getProducts(params?: ProductQueryParams): Promise<Product[]> {
    let baseUrl: string = ENDPOINTS.PRODUCTS.BASE;
    const queryParams: Record<string, unknown> = {
      page: params?.page,
      size: params?.size,
      sort: params?.sort,
      dir: params?.dir,
    };

    if (params?.keyword) {
      baseUrl = ENDPOINTS.PRODUCTS.SEARCH;
      queryParams.keyword = params.keyword;
    } else if (params?.categoryId) {
      baseUrl = ENDPOINTS.PRODUCTS.BY_CATEGORY(params.categoryId);
    }

    try {
      const data = await apiClient.get<BackendProductSummary[] | { content?: BackendProductSummary[] }>(
        baseUrl,
        { params: queryParams }
      );

      let products = extractSummaryContent(data).map(mapSummaryToProduct);

      if (params?.category) {
        const catLower = params.category.toLowerCase();
        products = products.filter((p) => p.category.toLowerCase().includes(catLower));
      }

      return products;
    } catch (err) {
      console.warn("[productService] Lỗi khi lấy danh sách sản phẩm:", err);
      return [];
    }
  },

  /**
   * Helper shortcut: Lấy danh sách sản phẩm thuần API (Tương thích ngược)
   */
  async getProductsFromApi(params?: ProductQueryParams): Promise<Product[]> {
    return this.getProducts(params);
  },

  /**
   * Helper shortcut: Tìm kiếm sản phẩm theo từ khóa
   */
  async searchProducts(keyword: string): Promise<Product[]> {
    return this.getProducts({ keyword });
  },

  /**
   * Helper shortcut: Lấy danh sách sản phẩm theo danh mục ID
   */
  async getProductsByCategory(categoryId: number): Promise<Product[]> {
    return this.getProducts({ categoryId });
  },

  /**
   * Lấy chi tiết sản phẩm theo slug (kèm fallback tìm kiếm)
   */
  async getProductBySlug(slug: string): Promise<Product | null> {
    try {
      const detail = await apiClient.get<BackendProductDetail>(ENDPOINTS.PRODUCTS.BY_SLUG(slug));
      if (detail) {
        return mapDetailToProduct(detail);
      }
    } catch {
      // Fallback
    }

    const allProducts = await this.getProducts({ size: 100 });
    return allProducts.find((p) => p.slug === slug) ?? null;
  },

  /**
   * Lấy chi tiết sản phẩm theo ID (kèm fallback tìm kiếm)
   */
  async getDetailProduct(id: number): Promise<Product | null> {
    try {
      const detail = await apiClient.get<BackendProductDetail>(ENDPOINTS.PRODUCTS.BY_ID(id));
      if (detail) {
        return mapDetailToProduct(detail);
      }
    } catch {
      // Fallback
    }

    const allProducts = await this.getProducts({ size: 100 });
    return allProducts.find((p) => p.id === id) ?? null;
  },

  /**
   * Lấy URL hiển thị ảnh từ đối tượng ProductMediaItem
   */
  getMediaImageUrl(media?: { id?: number; mediaUrl?: string | null } | null): string {
    if (!media) return DEFAULT_PLACEHOLDER_IMAGE;
    if (
      media.mediaUrl &&
      (media.mediaUrl.startsWith("http://") ||
        media.mediaUrl.startsWith("https://") ||
        media.mediaUrl.startsWith("/"))
    ) {
      return media.mediaUrl;
    }
    if (media.id) {
      return ENDPOINTS.PRODUCTS.MEDIA_IMAGE(media.id);
    }
    return media.mediaUrl || DEFAULT_PLACEHOLDER_IMAGE;
  },

  /**
   * Lấy danh sách media của sản phẩm theo id hoặc slug
   */
  async getProductMedia(
    productIdOrSlug: number | string,
    type?: "IMAGE" | "VIDEO" | "MODEL_3D" | string,
  ): Promise<ProductMediaItem[]> {
    try {
      const data = await apiClient.get<ProductMediaItem[]>(
        ENDPOINTS.PRODUCTS.MEDIA(productIdOrSlug),
        { params: type ? { type } : undefined }
      );
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  /**
   * Lấy toàn bộ ảnh (IMAGE) của sản phẩm theo id hoặc slug
   */
  async getProductImages(productIdOrSlug: number | string): Promise<ProductMediaItem[]> {
    try {
      const data = await apiClient.get<ProductMediaItem[]>(
        ENDPOINTS.PRODUCTS.IMAGES(productIdOrSlug)
      );
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  /**
   * Danh sách sản phẩm nổi bật (có in-flight deduplication & in-memory TTL caching)
   */
  async getFeaturedProducts(limit = 8): Promise<Product[]> {
    const cached = cachedFeaturedMap.get(limit);
    if (cached && Date.now() - cached.time < FEATURED_CACHE_TTL && cached.data.length > 0) {
      return cached.data;
    }
    const inFlight = inFlightFeaturedMap.get(limit);
    if (inFlight) {
      return inFlight;
    }

    const promise = (async () => {
      try {
        const list = await apiClient.get<BackendProductSummary[]>(
          ENDPOINTS.PRODUCTS.FEATURED,
          { params: { limit } }
        );
        if (Array.isArray(list) && list.length > 0) {
          const mapped = list.map(mapSummaryToProduct);
          cachedFeaturedMap.set(limit, { data: mapped, time: Date.now() });
          return mapped;
        }
      } catch {
        // Fallback
      }

      const prods = await this.getProducts({ size: limit });
      const sliced = prods.slice(0, limit);
      if (sliced.length > 0) {
        cachedFeaturedMap.set(limit, { data: sliced, time: Date.now() });
      }
      return sliced;
    })().finally(() => {
      inFlightFeaturedMap.delete(limit);
    });

    inFlightFeaturedMap.set(limit, promise);
    return promise;
  },
};
