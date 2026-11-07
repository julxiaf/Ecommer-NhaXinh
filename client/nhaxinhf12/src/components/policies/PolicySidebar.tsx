import { Link } from "react-router-dom";
import {
  ShieldCheck,
  RotateCcw,
  Truck,
  Lock,
  FileText,
  Award,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
} from "lucide-react";
import { getPolicyRoute, type PolicyItem } from "../../services/policies";

interface PolicySidebarProps {
  policies: PolicyItem[];
  selectedPolicy: PolicyItem | null;
  onSelectPolicy: (policy: PolicyItem) => void;
}

function getPolicyIcon(policy: PolicyItem) {
  const key = `${policy.slug} ${policy.templateType || ""}`.toLowerCase();
  if (key.includes("doi-tra") || key.includes("return")) {
    return <RotateCcw size={17} />;
  }
  if (key.includes("giao-hang") || key.includes("shipping") || key.includes("van-chuyen")) {
    return <Truck size={17} />;
  }
  if (key.includes("bao-hanh") || key.includes("warranty")) {
    return <ShieldCheck size={17} />;
  }
  if (key.includes("bao-mat") || key.includes("privacy")) {
    return <Lock size={17} />;
  }
  if (key.includes("dieu-khoan") || key.includes("terms")) {
    return <FileText size={17} />;
  }
  if (key.includes("than-thiet") || key.includes("vip") || key.includes("hoi-vien")) {
    return <Award size={17} />;
  }
  return <ShieldCheck size={17} />;
}

export default function PolicySidebar({
  policies,
  selectedPolicy,
  onSelectPolicy,
}: PolicySidebarProps) {
  return (
    <aside
      className="policy-sidebar"
      style={{
        background: "#fff",
        border: "1px solid #e8e4df",
        borderRadius: 12,
        padding: "20px 16px",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.02)",
      }}
    >
      <div style={{ padding: "0 8px 14px", borderBottom: "1px solid #f0eae1", marginBottom: 12 }}>
        <h2
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "#28231e",
            margin: 0,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          Trung tâm Chính sách
        </h2>
        <span style={{ fontSize: 12, color: "#888", marginTop: 4, display: "block" }}>
          Quy định & Hỗ trợ khách hàng
        </span>
      </div>

      <nav aria-label="Danh sách chính sách Nhà Xinh">
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {policies.map((p) => {
            const isActive = selectedPolicy?.id === p.id;
            const route = getPolicyRoute(p);
            const activeColor = p.accentColor || "#b38e5d";

            return (
              <li key={p.id}>
                <Link
                  to={route}
                  onClick={() => onSelectPolicy(p)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 14px",
                    borderRadius: 8,
                    textDecoration: "none",
                    fontSize: 14,
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? activeColor : "#444",
                    background: isActive ? "#faf7f2" : "transparent",
                    borderLeft: isActive ? `3px solid ${activeColor}` : "3px solid transparent",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span
                      style={{
                        color: isActive ? activeColor : "#78716c",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      {getPolicyIcon(p)}
                    </span>
                    <span>{p.shortTitle || p.title}</span>
                  </div>
                  {isActive && <ChevronRight size={14} style={{ color: activeColor }} />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Box liên hệ & hỗ trợ nhanh */}
      <div
        style={{
          marginTop: 28,
          padding: 16,
          background: "#faf7f2",
          border: "1px solid #f0eae1",
          borderRadius: 8,
          fontSize: 13,
          color: "#555",
        }}
      >
        <p style={{ margin: "0 0 10px", fontWeight: 700, color: "#222", fontSize: 13.5 }}>
          Cần hỗ trợ trực tiếp?
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Phone size={15} style={{ color: "#b38e5d", flexShrink: 0 }} />
            <a
              href="tel:0903884358"
              style={{ color: "#222", textDecoration: "none", fontWeight: 600 }}
            >
              0903 884 358
            </a>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Mail size={15} style={{ color: "#b38e5d", flexShrink: 0 }} />
            <a
              href="mailto:nhaxinhcare@akacompany.com.vn"
              style={{ color: "inherit", textDecoration: "none" }}
            >
              nhaxinhcare@akacompany.com.vn
            </a>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <MapPin size={15} style={{ color: "#b38e5d", flexShrink: 0 }} />
            <Link
              to="/he-thong-showroom"
              style={{ color: "#855828", textDecoration: "none", fontWeight: 500 }}
            >
              Xem hệ thống showroom
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
