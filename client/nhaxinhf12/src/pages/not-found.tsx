import { Link } from "react-router-dom";
import {
  Compass,
  Home,
  ShoppingBag,
  MapPin,
  Phone,
  HelpCircle,
  ChevronRight,
} from "lucide-react";
import Header from "../components/Headers";
import Footer from "../components/Footer";
import { useStore } from "../hooks/useStore";
import { HOTLINE } from "../util/CONSTRAINT";

export default function NotFoundPage() {
  const store = useStore();

  return (
    <>
      <Header
        user={store.user}
        cartCount={store.cartCount}
        wishlistCount={store.wishlist.length}
      />

      <main className="min-h-[75vh] flex items-center justify-center bg-[#faf8f5] px-4 py-16 text-[#1f1d1a]">
        <div className="max-w-xl w-full text-center">
          {/* Badge & Icon */}
          <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-amber-50 border border-amber-200 text-[#b86b49] shadow-sm mb-6">
            <Compass size={48} className="stroke-[1.5] animate-pulse" />
            <span className="absolute -top-2 -right-2 px-2.5 py-0.5 rounded-full bg-[#b86b49] text-white text-[11px] font-bold">
              404
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-serif font-bold text-stone-900 tracking-tight mb-3">
            Không Tìm Thấy Trang Yêu Cầu
          </h1>

          <p className="text-stone-600 text-sm sm:text-base leading-relaxed mb-8 font-light max-w-md mx-auto">
            Đường dẫn URL bạn vừa truy cập có thể không tồn tại, đã bị xóa hoặc liên kết đã được cập nhật sang địa chỉ mới.
          </p>

          {/* Quick primary actions */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#b86b49] hover:bg-[#a05a3b] text-white font-semibold text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Home size={16} />
              <span>Về trang chủ</span>
            </Link>

            <Link
              to="/san-pham"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white hover:bg-stone-50 text-stone-800 font-semibold text-xs sm:text-sm border border-stone-300 shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <ShoppingBag size={16} />
              <span>Xem tất cả sản phẩm</span>
            </Link>
          </div>

          {/* Helpful Navigation Links Box */}
          <div className="p-5 rounded-2xl bg-white border border-stone-200/90 text-left shadow-2xs">
            <p className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3 flex items-center gap-1.5">
              <HelpCircle size={14} className="text-[#b86b49]" />
              <span>Các lối tắt hữu ích cho bạn:</span>
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <Link
                to="/he-thong-showroom"
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-stone-50 text-stone-700 hover:text-[#b86b49] transition-colors border border-transparent hover:border-stone-200"
              >
                <span className="flex items-center gap-2">
                  <MapPin size={14} className="text-[#b86b49]" />
                  <span>Hệ thống showroom</span>
                </span>
                <ChevronRight size={13} className="text-stone-400" />
              </Link>

              <Link
                to="/gioi-thieu"
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-stone-50 text-stone-700 hover:text-[#b86b49] transition-colors border border-transparent hover:border-stone-200"
              >
                <span className="flex items-center gap-2">
                  <Compass size={14} className="text-[#b86b49]" />
                  <span>Giới thiệu thương hiệu</span>
                </span>
                <ChevronRight size={13} className="text-stone-400" />
              </Link>

              <Link
                to="/giam-gia-dac-biet"
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-stone-50 text-stone-700 hover:text-[#b86b49] transition-colors border border-transparent hover:border-stone-200"
              >
                <span className="flex items-center gap-2">
                  <ShoppingBag size={14} className="text-[#b86b49]" />
                  <span>Ưu đãi & Giảm giá</span>
                </span>
                <ChevronRight size={13} className="text-stone-400" />
              </Link>

              <a
                href={HOTLINE.href}
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-stone-50 text-stone-700 hover:text-[#b86b49] transition-colors border border-transparent hover:border-stone-200"
              >
                <span className="flex items-center gap-2">
                  <Phone size={14} className="text-[#b86b49]" />
                  <span>Hotline: {HOTLINE.label}</span>
                </span>
                <ChevronRight size={13} className="text-stone-400" />
              </a>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
