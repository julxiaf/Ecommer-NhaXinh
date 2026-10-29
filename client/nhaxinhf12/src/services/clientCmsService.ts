// ══════════════════════════════════════════════════════════
// CLIENT CMS SERVICE: Quản lý Menu, Hero Banner & Pandora Suggestion
// ══════════════════════════════════════════════════════════

import { NAV } from "../util/CONSTRAINT";
import img1 from "../assets/image_sequence/ezgif-frame-001.png";
import img8 from "../assets/image_sequence/ezgif-frame-070.png";
import img10 from "../assets/image_sequence/ezgif-frame-090.png";
import img13 from "../assets/image_sequence/ezgif-frame-110.png";

export interface ClientMenuItem {
  id: string;
  label: string;
  to: string;
  kind: "link" | "products" | "rooms" | "brands";
  isVisible: boolean;
  order: number;
  badge?: string;
  isExternal?: boolean;
}

export interface HeroBannerAction {
  label: string;
  url: string;
  isPrimary?: boolean;
}

export interface HeroBannerItem {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  backgroundImage: string;
  actions: HeroBannerAction[];
  isActive: boolean;
  order: number;
}

export interface PandoraProductItem {
  id: string;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  image: string;
  tag: string;
  url: string;
  rating?: number;
  isNew?: boolean;
}

export interface PandoraSuggestionConfig {
  isEnabled: boolean;
  badgeTitle: string;
  mainTitle: string;
  subtitle: string;
  bannerImage?: string;
  curatedTagFilter: string[];
  apiLimit?: number;
  products: PandoraProductItem[];
}

const STORAGE_KEYS = {
  MENU: "nhaxinh_cms_navigation_menu_v2",
  BANNERS: "nhaxinh_cms_hero_banners_v2",
  PANDORA: "nhaxinh_cms_pandora_suggestion_v2",
};

export const CMS_EVENTS = {
  MENU_UPDATED: "nhaxinh_cms_menu_updated",
  BANNERS_UPDATED: "nhaxinh_cms_banners_updated",
  PANDORA_UPDATED: "nhaxinh_cms_pandora_updated",
};

// ── Dữ liệu mặc định cho Menu ──
const DEFAULT_MENU_ITEMS: ClientMenuItem[] = NAV.map((item, idx) => ({
  id: `nav-${idx + 1}-${item.label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
  label: item.label,
  to: item.to,
  kind: item.kind,
  isVisible: true,
  order: idx + 1,
}));

// ── Dữ liệu mặc định cho Hero Banners ──
const DEFAULT_HERO_BANNERS: HeroBannerItem[] = [
  {
    id: "banner-1",
    subtitle: "BỘ SƯU TẬP MỚI",
    title: "Victoria",
    description: "Từ cảm hứng miền quê Pháp đến cảm xúc ngôi nhà Việt với đường cong mềm mại và tông màu ấm áp.",
    backgroundImage: img1,
    actions: [{ label: "Khám phá ngay", url: "/bo-suu-tap/victoria", isPrimary: true }],
    isActive: true,
    order: 1,
  },
  {
    id: "banner-2",
    subtitle: "BỘ SƯU TẬP",
    title: "Nét Đương Đại",
    description: "Thiết kế tinh giản, hiện đại và phù hợp với những không gian sống trẻ trung.",
    backgroundImage: img8,
    actions: [
      { label: "Khám phá", url: "/bo-suu-tap/net-duong-dai", isPrimary: true },
      { label: "Xem sản phẩm", url: "/products", isPrimary: false },
    ],
    isActive: true,
    order: 2,
  },
  {
    id: "banner-3",
    subtitle: "PHÒNG KHÁCH",
    title: "Không gian kết nối",
    description: "Những thiết kế sofa và bàn ghế mang đến sự thoải mái và tinh tế cho phòng khách.",
    backgroundImage: img10,
    actions: [{ label: "Xem sofa", url: "/category/sofa", isPrimary: true }],
    isActive: true,
    order: 3,
  },
  {
    id: "banner-4",
    subtitle: "PHÒNG NGỦ",
    title: "Chạm vào sự thư thái",
    description: "Kiến tạo không gian nghỉ ngơi ấm áp với những thiết kế nội thất phòng ngủ tinh tế.",
    backgroundImage: img13,
    actions: [{ label: "Khám phá phòng ngủ", url: "/category/phong-ngu", isPrimary: true }],
    isActive: true,
    order: 4,
  },
];

// ── Dữ liệu mặc định cho Pandora Suggestion ──
const DEFAULT_PANDORA_CONFIG: PandoraSuggestionConfig = {
  isEnabled: true,
  badgeTitle: "PANDORA EXCLUSIVE SUGGESTION",
  mainTitle: "Gợi Ý Không Gian Tinh Tế Dành Riêng Cho Bạn",
  subtitle: "Tuyển tập thiết kế nội thất mang linh hồn nghệ thuật Pandora — nơi sự thanh lịch giao hòa cùng công năng hiện đại.",
  bannerImage: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
  curatedTagFilter: ["Tất cả", "Sofa", "Bàn", "Ghế", "Giường", "Tủ"],
  apiLimit: 8,
  products: [
    {
      id: "pandora-1",
      name: "Armchair Pandora Velvet Emerald",
      category: "Sofa & Ghế Thư Giãn",
      price: 15800000,
      originalPrice: 19500000,
      image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=600&q=80",
      tag: "Hộp quà Pandora",
      url: "/san-pham/armchair-flow-green",
      rating: 5,
      isNew: true,
    },
    {
      id: "pandora-2",
      name: "Bàn trà Pandora Marble Royal Brass",
      category: "Bàn Ăn Tinh Hoa",
      price: 12500000,
      originalPrice: 14800000,
      image: "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=600&q=80",
      tag: "Bán chạy nhất",
      url: "/products",
      rating: 4.9,
    },
    {
      id: "pandora-3",
      name: "Đèn thả chùm Pandora Celestial Glow",
      category: "Đèn Trang Trí Nghệ Thuật",
      price: 8900000,
      originalPrice: 11200000,
      image: "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=600&q=80",
      tag: "Ưu đãi 20%",
      url: "/products",
      rating: 4.8,
      isNew: true,
    },
    {
      id: "pandora-4",
      name: "Giường ngủ Master Pandora Elegance Oak",
      category: "Phòng Ngủ Quý Phái",
      price: 28900000,
      originalPrice: 34500000,
      image: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=600&q=80",
      tag: "Độc quyền Nhà Xinh",
      url: "/products",
      rating: 5,
    },
  ],
};

class ClientCmsService {
  // ── MENU CMS ──
  getMenuItems(): ClientMenuItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MENU);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.sort((a, b) => a.order - b.order);
        }
      }
    } catch (e) {
      console.warn("Lỗi đọc menu CMS từ localStorage:", e);
    }
    return [...DEFAULT_MENU_ITEMS];
  }

  saveMenuItems(items: ClientMenuItem[]): void {
    try {
      const sorted = [...items].sort((a, b) => a.order - b.order);
      localStorage.setItem(STORAGE_KEYS.MENU, JSON.stringify(sorted));
      window.dispatchEvent(new Event(CMS_EVENTS.MENU_UPDATED));
    } catch (e) {
      console.error("Lỗi lưu menu CMS:", e);
    }
  }

  resetMenuItems(): ClientMenuItem[] {
    localStorage.removeItem(STORAGE_KEYS.MENU);
    window.dispatchEvent(new Event(CMS_EVENTS.MENU_UPDATED));
    return [...DEFAULT_MENU_ITEMS];
  }

  // ── HERO BANNERS CMS ──
  getHeroBanners(): HeroBannerItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BANNERS);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.sort((a, b) => a.order - b.order);
        }
      }
    } catch (e) {
      console.warn("Lỗi đọc hero banners CMS từ localStorage:", e);
    }
    return [...DEFAULT_HERO_BANNERS];
  }

  saveHeroBanners(banners: HeroBannerItem[]): void {
    try {
      const sorted = [...banners].sort((a, b) => a.order - b.order);
      localStorage.setItem(STORAGE_KEYS.BANNERS, JSON.stringify(sorted));
      window.dispatchEvent(new Event(CMS_EVENTS.BANNERS_UPDATED));
    } catch (e) {
      console.error("Lỗi lưu hero banners CMS:", e);
    }
  }

  resetHeroBanners(): HeroBannerItem[] {
    localStorage.removeItem(STORAGE_KEYS.BANNERS);
    window.dispatchEvent(new Event(CMS_EVENTS.BANNERS_UPDATED));
    return [...DEFAULT_HERO_BANNERS];
  }

  // ── PANDORA SUGGESTION CMS ──
  getPandoraConfig(): PandoraSuggestionConfig {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PANDORA);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === "object") {
          return { ...DEFAULT_PANDORA_CONFIG, ...parsed };
        }
      }
    } catch (e) {
      console.warn("Lỗi đọc Pandora Suggestion CMS từ localStorage:", e);
    }
    return { ...DEFAULT_PANDORA_CONFIG };
  }

  savePandoraConfig(config: PandoraSuggestionConfig): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PANDORA, JSON.stringify(config));
      window.dispatchEvent(new Event(CMS_EVENTS.PANDORA_UPDATED));
    } catch (e) {
      console.error("Lỗi lưu Pandora Suggestion CMS:", e);
    }
  }

  resetPandoraConfig(): PandoraSuggestionConfig {
    localStorage.removeItem(STORAGE_KEYS.PANDORA);
    window.dispatchEvent(new Event(CMS_EVENTS.PANDORA_UPDATED));
    return { ...DEFAULT_PANDORA_CONFIG };
  }
}

export const clientCmsService = new ClientCmsService();

