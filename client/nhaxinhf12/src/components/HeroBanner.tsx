import React from 'react';
import './HeroBanner.css';
import type { HeroBannerProps } from '../util/CONSTRAINT';

// Render nội dung của một slide; className được HomePage dùng để chọn animation trái/phải.
export const HeroBanner: React.FC<HeroBannerProps> = ({
  subtitle,
  title,
  description,
  backgroundImage,
  actions,
  className = '',
}) => {
  return (
    <section className={`hero-banner ${className}`.trim()}>
      {/* Ảnh nền chỉ mang tính trang trí; aria-hidden tránh đọc nội dung rỗng bằng trình đọc màn hình. */}
      <div
        className="hero-banner-image"
        style={{ backgroundImage: `url(${backgroundImage})` }}
        aria-hidden="true"
      />
      <div className="hero-overlay" />
      <div className="hero-content">
        <span className="hero-subtitle">{subtitle}</span>
        <h1 className="hero-title">{title}</h1>
        <p className="hero-description">{description}</p>

        <div className="hero-actions">
          {/* Nút đầu tiên là CTA chính; các nút tiếp theo dùng kiểu phụ. */}
          {actions.map((action, index) => (
            <a
              key={`${action.label}-${index}`}
              href={action.url}
              className={`hero-btn ${index === 0 ? 'primary' : 'secondary'}`}
            >
              {action.label}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};