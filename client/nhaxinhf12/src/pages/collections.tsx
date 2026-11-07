import { createPortal } from "react-dom";
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
  X,
  Eye,
  MessageCircle,
  MapPin,
  Calendar,
} from "lucide-react";
import Header from "../components/Headers";
import Footer from "../components/Footer";
import ProductCard from "../components/ProductCard";
import { AdminPagination } from "../components/admin/AdminPagination";
import { useCollections, ROOM_FILTER_TABS } from "../hooks/useCollections";
import { type SortKey } from "../hooks/useProductList";
import { DEFAULT_PLACEHOLDER_IMAGE } from "../services/productService";
import "./pages.css";
import "./product-list.css";
import "./collections.css";

const vnd = (n: number) => Number(n).toLocaleString("vi-VN") + " ₫";

function resolveVideoEmbed(rawUrl?: string): { type: "iframe" | "video"; src: string } | null {
  if (!rawUrl || !rawUrl.trim()) return null;
  const url = rawUrl.trim();

  // YouTube watch?v= / youtu.be/ / youtube.com/shorts/ / youtube.com/embed/
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i
  );
  if (ytMatch && ytMatch[1]) {
    return {
      type: "iframe",
      src: `https://www.youtube.com/embed/${ytMatch[1]}?rel=0`,
    };
  }

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      type: "iframe",
      src: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
    };
  }

  // Direct MP4 / WebM / MOV or uploaded video
  return {
    type: "video",
    src: url,
  };
}

export default function CollectionsPage() {
  const {
    slug,
    serverArticles,
    store,
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
    filtered,
    pagination,
    handleResetFilters,
    displayedProducts,
    styleFilter,
    setStyleFilter,
    collectionSearch,
    setCollectionSearch,
    readingArticle,
    setReadingArticle,
    readingArticleProducts,
    getArticleCollectionUrl,
    activeCollectionArticle,
    styleTags,
    filteredCollections,
    roomProductCounts,
  } = useCollections();

  return (
    <>
      <Header
        user={store.user}
        cartCount={store.cartCount}
        wishlistCount={store.wishlist.length}
      />

      <main className="page">
        {/* Breadcrumb Navigation chuẩn phong cách Nhà Xinh */}
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
                src="/uploads/collections/hero-lookbook.jpg"
                alt="Bộ Sưu Tập Nội Thất Nhà Xinh"
                className="bst-hero-bg"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.onerror = null;
                  target.src = DEFAULT_PLACEHOLDER_IMAGE;
                }}
              />
              <div className="bst-hero-overlay">
                <span className="bst-eyebrow">
                  <Sparkles size={13} /> LOOKBOOK NỘI THẤT CAO CẤP • NHÀ XINH SIGNATURE
                </span>
                <h1 className="bst-hero-title">
                  Bộ Sưu Tập Không Gian Sống Nhà Xinh
                </h1>
                <p className="bst-hero-sub">
                  Khác với danh mục sản phẩm đơn lẻ, mỗi Bộ Sưu Tập tại Nhà Xinh là một câu chuyện
                  phong cách sống hoàn chỉnh về kiến trúc, chất liệu và bảng màu — giúp bạn kiến tạo
                  tổ ấm đồng điệu trọn vẹn từ Phòng khách, Phòng ăn đến Phòng ngủ.
                </p>
                <div className="bst-hero-stats">
                  <div className="bst-stat-item">
                    <span className="bst-stat-num">{collections.length}+</span>
                    <span className="bst-stat-label">Bộ sưu tập độc quyền</span>
                  </div>
                  <div className="bst-stat-item">
                    <span className="bst-stat-num">100%</span>
                    <span className="bst-stat-label">Đồng bộ 3 không gian</span>
                  </div>
                  <div className="bst-stat-item">
                    <span className="bst-stat-num">Ash • Beech • Da Ý</span>
                    <span className="bst-stat-label">Chất liệu tự nhiên cao cấp</span>
                  </div>
                  <div className="bst-stat-item">
                    <span className="bst-stat-num">24 Tháng</span>
                    <span className="bst-stat-label">Bảo hành chính hãng</span>
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
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.onerror = null;
                            target.src = DEFAULT_PLACEHOLDER_IMAGE;
                          }}
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

                    {/* Preview Strip of Signature Products */}
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
                                onError={(e) => {
                                  const target = e.currentTarget;
                                  target.onerror = null;
                                  target.src = DEFAULT_PLACEHOLDER_IMAGE;
                                }}
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

            {/* ── BÀI VIẾT & CẢM HỨNG BỘ SƯU TẬP (LẤY TỪ SERVER BACKEND) ── */}
            {serverArticles.length > 0 && (
              <section className="bst-articles-section">
                <div className="bst-articles-header">
                  <div>
                    <span className="col-hero-eyebrow">LOOKBOOK & CẢM HỨNG THIẾT KẾ</span>
                    <h2 className="page-title" style={{ fontSize: "24px", margin: "4px 0 0" }}>
                      Bài Viết Chuyên Đề Về Bộ Sưu Tập
                    </h2>
                  </div>
                  <span className="bst-preview-more">
                    Lấy trực tiếp từ hệ thống Nhà Xinh Server
                  </span>
                </div>

                <div className="bst-articles-grid">
                  {serverArticles.map((art) => {
                    const collectionUrl = getArticleCollectionUrl(art);
                    return (
                      <Link
                        key={art.id}
                        to={collectionUrl}
                        className="bst-article-card group cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg block text-inherit no-underline"
                      >
                        <div className="bst-article-img-wrap relative overflow-hidden">
                          <img
                            src={art.image}
                            alt={art.title}
                            loading="lazy"
                            className="transition-transform duration-500 group-hover:scale-105"
                            onError={(e) => {
                              const target = e.currentTarget;
                              target.onerror = null;
                              target.src = DEFAULT_PLACEHOLDER_IMAGE;
                            }}
                          />
                          <span className="bst-article-tag">Bộ sưu tập</span>
                        </div>
                        <div className="bst-article-body">
                          <span className="bst-article-meta flex items-center justify-between">
                            <span>{art.author} • {art.createdAt}</span>
                            <span className="flex items-center gap-1 text-[11px] text-stone-500">
                              <Eye size={12} /> {art.views} lượt xem
                            </span>
                          </span>
                          <h3 className="bst-article-title group-hover:text-amber-800 transition-colors">
                            {art.title}
                          </h3>
                          <p className="bst-article-desc">{art.summary}</p>
                          <div className="flex items-center justify-between pt-2">
                            <span className="bst-article-link inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 group-hover:text-amber-900 group-hover:gap-2 transition-all">
                              Khám phá bộ sưu tập & sản phẩm <ArrowRight size={14} />
                            </span>
                            {art.collectionSlug && (
                              <span className="text-[11px] font-semibold text-stone-600 bg-stone-100 group-hover:bg-amber-100 group-hover:text-amber-900 px-2.5 py-1 rounded transition-colors font-mono">
                                /{art.collectionSlug}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Banner tư vấn thiết kế & Trải nghiệm Showroom */}
            <section className="bst-consult-banner">
              <div className="bst-consult-info">
                <span className="bst-consult-eyebrow">
                  <Sparkles size={13} /> TRẢI NGHIỆM THỰC TẾ & TƯ VẤN THIẾT KẾ
                </span>
                <h3 className="bst-consult-title">
                  Kiến tạo tổ ấm trong mơ cùng đội ngũ Kiến trúc sư Nhà Xinh
                </h3>
                <p className="bst-consult-sub">
                  Ghé thăm hệ thống showroom Nhà Xinh tại Hà Nội, TP.HCM & Bình Dương để trực tiếp chạm,
                  cảm nhận chất liệu gỗ tự nhiên, da Ý và nhận bản vẽ phối cảnh 3D miễn phí cho ngôi nhà bạn.
                </p>
              </div>
              <div className="bst-consult-btns">
                <a
                  href="https://zalo.me/0974933486"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bst-consult-btn-zalo"
                >
                  <MessageCircle size={17} />
                  <span>Chat Zalo tư vấn (0974.933.486)</span>
                </a>
                <Link to="/tu-van-thiet-ke" className="bst-consult-btn-3d">
                  <Calendar size={17} />
                  <span>Đăng ký tư vấn 3D</span>
                </Link>
                <Link to="/he-thong-showroom" className="bst-consult-btn-showroom">
                  <MapPin size={17} />
                  <span>Hệ thống Showroom</span>
                </Link>
              </div>
            </section>
          </>
        ) : (
          /* ════════════════════════════════════════════════════════════════ */
          /* TRƯỜNG HỢP 2: TRANG CHI TIẾT 1 BỘ SƯU TẬP (/bo-suu-tap/:slug)    */
          /* Thiết kế chuẩn mẫu Nhà Xinh: Banner chữ trắng ở giữa -> Trích dẫn */
          /* nghiêng -> Câu chuyện chất liệu -> Ảnh đôi 2 cột -> Video -> SP  */
          /* ════════════════════════════════════════════════════════════════ */
          <>
            {/* Thanh chuyển nhanh giữa các Bộ sưu tập */}
            <div className="col-pills-bar" style={{ marginBottom: "20px" }}>
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
                    {col.name.replace(/^Bộ Sưu Tập\s*/i, "")}
                  </Link>
                );
              })}
            </div>

            {/* 1. HERO BANNER LỚN VỚI TIÊU ĐỀ IN HOA MÀU TRẮNG CĂN GIỮA (GIỐNG MẪU ORIENTALE) */}
            <section className="nx-orientale-hero-wrap">
              <div className="nx-orientale-hero-banner">
                <img
                  src={activeCollectionInfo.bannerImage}
                  alt={activeCollectionInfo.name}
                  className="nx-orientale-hero-img"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.onerror = null;
                    target.src = DEFAULT_PLACEHOLDER_IMAGE;
                  }}
                />
                <div className="nx-orientale-hero-overlay">
                  <h1 className="nx-orientale-hero-title">
                    <span>{activeCollectionInfo.name.toUpperCase()} –</span>
                    <span>
                      {(
                        activeCollectionInfo.subtitle ||
                        "CÂU CHUYỆN CỦA SỰ KHỞI ĐẦU"
                      ).toUpperCase()}
                    </span>
                  </h1>
                </div>
              </div>

              {/* 2. DÒNG TRÍCH DẪN IN NGHIÊNG CĂN GIỮA NGAY DƯỚI BANNER */}
              <p className="nx-orientale-quote">
                {activeCollectionInfo.introQuote ||
                  `“${activeCollectionInfo.name
                    .replace(/^Bộ Sưu Tập\s*/i, "")
                    .toUpperCase()}” – một cái tên đầy ý nghĩa với mong muốn tạo ra những kết nối từ khắp nơi trên thế giới, để cùng nhau dệt nên câu chuyện mới đầy cảm hứng và diệu kỳ.`}
              </p>
            </section>

            {/* 3. CÂU CHUYỆN CHẤT LIỆU & BỘ ẢNH CHI TIẾT 2 CỘT SONG SONG */}
            <section className="nx-orientale-editorial">
              <h2 className="nx-orientale-story-heading">
                {activeCollectionInfo.storyTitle ||
                  "Chất liệu cao cấp tạo trải nghiệm đẳng cấp"}
              </h2>
              <p className="nx-orientale-story-text">
                {activeCollectionInfo.description}
              </p>

              {/* Lưới 2 ảnh lớn song song (Giống hệt mẫu Nhà Xinh Orientale) */}
              {(() => {
                const imgs =
                  activeCollectionInfo.galleryImages &&
                  activeCollectionInfo.galleryImages.length > 0
                    ? activeCollectionInfo.galleryImages
                    : [
                        activeCollectionInfo.bannerImage,
                        "/uploads/collections/net-duong-dai.jpg",
                      ];
                const firstPair = imgs.slice(0, 2);
                const restImages = imgs.slice(2);

                return (
                  <>
                    <div className="nx-orientale-gallery-grid">
                      {firstPair.map((imgUrl, idx) => (
                        <div key={idx} className="nx-orientale-gallery-item">
                          <img
                            src={imgUrl}
                            alt={`${activeCollectionInfo.name} - Chi tiết ${idx + 1}`}
                            loading="lazy"
                            onError={(e) => {
                              const target = e.currentTarget;
                              target.onerror = null;
                              target.src = activeCollectionInfo.bannerImage || DEFAULT_PLACEHOLDER_IMAGE;
                            }}
                          />
                        </div>
                      ))}
                    </div>

                    {restImages.length > 0 && (
                      <div className="nx-orientale-second-story">
                        <h3 className="nx-orientale-story-heading">
                          Thiết kế tinh tế trong từng đường nét – Đồng điệu mọi không gian sống
                        </h3>
                        <p className="nx-orientale-story-text">
                          Từng chi tiết trong <strong>{activeCollectionInfo.name}</strong> được hoàn thiện tỉ mỉ với chất liệu chủ đạo{" "}
                          <strong>{activeCollectionInfo.materials}</strong>, mang lại sự kết nối hài hòa giữa Phòng khách, Phòng ăn và Phòng ngủ — tạo nên tổ ấm sang trọng, ấm cúng và mang đậm dấu ấn cá nhân của gia chủ.
                        </p>
                        <div className="nx-orientale-gallery-grid">
                          {restImages.map((imgUrl, idx) => (
                            <div key={idx} className="nx-orientale-gallery-item">
                              <img
                                src={imgUrl}
                                alt={`${activeCollectionInfo.name} - Không gian ${idx + 3}`}
                                loading="lazy"
                                onError={(e) => {
                                  const target = e.currentTarget;
                                  target.onerror = null;
                                  target.src = activeCollectionInfo.bannerImage || DEFAULT_PLACEHOLDER_IMAGE;
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}

              {/* Nếu có bài viết chuyên sâu TipTap từ Backend gắn với Bộ sưu tập này */}
              {activeCollectionArticle && activeCollectionArticle.content && (
                <div className="nx-orientale-article-extra">
                  {activeCollectionArticle.summary && (
                    <p className="nx-orientale-story-text">
                      {activeCollectionArticle.summary}
                    </p>
                  )}
                  <div
                    className="bst-editorial-body"
                    dangerouslySetInnerHTML={{
                      __html: activeCollectionArticle.content,
                    }}
                  />
                </div>
              )}
            </section>

            {/* 4. VIDEO GIỚI THIỆU BỘ SƯU TẬP (YOUTUBE / VIMEO HOẶC FILE MP4 TẢI LÊN) */}
            {(() => {
              const videoData = resolveVideoEmbed(activeCollectionInfo.videoUrl);
              if (!videoData) return null;
              return (
                <section className="nx-orientale-video-section">
                  <div className="nx-orientale-video-header">
                    <span className="col-hero-eyebrow">
                      VIDEO CẢM HỨNG & TRẢI NGHIỆM THỰC TẾ
                    </span>
                    <h2 className="nx-orientale-story-heading" style={{ margin: "6px 0 8px" }}>
                      Khám Phá Không Gian Sống {activeCollectionInfo.name} Qua Video
                    </h2>
                    <p className="nx-orientale-story-text" style={{ marginBottom: "18px" }}>
                      Cảm nhận trọn vẹn đường nét chế tác thủ công, sắc độ gỗ tự nhiên và sự kết hợp hài hòa của {activeCollectionInfo.name} trong không gian thực tế.
                    </p>
                  </div>

                  <div className="nx-orientale-video-frame">
                    {videoData.type === "iframe" ? (
                      <iframe
                        src={videoData.src}
                        title={`Video ${activeCollectionInfo.name}`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="nx-orientale-video-el"
                      />
                    ) : (
                      <video
                        src={videoData.src}
                        poster={activeCollectionInfo.bannerImage}
                        controls
                        playsInline
                        className="nx-orientale-video-el"
                      />
                    )}
                  </div>
                </section>
              );
            })()}

            {/* 5. DANH SÁCH SẢN PHẨM THUỘC BỘ SƯU TẬP */}
            <section className="nx-orientale-products-section">
              <div className="nx-orientale-products-header">
                <div>
                  <span className="col-hero-eyebrow">
                    TRỌN BỘ THIẾT KẾ ĐỒNG BỘ • NHÀ XINH
                  </span>
                  <h2 className="nx-orientale-products-title">
                    Sản Phẩm Thuộc {activeCollectionInfo.name} ({filtered.length})
                  </h2>
                </div>
                <span className="text-xs text-stone-500">
                  Chất liệu chủ đạo: <strong className="text-stone-800">{activeCollectionInfo.materials}</strong>
                </span>
              </div>

              {/* Thanh lọc Không Gian Sống (Phòng khách, Phòng ăn, Phòng ngủ) */}
              <div className="bst-room-nav">
                {ROOM_FILTER_TABS.map((tab) => {
                  const isActive =
                    tab.id === "all"
                      ? selectedCat === "all"
                      : selectedCat === tab.categoryValue;
                  const count = roomProductCounts[tab.id] ?? 0;
                  const Icon = tab.icon;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSelectedCat(tab.categoryValue)}
                      className={`bst-room-tab ${isActive ? "active" : ""}`}
                    >
                      <Icon size={16} />
                      <span>{tab.name}</span>
                      <span className="bst-room-tab-count">{count}</span>
                    </button>
                  );
                })}
              </div>

              {/* Toolbar bộ lọc tìm kiếm & sắp xếp sản phẩm trong BST */}
              <div className="bst-detail-toolbar">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {selectedCat === "all" ? "Tất cả sản phẩm trong BST" : `Không gian: ${selectedCat}`}
                  </span>
                  <span className="text-xs text-slate-400">({filtered.length} thiết kế)</span>
                </div>

                <div className="pl-toolbar">
                  <div className="pl-search-box">
                    <Search size={15} className="pl-search-icon" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Tìm sản phẩm trong bộ sưu tập..."
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

              {/* Lưới Sản phẩm thuộc Bộ sưu tập */}
              {loading && displayedProducts.length === 0 ? (
                <div className="empty-state">
                  <p>Đang tải sản phẩm thuộc bộ sưu tập...</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="empty-state">
                  <h2>Chưa có sản phẩm phù hợp với bộ lọc</h2>
                  <p>Hãy thử chọn không gian khác hoặc đặt lại bộ lọc tìm kiếm.</p>
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
                      itemLabel="sản phẩm trong bộ sưu tập"
                    />
                  </div>
                </>
              )}
            </section>

            {/* Banner tư vấn thiết kế & Trải nghiệm Showroom */}
            <section className="bst-consult-banner">
              <div className="bst-consult-info">
                <span className="bst-consult-eyebrow">
                  <Sparkles size={13} /> TRẢI NGHIỆM THỰC TẾ & TƯ VẤN THIẾT KẾ
                </span>
                <h3 className="bst-consult-title">
                  Bạn muốn thiết kế ngôi nhà theo phong cách {activeCollectionInfo.name}?
                </h3>
                <p className="bst-consult-sub">
                  Đội ngũ Kiến trúc sư Nhà Xinh sẵn sàng khảo sát, tư vấn bố trí không gian và phối cảnh
                  3D hoàn toàn miễn phí, biến ý tưởng của bạn thành một tổ ấm đẳng cấp, tinh tế.
                </p>
              </div>
              <div className="bst-consult-btns">
                <a
                  href={`https://zalo.me/0974933486?text=${encodeURIComponent(
                    `Xin chào Nhà Xinh, tôi muốn được tư vấn thiết kế nội thất theo ${activeCollectionInfo.name}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bst-consult-btn-zalo"
                >
                  <MessageCircle size={17} />
                  <span>Chat Zalo tư vấn (0974.933.486)</span>
                </a>
                <Link to="/tu-van-thiet-ke" className="bst-consult-btn-3d">
                  <Calendar size={17} />
                  <span>Đăng ký tư vấn 3D</span>
                </Link>
                <Link to="/he-thong-showroom" className="bst-consult-btn-showroom">
                  <MapPin size={17} />
                  <span>Hệ thống Showroom</span>
                </Link>
              </div>
            </section>

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
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.onerror = null;
                            target.src = DEFAULT_PLACEHOLDER_IMAGE;
                          }}
                        />
                        <span className="col-card-style">{col.styleTag}</span>
                        <span className="col-card-count">
                          {col.productCount || 0} thiết kế
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

      {/* ── MODAL ĐỌC CHI TIẾT BÀI VIẾT & XEM CẢ ẢNH LẪN SẢN PHẨM BỘ SƯU TẬP ── */}
      {readingArticle &&
        createPortal(
          <div
            className="bst-modal-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget) setReadingArticle(null);
            }}
          >
            <div className="bst-modal-card">
              <div className="bst-modal-header">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                    {readingArticle.category || "Bộ sưu tập"}
                  </span>
                  {readingArticle.collectionSlug && (
                    <span className="px-2.5 py-1 rounded text-xs font-mono font-semibold bg-stone-100 text-stone-700">
                      BST: {readingArticle.collectionSlug}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setReadingArticle(null)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                  title="Đóng (Esc)"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="bst-modal-body">
                {/* 1. HIỂN THỊ CẢ ẢNH BÌA BÀI VIẾT */}
                {readingArticle.image && (
                  <img
                    src={readingArticle.image}
                    alt={readingArticle.title}
                    className="bst-modal-cover"
                  />
                )}

                <h2 className="text-2xl font-bold text-stone-900 leading-snug mb-2">
                  {readingArticle.title}
                </h2>

                <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500 pb-3 mb-4 border-b border-stone-200">
                  <span>Tác giả: <strong className="text-stone-700">{readingArticle.author}</strong></span>
                  <span>•</span>
                  <span>Ngày đăng: {readingArticle.createdAt}</span>
                  <span>•</span>
                  <span>{readingArticle.views} lượt xem</span>
                </div>

                {readingArticle.summary && (
                  <div className="bst-editorial-lead mb-6">
                    <p>{readingArticle.summary}</p>
                  </div>
                )}

                {/* 2. NỘI DUNG TIPTAP VỚI CẢ CÁC HÌNH ẢNH MINH HỌA BÊN TRONG */}
                <div
                  className="bst-editorial-body"
                  dangerouslySetInnerHTML={{ __html: readingArticle.content }}
                />

                {/* 3. CẢ CÁC SẢN PHẨM TRONG BỘ SƯU TẬP NẾU CÓ */}
                {readingArticleProducts.length > 0 && (
                  <div className="mt-10 pt-6 border-t border-stone-200">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <span className="col-hero-eyebrow">KHÔNG GIAN ĐỒNG BỘ</span>
                        <h3 className="text-lg font-bold text-stone-900">
                          Sản Phẩm Thuộc Bộ Sưu Tập Này ({readingArticleProducts.length})
                        </h3>
                      </div>
                      {readingArticle.collectionSlug && (
                        <Link
                          to={`/bo-suu-tap/${readingArticle.collectionSlug}`}
                          className="text-xs font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1"
                          onClick={() => setReadingArticle(null)}
                        >
                          Khám phá trọn BST <ArrowRight size={14} />
                        </Link>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {readingArticleProducts.slice(0, 6).map((p) => (
                        <ProductCard
                          key={p.id}
                          product={p}
                          onAddToCart={store.addToCart}
                          onToggleWishlist={store.toggleWishlist}
                          isWishlisted={store.isWishlisted(p.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

      <Footer />
    </>
  );
}
