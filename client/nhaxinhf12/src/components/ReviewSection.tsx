import { useState } from "react";
import { Star, ThumbsUp, User } from "lucide-react";
import "./ReviewSection.css";
import type { ReviewSectionProps } from "../util/CONSTRAINT";
// Data mẫu đánh giá


export default function ReviewSection({ productName, reviews, onSubmitReview }: ReviewSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [content, setContent] = useState("");
  const [author, setAuthor] = useState("");
  const [helpedIds, setHelpedIds] = useState<Set<number>>(new Set());
  const [filterRating, setFilterRating] = useState(0); // 0 = tất cả

  // Thống kê
  const avgRating = reviews.length > 0
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;
  const ratingCounts = [5, 4, 3, 2, 1].map(
    (star) => ({ star, count: reviews.filter((r) => r.rating === star).length })
  );

  const filteredReviews = filterRating > 0
    ? reviews.filter((r) => r.rating === filterRating)
    : reviews;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0 || !content.trim() || !author.trim()) return;
    onSubmitReview?.({ rating, content: content.trim(), author: author.trim() });
    setRating(0);
    setContent("");
    setAuthor("");
    setShowForm(false);
  };

  const toggleHelpful = (id: number) => {
    setHelpedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="rv">
      {/* Summary */}
      <div className="rv-summary">
        <div className="rv-avg">
          <span className="rv-avg-number">{avgRating.toFixed(1)}</span>
          <div className="rv-avg-stars">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                size={18}
                fill={s <= Math.round(avgRating) ? "#e8a838" : "none"}
                color={s <= Math.round(avgRating) ? "#e8a838" : "#ddd"}
              />
            ))}
          </div>
          <span className="rv-avg-count">{reviews.length} đánh giá</span>
        </div>

        <div className="rv-bars">
          {ratingCounts.map(({ star, count }) => (
            <button
              key={star}
              className={`rv-bar-row ${filterRating === star ? "active" : ""}`}
              onClick={() => setFilterRating(filterRating === star ? 0 : star)}
            >
              <span className="rv-bar-label">{star} ★</span>
              <div className="rv-bar-track">
                <div
                  className="rv-bar-fill"
                  style={{
                    width: reviews.length > 0 ? `${(count / reviews.length) * 100}%` : "0%",
                  }}
                />
              </div>
              <span className="rv-bar-count">{count}</span>
            </button>
          ))}
        </div>

        <button className="btn-primary rv-write-btn" onClick={() => setShowForm(true)}>
          Viết đánh giá
        </button>
      </div>

      {/* Write Review Form */}
      {showForm && (
        <form className="rv-form" onSubmit={handleSubmit}>
          <h3>Đánh giá {productName}</h3>

          <div className="rv-form-stars">
            <span>Đánh giá của bạn:</span>
            <div className="rv-star-input">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onMouseEnter={() => setHoverRating(s)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(s)}
                  aria-label={`${s} sao`}
                >
                  <Star
                    size={28}
                    fill={(hoverRating || rating) >= s ? "#e8a838" : "none"}
                    color={(hoverRating || rating) >= s ? "#e8a838" : "#ccc"}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="rv-form-field">
            <label htmlFor="rv-author">Tên của bạn</label>
            <input
              id="rv-author"
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Nguyễn Văn A"
              required
            />
          </div>

          <div className="rv-form-field">
            <label htmlFor="rv-content">Nhận xét</label>
            <textarea
              id="rv-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này..."
              rows={4}
              required
            />
          </div>

          <div className="rv-form-actions">
            <button type="submit" className="btn-primary" disabled={rating === 0}>
              Gửi đánh giá
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
              Huỷ
            </button>
          </div>
        </form>
      )}

      {/* Filter info */}
      {filterRating > 0 && (
        <div className="rv-filter-info">
          Đang lọc: {filterRating} sao ({filteredReviews.length} đánh giá)
          <button onClick={() => setFilterRating(0)}>Xoá bộ lọc</button>
        </div>
      )}

      {/* Reviews List */}
      <div className="rv-list">
        {filteredReviews.length > 0 ? (
          filteredReviews.map((review) => (
            <article key={review.id} className="rv-item">
              <div className="rv-item-header">
                <div className="rv-item-avatar">
                  {review.avatar ? (
                    <img src={review.avatar} alt={review.author} />
                  ) : (
                    <User size={20} />
                  )}
                </div>
                <div>
                  <span className="rv-item-author">{review.author}</span>
                  <div className="rv-item-meta">
                    <span className="rv-item-stars">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={14}
                          fill={s <= review.rating ? "#e8a838" : "none"}
                          color={s <= review.rating ? "#e8a838" : "#ddd"}
                        />
                      ))}
                    </span>
                    <span className="rv-item-date">{review.date}</span>
                  </div>
                </div>
              </div>

              <p className="rv-item-content">{review.content}</p>

              {review.images && review.images.length > 0 && (
                <div className="rv-item-images">
                  {review.images.map((img, i) => (
                    <img key={i} src={img} alt={`Ảnh đánh giá ${i + 1}`} loading="lazy" />
                  ))}
                </div>
              )}

              <div className="rv-item-footer">
                <button
                  className={`rv-helpful-btn ${helpedIds.has(review.id) ? "active" : ""}`}
                  onClick={() => toggleHelpful(review.id)}
                >
                  <ThumbsUp size={14} />
                  Hữu ích ({review.helpful + (helpedIds.has(review.id) ? 1 : 0)})
                </button>
              </div>
            </article>
          ))
        ) : (
          <p className="rv-empty">Chưa có đánh giá nào {filterRating > 0 ? `${filterRating} sao` : ""}. Hãy là người đầu tiên!</p>
        )}
      </div>
    </div>
  );
}
