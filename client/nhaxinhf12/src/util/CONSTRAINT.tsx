// Menu tĩnh mô phỏng cấu trúc nhaxinh.com.
// Khi Backend sẵn sàng, thay bằng GET /api/v1/categories/tree (cùng cấu trúc { title, to, items }).

export interface MenuLink { label: string; to: string }
export interface MenuGroup { title: string; to: string; items: MenuLink[] }
export type NavKind = "link" | "products" | "rooms" | "brands";
export type MenuKey = Exclude<NavKind, "link">;
export interface NavItem { label: string; to: string; kind: NavKind }
import { Link } from "react-router-dom";
import {
  ShieldCheck
} from "lucide-react";
export interface BannerAction {
    label: string;
    url: string;
}

export interface HeroBannerProps {
    subtitle: string;
    title: string;
    description: string;
    backgroundImage: string;
    actions: BannerAction[];
    className?: string;
}

export default function HeroBanner({
    subtitle,
    title,
    description,
    backgroundImage,
    actions,
}: HeroBannerProps) {
    return (
        <section
            className="hero-banner"
            style={{
                backgroundImage: `url(${backgroundImage})`,
            }}
        >
            <div className="hero-content">

                <span>{subtitle}</span>

                <h1>{title}</h1>

                <p>{description}</p>

                <div className="hero-actions">
                    {actions.map((action) => (
                        <Link
                            key={action.url}
                            to={action.url}
                            className="hero-btn"
                        >
                            {action.label}
                        </Link>
                    ))}
                </div>

            </div>
        </section>
    );
}
export const HOTLINE: { label: string; href: string } = { label: "0903 884 358", href: "tel:0903884358" };

export const TOP_LINKS: MenuLink[] = [
  { label: "Giới thiệu", to: "/gioi-thieu" },
  { label: "Chính sách mua bán, đổi trả", to: "/chinh-sach-mua-ban-doi-tra" },
  { label: "Khuyến mãi", to: "/khuyen-mai" },
  { label: "Giảm giá đặc biệt", to: "/giam-gia-dac-biet" },
];


export const roomMegaMenuGroups: MenuGroup[] = [
  {
    title: "Phòng khách",
    to: "/phong/phong-khach",
    items: [
      { label: "Sofa băng & Sofa góc", to: "/danh-muc/sofa" },
      { label: "Bàn nước & Bàn bên", to: "/danh-muc/ban-nuoc" },
      { label: "Kệ tivi & Tủ trang trí", to: "/danh-muc/tu-tivi" },
      { label: "Ghế Armchair & Ghế thư giãn", to: "/danh-muc/armchair" },
    ],
  },
  {
    title: "Phòng ăn",
    to: "/phong/phong-an",
    items: [
      { label: "Bàn ăn 4 - 8 chỗ", to: "/danh-muc/ban-an" },
      { label: "Ghế ăn bọc da & nỉ", to: "/danh-muc/ghe-an" },
      { label: "Tủ ly & Tủ rượu sang trọng", to: "/danh-muc/tu-ly" },
      { label: "Quầy bar & Ghế bar", to: "/danh-muc/ghe-bar" },
    ],
  },
  {
    title: "Phòng ngủ",
    to: "/phong/phong-ngu",
    items: [
      { label: "Giường ngủ King & Queen", to: "/danh-muc/giuong" },
      { label: "Nệm & Chăn ga cao cấp", to: "/danh-muc/nem" },
      { label: "Tủ đầu giường", to: "/danh-muc/tu-dau-giuong" },
      { label: "Bàn trang điểm & Tủ áo", to: "/danh-muc/ban-trang-diem" },
    ],
  },
  {
    title: "Phòng làm việc",
    to: "/phong/phong-lam-viec",
    items: [
      { label: "Bàn làm việc cao cấp", to: "/danh-muc/ban-lam-viec" },
      { label: "Ghế làm việc công thái học", to: "/danh-muc/ghe-lam-viec" },
      { label: "Kệ sách & Tủ tài liệu", to: "/danh-muc/ke-sach" },
    ],
  },
  {
    title: "Không gian bếp",
    to: "/danh-muc/bep",
    items: [
      { label: "Hệ tủ bếp hiện đại", to: "/danh-muc/tu-bep" },
      { label: "Thiết bị bếp thông minh", to: "/danh-muc/thiet-bi-bep" },
      { label: "Dụng cụ & Đảo bếp", to: "/danh-muc/dung-cu-bep" },
    ],
  },
  {
    title: "Đèn & Thảm sàn",
    to: "/danh-muc/den",
    items: [
      { label: "Đèn chùm & Đèn trần", to: "/danh-muc/den-tran" },
      { label: "Đèn cây & Đèn bàn", to: "/danh-muc/den-ban" },
      { label: "Thảm trải sàn dệt tay", to: "/danh-muc/tham" },
    ],
  },
  {
    title: "Hàng trang trí",
    to: "/danh-muc/hang-trang-tri",
    items: [
      { label: "Tranh nghệ thuật & Gương", to: "/danh-muc/tranh" },
      { label: "Bình hoa & Gốm thủ công", to: "/danh-muc/binh-trang-tri" },
      { label: "Gối tựa lưng trang trí", to: "/danh-muc/goi-trang-tri" },
      { label: "Đồng hồ & Tượng decor", to: "/danh-muc/dong-ho" },
    ],
  },
  {
    title: "Ngoại thất",
    to: "/danh-muc/ngoai-that",
    items: [
      { label: "Bàn ghế ngoài trời chịu nước", to: "/danh-muc/ban-ngoai-troi" },
      { label: "Ghế hồ bơi & Xích đu", to: "/danh-muc/ghe-ngoai-troi" },
      { label: "Nến thơm & Tinh dầu thư giãn", to: "/danh-muc/huong-thom" },
    ],
  },
];


export const PRODUCT_GROUPS: MenuGroup[] = [
  { title: "Sofa", to: "/danh-muc/sofa", items: [
    { label: "Sofa băng", to: "/danh-muc/sofa-bang" },
    { label: "Sofa góc", to: "/danh-muc/sofa-goc" },
    { label: "Sofa điện", to: "/danh-muc/sofa-dien" },
    { label: "Sofa bed", to: "/danh-muc/sofa-bed" },
  ]},
  { title: "Ghế", to: "/danh-muc/ghe", items: [
    { label: "Armchair", to: "/danh-muc/armchair" },
    { label: "Ghế thư giãn", to: "/danh-muc/ghe-thu-gian" },
    { label: "Ghế dài & đôn", to: "/danh-muc/ghe-dai-va-don" },
    { label: "Ghế ăn", to: "/danh-muc/ghe-an" },
    { label: "Ghế bar", to: "/danh-muc/ghe-bar" },
    { label: "Ghế làm việc", to: "/danh-muc/ghe-lam-viec" },
  ]},
  { title: "Bàn", to: "/danh-muc/ban", items: [
    { label: "Bàn ăn", to: "/danh-muc/ban-an" },
    { label: "Bàn bên", to: "/danh-muc/ban-ben" },
    { label: "Bàn nước", to: "/danh-muc/ban-nuoc" },
    { label: "Bàn console", to: "/danh-muc/ban-console" },
    { label: "Bàn làm việc", to: "/danh-muc/ban-lam-viec" },
    { label: "Bàn trang điểm", to: "/danh-muc/ban-trang-diem" },
  ]},
  { title: "Tủ & kệ", to: "/danh-muc/tu-va-ke", items: [
    { label: "Tủ tivi", to: "/danh-muc/tu-tivi" },
    { label: "Tủ giày", to: "/danh-muc/tu-giay" },
    { label: "Tủ ly", to: "/danh-muc/tu-ly" },
    { label: "Tủ áo", to: "/danh-muc/tu-ao" },
    { label: "Tủ rượu", to: "/danh-muc/tu-ruou" },
    { label: "Tủ đầu giường", to: "/danh-muc/tu-dau-giuong" },
    { label: "Kệ treo tường", to: "/danh-muc/ke-treo-tuong" },
    { label: "Kệ trưng bày", to: "/danh-muc/ke-trung-bay" },
  ]},
  { title: "Giường & nệm", to: "/danh-muc/giuong-va-nem", items: [
    { label: "Giường", to: "/danh-muc/giuong" },
    { label: "Nệm", to: "/danh-muc/nem" },
    { label: "Chăn ga gối", to: "/danh-muc/chan-ga-goi" },
  ]},
  { title: "Bếp", to: "/danh-muc/bep", items: [
    { label: "Tủ bếp", to: "/danh-muc/tu-bep" },
    { label: "Thiết bị bếp", to: "/danh-muc/thiet-bi-bep" },
    { label: "Dụng cụ bếp", to: "/danh-muc/dung-cu-bep" },
  ]},
  { title: "Đèn & thảm", to: "/danh-muc/den", items: [
    { label: "Đèn bàn", to: "/danh-muc/den-ban" },
    { label: "Đèn trần", to: "/danh-muc/den-tran" },
    { label: "Đèn sàn", to: "/danh-muc/den-san" },
    { label: "Thảm trang trí", to: "/danh-muc/tham" },
  ]},
  { title: "Trang trí", to: "/danh-muc/hang-trang-tri", items: [
    { label: "Bình trang trí", to: "/danh-muc/binh-trang-tri" },
    { label: "Gối trang trí", to: "/danh-muc/goi-trang-tri" },
    { label: "Tranh", to: "/danh-muc/tranh" },
    { label: "Gương", to: "/danh-muc/khung-guong" },
    { label: "Đồng hồ", to: "/danh-muc/dong-ho" },
    { label: "Hoa và cây", to: "/danh-muc/hoa-va-cay" },
  ]},
  { title: "Hương thơm & ngoại thất", to: "/danh-muc/huong-thom", items: [
    { label: "Nến", to: "/danh-muc/nen" },
    { label: "Tinh dầu", to: "/danh-muc/tinh-dau" },
    { label: "Ghế ngoài trời", to: "/danh-muc/ghe-ngoai-troi" },
    { label: "Bàn ngoài trời", to: "/danh-muc/ban-ngoai-troi" },
  ]},
];
export const megaMenuGroups: MenuGroup[] = [
  PRODUCT_GROUPS.find((g) => g.title === "Sofa") || { title: "Sofa", to: "/danh-muc/sofa", items: [] },
  PRODUCT_GROUPS.find((g) => g.title === "Bàn") || { title: "Bàn", to: "/danh-muc/ban", items: [] },
  PRODUCT_GROUPS.find((g) => g.title === "Ghế") || { title: "Ghế", to: "/danh-muc/ghe", items: [] },
  PRODUCT_GROUPS.find((g) => g.title === "Tủ & kệ") || { title: "Tủ & kệ", to: "/danh-muc/tu-va-ke", items: [] },
  PRODUCT_GROUPS.find((g) => g.title === "Giường & nệm") || { title: "Giường & nệm", to: "/danh-muc/giuong-va-nem", items: [] },
  PRODUCT_GROUPS.find((g) => g.title === "Bếp") || { title: "Bếp", to: "/danh-muc/bep", items: [] },
  PRODUCT_GROUPS.find((g) => g.title === "Đèn & thảm") || { title: "Đèn & thảm", to: "/danh-muc/den", items: [] },
  PRODUCT_GROUPS.find((g) => g.title === "Trang trí") || { title: "Trang trí", to: "/danh-muc/hang-trang-tri", items: [] },
  PRODUCT_GROUPS.find((g) => g.title === "Hương thơm & ngoại thất") || { title: "Hương thơm & ngoại thất", to: "/danh-muc/huong-thom", items: [] },
  {
    title: "Bộ sưu tập",
    to: "/bo-suu-tap",
    items: [
      { label: "BST Victoria", to: "/bo-suu-tap/victoria" },
      { label: "BST Nét Đương Đại", to: "/bo-suu-tap/net-duong-dai" },
      { label: "BST Osaka Japandi", to: "/bo-suu-tap/osaka-japandi" },
      { label: "BST Coastal Living", to: "/bo-suu-tap/coastal-living" },
    ],
  },
];

export const ROOMS: MenuLink[] = [
  { label: "Phòng khách", to: "/phong/phong-khach" },
  { label: "Phòng ăn", to: "/phong/phong-an" },
  { label: "Phòng ngủ", to: "/phong/phong-ngu" },
  { label: "Phòng làm việc", to: "/phong/phong-lam-viec" },
  { label: "Tủ bếp", to: "/danh-muc/tu-bep" },
  { label: "Hàng trang trí", to: "/danh-muc/hang-trang-tri" },
  { label: "Ngoại thất", to: "/danh-muc/ngoai-that" },
];

export const BRANDS: MenuLink[] = [
  { label: "Calligaris", to: "/thuong-hieu/calligaris" },
  { label: "La-Z-Boy", to: "/thuong-hieu/la-z-boy" },
];

// Thanh điều hướng chính, theo thứ tự trên nhaxinh.com.
// kind: "link" | "products" | "rooms" | "brands"
export const NAV: NavItem[] = [
  { label: "Sản phẩm mới", to: "/danh-muc/san-pham-moi", kind: "link" },
  { label: "Sản phẩm", to: "/san-pham", kind: "products" },
  { label: "Phòng", to: "/phong", kind: "rooms" },
  { label: "Bộ sưu tập", to: "/bo-suu-tap", kind: "link" },
  { label: "Thương hiệu", to: "/thuong-hieu", kind: "brands" },
  { label: "Tư vấn thiết kế", to: "/tu-van-thiet-ke", kind: "link" },
  { label: "Góc cảm hứng", to: "/bai-viet", kind: "link" },
];


export const brandMegaMenuGroups: MenuGroup[] = [
  {
    title: "Calligaris (Italy)",
    to: "/thuong-hieu/calligaris",
    items: [
      { label: "Bàn ăn thông minh mở rộng", to: "/thuong-hieu/calligaris" },
      { label: "Ghế ăn & Armchair phong cách Ý", to: "/thuong-hieu/calligaris" },
      { label: "Nội thất đương đại Milan", to: "/thuong-hieu/calligaris" },
    ],
  },
  {
    title: "La-Z-Boy (USA)",
    to: "/thuong-hieu/la-z-boy",
    items: [
      { label: "Ghế recliner thư giãn số 1 thế giới", to: "/thuong-hieu/la-z-boy" },
      { label: "Sofa bập bênh chỉnh điện", to: "/thuong-hieu/la-z-boy" },
      { label: "Da bò thật nhập khẩu từ Mỹ", to: "/thuong-hieu/la-z-boy" },
    ],
  },
  {
    title: "Nhà Xinh Exclusive",
    to: "/san-pham",
    items: [
      { label: "Bộ sưu tập Victoria tân cổ điển", to: "/bo-suu-tap/victoria" },
      { label: "Bộ sưu tập Nét Đương Đại", to: "/bo-suu-tap/net-duong-dai" },
      { label: "Bộ sưu tập Osaka Japandi", to: "/bo-suu-tap/osaka-japandi" },
      { label: "Bộ sưu tập Coastal Living", to: "/bo-suu-tap/coastal-living" },
    ],
  },
];


export interface Review {
  id: number;
  author: string;
  rating: number;
  date: string;
  content: string;
  helpful: number;
  avatar?: string;
  images?: string[];
}

export interface ReviewSectionProps {
  productName: string;
  reviews: Review[];
  onSubmitReview?: (review: { rating: number; content: string; author: string }) => void;
}




export type PolicyKey = "return" | "shipping" | "warranty" | "privacy" | "terms" | "vip";

export interface PolicyItem {
  key: PolicyKey;
  title: string;
  shortTitle: string;
  icon: typeof ShieldCheck;
  path: string;
  intro: string;
  sections: { title: string; content: string[] }[];
}

