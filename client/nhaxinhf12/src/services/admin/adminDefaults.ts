import type {
  AdminCategory,
  AdminProduct,
  RoleDefinition,
  PermissionKey,
  AdminDiscount,
  AdminArticle,
  AdminNotification,
  AdminTicket,
  AdminSettingsConfig,
  AdminAuditLog,
} from "./types";

// ══════════════════════════════════════════════════════════
// 1. DANH MỤC QUYỀN CHUẨN HỆ THỐNG (Khớp với bảng `permissions`)
// ══════════════════════════════════════════════════════════

export interface SystemPermissionItem {
  id: number;
  key: PermissionKey;
  name: string;
  module: string;
  description: string;
}

export const ALL_PERMISSIONS: SystemPermissionItem[] = [
  // ── Phân hệ Quản trị (Admin Portal Modules) ──
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

  // ── Phạm vi Quyền API Cốt lõi (Core Backend API Scopes) ──
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

// ══════════════════════════════════════════════════════════
// 2. VAI TRÒ MẶC ĐỊNH HỆ THỐNG & CẤU HÌNH KHỞI TẠO SẠCH
// ══════════════════════════════════════════════════════════

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

// Không dùng dữ liệu giả lập (mock) — lấy trực tiếp từ Backend API
export const INITIAL_CATEGORIES: AdminCategory[] = [];
export const INITIAL_PRODUCTS: AdminProduct[] = [];
export const INITIAL_DISCOUNTS: AdminDiscount[] = [];
export const INITIAL_ARTICLES: AdminArticle[] = [];
export const INITIAL_NOTIFICATIONS: AdminNotification[] = [];
export const INITIAL_TICKETS: AdminTicket[] = [];
export const INITIAL_AUDIT_LOGS: AdminAuditLog[] = [];

export const INITIAL_SETTINGS: AdminSettingsConfig = {
  siteName: "Nhà Xinh — Nội Thất Đương Đại",
  hotline: "1800 7200",
  email: "cskh@nhaxinh.com",
  showroomAddress: "107 - 109 Xa Lộ Hà Nội, Phường Thảo Điền, TP. Thủ Đức, TP.HCM",
  workingHours: "08:30 - 21:00 (Thứ 2 - Chủ Nhật)",
  freeShippingThreshold: 10000000,
  standardShippingFee: 250000,
  vnpayMerchantId: "NHAXINH_VNPAY_PROD",
  vietqrBank: "Vietcombank (VCB)",
  vietqrAccount: "0071000889999",
  vietqrOwner: "CONG TY CP NOI THAT AKA (NHA XINH)",
};

