import type {
  Product,
  ProductQueryParams,
  BackendProductSummary,
  BackendProductDetail,
  ProductMediaItem,
} from "../types/catalog";
import { ENDPOINTS, buildUrlWithQuery } from "./apiEndpoints";

// ══════════════════════════════════════════════════════════
// 1. SHARED CATALOG CONSTANTS & HELPERS
// ══════════════════════════════════════════════════════════

export const DEFAULT_PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80";

const COLLECTION_SLUGS = new Set([
  "bo-suu-tap",
  "orientale",
  "victoria",
  "duong-dai",
  "osaka",
  "coastal",
  "may",
]);

/**
 * Kiểm tra xem một danh mục có thuộc nhóm Bộ sưu tập (Collection) hay không.
 * Dùng chung cho cả Client (`productService`) và Admin (`catalogApi`, `adminService`).
 */
export function isCollectionCategory(
  cat?: {
    slug?: string | null;
    name?: string | null;
    categoryGroup?: string | null;
    parentId?: string | number | null;
    isCollection?: boolean;
  } | null,
): boolean {
  if (!cat) return false;
  if (cat.isCollection || cat.categoryGroup === "COLLECTION") return true;

  const parentIdStr = cat.parentId != null ? String(cat.parentId) : "";
  if (parentIdStr === "15" || parentIdStr === "cat-collections") return true;

  const slug = (cat.slug || "").toLowerCase().trim();
  const name = (cat.name || "").toLowerCase().trim();

  return (
    COLLECTION_SLUGS.has(slug) ||
    slug.startsWith("bst-") ||
    slug.includes("bo-suu-tap") ||
    name.includes("bộ sưu tập")
  );
}

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

// ══════════════════════════════════════════════════════════
// 2. INTERNAL HTTP HELPER (Hỗ trợ tự động retry khi 502/503/504)
// ══════════════════════════════════════════════════════════

const TRANSIENT_GATEWAY_STATUSES = new Set([502, 503, 504]);

async function fetchJson<T>(
  url: string,
  options: RequestInit = {},
  retries = 1,
): Promise<T | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(options.headers as Record<string, string>),
        },
      });

      if (TRANSIENT_GATEWAY_STATUSES.has(response.status) && attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
        continue;
      }

      if (!response.ok) {
        return null;
      }

      return (await response.json()) as T;
    } catch (err) {
      if (options.signal?.aborted) {
        return null;
      }
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
        continue;
      }
      console.warn(`[productService] Fetch error on ${url}:`, err);
      return null;
    }
  }
  return null;
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
// 3. BACKEND DTO -> FRONTEND MODEL MAPPERS
// ══════════════════════════════════════════════════════════

function mapSummaryToProduct(summary: BackendProductSummary): Product {
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

function mapDetailToProduct(detail: BackendProductDetail): Product {
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
// 4. PUBLIC PRODUCT SERVICE
// ══════════════════════════════════════════════════════════

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

    const url = buildUrlWithQuery(ENDPOINTS.PRODUCTS.SEARCH, { keyword: term, size: 6 });
    const data = await fetchJson<
      BackendProductSummary[] | { content?: BackendProductSummary[] }
    >(url, { signal }, 0);

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
  },

  /**
   * Lấy danh sách sản phẩm từ API backend (hỗ trợ phân trang, lọc, sắp xếp)
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

    const finalUrl = buildUrlWithQuery(baseUrl, queryParams);
    const data = await fetchJson<
      BackendProductSummary[] | { content?: BackendProductSummary[] }
    >(finalUrl);

    let products = extractSummaryContent(data).map(mapSummaryToProduct);

    if (params?.category) {
      const catLower = params.category.toLowerCase();
      products = products.filter((p) => p.category.toLowerCase().includes(catLower));
    }

    return products;
  },

  /**
   * Alias: Lấy danh sách sản phẩm thuần API
   */
  async getProductsFromApi(params?: ProductQueryParams): Promise<Product[]> {
    return this.getProducts(params);
  },

  /**
   * Lấy chi tiết sản phẩm theo slug
   */
  async getProductBySlug(slug: string): Promise<Product | null> {
    const detail = await fetchJson<BackendProductDetail>(ENDPOINTS.PRODUCTS.BY_SLUG(slug));
    if (detail) {
      return mapDetailToProduct(detail);
    }

    const allProducts = await this.getProducts({ size: 100 });
    return allProducts.find((p) => p.slug === slug) ?? null;
  },

  /**
   * Lấy chi tiết sản phẩm theo ID
   */
  async getDetailProduct(id: number): Promise<Product | null> {
    const detail = await fetchJson<BackendProductDetail>(ENDPOINTS.PRODUCTS.BY_ID(id));
    if (detail) {
      return mapDetailToProduct(detail);
    }

    const allProducts = await this.getProducts({ size: 100 });
    return allProducts.find((p) => p.id === id) ?? null;
  },

  /**
   * Tìm kiếm sản phẩm theo từ khóa
   */
  async searchProducts(keyword: string): Promise<Product[]> {
    return this.getProducts({ keyword });
  },

  /**
   * Lấy danh sách sản phẩm theo danh mục ID
   */
  async getProductsByCategory(categoryId: number): Promise<Product[]> {
    return this.getProducts({ categoryId });
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
    const url = buildUrlWithQuery(
      ENDPOINTS.PRODUCTS.MEDIA(productIdOrSlug),
      type ? { type } : undefined,
    );
    const data = await fetchJson<ProductMediaItem[]>(url);
    return Array.isArray(data) ? data : [];
  },

  /**
   * Lấy toàn bộ ảnh (IMAGE) của sản phẩm theo id hoặc slug
   */
  async getProductImages(productIdOrSlug: number | string): Promise<ProductMediaItem[]> {
    const data = await fetchJson<ProductMediaItem[]>(ENDPOINTS.PRODUCTS.IMAGES(productIdOrSlug));
    return Array.isArray(data) ? data : [];
  },

  /**
   * Danh sách sản phẩm nổi bật
   */
  async getFeaturedProducts(limit = 8): Promise<Product[]> {
    const url = buildUrlWithQuery(ENDPOINTS.PRODUCTS.FEATURED, { limit });
    const list = await fetchJson<BackendProductSummary[]>(url);
    if (Array.isArray(list) && list.length > 0) {
      return list.map(mapSummaryToProduct);
    }

    const prods = await this.getProducts({ size: limit });
    return prods.slice(0, limit);
  },
};
