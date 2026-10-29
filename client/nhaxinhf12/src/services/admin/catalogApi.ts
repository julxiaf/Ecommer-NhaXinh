import type { AdminCategory, AdminProduct, ProductVariant } from "./types";
import { API_BASE } from "../apiEndpoints";

export interface ProductMediaUploads {
  imageFiles?: File[];
  model3dFile?: File | null;
  imageUrl?: string;
  secondaryImageUrl?: string;
  model3dUrl?: string;
}

interface ApiCategory {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  description?: string | null;
  imageUrl?: string | null;
  sortOrder: number;
  isActive: boolean;
}

interface ApiProduct {
  id: number;
  name: string;
  slug: string;
  shortDescription?: string | null;
  description?: string | null;
  specifications?: string | null;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  categories: { id: number; name: string; slug: string }[];
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
    stock: { availableQuantity: number; inStock: boolean };
  }[];
}

interface ApiPage<T> {
  content: T[];
}

export interface AdminProductInput extends Partial<AdminProduct>, ProductMediaUploads {}

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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = path.startsWith("http") || path.startsWith(API_BASE) ? path : `${API_BASE}${path}`;
  const response = await fetch(url, {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...init?.headers,
    },
  });
  if (!response.ok) throw new Error(await readError(response));
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

function categoryFromApi(category: ApiCategory): AdminCategory {
  return {
    id: String(category.id),
    name: category.name,
    slug: category.slug,
    parentId: category.parentId === null ? null : String(category.parentId),
    order: category.sortOrder,
    icon: undefined,
    description: category.description || undefined,
    imageUrl: category.imageUrl || undefined,
    isCollection:
      category.slug.includes("bo-suu-tap") ||
      category.slug.includes("victoria") ||
      category.slug.includes("duong-dai") ||
      category.slug.includes("osaka") ||
      category.slug.includes("coastal"),
    isDeleted: !category.isActive,
    productCount: 0,
  };
}

function categoryToApi(category: Partial<AdminCategory>) {
  return {
    name: category.name?.trim(),
    slug: category.slug?.trim(),
    parentId: category.parentId ? Number(category.parentId) : null,
    description: category.description?.trim() || null,
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

function productFromApi(product: ApiProduct): AdminProduct {
  const category = product.categories[0];
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
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    categoryId: category ? String(category.id) : "",
    category: category?.name || "",
    brand: "Nhà Xinh",
    price: variants.length ? Math.min(...variants.map((variant) => variant.price)) : 0,
    originalPrice: undefined,
    stock: variants.reduce((sum, variant) => sum + variant.stock, 0),
    image: images.find((media) => media.isPrimary)?.mediaUrl || images[0]?.mediaUrl || "",
    image2: images[1]?.mediaUrl,
    model3dUrl: model?.mediaUrl,
    status: product.status === "ACTIVE" ? "active" : product.status === "ARCHIVED" ? "out_of_stock" : "draft",
    isDeleted: product.status === "ARCHIVED",
    variants,
    createdAt: "",
  };
}

function makeRequest(product: AdminProductInput) {
  const mediaFiles: File[] = [];
  const media: {
    mediaType: "IMAGE" | "MODEL_3D";
    mediaUrl?: string;
    fileIndex?: number;
    altText?: string;
    sortOrder: number;
    isPrimary?: boolean;
  }[] = [];
  const imageUrls = [product.imageUrl || product.image || "", product.secondaryImageUrl || product.image2 || ""];
  const normalizeMediaUrl = (value: string) => {
    const url = value.trim();
    return url.startsWith("/") ? new URL(url, window.location.origin).toString() : url;
  };

  imageUrls.forEach((url, index) => {
    if (url.trim()) media.push({ mediaType: "IMAGE", mediaUrl: normalizeMediaUrl(url), sortOrder: index, isPrimary: index === 0 });
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
    media.push({ mediaType: "MODEL_3D", mediaUrl: normalizeMediaUrl(product.model3dUrl), sortOrder: media.length });
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
    : [{
        id: "default",
        sku: `${(product.slug || product.name || "PRODUCT").toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70)}-${Date.now()}`,
        color: "Mặc định",
        size: "",
        material: "",
        price: Number(product.price || 0),
        stock: Number(product.stock || 0),
      }];

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
      })),
      media,
    },
    mediaFiles,
  };
}

export const catalogApi = {
  async getCategories(includeDeleted = false): Promise<AdminCategory[]> {
    const result = await request<ApiCategory[]>(`/admin/categories${includeDeleted ? "?includeInactive=true" : ""}`);
    return result.map(categoryFromApi);
  },

  async saveCategory(category: Partial<AdminCategory>): Promise<AdminCategory> {
    const result = await request<ApiCategory>(
      category.id ? `/admin/categories/${encodeURIComponent(category.id)}` : "/admin/categories",
      { method: category.id ? "PUT" : "POST", body: JSON.stringify(categoryToApi(category)) },
    );
    return categoryFromApi(result);
  },

  async setCategoryActive(id: string, active: boolean): Promise<void> {
    await request<void>(`/admin/categories/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: active }),
    });
  },

  async getProducts(includeDeleted = false): Promise<AdminProduct[]> {
    const result = await request<ApiProduct[] | ApiPage<ApiProduct>>(
      `/admin/products${includeDeleted ? "?includeArchived=true" : ""}`,
    );
    return (Array.isArray(result) ? result : result.content).map(productFromApi);
  },

  async saveProduct(product: AdminProductInput): Promise<AdminProduct> {
    const { request: payload, mediaFiles } = makeRequest(product);
    const form = new FormData();
    form.append("request", new Blob([JSON.stringify(payload)], { type: "application/json" }));
    mediaFiles.forEach((file) => form.append("mediaFiles", file, file.name));
    const path = product.id ? `/admin/products/${product.id}` : "/admin/products";
    const result = await request<ApiProduct>(path, {
      method: product.id ? "PUT" : "POST",
      body: form,
    });
    return productFromApi(result);
  },

  async setProductStatus(id: number, status: "DRAFT" | "ACTIVE" | "ARCHIVED"): Promise<void> {
    await request<void>(`/admin/products/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },
};
