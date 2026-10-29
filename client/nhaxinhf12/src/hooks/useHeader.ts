import { useState, useEffect, useRef, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "./useStore";
import { productService } from "../services/productService";
import type { MenuKey } from "../util/CONSTRAINT";

export interface SearchSuggestion {
  id: number;
  name: string;
  slug: string;
  price: number;
  image?: string;
  category?: string;
}

export interface UseHeaderProps {
  cartCount?: number;
  wishlistCount?: number;
  user?: { fullName: string } | null;
}

export function useHeader(props?: UseHeaderProps) {
  const navigate = useNavigate();
  const store = useStore();

  // Ưu tiên props truyền vào, nếu không sẽ tự động lấy từ useStore
  const cartCount = props?.cartCount ?? store.cartCount;
  const wishlistCount = props?.wishlistCount ?? store.wishlist.length;
  const user = props?.user !== undefined ? props.user : store.user;

  // Trạng thái mở menu desktop
  const [openMenu, setOpenMenu] = useState<MenuKey | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Trạng thái Drawer điều hướng trên mobile
  const [drawer, setDrawer] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState<string[]>([]);

  // Trạng thái tìm kiếm
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  const toggleGroupExpand = (title: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const toggleMenu = (key: MenuKey) =>
    setOpenMenu((cur) => (cur === key ? null : key));

  const toggleDrawerSection = (key: string) => {
    setDrawerOpen((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const closeAll = () => {
    setOpenMenu(null);
    setDrawer(false);
    setSearchOpen(false);
  };

  // Đóng menu khi bấm phím Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeAll();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Khóa cuộn trang khi drawer hoặc modal tìm kiếm đang mở
  useEffect(() => {
    document.body.style.overflow = drawer || searchOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawer, searchOpen]);

  // Tự động focus vào ô tìm kiếm khi mở
  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  // Tìm kiếm gợi ý (Debounce 250ms) thông qua productService
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setSuggestions([]);
      return;
    }

    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const results = await productService.getSearchSuggestions(term, ctrl.signal);
        setSuggestions(results);
      } catch {
        // Bỏ qua lỗi abort
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q]);

  const submitSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    navigate(`/tim-kiem?q=${encodeURIComponent(term)}`);
    setSearchOpen(false);
  };

  return {
    cartCount,
    wishlistCount,
    user,
    openMenu,
    setOpenMenu,
    toggleMenu,
    expandedGroups,
    toggleGroupExpand,
    drawer,
    setDrawer,
    drawerOpen,
    toggleDrawerSection,
    searchOpen,
    setSearchOpen,
    q,
    setQ,
    suggestions,
    searchRef,
    submitSearch,
    closeAll,
    navigate,
  };
}

