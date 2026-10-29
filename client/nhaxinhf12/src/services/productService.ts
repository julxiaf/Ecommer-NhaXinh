import type {
  Product,
  ProductQueryParams,
  BackendProductSummary,
  BackendProductDetail,
  ProductMediaItem,
} from "../types/catalog";
import { ENDPOINTS, buildUrlWithQuery } from "./apiEndpoints";

// Bộ ảnh chất lượng cao dự phòng hiển thị UI khi sản phẩm chưa được gán media
const CATEGORY_FALLBACK_IMAGES: Record<string, { img1: string; img2?: string }> = {
  sofa: {
    img1: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80",
    img2: "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=800&q=80",
  },
  "bàn ăn": {
    img1: "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=800&q=80",
    img2: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=800&q=80",
  },
  "bàn trà": {
    img1: "https://images.unsplash.com/photo-1532372576444-dda954194ad0?auto=format&fit=crop&w=800&q=80",
  },
  "bàn làm việc": {
    img1: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=800&q=80",
  },
  bàn: {
    img1: "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=800&q=80",
  },
  ghế: {
    img1: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=800&q=80",
    img2: "https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=800&q=80",
  },
  "ghế ăn": {
    img1: "https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=800&q=80",
  },
  "giường ngủ": {
    img1: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80",
    img2: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80",
  },
  "tủ quần áo": {
    img1: "https://images.unsplash.com/photo-1558997519-83ea9252edf8?auto=format&fit=crop&w=800&q=80",
  },
  "kệ tivi": {
    img1: "https://images.unsplash.com/photo-1600210491892-03d54c0aaf87?auto=format&fit=crop&w=800&q=80",
  },
  "tủ & kệ": {
    img1: "https://images.unsplash.com/photo-1600210491892-03d54c0aaf87?auto=format&fit=crop&w=800&q=80",
  },
  "phòng ăn": {
    img1: "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=800&q=80",
  },
  "phòng làm việc": {
    img1: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=800&q=80",
  },
};

function resolveProductImage(url?: string | null, name = "", category = ""): { img1: string; img2?: string } {
  const normCat = category.toLowerCase().trim();
  const normName = name.toLowerCase().trim();

  let fallback = CATEGORY_FALLBACK_IMAGES[normCat];
  if (!fallback) {
    for (const [key, val] of Object.entries(CATEGORY_FALLBACK_IMAGES)) {
      if (normCat.includes(key) || normName.includes(key)) {
        fallback = val;
        break;
      }
    }
  }
  if (!fallback) {
    fallback = {
      img1: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80",
    };
  }

  if (!url || url.trim() === "") {
    return fallback;
  }

  return {
    img1: url,
    img2: fallback.img2,
  };
}

function mapSummaryToProduct(summary: BackendProductSummary): Product {
  const price = summary.minPrice ? Number(summary.minPrice) : Number(summary.price || 0);
  const originalPrice = summary.compareAtPrice
    ? Number(summary.compareAtPrice)
    : summary.originalPrice
    ? Number(summary.originalPrice)
    : undefined;

  const discount =
    summary.discount ??
    (originalPrice && originalPrice > price
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : undefined);

  const images = resolveProductImage(
    summary.image || summary.thumbnailUrl,
    summary.name,
    summary.category || ""
  );

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
    totalStock: summary.totalStock !== undefined && summary.totalStock !== null ? Number(summary.totalStock) : 0,
    inStock: summary.inStock ?? (summary.totalStock !== undefined ? Number(summary.totalStock) > 0 : false),
    isPreorder: Boolean(summary.isPreorder) || summary.stockStatus === "PRE_ORDER",
    stockStatus: summary.stockStatus || (summary.isPreorder ? "PRE_ORDER" : ((summary.totalStock ?? 0) > 0 ? "IN_STOCK" : "OUT_OF_STOCK")),
    variantId: summary.defaultVariantId ? Number(summary.defaultVariantId) : undefined,
  };
}

function mapDetailToProduct(detail: BackendProductDetail): Product {
  const primaryMedia = detail.media?.find((m) => m.isPrimary) || detail.media?.[0];
  const secondaryMedia = detail.media?.[1];
  let minPrice = 0;
  let maxComparePrice: number | undefined = undefined;

  if (detail.variants && detail.variants.length > 0) {
    minPrice = Math.min(...detail.variants.map((v) => Number(v.price || 0)));
    const comp = detail.variants.find((v) => v.compareAtPrice)?.compareAtPrice;
    if (comp) maxComparePrice = Number(comp);
  }

  const categoryName = detail.categories?.[0]?.name || "Nội thất";
  const images = resolveProductImage(primaryMedia?.mediaUrl, detail.name, categoryName);

  const discount = maxComparePrice && maxComparePrice > minPrice
    ? Math.round(((maxComparePrice - minPrice) / maxComparePrice) * 100)
    : undefined;

  const mappedVariants = detail.variants?.map((v, idx) => {
    const matchedMedia = detail.media?.find(
      (m) => m.variantId === v.id && (m.mediaType === "IMAGE" || !m.mediaType)
    );
    let variantImg = matchedMedia ? productService.getMediaImageUrl(matchedMedia) : v.image;

    if (!variantImg) {
      if (v.name?.includes("1m6") || idx === 0) {
        variantImg = "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=800&q=80";
      } else if (v.name?.includes("1m8") || idx === 1) {
        variantImg = "https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=800&q=80";
      } else if (v.name?.includes("2m") || idx === 2) {
        variantImg = "https://images.unsplash.com/photo-1530018607912-eff2daa1bac4?auto=format&fit=crop&w=800&q=80";
      }
    }

    return {
      ...v,
      image: variantImg,
    };
  });

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
    categoryId: detail.categories?.[0]?.id,
    brand: detail.brand?.name || "Nhà Xinh",
    shortDescription: detail.shortDescription || undefined,
    description: detail.description || undefined,
    specifications: detail.specifications || undefined,
    isNew: discount === undefined || discount === 0,
    rating: 4.9,
    inStock: detail.status === "ACTIVE",
    totalStock: detail.variants?.reduce((s, v) => s + (v.stock?.availableQuantity || 0), 0) ?? 0,
    isPreorder: detail.variants?.some((v) => Boolean(v.stock?.isPreorder) || v.stock?.stockStatus === "PRE_ORDER"),
    stockStatus: detail.variants?.some((v) => Boolean(v.stock?.isPreorder) || v.stock?.stockStatus === "PRE_ORDER") ? "PRE_ORDER" : "IN_STOCK",
    variantId: mappedVariants?.[0]?.id,
    variants: mappedVariants,
    media: detail.media,
  };
}

export const productService = {
  /**
   * Lấy danh sách gợi ý tìm kiếm nhanh cho Header / Search bar thuần API
   */
  async getSearchSuggestions(query: string, signal?: AbortSignal): Promise<Array<{
    id: number;
    name: string;
    slug: string;
    price: number;
    image?: string;
    category?: string;
  }>> {
    const term = query.trim().toLowerCase();
    if (term.length < 2) return [];

    try {
      const url = buildUrlWithQuery(ENDPOINTS.PRODUCTS.SEARCH, { keyword: term, size: 6 });
      const res = await fetch(url, {
        signal,
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) return [];

      const data = await res.json();
      const content: BackendProductSummary[] = Array.isArray(data)
        ? data
        : Array.isArray(data.content)
        ? data.content
        : [];

      return content.map((item) => {
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
   * Lấy danh sách sản phẩm thuần API từ database backend (hỗ trợ phân trang, lọc, sắp xếp)
   */
  async getProducts(params?: ProductQueryParams): Promise<Product[]> {
    try {
      let baseUrl: string = ENDPOINTS.PRODUCTS.BASE;
      const queryParams: Record<string, any> = {};

      if (params?.page !== undefined) queryParams.page = params.page;
      if (params?.size !== undefined) queryParams.size = params.size;
      if (params?.sort) queryParams.sort = params.sort;
      if (params?.dir) queryParams.dir = params.dir;

      if (params?.keyword) {
        baseUrl = ENDPOINTS.PRODUCTS.SEARCH;
        queryParams.keyword = params.keyword;
      } else if (params?.categoryId) {
        baseUrl = ENDPOINTS.PRODUCTS.BY_CATEGORY(params.categoryId);
      }

      const finalUrl = buildUrlWithQuery(baseUrl, queryParams);
      const response = await fetch(finalUrl, {
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        console.warn(`[productService] API ${finalUrl} returned status ${response.status}.`);
        return [];
      }

      const data = await response.json();
      const content: BackendProductSummary[] = Array.isArray(data)
        ? data
        : Array.isArray(data.content)
        ? data.content
        : [];

      let products = content.map(mapSummaryToProduct);

      // Nếu client lọc theo tên category
      if (params?.category) {
        const catLower = params.category.toLowerCase();
        products = products.filter(
          (p) => p.category.toLowerCase().includes(catLower)
        );
      }

      return products;
    } catch (err) {
      console.warn("[productService] Error fetching products from API:", err);
      return [];
    }
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
    try {
      const response = await fetch(ENDPOINTS.PRODUCTS.BY_SLUG(slug), {
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        const detail: BackendProductDetail = await response.json();
        return mapDetailToProduct(detail);
      }
    } catch {
      // Bỏ qua lỗi kết nối
    }

    // Nếu không lấy được qua slug detail, thử tìm trong danh sách products từ API
    try {
      const allProducts = await this.getProducts({ size: 100 });
      const found = allProducts.find((p) => p.slug === slug);
      if (found) return found;
    } catch {
      // Bỏ qua
    }

    return null;
  },

  /**
   * Lấy chi tiết sản phẩm theo ID
   */
  async getDetailProduct(id: number): Promise<Product | null> {
    try {
      const response = await fetch(ENDPOINTS.PRODUCTS.BY_ID(id), {
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        const detail: BackendProductDetail = await response.json();
        return mapDetailToProduct(detail);
      }
    } catch {
      // Bỏ qua lỗi kết nối
    }

    // Fallback thử tìm trong danh sách products từ API
    try {
      const allProducts = await this.getProducts({ size: 100 });
      const found = allProducts.find((p) => p.id === id);
      if (found) return found;
    } catch {
      // Bỏ qua
    }

    return null;
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
   * Helper: Lấy URL hiển thị ảnh từ đối tượng ProductMediaItem
   * - Nếu là link ngoài (http/https): Trả về link trực tiếp.
   * - Nếu là ảnh do server quản lý qua media id: Gọi API qua ENDPOINTS
   */
  getMediaImageUrl(media?: { id?: number; mediaUrl?: string | null } | null): string {
    if (!media) return "";
    if (media.mediaUrl && (media.mediaUrl.startsWith("http://") || media.mediaUrl.startsWith("https://"))) {
      return media.mediaUrl;
    }
    if (media.id) {
      return ENDPOINTS.PRODUCTS.MEDIA_IMAGE(media.id);
    }
    return media.mediaUrl || "";
  },

  /**
   * Lấy danh sách media của sản phẩm theo id hoặc slug
   */
  async getProductMedia(
    productIdOrSlug: number | string,
    type?: "IMAGE" | "VIDEO" | "MODEL_3D" | string
  ): Promise<ProductMediaItem[]> {
    try {
      const url = buildUrlWithQuery(ENDPOINTS.PRODUCTS.MEDIA(productIdOrSlug), type ? { type } : undefined);
      const res = await fetch(url);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Bỏ qua lỗi
    }
    return [];
  },

  /**
   * API chuyên biệt lấy toàn bộ ảnh (IMAGE) của sản phẩm theo id hoặc slug
   */
  async getProductImages(productIdOrSlug: number | string): Promise<ProductMediaItem[]> {
    try {
      const url = ENDPOINTS.PRODUCTS.IMAGES(productIdOrSlug);
      const res = await fetch(url);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Bỏ qua lỗi
    }
    return [];
  },

  /**
   * Danh sách sản phẩm nổi bật thuần API
   */
  async getFeaturedProducts(limit = 8): Promise<Product[]> {
    try {
      const url = buildUrlWithQuery(ENDPOINTS.PRODUCTS.FEATURED, { limit });
      const res = await fetch(url);
      if (res.ok) {
        const list: BackendProductSummary[] = await res.json();
        return list.map(mapSummaryToProduct);
      }
    } catch {
      // Bỏ qua lỗi
    }

    // Nếu endpoint featured chưa có dữ liệu, lấy top sản phẩm mới nhất từ API products
    try {
      const prods = await this.getProducts({ size: limit });
      return prods.slice(0, limit);
    } catch {
      return [];
    }
  },
};
