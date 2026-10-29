import { useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronRight, Search } from "lucide-react";
import Header from "../components/Headers";
import Footer from "../components/Footer";
import ProductCard from "../components/ProductCard";
import ToastContainer from "../components/ToastContainer";
import { useStore } from "../hooks/useStore";
import { useToast } from "../hooks/useAnimations";
import "./pages.css";
import "./search.css";
import { useProductList } from "../hooks/useProductList";

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const [localQ, setLocalQ] = useState(query);
  const { cartCount, wishlist, addToCart, toggleWishlist, isWishlisted, user } = useStore();
  const { toasts, showToast } = useToast();
  const products = useProductList();

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return products.filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.slug.includes(q) ||
        (p.brand && p.brand.toLowerCase().includes(q))
    );
  }, [query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (localQ.trim()) {
      setSearchParams({ q: localQ.trim() });
    }
  };

  const handleAddToCart = (product: Parameters<typeof addToCart>[0]) => {
    addToCart(product);
    showToast(`Đã thêm "${product.name}" vào giỏ hàng`, "success");
  };

  return (
    <>
      <Header user={user} cartCount={cartCount} wishlistCount={wishlist.length} />

      <main className="page page-enter">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Trang chủ</Link>
          <ChevronRight size={14} />
          <span>Tìm kiếm</span>
        </nav>

        {/* Search bar */}
        <div className="search-hero">
          <h1 className="search-hero-title">Tìm kiếm sản phẩm</h1>
          <form className="search-form" onSubmit={handleSearch}>
            <Search size={20} className="search-form-icon" />
            <input
              type="text"
              value={localQ}
              onChange={(e) => setLocalQ(e.target.value)}
              placeholder="Tìm sofa, bàn ăn, đèn trần, ghế..."
              aria-label="Từ khoá tìm kiếm"
              autoFocus
            />
            <button type="submit" className="btn-primary search-submit">
              Tìm kiếm
            </button>
          </form>
        </div>

        {query && (
          <div className="search-results-header">
            <p className="search-count">
              {results.length > 0
                ? <>Tìm thấy <strong>{results.length}</strong> kết quả cho "<strong>{query}</strong>"</>
                : <>Không tìm thấy kết quả cho "<strong>{query}</strong>"</>
              }
            </p>
          </div>
        )}

        {results.length > 0 ? (
          <div className="product-grid stagger-in">
            {results.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onAddToCart={handleAddToCart}
                onToggleWishlist={toggleWishlist}
                isWishlisted={isWishlisted(p.id)}
              />
            ))}
          </div>
        ) : query ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Search size={32} />
            </div>
            <h2>Không tìm thấy sản phẩm</h2>
            <p>Thử tìm với từ khoá khác hoặc duyệt danh mục sản phẩm của chúng tôi.</p>
            <Link to="/san-pham" className="empty-state-btn">
              Xem tất cả sản phẩm
            </Link>
          </div>
        ) : (
          <div className="search-suggestions">
            <h3>Gợi ý tìm kiếm</h3>
            <div className="search-tag-list">
              {["Sofa", "Bàn ăn", "Ghế", "Tủ", "Giường", "Đèn", "Thảm", "Gối trang trí"].map((tag) => (
                <button
                  key={tag}
                  className="search-tag"
                  onClick={() => {
                    setLocalQ(tag);
                    setSearchParams({ q: tag });
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      <Footer />
      <ToastContainer toasts={toasts} />
    </>
  );
}
