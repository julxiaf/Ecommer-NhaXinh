import React, { useState, useRef, useEffect } from 'react';
import './HeroBanner.css';
import type { HeroBannerProps } from '../util/CONSTRAINT';
import { Volume2, VolumeX } from 'lucide-react';

// Render nội dung của một slide (hỗ trợ cả Video và Hình ảnh);
// className được HomePage dùng để chọn animation trái/phải khi có nhiều ảnh.
export const HeroBanner: React.FC<HeroBannerProps> = ({
  subtitle,
  title,
  description,
  backgroundImage,
  mediaType,
  videoUrl,
  actions,
  className = '',
  textColor,
  titleColor,
  subtitleColor,
  descriptionColor,
}) => {
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Nhận diện tự động nếu là video (thông qua mediaType, videoUrl hoặc đuôi file mp4/webm/ogg)
  const isVideo =
    mediaType === 'video' ||
    Boolean(videoUrl) ||
    /\.(mp4|webm|ogg)($|\?)/i.test(backgroundImage || '');
  const videoSrc = videoUrl || (isVideo ? backgroundImage : undefined);

  useEffect(() => {
    if (isVideo && videoRef.current) {
      videoRef.current.muted = isMuted;
      videoRef.current.play().catch(() => {
        // Tự động play có thể cần muted trên một số trình duyệt
      });
    }
  }, [isVideo, isMuted, videoSrc]);

  return (
    <section className={`hero-banner ${className}`.trim()}>
      {/* 1. Nền Media: Render Video nếu là video, hoặc Ảnh nền nếu là hình ảnh */}
      {isVideo && videoSrc ? (
        <video
          ref={videoRef}
          className="hero-banner-video"
          src={videoSrc}
          poster={backgroundImage}
          autoPlay
          loop
          muted={isMuted}
          playsInline
          aria-hidden="true"
        />
      ) : (
        <div
          className="hero-banner-image"
          style={{ backgroundImage: `url(${backgroundImage})` }}
          aria-hidden="true"
        />
      )}

      {/* Lớp phủ sang trọng */}
      <div className="hero-overlay" />

      {/* Nút điều khiển âm lượng nếu là video */}
      {isVideo && (
        <button
          type="button"
          className="hero-video-mute-btn"
          aria-label={isMuted ? 'Bật âm thanh video' : 'Tắt âm thanh video'}
          title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
          onClick={() => setIsMuted((prev) => !prev)}
        >
          {isMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
        </button>
      )}

      {/* Nội dung thông điệp chính */}
      <div className="hero-content" style={textColor ? { color: textColor } : undefined}>
        {subtitle && (
          <span
            className="hero-subtitle"
            style={subtitleColor ? { color: subtitleColor } : textColor ? { color: textColor } : undefined}
          >
            {subtitle}
          </span>
        )}
        <h1
          className="hero-title"
          style={titleColor ? { color: titleColor } : textColor ? { color: textColor } : undefined}
        >
          {title}
        </h1>
        {description && (
          <p
            className="hero-description"
            style={descriptionColor ? { color: descriptionColor } : textColor ? { color: textColor } : undefined}
          >
            {description}
          </p>
        )}

        {actions && actions.length > 0 && (
          <div className="hero-actions">
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
        )}
      </div>
    </section>
  );
};
