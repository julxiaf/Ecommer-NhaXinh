import { Link } from "react-router-dom";
import {
  Heart,
  ChevronRight,
  ShoppingBag,
  ArrowRight,
  Search,
  Trash2,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Sparkles,
  CheckCircle2,
  RotateCcw,
  Tag,
} from "lucide-react";
import Header from "../components/Headers";
import Footer from "../components/Footer";
import ProductCard, { type Product } from "../components/ProductCard";
import { AdminPagination } from "../components/admin/AdminPagination";
import { useStore } from "../hooks/useStore";
import {
  useWishlist,
  type WishlistPriceFilter,
  type WishlistPromoFilter,
  type WishlistSortOption,
} from "../hooks/useWishlist";
import "./pages.css";
import "./wishlist.css";

interface WishlistProps {
  wishlist?: Product[];
  onAddToCart?: (p: Product) => void;
  onToggleWishlist?: (p: Product) => void;
}

const vnd = (n: number) => Number(n).toLocaleString("vi-VN") + " ₫";

export default function WishlistPage({
  wishlist: propWishlist,
  onAddToCart: propOnAddToCart,
  onToggleWishlist: propOnToggleWishlist,
}: WishlistProps = {}) {
  const store = useStore();
  const wishlist = propWishlist ?? store.wishlist;
  const onAddToCart = propOnAddToCart ?? store.addToCart;
  const onToggleWishlist = propOnToggleWishlist ?? store.toggleWishlist;

  const {
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    priceFilter,
    setPriceFilter,
    promoFilter,
    setPromoFilter,
    sortBy,
    setSortBy,
    viewMode,
    setViewMode,
    selectedIds,
    toggleSelectItem,
    toggleSelectAllFiltered,
    availableCategories,
    stats,
    filteredWishlist,
    pagination,
    recommendedProducts,
    toastMessage,
    hasActiveFilters,
    handleAddSingleToCart,
    handleAddAllToCart,
    handleRemoveSingle,
    handleRemoveSelected,
    handleClearAll,
    handleResetFilters,
  } = useWishlist({
    wishlist,
    onAddToCart,
    onToggleWishlist,
  });

  const { paginatedItems: displayedWishlist } = pagination;
  const allFilteredSelected =
    filteredWishlist.length > 0 &&
    filteredWishlist.every((p) => selectedIds.includes(p.id));

  return (
    <>
      <Header
        user={store.user}
        cartCount={store.cartCount}
        wishlistCount={wishlist.length}
      />

      <main className="page-main">
        {/* Breadcrumb */}
        <div className="container">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link to="/">Trang chủ</Link>
            <ChevronRight size={14} />
            <span className="current">Sản phẩm yêu thích</span>
          </nav>
        </div>

        <section className="page-section">
          <div className="container">
            <div className="wl-header">
              <div>
                <h1 className="page-title">Bộ Sưu Tập Yêu Thích Của Bạn</h1>
                <p className="page-subtitle">
                  {wishlist.length > 0
                    ? `Đang lưu giữ ${wishlist.length} sản phẩm nội thất tinh tuyển`
                    : "Chưa có sản phẩm nào trong danh sách yêu thích"}
                </p>
              </div>
              {wishlist.length > 0 && (
                <div className="wl-header-actions">
                  <button
                    type="button"
                    className="btn-outline wl-btn-clear"
                    onClick={handleClearAll}
                  >
                    <Trash2 size={15} /> Xóa tất cả
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleAddAllToCart}
                  >
                    <ShoppingBag size={16} />
                    {selectedIds.length > 0
                      ? `Thêm ${selectedIds.length} mục đã chọn vào giỏ`
                      : "Thêm tất cả vào giỏ hàng"}
                  </button>
                </div>
              )}
            </div>

            {/* Toast Notification */}
            {toastMessage && (
              <div className="wl-toast">
                <CheckCircle2 size={18} />
                <span>{toastMessage}</span>
                <Link to="/gio-hang" className="wl-toast-link">
                  Xem giỏ hàng →
                </Link>
              </div>
            )}

            {wishlist.length === 0 ? (
              <div className="empty-state">
                <Heart size={56} strokeWidth={1} />
                <h3>Danh sách yêu thích đang trống</h3>
                <p>
                  Hãy nhấn vào biểu tượng trái tim trên các sản phẩm nội thất để
                  lưu lại những thiết kế bạn tâm đắc nhất cho tổ ấm của mình.
                </p>
                <Link to="/san-pham" className="btn-primary">
                  Khám phá sản phẩm <ArrowRight size={16} />
                </Link>
              </div>
            ) : (
              <>
                {/* KPI Summary Bar */}
                <div className="wl-stats-bar">
                  <div className="wl-stat-card">
                    <span className="wl-stat-label">Tổng sản phẩm đã lưu</span>
                    <strong className="wl-stat-value">
                      {stats.totalCount} sản phẩm
                    </strong>
                  </div>
                  <div className="wl-stat-card">
                    <span className="wl-stat-label">Sản phẩm đang ưu đãi</span>
                    <strong className="wl-stat-value wl-stat-accent">
                      {stats.discountedCount} sản phẩm
                    </strong>
                  </div>
                  <div className="wl-stat-card">
                    <span className="wl-stat-label">
                      Tổng giá trị ước tính
                    </span>
                    <strong className="wl-stat-value">
                      {vnd(stats.totalValue)}
                    </strong>
                  </div>
                  {stats.totalSavings > 0 && (
                    <div className="wl-stat-card wl-stat-saving">
                      <span className="wl-stat-label">
                        Tiết kiệm ngay khi đặt mua
                      </span>
                      <strong className="wl-stat-value">
                        -{vnd(stats.totalSavings)}
                      </strong>
                    </div>
                  )}
                </div>

                {/* Filter, Search & Sort Toolbar */}
                <div className="wl-toolbar">
                  <div className="wl-toolbar-top">
                    <div className="wl-search-box">
                      <Search size={16} className="wl-search-icon" />
                      <input
                        type="text"
                        className="wl-search-input"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm theo tên sản phẩm, danh mục, thương hiệu..."
                      />
                    </div>

                    <div className="wl-filters-group">
                      <select
                        value={priceFilter}
                        onChange={(e) =>
                          setPriceFilter(e.target.value as WishlistPriceFilter)
                        }
                        className="wl-select"
                      >
                        <option value="all">Mọi mức giá</option>
                        <option value="under10">Dưới 10 triệu</option>
                        <option value="10to30">Từ 10 - 30 triệu</option>
                        <option value="over30">Trên 30 triệu</option>
                      </select>

                      <select
                        value={promoFilter}
                        onChange={(e) =>
                          setPromoFilter(e.target.value as WishlistPromoFilter)
                        }
                        className="wl-select"
                      >
                        <option value="all">Tất cả trạng thái</option>
                        <option value="sale">Đang giảm giá</option>
                        <option value="new">Thiết kế mới</option>
                      </select>

                      <select
                        value={sortBy}
                        onChange={(e) =>
                          setSortBy(e.target.value as WishlistSortOption)
                        }
                        className="wl-select"
                      >
                        <option value="default">Sắp xếp: Mới lưu</option>
                        <option value="price-asc">Giá: Thấp đến Cao</option>
                        <option value="price-desc">Giá: Cao đến Thấp</option>
                        <option value="discount-desc">Ưu đãi nhiều nhất</option>
                        <option value="name-asc">Tên sản phẩm (A - Z)</option>
                      </select>

                      {hasActiveFilters && (
                        <button
                          type="button"
                          className="wl-reset-btn"
                          onClick={handleResetFilters}
                          title="Đặt lại bộ lọc"
                        >
                          <RotateCcw size={14} /> Đặt lại
                        </button>
                      )}
                    </div>

                    <div className="wl-view-toggle">
                      <button
                        type="button"
                        className={`wl-view-btn ${viewMode === "grid" ? "active" : ""}`}
                        onClick={() => setViewMode("grid")}
                        title="Xem dạng lưới"
                      >
                        <LayoutGrid size={16} />
                      </button>
                      <button
                        type="button"
                        className={`wl-view-btn ${viewMode === "list" ? "active" : ""}`}
                        onClick={() => setViewMode("list")}
                        title="Xem dạng danh sách"
                      >
                        <List size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Category Pills & Bulk Selection Bar */}
                  <div className="wl-toolbar-bottom">
                    <div className="wl-promo-chips">
                      <button
                        type="button"
                        className={`wl-chip ${selectedCategory === "all" ? "active" : ""}`}
                        onClick={() => setSelectedCategory("all")}
                      >
                        Tất cả ({wishlist.length})
                      </button>
                      {availableCategories.map((cat) => {
                        const count = wishlist.filter(
                          (p) => p.category === cat
                        ).length;
                        return (
                          <button
                            key={cat}
                            type="button"
                            className={`wl-chip ${selectedCategory === cat ? "active" : ""}`}
                            onClick={() => setSelectedCategory(cat)}
                          >
                            {cat} ({count})
                          </button>
                        );
                      })}
                    </div>

                    <div className="wl-bulk-bar">
                      <label className="wl-checkbox-label">
                        <input
                          type="checkbox"
                          checked={allFilteredSelected}
                          onChange={toggleSelectAllFiltered}
                        />
                        <span>
                          Chọn tất cả ({filteredWishlist.length} hiển thị)
                        </span>
                      </label>
                      {selectedIds.length > 0 && (
                        <button
                          type="button"
                          className="wl-bulk-delete-btn"
                          onClick={handleRemoveSelected}
                        >
                          <Trash2 size={13} /> Bỏ thích ({selectedIds.length})
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Filtered Results */}
                {filteredWishlist.length === 0 ? (
                  <div className="empty-state" style={{ padding: "48px 20px" }}>
                    <SlidersHorizontal size={40} strokeWidth={1.2} />
                    <h3>Không tìm thấy sản phẩm phù hợp</h3>
                    <p>
                      Không có sản phẩm yêu thích nào khớp với điều kiện lọc
                      hiện tại.
                    </p>
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={handleResetFilters}
                    >
                      Xóa bộ lọc tìm kiếm
                    </button>
                  </div>
                ) : viewMode === "grid" ? (
                  <div className="product-grid">
                    {displayedWishlist.map((p) => {
                      const isSelected = selectedIds.includes(p.id);
                      return (
                        <div
                          key={p.id}
                          className={`wl-card-wrapper ${isSelected ? "selected" : ""}`}
                        >
                          <label
                            className="wl-select-badge"
                            title="Chọn sản phẩm để thao tác hàng loạt"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectItem(p.id)}
                            />
                          </label>
                          <ProductCard
                            product={p}
                            onAddToCart={handleAddSingleToCart}
                            onToggleWishlist={handleRemoveSingle}
                            isWishlisted={true}
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="wl-list-view">
                    {displayedWishlist.map((p) => {
                      const isSelected = selectedIds.includes(p.id);
                      return (
                        <div
                          key={p.id}
                          className={`wl-list-item ${isSelected ? "selected" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectItem(p.id)}
                            className="wl-list-checkbox"
                          />
                          <Link
                            to={`/san-pham/${p.slug}`}
                            className="wl-list-thumb"
                          >
                            <img src={p.image} alt={p.name} loading="lazy" />
                          </Link>
                          <div className="wl-list-info">
                            <span className="wl-list-cat">{p.category}</span>
                            <Link
                              to={`/san-pham/${p.slug}`}
                              className="wl-list-name"
                            >
                              {p.name}
                            </Link>
                            <div className="wl-list-meta">
                              {p.brand && <span>Thương hiệu: {p.brand}</span>}
                              {p.shortDescription && (
                                <span>{p.shortDescription}</span>
                              )}
                              {p.discount && p.discount > 0 && (
                                <span style={{ color: "#d26e4b", fontWeight: 600 }}>
                                  <Tag size={12} style={{ display: "inline", marginRight: 4 }} />
                                  Ưu đãi -{p.discount}%
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="wl-list-price-col">
                            <span className="wl-list-price">
                              {vnd(p.price)}
                            </span>
                            {p.originalPrice && p.originalPrice > p.price && (
                              <span className="wl-list-original">
                                {vnd(p.originalPrice)}
                              </span>
                            )}
                          </div>
                          <div className="wl-list-actions">
                            <button
                              type="button"
                              className="btn-primary"
                              onClick={() => handleAddSingleToCart(p)}
                            >
                              <ShoppingBag size={15} /> Thêm vào giỏ
                            </button>
                            <button
                              type="button"
                              className="wl-list-remove"
                              onClick={() => handleRemoveSingle(p)}
                              title="Bỏ khỏi danh sách yêu thích"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Pagination */}
                {filteredWishlist.length > 0 && (
                  <div style={{ marginTop: "28px" }}>
                    <AdminPagination
                      pagination={pagination}
                      itemLabel="sản phẩm yêu thích"
                    />
                  </div>
                )}
              </>
            )}

            {/* Recommended Products to Add to Wishlist */}
            {recommendedProducts.length > 0 && (
              <div className="wl-recommendations">
                <div className="wl-rec-header">
                  <div>
                    <h2 className="wl-rec-title">
                      <Sparkles size={20} style={{ color: "#d26e4b" }} /> Có Thể
                      Bạn Cũng Yêu Thích
                    </h2>
                    <p className="wl-rec-sub">
                      Gợi ý các thiết kế nội thất nổi bật phù hợp với không gian
                      sống của bạn
                    </p>
                  </div>
                  <Link to="/san-pham" className="wl-rec-more">
                    Xem toàn bộ sản phẩm <ArrowRight size={15} />
                  </Link>
                </div>
                <div className="product-grid">
                  {recommendedProducts.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      onAddToCart={handleAddSingleToCart}
                      onToggleWishlist={(item) => {
                        onToggleWishlist(item);
                      }}
                      isWishlisted={false}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
