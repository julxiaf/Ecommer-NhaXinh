import type { AdminCategory } from "./types";
import { ENDPOINTS, buildUrlWithQuery } from "../apiEndpoints";
import {
  isCollectionCategory,
  parseCollectionMeta,
  serializeCollectionMeta,
} from "../categoryService";
import { adminRequest } from "./adminHttp";

export interface ApiCategory {
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

export function categoryFromApi(category: ApiCategory): AdminCategory {
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

export function categoryToApi(category: Partial<AdminCategory>) {
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

export const categoryAdminApi = {
  async getCategories(includeDeleted = false): Promise<AdminCategory[]> {
    const url = buildUrlWithQuery(
      ENDPOINTS.ADMIN.CATALOG.CATEGORIES,
      includeDeleted ? { includeInactive: true } : undefined
    );
    const result = await adminRequest<ApiCategory[]>(url);
    return result.map(categoryFromApi);
  },

  async uploadCategoryImage(file: File): Promise<string> {
    const form = new FormData();
    form.append("file", file, file.name);
    const res = await adminRequest<{ imageUrl: string }>(
      `${ENDPOINTS.ADMIN.CATALOG.CATEGORIES}/upload-image`,
      {
        method: "POST",
        body: form,
      }
    );
    return res.imageUrl;
  },

  async saveCategory(
    category: Partial<AdminCategory>,
    imageFile?: File | null
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
      const result = await adminRequest<ApiCategory>(endpoint, { method, body: form });
      return categoryFromApi(result);
    }

    const result = await adminRequest<ApiCategory>(endpoint, {
      method,
      body: JSON.stringify(payload),
    });
    return categoryFromApi(result);
  },

  async setCategoryActive(id: string, active: boolean): Promise<void> {
    await adminRequest<void>(ENDPOINTS.ADMIN.CATALOG.CATEGORY_STATUS(encodeURIComponent(id)), {
      method: "PATCH",
      body: JSON.stringify({ isActive: active }),
    });
  },

  async softDeleteCategory(id: string): Promise<void> {
    await adminRequest<void>(ENDPOINTS.ADMIN.CATALOG.CATEGORY_BY_ID(encodeURIComponent(id)), {
      method: "DELETE",
    });
  },

  async restoreCategory(id: string): Promise<AdminCategory> {
    const result = await adminRequest<ApiCategory>(
      `${ENDPOINTS.ADMIN.CATALOG.CATEGORY_BY_ID(encodeURIComponent(id))}/restore`,
      { method: "POST" }
    );
    return categoryFromApi(result);
  },
};

