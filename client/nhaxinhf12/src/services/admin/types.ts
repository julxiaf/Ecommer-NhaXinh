// ══════════════════════════════════════════════════════════
// ADMIN DATA MODELS & PERMISSIONS TYPES
// ══════════════════════════════════════════════════════════

export type DbPermissionKey =
  // ── Phân hệ Quản trị (Admin Portal Modules - 29 quyền) ──
  | "dashboard.view"
  | "users.view"
  | "users.create"
  | "users.update"
  | "users.disable"
  | "customers.view"
  | "customers.care"
  | "roles.view"
  | "roles.manage"
  | "products.view"
  | "products.create"
  | "products.update"
  | "products.delete"
  | "categories.manage"
  | "inventory.view"
  | "inventory.manage"
  | "orders.view"
  | "orders.update"
  | "orders.cancel"
  | "payments.view"
  | "payments.refund"
  | "coupons.manage"
  | "reviews.moderate"
  | "policies.manage"
  | "risk_alerts.view"
  | "risk_alerts.resolve"
  | "email_logs.view"
  | "chatbot.use"
  | "audit_logs.view"
  // ── Phạm vi Quyền API Cốt lõi (Core Backend API Scopes - 13 quyền) ──
  | "catalog:read"
  | "catalog:create"
  | "catalog:update"
  | "catalog:delete"
  | "order:read"
  | "order:update"
  | "order:cancel"
  | "user:read"
  | "user:manage"
  | "policy:read"
  | "policy:write"
  | "profile:read"
  | "profile:write";

export type PermissionKey =
  | DbPermissionKey
  // Compatibility / UI Aliases
  | "payments.confirm"
  | "orders.assign"
  | "orders.create"
  | "orders.export"
  | "products.edit"
  | "products.export"
  | "products.restock"
  | "customers.edit"
  | "categories.view"
  | "categories.create"
  | "categories.edit"
  | "categories.delete"
  | "discounts.view"
  | "discounts.create"
  | "discounts.edit"
  | "discounts.delete"
  | "articles.view"
  | "articles.create"
  | "articles.edit"
  | "articles.delete"
  | "policies.view"
  | "policies.edit"
  | "crm.view"
  | "crm.edit"
  | "crm.delete"
  | "notifications.view"
  | "notifications.create"
  | "roles.create"
  | "roles.edit"
  | "roles.delete"
  | "logs.view"
  | "logs.export"
  | "logs.clear"
  | "settings.view"
  | "settings.edit";

export interface RoleDefinition {
  id: string;
  name: string;
  code: string;
  description: string;
  permissions: PermissionKey[];
  isSystem?: boolean;
}

export interface AdminPermissionItem {
  id: string | number;
  code: string;
  name: string;
  module: string;
  description: string;
  status?: "active" | "inactive";
  roleCount?: number;
  roles?: string[];
}

export interface AdminAuditLog {
  id: string;
  actor: {
    name: string;
    email?: string;
    role: string;
    avatar?: string;
    isSystem?: boolean;
  };
  action:
    | "ORDER_CREATED"
    | "ORDER_STATUS_CHANGED"
    | "PAYMENT_INITIATED"
    | "PAYMENT_CONFIRMED"
    | "PRODUCT_CREATED"
    | "PRODUCT_UPDATED"
    | "PRODUCT_DELETED"
    | "PRODUCT_RESTOCKED"
    | "CATEGORY_CREATED"
    | "CATEGORY_UPDATED"
    | "CATEGORY_DELETED"
    | "CATEGORY_RESTORED"
    | "COLLECTION_CREATED"
    | "COLLECTION_UPDATED"
    | "COLLECTION_DELETED"
    | "PERMISSION_GRANTED"
    | "ROLE_CREATED"
    | "ROLE_CREATE"
    | "ROLE_UPDATED"
    | "ROLE_UPDATE"
    | "ROLE_PERMISSIONS_UPDATE"
    | "ROLE_DELETED"
    | "ROLE_DELETE"
    | "PERMISSION_CREATE"
    | "PERMISSION_UPDATE"
    | "PERMISSION_DELETE"
    | "ASSIGN_ROLES"
    | "USER_CREATE"
    | "USER_STATUS_UPDATE"
    | "STAFF_INVITED"
    | "SETTINGS_CHANGED"
    | "TICKET_REPLIED"
    | "VOUCHER_CREATED"
    | (string & {});
  module: "Đơn hàng" | "Sản phẩm" | "Danh mục" | "Bộ sưu tập" | "Thanh toán" | "Phân quyền" | "Hệ thống" | "CSKH" | "Khuyến mãi";
  target: string;
  description: string;
  timestamp: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
  severity: "info" | "success" | "warning" | "danger";
}

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  parentId: string | null; // null nếu là danh mục cha cao nhất
  order: number;
  icon?: string;
  description?: string;
  imageUrl?: string;
  isCollection?: boolean;
  isDeleted: boolean;
  productCount: number;
  children?: AdminCategory[];
}

export interface ProductVariant {
  id: string;
  sku: string;
  color: string;
  size: string;
  material: string;
  price: number;
  originalPrice?: number;
  stock: number;
  image?: string;
}

export interface AdminProduct {
  id: number;
  name: string;
  slug: string;
  categoryId: string;
  category: string;
  brand: string;
  price: number;
  originalPrice?: number;
  stock: number;
  image: string;
  image2?: string;
  model3dUrl?: string;
  status: "active" | "draft" | "out_of_stock";
  isDeleted: boolean;
  variants: ProductVariant[];
  createdAt: string;
  updatedAt?: string;
  description?: string;
}

export interface OrderStatusHistory {
  id: string;
  status: "pending" | "confirmed" | "processing" | "shipping" | "completed" | "cancelled";
  timestamp: string;
  updatedBy: string;
  note?: string;
}

export interface AdminOrderItem {
  productId: number;
  name: string;
  variantSku?: string;
  variantDetails?: string;
  image: string;
  price: number;
  quantity: number;
}

export interface AdminOrder {
  id: string;
  orderCode: string;
  customerName: string;
  phone: string;
  email: string;
  address: string;
  total: number;
  paymentMethod: "cod" | "vnpay" | "vietqr" | "momo" | "bank_transfer";
  paymentStatus?: "pending" | "paid" | "failed" | "refunded" | "partially_paid";
  status: "pending" | "confirmed" | "processing" | "shipping" | "completed" | "cancelled";
  createdAt: string;
  items: AdminOrderItem[];
  note?: string;
  statusHistory: OrderStatusHistory[];
}

export interface AdminDiscount {
  id: string;
  code: string;
  description: string;
  discountPercent: number;
  maxDiscount: number;
  minOrder: number;
  usageLimit: number;
  usedCount: number;
  expiresAt: string;
  status: "active" | "expired" | "disabled";
}

export interface AdminArticle {
  id: string;
  title: string;
  slug: string;
  category: "Góc cảm hứng" | "Xu hướng nội thất" | "Cẩm nang bảo quản" | "Tin tức";
  author: string;
  views: number;
  createdAt: string;
  status: "published" | "draft";
  image: string;
  summary: string;
  content: string;
}

export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  type: "order" | "inventory" | "system" | "promotion";
  createdAt: string;
  target: "all" | "admin" | "sales";
  read: boolean;
}

export interface AdminStaff {
  id: string;
  name: string;
  username?: string;
  email: string;
  phone?: string;
  roleCode: string;
  roleName: string;
  customPermissions?: PermissionKey[];
  status: "active" | "inactive";
  lastLogin: string;
}

export interface AdminTicket {
  id: string;
  customerName: string;
  phone: string;
  email: string;
  subject: string;
  message: string;
  status: "open" | "in_progress" | "resolved";
  createdAt: string;
  reply?: string;
  vipTier: "Classic" | "Silver" | "Gold" | "Diamond";
}

export interface AdminSettingsConfig {
  siteName: string;
  hotline: string;
  email: string;
  showroomAddress: string;
  workingHours?: string;
  freeShippingThreshold: number;
  standardShippingFee: number;
  vnpayMerchantId: string;
  vietqrBank: string;
  vietqrAccount: string;
  vietqrOwner: string;
}
