import type { CategoryItem, BackendCategoryResponse } from "../types/catalog";
import { ENDPOINTS } from "./apiEndpoints";
import { apiClient } from "./apiClient";

// ══════════════════════════════════════════════════════════
// 1. COLLECTION & CATEGORY METADATA & CONSTANTS
// ══════════════════════════════════════════════════════════

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

export const COLLECTION_SLUGS = new Set([
  "bo-suu-tap",
  "orientale",
  "victoria",
  "duong-dai",
  "osaka",
  "coastal",
  "may",
]);

const COLLECTION_META_DELIMITER = "\n<!--NX_COLLECTION_META:";
const COLLECTION_META_END = "-->";

/**
 * Kiểm tra xem một danh mục có thuộc nhóm Bộ sưu tập (Collection) hay không.
 */
export function isCollectionCategory(
  cat?: {
    slug?: string | null;
    name?: string | null;
    categoryGroup?: string | null;
    parentId?: string | number | null;
    isCollection?: boolean;
  } | null
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
 * Phân tích cú pháp metadata của Bộ sưu tập (subtitle, videoUrl, gallery, tags) từ description
 */
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

/**
 * Tuần tự hóa metadata Bộ sưu tập vào description lưu database
 */
export function serializeCollectionMeta(category: {
  description?: string | null;
  subtitle?: string | null;
  introQuote?: string | null;
  storyTitle?: string | null;
  videoUrl?: string | null;
  styleTag?: string | null;
  materials?: string | null;
  galleryImages?: string[];
  productIds?: number[];
}): string | null {
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
// 2. CLIENT CATEGORY SERVICE
// ══════════════════════════════════════════════════════════

// Cache in-memory để giảm thiểu requests trùng lặp
let cachedCategories: CategoryItem[] | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 60 * 1000; // 1 phút
let inFlightFetch: Promise<CategoryItem[]> | null = null;
let cachedMegaMenu: Array<{ title: string; to: string; items: Array<{ label: string; to: string }> }> | null = null;
let cachedRoomMenu: Array<{ title: string; to: string; items: Array<{ label: string; to: string }> }> | null = null;

export const categoryService = {
  /**
   * Lấy toàn bộ danh mục sản phẩm từ backend hoặc fallback thông minh
   * Có in-flight promise deduplication để các component gọi đồng thời không spam request.
   */
  async getCategories(): Promise<CategoryItem[]> {
    const now = Date.now();
    if (cachedCategories && now - lastFetchTime < CACHE_TTL) {
      return cachedCategories;
    }

    if (inFlightFetch) {
      return inFlightFetch;
    }

    inFlightFetch = (async () => {
      try {
        // 1. Thử gọi API danh mục công khai qua apiClient (có auto-retry khi gateway lỗi)
        const data = await apiClient.get<BackendCategoryResponse[]>(ENDPOINTS.CATEGORIES.BASE, {
          skipAuth: true,
          retries: 2,
        });

        if (Array.isArray(data) && data.length > 0) {
          const items = this.transformApiCategories(data);
          cachedCategories = items;
          lastFetchTime = Date.now();
          cachedMegaMenu = null;
          cachedRoomMenu = null;
          return items;
        }
      } catch {
        // Bỏ qua lỗi
      }

      try {
        // 2. Thử gọi API admin danh mục qua apiClient
        const data = await apiClient.get<BackendCategoryResponse[]>(ENDPOINTS.ADMIN.CATALOG.CATEGORIES, {
          retries: 1,
        });

        if (Array.isArray(data) && data.length > 0) {
          const items = this.transformApiCategories(data);
          cachedCategories = items;
          lastFetchTime = Date.now();
          cachedMegaMenu = null;
          cachedRoomMenu = null;
          return items;
        }
      } catch {
        // Bỏ qua lỗi
      }

      // 3. Fallback an toàn khi chưa nạp được dữ liệu
      return cachedCategories || [];
    })().finally(() => {
      inFlightFetch = null;
    });

    return inFlightFetch;
  },

  /**
   * Biến đổi danh mục backend thành format chuẩn CategoryItem[] hoàn toàn từ Database
   */
  transformApiCategories(raw: BackendCategoryResponse[]): CategoryItem[] {
    const activeOnes = raw.filter((c) => c.isActive !== false && c.isDeleted !== true);

    // Xây dựng map các category con theo parentId từ dữ liệu database
    const childrenByParentId = new Map<number, Array<{ label: string; to: string }>>();
    for (const cat of activeOnes) {
      if (cat.parentId != null) {
        const subSlug = cat.slug || cat.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const list = childrenByParentId.get(cat.parentId) || [];
        list.push({ label: cat.name, to: `/danh-muc/${subSlug}` });
        childrenByParentId.set(cat.parentId, list);
      }
    }

    return activeOnes.map((cat) => {
      const slug = cat.slug || cat.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/[^a-z0-9]+/g, "-");

      const subItems = childrenByParentId.get(cat.id);
      const group = (cat.categoryGroup || (cat.isCollection ? "COLLECTION" : "PRODUCT")).toUpperCase();

      let targetUrl = `/danh-muc/${slug}`;
      if (group === "ROOM") {
        targetUrl = `/phong/${slug}`;
      } else if (group === "COLLECTION") {
        targetUrl = `/bo-suu-tap/${slug}`;
      }

      return {
        id: cat.id,
        name: cat.name,
        slug,
        parentId: cat.parentId,
        description: cat.description
          ? cat.description.split("<!--NX_COL_META:")[0].trim() || undefined
          : undefined,
        imageUrl: cat.imageUrl || undefined,
        categoryGroup: group,
        isCollection: group === "COLLECTION",
        to: targetUrl,
        items: subItems && subItems.length > 0 ? subItems : undefined,
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

  /**
   * Lấy cấu trúc Mega Menu sản phẩm trực tiếp từ máy chủ backend (Server-driven Mega Menu)
   * CHỈ hiển thị LOẠI SẢN PHẨM NỘI THẤT (category_group === 'PRODUCT').
   * TUYỆT ĐỐI LOẠI BỎ: Không gian phòng (ROOM) và Bộ sưu tập (COLLECTION) và Trang tĩnh (PAGE / STATIC).
   */
  async getMegaMenuGroups(): Promise<Array<{ title: string; to: string; items: Array<{ label: string; to: string }> }>> {
    if (cachedMegaMenu) {
      return cachedMegaMenu;
    }
    const cats = await this.getCategories();

    const isRoomCat = (name: string, slug: string) => {
      const n = (name || "").toLowerCase().trim();
      const s = (slug || "").toLowerCase().trim();
      return (
        n.startsWith("phòng") ||
        n.startsWith("phong") ||
        s.startsWith("phong-") ||
        s === "phong-khach" ||
        s === "phong-an" ||
        s === "phong-ngu" ||
        s === "phong-lam-viec" ||
        s === "ngoai-that" ||
        s === "bep"
      );
    };

    const isTestCat = (name: string, slug: string) => {
      const n = (name || "").toLowerCase().trim();
      const s = (slug || "").toLowerCase().trim();
      return n.includes("test") || s.includes("test");
    };

    if (Array.isArray(cats) && cats.length > 0) {
      // 1. Lọc sạch: Chỉ giữ lại các danh mục sản phẩm hợp lệ (categoryGroup === "PRODUCT")
      const productCats = cats.filter((c) => {
        const group = (c.categoryGroup || "").toUpperCase();
        if (group === "ROOM" || group === "COLLECTION" || group === "PAGE" || group === "STATIC") {
          return false;
        }
        return !isRoomCat(c.name, c.slug) && !isCollectionCategory(c) && !isTestCat(c.name, c.slug);
      });

      // 2. Lấy các danh mục cha cấp cao nhất (Top-level: Sofa, Bàn, Ghế, Tủ & Kệ...)
      const parentCats = productCats.filter((c) => !c.parentId);

      if (parentCats.length > 0) {
        const groups = parentCats.map((parent) => {
          let subItems = parent.items || [];
          if (subItems.length === 0) {
            subItems = productCats
              .filter((c) => String(c.parentId) === String(parent.id))
              .map((sub) => ({
                label: sub.name,
                to: sub.to || `/danh-muc/${sub.slug}`,
              }));
          }

          return {
            title: parent.name,
            to: parent.to || `/danh-muc/${parent.slug}`,
            items: subItems,
          };
        });
        cachedMegaMenu = groups;
        return groups;
      }
    }

    // 3. Fallback danh mục sản phẩm chuẩn Nhà Xinh nếu server chưa có danh mục cha chuẩn
    return [
      {
        title: "Sofa",
        to: "/danh-muc/sofa",
        items: [
          { label: "Sofa băng", to: "/danh-muc/sofa-bang" },
          { label: "Sofa góc", to: "/danh-muc/sofa-goc" },
          { label: "Ghế Armchair", to: "/danh-muc/ghe-armchair" },
          { label: "Ghế thư giãn", to: "/danh-muc/ghe-thu-gian" },
        ],
      },
      {
        title: "Bàn",
        to: "/danh-muc/ban",
        items: [
          { label: "Bàn ăn", to: "/danh-muc/ban-an" },
          { label: "Bàn trà & Bàn nước", to: "/danh-muc/ban-tra" },
          { label: "Bàn bên & Bàn góc", to: "/danh-muc/ban-ben" },
          { label: "Bàn làm việc", to: "/danh-muc/ban-lam-viec" },
        ],
      },
      {
        title: "Ghế",
        to: "/danh-muc/ghe",
        items: [
          { label: "Ghế ăn", to: "/danh-muc/ghe-an" },
          { label: "Ghế làm việc", to: "/danh-muc/ghe-lam-viec" },
          { label: "Ghế đôn & Ghế quầy bar", to: "/danh-muc/ghe-don" },
        ],
      },
      {
        title: "Tủ & kệ",
        to: "/danh-muc/tu-va-ke",
        items: [
          { label: "Kệ tivi", to: "/danh-muc/tu-tivi" },
          { label: "Tủ quần áo", to: "/danh-muc/tu-quan-ao" },
          { label: "Tủ giày", to: "/danh-muc/tu-giay" },
          { label: "Tủ ly & Tủ rượu", to: "/danh-muc/tu-ly" },
        ],
      },
      {
        title: "Giường & nệm",
        to: "/danh-muc/giuong-va-nem",
        items: [
          { label: "Giường ngủ", to: "/danh-muc/giuong" },
          { label: "Nệm cao cấp", to: "/danh-muc/nem" },
          { label: "Tủ đầu giường", to: "/danh-muc/tu-dau-giuong" },
        ],
      },
      {
        title: "Đèn & Trang trí",
        to: "/danh-muc/den-va-trang-tri",
        items: [
          { label: "Đèn trang trí", to: "/danh-muc/den-trang-tri" },
          { label: "Thảm trải sàn", to: "/danh-muc/tham" },
          { label: "Gương & Tranh treo tường", to: "/danh-muc/guong-va-tranh" },
        ],
      },
    ];
  },

  /**
   * Lấy cấu trúc Mega Menu cho 'Phòng' (Phòng khách, Phòng ăn, Phòng ngủ, Phòng làm việc)
   * Lấy động từ Server DB (các danh mục có categoryGroup === 'ROOM') hoặc fallback
   */
  async getRoomMenuGroups(): Promise<Array<{ title: string; to: string; items: Array<{ label: string; to: string }> }>> {
    if (cachedRoomMenu) {
      return cachedRoomMenu;
    }
    try {
      const cats = await this.getCategories();
      const roomCats = cats.filter((c) => {
        const group = (c.categoryGroup || "").toUpperCase();
        return (
          group === "ROOM" ||
          c.slug.startsWith("phong-") ||
          c.name.toLowerCase().startsWith("phòng ") ||
          c.name.toLowerCase().startsWith("phong ")
        );
      });

      const parentRooms = roomCats.filter((c) => !c.parentId);
      if (parentRooms.length > 0) {
        const rooms = parentRooms.map((room) => {
          let subItems = room.items || [];
          if (subItems.length === 0) {
            subItems = roomCats
              .filter((c) => String(c.parentId) === String(room.id))
              .map((sub) => ({
                label: sub.name,
                to: sub.to || `/danh-muc/${sub.slug}`,
              }));
          }

          if (subItems.length === 0) {
            // Mặc định các link nhanh cho phòng nếu chưa có con
            if (room.slug.includes("khach")) {
              subItems = [
                { label: "Sofa băng & Sofa góc", to: "/danh-muc/sofa" },
                { label: "Bàn nước & Bàn bên", to: "/danh-muc/ban-tra" },
                { label: "Kệ tivi & Tủ trang trí", to: "/danh-muc/tu-tivi" },
              ];
            } else if (room.slug.includes("an")) {
              subItems = [
                { label: "Bàn ăn 4 - 8 chỗ", to: "/danh-muc/ban-an" },
                { label: "Ghế ăn bọc da & nỉ", to: "/danh-muc/ghe-an" },
                { label: "Tủ ly & Tủ rượu", to: "/danh-muc/tu-ly" },
              ];
            } else if (room.slug.includes("ngu")) {
              subItems = [
                { label: "Giường ngủ", to: "/danh-muc/giuong" },
                { label: "Tủ đầu giường", to: "/danh-muc/tu-dau-giuong" },
                { label: "Bàn trang điểm", to: "/danh-muc/ban-trang-diem" },
              ];
            } else if (room.slug.includes("lam-viec")) {
              subItems = [
                { label: "Bàn làm việc", to: "/danh-muc/ban-lam-viec" },
                { label: "Ghế làm việc", to: "/danh-muc/ghe-lam-viec" },
              ];
            }
          }

          return {
            title: room.name,
            to: `/phong/${room.slug}`,
            items: subItems,
          };
        });
        cachedRoomMenu = rooms;
        return rooms;
      }
    } catch {
      // Bỏ qua lỗi và dùng fallback
    }

    const fallbackRooms = [
      {
        title: "Phòng khách",
        to: "/phong/phong-khach",
        items: [
          { label: "Sofa băng & Sofa góc", to: "/danh-muc/sofa" },
          { label: "Bàn nước & Bàn bên", to: "/danh-muc/ban-tra" },
          { label: "Kệ tivi & Tủ trang trí", to: "/danh-muc/tu-tivi" },
        ],
      },
      {
        title: "Phòng ăn",
        to: "/phong/phong-an",
        items: [
          { label: "Bàn ăn 4 - 8 chỗ", to: "/danh-muc/ban-an" },
          { label: "Ghế ăn bọc da & nỉ", to: "/danh-muc/ghe-an" },
          { label: "Tủ ly & Tủ rượu", to: "/danh-muc/tu-ly" },
        ],
      },
      {
        title: "Phòng ngủ",
        to: "/phong/phong-ngu",
        items: [
          { label: "Giường ngủ", to: "/danh-muc/giuong" },
          { label: "Tủ đầu giường", to: "/danh-muc/tu-dau-giuong" },
          { label: "Bàn trang điểm", to: "/danh-muc/ban-trang-diem" },
        ],
      },
      {
        title: "Phòng làm việc",
        to: "/phong/phong-lam-viec",
        items: [
          { label: "Bàn làm việc", to: "/danh-muc/ban-lam-viec" },
          { label: "Ghế làm việc", to: "/danh-muc/ghe-lam-viec" },
        ],
      },
    ];
    cachedRoomMenu = fallbackRooms;
    return fallbackRooms;
  },
};
