import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronRight,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Leaf,
  MapPin,
  Check,
} from "lucide-react";
import Header from "../components/Headers";
import Footer from "../components/Footer";
import { useStore } from "../hooks/useStore";

interface TimelineMilestone {
  year: number;
  badge: string;
  title: string;
  subtitle: string;
  desc: string;
  image: string;
  highlight: string;
  statLabel: string;
  statVal: string;
}

interface CraftsmanshipStep {
  step: string;
  title: string;
  sub: string;
  desc: string;
  image: string;
  points: string[];
}

const TIMELINE_DATA: Record<number, TimelineMilestone> = {
  1999: {
    year: 1999,
    badge: "Khởi Nguồn Đam Mê",
    title: "Xưởng Mộc Thủ Công Đầu Tiên Tại TP. Hồ Chí Minh",
    subtitle: "Đặt nền móng cho thương hiệu nội thất Việt Nam cao cấp",
    desc: "Khởi đầu từ một xưởng mộc truyền thống với những người thợ lành nghề yêu gỗ tự nhiên. Mỗi thớ gỗ sồi, gõ đỏ hay tần bì được tuyển lựa khắt khe và chế tác bằng tay, kiến tạo nên những bộ bàn ghế đầu tiên bền bỉ qua năm tháng.",
    image: "https://images.unsplash.com/photo-1540574163026-643ea20ade25?auto=format&fit=crop&w=1600&q=85",
    highlight: "Tiên phong khai mở phân khúc nội thất gỗ tự nhiên thủ công chuẩn mực",
    statLabel: "Nghệ nhân mộc đầu tiên",
    statVal: "15+",
  },
  2008: {
    year: 2008,
    badge: "Đột Phá Không Gian",
    title: "Chuỗi Showroom Trải Nghiệm Hoàn Hảo (Living Concept)",
    subtitle: "Mô hình phòng mẫu hoàn chỉnh đầu tiên tại Việt Nam",
    desc: "Nhà Xinh tiên phong chuyển đổi từ bán lẻ sản phẩm đơn lẻ sang mô hình phòng mẫu trọn gói. Khách hàng được tận mắt chiêm ngưỡng và cảm nhận không gian phòng khách, phòng ăn và phòng ngủ phối kết hài hòa như chính tổ ấm của mình.",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=85",
    highlight: "Khai trương 4 Flagship Showroom tại các trục đường trung tâm Hà Nội & TP.HCM",
    statLabel: "Diện tích trưng bày",
    statVal: "6.000m²",
  },
  2016: {
    year: 2016,
    badge: "Hợp Tác Quốc Tế",
    title: "Giao Thoa Văn Hóa: Thiết Kế Đan Mạch & Ý",
    subtitle: "Thổi hồn phong cách Bắc Âu Scandinavian vào nếp sống Việt",
    desc: "Cái bắt tay lịch sử cùng các nhà kiến tạo danh tiếng từ Đan Mạch và Ý đã mang đến ngôn ngữ thiết kế tối giản, thanh lịch nhưng vô cùng gần gũi. Từng kích thước, độ nghiêng đều được tối ưu theo vóc dáng và thói quen sinh hoạt của người Việt.",
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1600&q=85",
    highlight: "Ra mắt các bộ sưu tập kinh điển: Victoria, Coastal Living, Đương Đại",
    statLabel: "Bộ sưu tập hợp tác",
    statVal: "18+",
  },
  2022: {
    year: 2022,
    badge: "Phát Triển Bền Vững",
    title: "Cam Kết Xanh FSC & Công Nghệ Sơn Không VOC",
    subtitle: "Trân quý mẹ thiên nhiên và bảo vệ sức khỏe trọn vẹn",
    desc: "Nhà Xinh cam kết 100% gỗ tự nhiên được khai thác từ những cánh rừng tái sinh có chứng chỉ bảo vệ nghiêm ngặt FSC. Toàn bộ sơn phủ chuyển sang hệ sơn gốc nước không mùi, không phát thải hóa chất formaldehyde độc hại.",
    image: "https://images.unsplash.com/photo-1540518614846-7ede433c4ef7?auto=format&fit=crop&w=1600&q=85",
    highlight: "Đạt chứng nhận tiêu chuẩn an toàn không gian sống chuẩn Châu Âu",
    statLabel: "Gỗ rừng trồng đạt chuẩn",
    statVal: "100%",
  },
  2026: {
    year: 2026,
    badge: "Tương Lai Trải Nghiệm",
    title: "Hệ Sinh Thái Không Gian Đa Chiều & May Đo Bespoke",
    subtitle: "Dẫn dắt xu hướng sống Modern Luxury và cá nhân hóa độc bản",
    desc: "Ứng dụng công nghệ quét mô phỏng 3D thực tế ảo kết hợp dịch vụ tư vấn may đo chuyên sâu cho từng căn biệt thự, penthouse. Khẳng định vững chắc vị thế thương hiệu nội thất sang trọng số một Việt Nam.",
    image: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1600&q=85",
    highlight: "Dẫn dắt xu hướng Modern Luxury, kiến tạo giá trị di sản cho muôn đời sau",
    statLabel: "Tổ ấm đồng hành",
    statVal: "50.000+",
  },
};

const CRAFTSMANSHIP_STEPS: CraftsmanshipStep[] = [
  {
    step: "01",
    title: "Nghiên Cứu Nhân Trắc Học & Bản Vẽ 3D Tỉ Lệ Vàng",
    sub: "Đo ni đóng giày theo thói quen sinh hoạt người Việt",
    desc: "Mọi sản phẩm của Nhà Xinh khởi đầu bằng việc đo đạc tỉ mỉ thói quen ngồi, nằm, độ nghiêng của cột sống và tầm với của người Việt. Mỗi góc bo, chiều cao mặt đệm sofa đều trải qua hàng chục lần hiệu chỉnh mô hình mẫu thực tế.",
    image: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1200&q=85",
    points: [
      "Bản vẽ 3D cấu trúc lực chuẩn xác từng milimet",
      "Góc tựa lưng tối ưu giải tỏa áp lực cột sống",
      "Thử nghiệm chịu tải vượt 200% tiêu chuẩn quốc tế",
    ],
  },
  {
    step: "02",
    title: "Tuyển Chọn Gỗ Sồi Bắc Mỹ Chuẩn FSC & Da Bò Ý Tự Nhiên",
    sub: "Vật liệu tinh tuyển giữ trọn vẻ đẹp nguyên bản",
    desc: "Chúng tôi chỉ sử dụng gỗ sồi trắng Bắc Mỹ, gỗ óc chó loại 1 được sấy lò tiêu chuẩn độ ẩm dưới 12%, đảm bảo không co ngót mối mọt trước khí hậu nhiệt đới ẩm Việt Nam. Da bò nhập khẩu từ Ý thuộc thảo mộc mềm mại và thoáng khí.",
    image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=85",
    points: [
      "100% Gỗ rừng trồng có chứng chỉ kiểm định FSC",
      "Da bò Ý lớp 1 (Full Grain) thuộc thảo mộc an toàn",
      "Vải nỉ cao cấp dệt sợi nano chống bám bụi bẩn",
    ],
  },
  {
    step: "03",
    title: "Nghệ Thuật Ghép Mộng Gỗ Truyền Thống Kết Hợp Tiện CNC",
    sub: "Độ bền chắc trăm năm từ bàn tay nghệ nhân",
    desc: "Khung sản phẩm được liên kết bằng kỹ thuật ghép mộng mòi truyền thống của nghệ nhân mộc tài hoa, không dùng đinh tán kim loại để gỗ tự thở và giãn nở tự nhiên. Kết hợp đường cắt CNC hiện đại tạo nên những đường lượn tinh tế.",
    image: "https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=1200&q=85",
    points: [
      "Kỹ thuật mộng âm dương gia tăng độ bền gấp 3 lần",
      "Chà nhám thủ công 5 bước mang lại bề mặt lụa mịn",
      "Bo viền thủ công mượt mà, an toàn tuyệt đối cho trẻ nhỏ",
    ],
  },
  {
    step: "04",
    title: "Kiểm Định 12 Điểm Chất Lượng & Bàn Giao Hoàn Thiện Tại Gia",
    sub: "Chăm chút từng góc nhỏ trong không gian của bạn",
    desc: "Trước khi xuất xưởng, mỗi sản phẩm trải qua quy trình kiểm định 12 điểm: độ phẳng tuyệt đối, độ êm mút nệm, liên kết khung và lớp sơn phủ bóng mờ bảo vệ. Đội ngũ kỹ thuật viên Nhà Xinh trực tiếp vận chuyển và sắp đặt chu đáo.",
    image: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=85",
    points: [
      "Kiểm tra chất lượng 12 tiêu chí nghiêm ngặt",
      "Đóng gói 3 lớp chống trầy xước chuyên dụng",
      "Bảo hành chính hãng 24 tháng & bảo trì trọn đời sản phẩm",
    ],
  },
];

export default function AboutPage() {
  const store = useStore();
  const [activeYear, setActiveYear] = useState<number>(1999);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);

  const currentMilestone = TIMELINE_DATA[activeYear] || TIMELINE_DATA[1999];
  const currentStep = CRAFTSMANSHIP_STEPS[activeStepIndex];

  return (
    <>
      <Header
        user={store.user}
        cartCount={store.cartCount}
        wishlistCount={store.wishlist.length}
      />

      <main className="min-h-screen bg-[#FAF8F5] text-[#1F1D1A]">
        {/* Breadcrumb Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-2 text-xs text-stone-500">
          <Link to="/" className="hover:text-[#B86B49] transition-colors">
            Trang chủ
          </Link>
          <ChevronRight size={13} className="text-stone-400" />
          <span className="font-semibold text-stone-900">Giới thiệu Nhà Xinh</span>
        </div>

        {/* ── 1. GRAND CINEMATIC HERO (Ảnh lớn, tràn viền ấn tượng) ── */}
        <section className="relative w-full min-h-[70vh] sm:min-h-[82vh] flex items-center justify-center overflow-hidden bg-stone-950 text-white">
          {/* Background Photo */}
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 scale-102"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=2000&q=90')",
            }}
          />
          {/* Gradient Overlay for high-contrast readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/65 to-black/30" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-stone-950/40 to-stone-950/90" />

          {/* Hero Content */}
          <div className="relative z-10 max-w-5xl mx-auto px-6 py-20 text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[#F5BA9C] text-xs font-semibold tracking-widest uppercase shadow-sm">
              <Sparkles size={14} className="text-[#D26E4B]" />
              <span>Thương hiệu nội thất hàng đầu Việt Nam từ 1999</span>
            </div>

            <h1 className="text-3xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.12]">
              27 Năm Kiến Tạo <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F5BA9C] via-[#E29377] to-[#D26E4B] italic font-normal">
                Không Gian Sống Tinh Hoa
              </span>
            </h1>

            <p className="text-stone-200 text-sm sm:text-lg max-w-2xl mx-auto font-light leading-relaxed">
              Hòa quyện giữa thẩm mỹ Bắc Âu thanh lịch và hồn cốt tổ ấm Việt, mang đến những không gian sống an yên, bền vững và tràn đầy cảm xúc.
            </p>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/san-pham"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#B86B49] hover:bg-[#9E5738] text-white font-semibold text-xs sm:text-sm tracking-wide transition-all shadow-xl hover:scale-102"
              >
                <span>Khám phá bộ sưu tập</span>
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/he-thong-showroom"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm tracking-wide border border-white/30 backdrop-blur-md transition-all"
              >
                <MapPin size={15} />
                <span>Tham quan 12 Showroom</span>
              </Link>
            </div>
          </div>
        </section>

        {/* ── 2. STATS BAR (Khoảng trắng rộng, thiết kế tối giản) ── */}
        <section className="bg-white border-b border-stone-200">
          <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-2 lg:grid-cols-4 gap-8 divide-y sm:divide-y-0 sm:divide-x divide-stone-200 text-center">
            <div className="pt-4 sm:pt-0">
              <p className="text-3xl sm:text-5xl font-bold text-[#B86B49] tracking-tight">27+</p>
              <p className="text-xs sm:text-sm text-stone-600 mt-2 font-medium uppercase tracking-wider">Năm Kiến Tạo Di Sản</p>
            </div>
            <div className="pt-4 sm:pt-0">
              <p className="text-3xl sm:text-5xl font-bold text-[#B86B49] tracking-tight">12</p>
              <p className="text-xs sm:text-sm text-stone-600 mt-2 font-medium uppercase tracking-wider">Showroom Khắp Toàn Quốc</p>
            </div>
            <div className="pt-4 sm:pt-0">
              <p className="text-3xl sm:text-5xl font-bold text-[#B86B49] tracking-tight">50.000+</p>
              <p className="text-xs sm:text-sm text-stone-600 mt-2 font-medium uppercase tracking-wider">Tổ Ấm Gia Đình Việt</p>
            </div>
            <div className="pt-4 sm:pt-0">
              <p className="text-3xl sm:text-5xl font-bold text-[#B86B49] tracking-tight">100%</p>
              <p className="text-xs sm:text-sm text-stone-600 mt-2 font-medium uppercase tracking-wider">Gỗ Kiểm Định FSC & An Toàn</p>
            </div>
          </div>
        </section>

        {/* ── 3. TRIẾT LÝ SỐNG & CÂU CHUYỆN THƯƠNG HIỆU (Ảnh lớn, Bố cục Tạp chí) ── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Cột văn bản: 5 cột */}
            <div className="lg:col-span-5 space-y-6">
              <div className="inline-block">
                <span className="text-xs font-bold uppercase tracking-widest text-[#B86B49] bg-[#B86B49]/10 px-3 py-1 rounded-full">
                  Triết lý thiết kế
                </span>
              </div>

              <h2 className="text-2xl sm:text-4xl font-bold text-stone-900 leading-tight">
                Không chỉ là nội thất, <br />
                <span className="italic font-normal text-[#B86B49]">đó là nơi khởi nguồn của bình yên</span>
              </h2>

              <div className="space-y-4 text-stone-600 text-sm sm:text-base leading-relaxed font-light">
                <p>
                  Nhà Xinh tin rằng mỗi ngôi nhà đều mang trong mình một linh hồn riêng biệt. Một không gian sống đúng nghĩa không cần phô trương sự cầu kỳ, mà cần sự nâng niu vừa vặn trong từng trải nghiệm chạm, ngồi và ngắm nhìn.
                </p>
                <p>
                  Chúng tôi tỉ mỉ chọn lựa từng thớ gỗ sồi tự nhiên, từng tảng da bò thuộc thảo mộc nguyên bản không hóa chất để giữ trọn vẹn nét mộc mạc ấm cúng, đồng thời mang hơi thở thẩm mỹ quốc tế vào căn nhà của bạn.
                </p>
              </div>

              {/* Quote box sang trọng */}
              <div className="p-5 rounded-2xl bg-amber-50/70 border-l-4 border-[#B86B49] text-stone-800 space-y-1">
                <p className="text-xs sm:text-sm italic text-stone-700 font-medium">
                  “Cái đẹp tối thượng trong kiến trúc là khi sự tiện nghi công năng hòa quyện vào xúc cảm của người thụ hưởng.”
                </p>
                <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                  — Đội ngũ Kiến trúc sư Nhà Xinh
                </span>
              </div>

              <div className="pt-2 flex items-center gap-4">
                <Link
                  to="/tu-van-thiet-ke"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-stone-900 hover:bg-[#B86B49] text-white font-medium text-xs sm:text-sm transition-colors shadow-md"
                >
                  <span>Đăng ký tư vấn thiết kế</span>
                  <ArrowRight size={15} />
                </Link>
                <Link
                  to="/bo-suu-tap"
                  className="text-xs sm:text-sm font-semibold text-[#B86B49] hover:underline"
                >
                  Xem các bộ sưu tập →
                </Link>
              </div>
            </div>

            {/* Cột ảnh lớn bắt mắt: 7 cột */}
            <div className="lg:col-span-7 relative">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-stone-200/90 aspect-[4/3] sm:aspect-[16/11]">
                <img
                  src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=90"
                  alt="Không gian phòng khách Nhà Xinh cao cấp"
                  className="w-full h-full object-cover transition-transform duration-1000 hover:scale-104"
                />
              </div>

              {/* Floating Badge Bảo hành & Đẳng cấp */}
              <div className="absolute -bottom-8 -left-6 bg-white/95 backdrop-blur-md p-5 sm:p-6 rounded-2xl shadow-2xl border border-stone-200 max-w-xs hidden sm:block">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 text-[#B86B49] flex items-center justify-center shrink-0 shadow-xs">
                    <ShieldCheck size={26} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-stone-900">Bảo Hành Chính Hãng</h4>
                    <p className="text-xs text-stone-500 mt-0.5">2 năm bảo hành & trọn đời bảo trì tại gia</p>
                  </div>
                </div>
              </div>

              {/* Floating Detail Badge góc trên */}
              <div className="absolute top-6 right-6 bg-stone-950/75 backdrop-blur-md text-white px-4 py-2 rounded-xl text-xs font-medium border border-white/20 hidden sm:flex items-center gap-2 shadow-lg">
                <Sparkles size={13} className="text-[#E29377]" />
                <span>Không gian mẫu Biệt thự Solasta Mansion</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── 4. LOOKBOOK GALLERY: HÌNH ẢNH TO BẮT MẮT ── */}
        <section className="bg-white py-20 border-y border-stone-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="text-xs font-bold uppercase tracking-widest text-[#B86B49]">
                Thư viện không gian thực tế
              </span>
              <h2 className="text-2xl sm:text-4xl font-bold text-stone-900">
                Khơi Nguồn Cảm Hứng Cho Tổ Ấm
              </h2>
              <p className="text-xs sm:text-sm text-stone-500 font-light">
                Hình ảnh thực tế những công trình nội thất được kiến tạo bởi đội ngũ kiến trúc sư và thợ thủ công Nhà Xinh.
              </p>
            </div>

            {/* Gallery Grid: 1 Ảnh lớn 2/3 + 2 Ảnh xếp chồng 1/3 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Ảnh lớn chính (chiếm 8 cột) */}
              <div className="lg:col-span-8 group relative rounded-3xl overflow-hidden h-[340px] sm:h-[500px] shadow-lg border border-stone-200">
                <img
                  src="https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1600&q=90"
                  alt="Phòng khách phong cách Modern Luxury"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-104"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent flex flex-col justify-end p-6 sm:p-8 text-white">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#F5BA9C]">Bộ Sưu Tập Victoria</span>
                  <h3 className="text-xl sm:text-2xl font-bold mt-1">Không Gian Phòng Khách Sang Trọng & Ấm Cúng</h3>
                  <p className="text-xs sm:text-sm text-stone-300 font-light max-w-lg mt-1 hidden sm:block">
                    Sự kết hợp ăn ý giữa sofa da bò màu nâu cognac và bàn trà đá marble tự nhiên nguyên khối.
                  </p>
                </div>
              </div>

              {/* 2 Ảnh phụ xếp chồng (chiếm 4 cột) */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                <div className="group relative rounded-3xl overflow-hidden h-[235px] shadow-md border border-stone-200">
                  <img
                    src="https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1000&q=85"
                    alt="Phòng ăn gia đình sum vầy"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-104"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent flex flex-col justify-end p-5 text-white">
                    <span className="text-xs font-semibold text-[#F5BA9C]">Phòng Ăn Sum Vầy</span>
                    <h4 className="text-base font-bold mt-0.5">Bàn Ăn Mở Rộng Thông Minh</h4>
                  </div>
                </div>

                <div className="group relative rounded-3xl overflow-hidden h-[235px] shadow-md border border-stone-200">
                  <img
                    src="https://images.unsplash.com/photo-1540518614846-7ede433c4ef7?auto=format&fit=crop&w=1000&q=85"
                    alt="Phòng ngủ phong cách tối giản thanh lịch"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-104"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent flex flex-col justify-end p-5 text-white">
                    <span className="text-xs font-semibold text-[#F5BA9C]">Phòng Ngủ Tĩnh Tại</span>
                    <h4 className="text-base font-bold mt-0.5">Giường Bọc Nệm Tinh Tế</h4>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 5. INTERACTIVE TIMELINE: CHẶNG ĐƯỜNG 27 NĂM (Ảnh Lớn & Nổi Bật) ── */}
        <section className="py-20 lg:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-stone-300 pb-5">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#B86B49]">
                Dấu ấn thời gian
              </span>
              <h2 className="text-2xl sm:text-4xl font-bold text-stone-900 mt-1">
                Hành Trình 27 Năm Kiến Tạo Di Sản
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-stone-500 font-light">
              Bấm chọn từng mốc năm để khám phá câu chuyện lịch sử
            </p>
          </div>

          {/* Năm Selector Bar */}
          <div className="flex items-center gap-3 overflow-x-auto pb-3 scrollbar-none">
            {[1999, 2008, 2016, 2022, 2026].map((year) => {
              const isSelected = activeYear === year;
              return (
                <button
                  key={year}
                  type="button"
                  onClick={() => setActiveYear(year)}
                  className={`px-6 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? "bg-[#B86B49] text-white shadow-lg scale-102"
                      : "bg-white text-stone-700 hover:bg-stone-200/80 border border-stone-200"
                  }`}
                >
                  Năm {year}
                </button>
              );
            })}
          </div>

          {/* Active Milestone Card (Ảnh cực lớn 500px, Watermark năm hoành tráng) */}
          <div className="relative rounded-3xl bg-white border border-stone-200/90 shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 animate-in fade-in duration-500">
            {/* Cột chữ: 5 cột */}
            <div className="lg:col-span-5 p-8 sm:p-12 flex flex-col justify-between space-y-6 relative z-10 bg-white">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-[#B86B49] uppercase tracking-wider bg-[#B86B49]/10 px-3 py-1 rounded-md">
                    {currentMilestone.badge}
                  </span>
                  <span className="text-xs text-stone-400 font-medium">Kỷ nguyên phát triển</span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-bold text-stone-900 leading-snug">
                  {currentMilestone.title}
                </h3>

                <p className="text-xs sm:text-sm text-[#B86B49] font-medium italic">
                  “{currentMilestone.subtitle}”
                </p>

                <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-light">
                  {currentMilestone.desc}
                </p>
              </div>

              {/* Highlight badge & stat */}
              <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
                <div>
                  <p className="text-2xl sm:text-3xl font-bold text-stone-900">{currentMilestone.statVal}</p>
                  <p className="text-[11px] text-stone-500 font-medium uppercase mt-0.5">{currentMilestone.statLabel}</p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#B86B49]">
                    <CheckCircle2 size={14} /> {currentMilestone.year}
                  </span>
                </div>
              </div>
            </div>

            {/* Cột ảnh lớn: 7 cột */}
            <div className="lg:col-span-7 relative h-72 sm:h-96 lg:h-[480px] bg-stone-100">
              <img
                src={currentMilestone.image}
                alt={currentMilestone.title}
                className="w-full h-full object-cover transition-transform duration-1000 hover:scale-103"
                loading="lazy"
              />
              <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full border border-white/20">
                Tư liệu lịch sử {currentMilestone.year}
              </div>
            </div>
          </div>
        </section>

        {/* ── 6. NGHỆ THUẬT CHẾ TÁC THỦ CÔNG 4 BƯỚC (Stepper Tương Tác) ── */}
        <section className="bg-white py-20 lg:py-28 border-y border-stone-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="text-xs font-bold uppercase tracking-widest text-[#B86B49]">
                Kỹ nghệ bậc thầy
              </span>
              <h2 className="text-2xl sm:text-4xl font-bold text-stone-900">
                Quy Trình Chế Tác Thủ Công Tinh Xảo
              </h2>
              <p className="text-xs sm:text-sm text-stone-500 font-light">
                Từng mối ghép mộng, từng lớp chà nhám thủ công đều phản ánh sự tận tụy của những nghệ nhân mộc tài hoa bậc nhất.
              </p>
            </div>

            {/* Stepper Selector Tabs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {CRAFTSMANSHIP_STEPS.map((item, idx) => {
                const isSelected = activeStepIndex === idx;
                return (
                  <button
                    key={item.step}
                    type="button"
                    onClick={() => setActiveStepIndex(idx)}
                    className={`p-5 sm:p-6 rounded-2xl text-left transition-all border-2 cursor-pointer ${
                      isSelected
                        ? "border-[#B86B49] bg-white shadow-xl scale-102"
                        : "border-stone-200 bg-stone-50 hover:bg-stone-100"
                    }`}
                  >
                    <span
                      className={`text-xs font-bold block ${
                        isSelected ? "text-[#B86B49]" : "text-stone-400"
                      }`}
                    >
                      BƯỚC {item.step}
                    </span>
                    <h4 className="font-semibold text-xs sm:text-sm text-stone-900 mt-1 line-clamp-1">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-stone-500 mt-1 line-clamp-1">
                      {item.sub}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Stepper Card lớn trực quan */}
            <div className="rounded-3xl bg-[#FAF8F5] border border-stone-200 p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5 space-y-5">
                <span className="text-xs font-bold text-[#B86B49] uppercase tracking-wider bg-[#B86B49]/10 px-3 py-1 rounded-md">
                  Giai đoạn {currentStep.step} / {CRAFTSMANSHIP_STEPS.length}
                </span>

                <h3 className="text-xl sm:text-3xl font-bold text-stone-900 leading-snug">
                  {currentStep.title}
                </h3>

                <p className="text-xs sm:text-sm text-[#B86B49] font-medium italic">
                  {currentStep.sub}
                </p>

                <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-light">
                  {currentStep.desc}
                </p>

                <div className="pt-2 space-y-2.5">
                  {currentStep.points.map((pt, pIdx) => (
                    <div key={pIdx} className="flex items-center gap-2.5 text-xs sm:text-sm text-stone-800">
                      <div className="w-5 h-5 rounded-full bg-[#B86B49]/15 text-[#B86B49] flex items-center justify-center shrink-0">
                        <Check size={12} />
                      </div>
                      <span className="font-medium">{pt}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Khung ảnh to bắt mắt */}
              <div className="lg:col-span-7 rounded-2xl overflow-hidden h-72 sm:h-96 shadow-xl border border-stone-300">
                <img
                  src={currentStep.image}
                  alt={currentStep.title}
                  className="w-full h-full object-cover transition-transform duration-700 hover:scale-104"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── 7. TRÁCH NHIỆM XANH & PHÁT TRIỂN BỀN VỮNG (Full-Width Forest Banner) ── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="relative rounded-3xl overflow-hidden bg-emerald-950 text-white p-8 sm:p-16 shadow-2xl">
            <div className="relative z-10 max-w-2xl space-y-5">
              <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-800/80 text-emerald-200 text-xs font-semibold uppercase tracking-wider border border-emerald-700">
                <Leaf size={14} /> Phát Triển Bền Vững & Sống Xanh
              </span>

              <h3 className="text-2xl sm:text-4xl font-bold text-white leading-tight">
                Gìn Giữ Màu Xanh Rừng Tự Nhiên Cho Thế Hệ Mai Sau
              </h3>

              <p className="text-xs sm:text-base text-emerald-100 font-light leading-relaxed">
                Nhà Xinh kiên định với mục tiêu giảm thiểu tối đa dấu chân carbon trong ngành nội thất. 100% gỗ tự nhiên được khai thác từ những cánh rừng tái sinh có chứng chỉ bảo tồn quốc tế FSC. Chúng tôi nói không với hóa chất độc hại, mang lại nguồn năng lượng sống an lành nhất cho mỗi tổ ấm.
              </p>

              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-emerald-900/80 p-4 rounded-2xl border border-emerald-800 backdrop-blur-xs">
                  <p className="font-bold text-white text-sm">Chứng Chỉ FSC Rừng Tái Sinh</p>
                  <p className="text-emerald-200 mt-1">Nguồn gỗ được giám sát chuỗi hành trình nghiêm ngặt</p>
                </div>
                <div className="bg-emerald-900/80 p-4 rounded-2xl border border-emerald-800 backdrop-blur-xs">
                  <p className="font-bold text-white text-sm">Hệ Sơn Nước Không Mùi Low-VOC</p>
                  <p className="text-emerald-200 mt-1">Không formaldehyde, thân thiện tuyệt đối với trẻ nhỏ</p>
                </div>
              </div>
            </div>

            {/* Background art glow */}
            <div className="absolute -right-20 -bottom-20 w-96 h-96 rounded-full bg-emerald-800/20 blur-3xl pointer-events-none" />
          </div>
        </section>

        {/* ── 8. KÊU GỌI HÀNH ĐỘNG & KẾT NỐI SHOWROOM FLAGSHIP ── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 text-center">
          <div className="relative rounded-3xl overflow-hidden bg-stone-900 text-white p-10 sm:p-16 shadow-2xl">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-30"
              style={{
                backgroundImage:
                  "url('https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1600&q=80')",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-900/90 to-stone-950/80" />

            <div className="relative z-10 max-w-2xl mx-auto space-y-5">
              <span className="text-xs uppercase tracking-widest text-[#D26E4B] font-semibold">
                Đồng hành cùng bạn
              </span>
              <h3 className="text-2xl sm:text-4xl font-bold text-white">
                Sẵn Sàng Kiến Tạo Không Gian Mơ Ước?
              </h3>
              <p className="text-stone-300 text-xs sm:text-base font-light leading-relaxed">
                Đội ngũ kiến trúc sư chuyên nghiệp tại Nhà Xinh luôn sẵn sàng lắng nghe ý tưởng và mang đến bản vẽ phối cảnh 3D hoàn toàn miễn phí cho ngôi nhà của bạn.
              </p>
              <div className="pt-3 flex flex-wrap items-center justify-center gap-4">
                <Link
                  to="/tu-van-thiet-ke"
                  className="px-8 py-3.5 rounded-full bg-[#B86B49] hover:bg-[#9E5738] text-white font-semibold text-xs sm:text-sm tracking-wide transition-all shadow-xl hover:scale-102"
                >
                  Đăng ký tư vấn thiết kế 3D
                </Link>
                <Link
                  to="/he-thong-showroom"
                  className="px-8 py-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm tracking-wide border border-white/25 transition-all backdrop-blur-md"
                >
                  Xem hệ thống 12 showroom
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

