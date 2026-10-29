import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ChevronRight,
  Sparkles,
  ArrowRight,
  Search,
  Grid3X3,
  LayoutGrid,
  Layers,
  RotateCcw,
} from "lucide-react";
import Header from "../components/Headers";
import Footer from "../components/Footer";
import ProductCard from "../components/ProductCard";
import { AdminPagination } from "../components/admin/AdminPagination";
import { useStore } from "../hooks/useStore";
import { useProductList, type SortKey } from "../hooks/useProductList";
import "./pages.css";
import "./product-list.css";
import "./collections.css";

const vnd = (n: number) => Number(n).toLocaleString("vi-VN") + " ₫";

export default function CollectionsPage() {
  const store = useStore();
  const {
    slug,
    collections,
    activeCollectionInfo,
    loading,
    sortBy,
    setSortBy,
    selectedCat,
    setSelectedCat,
    searchQuery,
    setSearchQuery,
    gridCols,
    setGridCols,
    categories,
    filtered,
    pagination,
    handleResetFilters,
  } = useProductList();

  const [styleFilter, setStyleFilter] = useState<string>("all");
  const [collectionSearch, setCollectionSearch] = useState<string>("");

  const styleTags = useMemo(() => {
    const tags = new Set<string>();
    collections.forEach((c) => {
      if (c.styleTag) tags.add(c.styleTag);
    });
    return ["all", ...Array.from(tags)];
  }, [collections]);

  const filteredCollections = useMemo(() => {
    const q = collectionSearch.trim().toLowerCase();
    return collections.filter((col) => {
      if (styleFilter !== "all" && col.styleTag !== styleFilter) return false;
      if (q) {
        const hay =
          `${col.name} ${col.subtitle} ${col.description} ${col.materials} ${col.styleTag}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [collections, styleFilter, collectionSearch]);

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
          {activeCollectionInfo ? (
            <>
              <Link to="/bo-suu-tap">Bộ sưu tập</Link>
              <ChevronRight size={14} />
              <span className="current">{activeCollectionInfo.name}</span>
            </>
          ) : (
            <span className="current">Bộ sưu tập thiết kế</span>
          )}
        </nav>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* TRƯỜNG HỢP 1: TRANG TỔNG QUAN BỘ SƯU TẬP (/bo-suu-tap)           */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {!activeCollectionInfo ? (
          <>
            {/* Editorial Lookbook Hero */}
            <section className="bst-hero">
              <img
                src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1600&q=80"
                alt="Bộ Sưu Tập Nội Thất Nhà Xinh"
                className="bst-hero-bg"
              />
              <div className="bst-hero-overlay">
                <span className="bst-eyebrow">
                  <Sparkles size={13} /> LOOKBOOK NỘI THẤT ĐỘC QUYỀN 2026
                </span>
                <h1 className="bst-hero-title">
                  Bộ Sưu Tập Không Gian Sống Nhà Xinh
                </h1>
                <p className="bst-hero-sub">
                  Khác với danh mục sản phẩm đơn lẻ, mỗi Bộ Sưu Tập tại Nhà Xinh
                  là một bản phối hoàn chỉnh về kiến trúc, chất liệu và bảng màu
                  — giúp bạn kiến tạo không gian sống đồng điệu từ Phòng khách,
                  Phòng ăn đến Phòng ngủ.
                </p>
                <div className="bst-hero-stats">
                  <div className="bst-stat-item">
                    <span className="bst-stat-num">{collections.length}</span>
                    <span className="bst-stat-label">Bộ sưu tập chủ đề</span>
                  </div>
                  <div className="bst-stat-item">
                    <span className="bst-stat-num">100%</span>
                    <span className="bst-stat-label">
                      Thiết kế đồng bộ chất liệu
                    </span>
                  </div>
                  <div className="bst-stat-item">
                    <span className="bst-stat-num">4 Phong cách</span>
                    <span className="bst-stat-label">
                      Âu Châu • Đương Đại • Japandi • Resort
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Filter & Search Collections Bar */}
            <div className="bst-filter-bar">
              <div className="bst-style-pills">
                {styleTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className={`bst-style-pill ${styleFilter === tag ? "active" : ""}`}
                    onClick={() => setStyleFilter(tag)}
                  >
                    {tag === "all" ? "Tất cả phong cách" : tag}
                  </button>
                ))}
              </div>

              <div className="bst-search-wrap">
                <Search size={15} className="bst-search-icon" />
                <input
                  type="text"
                  value={collectionSearch}
                  onChange={(e) => setCollectionSearch(e.target.value)}
                  placeholder="Tìm kiếm bộ sưu tập, chất liệu..."
                  className="bst-search-input"
                />
              </div>
            </div>

            {/* Magazine / Lookbook Showcase Cards */}
            {filteredCollections.length === 0 ? (
              <div className="empty-state">
                <h2>Không tìm thấy bộ sưu tập phù hợp</h2>
                <p>Hãy thử chọn phong cách khác hoặc xóa từ khóa tìm kiếm.</p>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => {
                    setStyleFilter("all");
                    setCollectionSearch("");
                  }}
                >
                  Xem tất cả bộ sưu tập
                </button>
              </div>
            ) : (
              <div className="bst-showcase-list">
                {filteredCollections.map((col, idx) => (
                  <article
                    key={col.slug}
                    className={`bst-showcase-card ${idx % 2 === 1 ? "reverse" : ""}`}
                  >
                    <div className="bst-showcase-top">
                      <Link
                        to={`/bo-suu-tap/${col.slug}`}
                        className="bst-showcase-media"
                      >
                        <img
                          src={col.bannerImage}
                          alt={col.name}
                          loading="lazy"
                        />
                        <div className="bst-media-badges">
                          <span className="bst-badge-style">
                            <Sparkles size={12} /> {col.styleTag}
                          </span>
                          <span className="bst-badge-count">
                            {col.productCount || 0} thiết kế
                          </span>
                        </div>
                      </Link>

                      <div className="bst-showcase-info">
                        <span className="bst-col-number">
                          COLLECTION 0{idx + 1} • {col.styleTag}
                        </span>
                        <h2 className="bst-col-title">{col.name}</h2>
                        <p className="bst-col-subtitle">{col.subtitle}</p>
                        <p className="bst-col-desc">{col.description}</p>
                        <div className="bst-col-materials">
                          <Layers size={15} style={{ color: "#d26e4b", flexShrink: 0 }} />
                          <span>
                            <strong>Chất liệu chủ đạo:</strong> {col.materials}
                          </span>
                        </div>
                        <div className="bst-col-actions">
                          <Link
                            to={`/bo-suu-tap/${col.slug}`}
                            className="bst-btn-explore"
                          >
                            Khám phá trọn bộ sưu tập ({col.productCount || 0}{" "}
                            thiết kế) <ArrowRight size={16} />
                          </Link>
                        </div>
                      </div>
                    </div>

                    {/* Preview Strip of 3 Signature Products in this Collection */}
                    {col.previewProducts && col.previewProducts.length > 0 && (
                      <div className="bst-preview-strip">
                        <div className="bst-preview-header">
                          <span className="bst-preview-title">
                            Thiết kế tiêu biểu trong {col.name}
                          </span>
                          <Link
                            to={`/bo-suu-tap/${col.slug}`}
                            className="bst-preview-more"
                          >
                            Xem tất cả {col.productCount} sản phẩm →
                          </Link>
                        </div>
                        <div className="bst-preview-grid">
                          {col.previewProducts.map((item) => (
                            <Link
                              key={item.id}
                              to={`/san-pham/${item.slug}`}
                              className="bst-mini-card"
                            >
                              <img
                                src={item.image}
                                alt={item.name}
                                loading="lazy"
                              />
                              <div className="bst-mini-meta">
                                <span className="bst-mini-cat">
                                  {item.category}
                                </span>
                                <span className="bst-mini-name">
                                  {item.name}
                                </span>
                                <span className="bst-mini-price">
                                  {vnd(item.price)}
                                </span>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </>
        ) : (
          /* ════════════════════════════════════════════════════════════════ */
          /* TRƯỜNG HỢP 2: TRANG CHI TIẾT 1 BỘ SƯU TẬP (/bo-suu-tap/:slug)    */
          /* ════════════════════════════════════════════════════════════════ */
          <>
            {/* Collection Story Hero Banner */}
            <div className="col-showcase-wrap">
              <div className="col-hero-banner">
                <div className="col-hero-media">
                  <img
                    src={activeCollectionInfo.bannerImage}
                    alt={activeCollectionInfo.name}
                  />
                  <span className="col-hero-badge">
                    <Sparkles size={13} /> {activeCollectionInfo.styleTag}
                  </span>
                </div>
                <div className="col-hero-body">
                  <div className="col-hero-eyebrow">
                    BỘ SƯU TẬP ĐỘC QUYỀN NHÀ XINH
                  </div>
                  <h1 className="col-hero-title">
                    {activeCollectionInfo.name}
                  </h1>
                  <p className="col-hero-subtitle">
                    {activeCollectionInfo.subtitle}
                  </p>
                  <p className="col-hero-desc">
                    {activeCollectionInfo.description}
                  </p>
                  <div className="col-hero-materials">
                    <strong>Chất liệu chủ đạo:</strong>{" "}
                    {activeCollectionInfo.materials}
                  </div>
                  <div className="col-hero-footer">
                    <span className="col-hero-count">
                      Hiển thị <strong>{filtered.length}</strong> thiết kế trong
                      bộ sưu tập
                    </span>
                    <Link to="/bo-suu-tap" className="col-back-all">
                      ← Quay lại Lookbook tất cả bộ sưu tập
                    </Link>
                  </div>
                </div>
              </div>

              {/* Quick Collection Switcher Pills */}
              <div className="col-pills-bar">
                <Link to="/bo-suu-tap" className="col-pill">
                  ← Tất cả Bộ sưu tập
                </Link>
                {collections.map((col) => {
                  const isColActive =
                    slug === col.slug ||
                    Boolean(slug && col.aliases?.includes(slug));
                  return (
                    <Link
                      key={col.slug}
                      to={`/bo-suu-tap/${col.slug}`}
                      className={`col-pill ${isColActive ? "active" : ""}`}
                    >
                      {col.name.replace("Bộ Sưu Tập ", "")} ({col.productCount})
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Horizontal Curated Filter Bar (khác biệt hoàn toàn với sidebar của /san-pham) */}
            <div className="bst-detail-toolbar">
              <div className="bst-detail-cats">
                {categories.slice(0, 7).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`bst-style-pill ${selectedCat === cat ? "active" : ""}`}
                    onClick={() => setSelectedCat(cat)}
                  >
                    {cat === "all" ? "Tất cả hạng mục" : cat}
                  </button>
                ))}
              </div>

              <div className="pl-toolbar">
                <div className="pl-search-box">
                  <Search size={15} className="pl-search-icon" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm thiết kế trong bộ sưu tập..."
                    className="pl-search-input"
                  />
                </div>

                <select
                  className="pl-sort"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortKey)}
                >
                  <option value="default">Sắp xếp: Mặc định</option>
                  <option value="newest">Thiết kế mới nhất</option>
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

            {/* Products in this Collection */}
            {loading && displayedProducts.length === 0 ? (
              <div className="empty-state">
                <p>Đang tải thiết kế trong bộ sưu tập...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <h2>Không tìm thấy thiết kế phù hợp</h2>
                <p>Hãy thử đặt lại bộ lọc tìm kiếm trong bộ sưu tập này.</p>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={handleResetFilters}
                >
                  <RotateCcw size={14} /> Đặt lại bộ lọc
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
                      onAddToCart={store.addToCart}
                      onToggleWishlist={store.toggleWishlist}
                      isWishlisted={store.isWishlisted(p.id)}
                    />
                  ))}
                </div>
                <div style={{ marginTop: "28px" }}>
                  <AdminPagination
                    pagination={pagination}
                    itemLabel="thiết kế trong bộ sưu tập"
                  />
                </div>
              </>
            )}

            {/* Other Collections Showcase at Bottom */}
            <section className="bst-other-section">
              <div className="bst-other-header">
                <div>
                  <span className="col-hero-eyebrow">KHÁM PHÁ THÊM</span>
                  <h2 className="page-title" style={{ fontSize: "24px", margin: "4px 0 0" }}>
                    Các Bộ Sưu Tập Khác Của Nhà Xinh
                  </h2>
                </div>
                <Link to="/bo-suu-tap" className="bst-preview-more">
                  Xem toàn bộ Lookbook →
                </Link>
              </div>

              <div className="col-cards-grid">
                {collections
                  .filter((c) => c.slug !== activeCollectionInfo.slug)
                  .slice(0, 3)
                  .map((col) => (
                    <Link
                      key={col.slug}
                      to={`/bo-suu-tap/${col.slug}`}
                      className="col-card"
                    >
                      <div className="col-card-img-wrap">
                        <img
                          src={col.bannerImage}
                          alt={col.name}
                          loading="lazy"
                        />
                        <span className="col-card-style">{col.styleTag}</span>
                        <span className="col-card-count">
                          {col.productCount} thiết kế
                        </span>
                      </div>
                      <div className="col-card-body">
                        <h3 className="col-card-title">{col.name}</h3>
                        <p className="col-card-sub">{col.subtitle}</p>
                        <span className="col-card-cta">
                          Khám phá bộ sưu tập <ArrowRight size={14} />
                        </span>
                      </div>
                    </Link>
                  ))}
              </div>
            </section>
          </>
        )}
      </main>

      <Footer />
    </>
  );
}

