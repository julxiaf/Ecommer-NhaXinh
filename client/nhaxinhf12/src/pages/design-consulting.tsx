import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  Calculator,
  CheckCircle2,
  Calendar,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Eye,
} from "lucide-react";
import Header from "../components/Headers";
import Footer from "../components/Footer";
import { useStore } from "../hooks/useStore";
import "./pages.css";
import "./design-consulting.css";



export default function DesignConsultingPage() {
  const { user, cartCount, wishlist } = useStore();


  // State Form đặt lịch hẹn KTS
  const [bookingForm, setBookingForm] = useState({
    name: user?.fullName || "",
    phone: user?.phone || "",
    email: user?.email || "",
    propertyType: "Căn hộ chung cư",
    areaSize: "85",
    showroomCity: "TP. Hồ Chí Minh",
    note: "",
  });
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const handleSubmitBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingForm.phone.trim()) return;
    setBookingSuccess(true);
    setTimeout(() => {
      const el = document.getElementById("dat-lich-hen");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };


  return (
    <>
      <Header user={user} cartCount={cartCount} wishlistCount={wishlist.length} />

      <main className="page page-design">
        {/* Breadcrumb */}
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Trang chủ</Link>
          <ChevronRight size={14} />
          <span className="current">Thiết kế nội thất Nhà Xinh</span>
        </nav>

        {/* ── 1. Hero Banner Đẳng Cấp ── */}
        <section className="des-hero">
          <img
            src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1920&q=85"
            alt="Dịch vụ thiết kế nội thất Nhà Xinh"
            className="des-hero-bg"
          />
          <div className="des-hero-overlay" />
          <div className="des-hero-content">
            <span className="des-hero-badge">
              <Sparkles size={14} /> DỊCH VỤ THIẾT KẾ NỘI THẤT TRỌN GÓI • NHÀ XINH
            </span>
            <h1 className="des-hero-title">
              Kiến Tạo Không Gian Sống Sang Trọng & Đậm Bản Sắc Riêng
            </h1>
            <p className="des-hero-sub">
              Hơn 27 năm kinh nghiệm kiến tạo tổ ấm tinh hoa. Đội ngũ Kiến trúc sư Nhà Xinh đồng hành cùng bạn từ ý tưởng sơ phác 2D, phối cảnh 3D chân thực đến sản xuất và thi công hoàn thiện chìa khóa trao tay chuẩn mực quốc tế.
            </p>

            <div className="des-hero-actions">
              <a href="#dat-lich-hen" className="des-btn-primary">
                <Calendar size={16} /> Đăng ký tư vấn miễn phí
              </a>
              <a href="#tinh-du-toan" className="des-btn-ghost">
                <Calculator size={16} /> Tự tính dự toán chi phí
              </a>
              <a href="#du-an-thuc-te" className="des-btn-outline">
                <Eye size={16} /> Xem dự án thực tế
              </a>
            </div>

            {/* Stats Highlights */}
            <div className="des-hero-stats">
              <div className="des-stat-item">
                <span className="des-stat-num">27+</span>
                <span className="des-stat-label">Năm uy tín hàng đầu</span>
              </div>
              <div className="des-stat-item">
                <span className="des-stat-num">3.500+</span>
                <span className="des-stat-label">Công trình hoàn thiện</span>
              </div>
              <div className="des-stat-item">
                <span className="des-stat-num">10+</span>
                <span className="des-stat-label">Showroom HN & TP.HCM</span>
              </div>
              <div className="des-stat-item">
                <span className="des-stat-num">100%</span>
                <span className="des-stat-label">Cam kết thi công chuẩn 3D</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── 6. Quy Trình 5 Bước Làm Việc Chuẩn Mực ── */}
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
                desc: "KTS gặp gỡ gia chủ, lắng nghe thói quen sinh hoạt và ngân sách, đo vẽ thực địa laser và đánh giá phong thủy.",
              },
              {
                num: "02",
                title: "Phác Thảo Concept 2D",
                desc: "Đề xuất 2-3 phương án bố trí mặt bằng công năng tối ưu lưu thông, phân khu chức năng và bảng Moodboard vật liệu.",
              },
              {
                num: "03",
                title: "Phối Cảnh 3D Chi Tiết",
                desc: "Dựng hình ảnh 3D chân thực từng góc phòng, mời khách hàng trải nghiệm các chất liệu da, gỗ thực tế tại Showroom.",
              },
              {
                num: "04",
                title: "Bóc Tách & Báo Giá",
                desc: "Triển khai hồ sơ kỹ thuật thi công ME và lập dự toán chi tiết không phát sinh, tiến hành ký kết hợp đồng thi công.",
              },
              {
                num: "05",
                title: "Sản Xuất & Bàn Giao",
                desc: "Sản xuất tại nhà máy, đội ngũ lắp đặt tận nhà tỉ mỉ, dọn dẹp sạch sẽ và kích hoạt bảo hành 24 tháng.",
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

        {/* ── 8. Form Đăng Ký Tư Vấn Trực Tiếp 1-1 Với KTS ── */}
        <section id="dat-lich-hen" className="des-sec">
          <div className="des-sec-head">
            <span className="des-sec-tag">ĐẶT HẸN TƯ VẤN</span>
            <h2 className="des-sec-title">Gặp Gỡ Trực Tiếp Kiến Trúc Sư Nhà Xinh</h2>
            <p className="des-sec-sub">
              Để lại thông tin để Kiến trúc sư trưởng liên hệ trao đổi phương án mặt bằng và mang mẫu vật liệu tư vấn hoàn toàn miễn phí tại nhà hoặc showroom.
            </p>
          </div>

          <div className="des-booking-card">
            {bookingSuccess ? (
              <div className="des-success-alert">
                <CheckCircle2 size={26} className="text-emerald-600 shrink-0" />
                <div>
                  <h4 className="text-base font-bold text-emerald-900">Đăng ký tư vấn thiết kế thành công!</h4>
                  <p className="text-sm text-emerald-800 mt-1 leading-relaxed">
                    Cảm ơn <strong>{bookingForm.name || "Quý khách"}</strong>. Kiến trúc sư trưởng của Nhà Xinh phụ trách khu vực <strong>{bookingForm.showroomCity}</strong> sẽ liên hệ qua số điện thoại <strong>{bookingForm.phone}</strong> trong vòng 15 phút làm việc để tư vấn phương án và gửi bảng dự toán chi tiết!
                  </p>
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
                    placeholder="Ví dụ: 0903 884 358"
                    value={bookingForm.phone}
                    onChange={(e) => setBookingForm({ ...bookingForm, phone: e.target.value })}
                    className="des-form-input"
                  />
                </div>

                <div className="des-form-group">
                  <label>Email nhận hồ sơ thiết kế & bảng giá</label>
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={bookingForm.email}
                    onChange={(e) => setBookingForm({ ...bookingForm, email: e.target.value })}
                    className="des-form-input"
                  />
                </div>
                <div className="des-form-group full">
                  <label>Yêu cầu của bạn</label>
                  <textarea
                    placeholder=""
                    value={bookingForm.note}
                    onChange={(e) => setBookingForm({ ...bookingForm, note: e.target.value })}
                    className="des-form-textarea"
                  />
                </div>
              </div>

              <div className="des-booking-footer">
                <div className="des-privacy-note">
                  <ShieldCheck size={18} className="text-[#d26e4b] shrink-0" />
                  <span>Bảo mật 100% thông tin cá nhân theo chính sách quyền riêng tư của AKA Furniture Group</span>
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
