import { Link } from "react-router-dom";
import {
  SlidersHorizontal,
  Grid3X3,
  LayoutGrid,
  ChevronRight,
  X,
  Search,
  RotateCcw,
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
          ) : categoryFromSlug ? (
            <>
              <Link to="/san-pham">Sản phẩm</Link>
              <ChevronRight size={14} />
              <span className="current">{categoryFromSlug}</span>
            </>
          ) : (
            <span className="current">Sản phẩm</span>
          )}
        </nav>

        {/* Page Header & Toolbar */}
        <div className="pl-header">
          <div>
            <h1 className="page-title">{pageTitle}</h1>
            <p className="page-subtitle" style={{ marginBottom: 0 }}>
              {filtered.length} sản phẩm
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
              <h4 className="pl-filter-title">Danh mục không gian</h4>
              <ul className="pl-filter-list">
                {categories.map((cat) => (
                  <li key={cat}>
                    <button
                      type="button"
                      className={`pl-filter-item ${activeCat === cat ? "active" : ""}`}
                      onClick={() => setSelectedCat(cat)}
                    >
                      {cat === "all" ? "Tất cả danh mục" : cat}
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
              <div className="empty-state">
                <h2>Không tìm thấy sản phẩm</h2>
                <p>Hãy thử thay đổi bộ lọc để xem thêm sản phẩm</p>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={handleResetFilters}
                >
                  Xóa bộ lọc
                </button>
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
