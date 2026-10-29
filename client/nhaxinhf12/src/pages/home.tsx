
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Headers";
import Footer from "../components/Footer";
import { HeroBanner } from "../components/HeroBanner";
import ProductCard from "../components/ProductCard";
import type { Product, CategoryItem } from "../types/catalog";
import { productService } from "../services/productService";
import { categoryService } from "../services/categoryService";
import { PRODUCT_GROUPS } from "../util/CONSTRAINT";
import PandoraSuggest from "../components/PandoraSuggest";
import { clientCmsService, CMS_EVENTS, type HeroBannerItem } from "../services/clientCmsService";
import { useStore } from "../hooks/useStore";
import "./home.css";
import img from "../assets/image_sequence/ezgif-frame-001.png";
import img8 from "../assets/image_sequence/ezgif-frame-070.png";
import img10 from "../assets/image_sequence/ezgif-frame-090.png";
import img13 from "../assets/image_sequence/ezgif-frame-110.png";


export function HomePage() {
  const { cartCount, wishlist, addToCart, toggleWishlist, isWishlisted, user } = useStore();
  const [activeIndex, setActiveIndex] = useState(0);
  // Hướng chuyển slide được truyền vào HeroBanner để CSS chạy animation tương ứng.
  const [slideDirection, setSlideDirection] = useState<"next" | "previous">("next");
  // Lưu tọa độ bắt đầu vuốt để nhận biết thao tác trái/phải trên màn hình cảm ứng.
  const touchStartX = useRef<number | null>(null);

  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Array<CategoryItem | typeof PRODUCT_GROUPS[0]>>(
    PRODUCT_GROUPS.slice(0, 6)
  );

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

      // 2. Lấy danh mục
      const cats = await categoryService.getCategories();
      if (cats && cats.length > 0) {
        setCategories(cats.slice(0, 6));
      }
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu trang chủ:", error);
    }
  };

  fetchData();
}, []);

  const collections = [
    {
      id: "victoria",
      title: "Bộ sưu tập Victoria",
      badge: "Xu hướng 2024",
      desc: "Cảm hứng đồng quê Pháp lãng mạn kết hợp cùng đường cong mềm mại và sắc gỗ trầm ấm cho không gian sống vương giả.",
      image: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80",
      url: "/bo-suu-tap",
      itemCount: "24 sản phẩm",
    },
    {
      id: "net-duong-dai",
      title: "Bộ sưu tập Nét Đương Đại",
      badge: "Bán chạy nhất",
      desc: "Thiết kế tinh giản, chuẩn mực công năng và vẻ đẹp đương đại dành cho những căn hộ cao cấp & biệt thự phố hiện đại.",
      image: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=800&q=80",
      url: "/bo-suu-tap",
      itemCount: "32 sản phẩm",
    },
    {
      id: "osaka-japandi",
      title: "Bộ sưu tập Osaka (Japandi)",
      badge: "Phong cách tối giản",
      desc: "Sự kết hợp hoàn mỹ giữa triết lý Wabi-Sabi Nhật Bản và chất liệu gỗ sồi tự nhiên Bắc Âu mộc mạc, tĩnh tại.",
      image: "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80",
      url: "/bo-suu-tap",
      itemCount: "18 sản phẩm",
    },
    {
      id: "coastal-living",
      title: "Bộ sưu tập Coastal Living",
      badge: "Độc quyền Nhà Xinh",
      desc: "Mang làn gió biển khơi trong lành và nguồn năng lượng thư thái vào từng góc nhỏ của ngôi nhà thân yêu.",
      image: "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=800&q=80",
      url: "/bo-suu-tap",
      itemCount: "15 sản phẩm",
    },
  ];

  // ── CMS Hero Banners State ──
  const [banners, setBanners] = useState<HeroBannerItem[]>(() =>
    clientCmsService.getHeroBanners().filter((b) => b.isActive)
  );

  useEffect(() => {
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

  const databanner = banners.length > 0 ? banners : [
    {
      subtitle: "BỘ SƯU TẬP MỚI",
      title: "Victoria",
      description:
        "Từ cảm hứng miền quê Pháp đến cảm xúc ngôi nhà Việt với đường cong mềm mại và tông màu ấm áp.",
      backgroundImage: img,
      actions: [{ url: "/bo-suu-tap/victoria", label: "Khám phá ngay" }],
    },
    {
      subtitle: "BỘ SƯU TẬP",
      title: "Nét Đương Đại",
      description:
        "Thiết kế tinh giản, hiện đại và phù hợp với những không gian sống trẻ trung.",
      backgroundImage: img8,
      actions: [
        { url: "/bo-suu-tap/net-duong-dai", label: "Khám phá" },
        { url: "/products", label: "Xem sản phẩm" },
      ],
    },
    {
      subtitle: "PHÒNG KHÁCH",
      title: "Không gian kết nối",
      description:
        "Những thiết kế sofa và bàn ghế mang đến sự thoải mái và tinh tế cho phòng khách.",
      backgroundImage: img10,
      actions: [{ url: "/category/sofa", label: "Xem sofa" }],
    },
    {
      subtitle: "PHÒNG NGỦ",
      title: "Chạm vào sự thư thái",
      description:
        "Kiến tạo không gian nghỉ ngơi ấm áp với những thiết kế nội thất phòng ngủ tinh tế.",
      backgroundImage: img13,
      actions: [{ url: "/category/phong-ngu", label: "Khám phá phòng ngủ" }],
    },
  ];

  useEffect(() => {
    // Tự chuyển slide sau mỗi 5 giây; dọn interval khi component bị unmount.
    const timer = window.setInterval(() => {
      setSlideDirection("next");
      setActiveIndex((prev) => (prev + 1) % databanner.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [databanner.length]);

  const moveSlide = (direction: "next" | "previous") => {
    setSlideDirection(direction);
    setActiveIndex((prev) =>
      direction === "next"
        ? (prev + 1) % databanner.length
        : (prev - 1 + databanner.length) % databanner.length,
    );
  };

  const goToSlide = (index: number) => {
    // Chọn hướng animation theo vị trí slide mới so với slide hiện tại.
    if (index === activeIndex) return;
    setSlideDirection(index > activeIndex ? "next" : "previous");
    setActiveIndex(index);
  };

  return (
    <>
      <Header user={user} cartCount={cartCount} wishlistCount={wishlist.length} />
      <div
        className="hero-slider"
        onTouchStart={(event) => {
          touchStartX.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
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
          key={`${databanner[activeIndex].title}-${activeIndex}`}
          {...databanner[activeIndex]}
          className={`hero-slide-${slideDirection}`}
        />
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
          {databanner.map((banner, index) => (
            <button
              key={banner.title}
              type="button"
              className={`hero-slider-dot ${index === activeIndex ? "active" : ""}`}
              aria-label={`Chuyển đến slide ${index + 1}: ${banner.title}`}
              aria-current={index === activeIndex ? "true" : undefined}
              onClick={() => goToSlide(index)}
            />
          ))}
        </div>
      </div>

      {/* ── Featured Products ── */}
      <section className="home-section">
        <div className="home-section-header">
          <div>
            <h2 className="home-section-title">Sản phẩm nổi bật</h2>
            <p className="home-section-sub">Những thiết kế được yêu thích nhất</p>
          </div>
          <Link to="/san-pham" className="home-view-all">Xem tất cả →</Link>
        </div>
        <div className="home-product-grid">
          {featuredProducts.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onAddToCart={addToCart}
              onToggleWishlist={toggleWishlist}
              isWishlisted={isWishlisted(p.id)}
            />
          ))}
        </div>
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
          {collections.map((col) => (
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
      <section className="home-section home-categories">
        <div className="home-section-header">
          <div>
            <h2 className="home-section-title">Danh mục sản phẩm</h2>
            <p className="home-section-sub">Khám phá theo phong cách của bạn</p>
          </div>
        </div>
        <div className="home-cat-grid">
          {categories.map((cat) => {
            const title = "title" in cat && cat.title ? cat.title : ("name" in cat ? cat.name : "Danh mục");
            const count = "productCount" in cat && cat.productCount
              ? `${cat.productCount} sản phẩm`
              : "items" in cat && cat.items?.length
              ? `${cat.items.length} sản phẩm`
              : "Khám phá ngay";

            return (
              <Link key={cat.to} to={cat.to} className="home-cat-card">
                <div className="home-cat-overlay" />
                <span className="home-cat-name">{title}</span>
                <span className="home-cat-count">{count}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <Footer />
    </>
  );
}
export default HomePage;
