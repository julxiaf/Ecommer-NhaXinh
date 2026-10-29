import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Phone, Mail, MapPin, ChevronUp
} from "lucide-react";

import { PRODUCT_GROUPS, ROOMS, HOTLINE } from "../util/CONSTRAINT";
import FloatingContact from "./FloatingContact";
import "./Footer.css";

export default function Footer() {
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  // Chỉ hiển thị 4 nhóm sản phẩm đầu trong Footer
  const footerCategories = PRODUCT_GROUPS.slice(0, 4);

  return (
    <footer className="ft">
      {/* ── Đội ngũ chuyên viên tư vấn & Thanh nhận tư vấn màu vàng ── */}
      {/* <ConsultantSection /> */}

      {/* ── Main Grid ── */}
      <div className="ft-main">
        {/* Brand */}
        <div className="ft-brand">
          <Link to="/" className="ft-logo">Nhà Xinh</Link>
          <p>
            Mang đến không gian sống tinh tế với nội thất cao cấp,
            thiết kế hiện đại và chất lượng bền vững.
          </p>
          <div className="ft-socials">
            <a
              href="https://facebook.com/nhaxinh"
              target="_blank"
              rel="noopener noreferrer"
              className="ft-social-btn"
              aria-label="Facebook"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>
            </a>
            <a
              href="https://instagram.com/nhaxinh"
              target="_blank"
              rel="noopener noreferrer"
              className="ft-social-btn"
              aria-label="Instagram"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
            </a>
            <a
              href="https://youtube.com/nhaxinh"
              target="_blank"
              rel="noopener noreferrer"
              className="ft-social-btn"
              aria-label="YouTube"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.19a3.02 3.02 0 00-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.55A3.02 3.02 0 00.5 6.19 31.54 31.54 0 000 12a31.54 31.54 0 00.5 5.81 3.02 3.02 0 002.12 2.14c1.88.55 9.38.55 9.38.55s7.5 0 9.38-.55a3.02 3.02 0 002.12-2.14A31.54 31.54 0 0024 12a31.54 31.54 0 00-.5-5.81zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/></svg>
            </a>
          </div>
        </div>

        {/* Sản phẩm */}
        <div className="ft-col">
          <h4 className="ft-col-title">Sản phẩm</h4>
          <ul>
            {footerCategories.map((g) => (
              <li key={g.to}><Link to={g.to}>{g.title}</Link></li>
            ))}
            <li><Link to="/san-pham">Tất cả sản phẩm</Link></li>
          </ul>
        </div>

        {/* Phòng */}
        <div className="ft-col">
          <h4 className="ft-col-title">Không gian</h4>
          <ul>
            {ROOMS.slice(0, 5).map((r) => (
              <li key={r.to}><Link to={r.to}>{r.label}</Link></li>
            ))}
          </ul>
        </div>

        {/* Hỗ trợ & Chính sách */}
        <div className="ft-col">
          <h4 className="ft-col-title">Hỗ trợ & Chính sách</h4>
          <ul>
            <li><Link to="/chinh-sach-mua-ban-doi-tra">Chính sách đổi trả</Link></li>
            <li><Link to="/chinh-sach-giao-hang">Giao hàng & lắp đặt</Link></li>
            <li><Link to="/chinh-sach-bao-hanh">Bảo hành & bảo trì</Link></li>
            <li><Link to="/chinh-sach-bao-mat">Bảo mật thông tin</Link></li>
            {/* <li><Link to="/khach-hang-than-thiet">Khách hàng thân thiết (VIP)</Link></li> */}
            <li><Link to="/he-thong-cua-hang">Hệ thống showroom</Link></li>
            {/* <li><Link to="/admin" style={{ color: "inherit", opacity: 0.85 }}>Trang Quản trị viên</Link></li> */}
          </ul>
        </div>

        {/* Liên hệ */}
        <div className="ft-col">
          <h4 className="ft-col-title">Liên hệ</h4>
          <div className="ft-contact-item">
            <span className="ft-contact-icon"><Phone size={16} /></span>
            <div>
              <span className="ft-contact-label">Hotline</span>
              <div className="ft-contact-value">
                <a href={HOTLINE.href}>{HOTLINE.label}</a>
              </div>
            </div>
          </div>
          <div className="ft-contact-item">
            <span className="ft-contact-icon"><Mail size={16} /></span>
            <div>
              <span className="ft-contact-label">Email</span>
              <div className="ft-contact-value">
                <a href="mailto:info@nhaxinh.com">info@nhaxinh.com</a>
              </div>
            </div>
          </div>
          <div className="ft-contact-item">
            <span className="ft-contact-icon"><MapPin size={16} /></span>
            <div>
              <span className="ft-contact-label">Showroom</span>
              <div className="ft-contact-value">
                65 Lê Lợi, Q.1, TP.HCM
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom ── */}
      <div className="ft-bottom">
        <div className="ft-bottom-inner">
          <span className="ft-copy">© {new Date().getFullYear()} Nhà Xinh. Tất cả quyền được bảo lưu.</span>
          <div className="ft-payments">
            <span className="ft-payment-icon">VISA</span>
            <span className="ft-payment-icon">MC</span>
            <span className="ft-payment-icon">JCB</span>
            <span className="ft-payment-icon">COD</span>
          </div>
        </div>
      </div>

      {/* ── Back-to-top ── */}
      <button
        className={`ft-top-btn ${showTop ? "visible" : ""}`}
        onClick={scrollToTop}
        aria-label="Về đầu trang"
      >
        <ChevronUp size={22} />
      </button>

      {/* ── Hotline rung lắc & Nút Zalo chat nổi ── */}
      <FloatingContact />
    </footer>
  );
}
