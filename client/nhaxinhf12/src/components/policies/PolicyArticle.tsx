import { Link } from "react-router-dom";
import { Clock, ArrowRight, Sparkles } from "lucide-react";
import type { PolicyItem } from "../../services/policies";

interface PolicyArticleProps {
  policy: PolicyItem;
}

export default function PolicyArticle({ policy }: PolicyArticleProps) {
  const fontFamily = policy.fontFamily || "Be Vietnam Pro, sans-serif";
  const fontSize = policy.fontSize || "15px";
  const lineHeight = policy.lineHeight || "1.75";
  const accentColor = policy.accentColor || "#b38e5d";

  const formattedDate = policy.updatedAt
    ? new Date(policy.updatedAt).toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Đang hiệu lực";

  return (
    <article
      className="policy-card"
      style={{
        width: "100%",
        margin: 0,
        fontFamily,
        boxShadow: "0 8px 32px rgba(40, 32, 24, 0.04)",
        borderRadius: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Sparkles size={14} style={{ color: accentColor }} />
        <p className="policy-eyebrow" style={{ color: accentColor, margin: 0 }}>
          NỘI THẤT NHÀ XINH · QUY ĐỊNH & CHÍNH SÁCH CHÍNH HÃNG
        </p>
      </div>

      <h1
        style={{
          fontFamily,
          color: "#1c1917",
          fontSize: "clamp(26px, 3.5vw, 38px)",
          marginBottom: 16,
          lineHeight: 1.25,
        }}
      >
        {policy.title}
      </h1>

      {policy.intro && (
        <p
          className="policy-introduction"
          style={{
            fontFamily,
            fontSize,
            lineHeight,
            color: "#57534e",
            paddingBottom: 24,
            marginBottom: 28,
            borderBottom: "1px solid #e8e4df",
          }}
        >
          {policy.intro}
        </p>
      )}

      {/* Render HTML nội dung được lưu trữ thực tế trên Server */}
      {policy.content && policy.content.trim() ? (
        <div
          className="policy-dynamic-content"
          style={{
            fontFamily,
            fontSize,
            lineHeight,
          }}
          dangerouslySetInnerHTML={{ __html: policy.content }}
        />
      ) : (
        <div
          style={{
            padding: "24px 20px",
            background: "#faf7f2",
            borderRadius: 8,
            border: "1px dashed #d9d3cc",
            color: "#666",
            fontSize: 14,
          }}
        >
          Nội dung chi tiết của quy định này đang được cập nhật. Vui lòng liên hệ hotline{" "}
          <a href="tel:0903884358" style={{ color: accentColor, fontWeight: 600 }}>
            0903 884 358
          </a>{" "}
          để được hỗ trợ chi tiết.
        </div>
      )}

      {/* Metadata & Actions */}
      <div
        className="policy-updated"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          marginTop: 40,
          paddingTop: 20,
          borderTop: "1px solid #f0ece7",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#78716c", fontSize: 13 }}>
          <Clock size={15} style={{ color: "#a8a29e" }} />
          <span>Áp dụng từ: {formattedDate} · Cập nhật chính thức bởi Nhà Xinh</span>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link
            to="/tu-van-thiet-ke"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "9px 18px",
              background: "#faf7f2",
              border: "1px solid #e8e0d4",
              borderRadius: 6,
              color: "#6b4f2c",
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <span>Tư vấn thiết kế</span>
          </Link>
          <Link
            to="/san-pham"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "9px 18px",
              background: "#28231e",
              borderRadius: 6,
              color: "#fff",
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <span>Khám phá sản phẩm</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </article>
  );
}
