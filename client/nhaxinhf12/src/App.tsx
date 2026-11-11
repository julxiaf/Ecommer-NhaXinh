import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import NavigationAndProgressManager from "./components/NavigationAndProgressManager";
import { HomePage } from "./pages/home";
import ChatWidget from "./components/ChatWidget";

// ── Tối ưu hóa Code-Splitting: Lazy load các trang phụ & Admin Portal ──
// Giúp trang chủ (/) không phải tải hàng trăm script dư thừa (AdminCharts, Tiptap, xlsx,...)
const AdminRouteGuard = lazy(() => import("./components/admin/AdminRouteGuard"));
const ProductListPage = lazy(() => import("./pages/product-list"));
const CollectionsPage = lazy(() => import("./pages/collections"));
const DesignConsultingPage = lazy(() => import("./pages/design-consulting"));
const ProductDetailPage = lazy(() => import("./pages/product"));
const PolicyPage = lazy(() => import("./pages/policies"));
const CartPage = lazy(() => import("./pages/cart"));
const CheckoutPage = lazy(() => import("./pages/checkout"));
const PaymentResultPage = lazy(() => import("./pages/payment-result"));
const WishlistPage = lazy(() => import("./pages/wishlist"));
const LoginPage = lazy(() => import("./pages/login"));
const ProfilePage = lazy(() => import("./pages/profile"));
const SearchPage = lazy(() => import("./pages/search"));
const ShowroomPage = lazy(() => import("./pages/showroom"));
const AboutPage = lazy(() => import("./pages/about"));
const NotFoundPage = lazy(() => import("./pages/not-found"));

function RouteLoadingFallback() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 py-16" aria-label="Đang tải trang">
      <div className="w-9 h-9 border-3 border-amber-600 border-t-transparent rounded-full animate-spin" />
      <span className="text-xs text-slate-600 font-medium tracking-wide">Đang tải dữ liệu...</span>
    </div>
  );
}

export default function App() {
  return (
    <div className="wrapper">
      <BrowserRouter>
        <NavigationAndProgressManager>
          <Suspense fallback={<RouteLoadingFallback />}>
            <Routes>
              {/* Quản trị viên (Admin Portal - Bảo vệ bởi AdminRouteGuard) */}
              <Route path="/admin/*" element={<AdminRouteGuard />} />

              <Route path="/" element={<HomePage />} />

              {/* Chính sách & hỗ trợ */}
              <Route path="/chinh-sach-mua-ban-doi-tra" element={<PolicyPage />} />
              <Route path="/chinh-sach-doi-tra" element={<PolicyPage />} />
              <Route path="/chinh-sach-giao-hang" element={<PolicyPage />} />
              <Route path="/chinh-sach-bao-hanh" element={<PolicyPage />} />
              <Route path="/chinh-sach-bao-mat" element={<PolicyPage />} />
              <Route path="/dieu-khoan-su-dung" element={<PolicyPage />} />
              <Route path="/khach-hang-than-thiet" element={<PolicyPage />} />
              <Route path="/chinh-sach/:slug" element={<PolicyPage />} />

              {/* Danh sách sản phẩm & Phân loại */}
              <Route path="/san-pham" element={<ProductListPage />} />
              <Route path="/san-pham-moi" element={<ProductListPage />} />
              <Route path="/danh-muc/:slug" element={<ProductListPage />} />
              <Route path="/phong/:slug" element={<ProductListPage />} />
              <Route path="/phong" element={<ProductListPage />} />
              <Route path="/thuong-hieu/:slug" element={<ProductListPage />} />
              <Route path="/bo-suu-tap" element={<CollectionsPage />} />
              <Route path="/bo-suu-tap/:slug" element={<CollectionsPage />} />
              <Route path="/bo-suu-tap-:slug" element={<CollectionsPage />} />
              <Route path="/bst-:slug" element={<CollectionsPage />} />
              <Route path="/khuyen-mai" element={<ProductListPage />} />
              <Route path="/giam-gia-dac-biet" element={<ProductListPage />} />
              <Route path="/uu-dai" element={<ProductListPage />} />
              <Route path="/tu-van-thiet-ke" element={<DesignConsultingPage />} />
              <Route path="/thiet-ke-noi-that" element={<DesignConsultingPage />} />
              <Route path="/bai-viet" element={<PolicyPage />} />
              <Route path="/gioi-thieu" element={<AboutPage />} />
              <Route path="/he-thong-cua-hang" element={<ShowroomPage />} />
              <Route path="/he-thong-showroom" element={<ShowroomPage />} />
              <Route path="/showroom" element={<ShowroomPage />} />

              {/* Tìm kiếm */}
              <Route path="/tim-kiem" element={<SearchPage />} />

              {/* Chi tiết sản phẩm */}
              <Route path="/san-pham/:slug" element={<ProductDetailPage />} />

              {/* Giỏ hàng, Thanh toán & Yêu thích */}
              <Route path="/gio-hang" element={<CartPage />} />
              <Route path="/thanh-toan" element={<CheckoutPage />} />
              <Route path="/payment/result" element={<PaymentResultPage />} />
              <Route path="/yeu-thich" element={<WishlistPage />} />

              {/* Đăng nhập, Tài khoản */}
              <Route path="/dang-nhap" element={<LoginPage />} />
              {/* Thông tin cá nhân, đơn hàng, đổi trả */}
              <Route path="/tai-khoan" element={<ProfilePage />} />
              <Route path="/me" element={<ProfilePage />} />
              {/* Fallback 404 cho bất kỳ URL không tồn tại nào */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
          <ChatWidget />
        </NavigationAndProgressManager>
      </BrowserRouter>
    </div>
  );
}
