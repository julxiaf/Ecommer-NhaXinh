import type { Product } from "../components/ProductCard";

export interface AdminProduct extends Product {
  stock: number;
  status: "active" | "draft" | "out_of_stock";
  createdAt: string;
}

export interface AdminOrderItem {
  productId: number;
  name: string;
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
  paymentMethod: "cod" | "vnpay" | "vietqr" | "momo";
  status: "pending" | "processing" | "shipping" | "completed" | "cancelled";
  createdAt: string;
  items: AdminOrderItem[];
  note?: string;
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
  email: string;
  role: "Super Admin" | "Quản lý kho" | "Kế toán" | "CSKH" | "Biên tập viên";
  permissions: string[];
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
  freeShippingThreshold: number;
  standardShippingFee: number;
  vnpayMerchantId: string;
  vietqrBank: string;
  vietqrAccount: string;
  vietqrOwner: string;
}

// ── Initial Mock Data ──



export const INITIAL_ADMIN_ARTICLES: AdminArticle[] = [
  {
    id: "art-1",
    title: "Xu hướng nội thất phòng khách Scandinavian 2025: Tối giản mà ấm cúng",
    slug: "xu-huong-noi-that-phong-khach-scandinavian-2025",
    category: "Xu hướng nội thất",
    author: "KTS. Lê Quang Huy",
    views: 4520,
    createdAt: "22/10/2024",
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
    createdAt: "18/10/2024",
    status: "published",
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80",
    summary: "Hướng dẫn các bước lau sạch bụi bẩn, thoa kem dưỡng da định kỳ và tránh những sai lầm phổ biến khi dùng sofa da.",
    content: "Chất liệu da bò thật mang đến sự đẳng cấp, tuy nhiên cần được dưỡng ẩm định kỳ...",
  },
  {
    id: "art-3",
    title: "Bí quyết bố trí bàn ăn gỗ nguyên khối trong căn hộ duplex cao cấp",
    slug: "bi-quyet-bo-tri-ban-an-go-nguyen-khoi",
    category: "Góc cảm hứng",
    author: "KTS. Trần Phương Anh",
    views: 1740,
    createdAt: "12/10/2024",
    status: "published",
    image: "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=800&q=80",
    summary: "Không gian ẩm thực là nơi gắn kết gia đình. Cách chọn kích thước và đèn thả trần đồng điệu với bàn ăn.",
    content: "Khi bài trí bàn ăn lớn, khoảng cách lưu thông tối thiểu là 90cm...",
  },
];



export const INITIAL_ADMIN_SETTINGS: AdminSettingsConfig = {
  siteName: "Nhà Xinh Furniture - Tinh hoa nội thất Việt",
  hotline: "0903 884 358",
  email: "info@nhaxinh.com",
  showroomAddress: "65 Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
  freeShippingThreshold: 5000000,
  standardShippingFee: 150000,
  vnpayMerchantId: "NHAXINH_VNPAY_PROD",
  vietqrBank: "MB Bank (Quân Đội) - CN Sài Gòn",
  vietqrAccount: "0903884358888",
  vietqrOwner: "CONG TY CO PHAN NOI THAT NHA XINH",
};
