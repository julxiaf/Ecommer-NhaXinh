import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Phone, Mail, ShieldCheck } from "lucide-react";
import Header from "../components/Headers";
import Footer from "../components/Footer";
import { useStore } from "../hooks/useStore";
import { ENDPOINTS } from "../services/apiEndpoints";
import "./policies.css";
import { type PolicyKey } from "../util/CONSTRAINT";

interface DynamicPolicy {
  id: number;
  slug: string;
  title: string;
  shortTitle?: string;
  intro?: string;
  content?: string;
  fontFamily?: string;
  fontSize?: string;
  lineHeight?: string;
  accentColor?: string;
  updatedAt?: string;
}

interface PolicyTabItem {
  key: PolicyKey;
  title: string;
  shortTitle: string;
  path: string;
}

const POLICY_TABS: PolicyTabItem[] = [
  { key: "return", title: "Chính sách đổi trả & hoàn tiền", shortTitle: "Đổi trả hàng", path: "/chinh-sach-doi-tra" },
  { key: "shipping", title: "Chính sách giao nhận & lắp đặt", shortTitle: "Giao nhận & lắp đặt", path: "/chinh-sach-giao-hang" },
  { key: "warranty", title: "Chính sách bảo hành & bảo trì", shortTitle: "Bảo hành bảo trì", path: "/chinh-sach-bao-hanh" },
  { key: "privacy", title: "Chính sách bảo mật thông tin", shortTitle: "Bảo mật thông tin", path: "/chinh-sach-bao-mat" },
  { key: "terms", title: "Điều khoản sử dụng dịch vụ", shortTitle: "Điều khoản sử dụng", path: "/dieu-khoan-su-dung" },
  { key: "vip", title: "Chương trình khách hàng thân thiết", shortTitle: "Khách hàng thân thiết", path: "/khach-hang-than-thiet" },
];

export default function PolicyPage() {
  const location = useLocation();
  const { cartCount, wishlist, user } = useStore();

  const getActiveKeyFromPath = (): PolicyKey => {
    const path = location.pathname;
    if (path.includes("giao-hang")) return "shipping";
    if (path.includes("bao-hanh")) return "warranty";
    if (path.includes("bao-mat")) return "privacy";
    if (path.includes("dieu-khoan")) return "terms";
    if (path.includes("than-thiet")) return "vip";
    return "return";
  };

  const [activeTab, setActiveTab] = useState<PolicyKey>(getActiveKeyFromPath());
  const [dynamicPolicy, setDynamicPolicy] = useState<DynamicPolicy | null>(null);

  useEffect(() => {
    const tab = getActiveKeyFromPath();
    setActiveTab(tab);

    fetch(ENDPOINTS.POLICIES.BY_SLUG(tab))
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data: DynamicPolicy | null) => {
        if (data && data.title) {
          setDynamicPolicy(data);
        } else {
          setDynamicPolicy(null);
        }
      })
      .catch(() => setDynamicPolicy(null));
  }, [location.pathname]);

  const currentTabInfo = POLICY_TABS.find((t) => t.key === activeTab) || POLICY_TABS[0];
  const title = dynamicPolicy?.title || currentTabInfo.title;
  const shortTitle = dynamicPolicy?.shortTitle || currentTabInfo.shortTitle;
  const intro = dynamicPolicy?.intro || "Chính sách áp dụng trên toàn bộ hệ thống showroom và kênh bán lẻ trực tuyến của Nhà Xinh.";
  const fontFamily = dynamicPolicy?.fontFamily || "Be Vietnam Pro, sans-serif";
  const fontSize = dynamicPolicy?.fontSize || "15px";
  const lineHeight = dynamicPolicy?.lineHeight || "1.75";
  const accentColor = dynamicPolicy?.accentColor || "#b38e5d";

  return (
    <>
      <Header user={user} cartCount={cartCount} wishlistCount={wishlist.length} />

      <main className="policy-page page-enter">
        <div style={{ maxWidth: 1160, margin: "0 auto" }}>
          {/* Breadcrumb */}
          <nav className="breadcrumb" aria-label="Breadcrumb" style={{ marginBottom: 24 }}>
            <Link to="/">Trang chủ</Link>
            <ChevronRight size={14} />
            <span>Hỗ trợ & Chính sách</span>
            <ChevronRight size={14} />
            <strong>{shortTitle}</strong>
          </nav>

          {/* Policy Layout with sidebar tabs */}
          <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 32, alignItems: "start" }}>
            {/* Sidebar navigation */}
            <aside style={{ background: "#fff", border: "1px solid #e8e4df", borderRadius: 12, padding: 16 }}>
              <h3 style={{ fontSize: 16, margin: "0 0 14px", padding: "8px 12px", borderBottom: "1px solid #f0eae1" }}>
                Trung tâm Hỗ trợ
              </h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                {POLICY_TABS.map((p) => {
                  const isActive = activeTab === p.key;
                  return (
                    <li key={p.key}>
                      <Link
                        to={p.path}
                        onClick={() => setActiveTab(p.key)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "12px 14px",
                          borderRadius: 8,
                          textDecoration: "none",
                          fontSize: 14,
                          fontWeight: isActive ? 600 : 500,
                          color: isActive ? accentColor : "#444",
                          background: isActive ? "#faf7f2" : "transparent",
                          transition: "all 0.2s ease",
                        }}
                      >
                        <ShieldCheck size={18} style={{ color: isActive ? accentColor : "#888" }} />
                        <span>{p.shortTitle}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>

              <div style={{ marginTop: 24, padding: 16, background: "#faf7f2", borderRadius: 8, fontSize: 13, color: "#666" }}>
                <p style={{ margin: "0 0 8px", fontWeight: 600, color: "#222" }}>Cần hỗ trợ thêm?</p>
                <p style={{ margin: "0 0 6px", display: "flex", alignItems: "center", gap: 8 }}>
                  <Phone size={14} style={{ color: accentColor }} />
                  <a href="tel:0903884358" style={{ color: "inherit", textDecoration: "none" }}>0903 884 358</a>
                </p>
                <p style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                  <Mail size={14} style={{ color: accentColor }} />
                  <span>support@nhaxinh.com</span>
                </p>
              </div>
            </aside>

            {/* Policy Article Content */}
            <article
              className="policy-card"
              style={{
                width: "100%",
                margin: 0,
                fontFamily: fontFamily,
              }}
            >
              <p className="policy-eyebrow" style={{ color: accentColor }}>
                NỘI THẤT NHÀ XINH · CHÍNH SÁCH CHÍNH HÃNG
              </p>
              <h1 style={{ fontFamily: fontFamily }}>{title}</h1>
              {intro && (
                <p className="policy-introduction" style={{ fontFamily: fontFamily, fontSize: fontSize, lineHeight: lineHeight }}>
                  {intro}
                </p>
              )}

              {/* If dynamic HTML content exists, render it directly */}
              {dynamicPolicy?.content ? (
                <div
                  className="policy-dynamic-content"
                  style={{
                    fontFamily: fontFamily,
                    fontSize: fontSize,
                    lineHeight: lineHeight,
                  }}
                  dangerouslySetInnerHTML={{ __html: dynamicPolicy.content }}
                />
              ) : (
                <div className="policy-section">
                  <h2 style={{ fontFamily: fontFamily }}>Quy định chung</h2>
                  <div className="policy-body">
                    <p style={{ fontSize: fontSize, lineHeight: lineHeight }}>
                      Mọi thông tin chi tiết về {shortTitle.toLowerCase()} vui lòng liên hệ hotline 0903 884 358 hoặc ghé thăm hệ thống showroom Nhà Xinh trên toàn quốc để được chuyên viên hỗ trợ chu đáo nhất.
                    </p>
                  </div>
                </div>
              )}

              <div className="policy-updated" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <span>
                  Áp dụng từ: {dynamicPolicy?.updatedAt ? new Date(dynamicPolicy.updatedAt).toLocaleDateString("vi-VN") : "01/01/2025"} · Cập nhật mới nhất
                </span>
                <Link to="/san-pham" className="policy-button secondary" style={{ textDecoration: "none", fontSize: 13, padding: "8px 16px", minHeight: "auto" }}>
                  Khám phá sản phẩm
                </Link>
              </div>
            </article>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
