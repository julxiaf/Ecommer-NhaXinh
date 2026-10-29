/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useMemo, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import type { Product, CategoryItem } from "../types/catalog";
import { productService } from "../services/productService";
import { categoryService } from "../services/categoryService";
import { adminApi } from "../services/admin/adminService";
import { PRODUCT_GROUPS } from "../util/CONSTRAINT";
import { usePagination } from "./usePagination";

export type SortKey = "default" | "price-asc" | "price-desc" | "name" | "newest";

export interface CollectionInfo {
  slug: string;
  aliases?: string[];
  name: string;
  subtitle: string;
  styleTag: string;
  materials: string;
  description: string;
  bannerImage: string;
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

function getProductMaterialText(p: Product): string {
  const parts: string[] = [];
  if (p.specifications) parts.push(p.specifications);
  if (p.shortDescription) parts.push(p.shortDescription);
  if (p.description) parts.push(p.description);
  if (p.brand) parts.push(p.brand);
  return parts.join(" ");
}

function matchesCollection(product: Product, collection: CollectionInfo): boolean {
  const hay = `${product.name} ${product.category} ${getProductMaterialText(product)} ${product.slug}`.toLowerCase();
  return collection.keywords.some((kw) => hay.includes(kw.toLowerCase()));
}

export function useProductList() {
  const { slug } = useParams<{ slug?: string }>();
  const location = useLocation();
  const isCollectionRoute = location.pathname.startsWith("/bo-suu-tap");
  const isSpecialOfferRoute =
    location.pathname.startsWith("/khuyen-mai") ||
    location.pathname.startsWith("/uu-dai");

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

    // Đồng bộ thêm các Bộ sưu tập do Admin tạo trong quản trị danh mục
    adminApi
      .getCategories()
      .then((adminCats) => {
        const customCols = adminCats.filter(
          (c) =>
            !c.isDeleted &&
            c.slug !== "bo-suu-tap" &&
            (c.isCollection || c.parentId === "cat-collections") &&
            !DEFAULT_COLLECTIONS.some(
              (dc) => dc.slug === c.slug || dc.aliases?.includes(c.slug)
            )
        );
        if (customCols.length > 0) {
          const mapped: CollectionInfo[] = customCols.map((c) => ({
            slug: c.slug,
            name: c.name,
            subtitle:
              c.description ||
              `Bộ sưu tập nội thất ${c.name} thiết kế độc quyền bởi Nhà Xinh`,
            styleTag: "Signature Collection",
            materials: "Gỗ tự nhiên • Da & Vải cao cấp tuyển chọn",
            description:
              c.description ||
              `Khám phá các thiết kế tinh tế thuộc ${c.name}, mang đậm dấu ấn thẩm mỹ đương đại và công năng vượt trội.`,
            bannerImage:
              c.imageUrl ||
              "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
            keywords: [
              c.slug.replace(/-/g, " "),
              c.name.toLowerCase(),
              "sofa",
              "bàn",
              "ghế",
            ],
          }));
          setCollections([...DEFAULT_COLLECTIONS, ...mapped]);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;

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

  const activeCollectionInfo = useMemo(
    () =>
      isCollectionRoute && slug
        ? collections.find(
            (c) => c.slug === slug || c.aliases?.includes(slug)
          )
        : undefined,
    [isCollectionRoute, slug, collections]
  );

  const categoryFromSlug = useMemo(() => {
    if (activeCollectionInfo) return activeCollectionInfo.name;
    if (activeCategoryNode) return activeCategoryNode.name;
    if (slug) {
      const group = PRODUCT_GROUPS.find(
        (g) =>
          g.to === `/danh-muc/${slug}` ||
          g.items.some((i) => i.to === `/danh-muc/${slug}`)
      );
      if (group) {
        return group.title;
      }
      if (CATEGORY_MAP[slug]) return CATEGORY_MAP[slug];
    }
    return undefined;
  }, [activeCollectionInfo, activeCategoryNode, slug]);

  const categories = useMemo(() => {
    const apiNames = apiCategories.map((c) => c.name);
    const productCats = allProducts.map((p) => p.category).filter(Boolean);
    const cats = new Set<string>([...apiNames, ...productCats]);
    return ["all", ...Array.from(cats)];
  }, [allProducts, apiCategories]);

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
    } else if (isCollectionRoute && activeCollectionInfo) {
      const matched = list.filter((p) =>
        matchesCollection(p, activeCollectionInfo)
      );
      if (matched.length > 0) {
        list = matched;
      }
    }

    if (activeCat !== "all") {
      const allowedCats = PARENT_CATEGORY_CHILDREN[activeCat] || [activeCat];
      const matched = list.filter(
        (p) =>
          allowedCats.some(
            (ac) => ac.toLowerCase() === (p.category || "").toLowerCase()
          ) || p.name.toLowerCase().includes(activeCat.toLowerCase())
      );
      if (matched.length > 0 || selectedCat !== "all") {
        list = matched;
      }
    }

    if (selectedMaterial !== "all") {
      const matQ = selectedMaterial.toLowerCase();
      const matched = list.filter(
        (p) =>
          p.name.toLowerCase().includes(matQ) ||
          getProductMaterialText(p).toLowerCase().includes(matQ)
      );
      if (matched.length > 0) {
        list = matched;
      }
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
  ]);

  const pageTitle = isSpecialOfferRoute
    ? "Ưu Đãi Đặc Biệt"
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
    isCollectionRoute,
    isSpecialOfferRoute,
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
