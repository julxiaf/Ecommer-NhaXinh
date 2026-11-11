import type { AdminProduct, ProductVariant } from "./types";
import { ENDPOINTS, buildUrlWithQuery } from "../apiEndpoints";
import { isCollectionCategory } from "../categoryService";
import { resolveProductImage } from "../productService";
import { adminRequest } from "./adminHttp";

export interface ProductMediaUploads {
  imageFiles?: File[];
  model3dFile?: File | null;
  imageUrl?: string;
  secondaryImageUrl?: string;
  model3dUrl?: string;
}

export interface AdminProductInput extends Partial<AdminProduct>, ProductMediaUploads {}

export interface ApiProduct {
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

function parseOptions(value?: string | null): Record<string, string> {
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return Object.fromEntries(
        Object.entries(parsed).map(([key, item]) => [key, String(item)])
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

export function productFromApi(product: ApiProduct): AdminProduct {
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
    (v) => Boolean(v.stock?.isPreorder) || v.stock?.stockStatus === "PRE_ORDER"
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

export function makeProductWritePayload(product: AdminProductInput) {
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

export const productAdminApi = {
  async getProducts(includeDeleted = false): Promise<AdminProduct[]> {
    const url = buildUrlWithQuery(
      ENDPOINTS.ADMIN.CATALOG.PRODUCTS,
      includeDeleted ? { includeArchived: true } : undefined
    );
    const result = await adminRequest<ApiProduct[] | ApiPage<ApiProduct>>(url);
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
    const result = await adminRequest<ApiProduct>(endpoint, {
      method: product.id ? "PUT" : "POST",
      body: form,
    });
    return productFromApi(result);
  },

  async setProductStatus(id: number, status: "DRAFT" | "ACTIVE" | "ARCHIVED"): Promise<void> {
    await adminRequest<void>(ENDPOINTS.ADMIN.CATALOG.PRODUCT_STATUS(id), {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  async softDeleteProduct(id: number): Promise<void> {
    await adminRequest<void>(ENDPOINTS.ADMIN.CATALOG.PRODUCT_BY_ID(id), {
      method: "DELETE",
    });
  },

  async restoreProduct(id: number): Promise<AdminProduct> {
    const result = await adminRequest<ApiProduct>(
      `${ENDPOINTS.ADMIN.CATALOG.PRODUCT_BY_ID(id)}/restore`,
      { method: "POST" }
    );
    return productFromApi(result);
  },
};

