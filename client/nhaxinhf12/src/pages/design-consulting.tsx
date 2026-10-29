import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  Calculator,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Clock,
  Home,
  Sliders,
  Palette,
} from "lucide-react";
import Header from "../components/Headers";
import Footer from "../components/Footer";
import { useStore } from "../hooks/useStore";
import "./pages.css";
import "./design-consulting.css";

const vnd = (n: number) => Number(n).toLocaleString("vi-VN") + " ₫";

interface StyleOption {
  id: string;
  name: string;
  tag: string;
  desc: string;
  materials: string;
  image: string;
  ratePerM2: number;
}

const DESIGN_STYLES: StyleOption[] = [
  {
    id: "modern",
    name: "Modern Luxury",
    tag: "Hiện đại & Tinh tế",
    desc: "Đường nét kỷ hà dứt khoát, kết hợp kính cường lực, kim loại mạ PVD và đá cẩm thạch mang lại cảm giác rộng mở, quyền quý.",
    materials: "Đá Marble • Khung hợp kim titan • Gỗ sồi hun khói",
    image: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80",
    ratePerM2: 320000,
  },
  {
    id: "japandi",
    name: "Japandi Zen",
    tag: "Nhật Bản & Bắc Âu",
    desc: "Sự kết hợp hoàn hảo giữa triết lý Wabi-Sabi mộc mạc và sự thanh lịch của vùng Scandinavia, tối ưu ánh sáng tự nhiên.",
    materials: "Gỗ sồi trắng • Vải Linen tự nhiên • Mây đan thủ công",
    image: "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80",
    ratePerM2: 280000,
  },
  {
    id: "neoclassic",
    name: "Neo-Classical",
    tag: "Tân Cổ Điển Quý Phái",
    desc: "Tỷ lệ vàng kiến trúc với những đường phào chỉ thanh thoát, đệm bọc da bò Ý may chần múi và sắc gỗ ấm áp sang trọng.",
    materials: "Da bò Ý • Gỗ tần bì nhập khẩu • Phào chỉ nghệ thuật",
    image: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80",
    ratePerM2: 380000,
  },
  {
    id: "tropical",
    name: "Coastal & Resort",
    tag: "Nghỉ Dưỡng Nhiệt Đới",
    desc: "Mang làn gió đại dương và năng lượng thư thái của resort 5 sao vào căn nhà, tạo cảm giác an yên sau ngày làm việc.",
    materials: "Gỗ Teak chịu ẩm • Đá tự nhiên • Gam màu cát biển",
    image: "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=800&q=80",
    ratePerM2: 300000,
  },
];

const REAL_PROJECTS = [
  {
    id: "p-1",
    title: "Penthouse The River Thủ Thiêm",
    space: "Căn hộ Penthouse • 240m²",
    style: "Modern Luxury",
    duration: "45 ngày hoàn thiện",
    image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "p-2",
    title: "Biệt thự Đơn Lập Aqua City",
    space: "Biệt thự ven sông • 380m²",
    style: "Tân Cổ Điển",
    duration: "60 ngày hoàn thiện",
    image: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "p-3",
    title: "Duplex Vinhomes Central Park",
    space: "Căn hộ Duplex • 165m²",
    style: "Japandi Zen",
    duration: "30 ngày hoàn thiện",
    image: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=800&q=80",
  },
];

export default function DesignConsultingPage() {
  const { user, cartCount, wishlist } = useStore();

  // State Dự toán chi phí thiết kế tương tác
  const [houseType, setHouseType] = useState<"apartment" | "townhouse" | "villa">("apartment");
  const [area, setArea] = useState<number>(85);
  const [packageType, setPackageType] = useState<"concept" | "full3d" | "turnkey">("full3d");
  const [selectedStyle, setSelectedStyle] = useState<string>("modern");

  // State Form đặt lịch hẹn KTS
  const [bookingForm, setBookingForm] = useState({
    name: user?.fullName || "",
    phone: user?.phone || "",
    email: user?.email || "",
    city: "TP. Hồ Chí Minh",
    address: "",
    meetingType: "showroom" as "showroom" | "online" | "home",
    note: "",
  });
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Tính toán đơn giá và tổng dự toán
  const estimate = useMemo(() => {
    const curStyle = DESIGN_STYLES.find((s) => s.id === selectedStyle) || DESIGN_STYLES[0];
    let baseRate = curStyle.ratePerM2;

    if (houseType === "townhouse") baseRate *= 1.15;
    if (houseType === "villa") baseRate *= 1.35;

    let multiplier = 1.0;
    if (packageType === "concept") multiplier = 0.65;
    if (packageType === "turnkey") multiplier = 1.4;

    const designFee = Math.round(area * baseRate * multiplier);
    const furnitureEstimated = Math.round(area * (houseType === "villa" ? 8500000 : 5500000));

    return {
      designFee,
      furnitureEstimated,
      timelineDays: Math.min(60, Math.max(15, Math.round(area * 0.25))),
    };
  }, [houseType, area, packageType, selectedStyle]);

  const handleSubmitBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingForm.phone.trim()) return;
    setBookingSuccess(true);
    setTimeout(() => {
      window.scrollTo({ top: 400, behavior: "smooth" });
    }, 100);
  };

  return (
    <>
      <Header user={user} cartCount={cartCount} wishlistCount={wishlist.length} />

      <main className="page">
        {/* Breadcrumb */}
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Trang chủ</Link>
          <ChevronRight size={14} />
          <span className="current">Tư vấn thiết kế nội thất</span>
        </nav>

        {/* ── 1. Hero Studio ── */}
        <section className="des-hero">
          <img
            src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1600&q=85"
            alt="Xưởng thiết kế nội thất Nhà Xinh"
            className="des-hero-bg"
          />
          <div className="des-hero-content">
            <span className="des-hero-badge">
              <Sparkles size={14} /> NHÀ XINH INTERIOR DESIGN STUDIO
            </span>
            <h1 className="des-hero-title">
              Kiến Tạo Không Gian Sống Đậm Dấu Ấn Riêng Của Bạn
            </h1>
            <p className="des-hero-sub">
              Không chỉ là sắp đặt đồ đạc, đội ngũ Kiến trúc sư Nhà Xinh đồng hành cùng bạn từ ý tưởng ban đầu, dự toán ngân sách minh bạch đến hoàn thiện 3D và thi công chuẩn xác từng milimet.
            </p>
            <div className="des-hero-actions">
              <a href="#tinh-du-toan" className="des-btn-primary">
                <Calculator size={16} /> Bấm tính chi phí dự kiến
              </a>
              <a href="#dat-lich-hen" className="des-btn-ghost">
                <Calendar size={16} /> Đặt hẹn tư vấn 1-1 với KTS
              </a>
            </div>
          </div>
        </section>

        {/* ── 2. Bộ Công Cụ Tương Tác: Tự Tính Dự Toán Thiết Kế & Thi Công ── */}
        <section id="tinh-du-toan" className="des-sec">
          <div className="des-sec-head">
            <span className="des-sec-tag">CÔNG CỤ THÔNG MINH</span>
            <h2 className="des-sec-title">Dự Toán Chi Phí & Tiến Độ Tức Thì</h2>
            <p className="des-sec-sub">
              Tự do tùy chỉnh loại hình nhà, diện tích và phong cách để nhận bảng dự trù ngân sách thiết kế và đồ nội thất hoàn chỉnh ngay lập tức.
            </p>
          </div>

          <div className="des-calc-card">
            <div className="des-calc-grid">
              {/* Bên trái: Điều khiển tham số */}
              <div className="des-calc-options">
                {/* 1. Loại hình công trình */}
                <div>
                  <div className="des-calc-group-title">
                    <Home size={15} /> 1. Loại hình bất động sản
                  </div>
                  <div className="des-choice-pills">
                    {[
                      { id: "apartment", label: "Căn hộ chung cư" },
                      { id: "townhouse", label: "Nhà phố / Liền kề" },
                      { id: "villa", label: "Biệt thự cao cấp" },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`des-choice-btn ${houseType === item.id ? "active" : ""}`}
                        onClick={() => setHouseType(item.id as any)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Diện tích trượt */}
                <div>
                  <div className="des-calc-group-title">
                    <Sliders size={15} /> 2. Diện tích sàn sử dụng:
                    <span className="des-slider-val">{area} m²</span>
                  </div>
                  <div className="des-slider-wrap">
                    <input
                      type="range"
                      min={40}
                      max={450}
                      step={5}
                      value={area}
                      onChange={(e) => setArea(Number(e.target.value))}
                      className="des-range-input"
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#888" }}>
                      <span>40 m² (Studio)</span>
                      <span>150 m² (Penthouse)</span>
                      <span>450 m² (Biệt thự)</span>
                    </div>
                  </div>
                </div>

                {/* 3. Phong cách thiết kế */}
                <div>
                  <div className="des-calc-group-title">
                    <Palette size={15} /> 3. Phong cách thiết kế chủ đạo
                  </div>
                  <div className="des-choice-pills">
                    {DESIGN_STYLES.map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        className={`des-choice-btn ${selectedStyle === st.id ? "active" : ""}`}
                        onClick={() => setSelectedStyle(st.id)}
                      >
                        {st.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Gói dịch vụ */}
                <div>
                  <div className="des-calc-group-title">
                    <Layers size={15} /> 4. Gói phạm vi công việc
                  </div>
                  <div className="des-choice-pills">
                    {[
                      { id: "concept", label: "Ý tưởng & Mặt bằng 2D" },
                      { id: "full3d", label: "Hồ sơ thiết kế 3D toàn diện" },
                      { id: "turnkey", label: "Trọn gói thiết kế & Thi công" },
                    ].map((pkg) => (
                      <button
                        key={pkg.id}
                        type="button"
                        className={`des-choice-btn ${packageType === pkg.id ? "active" : ""}`}
                        onClick={() => setPackageType(pkg.id as any)}
                      >
                        {pkg.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bên phải: Kết quả chi phí & Quyền lợi */}
              <div className="des-calc-result-box">
                <div>
                  <span className="des-result-label">Chi phí thiết kế dự toán</span>
                  <div className="des-result-price">{vnd(estimate.designFee)}</div>
                  <p style={{ fontSize: "12.5px", color: "rgba(255,255,255,0.7)", margin: "4px 0 0" }}>
                    * Miễn phí 100% phí thiết kế khi ký hợp đồng sản xuất thi công trọn gói
                  </p>
                </div>

                <div style={{ borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: "14px" }}>
                  <span className="des-result-label">Dự trù hoàn thiện nội thất:</span>
                  <div style={{ fontSize: "20px", fontWeight: "700", color: "#fff", marginTop: "2px" }}>
                    ~ {vnd(estimate.furnitureEstimated)}
                  </div>
                  <span style={{ fontSize: "12px", color: "#f7b59e", display: "flex", alignItems: "center", gap: "4px", marginTop: "6px" }}>
                    <Clock size={13} /> Thời gian thực hiện: khoảng {estimate.timelineDays} ngày làm việc
                  </span>
                </div>

                <ul className="des-result-features">
                  <li><CheckCircle2 size={16} style={{ color: "#34d399", flexShrink: 0 }} /> Khảo sát hiện trạng & đo đạc laser tại nhà</li>
                  <li><CheckCircle2 size={16} style={{ color: "#34d399", flexShrink: 0 }} /> Phối cảnh 3D trực quan không gian thực</li>
                  <li><CheckCircle2 size={16} style={{ color: "#34d399", flexShrink: 0 }} /> Hồ sơ kỹ thuật điện nước, trần sàn chi tiết</li>
                  <li><CheckCircle2 size={16} style={{ color: "#34d399", flexShrink: 0 }} /> Bảo hành kết cấu 24 tháng & bảo trì trọn đời</li>
                </ul>

                <a href="#dat-lich-hen" className="des-btn-primary" style={{ justifyContent: "center", width: "100%" }}>
                  Nhận báo giá chi tiết qua email
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ── 3. Thư Viện Phong Cách Thiết Kế Đặc Trưng ── */}
        <section className="des-sec">
          <div className="des-sec-head">
            <span className="des-sec-tag">ĐỊNH HÌNH PHONG CÁCH</span>
            <h2 className="des-sec-title">4 Phong Cách Thiết Kế Được Ưa Chuộng Nhất</h2>
            <p className="des-sec-sub">
              Mỗi phong cách là một câu chuyện cảm hứng, cân bằng giữa thẩm mỹ nghệ thuật và công năng phục vụ cuộc sống hằng ngày.
            </p>
          </div>

          <div className="des-styles-grid">
            {DESIGN_STYLES.map((st) => (
              <div
                key={st.id}
                className={`des-style-card ${selectedStyle === st.id ? "selected" : ""}`}
                onClick={() => setSelectedStyle(st.id)}
              >
                <img src={st.image} alt={st.name} className="des-style-img" />
                <span className="des-style-tag">{st.tag}</span>
                <div className="des-style-body">
                  <h3 className="des-style-title">{st.name}</h3>
                  <p className="des-style-desc">{st.desc}</p>
                  <div className="des-style-meta">
                    <strong>Vật liệu:</strong> {st.materials}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 4. Quy Trình 5 Bước Làm Việc Minh Bạch ── */}
        <section className="des-sec">
          <div className="des-sec-head">
            <span className="des-sec-tag">TIẾN ĐỘ CHUẨN MỰC</span>
            <h2 className="des-sec-title">Quy Trình Triển Khai 5 Bước Đồng Hành</h2>
            <p className="des-sec-sub">
              Mọi giai đoạn đều có mốc nghiệm thu rõ ràng, hợp đồng pháp lý minh bạch và cam kết không phát sinh chi phí ngoài dự toán.
            </p>
          </div>

          <div className="des-process-grid">
            {[
              {
                num: "01",
                title: "Khảo Sát & Lắng Nghe",
                desc: "KTS gặp gỡ gia chủ, lắng nghe nhu cầu sống, đo vẽ thực địa và đánh giá hướng sáng, phong thủy.",
              },
              {
                num: "02",
                title: "Phác Thảo Concept 2D",
                desc: "Đề xuất 2-3 phương án bố trí mặt bằng công năng tối ưu lưu thông và phân khu chức năng hợp lý.",
              },
              {
                num: "03",
                title: "Phối Cảnh 3D & Vật Liệu",
                desc: "Dựng hình ảnh 3D chân thực từng góc phòng, chọn mẫu vật liệu da, gỗ, đá thực tế tại showroom.",
              },
              {
                num: "04",
                title: "Bóc Tách & Sản Xuất",
                desc: "Triển khai hồ sơ kỹ thuật thi công và đưa vào sản xuất tại nhà máy theo tiêu chuẩn xuất khẩu.",
              },
              {
                num: "05",
                title: "Lắp Đặt & Bàn Giao",
                desc: "Đội ngũ chuyên nghiệp lắp đặt tận nhà, dọn dẹp sạch sẽ và bàn giao chìa khóa trao tay đúng hẹn.",
              },
            ].map((step) => (
              <div key={step.num} className="des-step-card">
                <div className="des-step-num">{step.num}</div>
                <h3 className="des-step-title">{step.title}</h3>
                <p className="des-step-desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 5. Công Trình Đã Thực Hiện Tiêu Biểu ── */}
        <section className="des-sec">
          <div className="des-sec-head">
            <span className="des-sec-tag">HỒ SƠ THỰC TẾ</span>
            <h2 className="des-sec-title">Các Dự Án Nội Thất Mới Hoàn Thiện</h2>
            <p className="des-sec-sub">
              Hiện thực hóa không gian sống mơ ước cho hơn 3.000 căn hộ cao cấp và biệt thự trên khắp cả nước.
            </p>
          </div>

          <div className="des-port-grid">
            {REAL_PROJECTS.map((pj) => (
              <div key={pj.id} className="des-port-card">
                <img src={pj.image} alt={pj.title} className="des-port-img" />
                <div className="des-port-body">
                  <span className="des-port-badge">{pj.style}</span>
                  <h3 className="des-port-title">{pj.title}</h3>
                  <div className="des-port-meta">
                    {pj.space} • {pj.duration}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 6. Form Đăng Ký Tư Vấn Trực Tiếp 1-1 Với KTS ── */}
        <section id="dat-lich-hen" className="des-sec">
          <div className="des-sec-head">
            <span className="des-sec-tag">ĐẶT HẸN TƯ VẤN</span>
            <h2 className="des-sec-title">Gặp Gỡ Trực Tiếp Kiến Trúc Sư Nhà Xinh</h2>
            <p className="des-sec-sub">
              Để lại thông tin để KTS trưởng liên hệ trao đổi phương án mặt bằng và mang mẫu vật liệu tư vấn hoàn toàn miễn phí.
            </p>
          </div>

          <div className="des-booking-card">
            {bookingSuccess ? (
              <div className="des-success-alert">
                <CheckCircle2 size={24} />
                <div>
                  <strong>Đăng ký tư vấn thành công!</strong>
                  <div>
                    Cảm ơn {bookingForm.name || "bạn"}. Chuyên viên KTS phụ trách khu vực {bookingForm.city} sẽ liên hệ lại qua số điện thoại <strong>{bookingForm.phone}</strong> trong vòng 15 phút làm việc!
                  </div>
                </div>
              </div>
            ) : null}

            <form onSubmit={handleSubmitBooking}>
              <div className="des-form-grid">
                <div className="des-form-group">
                  <label>Họ và tên của bạn *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Nguyễn Văn Tuấn"
                    value={bookingForm.name}
                    onChange={(e) => setBookingForm({ ...bookingForm, name: e.target.value })}
                    className="des-form-input"
                  />
                </div>

                <div className="des-form-group">
                  <label>Số điện thoại liên hệ (có Zalo) *</label>
                  <input
                    type="tel"
                    required
                    placeholder="Ví dụ: 0903 123 456"
                    value={bookingForm.phone}
                    onChange={(e) => setBookingForm({ ...bookingForm, phone: e.target.value })}
                    className="des-form-input"
                  />
                </div>

                <div className="des-form-group">
                  <label>Email nhận hồ sơ dự toán thiết kế</label>
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={bookingForm.email}
                    onChange={(e) => setBookingForm({ ...bookingForm, email: e.target.value })}
                    className="des-form-input"
                  />
                </div>

                <div className="des-form-group">
                  <label>Tỉnh / Thành phố dự án</label>
                  <select
                    value={bookingForm.city}
                    onChange={(e) => setBookingForm({ ...bookingForm, city: e.target.value })}
                    className="des-form-select"
                  >
                    <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                    <option value="Hà Nội">Hà Nội</option>
                    <option value="Đà Nẵng">Đà Nẵng</option>
                    <option value="Bình Dương">Bình Dương</option>
                    <option value="Đồng Nai">Đồng Nai</option>
                    <option value="Tỉnh thành khác">Tỉnh thành khác</option>
                  </select>
                </div>

                <div className="des-form-group">
                  <label>Hình thức tư vấn mong muốn</label>
                  <select
                    value={bookingForm.meetingType}
                    onChange={(e) => setBookingForm({ ...bookingForm, meetingType: e.target.value as any })}
                    className="des-form-select"
                  >
                    <option value="showroom">Gặp trực tiếp tại Showroom Nhà Xinh</option>
                    <option value="home">Khảo sát & tư vấn tại công trình thực tế</option>
                    <option value="online">Tư vấn trực tuyến qua Zalo / Video Call</option>
                  </select>
                </div>

                <div className="des-form-group">
                  <label>Dự kiến diện tích hoặc địa chỉ dự án</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Căn hộ 90m2 tại Masteri Thảo Điền"
                    value={bookingForm.address}
                    onChange={(e) => setBookingForm({ ...bookingForm, address: e.target.value })}
                    className="des-form-input"
                  />
                </div>

                <div className="des-form-group full">
                  <label>Ghi chú thêm về yêu cầu công năng, phong cách hoặc ngân sách</label>
                  <textarea
                    placeholder="Chia sẻ thêm về số phòng ngủ, sở thích vật liệu hoặc thời gian bạn dự định dọn vào ở..."
                    value={bookingForm.note}
                    onChange={(e) => setBookingForm({ ...bookingForm, note: e.target.value })}
                    className="des-form-textarea"
                  />
                </div>
              </div>

              <div className="des-booking-footer">
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#6f6a62" }}>
                  <ShieldCheck size={18} style={{ color: "#d26e4b" }} />
                  <span>Bảo mật 100% thông tin cá nhân theo chính sách quyền riêng tư</span>
                </div>

                <button type="submit" className="des-btn-primary">
                  Gửi yêu cầu tư vấn ngay <ArrowRight size={16} />
                </button>
              </div>
            </form>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
