# TÀI LIỆU TỔNG HỢP VÀ THỐNG KÊ TOÀN BỘ API HỆ THỐNG NHÀ XINH

> **Hệ thống**: Nhà Xinh E-Commerce & Nội Thất Cao Cấp  
> **Phiên bản API**: `v1`  
> **API Base URL**: `http://localhost:8080/api/v1` (môi trường Dev) hoặc `/api/v1` (tương đối qua Vite Proxy/Nginx)  
> **Frontend Mapping File**: [`client/nhaxinhf12/src/services/apiEndpoints.ts`](file:///d:/DA/nhaxinh/client/nhaxinhf12/src/services/apiEndpoints.ts)

---

## MỤC LỤC
1. [Quy chuẩn chung & Kiến trúc bảo mật](#1-quy-chuẩn-chung--kiến-trúc-bảo-mật)
2. [Nhóm 1: Xác thực & Phiên làm việc (Authentication & Session)](#nhóm-1-xác-thực--phiên-làm-việc-authentication--session)
3. [Nhóm 2: Tài khoản & Hồ sơ khách hàng (User Profile & Address Book)](#nhóm-2-tài-khoản--hồ-sơ-khách-hàng-user-profile--address-book)
4. [Nhóm 3: Sản phẩm & Media (Products & Media Catalog - Public)](#nhóm-3-sản-phẩm--media-products--media-catalog---public)
5. [Nhóm 4: Danh mục & Phân loại phòng (Categories & Rooms)](#nhóm-4-danh-mục--phân-loại-phòng-categories--rooms)
6. [Nhóm 5: Bộ sưu tập thiết kế (Collections)](#nhóm-5-bộ-sưu-tập-thiết-kế-collections)
7. [Nhóm 6: Giỏ hàng (Shopping Cart - X-Cart-Token)](#nhóm-6-giỏ-hàng-shopping-cart---x-cart-token)
8. [Nhóm 7: Thanh toán & Cổng VNPay (Checkout & Payment)](#nhóm-7-thanh-toán--cổng-vnpay-checkout--payment)
9. [Nhóm 8: Đơn hàng (Orders - Customer & Admin)](#nhóm-8-đơn-hàng-orders---customer--admin)
10. [Nhóm 9: Mã giảm giá & Ưu đãi (Coupons & Discounts)](#nhóm-9-mã-giảm-giá--ưu-đãi-coupons--discounts)
11. [Nhóm 10: Bài viết & Cẩm nang kiến trúc (Articles & Editorial)](#nhóm-10-bài-viết--cẩm-nang-kiến-trúc-articles--editorial)
12. [Nhóm 11: Chính sách & Điều khoản (Policies)](#nhóm-11-chính-sách--điều-khoản-policies)
13. [Nhóm 12: Quản trị Phân quyền RBAC & Nhật ký (Admin RBAC & Audit Logs)](#nhóm-12-quản-trị-phân-quyền-rbac--nhật-ký-admin-rbac--audit-logs)
14. [Nhóm 13: Quản trị Sản phẩm & Kho hàng (Admin Products Management)](#nhóm-13-quản-trị-sản-phẩm--kho-hàng-admin-products-management)
15. [Nhóm 14: Quản trị Giao dịch Thanh toán (Admin Payments)](#nhóm-14-quản-trị-giao-dịch-thanh-toán-admin-payments)
16. [Nhóm 15: Thông báo Email & SMTP Log (Notifications & Emails)](#nhóm-15-thông-báo-email--smtp-log-notifications--emails)
17. [Nhóm 16: Trợ lý ảo AI & CSKH Trực tuyến (Chatbot & Support)](#nhóm-16-trợ-lý-ảo-ai--cskh-trực-tuyến-chatbot--support)
18. [Nhóm 17: Cấu hình Hệ thống & Menu (System Configs & Navigation)](#nhóm-17-cấu-hình-hệ-thống--menu-system-configs--navigation)

---

## 1. QUY CHUẨN CHUNG & KIẾN TRÚC BẢO MẬT

* **Format dữ liệu**: `application/json;charset=UTF-8` (hoặc `multipart/form-data` đối với upload hình ảnh).
* **Session & Cookie**: Spring Session tích hợp `JSESSIONID` (hoặc Bearer Authorization Header) truyền kèm `withCredentials: true`.
* **Mã giỏ hàng khách vãng lai**: Header `X-Cart-Token` (chuỗi bảo mật ngẫu nhiên Base64 độ dài 40-128 ký tự). Tự động gộp vào giỏ hàng cá nhân khi khách đăng nhập.
* **Quyền hạn (RBAC Roles)**:
  * `PUBLIC`: Truy cập tự do không cần đăng nhập.
  * `CUSTOMER`: Đã đăng nhập tài khoản người dùng/khách hàng.
  * `ADMIN`: Toàn quyền quản trị hệ thống, quản lý tài khoản nhân viên, cấu hình và audit log.
  * `STAFF`: Quyền thao tác quản trị vận hành đơn hàng, sản phẩm, bài viết.

---

## NHÓM 1: XÁC THỰC & PHIÊN LÀM VIỆC (AUTHENTICATION & SESSION)
> **Controller**: [`AuthController.java`](file:///d:/DA/nhaxinh/server/src/main/java/vn/nhaxinh/security/AuthController.java)  
> **Base Path**: `/api/v1/auth`

| Phương thức | Endpoint URL | Quyền hạn | Mô tả chức năng | Request Body / Params |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/auth/csrf` | `PUBLIC` | Lấy mã CSRF Token phục vụ bảo mật form submit SPA | Không có |
| `GET` | `/api/v1/auth/me` | `PUBLIC` | Kiểm tra phiên làm việc hiện tại, lấy thông tin User, Roles và Permissions | Không có |
| `POST` | `/api/v1/auth/login` | `PUBLIC` | Đăng nhập tài khoản bằng Email và Mật khẩu | `{"email":"...","password":"..."}` |
| `POST` | `/api/v1/auth/register` | `PUBLIC` | Đăng ký tài khoản thành viên mới cho khách hàng | `{"fullName":"...","email":"...","phone":"...","password":"...","marketingConsent":true}` |
| `POST` | `/api/v1/auth/logout` | `PUBLIC` | Đăng xuất người dùng, vô hiệu hóa phiên session | Không có |
| `POST` | `/api/v1/auth/forgot-password` | `PUBLIC` | Yêu cầu mã OTP (6 số, hạn 3 phút, chống spam 20s) gửi về Email để đổi mật khẩu | `{"email":"..."}` |
| `POST` | `/api/v1/auth/reset-password` | `PUBLIC` | Xác thực mã OTP và cập nhật mật khẩu mới | `{"email":"...","token":"123456","newPassword":"..."}` |

---

## NHÓM 2: TÀI KHOẢN & HỒ SƠ KHÁCH HÀNG (USER PROFILE & ADDRESS BOOK)
> **Controller**: [`UserController.java`](file:///d:/DA/nhaxinh/server/src/main/java/vn/nhaxinh/user/UserController.java)  
> **Base Path**: `/api/v1/users`

| Phương thức | Endpoint URL | Quyền hạn | Mô tả chức năng | Request Body / Params |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/users/me` | `CUSTOMER` | Lấy chi tiết hồ sơ cá nhân của người dùng đang đăng nhập | Không có |
| `PUT` | `/api/v1/users/me` | `CUSTOMER` | Cập nhật thông tin cá nhân (Họ tên, SĐT, Email, Giới tính, Ngày sinh, Địa chỉ) | `{"fullName":"...","phone":"...","email":"...","gender":"...","birthDate":"..."}` |
| `POST` | `/api/v1/users/change-password` | `CUSTOMER` | Đổi mật khẩu tài khoản người dùng đang đăng nhập | `{"currentPassword":"...","newPassword":"..."}` |
| `GET` | `/api/v1/users/me/addresses` | `CUSTOMER` | Lấy danh sách sổ địa chỉ nhận hàng của người dùng | Không có |
| `POST` | `/api/v1/users/me/addresses` | `CUSTOMER` | Thêm mới hoặc cập nhật một địa chỉ giao hàng | `{"recipientName":"...","recipientPhone":"...","streetAddress":"...","province":"...","district":"...","ward":"...","isDefault":true}` |
| `DELETE` | `/api/v1/users/me/addresses/{id}` | `CUSTOMER` | Xóa một địa chỉ khỏi sổ địa chỉ cá nhân | Không có |
| `PUT` | `/api/v1/users/me/addresses/{id}/default` | `CUSTOMER` | Đặt một địa chỉ làm địa chỉ mặc định nhận hàng | Không có |

---

## NHÓM 3: SẢN PHẨM & MEDIA (PRODUCTS & MEDIA CATALOG - PUBLIC)
> **Controller**: [`ProductController.java`](file:///d:/DA/nhaxinh/server/src/main/java/vn/nhaxinh/catalog/ProductController.java)  
> **Base Path**: `/api/v1/products`

| Phương thức | Endpoint URL | Quyền hạn | Mô tả chức năng | Request Body / Params |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/products` | `PUBLIC` | Lấy danh sách sản phẩm tóm tắt có phân trang & sắp xếp | `?page=0&size=20&sort=name&dir=asc` |
| `GET` | `/api/v1/products/search` | `PUBLIC` | Tìm kiếm sản phẩm theo từ khóa (tên, mô tả, chất liệu) | `?keyword=sofa&page=0&size=20` |
| `GET` | `/api/v1/products/category/{categoryId}` | `PUBLIC` | Lấy danh sách sản phẩm thuộc một danh mục cụ thể | `?page=0&size=20` |
| `GET` | `/api/v1/products/brand/{brandId}` | `PUBLIC` | Lấy danh sách sản phẩm thuộc thương hiệu | `?page=0&size=20` |
| `GET` | `/api/v1/products/slug/{slug}` | `PUBLIC` | Lấy chi tiết toàn diện của sản phẩm theo slug (kèm biến thể, tồn kho live, media) | Không có |
| `GET` | `/api/v1/products/featured` | `PUBLIC` | Danh sách sản phẩm nổi bật (trang chủ) | `?limit=8` (mặc định 8, tối đa 50) |
| `GET` | `/api/v1/products/{id}/media` | `PUBLIC` | Lấy danh sách media của sản phẩm theo ID số | `?type=IMAGE` hoặc `?type=VIDEO` |
| `GET` | `/api/v1/products/slug/{slug}/media` | `PUBLIC` | Lấy danh sách media của sản phẩm theo slug | `?type=IMAGE` |
| `GET` | `/api/v1/products/{id}/images` | `PUBLIC` | Lấy danh sách ảnh gallery của sản phẩm theo ID số | Không có |
| `GET` | `/api/v1/products/slug/{slug}/images` | `PUBLIC` | Lấy danh sách ảnh gallery của sản phẩm theo slug | Không có |
| `GET` | `/api/v1/products/media/{mediaId}/image` | `PUBLIC` | Stream xem hoặc tải trực tiếp file hình ảnh của sản phẩm | Không có |
| `DELETE` | `/api/v1/products/{id}` | `STAFF / ADMIN` | Xóa mềm sản phẩm (chuyển cờ `isDeleted=true`, status `ARCHIVED`) | Không có |
| `POST` / `PATCH` | `/api/v1/products/{id}/restore` | `STAFF / ADMIN` | Khôi phục sản phẩm đã bị xóa mềm | Không có |

---

## NHÓM 4: DANH MỤC & PHÂN LOẠI PHÒNG (CATEGORIES & ROOMS)
> **Controller**: [`CategoryController.java`](file:///d:/DA/nhaxinh/server/src/main/java/vn/nhaxinh/catalog/CategoryController.java)  
> **Base Path**: `/api/v1/categories` & `/api/v1/admin/categories`

| Phương thức | Endpoint URL | Quyền hạn | Mô tả chức năng | Request Body / Params |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/categories` | `PUBLIC` | Lấy danh sách danh mục (hỗ trợ lọc theo nhóm, trạng thái hoạt động) | `?includeInactive=false&includeDeleted=false&group=ROOM` |
| `GET` | `/api/v1/categories/trash` | `STAFF / ADMIN` | Lấy danh sách các danh mục trong thùng rác đã bị xóa mềm | Không có |
| `GET` | `/api/v1/categories/collections` | `PUBLIC` | Lấy danh sách các nhóm danh mục thuộc Bộ sưu tập | Không có |
| `GET` | `/api/v1/categories/rooms` | `PUBLIC` | Lấy danh mục Không gian phòng (Phòng khách, Phòng ăn, Phòng ngủ...) | Không có |
| `GET` | `/api/v1/categories/products` | `PUBLIC` | Lấy danh mục thuần loại sản phẩm (Sofa, Bàn, Ghế, Tủ kệ...) | Không có |
| `GET` | `/api/v1/categories/check-slug` | `STAFF / ADMIN` | Kiểm tra slug trùng lặp và tự động gợi ý slug duy nhất khi tạo mới | `?slug=sofa-goc&excludeId=12` |
| `POST` | `/api/v1/categories/upload-image` | `STAFF / ADMIN` | Upload hình ảnh đại diện cho danh mục (Multipart Form) | `file`: MultipartFile |
| `POST` | `/api/v1/categories` | `STAFF / ADMIN` | Tạo mới một danh mục (Hỗ trợ cả JSON body hoặc Multipart) | `CategoryRequest` |
| `PUT` | `/api/v1/categories/{id}` | `STAFF / ADMIN` | Cập nhật thông tin danh mục | `CategoryRequest` |
| `DELETE` | `/api/v1/categories/{id}` | `STAFF / ADMIN` | Xóa mềm danh mục vào thùng rác | Không có |
| `PATCH` / `POST` | `/api/v1/categories/{id}/restore` | `STAFF / ADMIN` | Khôi phục danh mục từ thùng rác | Không có |
| `DELETE` | `/api/v1/categories/{id}/permanent` | `ADMIN` | Xóa vĩnh viễn danh mục khỏi cơ sở dữ liệu | Không có |
| `PATCH` | `/api/v1/categories/{id}/status` | `STAFF / ADMIN` | Bật/tắt trạng thái hoạt động của danh mục | `{"isActive": true}` |

---

## NHÓM 5: BỘ SƯU TẬP THIẾT KẾ (COLLECTIONS)
> **Controller**: [`CollectionController.java`](file:///d:/DA/nhaxinh/server/src/main/java/vn/nhaxinh/catalog/CollectionController.java)  
> **Base Path**: `/api/v1/collections` & `/api/v1/admin/collections`

| Phương thức | Endpoint URL | Quyền hạn | Mô tả chức năng | Request Body / Params |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/collections` | `PUBLIC` | Danh sách bộ sưu tập đang hiển thị trên web | `?includeDeleted=false` |
| `GET` | `/api/v1/collections/trash` | `STAFF / ADMIN` | Danh sách bộ sưu tập đã bị đưa vào thùng rác | Không có |
| `GET` | `/api/v1/collections/{id}` | `PUBLIC` | Lấy chi tiết bộ sưu tập theo ID | Không có |
| `GET` | `/api/v1/collections/slug/{slug}` | `PUBLIC` | Lấy chi tiết bộ sưu tập theo slug (Victoria, Coastal Living, Osaka...) | Không có |
| `GET` | `/api/v1/collections/check-slug` | `STAFF / ADMIN` | Kiểm tra tính duy nhất của slug bộ sưu tập | `?slug=victoria` |
| `POST` | `/api/v1/collections/upload-image` | `STAFF / ADMIN` | Upload ảnh bìa / banner cho bộ sưu tập | `file`: MultipartFile |
| `POST` | `/api/v1/collections` | `STAFF / ADMIN` | Tạo mới bộ sưu tập (Banner, Video URL, Chất liệu, Phong cách, Bài viết) | `CollectionDTO` |
| `PUT` | `/api/v1/collections/{id}` | `STAFF / ADMIN` | Cập nhật thông tin bộ sưu tập | `CollectionDTO` |
| `DELETE` | `/api/v1/collections/{id}` | `STAFF / ADMIN` | Xóa mềm bộ sưu tập vào thùng rác | Không có |
| `PATCH` / `POST` | `/api/v1/collections/{id}/restore` | `STAFF / ADMIN` | Khôi phục bộ sưu tập từ thùng rác | Không có |
| `DELETE` | `/api/v1/collections/{id}/permanent` | `ADMIN` | Xóa vĩnh viễn bộ sưu tập | Không có |

---

## NHÓM 6: GIỎ HÀNG (SHOPPING CART - X-CART-TOKEN)
> **Controller**: [`CartController.java`](file:///d:/DA/nhaxinh/server/src/main/java/vn/nhaxinh/cart/CartController.java)  
> **Base Path**: `/api/v1/cart`

| Phương thức | Endpoint URL | Quyền hạn | Mô tả chức năng | Request Body / Params |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/cart/session` | `PUBLIC` | Khởi tạo mã phiên giỏ hàng (`X-Cart-Token`) cho khách vãng lai | Không có |
| `GET` | `/api/v1/cart` | `PUBLIC` | Lấy thông tin giỏ hàng hiện tại (truyền theo User login hoặc `X-Cart-Token`) | Header: `X-Cart-Token` (tùy chọn nếu chưa login) |
| `POST` | `/api/v1/cart/items` | `PUBLIC` | Thêm biến thể sản phẩm vào giỏ hàng với số lượng chỉ định | `{"variantId":1,"quantity":2}` |
| `PATCH` | `/api/v1/cart/items/{itemId}` | `PUBLIC` | Cập nhật số lượng của một dòng sản phẩm trong giỏ hàng | `{"quantity":3}` |
| `DELETE` | `/api/v1/cart/items/{itemId}` | `PUBLIC` | Xóa một dòng sản phẩm khỏi giỏ hàng | Không có |
| `DELETE` | `/api/v1/cart/items/by-variant/{variantId}` | `PUBLIC` | Xóa sản phẩm khỏi giỏ theo variant ID | Không có |
| `DELETE` | `/api/v1/cart` (hoặc `/cart/items`) | `PUBLIC` | Dọn sạch toàn bộ sản phẩm trong giỏ hàng | Không có |

---

## NHÓM 7: THANH TOÁN & CỔNG VNPAY (CHECKOUT & PAYMENT)
> **Controller**: [`CheckoutController.java`](file:///d:/DA/nhaxinh/server/src/main/java/vn/nhaxinh/payment/CheckoutController.java)  
> **Base Path**: `/api/v1`

| Phương thức | Endpoint URL | Quyền hạn | Mô tả chức năng | Request Body / Params |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/checkout` | `PUBLIC` | Đặt hàng & thanh toán (COD, Chuyển khoản, VNPay Online). Tự động tạo đơn hàng và sinh URL thanh toán VNPay nếu chọn cổng VNPay | `CheckoutRequest` |
| `GET` | `/api/v1/coupons/validate` | `PUBLIC` | Kiểm tra mã giảm giá & tính trước số tiền chiết khấu (preview) | `?code=GIAM10&subtotal=50000000&shippingFee=0&phone=...` |
| `GET` | `/api/v1/payments/order/{orderCode}` | `PUBLIC` | Lấy lịch sử các giao dịch thanh toán của một đơn hàng cụ thể | `?phone=0903884358` (đối với khách vãng lai) |
| `POST` | `/api/v1/payments/order/{orderCode}/retry` | `PUBLIC` | Tạo lại giao dịch thanh toán mới cho đơn hàng chưa hoàn tất hoặc thất bại | `{"paymentMethod":"VNPAY"}` |
| `POST` | `/api/v1/payments/vnpay/ipn` | `PUBLIC (Webhook)` | Webhook IPN nhận kết quả xác nhận thanh toán trực tiếp từ máy chủ VNPay | Payload từ VNPay (Chữ ký HMAC-SHA512) |
| `GET` | `/api/v1/payments/vnpay/return` | `PUBLIC (Browser)` | Trang nhận kết quả thanh toán từ VNPay và tự động chuyển hướng về `/payment/result` của Frontend | Tham số redirect từ cổng VNPay |

---

## NHÓM 8: ĐƠN HÀNG (ORDERS - CUSTOMER & ADMIN)
> **Controllers**: [`OrderController.java`](file:///d:/DA/nhaxinh/server/src/main/java/vn/nhaxinh/order/OrderController.java), [`AdminOrderController.java`](file:///d:/DA/nhaxinh/server/src/main/java/vn/nhaxinh/order/AdminOrderController.java)  
> **Base Path**: `/api/v1/orders` & `/api/v1/admin/orders`

| Phương thức | Endpoint URL | Quyền hạn | Mô tả chức năng | Request Body / Params |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/orders/my` | `CUSTOMER` | Lịch sử mua hàng của tài khoản đang đăng nhập (kèm danh sách món & tiến độ trạng thái) | `?page=0&size=10` |
| `GET` | `/api/v1/orders/{orderCode}` | `PUBLIC` | Tra cứu chi tiết đơn hàng (Yêu cầu đăng nhập hoặc nhập đúng SĐT nhận hàng nếu vãng lai) | `?phone=0903884358` |
| `POST` | `/api/v1/orders/{orderCode}/cancel` | `CUSTOMER` | Khách hàng hủy đơn hàng (chỉ khi đơn ở trạng thái `PENDING` hoặc `CONFIRMED`) | `{"reason":"Đổi ý định mua"}` |
| `GET` | `/api/v1/admin/orders` | `STAFF / ADMIN` | Danh sách toàn bộ đơn hàng trong hệ thống có bộ lọc đa chiều (Keyword, OrderStatus, PaymentStatus) | `?keyword=...&orderStatus=...&paymentStatus=...&page=0&size=20` |
| `GET` | `/api/v1/admin/orders/{id}` | `STAFF / ADMIN` | Xem chi tiết đơn hàng quản trị (kèm món, lịch sử đổi trạng thái, thông tin cọc) | Không có |
| `POST` | `/api/v1/admin/orders` | `STAFF / ADMIN` | Tạo mới đơn hàng / hóa đơn thủ công từ cổng Admin và gửi email thông báo | `CreateAdminOrderRequest` |
| `PUT` | `/api/v1/admin/orders/{id}/status` | `STAFF / ADMIN` | Đổi trạng thái xử lý đơn hàng (`CONFIRMED`, `SHIPPING`, `COMPLETED`, `CANCELLED`...) | `{"status":"SHIPPING","note":"Đang giao qua xe tải"}` |
| `PUT` | `/api/v1/admin/orders/{id}/payment` | `STAFF / ADMIN` | Đổi trạng thái thanh toán đơn hàng (`PAID`, `PARTIALLY_PAID`, `REFUNDED`...) | `{"paymentStatus":"PAID","note":"Đã nhận đủ tiền"}` |
| `PUT` | `/api/v1/admin/orders/{id}/shipping` | `STAFF / ADMIN` | Cập nhật địa chỉ nhận hàng, người nhận, ghi chú giao hàng | `UpdateOrderShippingRequest` |
| `PUT` | `/api/v1/admin/orders/{id}/cancel` | `STAFF / ADMIN` | Quản trị viên hủy đơn hàng và ghi nhận lý do nội bộ | `{"reason":"Khách liên hệ yêu cầu đổi mẫu"}` |

---

## NHÓM 9: MÃ GIẢM GIÁ & ƯU ĐÃI (COUPONS & DISCOUNTS)
> **Controller**: [`AdminCouponController.java`](file:///d:/DA/nhaxinh/server/src/main/java/vn/nhaxinh/coupon/AdminCouponController.java)  
> **Base Path**: `/api/v1/admin/coupons` & `/api/v1/coupons`

| Phương thức | Endpoint URL | Quyền hạn | Mô tả chức năng | Request Body / Params |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/coupons/public` | `PUBLIC` | Danh sách các voucher khuyến mãi công khai đang có hiệu lực (cho người dùng lưu/xem) | Không có |
| `GET` | `/api/v1/admin/coupons` | `STAFF / ADMIN` | Lấy toàn bộ danh sách mã giảm giá phục vụ quản trị | Không có |
| `POST` | `/api/v1/admin/coupons` | `STAFF / ADMIN` | Tạo mới mã giảm giá (áp dụng % hoặc tiền mặt, áp dụng cho khách mới, BST, danh mục, thời hạn) | `CouponDTO` |
| `PUT` | `/api/v1/admin/coupons/{id}` | `STAFF / ADMIN` | Sửa thông tin, hạn mức sử dụng và phạm vi áp dụng của voucher | `CouponDTO` |
| `DELETE` | `/api/v1/admin/coupons/{id}` | `STAFF / ADMIN` | Xóa mã giảm giá | Không có |

---

## NHÓM 10: BÀI VIẾT & CẨM NANG KIẾN TRÚC (ARTICLES & EDITORIAL)
> **Controller**: [`ArticleController.java`](file:///d:/DA/nhaxinh/server/src/main/java/vn/nhaxinh/article/ArticleController.java)  
> **Base Path**: `/api/v1/articles` & `/api/v1/admin/articles`

| Phương thức | Endpoint URL | Quyền hạn | Mô tả chức năng | Request Body / Params |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/articles` | `PUBLIC` | Danh sách bài viết cẩm nang, ý tưởng thiết kế đã xuất bản | `?category=cam-nang&collectionSlug=victoria&search=...` |
| `GET` | `/api/v1/articles/{idOrSlug}` | `PUBLIC` | Chi tiết nội dung bài viết theo ID hoặc slug thân thiện SEO | Không có |
| `GET` | `/api/v1/articles/collection/{collectionSlug}` | `PUBLIC` | Danh sách bài viết câu chuyện thiết kế đi kèm một Bộ sưu tập | Không có |
| `GET` | `/api/v1/admin/articles` | `STAFF / ADMIN` | Danh sách tất cả bài viết phục vụ trang quản trị (kèm bài nháp, đã xóa) | `?status=...&isDeleted=false` |
| `POST` | `/api/v1/admin/articles` | `STAFF / ADMIN` | Tạo mới bài viết bài cẩm nang / ý tưởng thiết kế | `ArticleRequest` |
| `PUT` | `/api/v1/admin/articles/{id}` | `STAFF / ADMIN` | Chỉnh sửa nội dung bài viết (HTML phong phú từ Tiptap Editor) | `ArticleRequest` |
| `DELETE` | `/api/v1/admin/articles/{id}` | `STAFF / ADMIN` | Xóa mềm bài viết | Không có |
| `PATCH` | `/api/v1/admin/articles/{id}/restore` | `STAFF / ADMIN` | Khôi phục bài viết đã xóa mềm | Không có |
| `PATCH` | `/api/v1/admin/articles/{id}/status` | `STAFF / ADMIN` | Đổi trạng thái xuất bản bài viết (`DRAFT` <-> `PUBLISHED`) | `?status=PUBLISHED` |
| `DELETE` | `/api/v1/admin/articles/{id}/permanent` | `ADMIN` | Xóa vĩnh viễn bài viết khỏi cơ sở dữ liệu | Không có |
| `POST` | `/api/v1/articles/upload-image` | `STAFF / ADMIN` | Tải ảnh lên máy chủ khi soạn thảo bài viết và trả về URL ảnh chèn vào bài | `file`: MultipartFile |

---

## NHÓM 11: CHÍNH SÁCH & ĐIỀU KHOẢN (POLICIES)
> **Controllers**: [`PolicyController.java`](file:///d:/DA/nhaxinh/server/src/main/java/vn/nhaxinh/policy/PolicyController.java), [`AdminPolicyController.java`](file:///d:/DA/nhaxinh/server/src/main/java/vn/nhaxinh/policy/AdminPolicyController.java)  
> **Base Path**: `/api/v1/policies` & `/api/v1/admin/policies`

| Phương thức | Endpoint URL | Quyền hạn | Mô tả chức năng | Request Body / Params |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/policies/all` | `PUBLIC` | Danh sách các chính sách đang công bố (Bảo hành, Đổi trả, Vận chuyển...) | Không có |
| `GET` | `/api/v1/policies/{slug}` | `PUBLIC` | Xem nội dung chính sách theo slug | Không có |
| `GET` | `/api/v1/admin/policies` | `STAFF / ADMIN` | Quản lý danh sách các chính sách nội bộ | `?status=...&keyword=...` |
| `GET` | `/api/v1/admin/policies/{id}` | `STAFF / ADMIN` | Xem chi tiết 1 chính sách trong admin | Không có |
| `POST` | `/api/v1/admin/policies` | `STAFF / ADMIN` | Tạo mới một chính sách | `CreatePolicyRequest` |
| `PUT` | `/api/v1/admin/policies/{id}` | `STAFF / ADMIN` | Cập nhật nội dung chính sách | `UpdatePolicyRequest` |
| `DELETE` | `/api/v1/admin/policies/{id}` | `STAFF / ADMIN` | Xóa chính sách | Không có |

---

## NHÓM 12: QUẢN TRỊ PHÂN QUYỀN RBAC & NHẬT KÝ (ADMIN RBAC & AUDIT LOGS)
> **Controllers**: [`AdminRbacController.java`](file:///d:/DA/nhaxinh/server/src/main/java/vn/nhaxinh/admin/AdminRbacController.java), [`AdminRoleController.java`](file:///d:/DA/nhaxinh/server/src/main/java/vn/nhaxinh/admin/AdminRoleController.java), [`AdminPermissionController.java`](file:///d:/DA/nhaxinh/server/src/main/java/vn/nhaxinh/admin/AdminPermissionController.java)  
> **Base Path**: `/api/v1/admin`

| Phương thức | Endpoint URL | Quyền hạn | Mô tả chức năng | Request Body / Params |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/admin/users` | `ADMIN` | Tra cứu danh sách người dùng, lọc theo vai trò (`role=STAFF`) | `?role=...` |
| `POST` | `/api/v1/admin/users` | `ADMIN` | Tạo tài khoản nhân sự nội bộ mới (Staff, Sales, Kho...) | `CreateInternalUserRequest` |
| `GET` | `/api/v1/admin/users/{id}/roles` | `ADMIN` | Xem các vai trò và quyền hiệu lực thực tế của 1 người dùng | Không có |
| `PUT` | `/api/v1/admin/users/{id}/roles` | `ADMIN` | Gán hoặc thay đổi danh sách vai trò cho một người dùng | `{"roleCodes":["STAFF","SALES"]}` |
| `PATCH` | `/api/v1/admin/users/{id}/status` | `ADMIN` | Khóa hoặc mở khóa tài khoản người dùng (`ACTIVE`, `LOCKED`, `INACTIVE`) | `{"status":"LOCKED"}` |
| `GET` | `/api/v1/admin/audit-logs` | `ADMIN` | Tra cứu lịch sử thao tác kiểm toán (Audit Log) có phân trang & lọc | `?page=0&size=20&actor=...` |
| `GET` | `/api/v1/admin/audit-logs/{id}` | `ADMIN` | Xem chi tiết 1 bản ghi nhật ký thao tác | Không có |
| `GET` | `/api/v1/admin/roles` | `ADMIN` | Lấy danh sách tất cả các vai trò (Roles) trong hệ thống | Không có |
| `GET` | `/api/v1/admin/roles/{id}` | `ADMIN` | Chi tiết một vai trò (kèm các quyền thuộc vai trò) | Không có |
| `GET` | `/api/v1/admin/roles/{id}/users` | `ADMIN` | Danh sách các nhân sự đang nắm giữ vai trò này | Không có |
| `POST` | `/api/v1/admin/roles` | `ADMIN` | Tạo mới một vai trò | `CreateRoleRequest` |
| `PUT` | `/api/v1/admin/roles/{id}` | `ADMIN` | Cập nhật thông tin vai trò | `UpdateRoleRequest` |
| `PUT` | `/api/v1/admin/roles/{id}/permissions` | `ADMIN` | Gán danh sách quyền (Permissions) cho vai trò | `{"permissionCodes":["PRODUCT_EDIT","ORDER_VIEW"]}` |
| `DELETE` | `/api/v1/admin/roles/{id}` | `ADMIN` | Xóa vai trò | Không có |
| `GET` | `/api/v1/admin/permissions` | `ADMIN` | Lấy danh sách toàn bộ các quyền chi tiết (Permissions) | Không có |
| `GET` | `/api/v1/admin/permissions/modules` | `ADMIN` | Danh sách các module phân quyền (`PRODUCT`, `ORDER`, `USER`, `SYSTEM`...) | Không có |
| `GET` | `/api/v1/admin/permissions/{id}` | `ADMIN` | Xem thông tin chi tiết một quyền | Không có |
| `POST` | `/api/v1/admin/permissions` | `ADMIN` | Định nghĩa thêm quyền mới | `CreatePermissionRequest` |
| `PUT` | `/api/v1/admin/permissions/{id}` | `ADMIN` | Sửa quyền | `UpdatePermissionRequest` |
| `DELETE` | `/api/v1/admin/permissions/{id}` | `ADMIN` | Xóa quyền | Không có |

---

## NHÓM 13: QUẢN TRỊ SẢN PHẨM & KHO HÀNG (ADMIN PRODUCTS MANAGEMENT)
> **Controller**: [`AdminProductController.java`](file:///d:/DA/nhaxinh/server/src/main/java/vn/nhaxinh/catalog/AdminProductController.java)  
> **Base Path**: `/api/v1/admin/products`

| Phương thức | Endpoint URL | Quyền hạn | Mô tả chức năng | Request Body / Params |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/admin/products` | `STAFF / ADMIN` | Lấy danh sách sản phẩm quản trị (kèm biến thể, tồn kho, cờ lưu trữ) | `?includeArchived=false&includeDeleted=false` |
| `GET` | `/api/v1/admin/products/trash` | `STAFF / ADMIN` | Danh sách sản phẩm trong thùng rác đã bị xóa mềm | Không có |
| `GET` | `/api/v1/admin/products/{id}` | `STAFF / ADMIN` | Lấy thông tin chi tiết đầy đủ của sản phẩm để chỉnh sửa | Không có |
| `GET` | `/api/v1/admin/products/check-slug` | `STAFF / ADMIN` | Kiểm tra slug sản phẩm có bị trùng và đề xuất slug mới tự động | `?slug=sofa-victoria&excludeId=10` |
| `POST` | `/api/v1/admin/products` | `STAFF / ADMIN` | Tạo mới sản phẩm (Hỗ trợ JSON body hoặc Multipart Upload nhiều file ảnh cùng lúc) | `CreateProductRequest` & `mediaFiles` |
| `PUT` | `/api/v1/admin/products/{id}` | `STAFF / ADMIN` | Cập nhật thông tin sản phẩm và các biến thể kích thước / màu sắc | `CreateProductRequest` & `mediaFiles` |
| `PATCH` | `/api/v1/admin/products/{id}/status` | `STAFF / ADMIN` | Đổi nhanh trạng thái kinh doanh (`DRAFT` | `ACTIVE` | `ARCHIVED`) | `{"status":"ACTIVE"}` |
| `DELETE` | `/api/v1/admin/products/{id}` | `STAFF / ADMIN` | Xóa mềm sản phẩm vào thùng rác | Không có |
| `PATCH` / `POST` | `/api/v1/admin/products/{id}/restore` | `STAFF / ADMIN` | Khôi phục sản phẩm từ thùng rác về trạng thái `ACTIVE` | Không có |
| `DELETE` | `/api/v1/admin/products/{id}/permanent` | `ADMIN` | Xóa vĩnh viễn sản phẩm khỏi cơ sở dữ liệu | Không có |

---

## NHÓM 14: QUẢN TRỊ GIAO DỊCH THANH TOÁN (ADMIN PAYMENTS)
> **Controller**: [`PaymentController.java`](file:///d:/DA/nhaxinh/server/src/main/java/vn/nhaxinh/payment/PaymentController.java)  
> **Base Path**: `/api/v1/admin/payments`

| Phương thức | Endpoint URL | Quyền hạn | Mô tả chức năng | Request Body / Params |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/admin/payments` | `STAFF / ADMIN` | Danh sách toàn bộ các giao dịch thanh toán trong hệ thống | `?page=0&size=20` |
| `GET` | `/api/v1/admin/payments/{paymentId}` | `STAFF / ADMIN` | Xem chi tiết 1 giao dịch (kèm mã giao dịch ngân hàng, cổng VNPay) | Không có |
| `PUT` | `/api/v1/admin/payments/{paymentId}/status` | `STAFF / ADMIN` | Cập nhật trạng thái đối soát thủ công cho thanh toán | `{"status":"COMPLETED"}` |
| `DELETE` | `/api/v1/admin/payments/{paymentId}` | `ADMIN` | Hủy / Xóa giao dịch thanh toán | Không có |

---

## NHÓM 15: THÔNG BÁO EMAIL & SMTP LOG (NOTIFICATIONS & EMAILS)
> **Controller**: [`NotificationController.java`](file:///d:/DA/nhaxinh/server/src/main/java/vn/nhaxinh/notification/NotificationController.java)  
> **Base Path**: `/api/v1/notifications`

| Phương thức | Endpoint URL | Quyền hạn | Mô tả chức năng | Request Body / Params |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/notifications/emails/order/{orderCode}` | `STAFF / ADMIN` | Xem lịch sử các lần đã gửi email thông báo xác nhận của đơn hàng | Không có |
| `POST` | `/api/v1/notifications/emails/order/{orderCode}/resend` | `STAFF / ADMIN` | Bấm gửi lại email hóa đơn/đơn hàng (hoặc gửi tới địa chỉ email bổ sung) | `{"email":"khachhang@gmail.com"}` (tùy chọn) |
| `GET` | `/api/v1/notifications/emails` | `ADMIN` | Tra cứu toàn bộ lịch sử gửi email của hệ thống, lọc trạng thái gửi | `?status=SENT&page=0&size=20` |
| `POST` | `/api/v1/notifications/emails/test` | `ADMIN` | Gửi thử nghiệm một email test kết nối máy chủ SMTP | `{"email":"admin@akacompany.com.vn","subject":"Test","message":"Test"}` |

---

## NHÓM 16: TRỢ LÝ ẢO AI & CSKH TRỰC TUYẾN (CHATBOT & SUPPORT)
> **Controller**: [`ChatbotController.java`](file:///d:/DA/nhaxinh/server/src/main/java/vn/nhaxinh/chatbot/ChatbotController.java)  
> **Base Path**: `/api/v1/chatbot`

| Phương thức | Endpoint URL | Quyền hạn | Mô tả chức năng | Request Body / Params |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/chatbot/message` | `PUBLIC` | Gửi tin nhắn từ người dùng, nhận câu trả lời từ Bot AI hoặc chuyển sang phòng tư vấn viên | `{"conversationId":1,"messageText":"Tư vấn sofa phòng khách","mode":"BOT"}` |
| `GET` | `/api/v1/chatbot/conversations/{id}/messages` | `PUBLIC` | Lấy toàn bộ lịch sử tin nhắn của cuộc hội thoại | Không có |
| `POST` | `/api/v1/chatbot/switch-mode` | `PUBLIC` | Chuyển đổi qua lại giữa chế độ Trợ lý AI (`BOT`) và Gặp chuyên viên CSKH (`AGENT`) | `{"conversationId":1,"mode":"AGENT"}` |
| `GET` | `/api/v1/chatbot/admin/conversations` | `STAFF / ADMIN` | Cổng chuyên viên: Danh sách các cuộc trò chuyện cần hỗ trợ trực tiếp | Không có |
| `POST` | `/api/v1/chatbot/admin/conversations/{id}/reply` | `STAFF / ADMIN` | Chuyên viên gửi tin nhắn trực tiếp trả lời khách hàng | `{"messageText":"Chào anh, em là chuyên viên Nhà Xinh..."}` |
| `PUT` | `/api/v1/chatbot/admin/messages/{id}/override` | `STAFF / ADMIN` | Chuyên viên chỉnh sửa hoặc can thiệp đè lên câu trả lời của AI | `{"messageText":"Nội dung đã đính chính"}` |
| `POST` | `/api/v1/chatbot/admin/conversations/{id}/close` | `STAFF / ADMIN` | Đóng phiên hỗ trợ trực tuyến và hoàn tất hỗ trợ | Không có |

---

## NHÓM 17: CẤU HÌNH HỆ THỐNG & MENU (SYSTEM CONFIGS & NAVIGATION)
> **Controller**: [`SystemConfigController.java`](file:///d:/DA/nhaxinh/server/src/main/java/vn/nhaxinh/system/SystemConfigController.java)  
> **Base Path**: `/api/v1/system-configs`

| Phương thức | Endpoint URL | Quyền hạn | Mô tả chức năng | Request Body / Params |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/system-configs/navigation-menu` | `PUBLIC` | Lấy cấu trúc Menu điều hướng tùy biến cho Header Client từ DB | Không có |
| `PUT` | `/api/v1/system-configs/navigation-menu` | `STAFF / ADMIN` | Cập nhật cấu trúc Menu điều hướng từ cổng quản trị CMS | `{"menuItems":[...]}` hoặc `{"value":"[...]"}` |
| `GET` | `/api/v1/system-configs/{key}` | `PUBLIC / ADMIN` | Lấy cấu hình hệ thống tổng quát theo khóa (Key-Value) | Không có |
| `PUT` | `/api/v1/system-configs/{key}` | `ADMIN` | Lưu hoặc cập nhật giá trị cấu hình hệ thống theo khóa | `{"value":"..."}` |

---

## BẢNG TỔNG HỢP MÃ PHẢN HỒI HTTP STATUS CODES

| Mã HTTP | Tên chuẩn | Ý nghĩa trong hệ thống Nhà Xinh |
| :--- | :--- | :--- |
| `200 OK` | Thành công | Yêu cầu truy vấn (`GET`), cập nhật (`PUT`/`PATCH`) xử lý thành công. |
| `201 CREATED` | Khởi tạo thành công | Tạo mới thực thể (`POST`) như Đăng ký, Đặt hàng, Tạo sản phẩm thành công. |
| `204 NO CONTENT` | Thành công không có body | Xóa thành công hoặc cập nhật trạng thái nhanh không cần trả về dữ liệu. |
| `400 BAD REQUEST` | Tham số không hợp lệ | Thiếu trường bắt buộc, sai định dạng dữ liệu, sai mã OTP, hết hạn OTP. |
| `401 UNAUTHORIZED` | Chưa xác thực | Sai thông tin đăng nhập, token hết hạn hoặc chưa đăng nhập vào hệ thống. |
| `403 FORBIDDEN` | Không có quyền | Khách hàng cố gắng truy cập trang Quản trị `/admin`, tài khoản bị khóa (`LOCKED`). |
| `404 NOT FOUND` | Không tìm thấy | Không tồn tại sản phẩm, đơn hàng, danh mục hoặc bài viết tương ứng với ID/Slug. |
| `409 CONFLICT` | Xung đột dữ liệu | Trùng tên đăng nhập, email hoặc số điện thoại đã được đăng ký trước đó. |
| `429 TOO MANY REQUESTS` | Quá nhiều yêu cầu | Chống spam bấm gửi lại mã OTP liên tục (cần chờ cooldown 20 giây). |
| `500 INTERNAL SERVER ERROR` | Lỗi máy chủ | Lỗi ngoại lệ nội bộ, không thể kết nối SMTP gửi email hoặc lỗi dịch vụ thanh toán. |

