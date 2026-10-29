export interface Product {
  id: number;
  name: string;
  slug: string;
  price: number;
  originalPrice?: number;
  image: string;
  image2?: string;
  category: string;
  categoryId?: number;
  brand?: string;
  isNew?: boolean;
  discount?: number;
  rating?: number;
  shortDescription?: string;
  description?: string;
  specifications?: string;
  totalStock?: number;
  inStock?: boolean;
  isPreorder?: boolean;
  stockStatus?: "IN_STOCK" | "PRE_ORDER" | "OUT_OF_STOCK" | string;
  variantId?: number;
  variants?: ProductVariant[];
  media?: ProductMediaItem[];
}

export interface ProductMediaItem {
  id: number;
  mediaType: "IMAGE" | "MODEL_3D" | "VIDEO" | string;
  mediaUrl: string;
  altText?: string | null;
  sortOrder: number;
  isPrimary: boolean;
  variantId?: number | null;
}

export interface ProductVariant {
  id: number;
  sku: string;
  name: string;
  optionValues?: string | Record<string, string> | null;
  price: number;
  compareAtPrice?: number | null;
  image?: string | null;
  weightGrams?: number | null;
  widthMm?: number | null;
  heightMm?: number | null;
  depthMm?: number | null;
  stock?: {
    availableQuantity: number;
    inStock?: boolean;
    isPreorder?: boolean;
    stockStatus?: string;
  };
}

export interface CategoryItem {
  id: number | string;
  name: string;
  slug: string;
  parentId?: number | null;
  description?: string;
  imageUrl?: string;
  productCount?: number;
  to: string;
  items?: { label: string; to: string }[];
}

export interface ProductQueryParams {
  id?: number;
  page?: number;
  size?: number;
  sort?: string;
  dir?: "asc" | "desc";
  categoryId?: number;
  category?: string;
  keyword?: string;
  noMock?: boolean;
}

export interface BackendProductSummary {
  id: number;
  name: string;
  slug: string;
  shortDescription?: string | null;
  price: number;
  originalPrice?: number | null;
  discount?: number | null;
  image?: string | null;
  image2?: string | null;
  category?: string | null;
  brand?: string | null;
  totalStock?: number | null;
  inStock?: boolean | null;
  minPrice?: number | null;
  compareAtPrice?: number | null;
  thumbnailUrl?: string | null;
  defaultVariantId?: number | null;
  isPreorder?: boolean | null;
  stockStatus?: string | null;
}

export interface BackendProductDetail {
  id: number;
  name: string;
  slug: string;
  status: string;
  shortDescription?: string | null;
  description?: string | null;
  specifications?: string | null;
  brand?: {
    id: number;
    name: string;
    slug: string;
    logoUrl?: string;
  } | null;
  categories?: {
    id: number;
    name: string;
    slug: string;
  }[];
  media?: ProductMediaItem[];
  variants?: ProductVariant[];
}

export interface BackendCategoryResponse {
  id: number;
  name: string;
  slug: string;
  parentId?: number | null;
  description?: string | null;
  imageUrl?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}
