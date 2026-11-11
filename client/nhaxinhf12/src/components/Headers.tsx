import { useState, useEffect, useMemo } from "react";
import { Link, NavLink } from "react-router-dom";
import {
  Search,
  Heart,
  ShoppingBag,
  User,
  Menu,
  X,
  ChevronDown,
  Phone,
  MapPin,
} from "lucide-react";
import {
  HOTLINE,
  TOP_LINKS,
  type MenuGroup,
  type MenuKey,
} from "../util/CONSTRAINT";
import { useHeader, type UseHeaderProps } from "../hooks/useHeader";
import { clientCmsService, CMS_EVENTS, type ClientMenuItem } from "../services/clientCmsService";
import { categoryService } from "../services/categoryService";
import { DEFAULT_PLACEHOLDER_IMAGE } from "../services/productService";
import "./Headers.css";

const DEFAULT_PRODUCT_GROUPS: MenuGroup[] = [
  {
    title: "Sofa",
    to: "/danh-muc/sofa",
    items: [
      { label: "Sofa băng", to: "/danh-muc/sofa-bang" },
      { label: "Sofa góc", to: "/danh-muc/sofa-goc" },
      { label: "Sofa điện", to: "/danh-muc/sofa-dien" },
    ],
  },
  {
    title: "Bàn",
    to: "/danh-muc/ban",
    items: [
      { label: "Bàn ăn", to: "/danh-muc/ban-an" },
      { label: "Bàn bên", to: "/danh-muc/ban-ben" },
      { label: "Bàn nước", to: "/danh-muc/ban-nuoc" },
    ],
  },
  {
    title: "Ghế",
    to: "/danh-muc/ghe",
    items: [
      { label: "Armchair", to: "/danh-muc/armchair" },
      { label: "Ghế thư giãn", to: "/danh-muc/ghe-thu-gian" },
      { label: "Ghế ăn", to: "/danh-muc/ghe-an" },
    ],
  },
  {
    title: "Tủ & kệ",
    to: "/danh-muc/tu-va-ke",
    items: [
      { label: "Tủ tivi", to: "/danh-muc/tu-tivi" },
      { label: "Tủ giày", to: "/danh-muc/tu-giay" },
      { label: "Tủ ly", to: "/danh-muc/tu-ly" },
    ],
  },
  {
    title: "Giường & nệm",
    to: "/danh-muc/giuong-va-nem",
    items: [
      { label: "Giường", to: "/danh-muc/giuong" },
      { label: "Nệm", to: "/danh-muc/nem" },
      { label: "Chăn ga gối", to: "/danh-muc/chan-ga-goi" },
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

const DEFAULT_ROOM_GROUPS: MenuGroup[] = [
  {
    title: "Phòng khách",
    to: "/phong/phong-khach",
    items: [
      { label: "Sofa băng & Sofa góc", to: "/danh-muc/sofa" },
      { label: "Bàn nước & Bàn bên", to: "/danh-muc/ban-nuoc" },
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

const DEFAULT_BRAND_GROUPS: MenuGroup[] = [
  {
    title: "Thương hiệu quốc tế",
    to: "/thuong-hieu",
    items: [
      { label: "Bolia (Đan Mạch)", to: "/thuong-hieu/bolia" },
      { label: "Calligaris (Ý)", to: "/thuong-hieu/calligaris" },
      { label: "Ferm Living (Bắc Âu)", to: "/thuong-hieu/ferm-living" },
    ],
  },
  {
    title: "Thương hiệu Nhà Xinh",
    to: "/thuong-hieu",
    items: [
      { label: "Bộ sưu tập Osaka (Japandi)", to: "/bo-suu-tap/osaka" },
      { label: "Bộ sưu tập Victoria", to: "/bo-suu-tap/victoria" },
      { label: "Bộ sưu tập Nét Đương Đại", to: "/bo-suu-tap/net-duong-dai" },
    ],
  },
];

const vnd = (n: number) => n.toLocaleString("vi-VN") + " đ";

export default function Header(props: UseHeaderProps) {
  const {
    cartCount,
    wishlistCount,
    user,
    openMenu,
    setOpenMenu,
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
  } = useHeader(props);

  // ── CMS Dynamic Menu State ──
  const [cmsMenu, setCmsMenu] = useState<ClientMenuItem[]>(() =>
    clientCmsService.getMenuItems().filter((item) => item.isVisible)
  );
  const [customDropdownOpen, setCustomDropdownOpen] = useState<string | null>(null);

  // ── Server-driven Mega Menu: lấy từ server backend, không dùng PRODUCT_GROUPS ──
  const [megaMenuGroups, setMegaMenuGroups] = useState<MenuGroup[]>(DEFAULT_PRODUCT_GROUPS);
  const [roomGroups, setRoomGroups] = useState<MenuGroup[]>(DEFAULT_ROOM_GROUPS);
  const [brandGroups] = useState<MenuGroup[]>(DEFAULT_BRAND_GROUPS);

  // ── Đồng bộ MegaMenu Sản Phẩm với danh sách menu con do Admin cấu hình trong CMS ──
  const activeProductGroups: MenuGroup[] = useMemo(() => {
    const productMenuItem = cmsMenu.find(
      (m) => m.kind === "products" || m.label.toLowerCase().includes("sản phẩm")
    );
    if (
      productMenuItem &&
      Array.isArray(productMenuItem.children) &&
      productMenuItem.children.length > 0
    ) {
      const visibleChildren = productMenuItem.children.filter((c) => c.isVisible !== false);
      if (visibleChildren.length > 0) {
        return visibleChildren.map((child) => {
          const childLabelLower = child.label.toLowerCase().trim();
          const matched = megaMenuGroups.find((g) => {
            const gTitleLower = g.title.toLowerCase().trim();
            return (
              gTitleLower === childLabelLower ||
              gTitleLower.includes(childLabelLower) ||
              childLabelLower.includes(gTitleLower) ||
              (child.to && g.to && child.to.toLowerCase() === g.to.toLowerCase())
            );
          });

          if (matched) {
            return {
              title: child.label,
              to: child.to || matched.to,
              items: matched.items && matched.items.length > 0 ? matched.items : [{ label: child.label, to: child.to }],
            };
          }

          return {
            title: child.label,
            to: child.to,
            items: [{ label: child.label, to: child.to }],
          };
        });
      }
    }
    return megaMenuGroups;
  }, [cmsMenu, megaMenuGroups]);

  useEffect(() => {
    // 1. Tải cấu trúc Mega Menu sản phẩm thực tế từ server backend (chỉ chứa loại sản phẩm nội thất)
    categoryService
      .getMegaMenuGroups()
      .then((groups) => {
        if (Array.isArray(groups) && groups.length > 0) {
          setMegaMenuGroups(groups);
        }
      })
      .catch((err) => {
        console.warn("[Headers] Lỗi tải megaMenuGroups từ server:", err);
      });

    // 2. Tải cấu trúc Mega Menu phòng từ server backend
    categoryService
      .getRoomMenuGroups()
      .then((groups) => {
        if (Array.isArray(groups) && groups.length > 0) {
          setRoomGroups(groups);
        }
      })
      .catch((err) => {
        console.warn("[Headers] Lỗi tải roomGroups từ server:", err);
      });
  }, []);

  useEffect(() => {
    // 1. Tải menu mới nhất trực tiếp từ Backend Server DB
    clientCmsService.fetchMenuItems().then((items) => {
      if (Array.isArray(items) && items.length > 0) {
        setCmsMenu(items.filter((item) => item.isVisible));
      }
    });

    // 2. Lắng nghe sự kiện cập nhật menu khi Admin chỉnh sửa trong Admin Portal (đồng bộ trong cùng tab & qua BroadcastChannel)
    const handleMenuUpdate = (e?: Event) => {
      const customEvt = e as CustomEvent<ClientMenuItem[]>;
      if (customEvt?.detail && Array.isArray(customEvt.detail)) {
        setCmsMenu(customEvt.detail.filter((item) => item.isVisible));
      } else {
        setCmsMenu(clientCmsService.getMenuItems().filter((item) => item.isVisible));
      }
    };
    window.addEventListener(CMS_EVENTS.MENU_UPDATED, handleMenuUpdate);

    // 3. Tự động kiểm tra đồng bộ khi người dùng quay lại tab xem trang
    const handleFocus = () => {
      clientCmsService.fetchMenuItems().then((items) => {
        if (Array.isArray(items) && items.length > 0) {
          setCmsMenu(items.filter((item) => item.isVisible));
        }
      });
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener(CMS_EVENTS.MENU_UPDATED, handleMenuUpdate);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  return (
    <>
      {/* ── 1. Top Bar (Desktop Only): Cuộn đi theo trang, không cố định trên đầu khi lăn chuột ── */}
      <div className="hidden lg:block bg-[#f6f3ee] border-b border-[#e6e1d8] text-[13px] text-[#6f6a62] w-full select-none">
        <div className="max-w-360 mx-auto px-6 h-9 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <a
              href={HOTLINE.href}
              className="inline-flex items-center gap-1.5 font-medium hover:text-[#1f1d1a] transition-colors"
            >
              <Phone size={13} className="text-[#d26e4b]" />
              <span>{HOTLINE.label}</span>
            </a>
            <nav aria-label="Liên kết phụ" className="flex items-center gap-5">
              {TOP_LINKS.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="hover:text-[#1f1d1a] transition-colors"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-5">
            <Link
              to="/he-thong-showroom"
              className="inline-flex items-center gap-1.5 hover:text-[#1f1d1a] transition-colors"
            >
              <MapPin size={13} />
              <span>Hệ thống showroom</span>
            </Link>
            {user ? (
              <Link
                to="/tai-khoan"
                className="font-medium text-[#1f1d1a] hover:text-[#d26e4b] transition-colors"
              >
                {user.fullName}
              </Link>
            ) : (
              <Link
                to="/dang-nhap"
                className="hover:text-[#1f1d1a] transition-colors"
              >
                Đăng nhập
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. Header Chính: Ghim cố định ở top-0 khi lăn chuột ── */}
      <header className="sticky top-0 z-50 w-full bg-white text-[#1f1d1a] shadow-xs select-none">
        {/* ── Main Navigation Bar ── */}
        <div className="border-b border-[#e6e1d8] bg-white relative">
        <div className="max-w-360 mx-auto px-4 md:px-6 h-18 flex items-center justify-between gap-4">
          {/* Mobile Burger Icon */}
          <button
            type="button"
            className="lg:hidden w-10 h-10 rounded-full flex items-center justify-center text-[#1f1d1a] hover:bg-[#f6f3ee] transition-colors"
            aria-label="Mở menu điều hướng"
            onClick={() => setDrawer(true)}
          >
            <Menu size={22} />
          </button>

          {/* Logo Brand */}
          <Link
            to="/"
            className="text-2xl font-bold tracking-tight text-[#1f1d1a] whitespace-nowrap hover:opacity-90 transition-opacity"
            onClick={closeAll}
          >
            Nhà Xinh
          </Link>

          {/* Desktop Navigation Links */}
          <nav
            aria-label="Menu chính"
            className="hidden lg:flex flex-1 h-full items-center justify-center"
            onMouseLeave={() => {
              setOpenMenu(null);
              setCustomDropdownOpen(null);
            }}
          >
            <ul className="flex items-center h-full gap-7 xl:gap-8">
              {cmsMenu.map((item) => {
                const hasChildren = Array.isArray(item.children) && item.children.length > 0;
                const isCustomDropdown =
                  item.kind === "dropdown" ||
                  (hasChildren && item.kind !== "products" && item.kind !== "rooms" && item.kind !== "brands");

                // ── TRƯỜNG HỢP 1: MENU THẢ XUỐNG TÙY BIẾN (DO ADMIN TỰ TẠO/SỬA MỤC CON HOẶC ĐỒNG BỘ TỪ DB) ──
                if (isCustomDropdown) {
                  const isHovered = customDropdownOpen === item.id;
                  return (
                    <li
                      key={item.id || item.to}
                      className="h-full flex items-center relative"
                      onMouseEnter={() => {
                        setOpenMenu(null);
                        setCustomDropdownOpen(item.id);
                      }}
                      onMouseLeave={() => setCustomDropdownOpen(null)}
                    >
                      <Link
                        to={item.to}
                        onClick={closeAll}
                        className={`inline-flex items-center gap-1.5 h-18 text-[15px] font-medium transition-colors ${
                          isHovered ? "text-[#d26e4b] font-semibold" : "text-[#1f1d1a] hover:text-[#d26e4b]"
                        }`}
                      >
                        <span>{item.label}</span>
                        {item.badge && (
                          <span className="px-1.5 py-0.5 rounded-full bg-[#d26e4b] text-white text-[10px] font-bold leading-none">
                            {item.badge}
                          </span>
                        )}
                        {hasChildren && (
                          <ChevronDown
                            size={14}
                            className={`transition-transform duration-200 ${isHovered ? "rotate-180 text-[#d26e4b]" : ""}`}
                          />
                        )}
                      </Link>

                      {/* Dropdown Menu con tùy biến */}
                      {isHovered && hasChildren && (
                        <div className="absolute top-[calc(100%-4px)] left-0 min-w-60 bg-white border border-[#e6e1d8] rounded-xl shadow-[0_16px_36px_rgba(0,0,0,0.12)] py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                          <ul className="flex flex-col py-1">
                            {item.children?.map((sub) => (
                              <li key={sub.id || sub.to}>
                                <Link
                                  to={sub.to}
                                  onClick={closeAll}
                                  className="flex items-center justify-between px-4 py-2.5 text-[13.5px] font-medium text-stone-700 hover:text-[#d26e4b] hover:bg-[#faf7f2] transition-colors"
                                >
                                  <span>{sub.label}</span>
                                  {sub.badge && (
                                    <span className="px-1.5 py-0.5 rounded-full bg-[#d26e4b] text-white text-[9.5px] font-bold">
                                      {sub.badge}
                                    </span>
                                  )}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </li>
                  );
                }

                // ── TRƯỜNG HỢP 2: LIÊN KẾT ĐƠN ──
                if (item.kind === "link" && !hasChildren) {
                  return (
                    <li key={item.id || item.to} className="h-full flex items-center">
                      <NavLink
                        to={item.to}
                        onClick={closeAll}
                        className={({ isActive }) =>
                          `inline-flex items-center h-18 text-[15px] font-medium transition-colors relative ${
                            isActive
                              ? "text-[#d26e4b] font-semibold"
                              : "text-[#1f1d1a] hover:text-[#d26e4b]"
                          }`
                        }
                      >
                        {item.label}
                        {item.badge && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-[#d26e4b] text-white text-[10px] font-bold leading-none">
                            {item.badge}
                          </span>
                        )}
                      </NavLink>
                    </li>
                  );
                }

                // ── TRƯỜNG HỢP 3: MEGAMENU CỐ ĐỊNH (SẢN PHẨM / PHÒNG / THƯƠNG HIỆU) ──
                const key: MenuKey = item.kind as MenuKey;
                const isOpen = openMenu === key;

                return (
                  <li
                    key={item.id || key}
                    className="h-full flex items-center relative"
                    onMouseEnter={() => {
                      setCustomDropdownOpen(null);
                      setOpenMenu(key);
                    }}
                  >
                    <Link
                      to={item.to}
                      className={`inline-flex items-center gap-1.5 h-18 text-[15px] font-medium transition-colors ${
                        isOpen
                          ? "text-[#d26e4b] font-semibold"
                          : "text-[#1f1d1a] hover:text-[#d26e4b]"
                      }`}
                      aria-expanded={isOpen}
                      onClick={() => closeAll()}
                    >
                      <span>{item.label}</span>
                      {item.badge && (
                        <span className="px-1.5 py-0.5 rounded-full bg-[#d26e4b] text-white text-[10px] font-bold leading-none">
                          {item.badge}
                        </span>
                      )}
                      <ChevronDown
                        size={14}
                        className={`transition-transform duration-200 ${
                          isOpen ? "rotate-180 text-[#d26e4b]" : ""
                        }`}
                      />
                    </Link>

                    {/* ── Mega Menu: Sản Phẩm (Lấy từ Server, đáp ứng đa màn hình) ── */}
                    {isOpen && key === "products" && (
                      <div className="fixed left-0 right-0 top-[108px] bg-white border-b border-[#e6e1d8] shadow-[0_20px_40px_rgba(0,0,0,0.08)] max-h-[calc(100vh-120px)] overflow-y-auto z-50 animate-in fade-in duration-150">
                        <div className="max-w-360 mx-auto px-6 sm:px-8 py-8 flex flex-col xl:flex-row gap-8 items-start justify-between">
                          <div className="flex-1 w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 xl:gap-7 items-start">
                            {activeProductGroups.map((group) => {
                              const isExpanded = !!expandedGroups[group.title];
                              const visibleItems = isExpanded
                                ? group.items
                                : group.items.slice(0, 4);
                              const remainingCount = group.items.length - 4;

                              return (
                                <section
                                  key={group.title}
                                  className="flex flex-col min-w-0 text-left"
                                >
                                  <Link
                                    className="flex items-center text-[13.5px] font-bold tracking-wider text-[#1a1714] uppercase pb-2 mb-2.5 border-b-2 border-[#1a1714] hover:text-[#d26e4b] hover:border-[#d26e4b] transition-colors truncate"
                                    to={group.to}
                                    onClick={closeAll}
                                  >
                                    {group.title}
                                  </Link>
                                  <ul className="flex flex-col">
                                    {visibleItems.map((sub) => (
                                      <li key={sub.to}>
                                        <Link
                                          to={sub.to}
                                          onClick={closeAll}
                                          className="block py-1.5 text-[13.5px] text-[#6f6a62] hover:text-[#d26e4b] hover:translate-x-1 border-b border-[#f3efe8] transition-all"
                                        >
                                          {sub.label}
                                        </Link>
                                      </li>
                                    ))}
                                  </ul>
                                  {remainingCount > 0 && (
                                    <button
                                      type="button"
                                      className="mt-2 inline-flex items-center gap-1 text-[12px] font-bold text-[#c59b27] hover:text-[#a37c17] hover:underline cursor-pointer transition-colors bg-transparent border-0 self-start"
                                      onClick={(e) =>
                                        toggleGroupExpand(group.title, e)
                                      }
                                    >
                                      {isExpanded
                                        ? "Thu gọn ↑"
                                        : `+ Hiển thị thêm (${remainingCount})`}
                                    </button>
                                  )}
                                </section>
                              );
                            })}

                            {/* Dòng liên kết xem tất cả sản phẩm */}
                            <div className="col-span-full pt-4 mt-1 border-t border-[#f0ebe1] flex items-center justify-between">
                              <span className="text-xs text-[#8c827a]">
                                Khám phá trọn bộ các thiết kế nội thất cao cấp của Nhà Xinh
                              </span>
                              <Link
                                to="/san-pham"
                                onClick={closeAll}
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#d26e4b] hover:text-[#b85836] hover:underline"
                              >
                                Xem tất cả sản phẩm →
                              </Link>
                            </div>
                          </div>

                          {/* Khối Banner bên phải - Tự co giãn & ẩn trên màn hình tablet/laptop hẹp */}
                          <Link
                            to="/bo-suu-tap"
                            className="hidden xl:flex flex-col gap-3.5 p-5 rounded-2xl bg-[#faf7f2] border border-[#eee8df] hover:shadow-lg transition-all text-left w-[300px] 2xl:w-[340px] shrink-0"
                            onClick={closeAll}
                          >
                            <div className="overflow-hidden rounded-xl aspect-16/10">
                              <img
                                src="/uploads/collections/victoria.webp"
                                alt="Phòng khách với nội thất hiện đại"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = DEFAULT_PLACEHOLDER_IMAGE;
                                }}
                              />
                            </div>
                            <strong className="text-base font-bold text-[#1a1714] leading-snug group-hover:text-[#d26e4b] transition-colors">
                              Nội thất đẹp cho không gian sống
                            </strong>
                            <span className="text-xs text-[#6f6a62] leading-relaxed">
                              Khám phá bộ sưu tập mới nhất với phong cách chuẩn Âu từ Nhà Xinh.
                            </span>
                            <span className="inline-flex items-center justify-center self-start px-6 py-2 rounded-full bg-[#1f1d1a] text-white text-xs font-semibold group-hover:bg-[#d26e4b] transition-colors">
                              Xem ngay
                            </span>
                          </Link>
                        </div>
                      </div>
                    )}

                    {/* ── Mega Menu: Phòng ── */}
                    {isOpen && key === "rooms" && (
                      <div className="fixed left-0 right-0 top-[108px] bg-white border-b border-[#e6e1d8] shadow-[0_20px_40px_rgba(0,0,0,0.08)] max-h-[calc(100vh-120px)] overflow-y-auto z-50">
                        <div className="max-w-360 mx-auto px-8 py-8 grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-8 items-start">
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 xl:gap-7 items-start">
                            {roomGroups.map((group) => {
                              const isExpanded = !!expandedGroups[group.title];
                              const visibleItems = isExpanded
                                ? group.items
                                : group.items.slice(0, 3);
                              const remainingCount = group.items.length - 3;

                              return (
                                <section
                                  key={group.title}
                                  className="flex flex-col min-w-0 text-left"
                                >
                                  <Link
                                    className="flex items-center text-[13.5px] font-bold tracking-wider text-[#1a1714] uppercase pb-2 mb-2.5 border-b-2 border-[#1a1714] hover:text-[#d26e4b] hover:border-[#d26e4b] transition-colors truncate"
                                    to={group.to}
                                    onClick={closeAll}
                                  >
                                    {group.title}
                                  </Link>
                                  <ul className="flex flex-col">
                                    {visibleItems.map((sub) => (
                                      <li key={sub.to}>
                                        <Link
                                          to={sub.to}
                                          onClick={closeAll}
                                          className="block py-1.5 text-[13.5px] text-[#6f6a62] hover:text-[#d26e4b] hover:translate-x-1 border-b border-[#f3efe8] transition-all"
                                        >
                                          {sub.label}
                                        </Link>
                                      </li>
                                    ))}
                                  </ul>
                                  {remainingCount > 0 && (
                                    <button
                                      type="button"
                                      className="mt-2 inline-flex items-center gap-1 text-[12px] font-bold text-[#c59b27] hover:text-[#a37c17] hover:underline cursor-pointer transition-colors bg-transparent border-0 self-start"
                                      onClick={(e) =>
                                        toggleGroupExpand(group.title, e)
                                      }
                                    >
                                      {isExpanded
                                        ? "Thu gọn ↑"
                                        : `+ Hiển thị thêm (${remainingCount})`}
                                    </button>
                                  )}
                                </section>
                              );
                            })}
                          </div>

                          <Link
                            to="/phong/phong-khach"
                            className="group flex flex-col gap-3.5 p-5 rounded-2xl bg-[#faf7f2] border border-[#eee8df] hover:shadow-lg transition-all text-left"
                            onClick={closeAll}
                          >
                            <div className="overflow-hidden rounded-xl aspect-16/10">
                              <img
                                src="/uploads/collections/net-duong-dai.jpg"
                                alt="Giải pháp trọn gói từng không gian"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = DEFAULT_PLACEHOLDER_IMAGE;
                                }}
                              />
                            </div>
                            <strong className="text-base font-bold text-[#1a1714] leading-snug group-hover:text-[#d26e4b] transition-colors">
                              Giải pháp trọn gói từng không gian
                            </strong>
                            <span className="text-xs text-[#6f6a62] leading-relaxed">
                              Tư vấn bài trí nội thất phòng khách, phòng ăn & phòng ngủ hài hòa.
                            </span>
                            <span className="inline-flex items-center justify-center self-start px-6 py-2 rounded-full bg-[#1f1d1a] text-white text-xs font-semibold group-hover:bg-[#d26e4b] transition-colors">
                              Khám phá ngay
                            </span>
                          </Link>
                        </div>
                      </div>
                    )}

                    {/* ── Mega Menu: Thương Hiệu ── */}
                    {isOpen && key === "brands" && (
                      <div className="fixed left-0 right-0 top-[108px] bg-white border-b border-[#e6e1d8] shadow-[0_20px_40px_rgba(0,0,0,0.08)] max-h-[calc(100vh-120px)] overflow-y-auto z-50">
                        <div className="max-w-360 mx-auto px-8 py-8 grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-8 items-start">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 xl:gap-7 items-start">
                            {brandGroups.map((group) => (
                              <section
                                key={group.title}
                                className="flex flex-col min-w-0 text-left"
                              >
                                <Link
                                  className="flex items-center text-[13.5px] font-bold tracking-wider text-[#1a1714] uppercase pb-2 mb-2.5 border-b-2 border-[#1a1714] hover:text-[#d26e4b] hover:border-[#d26e4b] transition-colors truncate"
                                  to={group.to}
                                  onClick={closeAll}
                                >
                                  {group.title}
                                </Link>
                                <ul className="flex flex-col">
                                  {group.items.map((sub, sIdx) => (
                                    <li key={`${group.title}-${sub.to}-${sIdx}`}>
                                      <Link
                                        to={sub.to}
                                        onClick={closeAll}
                                        className="block py-1.5 text-[13.5px] text-[#6f6a62] hover:text-[#d26e4b] hover:translate-x-1 border-b border-[#f3efe8] transition-all"
                                      >
                                        {sub.label}
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              </section>
                            ))}
                          </div>

                          <Link
                            to="/thuong-hieu/calligaris"
                            className="group flex flex-col gap-3.5 p-5 rounded-2xl bg-[#faf7f2] border border-[#eee8df] hover:shadow-lg transition-all text-left"
                            onClick={closeAll}
                          >
                            <div className="overflow-hidden rounded-xl aspect-16/10">
                              <img
                                src="/uploads/collections/coastal-living.jpg"
                                alt="Thương hiệu nội thất quốc tế"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = DEFAULT_PLACEHOLDER_IMAGE;
                                }}
                              />
                            </div>
                            <strong className="text-base font-bold text-[#1a1714] leading-snug group-hover:text-[#d26e4b] transition-colors">
                              Thương hiệu nội thất quốc tế
                            </strong>
                            <span className="text-xs text-[#6f6a62] leading-relaxed">
                              Phân phối chính hãng Calligaris (Ý) & La-Z-Boy (Mỹ).
                            </span>
                            <span className="inline-flex items-center justify-center self-start px-6 py-2 rounded-full bg-[#1f1d1a] text-white text-xs font-semibold group-hover:bg-[#d26e4b] transition-colors">
                              Xem thương hiệu
                            </span>
                          </Link>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* ── Action Icons Right (Search, Account, Wishlist, Cart) ── */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Search Icon */}
            <button
              type="button"
              className="w-10 h-10 rounded-full flex items-center justify-center text-[#1f1d1a] hover:bg-[#f6f3ee] transition-colors"
              aria-label="Tìm kiếm sản phẩm"
              onClick={() => setSearchOpen(true)}
            >
              <Search size={20} />
            </button>

            {/* User Account Icon */}
            <Link
              className="hidden sm:flex w-10 h-10 rounded-full items-center justify-center text-[#1f1d1a] hover:bg-[#f6f3ee] transition-colors"
              aria-label="Tài khoản cá nhân"
              to={user ? "/tai-khoan" : "/dang-nhap"}
            >
              <User size={20} />
            </Link>

            {/* Wishlist Icon */}
            <Link
              className="relative w-10 h-10 rounded-full flex items-center justify-center text-[#1f1d1a] hover:bg-[#f6f3ee] transition-colors"
              aria-label={`Yêu thích, ${wishlistCount} sản phẩm`}
              to="/yeu-thich"
            >
              <Heart size={20} />
              {wishlistCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 rounded-full bg-[#d26e4b] text-white text-[10px] font-bold flex items-center justify-center leading-none shadow-xs">
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart Icon */}
            <Link
              className="relative w-10 h-10 rounded-full flex items-center justify-center text-[#1f1d1a] hover:bg-[#f6f3ee] transition-colors"
              aria-label={`Giỏ hàng, ${cartCount} sản phẩm`}
              to="/gio-hang"
            >
              <ShoppingBag size={20} />
              {cartCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 rounded-full bg-[#d26e4b] text-white text-[10px] font-bold flex items-center justify-center leading-none shadow-xs">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* ── 3. Fullscreen Search Modal ── */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-50 bg-white/98 backdrop-blur-md pt-16 px-4 md:px-6 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Tìm kiếm sản phẩm"
        >
          <div className="max-w-215 mx-auto">
            <form
              onSubmit={submitSearch}
              className="flex items-center gap-3 pb-3 border-b-2 border-[#1f1d1a]"
            >
              <Search size={24} className="text-[#1f1d1a] shrink-0" />
              <input
                ref={searchRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Tìm kiếm sofa, bàn ăn, đèn trần, giường ngủ…"
                aria-label="Từ khoá tìm kiếm"
                className="flex-1 bg-transparent border-0 outline-none text-xl md:text-2xl font-medium text-[#1f1d1a] placeholder:text-[#a2a0a0]"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setQ("")}
                  className="px-2 py-1 text-xs text-[#888] hover:text-[#1f1d1a] transition-colors font-medium cursor-pointer"
                >
                  Xoá
                </button>
              )}
              <button
                type="button"
                className="w-10 h-10 rounded-full flex items-center justify-center text-[#1f1d1a] hover:bg-[#f6f3ee] transition-colors cursor-pointer"
                aria-label="Đóng tìm kiếm"
                onClick={() => setSearchOpen(false)}
              >
                <X size={26} />
              </button>
            </form>

            {/* Trending Keywords */}
            {q.trim().length < 2 && (
              <div className="mt-7">
                <span className="text-xs font-bold text-[#888] uppercase tracking-wider block mb-3">
                  Từ khoá thịnh hành
                </span>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Sofa băng",
                    "Bàn ăn 6 ghế",
                    "Armchair Nordic",
                    "Giường ngủ",
                    "Tủ tivi",
                    "Đèn trang trí",
                    "Thảm",
                  ].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        setQ(tag);
                        navigate(`/tim-kiem?q=${encodeURIComponent(tag)}`);
                        setSearchOpen(false);
                      }}
                      className="px-4 py-2 rounded-full border border-[#e0d8cd] bg-[#faf8f5] text-[#333] text-[13px] hover:border-[#1f1d1a] hover:bg-white transition-all cursor-pointer"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Live Search Suggestions */}
            {suggestions.length > 0 && (
              <div className="mt-6">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-[#888] uppercase tracking-wider">
                    Sản phẩm gợi ý ({suggestions.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigate(`/tim-kiem?q=${encodeURIComponent(q.trim())}`);
                      setSearchOpen(false);
                    }}
                    className="text-xs font-bold text-[#b38e5d] hover:text-[#8f6d42] cursor-pointer transition-colors"
                  >
                    Xem tất cả →
                  </button>
                </div>
                <ul className="flex flex-col gap-2">
                  {suggestions.map((s) => (
                    <li key={s.id}>
                      <Link
                        to={`/san-pham/${s.slug}`}
                        onClick={closeAll}
                        className="flex items-center gap-4 p-2.5 rounded-xl border border-[#eee8df] bg-white hover:bg-[#fbf9f6] hover:border-[#d26e4b] transition-all"
                      >
                        {s.image && (
                          <img
                            src={s.image}
                            alt={s.name}
                            className="w-12 h-12 object-cover rounded-lg shrink-0 border border-[#f0ece5]"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="block text-[14px] font-semibold text-[#1a1a1a] truncate">
                            {s.name}
                          </span>
                          {s.category && (
                            <span className="text-xs text-[#888]">
                              {s.category}
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-bold text-[#b38e5d] shrink-0">
                          {vnd(s.price)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {q.trim().length >= 2 && suggestions.length === 0 && (
              <div className="mt-8 text-center p-8 bg-[#fbf9f6] rounded-2xl border border-[#eee8df]">
                <p className="text-sm text-[#666] mb-4">
                  Chưa thấy gợi ý trực tiếp cho "
                  <strong className="text-[#1a1a1a]">{q.trim()}</strong>".
                </p>
                <button
                  type="button"
                  onClick={() => {
                    navigate(`/tim-kiem?q=${encodeURIComponent(q.trim())}`);
                    setSearchOpen(false);
                  }}
                  className="px-6 py-2.5 rounded-full bg-[#1f1d1a] text-white text-xs font-semibold hover:bg-[#d26e4b] transition-colors cursor-pointer"
                >
                  Tìm kiếm toàn bộ danh mục cho "{q.trim()}"
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 4. Mobile Drawer ── */}
      {drawer && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setDrawer(false)}
          />
          <aside
            className="fixed inset-y-0 left-0 z-50 w-[85vw] max-w-90 bg-white flex flex-col shadow-2xl overflow-y-auto"
            aria-label="Menu di động"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#e6e1d8]">
              <span className="text-xl font-bold tracking-tight text-[#1f1d1a]">
                Nhà Xinh
              </span>
              <button
                type="button"
                className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#f6f3ee] text-[#1f1d1a] transition-colors"
                aria-label="Đóng menu"
                onClick={() => setDrawer(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 py-2 divide-y divide-[#f0ece5]">
              {cmsMenu.map((item) => {
                const hasChildren = Array.isArray(item.children) && item.children.length > 0;
                const isCustomDropdown =
                  item.kind === "dropdown" ||
                  (hasChildren && item.kind !== "products" && item.kind !== "rooms" && item.kind !== "brands");

                // ── MOBILE: MENU THẢ XUỐNG TÙY BIẾN ──
                if (isCustomDropdown) {
                  const drawerKey = item.id || item.label;
                  const isOpen = drawerOpen.includes(drawerKey);
                  return (
                    <div key={item.id || item.to} className="px-5 py-3">
                      <button
                        type="button"
                        className="w-full flex items-center justify-between text-base font-semibold text-[#1f1d1a] hover:text-[#d26e4b] transition-colors bg-transparent border-0 py-1 cursor-pointer"
                        onClick={() => toggleDrawerSection(drawerKey)}
                      >
                        <span className="flex items-center gap-2">
                          <span>{item.label}</span>
                          {item.badge && (
                            <span className="px-2 py-0.5 rounded-full bg-[#d26e4b] text-white text-[11px] font-bold">
                              {item.badge}
                            </span>
                          )}
                        </span>
                        {hasChildren && (
                          <ChevronDown
                            size={18}
                            className={`transition-transform duration-200 ${
                              isOpen ? "rotate-180 text-[#d26e4b]" : "text-[#888]"
                            }`}
                          />
                        )}
                      </button>

                      {isOpen && hasChildren && (
                        <div className="mt-2 pl-3 flex flex-col gap-2 border-l-2 border-[#eee8df]">
                          <Link
                            to={item.to}
                            onClick={closeAll}
                            className="text-xs font-bold uppercase tracking-wider text-[#d26e4b] hover:underline py-1"
                          >
                            Xem tất cả {item.label} →
                          </Link>
                          {item.children?.map((sub) => (
                            <Link
                              key={sub.id || sub.to}
                              to={sub.to}
                              onClick={closeAll}
                              className="text-sm font-medium text-[#1a1714] hover:text-[#d26e4b] transition-colors py-1 flex items-center justify-between"
                            >
                              <span>{sub.label}</span>
                              {sub.badge && (
                                <span className="px-1.5 py-0.5 rounded-full bg-[#d26e4b] text-white text-[10px] font-bold">
                                  {sub.badge}
                                </span>
                              )}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                if (item.kind === "link" && !hasChildren) {
                  return (
                    <div key={item.id || item.to} className="px-5 py-3.5">
                      <NavLink
                        to={item.to}
                        onClick={closeAll}
                        className={({ isActive }) =>
                          `flex items-center justify-between text-base font-semibold transition-colors ${
                            isActive
                              ? "text-[#d26e4b]"
                              : "text-[#1f1d1a] hover:text-[#d26e4b]"
                          }`
                        }
                      >
                        <span>{item.label}</span>
                        {item.badge && (
                          <span className="px-2 py-0.5 rounded-full bg-[#d26e4b] text-white text-[11px] font-bold">
                            {item.badge}
                          </span>
                        )}
                      </NavLink>
                    </div>
                  );
                }

                const key = item.kind;
                const isOpen = drawerOpen.includes(key);
                const subGroups =
                  key === "products"
                    ? activeProductGroups
                    : key === "rooms"
                    ? roomGroups
                    : brandGroups;

                return (
                  <div key={item.id || key} className="px-5 py-3">
                    <button
                      type="button"
                      className="w-full flex items-center justify-between text-base font-semibold text-[#1f1d1a] hover:text-[#d26e4b] transition-colors bg-transparent border-0 py-1 cursor-pointer"
                      onClick={() => toggleDrawerSection(key)}
                    >
                      <span>{item.label}</span>
                      <ChevronDown
                        size={18}
                        className={`transition-transform duration-200 ${
                          isOpen ? "rotate-180 text-[#d26e4b]" : "text-[#888]"
                        }`}
                      />
                    </button>

                    {isOpen && (
                      <div className="mt-3 pl-3 flex flex-col gap-3 border-l-2 border-[#eee8df]">
                        <Link
                          to={item.to}
                          onClick={closeAll}
                          className="text-xs font-bold uppercase tracking-wider text-[#d26e4b] hover:underline"
                        >
                          Xem tất cả {item.label} →
                        </Link>
                        {subGroups.map((g) => (
                          <div key={g.title} className="flex flex-col gap-1">
                            <Link
                              to={g.to}
                              onClick={closeAll}
                              className="text-sm font-semibold text-[#1a1714] hover:text-[#d26e4b] transition-colors"
                            >
                              {g.title}
                            </Link>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 pl-2">
                              {g.items.slice(0, 4).map((sub, sIdx) => (
                                <Link
                                  key={`${g.title}-${sub.to}-${sIdx}`}
                                  to={sub.to}
                                  onClick={closeAll}
                                  className="text-xs text-[#6f6a62] hover:text-[#d26e4b] transition-colors"
                                >
                                  {sub.label}
                                </Link>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Mobile Bottom Shortcuts */}
            <div className="p-5 border-t border-[#e6e1d8] bg-[#fbf9f6] flex flex-col gap-3 text-xs text-[#6f6a62]">
              <a
                href={HOTLINE.href}
                className="inline-flex items-center gap-2 font-semibold text-[#1f1d1a]"
              >
                <Phone size={14} className="text-[#d26e4b]" />
                <span>Hotline: {HOTLINE.label}</span>
              </a>
              <Link
                to="/he-thong-showroom"
                onClick={closeAll}
                className="inline-flex items-center gap-2 hover:text-[#1f1d1a]"
              >
                <MapPin size={14} />
                <span>Hệ thống showroom</span>
              </Link>
              <div className="pt-2 border-t border-[#eee8df] flex justify-between items-center">
                {user ? (
                  <Link
                    to="/tai-khoan"
                    onClick={closeAll}
                    className="font-medium text-[#1f1d1a]"
                  >
                    Tài khoản: {user.fullName}
                  </Link>
                ) : (
                  <Link
                    to="/dang-nhap"
                    onClick={closeAll}
                    className="font-medium text-[#d26e4b]"
                  >
                    Đăng nhập / Đăng ký
                  </Link>
                )}
              </div>
            </div>
          </aside>
        </>
      )}
    </header>
  </>
  );
}
