import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { Sparkles, ArrowRight, Gift, ShieldCheck, ChevronLeft, ChevronRight } from "lucide-react";
import ProductCard from "./ProductCard";
import type { Product } from "../types/catalog";
import { productService } from "../services/productService";
import { clientCmsService, CMS_EVENTS, type PandoraSuggestionConfig } from "../services/clientCmsService";
import { useStore } from "../hooks/useStore";
import "./PandoraSuggest.css";

export default function PandoraSuggest() {
  const { addToCart, toggleWishlist, isWishlisted } = useStore();
  const [config, setConfig] = useState<PandoraSuggestionConfig>(() => clientCmsService.getPandoraConfig());
  const [selectedTag, setSelectedTag] = useState<string>("Tất cả");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [boxOpened, setBoxOpened] = useState(false);

  // ── Horizontal Slider Refs & Scroll State ──
  const sliderRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Thao tác kéo chuột lướt ngang
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeftStart = useRef(0);

  // Lắng nghe cập nhật realtime từ Admin Portal
  useEffect(() => {
    const handleUpdate = () => {
      setConfig(clientCmsService.getPandoraConfig());
    };

    window.addEventListener(CMS_EVENTS.PANDORA_UPDATED, handleUpdate);
    return () => {
      window.removeEventListener(CMS_EVENTS.PANDORA_UPDATED, handleUpdate);
    };
  }, []);

  // Gọi dữ liệu từ API Backend theo Tag đang chọn và cấu hình
  const fetchPandoraProducts = useCallback(async (tag: string, limit: number) => {
    setLoading(true);
    try {
      let result: Product[] = [];

      if (tag === "Tất cả") {
        result = await productService.getProducts({ size: limit });
        if (!result || result.length === 0) {
          result = await productService.getFeaturedProducts(limit);
        }
      } else {
        result = await productService.getProducts({ keyword: tag, size: limit });
        if (!result || result.length === 0) {
          result = await productService.getProducts({ category: tag, size: limit });
        }
      }

      setProducts(result || []);
    } catch (err) {
      console.warn("[PandoraSuggest] Lỗi tải sản phẩm từ API:", err);
      setProducts([]);
    } finally {
      setLoading(false);
      // Reset scroll về đầu khi đổi tag
      if (sliderRef.current) {
        sliderRef.current.scrollTo({ left: 0, behavior: "smooth" });
      }
    }
  }, []);

  useEffect(() => {
    if (!config.isEnabled) return;
    const limit = config.apiLimit || 8;
    fetchPandoraProducts(selectedTag, limit);
  }, [config.isEnabled, config.apiLimit, selectedTag, fetchPandoraProducts]);

  // Cập nhật trạng thái cuộn lướt ngang
  const checkScrollState = useCallback(() => {
    const el = sliderRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);

    const maxScroll = scrollWidth - clientWidth;
    if (maxScroll > 0) {
      setScrollProgress(Math.min(100, Math.max(0, (scrollLeft / maxScroll) * 100)));
    } else {
      setScrollProgress(100);
    }
  }, []);

  useEffect(() => {
    const el = sliderRef.current;
    if (!el) return;

    checkScrollState();
    el.addEventListener("scroll", checkScrollState, { passive: true });
    window.addEventListener("resize", checkScrollState);

    return () => {
      el.removeEventListener("scroll", checkScrollState);
      window.removeEventListener("resize", checkScrollState);
    };
  }, [products, checkScrollState]);

  // Nút lướt ngang trái / phải
  const scroll = (direction: "left" | "right") => {
    const el = sliderRef.current;
    if (!el) return;

    const scrollAmount = Math.max(300, el.clientWidth * 0.75);
    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  // Kéo chuột cuộn mượt mà (Mouse drag to scroll)
  const handleMouseDown = (e: React.MouseEvent) => {
    const el = sliderRef.current;
    if (!el) return;
    isDragging.current = true;
    startX.current = e.pageX - el.offsetLeft;
    scrollLeftStart.current = el.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const el = sliderRef.current;
    if (!el) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startX.current) * 1.5;
    el.scrollLeft = scrollLeftStart.current - walk;
  };

  const handleMouseUpOrLeave = () => {
    isDragging.current = false;
  };

  if (!config.isEnabled) {
    return null;
  }

  return (
    <section className="pandora-suggest-section" id="pandora-suggestion">
      <div className="pandora-container">
        {/* ── HEADER KHỐI GỢI Ý PANDORA ── */}
        <div className="pandora-header">
          <div className="pandora-badge">
            <Sparkles size={14} className="pandora-sparkle-icon" />
            <span>{config.badgeTitle}</span>
          </div>

          <h2 className="pandora-title">{config.mainTitle}</h2>
          <p className="pandora-subtitle">{config.subtitle}</p>

          {/* Tag Filter Pills */}
          {config.curatedTagFilter && config.curatedTagFilter.length > 0 && (
            <div className="pandora-tags-wrapper">
              {config.curatedTagFilter.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTag(tag)}
                  className={`pandora-tag-pill ${selectedTag === tag ? "active" : ""}`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── CAROUSEL LƯỚT NGANG SẢN PHẨM PANDORA ── */}
        <div className="pandora-slider-wrapper">
          {/* Nút lướt sang trái */}
          <button
            type="button"
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
            className={`pandora-scroll-arrow left ${!canScrollLeft ? "opacity-0 pointer-events-none" : "opacity-100"}`}
            aria-label="Lướt sang trái"
            title="Xem sản phẩm trước"
          >
            <ChevronLeft size={22} />
          </button>

          {/* Nút lướt sang phải */}
          <button
            type="button"
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
            className={`pandora-scroll-arrow right ${!canScrollRight ? "opacity-0 pointer-events-none" : "opacity-100"}`}
            aria-label="Lướt sang phải"
            title="Xem sản phẩm tiếp theo"
          >
            <ChevronRight size={22} />
          </button>

          {/* Vùng thanh trượt lướt ngang */}
          <div
            ref={sliderRef}
            className="pandora-slider-track"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
          >
            {loading ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="pandora-slide-item">
                  <div className="pandora-skeleton-card animate-pulse">
                    <div className="pandora-skeleton-img" />
                    <div className="pandora-skeleton-line w-3/4" />
                    <div className="pandora-skeleton-line w-1/2" />
                  </div>
                </div>
              ))
            ) : products.length > 0 ? (
              products.map((prod) => (
                <div key={prod.id} className="pandora-slide-item">
                  <ProductCard
                    product={prod}
                    onAddToCart={addToCart}
                    onToggleWishlist={toggleWishlist}
                    isWishlisted={isWishlisted(prod.id)}
                  />
                </div>
              ))
            ) : (
              <div className="text-center py-12 px-8 bg-white/70 rounded-2xl border border-stone-200 mx-auto w-full">
                <p className="text-sm text-stone-500 mb-3">
                  Chưa tìm thấy sản phẩm phù hợp với phong cách "{selectedTag}".
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedTag("Tất cả")}
                  className="px-4 py-2 text-xs font-bold bg-[#1a1714] text-white rounded-lg hover:bg-[#b86b49] transition-colors cursor-pointer"
                >
                  Xem tất cả gợi ý Pandora
                </button>
              </div>
            )}
          </div>

          {/* Thanh chỉ báo tiến trình lướt ngang */}
          {products.length > 3 && (
            <div className="pandora-scrollbar-progress">
              <div
                className="pandora-scrollbar-thumb"
                style={{ width: `${Math.max(15, scrollProgress)}%` }}
              />
            </div>
          )}
        </div>

        {/* ── BANNER KHÁM PHÁ HỘP QUÀ PANDORA STYLIST ── */}
        <div className="pandora-banner-box">
          <div className="pandora-banner-text">
            <span className="pandora-banner-kicker">
              <ShieldCheck size={16} className="inline text-[#b86b49] mr-1.5" />
              Dịch vụ Tư vấn Không gian Pandora Personal Stylist
            </span>
            <h3 className="pandora-banner-h3">
              Chưa tìm thấy mảnh ghép ưng ý cho tổ ấm của bạn?
            </h3>
            <p className="pandora-banner-desc">
              Đội ngũ kiến trúc sư & stylist của Nhà Xinh sẵn sàng thiết kế mô phỏng 3D miễn phí và tuyển chọn bộ nội thất phối riêng theo diện tích thực tế nhà bạn.
            </p>
          </div>

          <div className="pandora-banner-actions">
            <button
              type="button"
              onClick={() => setBoxOpened(true)}
              className="pandora-cta-btn"
            >
              <Gift size={16} />
              <span>Mở Hộp Quà Gợi Ý Pandora</span>
            </button>
            <Link to="/tu-van-thiet-ke" className="pandora-secondary-btn">
              <span>Đăng ký tư vấn 3D</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Modal Hộp Quà Phong Cách */}
        {boxOpened && (
          <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="w-full max-w-md bg-white rounded-2xl p-6 sm:p-7 shadow-2xl border border-amber-200 text-center relative">
              <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4">
                <Gift size={32} />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-2">
                Hộp Quà Phong Cách Pandora
              </h4>
              <p className="text-xs sm:text-sm text-gray-600 mb-4">
                Bạn nhận được voucher độc quyền <strong className="text-[#b86b49]">PANDORA-LUX10</strong> giảm trực tiếp 10% cho tất cả đơn hàng nội thất trong tháng này!
              </p>
              <div className="bg-[#FAF7F2] p-3 rounded-xl border border-dashed border-[#B86B49] text-sm font-mono font-bold text-[#B86B49] mb-5 tracking-wider">
                MÃ: PANDORA-LUX10
              </div>
              <button
                type="button"
                onClick={() => setBoxOpened(false)}
                className="w-full py-2.5 bg-[#1F1D1A] hover:bg-[#B86B49] text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
              >
                Lưu mã & Đóng
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
