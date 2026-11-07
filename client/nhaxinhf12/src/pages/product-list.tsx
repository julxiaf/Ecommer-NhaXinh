import { Link } from "react-router-dom";
import {
  SlidersHorizontal,
  Grid3X3,
  LayoutGrid,
  ChevronRight,
  X,
  Search,
  RotateCcw,
  FolderX,
  Home,
  ShoppingBag,
  MessageCircle,
} from "lucide-react";
import Header from "../components/Headers";
import Footer from "../components/Footer";
import ProductCard, { type Product } from "../components/ProductCard";
import { AdminPagination } from "../components/admin/AdminPagination";
import { useStore } from "../hooks/useStore";
import { useProductList, type SortKey } from "../hooks/useProductList";
import "./pages.css";
import "./product-list.css";

interface ProductListProps {
  onAddToCart?: (p: Product) => void;
  onToggleWishlist?: (p: Product) => void;
  isWishlisted?: (id: number) => boolean;
}

export default function ProductListPage({
  onAddToCart: propOnAddToCart,
  onToggleWishlist: propOnToggleWishlist,
  isWishlisted: propIsWishlisted,
}: ProductListProps = {}) {
  const store = useStore();
  const onAddToCart = propOnAddToCart ?? store.addToCart;
  const onToggleWishlist = propOnToggleWishlist ?? store.toggleWishlist;
  const isWishlisted = propIsWishlisted ?? store.isWishlisted;

  const {
    isSpecialOfferRoute,
    isNewProductRoute,
    isRoomRoute,
    loading,
    sortBy,
    setSortBy,
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
  } = useProductList();

  const { paginatedItems: displayedProducts } = pagination;

  return (
    <>
      <Header
        user={store.user}
        cartCount={store.cartCount}
        wishlistCount={store.wishlist.length}
      />

      <main className="page">
        {/* Breadcrumb */}
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Trang chủ</Link>
          <ChevronRight size={14} />
          {isSpecialOfferRoute ? (
            <span className="current">Ưu Đãi Đặc Biệt</span>
          ) : isNewProductRoute ? (
            <>
              <Link to="/san-pham">Sản phẩm</Link>
              <ChevronRight size={14} />
              <span className="current">Sản phẩm mới</span>
            </>
          ) : isRoomRoute ? (
            <>
              <Link to="/phong">Không gian phòng</Link>
              {categoryFromSlug && (
                <>
                  <ChevronRight size={14} />
                  <span className="current">{categoryFromSlug}</span>
                </>
              )}
            </>
          ) : categoryFromSlug ? (
            <>
              <Link to="/san-pham">Sản phẩm</Link>
              <ChevronRight size={14} />
              <span className="current">{categoryFromSlug}</span>
            </>
          ) : (
            <span className="current">Tất cả sản phẩm</span>
          )}
        </nav>

        {/* Page Header & Toolbar */}
        <div className="pl-header">
          <div>
            <h1 className="page-title">{pageTitle}</h1>
            <p className="page-subtitle" style={{ marginBottom: 0 }}>
              {isNewProductRoute
                ? `Tuyển tập ${filtered.length} thiết kế nội thất mới nhất mang phong cách thanh lịch hiện đại từ Nhà Xinh`
                : `${filtered.length} sản phẩm`}
            </p>
          </div>

          <div className="pl-toolbar">
            <div className="pl-search-box">
              <Search size={15} className="pl-search-icon" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm sản phẩm, chất liệu..."
                className="pl-search-input"
              />
            </div>

            <button
              type="button"
              className="pl-filter-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <SlidersHorizontal size={16} /> Bộ lọc
            </button>

            <select
              className="pl-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              aria-label="Sắp xếp"
            >
              <option value="default">Mặc định</option>
              <option value="newest">Mới nhất</option>
              <option value="price-asc">Giá: Thấp → Cao</option>
              <option value="price-desc">Giá: Cao → Thấp</option>
              <option value="name">Tên: A → Z</option>
            </select>

            <div className="pl-grid-btns">
              <button
                type="button"
                className={`pl-grid-btn ${gridCols === 3 ? "active" : ""}`}
                onClick={() => setGridCols(3)}
                aria-label="3 cột"
              >
                <Grid3X3 size={16} />
              </button>
              <button
                type="button"
                className={`pl-grid-btn ${gridCols === 4 ? "active" : ""}`}
                onClick={() => setGridCols(4)}
                aria-label="4 cột"
              >
                <LayoutGrid size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="pl-layout">
          {/* Sidebar filters */}
          <aside className={`pl-sidebar ${sidebarOpen ? "open" : ""}`}>
            <div className="pl-sidebar-header">
              <h3>Bộ lọc</h3>
              <button
                type="button"
                className="pl-sidebar-close"
                onClick={() => setSidebarOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            {/* Category filter */}
            <div className="pl-filter-group">
              <h4 className="pl-filter-title">
                {isRoomRoute ? "Danh mục không gian" : "Danh mục sản phẩm"}
              </h4>
              <ul className="pl-filter-list">
                {categories.map((cat) => (
                  <li key={cat}>
                    <button
                      type="button"
                      className={`pl-filter-item ${activeCat === cat ? "active" : ""}`}
                      onClick={() => setSelectedCat(cat)}
                    >
                      {cat === "all"
                        ? isRoomRoute
                          ? "Tất cả không gian"
                          : "Tất cả sản phẩm"
                        : cat}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Material filter */}
            <div className="pl-filter-group">
              <h4 className="pl-filter-title">Chất liệu</h4>
              <ul className="pl-filter-list">
                {materials.map((mat) => (
                  <li key={mat}>
                    <button
                      type="button"
                      className={`pl-filter-item ${selectedMaterial === mat ? "active" : ""}`}
                      onClick={() => setSelectedMaterial(mat)}
                    >
                      {mat === "all" ? "Tất cả chất liệu" : mat}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Price range */}
            <div className="pl-filter-group">
              <h4 className="pl-filter-title">Khoảng giá</h4>
              <div className="pl-price-inputs">
                <input
                  type="number"
                  placeholder="Từ"
                  value={priceRange[0] || ""}
                  onChange={(e) =>
                    setPriceRange([Number(e.target.value), priceRange[1]])
                  }
                />
                <span>—</span>
                <input
                  type="number"
                  placeholder="Đến"
                  value={priceRange[1] === 100_000_000 ? "" : priceRange[1]}
                  onChange={(e) =>
                    setPriceRange([
                      priceRange[0],
                      Number(e.target.value) || 100_000_000,
                    ])
                  }
                />
              </div>
              <div className="pl-price-tags">
                {[
                  { label: "Tất cả", range: [0, 100_000_000] },
                  { label: "Dưới 10tr", range: [0, 10_000_000] },
                  { label: "10 – 25tr", range: [10_000_000, 25_000_000] },
                  { label: "25 – 50tr", range: [25_000_000, 50_000_000] },
                  { label: "Trên 50tr", range: [50_000_000, 100_000_000] },
                ].map((t) => (
                  <button
                    key={t.label}
                    type="button"
                    className={`pl-price-tag ${
                      priceRange[0] === t.range[0] &&
                      priceRange[1] === t.range[1]
                        ? "active"
                        : ""
                    }`}
                    onClick={() => setPriceRange(t.range as [number, number])}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              className="btn-outline"
              style={{ width: "100%" }}
              onClick={handleResetFilters}
            >
              <RotateCcw size={14} /> Đặt lại tất cả bộ lọc
            </button>
          </aside>

          {/* Product grid */}
          <div className="pl-content">
            {loading && displayedProducts.length === 0 ? (
              <div className="empty-state">
                <p>Đang tải sản phẩm...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-12 px-6 sm:px-10 rounded-2xl bg-white border border-stone-200/90 text-center shadow-xs my-4 max-w-2xl mx-auto">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-amber-50 text-[#b86b49] mb-5 border border-amber-200/60">
                  <FolderX size={40} className="stroke-[1.5]" />
                </div>

                <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 mb-2">
                  {categoryFromSlug || activeCat !== "all"
                    ? `Không có sản phẩm nào thuộc danh mục "${pageTitle}"`
                    : isSpecialOfferRoute
                    ? "Hiện chưa có sản phẩm ưu đãi trong mục này"
                    : isNewProductRoute
                    ? "Chưa có sản phẩm mới nào được niêm yết"
                    : "Không tìm thấy sản phẩm phù hợp"}
                </h2>

                <p className="text-stone-600 text-xs sm:text-sm leading-relaxed max-w-md mx-auto mb-6 font-light">
                  {categoryFromSlug || activeCat !== "all"
                    ? "Hiện tại danh mục này chưa có sản phẩm nào hoặc phân loại đang được cập nhật lại. Quý khách vui lòng khám phá các danh mục khác hoặc liên hệ để được tư vấn kiểm tra kho hàng."
                    : "Không có sản phẩm nào khớp với tiêu chí tìm kiếm hoặc bộ lọc hiện tại. Quý khách có thể thử đặt lại bộ lọc hoặc tìm kiếm với từ khóa khác."}
                </p>

                {/* Primary action buttons */}
                <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
                  <Link
                    to="/san-pham"
                    onClick={handleResetFilters}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#b86b49] hover:bg-[#a05a3b] text-white font-semibold text-xs sm:text-sm transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    <ShoppingBag size={15} />
                    <span>Xem tất cả sản phẩm</span>
                  </Link>

                  <Link
                    to="/"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold text-xs sm:text-sm transition-all cursor-pointer"
                  >
                    <Home size={15} />
                    <span>Về trang chủ</span>
                  </Link>

                  <a
                    href="https://zalo.me/0974933486"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0068ff] hover:bg-[#0057d9] text-white font-semibold text-xs sm:text-sm transition-all shadow-2xs"
                  >
                    <MessageCircle size={15} />
                    <span>Tư vấn qua Zalo</span>
                  </a>
                </div>

                {/* Quick suggestions */}
                <div className="pt-6 border-t border-stone-100">
                  <p className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">
                    Gợi ý các danh mục sản phẩm nổi bật:
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {[
                      { label: "Sofa", to: "/danh-muc/sofa" },
                      { label: "Bàn", to: "/danh-muc/ban" },
                      { label: "Ghế", to: "/danh-muc/ghe" },
                      { label: "Giường & Nệm", to: "/danh-muc/giuong" },
                      { label: "Tủ & Kệ", to: "/danh-muc/tu-va-ke" },
                      { label: "Đèn & Thảm", to: "/danh-muc/den" },
                    ].map((c) => (
                      <Link
                        key={c.to}
                        to={c.to}
                        className="px-3 py-1.5 rounded-lg bg-stone-50 hover:bg-amber-50 hover:text-[#b86b49] border border-stone-200 text-stone-700 text-xs font-medium transition-colors"
                      >
                        {c.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div
                  className="product-grid"
                  style={{
                    gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
                  }}
                >
                  {displayedProducts.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      onAddToCart={onAddToCart}
                      onToggleWishlist={onToggleWishlist}
                      isWishlisted={isWishlisted(p.id)}
                    />
                  ))}
                </div>
                <div style={{ marginTop: "28px" }}>
                  <AdminPagination
                    pagination={pagination}
                    itemLabel="sản phẩm"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
