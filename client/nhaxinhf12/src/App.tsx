import { BrowserRouter, Routes, Route } from "react-router-dom";
import NavigationAndProgressManager from "./components/NavigationAndProgressManager";
import { HomePage } from "./pages/home";
import ProductListPage from "./pages/product-list";
import CollectionsPage from "./pages/collections";
import DesignConsultingPage from "./pages/design-consulting";
import ProductDetailPage from "./pages/product";
import PolicyPage from "./pages/policies";
import CartPage from "./pages/cart";
import CheckoutPage from "./pages/checkout";
import PaymentResultPage from "./pages/payment-result";
import WishlistPage from "./pages/wishlist";
import LoginPage from "./pages/login";
import ProfilePage from "./pages/profile";
import SearchPage from "./pages/search";
import AdminPortal from "./pages/admin/AdminPortal";
import ChatWidget from "./components/ChatWidget";

export default function App() {
  return (
    <div className="wrapper">
      <BrowserRouter>
        <NavigationAndProgressManager>
          <Routes>
            {/* Quản trị viên (Admin Portal) */}
            <Route path="/admin" element={<AdminPortal />} />
            <Route path="/admin/*" element={<AdminPortal />} />
            <Route path="/admin/chinh-sach" element={<AdminPortal />} />

            <Route path="/" element={<HomePage />} />

            {/* Chính sách & hỗ trợ */}
            <Route path="/chinh-sach-mua-ban-doi-tra" element={<PolicyPage />} />
            <Route path="/chinh-sach-giao-hang" element={<PolicyPage />} />
            <Route path="/chinh-sach-bao-hanh" element={<PolicyPage />} />
            <Route path="/chinh-sach-bao-mat" element={<PolicyPage />} />
            <Route path="/dieu-khoan-su-dung" element={<PolicyPage />} />
            <Route path="/khach-hang-than-thiet" element={<PolicyPage />} />

            {/* Danh sách sản phẩm & Phân loại */}
            <Route path="/san-pham" element={<ProductListPage />} />
            <Route path="/danh-muc/:slug" element={<ProductListPage />} />
            <Route path="/phong/:slug" element={<ProductListPage />} />
            <Route path="/phong" element={<ProductListPage />} />
            <Route path="/thuong-hieu/:slug" element={<ProductListPage />} />
            <Route path="/bo-suu-tap" element={<CollectionsPage />} />
            <Route path="/bo-suu-tap/:slug" element={<CollectionsPage />} />
            <Route path="/khuyen-mai" element={<ProductListPage />} />
            <Route path="/tu-van-thiet-ke" element={<DesignConsultingPage />} />
            <Route path="/thiet-ke-noi-that" element={<DesignConsultingPage />} />
            <Route path="/bai-viet" element={<PolicyPage />} />
            <Route path="/gioi-thieu" element={<ProductListPage />} />
            <Route path="/he-thong-cua-hang" element={<ProductListPage />} />

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
            {/* Fallback */}
            <Route path="*" element={<ProductListPage />} />
          </Routes>
          <ChatWidget />
        </NavigationAndProgressManager>
      </BrowserRouter>
    </div>
  );
}