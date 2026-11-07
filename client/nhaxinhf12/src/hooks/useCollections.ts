import { useState, useMemo, useEffect, useCallback } from "react";
import { useStore } from "./useStore";
import { useProductList, matchesCollection } from "./useProductList";
import { articleService } from "../services/articleService";
import type { AdminArticle } from "../services/admin/types";
import type { Product } from "../types/catalog";
import { Sofa, UtensilsCrossed, BedDouble, Palette, Sparkles } from "lucide-react";

export interface RoomFilterTab {
  id: string;
  name: string;
  categoryValue: string;
  icon: typeof Sofa;
  keywords: string[];
}

export const ROOM_FILTER_TABS: RoomFilterTab[] = [
  { id: "all", name: "Tất cả", categoryValue: "all", icon: Sparkles, keywords: [] },
  {
    id: "living",
    name: "Phòng khách",
    categoryValue: "phong-khach",
    icon: Sofa,
    keywords: ["phòng khách", "sofa", "bàn trà", "kệ tivi", "armchair"],
  },
  {
    id: "dining",
    name: "Phòng ăn",
    categoryValue: "phong-an",
    icon: UtensilsCrossed,
    keywords: ["phòng ăn", "bàn ăn", "ghế ăn", "tủ bếp", "sideboard"],
  },
  {
    id: "bedroom",
    name: "Phòng ngủ",
    categoryValue: "phong-ngu",
    icon: BedDouble,
    keywords: ["phòng ngủ", "giường", "tab đầu giường", "tủ áo", "bàn trang điểm"],
  },
  {
    id: "decor",
    name: "Trang trí",
    categoryValue: "trang-tri",
    icon: Palette,
    keywords: ["trang trí", "đèn", "thảm", "bình hoa", "gương", "decor"],
  },
];


/**
 * Custom hook quản lý logic, bộ lọc, bài viết và tương tác của trang Bộ sưu tập (collections.tsx)
 */
export function useCollections() {
  const store = useStore();
  const productList = useProductList();
  const {
    slug,
    allProducts,
    collections,
    activeCollectionInfo,
  } = productList;

  const [styleFilter, setStyleFilter] = useState<string>("all");
  const [collectionSearch, setCollectionSearch] = useState<string>("");
  const [serverArticles, setServerArticles] = useState<AdminArticle[]>([]);
  const [readingArticle, setReadingArticle] = useState<AdminArticle | null>(null);

  // Khóa cuộn trang khi mở modal đọc bài viết & hỗ trợ phím Esc
  useEffect(() => {
    if (readingArticle) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") setReadingArticle(null);
      };
      window.addEventListener("keydown", onKey);
      return () => {
        document.body.style.overflow = prev;
        window.removeEventListener("keydown", onKey);
      };
    }
  }, [readingArticle]);

  // Lấy danh sách sản phẩm thuộc một bộ sưu tập cụ thể
  const getCollectionProducts = useCallback((colSlug?: string): Product[] => {
    if (!colSlug) return [];
    const s = colSlug.toLowerCase().trim();
    const targetCol = collections.find(
      (c) =>
        c.slug.toLowerCase() === s ||
        Boolean(c.aliases?.some((a) => a.toLowerCase() === s)) ||
        s.includes(c.slug.toLowerCase())
    );
    if (targetCol) {
      const matched = allProducts.filter((p) => matchesCollection(p, targetCol));
      if (matched.length > 0) return matched;
    }
    const keywords = s.split(/[-_\s]+/);
    return allProducts.filter((p) => {
      const hay = `${p.name} ${p.category} ${p.description || ""} ${p.slug}`.toLowerCase();
      return keywords.some((kw) => kw.length > 2 && hay.includes(kw));
    });
  }, [collections, allProducts]);

  const readingArticleProducts = useMemo(() => {
    if (!readingArticle || !readingArticle.collectionSlug) return [];
    return getCollectionProducts(readingArticle.collectionSlug);
  }, [readingArticle, getCollectionProducts]);

  // Tải danh sách bài viết chuyên đề về Bộ sưu tập trực tiếp từ máy chủ Spring Boot
  useEffect(() => {
    articleService
      .getPublicArticles({ category: "Bộ sưu tập" })
      .then((list) => {
        if (list && list.length > 0) {
          setServerArticles(list);
        }
      })
      .catch((err) => console.warn("[Collections] Lỗi tải bài viết từ server:", err));
  }, []);

  // Tải bổ sung bài viết theo slug bộ sưu tập cụ thể khi người dùng truy cập trực tiếp URL
  useEffect(() => {
    if (slug) {
      articleService
        .getArticlesByCollection(slug)
        .then((list) => {
          if (list && list.length > 0) {
            setServerArticles((prev) => {
              const ids = new Set(prev.map((a) => a.id));
              const newItems = list.filter((a) => !ids.has(a.id));
              return [...prev, ...newItems];
            });
          }
        })
        .catch(() => {});
    }
  }, [slug]);

  // Tạo URL dẫn tới trang chi tiết bộ sưu tập tương ứng của bài viết
  const getArticleCollectionUrl = useCallback((art: AdminArticle): string => {
    if (art.collectionSlug && art.collectionSlug.trim()) {
      return `/bo-suu-tap/${encodeURIComponent(art.collectionSlug.trim().toLowerCase())}`;
    }
    const hay = `${art.title} ${art.slug}`.toLowerCase();
    if (hay.includes("orientale")) return "/bo-suu-tap/orientale";
    if (hay.includes("victoria")) return "/bo-suu-tap-victoria-3";
    if (hay.includes("hùng king") || hay.includes("hung-king"))
      return "/bst-hung-king-gia-tri-truyen-thong-net-dep-hien-dai";
    if (hay.includes("coastal")) return "/bo-suu-tap/coastal-living";
    if (hay.includes("đương đại") || hay.includes("duong-dai")) return "/bo-suu-tap/net-duong-dai";
    if (hay.includes("osaka") || hay.includes("japandi")) return "/bo-suu-tap/osaka";
    if (hay.includes("mây") || hay.includes("may")) return "/bo-suu-tap/may";
    return `/bo-suu-tap/${encodeURIComponent(art.slug)}`;
  }, []);

  // Lấy bài viết tương ứng với bộ sưu tập đang được kích hoạt (nếu có)
  const activeCollectionArticle = useMemo(() => {
    if (!activeCollectionInfo) return null;
    const s = activeCollectionInfo.slug.toLowerCase();
    const aliases = activeCollectionInfo.aliases?.map((a) => a.toLowerCase()) || [];
    return serverArticles.find((a) => {
      const colSlug = a.collectionSlug ? a.collectionSlug.toLowerCase().trim() : "";
      return (
        colSlug === s ||
        aliases.includes(colSlug) ||
        a.slug.toLowerCase().includes(s) ||
        (colSlug && s.includes(colSlug)) ||
        (s === "victoria" &&
          (colSlug.includes("victoria") ||
            a.slug.includes("victoria") ||
            a.title.toLowerCase().includes("victoria"))) ||
        (s === "hung-king" &&
          (colSlug.includes("hung") ||
            a.slug.includes("hung") ||
            a.title.toLowerCase().includes("hùng king"))) ||
        (s === "coastal-living" &&
          (colSlug.includes("coastal") || a.title.toLowerCase().includes("coastal"))) ||
        (s === "net-duong-dai" &&
          (colSlug.includes("duong-dai") || a.title.toLowerCase().includes("đương đại"))) ||
        (s === "osaka" &&
          (colSlug.includes("osaka") || a.title.toLowerCase().includes("japandi"))) ||
        (s === "may" &&
          (colSlug.includes("may") || a.title.toLowerCase().includes("mây")))
      );
    });
  }, [activeCollectionInfo, serverArticles]);

  // Bộ lọc phong cách cho trang tổng quan
  const styleTags = useMemo(() => {
    const tags = new Set<string>();
    collections.forEach((c) => {
      if (c.styleTag) tags.add(c.styleTag);
    });
    return [
      "all",
      "Tân cổ điển châu Âu",
      "Bản sắc Việt & Đương đại",
      "Hiện đại & Tối giản",
      "Japandi Zen",
      "Resort nhiệt đới",
      "Tropical & Mộc mạc",
      ...Array.from(tags),
    ].filter((v, i, self) => self.indexOf(v) === i);
  }, [collections]);

  const filteredCollections = useMemo(() => {
    const q = collectionSearch.trim().toLowerCase();
    return collections.filter((col) => {
      if (styleFilter !== "all") {
        const matchesStyle =
          col.styleTag.toLowerCase().includes(styleFilter.toLowerCase()) ||
          styleFilter.toLowerCase().includes(col.styleTag.toLowerCase());
        if (!matchesStyle) return false;
      }
      if (q) {
        const hay =
          `${col.name} ${col.subtitle} ${col.description} ${col.materials} ${col.styleTag}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [collections, styleFilter, collectionSearch]);

  const { paginatedItems: displayedProducts } = productList.pagination;

  // Tính số lượng sản phẩm thuộc từng phòng cho BST đang chọn
  const roomProductCounts = useMemo(() => {
    if (!activeCollectionInfo) return {} as Record<string, number>;
    const collectionProducts = allProducts.filter((p) =>
      matchesCollection(p, activeCollectionInfo)
    );
    const counts: Record<string, number> = {
      all: collectionProducts.length,
    };
    ROOM_FILTER_TABS.forEach((tab) => {
      if (tab.id === "all") return;
      const matchedInRoom = collectionProducts.filter((p) => {
        const cat = (p.category || "").toLowerCase();
        const hay = `${p.name} ${cat} ${p.description || ""}`.toLowerCase();
        return tab.keywords.some((kw) => hay.includes(kw));
      });
      counts[tab.id] = matchedInRoom.length;
    });
    return counts;
  }, [activeCollectionInfo, allProducts]);

  return {
    store,
    ...productList,
    displayedProducts,
    styleFilter,
    setStyleFilter,
    collectionSearch,
    setCollectionSearch,
    serverArticles,
    setServerArticles,
    readingArticle,
    setReadingArticle,
    getCollectionProducts,
    readingArticleProducts,
    getArticleCollectionUrl,
    activeCollectionArticle,
    styleTags,
    filteredCollections,
    roomProductCounts,
  };
}

