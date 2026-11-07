// ══════════════════════════════════════════════════════════
// CLIENT CMS SERVICE: Quản lý Menu, Hero Banner & Pandora Suggestion
// 100% Đồng bộ trực tiếp qua Database Server (/api/v1/system-configs)
// Tuyệt đối không dùng dữ liệu mock/default trong source code
// ══════════════════════════════════════════════════════════

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
  // Quản lý trạng thái thuần túy theo dữ liệu thực từ Server DB (Khởi đầu rỗng, không dùng dữ liệu default)
  private inMemoryMenu: ClientMenuItem[] = [];
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

  // ───────────────────────────────────────────────
  // 1. MENU CMS (Đồng bộ qua API Backend)
  // ───────────────────────────────────────────────

  getMenuItems(): ClientMenuItem[] {
    return [...this.inMemoryMenu];
  }

  /**
   * Tải menu từ Server DB (/api/v1/system-configs/navigation-menu).
   * Phát sự kiện MENU_UPDATED khi có dữ liệu. Không dùng dữ liệu default.
   */
  async fetchMenuItems(): Promise<ClientMenuItem[]> {
    try {
      const res = await fetch("/api/v1/system-configs/navigation-menu");
      if (res.ok) {
        const data = await res.json();
        if (data && data.value && typeof data.value === "string" && data.value.trim().length > 0) {
          try {
            const parsed = JSON.parse(data.value);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const sorted = parsed.sort((a: ClientMenuItem, b: ClientMenuItem) => a.order - b.order);
              this.inMemoryMenu = sorted;
              window.dispatchEvent(new CustomEvent(CMS_EVENTS.MENU_UPDATED, { detail: sorted }));
              return sorted;
            }
          } catch {
            // Parse không thành công thì giữ mảng rỗng
          }
        }
      }
    } catch (e) {
      console.warn("[ClientCmsService] Lỗi kết nối tải menu từ server:", e);
    }
    return this.getMenuItems();
  }

  async saveMenuItems(items: ClientMenuItem[]): Promise<void> {
    const sorted = [...items].sort((a, b) => a.order - b.order);
    this.inMemoryMenu = sorted;
    window.dispatchEvent(new CustomEvent(CMS_EVENTS.MENU_UPDATED, { detail: sorted }));

    // Tự động lưu lên Database Server
    try {
      await fetch("/api/v1/system-configs/navigation-menu", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: JSON.stringify(sorted) }),
      });
    } catch (err) {
      console.warn("[ClientCmsService] Lỗi đồng bộ menu điều hướng lên server:", err);
    }
  }

  resetMenuItems(): ClientMenuItem[] {
    this.inMemoryMenu = [];
    window.dispatchEvent(new CustomEvent(CMS_EVENTS.MENU_UPDATED, { detail: [] }));
    fetch("/api/v1/system-configs/navigation-menu", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: "" }),
    }).catch(() => {});
    return [];
  }

  // Đồng bộ danh mục sản phẩm từ Database vào làm Menu con (Submenu)
  syncCategoriesToMenu(categories: Array<{ id?: string | number; name: string; slug: string }>): ClientMenuItem[] {
    const current = this.getMenuItems();
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

  async fetchHeroBanners(): Promise<HeroBannerItem[]> {
    try {
      const res = await fetch("/api/v1/system-configs/hero_banners");
      if (res.ok) {
        const data = await res.json();
        if (data && data.value && typeof data.value === "string" && data.value.trim().length > 0) {
          try {
            const parsed = JSON.parse(data.value);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const sorted = parsed.sort((a: HeroBannerItem, b: HeroBannerItem) => a.order - b.order);
              this.inMemoryBanners = sorted;
              window.dispatchEvent(new Event(CMS_EVENTS.BANNERS_UPDATED));
              return sorted;
            }
          } catch {
            // ignore
          }
        }
      }
    } catch (e) {
      console.warn("[ClientCmsService] Lỗi tải hero banners từ server:", e);
    }
    return this.getHeroBanners();
  }

  saveHeroBanners(banners: HeroBannerItem[]): void {
    const sorted = [...banners].sort((a, b) => a.order - b.order);
    this.inMemoryBanners = sorted;
    window.dispatchEvent(new Event(CMS_EVENTS.BANNERS_UPDATED));

    fetch("/api/v1/system-configs/hero_banners", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: JSON.stringify(sorted) }),
    }).catch((err) => {
      console.warn("[ClientCmsService] Lỗi lưu hero banners lên server:", err);
    });
  }

  resetHeroBanners(): HeroBannerItem[] {
    this.inMemoryBanners = [];
    window.dispatchEvent(new Event(CMS_EVENTS.BANNERS_UPDATED));
    fetch("/api/v1/system-configs/hero_banners", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: "" }),
    }).catch(() => {});
    return [];
  }

  // ───────────────────────────────────────────────
  // 3. PANDORA SUGGESTION CMS (Đồng bộ qua API Backend)
  // ───────────────────────────────────────────────

  getPandoraConfig(): PandoraSuggestionConfig {
    return { ...this.inMemoryPandora };
  }

  async fetchPandoraConfig(): Promise<PandoraSuggestionConfig> {
    try {
      const res = await fetch("/api/v1/system-configs/pandora_config");
      if (res.ok) {
        const data = await res.json();
        if (data && data.value && typeof data.value === "string" && data.value.trim().length > 0) {
          try {
            const parsed = JSON.parse(data.value);
            if (parsed && typeof parsed === "object") {
              this.inMemoryPandora = { ...this.inMemoryPandora, ...parsed };
              window.dispatchEvent(new Event(CMS_EVENTS.PANDORA_UPDATED));
              return this.inMemoryPandora;
            }
          } catch {
            // ignore
          }
        }
      }
    } catch (e) {
      console.warn("[ClientCmsService] Lỗi tải Pandora config từ server:", e);
    }
    return this.getPandoraConfig();
  }

  savePandoraConfig(config: PandoraSuggestionConfig): void {
    this.inMemoryPandora = { ...config };
    window.dispatchEvent(new Event(CMS_EVENTS.PANDORA_UPDATED));

    fetch("/api/v1/system-configs/pandora_config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: JSON.stringify(config) }),
    }).catch((err) => {
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
    fetch("/api/v1/system-configs/pandora_config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: "" }),
    }).catch(() => {});
    return { ...this.inMemoryPandora };
  }
}

export const clientCmsService = new ClientCmsService();
