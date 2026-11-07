import { useState } from "react";
import { Link } from "react-router-dom";
import {
  MapPin,
  Phone,
  Clock,
  Navigation,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Coffee,
  Car,
  Layers,
} from "lucide-react";
import Header from "../components/Headers";
import Footer from "../components/Footer";
import { useStore } from "../hooks/useStore";
import { HOTLINE } from "../util/CONSTRAINT";

interface ShowroomItem {
  id: string;
  name: string;
  city: "hcm" | "hn" | "bd";
  cityName: string;
  address: string;
  phone: string;
  hours: string;
  image: string;
  features: string[];
  mapUrl: string;
}

const SHOWROOMS: ShowroomItem[] = [
  // TP. HỒ CHÍ MINH
  {
    id: "hcm-le-loi",
    name: "Showroom Nhà Xinh Lê Lợi",
    city: "hcm",
    cityName: "TP. Hồ Chí Minh",
    address: "65 Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
    phone: "(028) 3821 0352",
    hours: "08:30 – 21:00 (Tất cả các ngày)",
    image:
      "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1000&q=80",
    features: [
      "Showroom Flagship trung tâm Quận 1",
      "Khu trưng bày bộ sưu tập cao cấp 1.200m²",
      "Phòng tư vấn thiết kế 3D chuyên sâu",
      "Khu tiếp khách & cà phê miễn phí",
    ],
    mapUrl: "https://maps.google.com/?q=65+Le+Loi+Ben+Nghe+District+1+Ho+Chi+Minh",
  },
  {
    id: "hcm-thao-dien",
    name: "Showroom Nhà Xinh Thảo Điền",
    city: "hcm",
    cityName: "TP. Hồ Chí Minh",
    address: "107 - 109 Xa Lộ Hà Nội, Phường Thảo Điền, TP. Thủ Đức, TP. Hồ Chí Minh",
    phone: "(028) 3519 2038",
    hours: "08:30 – 21:00 (Tất cả các ngày)",
    image:
      "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1000&q=80",
    features: [
      "Không gian mở 3 tầng hiện đại",
      "Bãi đỗ ô tô rộng rãi, thuận tiện",
      "Trưng bày đầy đủ nội thất biệt thự & căn hộ",
      "Vật liệu da Ý, vải Bỉ & gỗ sồi tự nhiên",
    ],
    mapUrl: "https://maps.google.com/?q=107+Xa+Lo+Ha+Noi+Thao+Dien+Thu+Duc",
  },
  {
    id: "hcm-phu-my-hung",
    name: "Showroom Nhà Xinh Phú Mỹ Hưng",
    city: "hcm",
    cityName: "TP. Hồ Chí Minh",
    address: "CR3 - Khu Hồ Bán Nguyệt, 111 Tôn Dật Tiên, Phường Tân Phú, Quận 7, TP. Hồ Chí Minh",
    phone: "(028) 5413 7355",
    hours: "08:30 – 21:00 (Tất cả các ngày)",
    image:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80",
    features: [
      "Tầm nhìn Hồ Bán Nguyệt thoáng đãng",
      "Mô hình không gian sống ven hồ cao cấp",
      "Khu trưng bày bộ sưu tập Osaka & Scandinavian",
      "Chuyên viên thiết kế tư vấn tại chỗ",
    ],
    mapUrl: "https://maps.google.com/?q=111+Ton+Dat+Tien+Tan+Phu+District+7+Ho+Chi+Minh",
  },

  // HÀ NỘI
  {
    id: "hn-trung-kinh",
    name: "Showroom Nhà Xinh Trung Kính",
    city: "hn",
    cityName: "Hà Nội",
    address: "Tòa nhà F4, Phố Trung Kính, Phường Yên Hòa, Quận Cầu Giấy, Hà Nội",
    phone: "(024) 3782 1761",
    hours: "08:30 – 20:30 (Tất cả các ngày)",
    image:
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=80",
    features: [
      "Quy mô 4 tầng hơn 1.500m² sàn",
      "Khu trải nghiệm căn hộ mẫu thông minh",
      "Hầm đỗ ô tô thuận tiện",
      "Tư vấn giải pháp tổng thể kiến trúc & nội thất",
    ],
    mapUrl: "https://maps.google.com/?q=F4+Trung+Kinh+Yen+Hoa+Cau+Giay+Ha+Noi",
  },
  {
    id: "hn-vincom-nguyen-chi-thanh",
    name: "Showroom Nhà Xinh Vincom Nguyễn Chí Thanh",
    city: "hn",
    cityName: "Hà Nội",
    address: "Tầng 3, TTTM Vincom Center, 54A Nguyễn Chí Thanh, Quận Đống Đa, Hà Nội",
    phone: "(024) 3761 7666",
    hours: "09:00 – 21:30 (Tất cả các ngày)",
    image:
      "https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&w=1000&q=80",
    features: [
      "Vị trí trung tâm thương mại sầm uất",
      "Trưng bày các sản phẩm gọn gàng, tinh tế",
      "Ưu đãi đặc quyền cho cư dân Vincom",
      "Hỗ trợ giao hàng & lắp đặt nhanh 24h",
    ],
    mapUrl: "https://maps.google.com/?q=54A+Nguyen+Chi+Thanh+Dong+Da+Ha+Noi",
  },
  {
    id: "hn-ton-duc-thang",
    name: "Showroom Nhà Xinh Tôn Đức Thắng",
    city: "hn",
    cityName: "Hà Nội",
    address: "Số 12 Tôn Đức Thắng, Phường Cát Linh, Quận Đống Đa, Hà Nội",
    phone: "(024) 3736 8166",
    hours: "08:30 – 20:30 (Tất cả các ngày)",
    image:
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1000&q=80",
    features: [
      "Điểm đến nội thất quen thuộc tại thủ đô",
      "Bộ sưu tập phòng khách & phòng ăn phong phú",
      "Đội ngũ kiến trúc sư tư vấn tận tâm",
      "Chính sách bảo hành vàng 24 tháng",
    ],
    mapUrl: "https://maps.google.com/?q=12+Ton+Duc+Thang+Cat+Linh+Dong+Da+Ha+Noi",
  },

  // BÌNH DƯƠNG
  {
    id: "bd-dai-lo-binh-duong",
    name: "Showroom Nhà Xinh Bình Dương",
    city: "bd",
    cityName: "Bình Dương",
    address: "430 Đại lộ Bình Dương, Phường Phú Hòa, TP. Thủ Dầu Một, Bình Dương",
    phone: "(0274) 381 4333",
    hours: "08:30 – 20:30 (Tất cả các ngày)",
    image:
      "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1000&q=80",
    features: [
      "Mặt tiền đại lộ lớn, giao thông kết nối tiện lợi",
      "Không gian trưng bày thoáng đãng 800m²",
      "Phục vụ cư dân căn hộ & biệt thự chuyên gia",
      "Bảo trì & giao hàng nhanh toàn khu vực Đông Nam Bộ",
    ],
    mapUrl: "https://maps.google.com/?q=430+Dai+Lo+Binh+Duong+Phu+Hoa+Thu+Dau+Mot",
  },
];

export default function ShowroomPage() {
  const store = useStore();
  const [selectedCity, setSelectedCity] = useState<"all" | "hcm" | "hn" | "bd">("all");

  const filtered =
    selectedCity === "all"
      ? SHOWROOMS
      : SHOWROOMS.filter((s) => s.city === selectedCity);

  return (
    <>
      <Header
        user={store.user}
        cartCount={store.cartCount}
        wishlistCount={store.wishlist.length}
      />

      <main className="min-h-screen bg-[#faf8f5] text-[#1f1d1a] pb-16">
        {/* Breadcrumb */}
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center gap-1.5 text-xs text-stone-500">
          <Link to="/" className="hover:text-[#b86b49] transition-colors">
            Trang chủ
          </Link>
          <ChevronRight size={13} />
          <span className="font-semibold text-stone-800">Hệ thống showroom</span>
        </div>

        {/* Hero Banner */}
        <section className="relative overflow-hidden bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950 text-white py-14 sm:py-20 px-4">
          <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#d26e4b_1px,transparent_1px)] [background-size:16px_16px]" />
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#d26e4b]/20 border border-[#d26e4b]/40 text-[#f5ba9c] text-xs font-semibold tracking-wider uppercase mb-3.5">
              <Sparkles size={14} /> Trải nghiệm không gian sống thực tế
            </span>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-serif font-bold tracking-tight mb-4">
              Hệ Thống Showroom Nhà Xinh
            </h1>
            <p className="text-stone-300 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto font-light">
              Mời quý khách ghé thăm hơn 10 showroom quy mô lớn trên toàn quốc để trực
              tiếp cảm nhận chất liệu da bò Ý, gỗ tự nhiên cao cấp và nhận bản phác
              thảo thiết kế không gian 3D hoàn toàn miễn phí.
            </p>

            {/* Quick Hotline Pill */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs sm:text-sm">
              <a
                href={HOTLINE.href}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#b86b49] hover:bg-[#a05a3b] text-white font-semibold transition-all shadow-md active:scale-95"
              >
                <Phone size={15} /> Hotline toàn quốc: {HOTLINE.label}
              </a>
              <a
                href="https://zalo.me/0974933486"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium border border-white/20 transition-all backdrop-blur-xs"
              >
                Đặt lịch tư vấn showroom
              </a>
            </div>
          </div>
        </section>

        {/* Highlights Strip */}
        <section className="border-y border-stone-200 bg-white shadow-2xs">
          <div className="max-w-6xl mx-auto px-4 py-5 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#b86b49] flex items-center justify-center shrink-0">
                <Layers size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-stone-900">Không gian rộng lớn</p>
                <p className="text-[11px] text-stone-500">Quy mô từ 800m² - 1.500m²</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#b86b49] flex items-center justify-center shrink-0">
                <Car size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-stone-900">Đậu ô tô thuận tiện</p>
                <p className="text-[11px] text-stone-500">Bãi đỗ rộng & an ninh miễn phí</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#b86b49] flex items-center justify-center shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-stone-900">Vật liệu kiểm định</p>
                <p className="text-[11px] text-stone-500">Cảm nhận da Ý & gỗ thật</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#b86b49] flex items-center justify-center shrink-0">
                <Coffee size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-stone-900">Tiếp đãi tận tâm</p>
                <p className="text-[11px] text-stone-500">Cà phê & tư vấn kiến trúc sư</p>
              </div>
            </div>
          </div>
        </section>

        {/* City Filter Tabs */}
        <section className="max-w-6xl mx-auto px-4 pt-10 pb-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-4">
            <div>
              <h2 className="text-xl font-serif font-bold text-stone-900">
                Danh sách địa chỉ Showroom ({filtered.length} địa điểm)
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Mở cửa đón khách tất cả các ngày trong tuần
              </p>
            </div>

            <div className="inline-flex p-1 rounded-xl bg-stone-200/60 border border-stone-300/60">
              {(
                [
                  { key: "all", label: "Tất cả địa điểm" },
                  { key: "hcm", label: "TP. Hồ Chí Minh" },
                  { key: "hn", label: "Hà Nội" },
                  { key: "bd", label: "Bình Dương" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSelectedCity(tab.key)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    selectedCity === tab.key
                      ? "bg-white text-stone-900 shadow-xs"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Showroom Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {filtered.map((s) => (
              <div
                key={s.id}
                className="bg-white rounded-2xl border border-stone-200/90 overflow-hidden shadow-xs hover:shadow-lg transition-all flex flex-col group"
              >
                {/* Image */}
                <div className="relative h-48 w-full overflow-hidden bg-stone-100">
                  <img
                    src={s.image}
                    alt={s.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 rounded-md bg-stone-900/80 backdrop-blur-xs text-white text-[11px] font-semibold">
                      {s.cityName}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-serif font-bold text-stone-900 text-base group-hover:text-[#b86b49] transition-colors">
                      {s.name}
                    </h3>

                    <div className="mt-3 space-y-2 text-xs text-stone-600">
                      <div className="flex items-start gap-2">
                        <MapPin size={15} className="text-[#b86b49] shrink-0 mt-0.5" />
                        <span className="leading-snug">{s.address}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="text-[#b86b49] shrink-0" />
                        <a
                          href={`tel:${s.phone.replace(/[^0-9]/g, "")}`}
                          className="font-medium text-stone-800 hover:text-[#b86b49] transition-colors"
                        >
                          {s.phone}
                        </a>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-stone-400 shrink-0" />
                        <span>{s.hours}</span>
                      </div>
                    </div>

                    {/* Features list */}
                    <div className="mt-4 pt-3 border-t border-stone-100">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-1.5">
                        Tiện ích tại showroom:
                      </p>
                      <ul className="space-y-1">
                        {s.features.map((feat, idx) => (
                          <li
                            key={idx}
                            className="text-[11.5px] text-stone-600 flex items-center gap-1.5"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-[#b86b49] shrink-0" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-5 pt-3 border-t border-stone-100 flex items-center gap-2">
                    <a
                      href={s.mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold transition-colors"
                    >
                      <Navigation size={13} className="text-[#b86b49]" />
                      <span>Chỉ đường</span>
                    </a>
                    <a
                      href={`tel:${s.phone.replace(/[^0-9]/g, "")}`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#b86b49] hover:bg-[#a05a3b] text-white text-xs font-semibold transition-colors shadow-2xs"
                    >
                      <Phone size={13} />
                      <span>Gọi ngay</span>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Customer Support CTA */}
        <section className="max-w-6xl mx-auto px-4 mt-12">
          <div className="rounded-2xl bg-gradient-to-r from-[#dfc8b4] to-[#f4ebe2] border border-[#d6ba9f]/60 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#934c2d]">
                Dịch vụ khách hàng cao cấp
              </span>
              <h3 className="text-lg sm:text-2xl font-serif font-bold text-stone-900 mt-1">
                Quý khách cần xe đưa đón tham quan showroom hoặc tư vấn tại nhà?
              </h3>
              <p className="text-xs sm:text-sm text-stone-700 mt-1.5 max-w-xl">
                Nhà Xinh hỗ trợ đặt lịch hẹn riêng với Kiến trúc sư trưởng và chuyên
                viên vật liệu hoàn toàn miễn phí.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <a
                href={HOTLINE.href}
                className="px-5 py-3 rounded-xl bg-[#b86b49] hover:bg-[#a05a3b] text-white text-xs sm:text-sm font-bold shadow-md transition-all whitespace-nowrap"
              >
                Gọi {HOTLINE.label}
              </a>
              <Link
                to="/tu-van-thiet-ke"
                className="px-5 py-3 rounded-xl bg-white hover:bg-stone-50 text-stone-800 text-xs sm:text-sm font-bold border border-stone-300 shadow-2xs transition-all whitespace-nowrap"
              >
                Đăng ký tư vấn
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

