import type {
  AdminCategory, AdminProduct, AdminOrder,
  RoleDefinition,
  PermissionKey, AdminStaff, AdminDiscount, AdminArticle,
  AdminNotification, AdminTicket, AdminSettingsConfig,
  AdminAuditLog, AdminPermissionItem
} from "./types";
import { catalogApi, type AdminProductInput } from "./catalogApi";
import { orderApi } from "./orderApi";
import { rbacApi } from "./rbacApi";

// ── Helper tự sinh slug tiếng Việt chuẩn SEO ──
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// ── Danh sách 42 Quyền chuẩn khớp 100% với Database table `permissions` ──
export interface SystemPermissionItem {
  id: number;
  key: PermissionKey;
  name: string;
  module: string;
  description: string;
}

export const ALL_PERMISSIONS: SystemPermissionItem[] = [
  // ── Phân hệ Quản trị (Admin Portal Modules - IDs 1 đến 29) ──
  { id: 1, key: "dashboard.view", name: "Xem tổng quan", module: "dashboard", description: "Xem trang tổng quan quản trị" },
  { id: 2, key: "users.view", name: "Xem tài khoản", module: "users", description: "Xem danh sách tài khoản" },
  { id: 3, key: "users.create", name: "Tạo tài khoản", module: "users", description: "Tạo tài khoản" },
  { id: 4, key: "users.update", name: "Cập nhật tài khoản", module: "users", description: "Cập nhật thông tin tài khoản" },
  { id: 5, key: "users.disable", name: "Khóa tài khoản", module: "users", description: "Khóa hoặc mở khóa tài khoản" },
  { id: 6, key: "customers.view", name: "Xem khách hàng", module: "customers", description: "Xem danh sách và lịch sử mua hàng của khách" },
  { id: 7, key: "customers.care", name: "Chăm sóc khách hàng", module: "customers", description: "Ghi nhật ký và lịch hẹn chăm sóc khách" },
  { id: 8, key: "roles.view", name: "Xem vai trò", module: "permissions", description: "Xem vai trò và quyền" },
  { id: 9, key: "roles.manage", name: "Quản lý vai trò", module: "permissions", description: "Tạo vai trò và gán quyền" },
  { id: 10, key: "products.view", name: "Xem sản phẩm", module: "products", description: "Xem sản phẩm" },
  { id: 11, key: "products.create", name: "Tạo sản phẩm", module: "products", description: "Thêm sản phẩm nội thất" },
  { id: 12, key: "products.update", name: "Sửa sản phẩm", module: "products", description: "Cập nhật sản phẩm nội thất" },
  { id: 13, key: "products.delete", name: "Xóa sản phẩm", module: "products", description: "Xóa hoặc lưu trữ sản phẩm" },
  { id: 14, key: "categories.manage", name: "Quản lý danh mục", module: "categories", description: "Quản lý danh mục nội thất" },
  { id: 15, key: "inventory.view", name: "Xem tồn kho", module: "inventory", description: "Xem số lượng tồn kho" },
  { id: 16, key: "inventory.manage", name: "Quản lý tồn kho", module: "inventory", description: "Nhập xuất và điều chỉnh tồn kho" },
  { id: 17, key: "orders.view", name: "Xem đơn hàng", module: "orders", description: "Xem đơn hàng" },
  { id: 18, key: "orders.update", name: "Cập nhật đơn hàng", module: "orders", description: "Cập nhật trạng thái đơn hàng" },
  { id: 19, key: "orders.cancel", name: "Hủy đơn hàng", module: "orders", description: "Hủy đơn hàng theo quy trình" },
  { id: 20, key: "payments.view", name: "Xem thanh toán", module: "payments", description: "Xem trạng thái thanh toán" },
  { id: 21, key: "payments.refund", name: "Xử lý hoàn tiền", module: "payments", description: "Thực hiện quy trình hoàn tiền" },
  { id: 22, key: "coupons.manage", name: "Quản lý khuyến mãi", module: "coupons", description: "Quản lý mã khuyến mãi" },
  { id: 23, key: "reviews.moderate", name: "Kiểm duyệt đánh giá", module: "reviews", description: "Duyệt hoặc ẩn đánh giá" },
  { id: 24, key: "policies.manage", name: "Quản lý chính sách", module: "policies", description: "Cập nhật chính sách website" },
  { id: 25, key: "risk_alerts.view", name: "Xem cảnh báo rủi ro", module: "risk", description: "Xem cảnh báo đơn hàng" },
  { id: 26, key: "risk_alerts.resolve", name: "Xử lý cảnh báo rủi ro", module: "risk", description: "Xác minh và giải quyết cảnh báo" },
  { id: 27, key: "email_logs.view", name: "Xem nhật ký email", module: "notifications", description: "Xem lịch sử gửi email" },
  { id: 28, key: "chatbot.use", name: "Sử dụng chatbot quản trị", module: "chatbot", description: "Sử dụng chatbot Admin" },
  { id: 29, key: "audit_logs.view", name: "Xem nhật ký hệ thống", module: "audit", description: "Xem nhật ký thao tác" },

  // ── Phạm vi Quyền API Cốt lõi (Core Backend API Scopes - IDs 30 đến 42) ──
  { id: 30, key: "catalog:read", name: "Xem sản phẩm", module: "catalog", description: "Quyền xem sản phẩm" },
  { id: 31, key: "catalog:create", name: "Tạo sản phẩm", module: "catalog", description: "Quyền thêm sản phẩm" },
  { id: 32, key: "catalog:update", name: "Cập nhật sản phẩm", module: "catalog", description: "Quyền sửa sản phẩm" },
  { id: 33, key: "catalog:delete", name: "Xóa sản phẩm", module: "catalog", description: "Quyền xóa sản phẩm" },
  { id: 34, key: "order:read", name: "Xem đơn hàng", module: "order", description: "Quyền xem đơn hàng" },
  { id: 35, key: "order:update", name: "Cập nhật đơn hàng", module: "order", description: "Quyền xử lý đơn hàng" },
  { id: 36, key: "order:cancel", name: "Hủy đơn hàng", module: "order", description: "Quyền hủy đơn hàng" },
  { id: 37, key: "user:read", name: "Xem người dùng", module: "user", description: "Quyền xem danh sách user" },
  { id: 38, key: "user:manage", name: "Quản trị người dùng & vai trò", module: "user", description: "Quyền phân quyền" },
  { id: 39, key: "policy:write", name: "Cập nhật chính sách", module: "policy", description: "Quyền sửa chính sách" },
  { id: 40, key: "policy:read", name: "Đọc chính sách", module: "policy", description: "Quyền xem chính sách" },
  { id: 41, key: "profile:read", name: "Xem thông tin cá nhân", module: "profile", description: "Quyền xem profile" },
  { id: 42, key: "profile:write", name: "Cập nhật thông tin cá nhân", module: "profile", description: "Quyền sửa profile" },
  { id: 43, key: "notifications.view", name: "Xem thông báo", module: "notifications", description: "Xem danh sách thông báo hệ thống" },
  { id: 44, key: "notifications.create", name: "Gửi thông báo", module: "notifications", description: "Tạo và phát thông báo hệ thống" },
  { id: 45, key: "policies.view", name: "Xem chính sách", module: "policies", description: "Xem các điều khoản chính sách" },
];

// ── Vai trò mẫu ban đầu (khớp 100% với mã quyền DB) ──
export const INITIAL_ROLES: RoleDefinition[] = [
  {
    id: "role-super-admin",
    name: "Super Admin",
    code: "SUPER_ADMIN",
    description: "Toàn quyền quản trị tất cả các chức năng và phân quyền hệ thống",
    permissions: ALL_PERMISSIONS.map((p) => p.key),
    isSystem: true,
  },
  {
    id: "role-warehouse",
    name: "Quản lý Kho",
    code: "WAREHOUSE_MANAGER",
    description: "Quản lý danh mục, sản phẩm, biến thể tồn kho và theo dõi đơn xuất",
    permissions: [
      "dashboard.view",
      "categories.manage",
      "products.view",
      "products.create",
      "products.update",
      "products.delete",
      "inventory.view",
      "inventory.manage",
      "orders.view",
      "orders.update",
      "audit_logs.view",
      "notifications.view",
      "policies.view",
      "catalog:read",
      "catalog:update",
    ],
  },
  {
    id: "role-accountant",
    name: "Kế toán",
    code: "ACCOUNTANT",
    description: "Theo dõi doanh thu, hóa đơn, thanh toán và in chứng từ VAT",
    permissions: [
      "dashboard.view",
      "orders.view",
      "orders.update",
      "payments.view",
      "payments.refund",
      "coupons.manage",
      "audit_logs.view",
      "notifications.view",
      "policies.view",
      "order:read",
      "order:update",
    ],
  },
  {
    id: "role-cskh",
    name: "Chăm sóc khách hàng",
    code: "CSKH",
    description: "Tiếp nhận tư vấn, kiểm tra trạng thái đơn và giải quyết yêu cầu",
    permissions: [
      "dashboard.view",
      "orders.view",
      "orders.update",
      "orders.cancel",
      "customers.view",
      "customers.care",
      "payments.view",
      "coupons.manage",
      "chatbot.use",
      "email_logs.view",
      "audit_logs.view",
      "notifications.view",
      "policies.view",
      "order:read",
    ],
  },
  {
    id: "role-editor",
    name: "Biên tập viên",
    code: "CONTENT_EDITOR",
    description: "Soạn thảo bài viết xu hướng, cảm hứng thiết kế và cập nhật chính sách",
    permissions: [
      "dashboard.view",
      "policies.manage",
      "email_logs.view",
      "reviews.moderate",
      "policy:read",
      "policy:write",
    ],
  },
];

// ── Danh mục phân cấp mẫu (Parent - Child) ──
export const INITIAL_CATEGORIES: AdminCategory[] = [
  {
    id: "cat-living",
    name: "Phòng khách",
    slug: "phong-khach",
    parentId: null,
    order: 1,
    icon: "Sofa",
    isDeleted: false,
    productCount: 14,
  },
  {
    id: "cat-sofa",
    name: "Sofa",
    slug: "sofa",
    parentId: "cat-living",
    order: 1,
    isDeleted: false,
    productCount: 8,
  },
  {
    id: "cat-sofa-bang",
    name: "Sofa băng",
    slug: "sofa-bang",
    parentId: "cat-sofa",
    order: 1,
    isDeleted: false,
    productCount: 4,
  },
  {
    id: "cat-sofa-goc",
    name: "Sofa góc",
    slug: "sofa-goc",
    parentId: "cat-sofa",
    order: 2,
    isDeleted: false,
    productCount: 3,
  },
  {
    id: "cat-armchair",
    name: "Ghế Armchair",
    slug: "ghe-armchair",
    parentId: "cat-living",
    order: 2,
    isDeleted: false,
    productCount: 6,
  },
  {
    id: "cat-dining",
    name: "Phòng ăn",
    slug: "phong-an",
    parentId: null,
    order: 2,
    icon: "Utensils",
    isDeleted: false,
    productCount: 10,
  },
  {
    id: "cat-dining-table",
    name: "Bàn ăn",
    slug: "ban-an",
    parentId: "cat-dining",
    order: 1,
    isDeleted: false,
    productCount: 6,
  },
  {
    id: "cat-dining-chair",
    name: "Ghế ăn",
    slug: "ghe-an",
    parentId: "cat-dining",
    order: 2,
    isDeleted: false,
    productCount: 4,
  },
  {
    id: "cat-bedroom",
    name: "Phòng ngủ",
    slug: "phong-ngu",
    parentId: null,
    order: 3,
    icon: "Bed",
    isDeleted: false,
    productCount: 8,
  },
  {
    id: "cat-bed",
    name: "Giường ngủ",
    slug: "giuong-ngu",
    parentId: "cat-bedroom",
    order: 1,
    isDeleted: false,
    productCount: 5,
  },
  {
    id: "cat-wardrobe",
    name: "Tủ quần áo",
    slug: "tu-quan-ao",
    parentId: "cat-bedroom",
    order: 2,
    isDeleted: false,
    productCount: 3,
  },
  {
    id: "cat-collections",
    name: "Bộ sưu tập",
    slug: "bo-suu-tap",
    parentId: null,
    order: 4,
    icon: "Sparkles",
    description: "Các bộ sưu tập nội thất thiết kế độc quyền của Nhà Xinh theo phong cách sống đương đại.",
    imageUrl: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=80",
    isCollection: true,
    isDeleted: false,
    productCount: 16,
  },
  {
    id: "cat-col-victoria",
    name: "Bộ sưu tập Victoria",
    slug: "victoria",
    parentId: "cat-collections",
    order: 1,
    description: "Lấy cảm hứng từ vẻ đẹp thanh lịch châu Âu kết hợp chất liệu da bò Ý và gỗ tần bì ấm áp.",
    imageUrl: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80",
    isCollection: true,
    isDeleted: false,
    productCount: 5,
  },
  {
    id: "cat-col-duong-dai",
    name: "Bộ sưu tập Nét Đương Đại",
    slug: "duong-dai",
    parentId: "cat-collections",
    order: 2,
    description: "Ngôn ngữ thiết kế tối giản, đường nét tinh gọn tôn vinh không gian căn hộ hiện đại.",
    imageUrl: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80",
    isCollection: true,
    isDeleted: false,
    productCount: 4,
  },
  {
    id: "cat-col-osaka",
    name: "Bộ sưu tập Osaka (Japandi)",
    slug: "osaka",
    parentId: "cat-collections",
    order: 3,
    description: "Sự giao thoa tinh tế giữa triết lý Wabi-Sabi Nhật Bản và sự ấm cúng Bắc Âu (Scandinavian).",
    imageUrl: "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80",
    isCollection: true,
    isDeleted: false,
    productCount: 4,
  },
  {
    id: "cat-col-coastal",
    name: "Bộ sưu tập Coastal Living",
    slug: "coastal",
    parentId: "cat-collections",
    order: 4,
    description: "Hơi thở miền nhiệt đới phóng khoáng với sắc kem cát biển, vải Linen tự nhiên và gỗ sồi sáng màu.",
    imageUrl: "https://images.unsplash.com/photo-1540518614846-7ede433c4578?auto=format&fit=crop&w=800&q=80",
    isCollection: true,
    isDeleted: false,
    productCount: 3,
  },
];

// ── Sản phẩm mẫu kèm biến thể (Variants) ──
export const INITIAL_PRODUCTS: AdminProduct[] = [
  {
    id: 1,
    name: "Sofa Victoria 3 chỗ da bò Ý cao cấp",
    slug: "sofa-victoria-3-cho-da-bo-y",
    categoryId: "cat-sofa-bang",
    category: "Sofa băng",
    brand: "Nhà Xinh",
    price: 45900000,
    originalPrice: 52000000,
    stock: 14,
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80",
    image2: "https://images.unsplash.com/photo-1550254478-ead40cc54513?auto=format&fit=crop&w=600&q=80",
    status: "active",
    isDeleted: false,
    createdAt: "20/10/2024",
    variants: [
      {
        id: "var-1-1",
        sku: "NX-SOF-VIC-GREY",
        color: "Xám khói",
        size: "Dài 2.4m x Rộng 0.95m",
        material: "Vải nỉ Bỉ chống bám bẩn",
        price: 45900000,
        stock: 8,
        image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=400&q=80",
      },
      {
        id: "var-1-2",
        sku: "NX-SOF-VIC-COGNAC",
        color: "Nâu Cognac",
        size: "Dài 2.4m x Rộng 0.95m",
        material: "Da bò thượng hạng Ý",
        price: 58000000,
        stock: 6,
        image: "https://images.unsplash.com/photo-1550254478-ead40cc54513?auto=format&fit=crop&w=400&q=80",
      },
    ],
  },
  {
    id: 2,
    name: "Bàn ăn gỗ sồi tự nhiên Nordic 6 - 8 ghế",
    slug: "ban-an-go-soi-tu-nhien-nordic",
    categoryId: "cat-dining-table",
    category: "Bàn ăn",
    brand: "Nhà Xinh",
    price: 32500000,
    stock: 9,
    image: "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=600&q=80",
    status: "active",
    isDeleted: false,
    createdAt: "18/10/2024",
    variants: [
      {
        id: "var-2-1",
        sku: "NX-TAB-NOR-180",
        color: "Gỗ sồi sáng",
        size: "180 x 90 x 75 cm (6 ghế)",
        material: "Gỗ sồi tự nhiên nguyên tấm",
        price: 32500000,
        stock: 5,
        image: "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=400&q=80",
      },
      {
        id: "var-2-2",
        sku: "NX-TAB-NOR-220",
        color: "Gỗ sồi lau dầu óc chó",
        size: "220 x 100 x 75 cm (8 ghế)",
        material: "Gỗ sồi tự nhiên nguyên tấm",
        price: 39500000,
        stock: 4,
        image: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=400&q=80",
      },
    ],
  },
  {
    id: 3,
    name: "Armchair Nordic thư giãn đệm lông vũ",
    slug: "armchair-nordic-thu-gian-dem-long-vu",
    categoryId: "cat-armchair",
    category: "Ghế Armchair",
    brand: "Nhà Xinh",
    price: 15800000,
    originalPrice: 18500000,
    stock: 5, // Cảnh báo sắp hết
    image: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=600&q=80",
    status: "active",
    isDeleted: false,
    createdAt: "15/10/2024",
    variants: [
      {
        id: "var-3-1",
        sku: "NX-ARM-NOR-BEIGE",
        color: "Be sáng",
        size: "85 x 85 x 90 cm",
        material: "Vải Linen Pháp",
        price: 15800000,
        stock: 3,
      },
      {
        id: "var-3-2",
        sku: "NX-ARM-NOR-EMERALD",
        color: "Xanh ngọc lục bảo",
        size: "85 x 85 x 90 cm",
        material: "Vải nhung tuyết",
        price: 16500000,
        stock: 2,
      },
    ],
  },
  {
    id: 4,
    name: "Giường ngủ bọc da Grand Milano",
    slug: "giuong-ngu-boc-da-grand-milano",
    categoryId: "cat-bed",
    category: "Giường ngủ",
    brand: "Nhà Xinh",
    price: 38000000,
    stock: 7,
    image: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=600&q=80",
    status: "active",
    isDeleted: false,
    createdAt: "10/10/2024",
    variants: [
      {
        id: "var-4-1",
        sku: "NX-BED-MIL-180",
        color: "Trắng kem",
        size: "1.8m x 2.0m (King size)",
        material: "Khung gỗ sồi bọc da Microfiber",
        price: 38000000,
        stock: 4,
      },
      {
        id: "var-4-2",
        sku: "NX-BED-MIL-200",
        color: "Xám than",
        size: "2.0m x 2.2m (Super King)",
        material: "Khung gỗ sồi bọc da Microfiber",
        price: 43000000,
        stock: 3,
      },
    ],
  },
];

// ── Đơn hàng mẫu kèm Cart snapshot & Status History ──
// export const INITIAL_ORDERS: AdminOrder[] = [
//   {
//     id: "ord-1",
//     orderCode: "NX-89421",
//     customerName: "Nguyễn Văn Tuấn",
//     phone: "0903 123 456",
//     email: "tuan.nguyen@gmail.com",
//     address: "Số 12 Mai Chí Thọ, Phường An Phú, TP. Thủ Đức, TP.HCM",
//     total: 45900000,
//     paymentMethod: "vnpay",
//     status: "processing",
//     createdAt: "27/10/2024 08:15",
//     note: "Giao vào thứ 7, có thang máy lầu 8",
//     items: [
//       {
//         productId: 1,
//         name: "Sofa Victoria 3 chỗ da bò Ý cao cấp",
//         variantSku: "NX-SOF-VIC-GREY",
//         variantDetails: "Màu: Xám khói | Dài 2.4m",
//         image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=400&q=80",
//         price: 45900000,
//         quantity: 1,
//       },
//     ],
//     statusHistory: [
//       {
//         id: "hist-1-1",
//         status: "pending",
//         timestamp: "27/10/2024 08:15",
//         updatedBy: "Hệ thống Web",
//         note: "Khách hàng đặt hàng trực tuyến qua cổng VNPAY",
//       },
//       {
//         id: "hist-1-2",
//         status: "processing",
//         timestamp: "27/10/2024 08:35",
//         updatedBy: "Trần Minh Quân (Admin)",
//         note: "Đã xác nhận giao dịch VNPAY thành công, chuyển lệnh cho kho đóng gói",
//       },
//     ],
//   },
//   {
//     id: "ord-2",
//     orderCode: "NX-78219",
//     customerName: "Trần Thị Minh Nguyệt",
//     phone: "0912 889 900",
//     email: "nguyet.tran@outlook.com",
//     address: "65 Lê Duẩn, Phường Bến Nghé, Quận 1, TP.HCM",
//     total: 32500000,
//     paymentMethod: "vietqr",
//     status: "shipping",
//     createdAt: "26/10/2024 16:30",
//     items: [
//       {
//         productId: 2,
//         name: "Bàn ăn gỗ sồi tự nhiên Nordic 6 - 8 ghế",
//         variantSku: "NX-TAB-NOR-180",
//         variantDetails: "Kích thước: 180 x 90 cm (6 ghế)",
//         image: "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=400&q=80",
//         price: 32500000,
//         quantity: 1,
//       },
//     ],
//     statusHistory: [
//       {
//         id: "hist-2-1",
//         status: "pending",
//         timestamp: "26/10/2024 16:30",
//         updatedBy: "Hệ thống Web",
//         note: "Đơn đặt chuyển khoản VietQR",
//       },
//       {
//         id: "hist-2-2",
//         status: "processing",
//         timestamp: "26/10/2024 16:45",
//         updatedBy: "Võ Thùy Linh (Kế toán)",
//         note: "Đã khớp lệnh biến động số dư VietQR",
//       },
//       {
//         id: "hist-2-3",
//         status: "shipping",
//         timestamp: "27/10/2024 08:00",
//         updatedBy: "Hoàng Anh Đức (Kho)",
//         note: "Bàn giao cho xe tải kỹ thuật số 5 tiến hành giao & lắp ráp",
//       },
//     ],
//   },
//   {
//     id: "ord-3",
//     orderCode: "NX-65432",
//     customerName: "Lê Hoàng Phúc",
//     phone: "0988 555 444",
//     email: "phuc.le@gmail.com",
//     address: "Tòa Park 6, KĐT Times City, Hai Bà Trưng, Hà Nội",
//     total: 15800000,
//     paymentMethod: "cod",
//     status: "pending",
//     createdAt: "27/10/2024 07:45",
//     note: "Khách gọi trước khi đến 30 phút",
//     items: [
//       {
//         productId: 3,
//         name: "Armchair Nordic thư giãn đệm lông vũ",
//         variantSku: "NX-ARM-NOR-BEIGE",
//         variantDetails: "Màu: Be sáng | Vải Linen",
//         image: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=400&q=80",
//         price: 15800000,
//         quantity: 1,
//       },
//     ],
//     statusHistory: [
//       {
//         id: "hist-3-1",
//         status: "pending",
//         timestamp: "27/10/2024 07:45",
//         updatedBy: "Hệ thống Web",
//         note: "Đơn hàng COD chờ tổng đài gọi điện xác nhận",
//       },
//     ],
//   },
// ];

// ── Nhân sự mẫu ──
// export const INITIAL_STAFF: AdminStaff[] = [
//   {
//     id: "staff-1",
//     name: "Trần Minh Quân",
//     email: "admin@nhaxinh.com",
//     roleCode: "SUPER_ADMIN",
//     roleName: "Super Admin",
//     status: "active",
//     lastLogin: "Hôm nay, 08:30",
//   },
//   {
//     id: "staff-2",
//     name: "Hoàng Anh Đức",
//     email: "duc.hoang@nhaxinh.com",
//     roleCode: "WAREHOUSE_MANAGER",
//     roleName: "Quản lý Kho",
//     status: "active",
//     lastLogin: "25/10/2024 16:40",
//   },
//   {
//     id: "staff-3",
//     name: "Võ Thùy Linh",
//     email: "linh.vo@nhaxinh.com",
//     roleCode: "ACCOUNTANT",
//     roleName: "Kế toán",
//     status: "active",
//     lastLogin: "Hôm qua, 17:15",
//   },
//   {
//     id: "staff-4",
//     name: "Đặng Mai Chi",
//     email: "chi.dang@nhaxinh.com",
//     roleCode: "CSKH",
//     roleName: "Chăm sóc khách hàng",
//     status: "active",
//     lastLogin: "Hôm nay, 08:05",
//   },
//   {
//     id: "staff-5",
//     name: "KTS. Lê Quang Huy",
//     email: "huy.le@nhaxinh.com",
//     roleCode: "CONTENT_EDITOR",
//     roleName: "Biên tập viên",
//     status: "active",
//     lastLogin: "24/10/2024",
//   },
// ];

// ── SERVICE LAYER CLASS (Tách riêng để sau này cắm API backend dễ dàng) ──
class AdminApiService {
  private getStorage<T>(key: string, fallback: T): T {
    try {
      const data = localStorage.getItem(`nhaxinh_admin_${key}`);
      return data ? JSON.parse(data) : fallback;
    } catch {
      return fallback;
    }
  }

  private setStorage<T>(key: string, val: T): void {
    try {
      localStorage.setItem(`nhaxinh_admin_${key}`, JSON.stringify(val));
    } catch (e) {
      console.warn("localStorage quota exceeded or unavailable", e);
    }
  }

  // 1. Roles & Permissions
  async getRoles(): Promise<RoleDefinition[]> {
    try {
      const list = await rbacApi.getRoles();
      if (list && list.length > 0) {
        this.setStorage("roles", list);
        return list;
      }
    } catch (e) {
      console.warn("Lấy vai trò từ API thất bại, dùng dữ liệu dự phòng:", e);
    }
    return this.getStorage<RoleDefinition[]>("roles", INITIAL_ROLES);
  }

  async saveRole(role: Partial<RoleDefinition>, actor?: AdminAuditLog["actor"]): Promise<void> {
    const currentList = await this.getRoles();
    const code = (role.code || "CUSTOM_ROLE").trim().toUpperCase();
    const name = (role.name || code).trim();
    const description = (role.description || "").trim();
    const permissions = (role.permissions || []) as PermissionKey[];

    let createdRole: RoleDefinition | null = null;
    try {
      createdRole = await rbacApi.createRole({
        code,
        name,
        description,
        permissions,
      });
    } catch (e) {
      console.warn("Tạo vai trò qua API thất bại, lưu cục bộ:", e);
      createdRole = {
        id: role.id || `role-${Date.now()}`,
        code,
        name,
        description,
        permissions,
        isSystem: false,
      };
    }

    const updatedList = [
      ...currentList.filter((r) => r.code !== createdRole!.code && r.id !== createdRole!.id),
      createdRole,
    ];
    this.setStorage("roles", updatedList);

    await this.logActivity({
      actor: actor || { name: "Quản trị viên", role: "Quản trị hệ thống" },
      action: role.id ? "ROLE_UPDATED" : "ROLE_CREATED",
      module: "Phân quyền",
      target: `Vai trò ${name} [${code}]`,
      description: `Khởi tạo vai trò nghiệp vụ mới [${code}] - ${name} với ${permissions.length} quyền truy cập.`,
      metadata: {
        roleId: createdRole.id,
        code,
        name,
        description,
        permissionsCount: permissions.length,
        permissions,
      },
      severity: "success",
    });
  }

  async updateRole(roleId: string, data: { name: string; description: string }, actor?: AdminAuditLog["actor"]): Promise<void> {
    const currentList = await this.getRoles();
    const existing = currentList.find((r) => r.id === roleId);
    const previousName = existing?.name || "";
    const previousDescription = existing?.description || "";

    try {
      await rbacApi.updateRole(roleId, data);
    } catch (e) {
      console.warn("Cập nhật vai trò qua API thất bại, lưu cục bộ:", e);
    }

    const updatedList = currentList.map((r) =>
      r.id === roleId ? { ...r, name: data.name, description: data.description } : r
    );
    this.setStorage("roles", updatedList);

    await this.logActivity({
      actor: actor || { name: "Quản trị viên", role: "Quản trị hệ thống" },
      action: "ROLE_UPDATED",
      module: "Phân quyền",
      target: `Vai trò ${data.name} [${existing?.code || roleId}]`,
      description: `Cập nhật thông tin vai trò [${existing?.code || roleId}]: "${previousName}" → "${data.name}".`,
      metadata: {
        roleId,
        code: existing?.code,
        previousName,
        newName: data.name,
        previousDescription,
        newDescription: data.description,
      },
      severity: "warning",
    });
  }

  async updateRolePermissions(roleId: string, permissions: PermissionKey[], actor?: AdminAuditLog["actor"]): Promise<void> {
    const currentList = await this.getRoles();
    const existing = currentList.find((r) => r.id === roleId);
    const previousPermissions = existing?.permissions || [];
    const addedPermissions = permissions.filter((p) => !previousPermissions.includes(p));
    const removedPermissions = previousPermissions.filter((p) => !permissions.includes(p));

    try {
      await rbacApi.updateRolePermissions(roleId, permissions);
    } catch (e) {
      console.warn("Cập nhật quyền vai trò qua API thất bại, lưu cục bộ:", e);
    }

    const updatedList = currentList.map((r) =>
      r.id === roleId ? { ...r, permissions } : r
    );
    this.setStorage("roles", updatedList);

    await this.logActivity({
      actor: actor || { name: "Quản trị viên", role: "Quản trị hệ thống" },
      action: "PERMISSION_GRANTED",
      module: "Phân quyền",
      target: `Vai trò ${existing?.name || roleId} [${existing?.code || roleId}]`,
      description: `Cập nhật ma trận phân quyền cho vai trò [${existing?.code || roleId}] (Tổng: ${permissions.length} quyền; Cấp thêm: +${addedPermissions.length}, Thu hồi: -${removedPermissions.length}).`,
      metadata: {
        roleId,
        code: existing?.code,
        roleName: existing?.name,
        previousCount: previousPermissions.length,
        newCount: permissions.length,
        addedPermissions,
        removedPermissions,
        permissions,
      },
      severity: "warning",
    });
  }

  async deleteRole(roleId: string, actor?: AdminAuditLog["actor"]): Promise<void> {
    const currentList = await this.getRoles();
    const existing = currentList.find((r) => r.id === roleId);

    try {
      await rbacApi.deleteRole(roleId);
    } catch (e) {
      console.warn("Xóa vai trò qua API thất bại, xóa cục bộ:", e);
    }

    const updatedList = currentList.filter((r) => r.id !== roleId);
    this.setStorage("roles", updatedList);

    await this.logActivity({
      actor: actor || { name: "Quản trị viên", role: "Quản trị hệ thống" },
      action: "ROLE_DELETED",
      module: "Phân quyền",
      target: `Vai trò ${existing?.name || roleId} [${existing?.code || roleId}]`,
      description: `Xóa vai trò tùy chỉnh [${existing?.code || roleId}] - ${existing?.name || ""}.`,
      metadata: {
        roleId,
        code: existing?.code,
        name: existing?.name,
        permissionsCount: existing?.permissions.length || 0,
      },
      severity: "danger",
    });
  }

  // ── 1.1 DANH MỤC QUYỀN HẠN (PERMISSIONS - UC-RBAC-05 ĐẾN UC-RBAC-08) ──
  async getPermissions(module?: string): Promise<AdminPermissionItem[]> {
    try {
      const apiPerms = await rbacApi.getPermissions(module);
      if (apiPerms && apiPerms.length > 0) {
        const mapped: AdminPermissionItem[] = apiPerms.map((p) => ({
          id: String(p.id),
          code: p.code,
          name: p.name,
          module: p.module,
          description: p.description,
          status: "active",
          roleCount: p.roles ? p.roles.length : 0,
          roles: p.roles || [],
        }));
        this.setStorage("permissions_catalog", mapped);
        return mapped;
      }
    } catch (e) {
      console.warn("Lấy danh mục quyền từ API thất bại, dùng dữ liệu dự phòng:", e);
    }
    const defaultPerms: AdminPermissionItem[] = ALL_PERMISSIONS.map((p) => ({
      id: String(p.id),
      code: p.key,
      name: p.name,
      module: p.module,
      description: p.description,
      status: "active",
      roleCount: 0,
      roles: [],
    }));
    const stored = this.getStorage<AdminPermissionItem[]>("permissions_catalog", defaultPerms);
    return module && module !== "all" ? stored.filter((p) => p.module === module) : stored;
  }

  async savePermission(
    perm: { code: string; name: string; module: string; description: string },
    actor?: AdminAuditLog["actor"]
  ): Promise<AdminPermissionItem> {
    const code = perm.code.trim();
    const name = perm.name.trim();
    const module = perm.module.trim();
    const description = perm.description.trim();
    let created: AdminPermissionItem;

    try {
      const res = await rbacApi.createPermission({ code, name, module, description });
      created = {
        id: String(res.id),
        code: res.code,
        name: res.name,
        module: res.module,
        description: res.description,
        status: "active",
        roleCount: 0,
        roles: [],
      };
    } catch (e) {
      console.warn("Tạo quyền qua API thất bại, lưu cục bộ:", e);
      created = {
        id: `perm-${Date.now()}`,
        code,
        name,
        module,
        description,
        status: "active",
        roleCount: 0,
        roles: [],
      };
    }

    const currentList = await this.getPermissions();
    const nextList = [created, ...currentList.filter((p) => p.code !== code)];
    this.setStorage("permissions_catalog", nextList);

    await this.logActivity({
      actor: actor || { name: "Quản trị viên", role: "Quản trị hệ thống" },
      action: "PERMISSION_CREATE",
      module: "Phân quyền",
      target: `Mã quyền [${code}]`,
      description: `Khai báo mã quyền hạn mới [${code}] - "${name}" thuộc phân hệ "${module}".`,
      metadata: {
        code,
        name,
        module,
        description,
      },
      severity: "success",
    });

    return created;
  }

  async updatePermission(
    id: string | number,
    data: { name: string; module: string; description: string },
    actor?: AdminAuditLog["actor"]
  ): Promise<void> {
    const currentList = await this.getPermissions();
    const existing = currentList.find((p) => String(p.id) === String(id));

    try {
      await rbacApi.updatePermission(id, data);
    } catch (e) {
      console.warn("Cập nhật quyền qua API thất bại, lưu cục bộ:", e);
    }

    const nextList = currentList.map((p) =>
      String(p.id) === String(id)
        ? { ...p, name: data.name, module: data.module, description: data.description }
        : p
    );
    this.setStorage("permissions_catalog", nextList);

    await this.logActivity({
      actor: actor || { name: "Quản trị viên", role: "Quản trị hệ thống" },
      action: "PERMISSION_UPDATE",
      module: "Phân quyền",
      target: `Mã quyền [${existing?.code || id}]`,
      description: `Cập nhật thông tin quyền hạn [${existing?.code || id}]: "${existing?.name}" → "${data.name}".`,
      metadata: {
        id,
        code: existing?.code,
        previousName: existing?.name,
        newName: data.name,
        module: data.module,
        description: data.description,
      },
      severity: "warning",
    });
  }

  async deletePermission(
    id: string | number,
    force: boolean = true,
    actor?: AdminAuditLog["actor"]
  ): Promise<void> {
    const currentList = await this.getPermissions();
    const existing = currentList.find((p) => String(p.id) === String(id));

    try {
      await rbacApi.deletePermission(id, force);
    } catch (e) {
      console.warn("Xóa quyền qua API thất bại, xóa cục bộ:", e);
    }

    const nextList = currentList.filter((p) => String(p.id) !== String(id));
    this.setStorage("permissions_catalog", nextList);

    if (existing?.code) {
      const roles = await this.getRoles();
      const updatedRoles = roles.map((r) => ({
        ...r,
        permissions: r.permissions.filter((k) => k !== existing.code),
      }));
      this.setStorage("roles", updatedRoles);
    }

    await this.logActivity({
      actor: actor || { name: "Quản trị viên", role: "Quản trị hệ thống" },
      action: "PERMISSION_DELETE",
      module: "Phân quyền",
      target: `Mã quyền [${existing?.code || id}]`,
      description: `Xóa mã quyền hạn [${existing?.code || id}] - "${existing?.name || ""}" khỏi hệ thống (force=${force}).`,
      metadata: {
        id,
        code: existing?.code,
        name: existing?.name,
        module: existing?.module,
      },
      severity: "danger",
    });
  }

  // 2. Categories & Collections (CRUD, Hierarchy Parent/Child, Soft Delete)
  async getCategories(includeDeleted = false): Promise<AdminCategory[]> {
    try {
      const apiCategories = await catalogApi.getCategories(includeDeleted);
      if (apiCategories && apiCategories.length > 0) {
        this.setStorage("categories", apiCategories);
        return apiCategories;
      }
    } catch (e) {
      console.warn("Lấy danh mục từ API thất bại, dùng dữ liệu dự phòng:", e);
    }
    const stored = this.getStorage<AdminCategory[]>("categories", INITIAL_CATEGORIES);
    return includeDeleted ? stored : stored.filter((c) => !c.isDeleted);
  }

  async saveCategory(cat: Partial<AdminCategory>, actor?: AdminAuditLog["actor"]): Promise<AdminCategory> {
    let saved: AdminCategory;
    try {
      saved = await catalogApi.saveCategory(cat);
    } catch (e) {
      console.warn("Lưu danh mục qua API thất bại, lưu cục bộ:", e);
      const list = this.getStorage<AdminCategory[]>("categories", INITIAL_CATEGORIES);
      if (cat.id) {
        const idx = list.findIndex((c) => c.id === cat.id);
        saved = {
          ...(idx >= 0 ? list[idx] : { id: cat.id, name: "", slug: "", parentId: null, order: 1, isDeleted: false, productCount: 0 }),
          ...cat,
        } as AdminCategory;
        if (idx >= 0) list[idx] = saved;
        else list.push(saved);
      } else {
        saved = {
          id: `cat-${Date.now()}`,
          name: cat.name || "Danh mục mới",
          slug: cat.slug || generateSlug(cat.name || "danh-muc"),
          parentId: cat.parentId ?? null,
          order: cat.order ?? list.length + 1,
          description: cat.description,
          imageUrl: cat.imageUrl,
          isCollection: cat.isCollection,
          isDeleted: false,
          productCount: 0,
        };
        list.push(saved);
      }
      this.setStorage("categories", list);
    }

    const isCollection = Boolean(
      cat.isCollection ||
        saved.isCollection ||
        saved.slug.includes("bo-suu-tap") ||
        cat.parentId === "cat-collections"
    );

    await this.logActivity({
      actor: actor || { name: "Quản trị viên", role: "Quản trị hệ thống" },
      action: cat.id
        ? isCollection
          ? "COLLECTION_UPDATED"
          : "CATEGORY_UPDATED"
        : isCollection
          ? "COLLECTION_CREATED"
          : "CATEGORY_CREATED",
      module: isCollection ? "Bộ sưu tập" : "Danh mục",
      target: `${isCollection ? "Bộ sưu tập" : "Danh mục"}: ${saved.name} (/${saved.slug})`,
      description: cat.id
        ? `Cập nhật thông tin ${isCollection ? "bộ sưu tập" : "danh mục"} "${saved.name}" (/${saved.slug}).`
        : `Tạo mới ${isCollection ? "bộ sưu tập" : "danh mục"} "${saved.name}" (/${saved.slug}).`,
      metadata: { category: saved, isCollection },
      severity: cat.id ? "info" : "success",
    });
    return saved;
  }

  async softDeleteCategory(id: string, actor?: AdminAuditLog["actor"]): Promise<void> {
    const allCats = await this.getCategories(true);
    const category = allCats.find((item) => item.id === id);
    try {
      await catalogApi.setCategoryActive(id, false);
    } catch (e) {
      console.warn("Ẩn danh mục qua API thất bại, cập nhật cục bộ:", e);
      const updated = allCats.map((c) => (c.id === id ? { ...c, isDeleted: true } : c));
      this.setStorage("categories", updated);
    }
    if (category) {
      const isCollection = Boolean(
        category.isCollection ||
          category.slug.includes("bo-suu-tap") ||
          category.parentId === "cat-collections"
      );
      await this.logActivity({
        actor: actor || { name: "Quản trị viên", role: "Quản trị hệ thống" },
        action: isCollection ? "COLLECTION_DELETED" : "CATEGORY_DELETED",
        module: isCollection ? "Bộ sưu tập" : "Danh mục",
        target: `${isCollection ? "Bộ sưu tập" : "Danh mục"}: ${category.name}`,
        description: `Đưa ${isCollection ? "bộ sưu tập" : "danh mục"} "${category.name}" vào thùng rác.`,
        metadata: { categoryId: id, categoryName: category.name, isCollection },
        severity: "danger",
      });
    }
  }

  async restoreCategory(id: string, actor?: AdminAuditLog["actor"]): Promise<void> {
    const allCats = await this.getCategories(true);
    const category = allCats.find((item) => item.id === id);
    try {
      await catalogApi.setCategoryActive(id, true);
    } catch (e) {
      console.warn("Khôi phục danh mục qua API thất bại, cập nhật cục bộ:", e);
      const updated = allCats.map((c) => (c.id === id ? { ...c, isDeleted: false } : c));
      this.setStorage("categories", updated);
    }
    if (category) {
      const isCollection = Boolean(
        category.isCollection ||
          category.slug.includes("bo-suu-tap") ||
          category.parentId === "cat-collections"
      );
      await this.logActivity({
        actor: actor || { name: "Quản trị viên", role: "Quản trị hệ thống" },
        action: "CATEGORY_RESTORED",
        module: isCollection ? "Bộ sưu tập" : "Danh mục",
        target: `${isCollection ? "Bộ sưu tập" : "Danh mục"}: ${category.name}`,
        description: `Khôi phục ${isCollection ? "bộ sưu tập" : "danh mục"} "${category.name}" từ thùng rác.`,
        metadata: { categoryId: id, categoryName: category.name, restored: true, isCollection },
        severity: "success",
      });
    }
  }

  // 3. Products & Variants (CRUD, Auto-slug, Soft Delete)
  async getProducts(includeDeleted = false): Promise<AdminProduct[]> {
    return catalogApi.getProducts(includeDeleted);
  }

  async saveProduct(prod: AdminProductInput, actor?: AdminAuditLog["actor"]): Promise<AdminProduct> {
    const saved = await catalogApi.saveProduct(prod);
    await this.logActivity({
      actor: actor || { name: "Quản trị viên", role: "Quản trị hệ thống" },
      action: prod.id ? "PRODUCT_UPDATED" : "PRODUCT_CREATED",
      module: "Sản phẩm",
      target: saved.name,
      description: prod.id ? "Cập nhật thông tin, giá hoặc biến thể sản phẩm." : "Tạo sản phẩm mới.",
      metadata: { productId: saved.id, productName: saved.name, category: saved.category, price: saved.price, variants: saved.variants },
      severity: prod.id ? "info" : "success",
    });
    return saved;
  }

  async softDeleteProduct(id: number, actor?: AdminAuditLog["actor"]): Promise<void> {
    const product = (await this.getProducts(true)).find((item) => item.id === id);
    await catalogApi.setProductStatus(id, "ARCHIVED");
    if (product) await this.logActivity({
      actor: actor || { name: "Quản trị viên", role: "Quản trị hệ thống" },
      action: "PRODUCT_DELETED",
      module: "Sản phẩm",
      target: product.name,
      description: "Đưa sản phẩm vào thùng rác.",
      metadata: { productId: id, productName: product.name },
      severity: "danger",
    });
  }

  async restoreProduct(id: number, actor?: AdminAuditLog["actor"]): Promise<void> {
    const product = (await this.getProducts(true)).find((item) => item.id === id);
    await catalogApi.setProductStatus(id, product?.status === "draft" ? "DRAFT" : "ACTIVE");
    if (product) await this.logActivity({
      actor: actor || { name: "Quản trị viên", role: "Quản trị hệ thống" },
      action: "PRODUCT_UPDATED",
      module: "Sản phẩm",
      target: product.name,
      description: "Khôi phục sản phẩm từ thùng rác.",
      metadata: { productId: id, productName: product.name, restored: true },
      severity: "info",
    });
  }

  async restockProduct(id: number, amount: number, actor?: AdminAuditLog["actor"]): Promise<void> {
    const list = await this.getProducts(true);
    const product = list.find((item) => item.id === id);
    const oldStock = product?.stock;
    const updated = list.map((p) =>
      p.id === id ? { ...p, stock: p.stock + amount, status: "active" as const } : p
    );
    this.setStorage("products", updated);
    if (product) await this.logActivity({
      actor: actor || { name: "Quản trị viên", role: "Quản trị hệ thống" },
      action: "PRODUCT_RESTOCKED",
      module: "Sản phẩm",
      target: product.name,
      description: `Điều chỉnh tồn kho ${amount > 0 ? "tăng" : "giảm"} ${Math.abs(amount)} sản phẩm.`,
      metadata: { productId: id, productName: product.name, oldStock, newStock: (oldStock || 0) + amount, quantityChanged: amount },
      severity: amount >= 0 ? "success" : "warning",
    });
  }

  // 4. Orders (Cart snapshot, Status update, Status History tracking)
  async getOrders(): Promise<AdminOrder[]> {
    try {
      // Dọn dẹp key mock 'nhaxinh_admin_orders' cũ trong localStorage (nếu có)
      try {
        localStorage.removeItem("nhaxinh_admin_orders");
      } catch {
        // ignore
      }
      return await orderApi.getOrders({ size: 100 });
    } catch (e) {
      console.error("Lấy danh sách đơn hàng từ API thất bại:", e);
      return [];
    }
  }

  async getOrderDetail(id: string | number): Promise<AdminOrder> {
    return await orderApi.getOrderDetail(id);
  }

  async createOrder(
    order: Omit<AdminOrder, "id" | "statusHistory">,
    actor: AdminAuditLog["actor"],
  ): Promise<AdminOrder> {
    const orders = await this.getOrders();
    const now = new Date();
    const createdAt = now.toLocaleString("vi-VN");
    const created: AdminOrder = {
      ...order,
      id: `ord-${Date.now()}`,
      createdAt: order.createdAt || createdAt,
      status: "pending",
      paymentStatus: "pending",
      statusHistory: [{
        id: `hist-${Date.now()}`,
        status: "pending",
        timestamp: createdAt,
        updatedBy: actor.name,
        note: "Khách hàng tạo đơn hàng trên website.",
      }],
    };
    orders.unshift(created);
    // this.setStorage("orders", orders); // Đã comment: không lưu dữ liệu test vào session/localStorage, quản lý qua API Backend
    await this.logActivity({
      actor,
      action: "ORDER_CREATED",
      module: "Đơn hàng",
      target: `Đơn hàng #${created.orderCode}`,
      description: `${actor.name} đặt ${created.items.length} dòng sản phẩm, tổng trị giá ${created.total.toLocaleString("vi-VN")}₫.`,
      metadata: {
        orderId: created.id,
        orderCode: created.orderCode,
        total: created.total,
        paymentMethod: created.paymentMethod,
        paymentStatus: created.paymentStatus,
        items: created.items.map(({ productId, name, variantSku, variantDetails, price, quantity }) => ({
          productId, name, variantSku, variantDetails, price, quantity,
        })),
      },
      severity: "success",
    });
    if (created.paymentMethod !== "cod") {
      await this.logActivity({
        actor: { ...actor, role: "Khách hàng" },
        action: "PAYMENT_INITIATED",
        module: "Thanh toán",
        target: `Thanh toán đơn #${created.orderCode}`,
        description: `Khách hàng khởi tạo thanh toán ${created.total.toLocaleString("vi-VN")}₫ qua ${created.paymentMethod}; đang chờ cổng thanh toán xác nhận.`,
        metadata: { orderId: created.id, orderCode: created.orderCode, amount: created.total, paymentMethod: created.paymentMethod, status: "pending" },
        severity: "info",
      });
    }
    return created;
  }

  async updateOrderStatus(
    orderId: string,
    newStatus: AdminOrder["status"],
    updatedBy = "Quản trị viên",
    note?: string,
    actor?: AdminAuditLog["actor"],
  ): Promise<AdminOrder> {
    // 1. Gọi trực tiếp API Backend cập nhật trạng thái đơn hàng
    const updated = await orderApi.updateStatus(orderId, newStatus, note);

    // 2. Ghi nhật ký hoạt động quản trị (Audit Log)
    await this.logActivity({
      actor: actor || { name: updatedBy, role: "Nhân viên quản trị" },
      action: "ORDER_STATUS_CHANGED",
      module: "Đơn hàng",
      target: `Đơn hàng #${updated.orderCode}`,
      description: `Đổi trạng thái sang ${newStatus}${note ? `: ${note}` : ""}.`,
      metadata: { orderId, orderCode: updated.orderCode, newStatus, note },
      severity: newStatus === "cancelled" ? "warning" : "info",
    });

    // this.setStorage("orders", orders); // Đã comment: không lưu dữ liệu test vào session/localStorage
    return updated;
  }

  async confirmOrderPayment(
    orderId: string,
    actor: AdminAuditLog["actor"],
    paymentStatus = "paid",
    paymentMethod?: string,
    note?: string
  ): Promise<AdminOrder> {
    // 1. Gọi trực tiếp API Backend cập nhật trạng thái thanh toán
    const updated = await orderApi.updatePaymentStatus(orderId, paymentStatus, paymentMethod, note);

    // 2. Ghi nhật ký hoạt động quản trị (Audit Log)
    await this.logActivity({
      actor,
      action: "PAYMENT_CONFIRMED",
      module: "Thanh toán",
      target: `Thanh toán đơn #${updated.orderCode}`,
      description: `Nhân viên cập nhật thanh toán đơn hàng (Trạng thái: ${paymentStatus.toUpperCase()}, Phương thức: ${(paymentMethod || updated.paymentMethod).toUpperCase()})${note ? `: ${note}` : ""}.`,
      metadata: {
        orderId,
        orderCode: updated.orderCode,
        amount: updated.total,
        paymentMethod: paymentMethod || updated.paymentMethod,
        paymentStatus,
        note,
      },
      severity: "success",
    });

    // this.setStorage("orders", orders); // Đã comment: không lưu dữ liệu test vào session/localStorage
    return updated;
  }

  async updateOrderShipping(
    orderId: string,
    data: { recipientName: string; recipientPhone: string; shippingAddress: string; customerNote?: string },
    actor: AdminAuditLog["actor"]
  ): Promise<AdminOrder> {
    const updated = await orderApi.updateShippingInfo(orderId, data);
    await this.logActivity({
      actor,
      action: "ORDER_STATUS_CHANGED",
      module: "Đơn hàng",
      target: `Đơn hàng #${updated.orderCode}`,
      description: `Cập nhật thông tin giao hàng: Người nhận: ${data.recipientName}, SĐT: ${data.recipientPhone}, Đ/C: ${data.shippingAddress}`,
      metadata: { orderId, orderCode: updated.orderCode, ...data },
      severity: "info",
    });
    return updated;
  }

  async cancelOrder(
    orderId: string,
    reason: string,
    actor: AdminAuditLog["actor"]
  ): Promise<AdminOrder> {
    const updated = await orderApi.cancelOrder(orderId, reason);
    await this.logActivity({
      actor,
      action: "ORDER_STATUS_CHANGED",
      module: "Đơn hàng",
      target: `Đơn hàng #${updated.orderCode}`,
      description: `Hủy đơn hàng #${updated.orderCode}. Lý do: ${reason}`,
      metadata: { orderId, orderCode: updated.orderCode, reason },
      severity: "warning",
    });
    return updated;
  }

  // 5. Staff
  async getStaff(): Promise<AdminStaff[]> {
    try {
      const list = await rbacApi.getStaff();
      if (list && list.length > 0) {
        this.setStorage("staff", list);
        return list;
      }
    } catch (e) {
      console.warn("Lấy nhân sự từ API thất bại, trả về danh sách rỗng:", e);
    }
    return [];
  }

  async saveStaff(
    staff: Partial<AdminStaff> & { username?: string; password?: string; phone?: string },
    actor?: AdminAuditLog["actor"]
  ): Promise<void> {
    const currentList = await this.getStaff();
    if (staff.id && staff.roleCode) {
      const existing = currentList.find((s) => s.id === staff.id);
      const previousRole = existing?.roleCode || "STAFF";
      try {
        await rbacApi.updateUserRoles(staff.id, [staff.roleCode]);
      } catch (e) {
        console.warn("Gán vai trò nhân sự qua API thất bại, lưu cục bộ:", e);
      }
      const updatedList = currentList.map((s) =>
        s.id === staff.id
          ? {
              ...s,
              roleCode: staff.roleCode!,
              roleName: staff.roleName || staff.roleCode!,
            }
          : s
      );
      this.setStorage("staff", updatedList);

      await this.logActivity({
        actor: actor || { name: "Quản trị viên", role: "Quản trị hệ thống" },
        action: "ASSIGN_ROLES",
        module: "Phân quyền",
        target: `${existing?.name || staff.name || "Nhân sự"} (${existing?.email || staff.email || `#${staff.id}`})`,
        description: `Phân công lại vai trò cho nhân sự ${existing?.name || staff.name || `#${staff.id}`}: [${previousRole}] → [${staff.roleCode}] (${staff.roleName || staff.roleCode}).`,
        metadata: {
          staffId: staff.id,
          staffName: existing?.name || staff.name,
          email: existing?.email || staff.email,
          previousRoles: [previousRole],
          newRoles: [staff.roleCode],
          roleCode: staff.roleCode,
        },
        severity: "warning",
      });
    } else {
      const username = staff.username?.trim() || staff.email?.split("@")[0] || `staff_${Date.now()}`;
      const roleCode = staff.roleCode || "STAFF";
      let created: AdminStaff | null = null;
      try {
        created = await rbacApi.createStaff({
          username,
          password: staff.password,
          fullName: staff.name || "Nhân viên mới",
          email: staff.email || `${username}@nhaxinh.com`,
          phone: staff.phone,
          roleCode,
        });
      } catch (e) {
        console.warn("Tạo nhân sự qua API thất bại, lưu cục bộ:", e);
        created = {
          id: `staff-${Date.now()}`,
          username,
          name: staff.name || "Nhân viên mới",
          email: staff.email || `${username}@nhaxinh.com`,
          phone: staff.phone,
          roleCode,
          roleName: staff.roleName || roleCode,
          status: "active",
          lastLogin: "Vừa khởi tạo",
        };
      }
      this.setStorage("staff", [created, ...currentList]);

      await this.logActivity({
        actor: actor || { name: "Quản trị viên", role: "Quản trị hệ thống" },
        action: "STAFF_INVITED",
        module: "Phân quyền",
        target: `${created.name} (${created.email})`,
        description: `Tạo mới tài khoản nhân sự nội bộ @${username} (${created.email}) và gán vai trò [${roleCode}].`,
        metadata: {
          staffId: created.id,
          username,
          fullName: created.name,
          email: created.email,
          phone: created.phone,
          assignedRoles: [roleCode],
          roleCode,
        },
        severity: "success",
      });
    }
  }

  async updateStaffStatus(
    userId: string,
    status: "active" | "inactive",
    actorOrNote?: AdminAuditLog["actor"] | string,
    actorArg?: AdminAuditLog["actor"]
  ): Promise<void> {
    const resolvedActor =
      typeof actorOrNote === "object" && actorOrNote !== null
        ? actorOrNote
        : actorArg || { name: "Quản trị viên", role: "Quản trị hệ thống" };
    const note = typeof actorOrNote === "string" ? actorOrNote : undefined;

    const currentList = await this.getStaff();
    const existing = currentList.find((s) => s.id === userId);
    const previousStatus = existing?.status || (status === "active" ? "inactive" : "active");

    try {
      await rbacApi.updateUserStatus(userId, status === "active" ? "ACTIVE" : "INACTIVE");
    } catch (e) {
      console.warn("Đổi trạng thái nhân sự qua API thất bại, cập nhật cục bộ:", e);
    }

    const updatedList = currentList.map((s) =>
      s.id === userId ? { ...s, status } : s
    );
    this.setStorage("staff", updatedList);

    await this.logActivity({
      actor: resolvedActor,
      action: "USER_STATUS_UPDATE",
      module: "Phân quyền",
      target: `${existing?.name || `Tài khoản #${userId}`} (${existing?.email || userId})`,
      description:
        status === "active"
          ? `Mở khóa tài khoản nhân sự ${existing?.name || `#${userId}`} (${previousStatus.toUpperCase()} → ACTIVE).`
          : `Tạm khóa tài khoản nhân sự ${existing?.name || `#${userId}`} (${previousStatus.toUpperCase()} → INACTIVE).`,
      metadata: {
        userId,
        staffName: existing?.name,
        email: existing?.email,
        previousStatus: previousStatus.toUpperCase(),
        newStatus: status === "active" ? "ACTIVE" : "INACTIVE",
        note,
      },
      severity: status === "active" ? "success" : "danger",
    });
  }

  // 6. Discounts
  async getDiscounts(): Promise<AdminDiscount[]> {
    return this.getStorage<AdminDiscount[]>("discounts", INITIAL_DISCOUNTS);
  }

  async saveDiscount(disc: Partial<AdminDiscount>): Promise<AdminDiscount> {
    const list = await this.getDiscounts();
    if (disc.id) {
      const idx = list.findIndex((d) => d.id === disc.id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...disc };
        this.setStorage("discounts", list);
        return list[idx];
      }
    }
    const newD: AdminDiscount = {
      id: `disc-${Date.now()}`,
      code: disc.code || "VOUCHER",
      description: disc.description || "",
      discountPercent: disc.discountPercent || 10,
      maxDiscount: disc.maxDiscount || 1000000,
      minOrder: disc.minOrder || 5000000,
      usageLimit: disc.usageLimit || 500,
      usedCount: 0,
      expiresAt: disc.expiresAt || "31/12/2026",
      status: "active",
    };
    list.unshift(newD);
    this.setStorage("discounts", list);
    return newD;
  }

  async deleteDiscount(id: string): Promise<void> {
    const list = await this.getDiscounts();
    const updated = list.filter((d) => d.id !== id);
    this.setStorage("discounts", updated);
  }

  // 7. Articles
  async getArticles(): Promise<AdminArticle[]> {
    return this.getStorage<AdminArticle[]>("articles", INITIAL_ARTICLES);
  }

  async saveArticle(art: Partial<AdminArticle>): Promise<AdminArticle> {
    const list = await this.getArticles();
    if (art.id) {
      const idx = list.findIndex((a) => a.id === art.id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...art };
        this.setStorage("articles", list);
        return list[idx];
      }
    }
    const newArt: AdminArticle = {
      id: `art-${Date.now()}`,
      title: art.title || "",
      slug: art.slug || generateSlug(art.title || "bai-viet"),
      category: art.category || "Góc cảm hứng",
      author: art.author || "Ban Biên Tập",
      views: 1,
      createdAt: new Date().toLocaleDateString("vi-VN"),
      status: "published",
      image: art.image || "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=600&q=80",
      summary: art.summary || "",
      content: art.content || "",
    };
    list.unshift(newArt);
    this.setStorage("articles", list);
    return newArt;
  }

  async deleteArticle(id: string): Promise<void> {
    const list = await this.getArticles();
    const updated = list.filter((a) => a.id !== id);
    this.setStorage("articles", updated);
  }

  // 8. Notifications
  async getNotifications(): Promise<AdminNotification[]> {
    return this.getStorage<AdminNotification[]>("notifications", INITIAL_NOTIFICATIONS);
  }

  async createNotification(notif: Partial<AdminNotification>): Promise<AdminNotification> {
    const list = await this.getNotifications();
    const newN: AdminNotification = {
      id: `notif-${Date.now()}`,
      title: notif.title || "",
      message: notif.message || "",
      type: notif.type || "system",
      createdAt: "Vừa xong",
      target: notif.target || "all",
      read: false,
    };
    list.unshift(newN);
    this.setStorage("notifications", list);
    return newN;
  }

  async markNotificationRead(id: string): Promise<void> {
    const list = await this.getNotifications();
    const updated = list.map((n) => (n.id === id ? { ...n, read: true } : n));
    this.setStorage("notifications", updated);
  }

  async markAllNotificationsRead(): Promise<void> {
    const list = await this.getNotifications();
    const updated = list.map((n) => ({ ...n, read: true }));
    this.setStorage("notifications", updated);
  }

  // 9. Tickets
  async getTickets(): Promise<AdminTicket[]> {
    return this.getStorage<AdminTicket[]>("tickets", INITIAL_TICKETS);
  }

  async replyTicket(id: string, replyText: string): Promise<void> {
    const list = await this.getTickets();
    const idx = list.findIndex((t) => t.id === id);
    if (idx >= 0) {
      list[idx] = {
        ...list[idx],
        reply: replyText,
        status: "resolved",
      };
      this.setStorage("tickets", list);
    }
  }

  // 10. Settings
  async getSettings(): Promise<AdminSettingsConfig> {
    return this.getStorage<AdminSettingsConfig>("settings", INITIAL_SETTINGS);
  }

  async saveSettings(cfg: AdminSettingsConfig, actor?: AdminAuditLog["actor"]): Promise<void> {
    const previous = await this.getSettings();
    this.setStorage("settings", cfg);
    await this.logActivity({
      actor: actor || { name: "Quản trị viên", role: "Quản trị hệ thống" },
      action: "SETTINGS_CHANGED",
      module: "Hệ thống",
      target: "Cấu hình hệ thống",
      description: "Cập nhật thông tin vận hành, vận chuyển hoặc cổng thanh toán.",
      metadata: { before: previous, after: cfg },
      severity: "warning",
    });
  }

  // 11. Audit Logs (Nhật ký hoạt động hệ thống)
  async getAuditLogs(): Promise<AdminAuditLog[]> {
    const localLogs = this.getStorage<AdminAuditLog[]>("logs", INITIAL_AUDIT_LOGS);
    try {
      const apiLogs = await rbacApi.getAuditLogs();
      if (apiLogs && apiLogs.length > 0) {
        const seenIds = new Set(apiLogs.map((l) => l.id));
        const uniqueLocal = localLogs.filter((l) => !seenIds.has(l.id));
        return [...uniqueLocal, ...apiLogs];
      }
    } catch (e) {
      console.warn("Lấy audit logs từ API thất bại, dùng nhật ký cục bộ:", e);
    }
    return localLogs;
  }

  async logActivity(entry: Omit<AdminAuditLog, "id" | "timestamp">): Promise<AdminAuditLog> {
    const localLogs = this.getStorage<AdminAuditLog[]>("logs", INITIAL_AUDIT_LOGS);
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const formattedTimestamp = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    const newLog: AdminAuditLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: formattedTimestamp,
      ipAddress: "127.0.0.1 (Nội bộ)",
      ...entry,
    };

    const updatedLocal = [newLog, ...localLogs].slice(0, 500);
    this.setStorage("logs", updatedLocal);

    // Đồng bộ ngầm nhật ký lên Backend Database nếu có phiên đăng nhập Admin
    const entityTypeMap: Record<string, string> = {
      "Phân quyền": "ROLE",
      "Đơn hàng": "ORDER",
      "Thanh toán": "PAYMENT",
      "Sản phẩm": "PRODUCT",
      "Danh mục": "CATEGORY",
      "Bộ sưu tập": "COLLECTION",
      "Khuyến mãi": "COUPON",
      "CSKH": "TICKET",
      "Hệ thống": "SYSTEM",
    };
    void rbacApi
      .createAuditLog({
        action: String(entry.action),
        entityType: entityTypeMap[entry.module] || "SYSTEM",
        entityId: String(
          entry.metadata?.roleId ||
            entry.metadata?.staffId ||
            entry.metadata?.userId ||
            entry.metadata?.categoryId ||
            entry.metadata?.productId ||
            entry.metadata?.orderId ||
            ""
        ),
        target: entry.target,
        description: entry.description,
        metadata: entry.metadata,
      })
      .catch(() => {
        // Bỏ qua nếu chưa có phiên session cookie phía server hoặc endpoint đã tự ghi log
      });

    return newLog;
  }

  async logAction(action: string, description: string, metadata?: Record<string, unknown>): Promise<AdminAuditLog> {
    return this.logActivity({
      actor: {
        name: "Admin",
        email: "admin@nhaxinh.com",
        role: "Quản trị viên",
      },
      action: action as AdminAuditLog["action"],
      module: "Hệ thống",
      target: "Chính sách website",
      description,
      metadata,
      severity: "info",
    });
  }

  async clearAuditLogs(): Promise<void> {
    this.setStorage("logs", []);
  }
}

// ── Initial Mock Datasets ──
export const INITIAL_DISCOUNTS: AdminDiscount[] = [
  {
    id: "disc-1",
    code: "NHAXINH10",
    description: "Giảm 10% cho toàn bộ sản phẩm BST mới",
    discountPercent: 10,
    maxDiscount: 5000000,
    minOrder: 10000000,
    usageLimit: 200,
    usedCount: 78,
    expiresAt: "31/12/2026",
    status: "active",
  },
  {
    id: "disc-2",
    code: "FREESHIP",
    description: "Miễn phí vận chuyển & lắp đặt toàn quốc",
    discountPercent: 100,
    maxDiscount: 300000,
    minOrder: 3000000,
    usageLimit: 500,
    usedCount: 342,
    expiresAt: "31/12/2026",
    status: "active",
  },
  {
    id: "disc-3",
    code: "VIP500",
    description: "Tặng 500.000₫ cho khách hàng thành viên VIP",
    discountPercent: 0,
    maxDiscount: 500000,
    minOrder: 5000000,
    usageLimit: 100,
    usedCount: 65,
    expiresAt: "30/11/2026",
    status: "active",
  },
];

export const INITIAL_ARTICLES: AdminArticle[] = [
  {
    id: "art-1",
    title: "Xu hướng nội thất phòng khách Scandinavian 2026: Tối giản mà ấm cúng",
    slug: "xu-huong-noi-that-phong-khach-scandinavian-2026",
    category: "Xu hướng nội thất",
    author: "KTS. Lê Quang Huy",
    views: 4520,
    createdAt: "22/10/2026",
    status: "published",
    image: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80",
    summary: "Khám phá cách kết hợp giữa chất liệu gỗ sồi tự nhiên, màu sắc nhã nhặn và ánh sáng tự nhiên để tạo nên không gian sống lý tưởng.",
    content: "Phong cách Scandinavian luôn giữ vị thế hàng đầu trong thiết kế không gian hiện đại...",
  },
  {
    id: "art-2",
    title: "Cẩm nang chăm sóc và bảo dưỡng sofa da bò Ý nhập khẩu bền đẹp 10 năm",
    slug: "cam-nang-cham-soc-va-bao-duong-sofa-da-bo-y",
    category: "Cẩm nang bảo quản",
    author: "Chuyên gia Nhà Xinh",
    views: 2890,
    createdAt: "18/10/2026",
    status: "published",
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80",
    summary: "Hướng dẫn các bước lau sạch bụi bẩn, thoa kem dưỡng da định kỳ và tránh những sai lầm phổ biến khi dùng sofa da.",
    content: "Chất liệu da bò thật mang đến sự đẳng cấp, tuy nhiên cần được dưỡng ẩm định kỳ...",
  },
];

export const INITIAL_NOTIFICATIONS: AdminNotification[] = [
  {
    id: "notif-1",
    title: "Đơn hàng mới NX-89421",
    message: "Khách hàng Nguyễn Văn Tuấn vừa đặt đơn hàng trị giá 45.900.000₫ thanh toán qua VNPAY.",
    type: "order",
    createdAt: "10 phút trước",
    target: "all",
    read: false,
  },
  {
    id: "notif-2",
    title: "Cảnh báo tồn kho sản phẩm",
    message: "Sản phẩm 'Bàn console mặt đá Carrara' chỉ còn 3 sản phẩm trong kho trung tâm.",
    type: "inventory",
    createdAt: "1 giờ trước",
    target: "admin",
    read: false,
  },
];

export const INITIAL_TICKETS: AdminTicket[] = [
  {
    id: "ticket-1",
    customerName: "Nguyễn Thu Hà",
    phone: "0908 999 111",
    email: "ha.nguyen@gmail.com",
    subject: "Hỏi về màu da bọc khác cho mẫu Sofa Victoria",
    message: "Chào showroom, mẫu Sofa Victoria 3 chỗ tôi muốn đổi sang màu da bò cognac thì có sẵn hàng không hay phải đặt may đo?",
    status: "open",
    createdAt: "27/10/2026 07:30",
    vipTier: "Gold",
  },
  {
    id: "ticket-2",
    customerName: "Lâm Quốc Cường",
    phone: "0918 222 333",
    email: "cuong.lam@vietcapital.vn",
    subject: "Yêu cầu hẹn lịch KTS tư vấn thiết kế căn hộ 150m2",
    message: "Tôi vừa nhận bàn giao căn hộ ở Empire City Thủ Thiêm, muốn đặt lịch kiến trúc sư Nhà Xinh đến khảo sát không gian vào chiều Chủ nhật.",
    status: "in_progress",
    createdAt: "26/10/2026 14:10",
    vipTier: "Diamond",
    reply: "Đã phân công KTS. Lê Quang Huy liên hệ trực tiếp với anh qua Zalo lúc 15:00.",
  },
];

export const INITIAL_SETTINGS: AdminSettingsConfig = {
  siteName: "Nhà Xinh Furniture - Tinh hoa nội thất Việt",
  hotline: "0903 884 358",
  email: "info@nhaxinh.com",
  showroomAddress: "65 Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
  workingHours: "08:30 - 21:00 (Thứ 2 - Chủ Nhật)",
  freeShippingThreshold: 5000000,
  standardShippingFee: 150000,
  vnpayMerchantId: "NHAXINH_VNPAY_PROD",
  vietqrBank: "MB Bank (Quân Đội) - CN Sài Gòn",
  vietqrAccount: "0903884358888",
  vietqrOwner: "CONG TY CO PHAN NOI THAT NHA XINH",
};

export const INITIAL_AUDIT_LOGS: AdminAuditLog[] = [
  {
    id: "log-1",
    actor: {
      name: "Nguyễn Văn Tuấn",
      email: "tuan.nguyen@gmail.com",
      role: "Khách hàng",
    },
    action: "ORDER_CREATED",
    module: "Đơn hàng",
    target: "Đơn hàng #NX-89421",
    description: "Khách hàng đặt mua đơn hàng qua website (Bộ bàn ăn Howard mặt đá + 6 ghế Grace)",
    timestamp: "27/10/2026 10:15:20",
    ipAddress: "113.161.45.22",
    metadata: {
      orderCode: "NX-89421",
      amount: 45900000,
      paymentMethod: "vnpay",
      itemsCount: 2,
    },
    severity: "success",
  },
  {
    id: "log-2",
    actor: {
      name: "Cổng thanh toán VNPAY",
      role: "Hệ thống Webhook",
      isSystem: true,
    },
    action: "PAYMENT_CONFIRMED",
    module: "Thanh toán",
    target: "Giao dịch #VNP14209581",
    description: "Xác thực thanh toán trực tuyến thành công 45.900.000₫ cho đơn #NX-89421 qua NCB SmartBanking",
    timestamp: "27/10/2026 10:16:05",
    ipAddress: "103.20.144.12",
    metadata: {
      transactionNo: "VNP14209581",
      bankCode: "NCB",
      amount: 45900000,
      orderCode: "NX-89421",
      responseCode: "00",
    },
    severity: "success",
  },
  {
    id: "log-3",
    actor: {
      name: "Trần Minh Quân",
      email: "admin@nhaxinh.com",
      role: "Super Admin",
    },
    action: "PERMISSION_GRANTED",
    module: "Phân quyền",
    target: "Vai trò Kế toán (ACCOUNTANT)",
    description: "Cấp bổ sung quyền [discounts.create, discounts.edit, logs.export] vào ma trận quyền của vai trò Kế toán",
    timestamp: "27/10/2026 09:42:15",
    ipAddress: "192.168.1.15",
    metadata: {
      roleCode: "ACCOUNTANT",
      addedPermissions: ["discounts.create", "discounts.edit", "logs.export"],
      grantedBy: "Trần Minh Quân",
    },
    severity: "warning",
  },
  {
    id: "log-4",
    actor: {
      name: "Đặng Mai Chi",
      email: "chi.dang@nhaxinh.com",
      role: "Chăm sóc khách hàng",
    },
    action: "ORDER_STATUS_CHANGED",
    module: "Đơn hàng",
    target: "Đơn hàng #NX-89420",
    description: "Chuyển trạng thái đơn từ [Chờ xử lý] sang [Đang giao hàng] - Đã bàn giao xe tải giao showroom",
    timestamp: "27/10/2026 09:10:48",
    ipAddress: "192.168.1.42",
    metadata: {
      orderCode: "NX-89420",
      previousStatus: "pending",
      newStatus: "shipping",
      driverName: "Nguyễn Văn Hùng",
      plateNumber: "51C-882.11",
    },
    severity: "info",
  },
  {
    id: "log-5",
    actor: {
      name: "Hoàng Anh Đức",
      email: "duc.hoang@nhaxinh.com",
      role: "Quản lý Kho",
    },
    action: "PRODUCT_UPDATED",
    module: "Sản phẩm",
    target: "Sofa Da Thật Băng 3 Chỗ Victoria",
    description: "Điều chỉnh tồn kho biến thể SKU-SF-VIC-CARAMEL: Giảm từ 12 cái xuống 8 cái (Xuất hàng mẫu trưng bày)",
    timestamp: "27/10/2026 08:35:10",
    ipAddress: "192.168.1.88",
    metadata: {
      productId: 1,
      sku: "SKU-SF-VIC-CARAMEL",
      oldStock: 12,
      newStock: 8,
      reason: "Xuất mẫu showroom Hai Bà Trưng",
    },
    severity: "info",
  },
  {
    id: "log-6",
    actor: {
      name: "Võ Thùy Linh",
      email: "linh.vo@nhaxinh.com",
      role: "Kế toán",
    },
    action: "PAYMENT_CONFIRMED",
    module: "Thanh toán",
    target: "Hóa đơn #NX-89419",
    description: "Đối soát giao dịch chuyển khoản VietQR MB Bank số tiền 24.500.000₫ và phát hành hóa đơn điện tử VAT",
    timestamp: "26/10/2026 16:45:00",
    ipAddress: "192.168.1.33",
    metadata: {
      orderCode: "NX-89419",
      amount: 24500000,
      bank: "MB Bank",
      refCode: "FT2629910482",
      vatInvoiceNo: "HD-NX-2026-00412",
    },
    severity: "success",
  },
  {
    id: "log-7",
    actor: {
      name: "Trần Minh Quân",
      email: "admin@nhaxinh.com",
      role: "Super Admin",
    },
    action: "STAFF_INVITED",
    module: "Phân quyền",
    target: "Nhân sự Hoàng Anh Đức",
    description: "Khởi tạo tài khoản quản trị mới duc.hoang@nhaxinh.com và gán vai trò [Quản lý Kho (WAREHOUSE_MANAGER)]",
    timestamp: "26/10/2026 14:20:00",
    ipAddress: "192.168.1.15",
    metadata: {
      email: "duc.hoang@nhaxinh.com",
      role: "WAREHOUSE_MANAGER",
    },
    severity: "info",
  },
  {
    id: "log-8",
    actor: {
      name: "Hoàng Anh Đức",
      email: "duc.hoang@nhaxinh.com",
      role: "Quản lý Kho",
    },
    action: "PRODUCT_CREATED",
    module: "Sản phẩm",
    target: "Bàn Trà Cẩm Thạch Orbit",
    description: "Thêm mới sản phẩm vào danh mục Phòng khách với 2 biến thể đá Marble trắng Carrara và Nero đen",
    timestamp: "26/10/2026 11:05:30",
    ipAddress: "192.168.1.88",
    metadata: {
      productName: "Bàn Trà Cẩm Thạch Orbit",
      category: "Phòng khách",
      price: 14500000,
      initialStock: 15,
      variantsCount: 2,
    },
    severity: "success",
  },
  {
    id: "log-9",
    actor: {
      name: "Lâm Quốc Cường",
      email: "cuong.lam@vietcapital.vn",
      role: "Khách hàng VIP",
    },
    action: "ORDER_CREATED",
    module: "Đơn hàng",
    target: "Đơn hàng #NX-89418",
    description: "Khách hàng VIP đặt mua gói nội thất Master Bedroom trọn gói tổng trị giá 185.000.000₫ thanh toán chuyển khoản",
    timestamp: "25/10/2026 15:30:12",
    ipAddress: "14.238.99.102",
    metadata: {
      orderCode: "NX-89418",
      amount: 185000000,
      paymentMethod: "vietqr",
      vipTier: "Diamond",
    },
    severity: "success",
  },
  {
    id: "log-10",
    actor: {
      name: "Trần Minh Quân",
      email: "admin@nhaxinh.com",
      role: "Super Admin",
    },
    action: "SETTINGS_CHANGED",
    module: "Hệ thống",
    target: "Cấu hình thanh toán & Giao hàng",
    description: "Cập nhật ngưỡng miễn phí vận chuyển lên 5.000.000₫ và điều chỉnh STK VietQR MB Bank chi nhánh Sài Gòn",
    timestamp: "25/10/2026 09:00:00",
    ipAddress: "192.168.1.15",
    metadata: {
      before: { freeShippingThreshold: 3000000 },
      after: { freeShippingThreshold: 5000000 },
    },
    severity: "warning",
  },
];

export const adminApi = new AdminApiService();
export const adminService = adminApi;
