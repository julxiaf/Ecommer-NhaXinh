import { AlertCircle, RotateCw, Home, Phone } from "lucide-react";
import { Link } from "react-router-dom";

interface PolicyEmptyStateProps {
  message?: string | null;
  onRetry?: () => void;
}

export default function PolicyEmptyState({ message, onRetry }: PolicyEmptyStateProps) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e8e4df",
        borderRadius: 12,
        padding: "56px 24px",
        textAlign: "center",
        color: "#666",
        maxWidth: 620,
        margin: "40px auto",
        boxShadow: "0 8px 30px rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "#fff8eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
          color: "#d97706",
        }}
      >
        <AlertCircle size={32} />
      </div>

      <h2
        style={{
          fontSize: 20,
          color: "#1c1917",
          margin: "0 0 10px",
          fontWeight: 700,
          fontFamily: "Georgia, serif",
        }}
      >
        {message || "Hiện chưa có chính sách nào được xuất bản"}
      </h2>

      <p
        style={{
          fontSize: 14,
          margin: "0 auto 28px",
          color: "#78716c",
          lineHeight: 1.65,
          maxWidth: 480,
        }}
      >
        Hệ thống đang đồng bộ dữ liệu chính sách từ máy chủ Nhà Xinh. Quý khách vui lòng thử tải lại hoặc liên hệ trực tiếp tổng đài chăm sóc khách hàng để được tư vấn nhanh chóng.
      </p>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "11px 22px",
              background: "#b38e5d",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              transition: "background-color 0.2s ease",
            }}
          >
            <RotateCw size={16} />
            <span>Tải lại dữ liệu</span>
          </button>
        )}

        <a
          href="tel:0903884358"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "11px 22px",
            background: "#faf7f2",
            color: "#855828",
            border: "1px solid #e8e0d4",
            borderRadius: 8,
            textDecoration: "none",
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          <Phone size={16} />
          <span>Hotline: 0903 884 358</span>
        </a>

        <Link
          to="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "11px 22px",
            background: "#f5f3ef",
            color: "#444",
            borderRadius: 8,
            textDecoration: "none",
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          <Home size={16} />
          <span>Về trang chủ</span>
        </Link>
      </div>
    </div>
  );
}

