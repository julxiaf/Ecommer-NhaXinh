import type { AdminCategory, AdminProduct, ProductVariant } from "./types";
import { API_BASE, ENDPOINTS, buildUrlWithQuery } from "../apiEndpoints";
import { isCollectionCategory, resolveProductImage } from "../productService";
import { userService } from "../userService";

// ══════════════════════════════════════════════════════════
// 1. BACKEND ADMIN CATALOG TYPES & INPUT INTERFACES
// ══════════════════════════════════════════════════════════

export interface ProductMediaUploads {
  imageFiles?: File[];
  model3dFile?: File | null;
  imageUrl?: string;
  secondaryImageUrl?: string;
  model3dUrl?: string;
}

export interface AdminProductInput extends Partial<AdminProduct>, ProductMediaUploads {}

export interface CollectionMetadata {
  subtitle?: string;
  introQuote?: string;
  storyTitle?: string;
  videoUrl?: string;
  galleryImages?: string[];
  styleTag?: string;
  materials?: string;
  productIds?: number[];
}

interface ApiCategory {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  categoryGroup?: "PRODUCT" | "ROOM" | "COLLECTION" | "PAGE" | "STATIC" | string;
  description?: string | null;
  imageUrl?: string | null;
  sortOrder: number;
  isActive: boolean;
  isDeleted?: boolean;
  createdBy?: string | null;
}

interface ApiProduct {
  id: number;
  name: string;
  slug: string;
  shortDescription?: string | null;
  description?: string | null;
  specifications?: string | null;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  isPreorder?: boolean | null;
  stockStatus?: string | null;
  isNew?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  createdBy?: string | null;
  categories: {
    id: number;
    name: string;
    slug: string;
    categoryGroup?: string;
    isCollection?: boolean;
  }[];
  media: {
    id: number;
    mediaType: "IMAGE" | "MODEL_3D";
    mediaUrl: string;
    altText?: string | null;
    sortOrder: number;
    isPrimary: boolean;
  }[];
  variants: {
    id: number;
    sku: string;
    name: string;
    optionValues?: string | null;
    price: number;
    compareAtPrice?: number | null;
    stock: {
      availableQuantity: number;
      inStock: boolean;
      isPreorder?: boolean;
      stockStatus?: string;
    };
  }[];
}

interface ApiPage<T> {
  content: T[];
}

// ══════════════════════════════════════════════════════════
// 2. HTTP CLIENT WITH TRANSIENT GATEWAY RETRY (502/503/504)
// ══════════════════════════════════════════════════════════

const TRANSIENT_GATEWAY_STATUSES = new Set([502, 503, 504]);

async function readError(response: Response): Promise<string> {
  const text = await response.text();
  if (!text) return `Yêu cầu thất bại (${response.status}).`;
  try {
    const body = JSON.parse(text) as { message?: string; error?: string };
    return body.message || body.error || text;
  } catch {
    return text;
  }
}

async function request<T>(path: string, init?: RequestInit, retries = 2): Promise<T> {
  const url =
    path.startsWith("http") || path.startsWith(API_BASE) ? path : `${API_BASE}${path}`;
  const isGet = !init?.method || init.method.toUpperCase() === "GET";

  for (let attempt = 0; attempt <= (isGet ? retries : 0); attempt++) {
    try {
      const response = await fetch(url, {
        ...init,
        credentials: "include",
        headers: {
          ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
          ...userService.getAuthHeaders(),
          ...init?.headers,
        },
      });

      if (isGet && TRANSIENT_GATEWAY_STATUSES.has(response.status) && attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
        continue;
      }

      if (!response.ok) throw new Error(await readError(response));
      if (response.status === 204) return undefined as T;
      return (await response.json()) as T;
    } catch (err) {
      if (isGet && attempt < retries && err instanceof TypeError) {
        await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }

  throw new Error(`Yêu cầu thất bại: ${url}`);
}

// ══════════════════════════════════════════════════════════
// 3. COLLECTION EDITORIAL METADATA SERIALIZER / PARSER
// ══════════════════════════════════════════════════════════

const COLLECTION_META_DELIMITER = "\n<!--NX_COLLECTION_META:";
const COLLECTION_META_END = "-->";

export function parseCollectionMeta(rawDescription?: string | null): {
  cleanDescription?: string;
  meta: CollectionMetadata;
} {
  if (!rawDescription) return { cleanDescription: undefined, meta: {} };
  const idx = rawDescription.indexOf(COLLECTION_META_DELIMITER);
  if (idx === -1) {
    return { cleanDescription: rawDescription.trim() || undefined, meta: {} };
  }

  const cleanDescription = rawDescription.slice(0, idx).trim() || undefined;
  const metaStart = idx + COLLECTION_META_DELIMITER.length;
  const metaEnd = rawDescription.indexOf(COLLECTION_META_END, metaStart);
  const jsonStr =
    metaEnd !== -1
      ? rawDescription.slice(metaStart, metaEnd).trim()
      : rawDescription.slice(metaStart).trim();

  try {
    const parsed = JSON.parse(jsonStr) as CollectionMetadata;
    return { cleanDescription, meta: parsed || {} };
  } catch {
    return { cleanDescription: rawDescription.trim() || undefined, meta: {} };
  }
}

export function serializeCollectionMeta(category: Partial<AdminCategory>): string | null {
  const baseDesc = category.description?.trim() || "";
  const meta: CollectionMetadata = {};

  if (category.subtitle?.trim()) meta.subtitle = category.subtitle.trim();
  if (category.introQuote?.trim()) meta.introQuote = category.introQuote.trim();
  if (category.storyTitle?.trim()) meta.storyTitle = category.storyTitle.trim();
  if (category.videoUrl?.trim()) meta.videoUrl = category.videoUrl.trim();
  if (category.styleTag?.trim()) meta.styleTag = category.styleTag.trim();
  if (category.materials?.trim()) meta.materials = category.materials.trim();
  if (category.galleryImages && category.galleryImages.length > 0) {
    meta.galleryImages = category.galleryImages.filter((u) => u && u.trim() !== "");
  }
  if (category.productIds && category.productIds.length > 0) {
    meta.productIds = category.productIds;
  }

  const hasMeta = Object.keys(meta).length > 0;
  if (!hasMeta) {
    return baseDesc || null;
  }
  return `${baseDesc}${COLLECTION_META_DELIMITER}${JSON.stringify(meta)}${COLLECTION_META_END}`;
}

// ══════════════════════════════════════════════════════════
// 4. CATEGORY & PRODUCT DATA MAPPERS
// ══════════════════════════════════════════════════════════

function categoryFromApi(category: ApiCategory): AdminCategory {
  const { cleanDescription, meta } = parseCollectionMeta(category.description);
  const parentIdStr = category.parentId === null ? null : String(category.parentId);
  const isCollection = isCollectionCategory({
    slug: category.slug,
    name: category.name,
    categoryGroup: category.categoryGroup,
    parentId: parentIdStr,
  });

  return {
    id: String(category.id),
    name: category.name,
    slug: category.slug,
    parentId: parentIdStr,
    order: category.sortOrder,
    icon: undefined,
    description: cleanDescription,
    imageUrl: category.imageUrl || undefined,
    categoryGroup: category.categoryGroup || (isCollection ? "COLLECTION" : "PRODUCT"),
    isCollection,
    isDeleted: Boolean(category.isDeleted) || !category.isActive,
    productCount: 0,
    createdBy: category.createdBy || "Admin Nhà Xinh",
    subtitle: meta.subtitle,
    introQuote: meta.introQuote,
    storyTitle: meta.storyTitle,
    videoUrl: meta.videoUrl,
    galleryImages: meta.galleryImages,
    styleTag: meta.styleTag,
    materials: meta.materials,
    productIds: meta.productIds,
  };
}

function categoryToApi(category: Partial<AdminCategory>) {
  const isCollection = isCollectionCategory(category);
  return {
    name: category.name?.trim(),
    slug: category.slug?.trim(),
    parentId: category.parentId ? Number(category.parentId) : null,
    categoryGroup: category.categoryGroup || (isCollection ? "COLLECTION" : "PRODUCT"),
    description: serializeCollectionMeta(category),
    imageUrl: category.imageUrl?.trim() || null,
    sortOrder: category.order,
    isActive: category.isDeleted === undefined ? true : !category.isDeleted,
  };
}

function parseOptions(value?: string | null): Record<string, string> {
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return Object.fromEntries(
        Object.entries(parsed).map(([key, item]) => [key, String(item)]),
      );
    }
  } catch {
    return { details: value };
  }
  return {};
}

function formatViDateTime(iso?: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return iso;
  }
}

function productFromApi(product: ApiProduct): AdminProduct {
  const category =
    product.categories.find((c) => !isCollectionCategory(c)) || product.categories[0];
  const images = product.media.filter((media) => media.mediaType === "IMAGE");
  const model = product.media.find((media) => media.mediaType === "MODEL_3D");

  const variants: ProductVariant[] = product.variants.map((variant) => {
    const options = parseOptions(variant.optionValues);
    return {
      id: String(variant.id),
      sku: variant.sku,
      color: options.color || variant.name,
      size: options.size || "",
      material: options.material || "",
      price: Number(variant.price),
      originalPrice: variant.compareAtPrice ? Number(variant.compareAtPrice) : undefined,
      stock: variant.stock.availableQuantity,
    };
  });

  const rawPrimaryUrl =
    images.find((media) => media.isPrimary)?.mediaUrl || images[0]?.mediaUrl || "";
  const rawSecondaryUrl = images[1]?.mediaUrl;
  const resolvedImages = resolveProductImage(rawPrimaryUrl, product.name, category?.name || "");

  const hasVariantPreorder = product.variants.some(
    (v) => Boolean(v.stock?.isPreorder) || v.stock?.stockStatus === "PRE_ORDER",
  );
  const isPreorder =
    Boolean(product.isPreorder) ||
    product.stockStatus === "PRE_ORDER" ||
    hasVariantPreorder;
  const totalStock = variants.reduce((sum, variant) => sum + variant.stock, 0);

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    categoryId: category ? String(category.id) : "",
    category: category?.name || "",
    brand: "Nhà Xinh",
    price: variants.length ? Math.min(...variants.map((variant) => variant.price)) : 0,
    originalPrice: undefined,
    stock: totalStock,
    image: resolvedImages.img1,
    image2: rawSecondaryUrl || resolvedImages.img2,
    model3dUrl: model?.mediaUrl,
    description: product.description || product.shortDescription || undefined,
    status:
      product.status === "ACTIVE"
        ? "active"
        : product.status === "ARCHIVED"
          ? "out_of_stock"
          : "draft",
    isDeleted: product.status === "ARCHIVED",
    isPreorder,
    stockStatus:
      product.stockStatus ||
      (isPreorder ? "PRE_ORDER" : totalStock > 0 ? "IN_STOCK" : "OUT_OF_STOCK"),
    isNew: product.isNew !== undefined && product.isNew !== null ? Boolean(product.isNew) : true,
    variants,
    createdAt: formatViDateTime(product.createdAt) || "20/04/2026",
    updatedAt: formatViDateTime(product.updatedAt),
    createdBy: product.createdBy || "Admin Nhà Xinh",
  };
}

function makeProductWritePayload(product: AdminProductInput) {
  const mediaFiles: File[] = [];
  const media: {
    mediaType: "IMAGE" | "MODEL_3D";
    mediaUrl?: string;
    fileIndex?: number;
    altText?: string;
    sortOrder: number;
    isPrimary?: boolean;
  }[] = [];

  const imageUrls = [
    product.imageUrl || product.image || "",
    product.secondaryImageUrl || product.image2 || "",
  ];
  const normalizeMediaUrl = (value: string) => {
    const url = value.trim();
    return url.startsWith("/") ? new URL(url, window.location.origin).toString() : url;
  };

  imageUrls.forEach((url, index) => {
    if (url.trim()) {
      media.push({
        mediaType: "IMAGE",
        mediaUrl: normalizeMediaUrl(url),
        sortOrder: index,
        isPrimary: index === 0,
      });
    }
  });

  for (const [index, file] of (product.imageFiles || []).entries()) {
    media.push({
      mediaType: "IMAGE",
      fileIndex: mediaFiles.length,
      altText: product.name || file.name,
      sortOrder: imageUrls.length + index,
      isPrimary: imageUrls.every((url) => !url.trim()) && index === 0,
    });
    mediaFiles.push(file);
  }

  if (product.model3dUrl?.trim()) {
    media.push({
      mediaType: "MODEL_3D",
      mediaUrl: normalizeMediaUrl(product.model3dUrl),
      sortOrder: media.length,
    });
  }
  if (product.model3dFile) {
    media.push({
      mediaType: "MODEL_3D",
      fileIndex: mediaFiles.length,
      altText: product.name ? `Mô hình 3D ${product.name}` : product.model3dFile.name,
      sortOrder: media.length,
    });
    mediaFiles.push(product.model3dFile);
  }

  const variants = product.variants?.length
    ? product.variants
    : [
        {
          id: "default",
          sku: `${(product.slug || product.name || "PRODUCT")
            .toUpperCase()
            .replace(/[^A-Z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
            .slice(0, 70)}-${Date.now()}`,
          color: "Mặc định",
          size: "",
          material: "",
          price: Number(product.price || 0),
          stock: Number(product.stock || 0),
        },
      ];

  return {
    request: {
      name: product.name?.trim() || "",
      slug: product.slug?.trim() || "",
      shortDescription: product.description?.slice(0, 600) || undefined,
      description: product.description || undefined,
      specifications: undefined,
      brandId: undefined,
      categoryIds: product.categoryId ? [Number(product.categoryId)] : [],
      status: product.status === "draft" ? "DRAFT" : "ACTIVE",
      isPreorder: Boolean(product.isPreorder),
      isNew: product.isNew ?? true,
      variants: variants.map((variant) => ({
        sku: variant.sku,
        name: variant.color || "Mặc định",
        optionValues: JSON.stringify({
          color: variant.color,
          size: variant.size,
          material: variant.material,
        }),
        price: Number(variant.price),
        compareAtPrice: variant.originalPrice,
        initialStock: Number(variant.stock),
        isPreorder: Boolean(product.isPreorder),
        stockStatus: product.isPreorder
          ? "PRE_ORDER"
          : Number(variant.stock) > 0
            ? "IN_STOCK"
            : "OUT_OF_STOCK",
      })),
      media,
    },
    mediaFiles,
  };
}

// ══════════════════════════════════════════════════════════
// 5. PUBLIC ADMIN CATALOG API
// ══════════════════════════════════════════════════════════

export const catalogApi = {
  async getCategories(includeDeleted = false): Promise<AdminCategory[]> {
    const url = buildUrlWithQuery(
      ENDPOINTS.ADMIN.CATALOG.CATEGORIES,
      includeDeleted ? { includeInactive: true } : undefined,
    );
    const result = await request<ApiCategory[]>(url);
    return result.map(categoryFromApi);
  },

  async uploadCategoryImage(file: File): Promise<string> {
    const form = new FormData();
    form.append("file", file, file.name);
    const res = await request<{ imageUrl: string }>(
      `${ENDPOINTS.ADMIN.CATALOG.CATEGORIES}/upload-image`,
      {
        method: "POST",
        body: form,
      },
    );
    return res.imageUrl;
  },

  async saveCategory(
    category: Partial<AdminCategory>,
    imageFile?: File | null,
  ): Promise<AdminCategory> {
    const payload = categoryToApi(category);
    const endpoint = category.id
      ? ENDPOINTS.ADMIN.CATALOG.CATEGORY_BY_ID(encodeURIComponent(category.id))
      : ENDPOINTS.ADMIN.CATALOG.CATEGORIES;
    const method = category.id ? "PUT" : "POST";

    if (imageFile) {
      const form = new FormData();
      form.append("request", new Blob([JSON.stringify(payload)], { type: "application/json" }));
      form.append("imageFile", imageFile, imageFile.name);
      const result = await request<ApiCategory>(endpoint, { method, body: form });
      return categoryFromApi(result);
    }

    const result = await request<ApiCategory>(endpoint, {
      method,
      body: JSON.stringify(payload),
    });
    return categoryFromApi(result);
  },

  async setCategoryActive(id: string, active: boolean): Promise<void> {
    await request<void>(ENDPOINTS.ADMIN.CATALOG.CATEGORY_STATUS(encodeURIComponent(id)), {
      method: "PATCH",
      body: JSON.stringify({ isActive: active }),
    });
  },

  async softDeleteCategory(id: string): Promise<void> {
    await request<void>(ENDPOINTS.ADMIN.CATALOG.CATEGORY_BY_ID(encodeURIComponent(id)), {
      method: "DELETE",
    });
  },

  async restoreCategory(id: string): Promise<AdminCategory> {
    const result = await request<ApiCategory>(
      `${ENDPOINTS.ADMIN.CATALOG.CATEGORY_BY_ID(encodeURIComponent(id))}/restore`,
      { method: "POST" },
    );
    return categoryFromApi(result);
  },

  async getProducts(includeDeleted = false): Promise<AdminProduct[]> {
    const url = buildUrlWithQuery(
      ENDPOINTS.ADMIN.CATALOG.PRODUCTS,
      includeDeleted ? { includeArchived: true } : undefined,
    );
    const result = await request<ApiProduct[] | ApiPage<ApiProduct>>(url);
    return (Array.isArray(result) ? result : result.content).map(productFromApi);
  },

  async saveProduct(product: AdminProductInput): Promise<AdminProduct> {
    const { request: payload, mediaFiles } = makeProductWritePayload(product);
    const form = new FormData();
    form.append("request", new Blob([JSON.stringify(payload)], { type: "application/json" }));
    mediaFiles.forEach((file) => form.append("mediaFiles", file, file.name));

    const endpoint = product.id
      ? ENDPOINTS.ADMIN.CATALOG.PRODUCT_BY_ID(product.id)
      : ENDPOINTS.ADMIN.CATALOG.PRODUCTS;
    const result = await request<ApiProduct>(endpoint, {
      method: product.id ? "PUT" : "POST",
      body: form,
    });
    return productFromApi(result);
  },

  async setProductStatus(id: number, status: "DRAFT" | "ACTIVE" | "ARCHIVED"): Promise<void> {
    await request<void>(ENDPOINTS.ADMIN.CATALOG.PRODUCT_STATUS(id), {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  async softDeleteProduct(id: number): Promise<void> {
    await request<void>(ENDPOINTS.ADMIN.CATALOG.PRODUCT_BY_ID(id), {
      method: "DELETE",
    });
  },

  async restoreProduct(id: number): Promise<AdminProduct> {
    const result = await request<ApiProduct>(
      `${ENDPOINTS.ADMIN.CATALOG.PRODUCT_BY_ID(id)}/restore`,
      { method: "POST" },
    );
    return productFromApi(result);
  },
};
