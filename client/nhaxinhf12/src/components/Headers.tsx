import { useState, useEffect } from "react";
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
  megaMenuGroups,
  roomMegaMenuGroups,
  brandMegaMenuGroups,
  type MenuKey,
} from "../util/CONSTRAINT";
import { useHeader, type UseHeaderProps } from "../hooks/useHeader";
import { clientCmsService, CMS_EVENTS, type ClientMenuItem } from "../services/clientCmsService";
import "./Headers.css";

const vnd = (n: number) => n.toLocaleString("vi-VN") + " đ";

export default function Header(props: UseHeaderProps) {
  const {
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
  } = useHeader(props);

  // ── CMS Dynamic Menu State ──
  const [cmsMenu, setCmsMenu] = useState<ClientMenuItem[]>(() =>
    clientCmsService.getMenuItems().filter((item) => item.isVisible)
  );

  useEffect(() => {
    const handleMenuUpdate = () => {
      setCmsMenu(clientCmsService.getMenuItems().filter((item) => item.isVisible));
    };
    window.addEventListener(CMS_EVENTS.MENU_UPDATED, handleMenuUpdate);
    return () => {
      window.removeEventListener(CMS_EVENTS.MENU_UPDATED, handleMenuUpdate);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full bg-white text-[#1f1d1a] shadow-xs select-none">
      {/* ── 1. Top Bar (Desktop Only) ── */}
      <div className="hidden lg:block bg-[#f6f3ee] border-b border-[#e6e1d8] text-[13px] text-[#6f6a62]">
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
              to="/he-thong-cua-hang"
              className="inline-flex items-center gap-1.5 hover:text-[#1f1d1a] transition-colors"
            >
              <MapPin size={13} />
              <span>Hệ thống cửa hàng</span>
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

      {/* ── 2. Main Navigation Bar ── */}
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
            onMouseLeave={() => setOpenMenu(null)}
          >
            <ul className="flex items-center h-full gap-7 xl:gap-8">
              {cmsMenu.map((item) => {
                if (item.kind === "link") {
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

                const key: MenuKey = item.kind;
                const isOpen = openMenu === key;

                return (
                  <li
                    key={item.id || key}
                    className="h-full flex items-center relative"
                    onMouseEnter={() => setOpenMenu(key)}
                  >
                    <Link
                      to={item.to}
                      className={`inline-flex items-center gap-1.5 h-18 text-[15px] font-medium transition-colors ${
                        isOpen
                          ? "text-[#d26e4b] font-semibold"
                          : "text-[#1f1d1a] hover:text-[#d26e4b]"
                      }`}
                      aria-expanded={isOpen}
                      onClick={() => toggleMenu(key)}
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

                    {/* ── Mega Menu: Sản Phẩm ── */}
                    {isOpen && key === "products" && (
                      <div className="fixed left-0 right-0 top-27 bg-white border-b border-[#e6e1d8] shadow-[0_20px_40px_rgba(0,0,0,0.08)] max-h-[calc(100vh-120px)] overflow-y-auto z-50">
                        <div className="max-w-360 mx-auto px-8 py-8 grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-8 items-start">
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 xl:gap-7 items-start">
                            {megaMenuGroups.map((group) => {
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
                            to="/bo-suu-tap"
                            className="group flex flex-col gap-3.5 p-5 rounded-2xl bg-[#faf7f2] border border-[#eee8df] hover:shadow-lg transition-all text-left"
                            onClick={closeAll}
                          >
                            <div className="overflow-hidden rounded-xl aspect-16/10">
                              <img
                                src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=85"
                                alt="Phòng khách với nội thất hiện đại"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
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
                      <div className="fixed left-0 right-0 top-27 bg-white border-b border-[#e6e1d8] shadow-[0_20px_40px_rgba(0,0,0,0.08)] max-h-[calc(100vh-120px)] overflow-y-auto z-50">
                        <div className="max-w-360 mx-auto px-8 py-8 grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-8 items-start">
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 xl:gap-7 items-start">
                            {roomMegaMenuGroups.map((group) => {
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
                                src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1000&q=85"
                                alt="Giải pháp trọn gói từng không gian"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
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
                      <div className="fixed left-0 right-0 top-27 bg-white border-b border-[#e6e1d8] shadow-[0_20px_40px_rgba(0,0,0,0.08)] max-h-[calc(100vh-120px)] overflow-y-auto z-50">
                        <div className="max-w-360 mx-auto px-8 py-8 grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-8 items-start">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 xl:gap-7 items-start">
                            {brandMegaMenuGroups.map((group) => (
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
                                  {group.items.map((sub) => (
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
                                src="https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1000&q=85"
                                alt="Thương hiệu nội thất quốc tế"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
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
                if (item.kind === "link") {
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
                    ? megaMenuGroups
                    : key === "rooms"
                    ? roomMegaMenuGroups
                    : brandMegaMenuGroups;

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
                              {g.items.slice(0, 4).map((sub) => (
                                <Link
                                  key={sub.to}
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
                to="/he-thong-cua-hang"
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
  );
}
