/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useMemo, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import type { Product, CategoryItem } from "../types/catalog";
import { productService, DEFAULT_PLACEHOLDER_IMAGE } from "../services/productService";
import { categoryService } from "../services/categoryService";
import { adminApi } from "../services/admin/adminService";
import { articleService } from "../services/articleService";
import { parseCollectionMeta } from "../services/admin/catalogApi";
import { usePagination } from "./usePagination";
import { ENDPOINTS } from "../services/apiEndpoints";

export type SortKey = "default" | "price-asc" | "price-desc" | "name" | "newest";

export interface CollectionInfo {
  slug: string;
  aliases?: string[];
  name: string;
  subtitle: string;
  introQuote?: string;
  storyTitle?: string;
  styleTag: string;
  materials: string;
  description: string;
  bannerImage: string;
  videoUrl?: string;
  galleryImages?: string[];
  productIds?: number[];
  keywords: string[];
  productCount?: number;
  previewProducts?: Product[];
}

export const DEFAULT_COLLECTIONS: CollectionInfo[] = [
  {
    slug: "victoria",
    name: "Bộ Sưu Tập Victoria",
    subtitle: "Vẻ đẹp thanh lịch vượt thời gian từ cảm hứng tân cổ điển châu Âu",
    styleTag: "Modern Classic",
    materials: "Da bò Ý thượng hạng • Gỗ tần bì tự nhiên • Đá Marble Carrara",
    description:
      "Bộ sưu tập Victoria tôn vinh nghệ thuật chế tác thủ công tinh xảo với những đường may rút múi truyền thống, chất liệu da bò Ý mềm mại và khung gỗ tần bì ấm áp cho không gian phòng khách đẳng cấp.",
    bannerImage:
      "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=80",
    keywords: [
      "victoria",
      "sofa",
      "da bò",
      "bàn trà",
      "console",
      "giường",
      "cổ điển",
    ],
  },
  {
    slug: "net-duong-dai",
    aliases: ["duong-dai"],
    name: "Bộ Sưu Tập Nét Đương Đại",
    subtitle: "Tối giản đường nét, tối đa công năng cho căn hộ đô thị hiện đại",
    styleTag: "Contemporary Minimalist",
    materials: "Vải nỉ Bouclé Bỉ • Kim loại sơn tĩnh điện • Gỗ sồi hun khói",
    description:
      "Lấy cảm hứng từ nhịp sống năng động tại các đô thị lớn, Nét Đương Đại mang đến những thiết kế gọn gàng, tỷ lệ chuẩn xác và bảng màu trung tính sang trọng dễ dàng phối hợp mọi không gian.",
    bannerImage:
      "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
    keywords: [
      "đương đại",
      "hiện đại",
      "nordic",
      "sofa",
      "bàn",
      "tủ",
      "kệ",
      "orbit",
    ],
  },
  {
    slug: "osaka",
    aliases: ["osaka-japandi"],
    name: "Bộ Sưu Tập Osaka (Japandi)",
    subtitle: "Sự giao thoa tĩnh tại giữa triết lý Wabi-Sabi Nhật Bản & Bắc Âu",
    styleTag: "Japandi Zen",
    materials: "Gỗ sồi trắng tự nhiên • Mây đan thủ công • Vải Linen hữu cơ",
    description:
      "Osaka là bản giao hưởng nhẹ nhàng của gỗ tự nhiên sáng màu, đường cong bo tròn an toàn và chất liệu vải Linen thoáng mát, kiến tạo tổ ấm bình yên sau mỗi ngày làm việc.",
    bannerImage:
      "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1200&q=80",
    keywords: ["osaka", "japandi", "armchair", "ghế", "bàn", "gỗ", "bắc âu"],
  },
  {
    slug: "coastal-living",
    aliases: ["coastal"],
    name: "Bộ Sưu Tập Coastal Living",
    subtitle: "Hơi thở miền nhiệt đới phóng khoáng với sắc kem cát biển & ánh nắng",
    styleTag: "Tropical Resort",
    materials: "Gỗ Teak tự nhiên • Vải Linen màu cát biển • Đá tự nhiên",
    description:
      "Mang cảm giác nghỉ dưỡng resort 5 sao vào ngôi nhà của bạn với bảng màu kem sáng, xanh biển nhạt cùng chất liệu gỗ ấm áp, đón trọn ánh sáng và gió tự nhiên.",
    bannerImage:
      "https://images.unsplash.com/photo-1540518614846-7ede433c4578?auto=format&fit=crop&w=1200&q=80",
    keywords: [
      "coastal",
      "đèn",
      "thảm",
      "trang trí",
      "ghế",
      "thư giãn",
      "linen",
    ],
  },
];

const CATEGORY_MAP: Record<string, string> = {
  "phong-khach": "Phòng khách",
  "phong-an": "Phòng ăn",
  "phong-ngu": "Phòng ngủ",
  "phong-lam-viec": "Phòng làm việc",
  "trang-tri": "Trang trí",
  sofa: "Sofa",
  "sofa-goc": "Sofa góc",
  "sofa-da": "Sofa da",
  "sofa-vai": "Sofa vải",
  "sofa-bang": "Sofa băng",
  "ghe-thu-gian": "Ghế thư giãn",
  armchair: "Armchair",
  "ghe-armchair": "Ghế Armchair",
  "ghe-dai-don": "Ghế dài & Đôn",
  "ban-nuoc": "Bàn",
  "ban-ben": "Bàn",
  "ban-console": "Bàn",
  "tu-tivi": "Tủ & kệ",
  "ke-trung-bay": "Tủ & kệ",
  "tu-giay": "Tủ & kệ",
  "ban-an": "Bàn",
  "ghe-an": "Ghế",
  "ghe-bar": "Ghế",
  "tu-ly": "Tủ & kệ",
  "xe-day": "Tủ & kệ",
  giuong: "Giường & nệm",
  "giuong-ngu": "Giường & nệm",
  "tu-va-ke": "Tủ & kệ",
  "giuong-va-nem": "Giường & nệm",
  ban: "Bàn",
  ghe: "Ghế",
  bep: "Bếp",
  den: "Đèn & thảm",
};

const PARENT_CATEGORY_CHILDREN: Record<string, string[]> = {
  "Phòng khách": ["Phòng khách", "Sofa", "Bàn", "Ghế", "Tủ & kệ", "Đèn & thảm"],
  "Phòng ăn": ["Phòng ăn", "Bàn", "Ghế", "Tủ & kệ", "Bếp"],
  "Phòng ngủ": ["Phòng ngủ", "Giường & nệm", "Tủ & kệ", "Đèn & thảm"],
  "Phòng làm việc": ["Phòng làm việc", "Bàn", "Ghế", "Tủ & kệ"],
  "Trang trí": ["Trang trí", "Đèn & thảm"],
};



const isRoomNameOrSlug = (nameOrSlug?: string | null) => {
  if (!nameOrSlug) return false;
  const s = nameOrSlug.toLowerCase().trim();
  return (
    s.startsWith("phòng") ||
    s.startsWith("phong") ||
    s.startsWith("phong-") ||
    s === "phong-khach" ||
    s === "phong-an" ||
    s === "phong-ngu" ||
    s === "phong-lam-viec" ||
    s === "ngoai-that" ||
    s === "bep"
  );
};

const isCollectionNameOrSlug = (nameOrSlug?: string | null) => {
  if (!nameOrSlug) return false;
  const s = nameOrSlug.toLowerCase().trim();
  return (
    s.includes("bộ sưu tập") ||
    s.includes("bo suu tap") ||
    s.includes("victoria") ||
    s.includes("duong-dai") ||
    s.includes("đương đại") ||
    s.includes("osaka") ||
    s.includes("coastal") ||
    s.includes("hung-king") ||
    s.includes("hùng king") ||
    s.includes("may") ||
    s.includes("mây") ||
    s.includes("valencia")
  );
};

const isTestNameOrSlug = (nameOrSlug?: string | null) => {
  if (!nameOrSlug) return false;
  const s = nameOrSlug.toLowerCase().trim();
  return s.includes("test");
};

function getProductMaterialText(p: Product): string {
  const parts: string[] = [];
  if (p.specifications) parts.push(p.specifications);
  if (p.shortDescription) parts.push(p.shortDescription);
  if (p.description) parts.push(p.description);
  if (p.brand) parts.push(p.brand);
  return parts.join(" ");
}

export function matchesCollection(product: Product, collection: CollectionInfo): boolean {
  // 1. Nếu Admin đã gắn danh sách sản phẩm cụ thể (productIds) cho Bộ sưu tập này
  if (collection.productIds && collection.productIds.length > 0) {
    if (collection.productIds.includes(Number(product.id))) {
      return true;
    }
    return false;
  }

  // 2. Đối chiếu theo danh mục / slug / từ khóa
  const pCat = (product.category || "").toLowerCase();
  const cName = collection.name.toLowerCase();
  const cSlug = collection.slug.toLowerCase();
  if (pCat && (pCat === cName || pCat === cSlug || cName.includes(pCat) || pCat.includes(cSlug))) {
    return true;
  }
  if (collection.aliases?.some((a) => pCat.includes(a.toLowerCase()) || product.slug.toLowerCase().includes(a.toLowerCase()))) {
    return true;
  }
  const hay = `${product.name} ${product.category || ""} ${getProductMaterialText(product)} ${product.slug}`.toLowerCase();
  return collection.keywords.some((kw) => kw.length > 2 && hay.includes(kw.toLowerCase()));
}

export function useProductList() {
  const params = useParams<{ slug?: string }>();
  const location = useLocation();
  const rawPath = location.pathname.replace(/^\/|\/$/g, "");

  // Resolve collection slug whether route is /bo-suu-tap/:slug, /bo-suu-tap-:slug, or /bst-:slug
  let slug = params.slug;
  if (!slug) {
    if (rawPath.startsWith("bo-suu-tap-")) {
      slug = rawPath.replace(/^bo-suu-tap-/, "");
    } else if (rawPath.startsWith("bst-")) {
      slug = rawPath;
    }
  }

  const isCollectionRoute =
    location.pathname.startsWith("/bo-suu-tap") ||
    location.pathname.startsWith("/bst-");
  const isSpecialOfferRoute =
    location.pathname.startsWith("/khuyen-mai") ||
    location.pathname.startsWith("/uu-dai") ||
    location.pathname.startsWith("/giam-gia-dac-biet");
  const isNewProductRoute =
    slug === "san-pham-moi" ||
    location.pathname === "/san-pham-moi" ||
    location.pathname === "/danh-muc/san-pham-moi";
  const isRoomRoute =
    location.pathname.startsWith("/phong") ||
    slug === "phong-khach" ||
    slug === "phong-an" ||
    slug === "phong-ngu" ||
    slug === "phong-lam-viec";

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [apiCategories, setApiCategories] = useState<CategoryItem[]>([]);
  const [collections, setCollections] =
    useState<CollectionInfo[]>(DEFAULT_COLLECTIONS);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortKey>("default");
  const [selectedCat, setSelectedCat] = useState<string>("all");
  const [selectedMaterial, setSelectedMaterial] = useState<string>("all");
  const [priceRange, setPriceRange] = useState<[number, number]>([
    0, 100_000_000,
  ]);
  const [searchQuery, setSearchQuery] = useState("");
  const [gridCols, setGridCols] = useState<3 | 4>(3);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    categoryService
      .getCategories()
      .then((cats) => {
        if (cats && cats.length > 0) setApiCategories(cats);
      })
      .catch(() => {});

    // Đồng bộ Bộ sưu tập trực tiếp từ hệ thống Backend Spring Boot & MySQL (/api/v1/collections)
    Promise.all([
      fetch(ENDPOINTS.COLLECTIONS.BASE, {
        headers: { "Content-Type": "application/json" },
      })
        .then((r) => (r.ok ? (r.json() as Promise<Array<Record<string, unknown>>>) : []))
        .catch(() => [] as Array<Record<string, unknown>>),
      adminApi.getCategories().catch(() => []),
      articleService.getPublicArticles({ category: "Bộ sưu tập" }).catch(() => []),
    ]).then(([backendCollections, backendCats, backendArticles]) => {
      const loadedMap = new Map<string, CollectionInfo>();

      // 1. Nạp từ bảng collections thật (/api/v1/collections)
      if (Array.isArray(backendCollections)) {
        backendCollections
          .filter(
            (c) =>
              !c.isDeleted &&
              String(c.status || "").toUpperCase() !== "DRAFT" &&
              String(c.status || "").toUpperCase() !== "ARCHIVED" &&
              !String(c.name || "").toLowerCase().includes("test") &&
              !String(c.slug || "").toLowerCase().includes("test")
          )
          .forEach((c) => {
            const rawSlug = String(c.slug || "");
            const rawName = String(c.name || "");
            const rawDesc = typeof c.description === "string" ? c.description : null;
            const rawCover = typeof c.coverImageUrl === "string" ? c.coverImageUrl : null;

            const { cleanDescription, meta } = parseCollectionMeta(rawDesc);
            const defaultMatch = DEFAULT_COLLECTIONS.find(
              (dc) => dc.slug === rawSlug || dc.aliases?.includes(rawSlug)
            );
            const matchingArticle = backendArticles.find(
              (a) => a.collectionSlug?.toLowerCase() === rawSlug.toLowerCase()
            );

            loadedMap.set(rawSlug, {
              slug: rawSlug,
              aliases: Array.from(new Set([rawSlug, ...(defaultMatch?.aliases || [])])),
              name: rawName,
              subtitle:
                meta.subtitle ||
                matchingArticle?.title ||
                defaultMatch?.subtitle ||
                `Câu chuyện của sự khởi đầu`,
              introQuote:
                meta.introQuote ||
                defaultMatch?.introQuote ||
                `“${rawName.toUpperCase()}” – một cái tên đầy ý nghĩa với mong muốn tạo ra những kết nối tinh tế, để cùng nhau dệt nên câu chuyện không gian sống đầy cảm hứng.`,
              storyTitle:
                meta.storyTitle ||
                defaultMatch?.storyTitle ||
                "Chất liệu cao cấp tạo trải nghiệm đẳng cấp",
              styleTag: meta.styleTag || defaultMatch?.styleTag || "Signature Collection",
              materials:
                meta.materials ||
                defaultMatch?.materials ||
                "Gỗ tự nhiên cao cấp • Da thật & Vải dệt tuyển chọn",
              description:
                cleanDescription ||
                matchingArticle?.summary ||
                defaultMatch?.description ||
                `Khám phá các thiết kế tinh tế thuộc ${rawName}, mang đậm dấu ấn thẩm mỹ đương đại và công năng vượt trội.`,
              bannerImage:
                rawCover ||
                matchingArticle?.image ||
                defaultMatch?.bannerImage ||
                DEFAULT_PLACEHOLDER_IMAGE,
              videoUrl: meta.videoUrl || defaultMatch?.videoUrl,
              galleryImages:
                meta.galleryImages && meta.galleryImages.length > 0
                  ? meta.galleryImages
                  : defaultMatch?.galleryImages || [
                      rawCover || defaultMatch?.bannerImage || DEFAULT_PLACEHOLDER_IMAGE,
                    ],
              productIds: meta.productIds || defaultMatch?.productIds,
              keywords: Array.from(
                new Set([
                  rawSlug,
                  rawSlug.replace(/-/g, " "),
                  ...rawName.toLowerCase().split(/\s+/),
                  ...(defaultMatch?.keywords || []),
                ])
              ),
            });
          });
      }

      // 2. Nạp thêm các danh mục thuộc nhóm COLLECTION từ categories (nếu chưa có trong loadedMap)
      const rootColCat = backendCats.find(
        (c) => c.slug === "bo-suu-tap" || c.name.toLowerCase().includes("bộ sưu tập")
      );
      const rootId = rootColCat ? rootColCat.id : null;

      const collectionCategories = backendCats.filter(
        (c) =>
          !c.isDeleted &&
          c.slug !== "bo-suu-tap" &&
          !c.name.toLowerCase().includes("test") &&
          !c.slug.toLowerCase().includes("test") &&
          (c.isCollection ||
            c.categoryGroup === "COLLECTION" ||
            (rootId && String(c.parentId) === String(rootId)) ||
            c.parentId === "cat-collections")
      );

      collectionCategories.forEach((c) => {
        if (!loadedMap.has(c.slug)) {
          const { cleanDescription, meta } = parseCollectionMeta(c.description);
          const defaultMatch = DEFAULT_COLLECTIONS.find(
            (dc) => dc.slug === c.slug || dc.aliases?.includes(c.slug)
          );
          const matchingArticle = backendArticles.find(
            (a) => a.collectionSlug?.toLowerCase() === c.slug.toLowerCase()
          );

          loadedMap.set(c.slug, {
            slug: c.slug,
            aliases: Array.from(new Set([c.slug, ...(defaultMatch?.aliases || [])])),
            name: c.name,
            subtitle:
              meta.subtitle ||
              c.subtitle ||
              matchingArticle?.title ||
              defaultMatch?.subtitle ||
              `Câu chuyện của sự khởi đầu`,
            introQuote:
              meta.introQuote ||
              c.introQuote ||
              defaultMatch?.introQuote ||
              `“${c.name.toUpperCase()}” – một cái tên đầy ý nghĩa với mong muốn tạo ra những kết nối tinh tế, để cùng nhau dệt nên câu chuyện không gian sống đầy cảm hứng.`,
            storyTitle:
              meta.storyTitle ||
              c.storyTitle ||
              defaultMatch?.storyTitle ||
              "Chất liệu cao cấp tạo trải nghiệm đẳng cấp",
            styleTag: meta.styleTag || c.styleTag || defaultMatch?.styleTag || "Signature Collection",
            materials:
              meta.materials ||
              c.materials ||
              defaultMatch?.materials ||
              "Gỗ tự nhiên cao cấp • Da thật & Vải dệt tuyển chọn",
            description:
              cleanDescription ||
              c.description ||
              matchingArticle?.summary ||
              defaultMatch?.description ||
              `Khám phá các thiết kế tinh tế thuộc ${c.name}, mang đậm dấu ấn thẩm mỹ đương đại và công năng vượt trội.`,
            bannerImage:
              c.imageUrl ||
              matchingArticle?.image ||
              defaultMatch?.bannerImage ||
              DEFAULT_PLACEHOLDER_IMAGE,
            videoUrl: meta.videoUrl || c.videoUrl || defaultMatch?.videoUrl,
            galleryImages:
              meta.galleryImages && meta.galleryImages.length > 0
                ? meta.galleryImages
                : c.galleryImages && c.galleryImages.length > 0
                ? c.galleryImages
                : defaultMatch?.galleryImages || [
                    c.imageUrl || defaultMatch?.bannerImage || DEFAULT_PLACEHOLDER_IMAGE,
                  ],
            productIds: meta.productIds || c.productIds || defaultMatch?.productIds,
            keywords: Array.from(
              new Set([
                c.slug,
                c.slug.replace(/-/g, " "),
                ...c.name.toLowerCase().split(/\s+/),
                ...(defaultMatch?.keywords || []),
              ])
            ),
          });
        }
      });

      if (loadedMap.size > 0) {
        setCollections(Array.from(loadedMap.values()));
      }
    });
  }, []);

  useEffect(() => {
    let active = true;

    // Tự động làm mới và reset bộ lọc khi chuyển route giữa các danh mục / sản phẩm mới / tất cả sản phẩm
    setSelectedCat("all");
    setSelectedMaterial("all");
    setSearchQuery("");
    setPriceRange([0, 100_000_000]);
    setSortBy(isNewProductRoute ? "newest" : "default");

    // Chuyển việc cập nhật loading sang microtask để tránh gọi setState đồng bộ trong thân effect
    Promise.resolve().then(() => {
      if (active) setLoading(true);
    });

    productService
      .getProductsFromApi({ size: 100 })
      .then((prods) => {
        if (!active) return;
        setAllProducts(prods || []);
      })
      .catch((err) => {
        console.error("[useProductList] Lỗi tải sản phẩm từ API:", err);
        if (active) setAllProducts([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [location.pathname, slug]);

  const activeCategoryNode = useMemo(
    () => (slug ? apiCategories.find((cat) => cat.slug === slug) : undefined),
    [apiCategories, slug]
  );

  const activeCollectionInfo = useMemo(() => {
    if (!isCollectionRoute || !slug) return undefined;
    const s = slug.toLowerCase().trim();
    return collections.find((c) => {
      const colSlug = c.slug.toLowerCase();
      const aliases = c.aliases?.map((a) => a.toLowerCase()) || [];
      return (
        colSlug === s ||
        aliases.includes(s) ||
        s.includes(colSlug) ||
        aliases.some((a) => s.includes(a) || a.includes(s))
      );
    });
  }, [isCollectionRoute, slug, collections]);

  const categoryFromSlug = useMemo(() => {
    if (activeCollectionInfo) return activeCollectionInfo.name;
    if (activeCategoryNode) return activeCategoryNode.name;
    if (slug) {
      if (CATEGORY_MAP[slug]) return CATEGORY_MAP[slug];
      return slug
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    }
    return undefined;
  }, [activeCollectionInfo, activeCategoryNode, slug]);

  const categories = useMemo(() => {
    if (isRoomRoute) {
      // 1. Nếu đang ở phân loại Không gian phòng (/phong hoặc /phong/:slug)
      const roomCatsFromApi = apiCategories
        .filter((c) => {
          const group = (c.categoryGroup || "").toUpperCase();
          return group === "ROOM" || isRoomNameOrSlug(c.name) || isRoomNameOrSlug(c.slug);
        })
        .map((c) => c.name);

      const roomSet = new Set<string>([
        "Phòng khách",
        "Phòng ăn",
        "Phòng ngủ",
        "Phòng làm việc",
        ...roomCatsFromApi,
      ]);

      return ["all", ...Array.from(roomSet)];
    }

    // 2. Nếu là danh mục Sản phẩm (/san-pham, /danh-muc/:slug, /san-pham-moi, v.v.)
    // CHỈ LẤY DANH MỤC CỦA SẢN PHẨM: Tuyệt đối không đưa cả Bộ sưu tập hay Phòng vào!
    const productApiCats = apiCategories
      .filter((c) => {
        const group = (c.categoryGroup || "").toUpperCase();
        if (group === "ROOM" || group === "COLLECTION" || group === "PAGE" || group === "STATIC") {
          return false;
        }
        if (c.isCollection) return false;
        if (isRoomNameOrSlug(c.name) || isRoomNameOrSlug(c.slug)) return false;
        if (isCollectionNameOrSlug(c.name) || isCollectionNameOrSlug(c.slug)) return false;
        if (isTestNameOrSlug(c.name) || isTestNameOrSlug(c.slug)) return false;
        return true;
      })
      .map((c) => c.name);

    const validProductCats = allProducts
      .map((p) => p.category)
      .filter((cat): cat is string => {
        if (!cat) return false;
        if (isRoomNameOrSlug(cat)) return false;
        if (isCollectionNameOrSlug(cat)) return false;
        if (isTestNameOrSlug(cat)) return false;
        return true;
      });

    const defaultStandardProductCategories = [
      "Sofa",
      "Bàn",
      "Ghế",
      "Tủ & kệ",
      "Giường & nệm",
      "Đèn & Trang trí",
    ];

    const cats = new Set<string>([
      ...defaultStandardProductCategories,
      ...productApiCats,
      ...validProductCats,
    ]);

    return ["all", ...Array.from(cats)];
  }, [allProducts, apiCategories, isRoomRoute]);

  const materials = useMemo(() => {
    return ["all", "Gỗ sồi", "Da bò", "Vải nỉ", "Đá Marble", "Kim loại"];
  }, []);

  // Tính số lượng sản phẩm và danh sách mẫu cho từng Bộ sưu tập
  const collectionsWithCounts = useMemo(() => {
    return collections.map((col) => {
      const matched = allProducts.filter((p) => matchesCollection(p, col));
      return {
        ...col,
        productCount: matched.length,
        previewProducts: matched.slice(0, 3),
      };
    });
  }, [collections, allProducts]);

  const activeCat =
    !isCollectionRoute && categoryFromSlug && selectedCat === "all"
      ? categoryFromSlug
      : selectedCat;

  const filtered = useMemo(() => {
    let list = [...allProducts];
    const q = searchQuery.trim().toLowerCase();

    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.category || "").toLowerCase().includes(q) ||
          getProductMaterialText(p).toLowerCase().includes(q)
      );
    }

    if (isSpecialOfferRoute) {
      list = list.filter(
        (p) =>
          (p.discount && p.discount > 0) ||
          (p.originalPrice && p.originalPrice > p.price)
      );
    } else if (isNewProductRoute) {
      // Ưu tiên các sản phẩm mới có cờ isNew hoặc xếp sản phẩm mới nhất lên đầu
      const newItems = list.filter((p) => p.isNew);
      if (newItems.length > 0) {
        list = newItems;
      }
      list.sort((a, b) => b.id - a.id);
    } else if (isCollectionRoute && activeCollectionInfo) {
      list = list.filter((p) =>
        matchesCollection(p, activeCollectionInfo)
      );
    }

    if (activeCat !== "all" && !isNewProductRoute) {
      const allowedCats = PARENT_CATEGORY_CHILDREN[activeCat] || [activeCat];
      list = list.filter(
        (p) =>
          allowedCats.some(
            (ac) => ac.toLowerCase() === (p.category || "").toLowerCase()
          ) || p.name.toLowerCase().includes(activeCat.toLowerCase())
      );
    }

    if (selectedMaterial !== "all") {
      const matQ = selectedMaterial.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(matQ) ||
          getProductMaterialText(p).toLowerCase().includes(matQ)
      );
    }

    list = list.filter(
      (p) => p.price >= priceRange[0] && p.price <= priceRange[1]
    );

    if (sortBy === "price-asc") list.sort((a, b) => a.price - b.price);
    else if (sortBy === "price-desc") list.sort((a, b) => b.price - a.price);
    else if (sortBy === "name")
      list.sort((a, b) => a.name.localeCompare(b.name, "vi"));
    else if (sortBy === "newest")
      list.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));

    return list;
  }, [
    allProducts,
    searchQuery,
    activeCat,
    selectedCat,
    activeCollectionInfo,
    selectedMaterial,
    priceRange,
    sortBy,
    isCollectionRoute,
    isSpecialOfferRoute,
    isNewProductRoute,
  ]);

  const pagination = usePagination(filtered, 9, [
    slug,
    searchQuery,
    activeCat,
    selectedMaterial,
    priceRange[0],
    priceRange[1],
    sortBy,
    isCollectionRoute,
    isSpecialOfferRoute,
    isNewProductRoute,
  ]);

  const pageTitle = isSpecialOfferRoute
    ? "Giảm Giá Đặc Biệt & Ưu Đãi"
    : isNewProductRoute
    ? "Sản Phẩm Mới"
    : isCollectionRoute
    ? activeCollectionInfo?.name || "Bộ Sưu Tập Thiết Kế"
    : categoryFromSlug ||
      (selectedCat === "all" ? "Tất Cả Sản Phẩm" : selectedCat);

  const handleResetFilters = () => {
    setSelectedCat("all");
    setSelectedMaterial("all");
    setPriceRange([0, 100_000_000]);
    setSearchQuery("");
    setSortBy("default");
  };

  return {
    slug,
    allProducts,
    isCollectionRoute,
    isSpecialOfferRoute,
    isNewProductRoute,
    isRoomRoute,
    collections: collectionsWithCounts,
    activeCollectionInfo,
    loading,
    sortBy,
    setSortBy,
    selectedCat,
    setSelectedCat,
    selectedMaterial,
    setSelectedMaterial,
    priceRange,
    setPriceRange,
    searchQuery,
    setSearchQuery,
    gridCols,
    setGridCols,
    sidebarOpen,
    setSidebarOpen,
    categories,
    materials,
    categoryFromSlug,
    activeCat,
    filtered,
    pagination,
    pageTitle,
    handleResetFilters,
  };
}
