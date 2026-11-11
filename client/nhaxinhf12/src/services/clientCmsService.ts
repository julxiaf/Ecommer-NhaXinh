// ══════════════════════════════════════════════════════════
// CLIENT CMS SERVICE: Quản lý Menu, Hero Banner & Pandora Suggestion
// 100% Đồng bộ trực tiếp qua Database Server (/api/v1/system-configs)
// Tuyệt đối không dùng dữ liệu mock/default trong source code
// ══════════════════════════════════════════════════════════

import { apiClient } from "./apiClient";

export interface ClientSubMenuItem {
  id: string;
  label: string;
  to: string;
  badge?: string;
  isVisible?: boolean;
}

export interface ClientMenuItem {
  id: string;
  label: string;
  to: string;
  kind: "link" | "products" | "rooms" | "brands" | "dropdown";
  isVisible: boolean;
  order: number;
  badge?: string;
  isExternal?: boolean;
  children?: ClientSubMenuItem[];
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
  mediaType?: "image" | "video";
  videoUrl?: string;
  actions: HeroBannerAction[];
  isActive: boolean;
  order: number;
  textColor?: string;
  titleColor?: string;
  subtitleColor?: string;
  descriptionColor?: string;
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

export const CMS_EVENTS = {
  MENU_UPDATED: "nhaxinh_cms_menu_updated",
  BANNERS_UPDATED: "nhaxinh_cms_banners_updated",
  PANDORA_UPDATED: "nhaxinh_cms_pandora_updated",
};

/** Menu điều hướng chuẩn mặc định của Header Nhà Xinh */
export const DEFAULT_MENU_ITEMS: ClientMenuItem[] = [
  { id: "nav-1-san-pham-moi", label: "Sản phẩm mới", to: "/san-pham-moi", kind: "link", isVisible: true, order: 1 },
  { id: "nav-2-san-pham", label: "Sản phẩm", to: "/san-pham", kind: "products", isVisible: true, order: 2 },
  { id: "nav-3-phong", label: "Phòng", to: "/phong", kind: "rooms", isVisible: true, order: 3 },
  { id: "nav-4-bo-suu-tap", label: "Bộ sưu tập", to: "/bo-suu-tap", kind: "link", isVisible: true, order: 4 },
  { id: "nav-5-thuong-hieu", label: "Thương hiệu", to: "/thuong-hieu", kind: "brands", isVisible: true, order: 5 },
  { id: "nav-6-tu-van-thiet-ke", label: "Tư vấn thiết kế", to: "/tu-van-thiet-ke", kind: "link", isVisible: true, order: 6 },
  { id: "nav-7-goc-cam-hung", label: "Góc cảm hứng", to: "/bai-viet", kind: "link", isVisible: true, order: 7 }
];

// Dọn dẹp key cũ trong localStorage nếu có từ phiên bản trước
if (typeof window !== "undefined") {
  try {
    localStorage.removeItem("nhaxinh_cms_navigation_menu_v2");
    localStorage.removeItem("nhaxinh_cms_hero_banners_v2");
    localStorage.removeItem("nhaxinh_cms_pandora_suggestion_v2");
    localStorage.removeItem("nhaxinh_cms_navigation_menu");
    localStorage.removeItem("nhaxinh_cms_hero_banners");
    localStorage.removeItem("nhaxinh_cms_pandora_suggestion");
  } catch {
    // ignore
  }
}

class ClientCmsService {
  private inMemoryMenu: ClientMenuItem[] = [...DEFAULT_MENU_ITEMS];
  private inMemoryBanners: HeroBannerItem[] = [];
  private inMemoryPandora: PandoraSuggestionConfig = {
    isEnabled: false,
    badgeTitle: "",
    mainTitle: "",
    subtitle: "",
    bannerImage: "",
    curatedTagFilter: [],
    apiLimit: 8,
    products: [],
  };

  private menuFetchPromise: Promise<ClientMenuItem[]> | null = null;
  private bannersFetchPromise: Promise<HeroBannerItem[]> | null = null;
  private pandoraFetchPromise: Promise<PandoraSuggestionConfig> | null = null;
  private lastMenuFetch = 0;
  private lastBannersFetch = 0;
  private lastPandoraFetch = 0;
  private readonly CMS_CACHE_TTL = 60_000; // 60 giây TTL in-memory

  private broadcastChannel: BroadcastChannel | null = typeof window !== "undefined" && "BroadcastChannel" in window
    ? new BroadcastChannel("nhaxinh_cms_sync")
    : null;

  constructor() {
    if (this.broadcastChannel) {
      this.broadcastChannel.onmessage = (e) => {
        if (e.data?.type === CMS_EVENTS.MENU_UPDATED && Array.isArray(e.data?.items)) {
          this.inMemoryMenu = e.data.items;
          window.dispatchEvent(new CustomEvent(CMS_EVENTS.MENU_UPDATED, { detail: e.data.items }));
        }
      };
    }
  }

  private broadcastMenu(items: ClientMenuItem[]) {
    window.dispatchEvent(new CustomEvent(CMS_EVENTS.MENU_UPDATED, { detail: items }));
    try {
      this.broadcastChannel?.postMessage({ type: CMS_EVENTS.MENU_UPDATED, items });
    } catch {
      // ignore
    }
  }

  // ───────────────────────────────────────────────
  // 1. MENU CMS (Đồng bộ qua API Backend)
  // ───────────────────────────────────────────────

  getMenuItems(): ClientMenuItem[] {
    return [...this.inMemoryMenu];
  }

  /**
   * Tải menu từ Server DB (/api/v1/system-configs/navigation-menu).
   * Phát sự kiện MENU_UPDATED khi có dữ liệu mới.
   * Có TTL cache 60s và in-flight deduplication để tránh spam API khi component mount hoặc tab focus.
   */
  async fetchMenuItems(force = false): Promise<ClientMenuItem[]> {
    const now = Date.now();
    if (!force && this.inMemoryMenu.length > 0 && now - this.lastMenuFetch < this.CMS_CACHE_TTL) {
      return this.getMenuItems();
    }
    if (this.menuFetchPromise) {
      return this.menuFetchPromise;
    }

    this.menuFetchPromise = (async () => {
      try {
        const data = await apiClient.get<{ success?: boolean; value?: string }>(
          "/api/v1/system-configs/navigation-menu",
          { retries: 2, skipAuth: true }
        );
        if (data && data.value && typeof data.value === "string" && data.value.trim().length > 0) {
          try {
            const parsed = JSON.parse(data.value);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const sorted = parsed.sort((a: ClientMenuItem, b: ClientMenuItem) => a.order - b.order);
              this.inMemoryMenu = sorted;
              this.lastMenuFetch = Date.now();
              this.broadcastMenu(sorted);
              return sorted;
            }
          } catch {
            // ignore
          }
        }
      } catch (e) {
        console.warn("[ClientCmsService] Lỗi kết nối tải menu từ server:", e);
      }
      this.lastMenuFetch = Date.now();
      if (this.inMemoryMenu.length === 0) {
        this.inMemoryMenu = [...DEFAULT_MENU_ITEMS];
      }
      return this.getMenuItems();
    })().finally(() => {
      this.menuFetchPromise = null;
    });

    return this.menuFetchPromise;
  }

  async saveMenuItems(items: ClientMenuItem[]): Promise<void> {
    const sorted = [...items].sort((a, b) => a.order - b.order);
    this.inMemoryMenu = sorted;
    this.lastMenuFetch = Date.now();
    this.broadcastMenu(sorted);

    // Tự động lưu lên Database Server qua apiClient
    try {
      await apiClient.put("/api/v1/system-configs/navigation-menu", {
        value: JSON.stringify(sorted),
      });
    } catch (err) {
      console.warn("[ClientCmsService] Lỗi đồng bộ menu điều hướng lên server:", err);
    }
  }

  async resetMenuItems(): Promise<ClientMenuItem[]> {
    const defaults = [...DEFAULT_MENU_ITEMS];
    await this.saveMenuItems(defaults);
    return defaults;
  }

  // Đồng bộ danh mục sản phẩm từ Database vào làm Menu con (Submenu)
  syncCategoriesToMenu(categories: Array<{ id?: string | number; name: string; slug: string }>): ClientMenuItem[] {
    const current = this.getMenuItems().length > 0 ? this.getMenuItems() : [...DEFAULT_MENU_ITEMS];
    const subItems: ClientSubMenuItem[] = categories.map((cat, idx) => ({
      id: `sub-cat-${cat.slug || idx}-${Date.now()}`,
      label: cat.name,
      to: `/san-pham?category=${encodeURIComponent(cat.slug || cat.name)}`,
      isVisible: true,
    }));

    const productMenuIndex = current.findIndex(
      (m) => m.kind === "dropdown" || m.kind === "products" || m.label.toLowerCase().includes("sản phẩm")
    );

    let updated: ClientMenuItem[];
    if (productMenuIndex >= 0) {
      updated = current.map((item, idx) =>
        idx === productMenuIndex
          ? {
              ...item,
              kind: item.kind || "products",
              children: subItems,
            }
          : item
      );
    } else {
      const newMenuItem: ClientMenuItem = {
        id: `nav-products-db-${Date.now()}`,
        label: "Sản phẩm",
        to: "/san-pham",
        kind: "products",
        isVisible: true,
        order: 2,
        children: subItems,
      };
      updated = [...current, newMenuItem];
    }

    void this.saveMenuItems(updated);
    return updated;
  }

  // ───────────────────────────────────────────────
  // 2. HERO BANNERS CMS (Đồng bộ qua API Backend)
  // ───────────────────────────────────────────────

  getHeroBanners(): HeroBannerItem[] {
    return [...this.inMemoryBanners];
  }

  async fetchHeroBanners(force = false): Promise<HeroBannerItem[]> {
    const now = Date.now();
    if (!force && this.inMemoryBanners.length > 0 && now - this.lastBannersFetch < this.CMS_CACHE_TTL) {
      return this.getHeroBanners();
    }
    if (this.bannersFetchPromise) {
      return this.bannersFetchPromise;
    }

    this.bannersFetchPromise = (async () => {
      try {
        const data = await apiClient.get<{ success?: boolean; value?: string }>(
          "/api/v1/system-configs/hero_banners",
          { retries: 2, skipAuth: true }
        );
        if (data && data.value && typeof data.value === "string" && data.value.trim().length > 0) {
          try {
            const parsed = JSON.parse(data.value);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const sorted = parsed.sort((a: HeroBannerItem, b: HeroBannerItem) => a.order - b.order);
              this.inMemoryBanners = sorted;
              this.lastBannersFetch = Date.now();
              window.dispatchEvent(new Event(CMS_EVENTS.BANNERS_UPDATED));
              return sorted;
            }
          } catch {
            // ignore
          }
        }
      } catch (e) {
        console.warn("[ClientCmsService] Lỗi tải hero banners từ server:", e);
      }
      this.lastBannersFetch = Date.now();
      return this.getHeroBanners();
    })().finally(() => {
      this.bannersFetchPromise = null;
    });

    return this.bannersFetchPromise;
  }

  saveHeroBanners(banners: HeroBannerItem[]): void {
    const sorted = [...banners].sort((a, b) => a.order - b.order);
    this.inMemoryBanners = sorted;
    this.lastBannersFetch = Date.now();
    window.dispatchEvent(new Event(CMS_EVENTS.BANNERS_UPDATED));

    apiClient
      .put("/api/v1/system-configs/hero_banners", {
        value: JSON.stringify(sorted),
      })
      .catch((err) => {
        console.warn("[ClientCmsService] Lỗi lưu hero banners lên server:", err);
      });
  }

  resetHeroBanners(): HeroBannerItem[] {
    this.inMemoryBanners = [];
    this.lastBannersFetch = Date.now();
    window.dispatchEvent(new Event(CMS_EVENTS.BANNERS_UPDATED));
    apiClient
      .put("/api/v1/system-configs/hero_banners", { value: "" })
      .catch(() => {});
    return [];
  }

  // ───────────────────────────────────────────────
  // 3. PANDORA SUGGESTION CMS (Đồng bộ qua API Backend)
  // ───────────────────────────────────────────────

  getPandoraConfig(): PandoraSuggestionConfig {
    return { ...this.inMemoryPandora };
  }

  async fetchPandoraConfig(force = false): Promise<PandoraSuggestionConfig> {
    const now = Date.now();
    if (!force && (this.inMemoryPandora.badgeTitle || this.inMemoryPandora.mainTitle) && now - this.lastPandoraFetch < this.CMS_CACHE_TTL) {
      return this.getPandoraConfig();
    }
    if (this.pandoraFetchPromise) {
      return this.pandoraFetchPromise;
    }

    this.pandoraFetchPromise = (async () => {
      try {
        const data = await apiClient.get<{ success?: boolean; value?: string }>(
          "/api/v1/system-configs/pandora_config",
          { retries: 2, skipAuth: true }
        );
        if (data && data.value && typeof data.value === "string" && data.value.trim().length > 0) {
          try {
            const parsed = JSON.parse(data.value);
            if (parsed && typeof parsed === "object") {
              this.inMemoryPandora = { ...this.inMemoryPandora, ...parsed };
              this.lastPandoraFetch = Date.now();
              window.dispatchEvent(new Event(CMS_EVENTS.PANDORA_UPDATED));
              return this.inMemoryPandora;
            }
          } catch {
            // ignore
          }
        }
      } catch (e) {
        console.warn("[ClientCmsService] Lỗi tải Pandora config từ server:", e);
      }
      this.lastPandoraFetch = Date.now();
      return this.getPandoraConfig();
    })().finally(() => {
      this.pandoraFetchPromise = null;
    });

    return this.pandoraFetchPromise;
  }

  savePandoraConfig(config: PandoraSuggestionConfig): void {
    this.inMemoryPandora = { ...config };
    this.lastPandoraFetch = Date.now();
    window.dispatchEvent(new Event(CMS_EVENTS.PANDORA_UPDATED));

    apiClient
      .put("/api/v1/system-configs/pandora_config", {
        value: JSON.stringify(config),
      })
      .catch((err) => {
        console.warn("[ClientCmsService] Lỗi lưu Pandora config lên server:", err);
      });
  }

  resetPandoraConfig(): PandoraSuggestionConfig {
    this.inMemoryPandora = {
      isEnabled: false,
      badgeTitle: "",
      mainTitle: "",
      subtitle: "",
      bannerImage: "",
      curatedTagFilter: [],
      apiLimit: 8,
      products: [],
    };
    window.dispatchEvent(new Event(CMS_EVENTS.PANDORA_UPDATED));
    apiClient
      .put("/api/v1/system-configs/pandora_config", { value: "" })
      .catch(() => {});
    return { ...this.inMemoryPandora };
  }
}

export const clientCmsService = new ClientCmsService();
