import type { CategoryItem, BackendCategoryResponse } from "../types/catalog";
import { productService, DEFAULT_PLACEHOLDER_IMAGE } from "./productService";
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

              return {
                id: index + 1,
                name,
                slug,
                description: `Các sản phẩm thuộc danh mục ${name}`,
                imageUrl: info.sampleImage || DEFAULT_PLACEHOLDER_IMAGE,
                productCount: info.count,
                to: `/danh-muc/${slug}`,
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

    // 4. Fallback rỗng an toàn khi chưa nạp được dữ liệu
    return [];
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

    const isCollectionCat = (cat: { name?: string; slug?: string; isCollection?: boolean; categoryGroup?: string }) => {
      if (cat.categoryGroup === "COLLECTION" || cat.isCollection) return true;
      const n = (cat.name || "").toLowerCase().trim();
      const s = (cat.slug || "").toLowerCase().trim();
      return (
        n.includes("bộ sưu tập") ||
        n.includes("bo suu tap") ||
        s.includes("bo-suu-tap") ||
        s.includes("victoria") ||
        s.includes("duong-dai") ||
        s.includes("osaka") ||
        s.includes("coastal") ||
        s.includes("hung-king") ||
        s.includes("may")
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
        return !isRoomCat(c.name, c.slug) && !isCollectionCat(c) && !isTestCat(c.name, c.slug);
      });

      // 2. Lấy các danh mục cha cấp cao nhất (Top-level: Sofa, Bàn, Ghế, Tủ & Kệ...)
      const parentCats = productCats.filter((c) => !c.parentId);

      if (parentCats.length > 0) {
        return parentCats.map((parent) => {
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
        return parentRooms.map((room) => {
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
      }
    } catch {
      // Bỏ qua lỗi và dùng fallback
    }

    return [
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
  },
};
