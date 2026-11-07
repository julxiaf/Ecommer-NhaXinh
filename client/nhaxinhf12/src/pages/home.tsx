
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Header from "../components/Headers";
import Footer from "../components/Footer";
import { HeroBanner } from "../components/HeroBanner";
import ProductCard from "../components/ProductCard";
import type { Product, CategoryItem } from "../types/catalog";
import { productService, DEFAULT_PLACEHOLDER_IMAGE } from "../services/productService";
import { categoryService } from "../services/categoryService";
import { ENDPOINTS } from "../services/apiEndpoints";
import { parseCollectionMeta } from "../services/admin/catalogApi";
import PandoraSuggest from "../components/PandoraSuggest";
import { clientCmsService, CMS_EVENTS, type HeroBannerItem } from "../services/clientCmsService";
import { useStore } from "../hooks/useStore";
import "./home.css";

interface HomeCollectionCardItem {
  id: string;
  title: string;
  badge: string;
  desc: string;
  image: string;
  url: string;
  itemCount: string;
}

interface BackendCollectionResponse {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  coverImageUrl?: string | null;
  status?: string | null;
  isDeleted?: boolean | null;
  productCount?: number;
  products?: Array<{
    id: number;
    name: string;
    slug: string;
    primaryImageUrl?: string | null;
  }>;
}

export function HomePage() {
  const { cartCount, wishlist, addToCart, toggleWishlist, isWishlisted, user } = useStore();
  const [activeIndex, setActiveIndex] = useState(0);
  // Hướng chuyển slide được truyền vào HeroBanner để CSS chạy animation tương ứng.
  const [slideDirection, setSlideDirection] = useState<"next" | "previous">("next");
  // Lưu tọa độ bắt đầu vuốt để nhận biết thao tác trái/phải trên màn hình cảm ứng.
  const touchStartX = useRef<number | null>(null);

  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const featuredSliderRef = useRef<HTMLDivElement>(null);
  const [canScrollFeaturedLeft, setCanScrollFeaturedLeft] = useState(false);
  const [canScrollFeaturedRight, setCanScrollFeaturedRight] = useState(true);
  const [featuredScrollProgress, setFeaturedScrollProgress] = useState(25);
  const isFeaturedDragging = useRef(false);
  const featuredDragStartX = useRef(0);
  const featuredScrollLeftStart = useRef(0);
  const [collections, setCollections] = useState<HomeCollectionCardItem[]>([]);
  // const [categories, setCategories] = useState<CategoryItem[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Lấy sản phẩm nổi bật
        const featured = await productService.getFeaturedProducts(8);
        if (featured && featured.length > 0) {
          setFeaturedProducts(featured);
        } else {
          // Fallback sang getProducts nếu cần
          const prods = await productService.getProducts({ size: 8 });
          if (prods && prods.length > 0) {
            setFeaturedProducts(prods.slice(0, 8));
          }
        }

        // 2. Lấy Bộ sưu tập thật từ Backend (/api/v1/collections) & Danh mục
        const [colRes, cats] = await Promise.all([
          fetch(ENDPOINTS.COLLECTIONS.BASE, {
            headers: { "Content-Type": "application/json" },
          })
            .then((r) => (r.ok ? (r.json() as Promise<BackendCollectionResponse[]>) : []))
            .catch(() => [] as BackendCollectionResponse[]),
          categoryService.getCategories().catch(() => [] as CategoryItem[]),
        ]);

        const collectionMap = new Map<string, HomeCollectionCardItem>();

        // A) Nạp từ bảng collections (/api/v1/collections)
        if (Array.isArray(colRes)) {
          colRes
            .filter(
              (c) =>
                !c.isDeleted &&
                c.status?.toUpperCase() !== "DRAFT" &&
                c.status?.toUpperCase() !== "ARCHIVED" &&
                !c.name?.toLowerCase().includes("test") &&
                !c.slug?.toLowerCase().includes("test")
            )
            .forEach((c) => {
              const { cleanDescription, meta } = parseCollectionMeta(c.description);
              const count = c.productCount ?? c.products?.length ?? 0;
              collectionMap.set(c.slug, {
                id: String(c.id || c.slug),
                title: c.name,
                badge: meta.styleTag || "Bộ sưu tập Nhà Xinh",
                desc:
                  cleanDescription ||
                  meta.subtitle ||
                  `Khám phá không gian nội thất tinh tế thuộc ${c.name}.`,
                image:
                  c.coverImageUrl ||
                  c.products?.[0]?.primaryImageUrl ||
                  DEFAULT_PLACEHOLDER_IMAGE,
                url: `/bo-suu-tap/${c.slug}`,
                itemCount: count > 0 ? `${count} sản phẩm` : "Khám phá ngay",
              });
            });
        }

        // B) Bổ sung các Bộ sưu tập lưu trong bảng categories (categoryGroup === 'COLLECTION')
        if (Array.isArray(cats) && cats.length > 0) {
          cats
            .filter(
              (c) =>
                (c.isCollection || c.categoryGroup === "COLLECTION") &&
                c.slug !== "bo-suu-tap" &&
                !c.name?.toLowerCase().includes("test") &&
                !c.slug?.toLowerCase().includes("test")
            )
            .forEach((c) => {
              if (!collectionMap.has(c.slug)) {
                collectionMap.set(c.slug, {
                  id: String(c.id || c.slug),
                  title: c.name,
                  badge: "Bộ sưu tập Nhà Xinh",
                  desc:
                    c.description ||
                    `Khám phá không gian nội thất tinh tế thuộc ${c.name}.`,
                  image: c.imageUrl || DEFAULT_PLACEHOLDER_IMAGE,
                  url: `/bo-suu-tap/${c.slug}`,
                  itemCount:
                    c.productCount && c.productCount > 0
                      ? `${c.productCount} sản phẩm`
                      : "Khám phá ngay",
                });
              }
            });
        }

        // Chỉ hiển thị tối đa 4 Bộ sưu tập ở trang chủ
        setCollections(Array.from(collectionMap.values()).slice(0, 4));
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu trang chủ:", error);
      }
    };

    fetchData();
  }, []);

  // ── CMS Hero Banners State ──
  const [banners, setBanners] = useState<HeroBannerItem[]>(() =>
    clientCmsService.getHeroBanners().filter((b) => b.isActive)
  );


  useEffect(() => {
    clientCmsService.fetchHeroBanners().then((items) => {
      const active = items.filter((b) => b.isActive);
      if (active.length > 0) {
        setBanners(active);
      }
    });

    const handleBannersUpdate = () => {
      const updated = clientCmsService.getHeroBanners().filter((b) => b.isActive);
      setBanners(updated.length > 0 ? updated : clientCmsService.resetHeroBanners());
      setActiveIndex(0);
    };

    window.addEventListener(CMS_EVENTS.BANNERS_UPDATED, handleBannersUpdate);
    return () => {
      window.removeEventListener(CMS_EVENTS.BANNERS_UPDATED, handleBannersUpdate);
    };
  }, []);

  const databanner: Array<{
    id?: string;
    subtitle: string;
    title: string;
    description: string;
    backgroundImage: string;
    mediaType?: "image" | "video";
    videoUrl?: string;
    actions: Array<{ url: string; label: string; isPrimary?: boolean }>;
    isActive?: boolean;
  }> = banners.length > 0 ? banners : [
    {
      subtitle: "NỘI THẤT NHÀ XINH",
      title: "Không Gian Sống Tinh Tế & Hiện Đại",
      description: "Trải nghiệm không gian sống đẳng cấp với những bộ sưu tập nội thất tinh hoa, chất liệu gỗ tự nhiên bền vững.",
      backgroundImage: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1400&q=80",
      actions: [{ url: "/san-pham", label: "Khám phá ngay" }],
      isActive: true,
    },
  ];

  // Danh mục không gian tuyển chọn (Chuẩn minimalist nhaxinh.com)
  const curatedRooms = [
    {
      title: "Phòng khách",
      to: "/phong/phong-khach",
      image: "/images/rooms/phong-khach.jpg",
    },
    {
      title: "Phòng ăn",
      to: "/phong/phong-an",
      image: "/images/rooms/phong-an.jpg",
    },
    {
      title: "Phòng ngủ",
      to: "/phong/phong-ngu",
      image: "/images/rooms/phong-ngu.jpg",
    },
    {
      title: "Phòng làm việc",
      to: "/phong/phong-lam-viec",
      image: "/images/rooms/phong-lam-viec.jpg",
    },
  ];

  const activeBanners = databanner.filter((b) => b.isActive !== false);
  const hasMultipleBanners = activeBanners.length > 1;
  const currentBanner = activeBanners[activeIndex] || activeBanners[0] || databanner[0];

  useEffect(() => {
    // Chỉ tự chuyển slide sau mỗi 5 giây khi có TỪ 2 SLIDE TRỞ LÊN
    if (!hasMultipleBanners) return;

    const timer = window.setInterval(() => {
      setSlideDirection("next");
      setActiveIndex((prev) => (prev + 1) % activeBanners.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [hasMultipleBanners, activeBanners.length]);

  const moveSlide = (direction: "next" | "previous") => {
    if (!hasMultipleBanners) return;
    setSlideDirection(direction);
    setActiveIndex((prev) =>
      direction === "next"
        ? (prev + 1) % activeBanners.length
        : (prev - 1 + activeBanners.length) % activeBanners.length,
    );
  };

  const goToSlide = (index: number) => {
    if (!hasMultipleBanners || index === activeIndex) return;
    // Chọn hướng animation theo vị trí slide mới so với slide hiện tại.
    setSlideDirection(index > activeIndex ? "next" : "previous");
    setActiveIndex(index);
  };

  // ── Điều khiển Carousel trượt ngang Sản phẩm nổi bật ──
  const checkFeaturedScroll = useCallback(() => {
    const el = featuredSliderRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollFeaturedLeft(scrollLeft > 10);
    setCanScrollFeaturedRight(scrollLeft + clientWidth < scrollWidth - 10);
    const maxScroll = scrollWidth - clientWidth;
    if (maxScroll > 0) {
      setFeaturedScrollProgress(Math.min(100, Math.max(15, (scrollLeft / maxScroll) * 100)));
    } else {
      setFeaturedScrollProgress(100);
    }
  }, []);

  useEffect(() => {
    const el = featuredSliderRef.current;
    if (!el) return;
    const frameId = window.requestAnimationFrame(checkFeaturedScroll);
    el.addEventListener("scroll", checkFeaturedScroll, { passive: true });
    window.addEventListener("resize", checkFeaturedScroll);
    return () => {
      window.cancelAnimationFrame(frameId);
      el.removeEventListener("scroll", checkFeaturedScroll);
      window.removeEventListener("resize", checkFeaturedScroll);
    };
  }, [featuredProducts, checkFeaturedScroll]);

  const scrollFeatured = (direction: "left" | "right") => {
    const el = featuredSliderRef.current;
    if (!el) return;
    const firstItem = el.firstElementChild as HTMLElement | null;
    const step = firstItem ? firstItem.offsetWidth + 24 : Math.max(280, el.clientWidth * 0.5);
    el.scrollBy({
      left: direction === "left" ? -step * 2 : step * 2,
      behavior: "smooth",
    });
  };

  const handleFeaturedMouseDown = (e: React.MouseEvent) => {
    const el = featuredSliderRef.current;
    if (!el) return;
    isFeaturedDragging.current = true;
    featuredDragStartX.current = e.pageX - el.offsetLeft;
    featuredScrollLeftStart.current = el.scrollLeft;
  };

  const handleFeaturedMouseMove = (e: React.MouseEvent) => {
    if (!isFeaturedDragging.current) return;
    const el = featuredSliderRef.current;
    if (!el) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = (x - featuredDragStartX.current) * 1.4;
    el.scrollLeft = featuredScrollLeftStart.current - walk;
  };

  const handleFeaturedMouseUpOrLeave = () => {
    isFeaturedDragging.current = false;
  };

  return (
    <>
      <Header user={user} cartCount={cartCount} wishlistCount={wishlist.length} />
      
      {/* ── 1. Hero Banner: Hỗ trợ linh hoạt Video / 1 Ảnh tĩnh hoặc Nhiều ảnh Carousel ── */}
      <div
        className={`hero-slider ${!hasMultipleBanners ? "hero-slider-single" : ""}`}
        onTouchStart={(event) => {
          if (!hasMultipleBanners) return;
          touchStartX.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          if (!hasMultipleBanners) return;
          const startX = touchStartX.current;
          const endX = event.changedTouches[0]?.clientX;
          touchStartX.current = null;
          if (startX === null || endX === undefined) return;
          const distance = endX - startX;
          // Bỏ qua vuốt ngắn (thường là thao tác cuộn/chạm), chỉ đổi slide khi vượt 50px.
          if (Math.abs(distance) > 50) {
            moveSlide(distance < 0 ? "next" : "previous");
          }
        }}
      >
        <HeroBanner
          key={`${currentBanner.title}-${activeIndex}`}
          {...currentBanner}
          className={hasMultipleBanners ? `hero-slide-${slideDirection}` : ""}
        />

        {/* Nút điều hướng và Dots chỉ hiển thị khi có từ 2 banner trở lên */}
        {hasMultipleBanners && (
          <>
            <button
              type="button"
              className="hero-slider-arrow hero-slider-arrow-previous"
              aria-label="Xem slide trước"
              onClick={() => moveSlide("previous")}
            >
              ‹
            </button>
            <button
              type="button"
              className="hero-slider-arrow hero-slider-arrow-next"
              aria-label="Xem slide tiếp theo"
              onClick={() => moveSlide("next")}
            >
              ›
            </button>
            <div className="hero-slider-dots" aria-label="Chọn slide">
              {activeBanners.map((banner, index) => (
                <button
                  key={`${banner.title}-${index}`}
                  type="button"
                  className={`hero-slider-dot ${index === activeIndex ? "active" : ""}`}
                  aria-label={`Chuyển đến slide ${index + 1}: ${banner.title}`}
                  aria-current={index === activeIndex ? "true" : undefined}
                  onClick={() => goToSlide(index)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── 2. Lưới thẻ ảnh danh mục không gian (Tối giản ít chữ, ảnh lớn) ── */}
      <section className="home-category-grid-section">
        <div className="home-category-grid">
          {curatedRooms.map((room) => (
            <Link
              key={room.to}
              to={room.to}
              className="home-category-card"
            >
              <div className="home-category-image-wrap">
                <img
                  src={room.image}
                  alt={room.title}
                  className="home-category-card-img"
                  loading="lazy"
                />
              </div>
              <div className="home-category-content">
                <h3 className="home-category-title">{room.title}</h3>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Featured Products (Horizontal Carousel 4 sản phẩm kiểu nhaxinh.com) ── */}
      <section className="home-section home-featured-carousel-section">
        <div className="home-section-header">
          <div>
            <h2 className="home-section-title">Sản phẩm nổi bật</h2>
            <p className="home-section-sub">Những thiết kế được yêu thích nhất</p>
          </div>
          <div className="home-featured-header-actions">
            <div className="home-featured-nav-btns">
              <button
                type="button"
                onClick={() => scrollFeatured("left")}
                disabled={!canScrollFeaturedLeft}
                className="home-featured-header-arrow"
                aria-label="Trượt sang trái"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={() => scrollFeatured("right")}
                disabled={!canScrollFeaturedRight}
                className="home-featured-header-arrow"
                aria-label="Trượt sang phải"
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <Link to="/san-pham" className="home-view-all">
              Xem tất cả →
            </Link>
          </div>
        </div>

        <div className="home-featured-slider-wrap">
          <button
            type="button"
            onClick={() => scrollFeatured("left")}
            disabled={!canScrollFeaturedLeft}
            className={`home-featured-float-arrow left ${!canScrollFeaturedLeft ? "is-disabled" : ""}`}
            aria-label="Xem sản phẩm trước"
          >
            <ChevronLeft size={20} />
          </button>

          <div
            ref={featuredSliderRef}
            className="home-featured-slider-track"
            onMouseDown={handleFeaturedMouseDown}
            onMouseMove={handleFeaturedMouseMove}
            onMouseUp={handleFeaturedMouseUpOrLeave}
            onMouseLeave={handleFeaturedMouseUpOrLeave}
          >
            {featuredProducts.map((p) => (
              <div key={p.id} className="home-featured-slide-item">
                <ProductCard
                  product={p}
                  onAddToCart={addToCart}
                  onToggleWishlist={toggleWishlist}
                  isWishlisted={isWishlisted(p.id)}
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => scrollFeatured("right")}
            disabled={!canScrollFeaturedRight}
            className={`home-featured-float-arrow right ${!canScrollFeaturedRight ? "is-disabled" : ""}`}
            aria-label="Xem sản phẩm tiếp theo"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {featuredProducts.length > 4 && (
          <div className="home-featured-progress-track">
            <div
              className="home-featured-progress-bar"
              style={{ width: `${featuredScrollProgress}%` }}
            />
          </div>
        )}
      </section>

      {/* ── Collections (Bộ sưu tập) ── */}
      <section className="home-section home-collections">
        <div className="home-section-header">
          <div>
            <h2 className="home-section-title">Bộ sưu tập Nhà Xinh</h2>
            <p className="home-section-sub">Tuyệt tác không gian mang đậm dấu ấn phong cách sống tinh tế</p>
          </div>
          <Link to="/bo-suu-tap" className="home-view-all">Xem tất cả bộ sưu tập →</Link>
        </div>

        <div className="home-collection-grid">
          {collections.slice(0, 4).map((col) => (
            <Link
              key={col.id}
              to={col.url}
              className="home-collection-card"
              style={{ backgroundImage: `url(${col.image})` }}
            >
              <span className="home-collection-badge">{col.badge}</span>
              <div className="home-collection-content">
                <h3 className="home-collection-title">{col.title}</h3>
                <p className="home-collection-desc">{col.desc}</p>
                <span className="home-collection-link">
                  Khám phá bộ sưu tập ({col.itemCount}) →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Pandora Suggest Product (Nằm ngay dưới Bộ sưu tập Nhà Xinh) ── */}
      <PandoraSuggest />

      {/* ── Categories ── */}
      {/* <section className="home-section home-categories">
        <div className="home-section-header">
          <div>
            <h2 className="home-section-title">Danh mục sản phẩm</h2>
            <p className="home-section-sub">Khám phá theo phong cách của bạn</p>
          </div>
        </div>
        <div className="home-cat-grid">
          {categories.map((cat) => {
            const title = cat.name || "Danh mục";
            const count = cat.productCount ? `${cat.productCount} sản phẩm` : (cat.items && cat.items.length ? `${cat.items.length} sản phẩm` : "Khám phá ngay");

            return (
              <Link key={cat.to} to={cat.to} className="home-cat-card">
                <div className="home-cat-overlay" />
                <span className="home-cat-name">{title}</span>
                <span className="home-cat-count">{count}</span>
              </Link>
            );
          })}
        </div>
      </section> */}

      <Footer />
    </>
  );
}
export default HomePage;
