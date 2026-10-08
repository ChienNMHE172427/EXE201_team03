import React, { useState, useEffect, useCallback } from 'react';
import { Star, ThumbsUp, Sparkles, MessageSquare, Send, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../services/api';
import './ReviewSection.css';

/**
 * ReviewSection Component
 * @param {string} placeId - ID of the place (Google Place ID or internal string/number)
 * @param {string} placeName - Name of the place for display and AI prompt context
 */
const ReviewSection = ({ placeId, placeName = 'Địa điểm' }) => {
  const [reviewsData, setReviewsData] = useState({
    placeId: placeId,
    placeName: placeName,
    totalReviews: 0,
    averageRating: 0,
    reviews: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('latest'); // 'latest' | 'helpful'

  // New review form state
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // AI Summary state
  const [aiSummary, setAiSummary] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  // Track reviews marked helpful in this session
  const [helpfulClicked, setHelpfulClicked] = useState({});

  const fetchReviews = useCallback(async () => {
    if (!placeId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/places/${encodeURIComponent(placeId)}/reviews`, {
        params: {
          page: 1,
          pageSize: 50,
          sortBy: sortBy
        }
      });
      setReviewsData(res.data);
    } catch (err) {
      console.error('Lỗi khi tải đánh giá:', err);
      setError('Không thể tải đánh giá cộng đồng. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  }, [placeId, sortBy]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Handle submit review
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/places/${encodeURIComponent(placeId)}/reviews`, {
        placeName: placeName,
        rating: rating,
        content: content.trim()
      });

      setContent('');
      setRating(5);
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 3000);

      // Refresh reviews list
      await fetchReviews();
    } catch (err) {
      console.error('Lỗi khi gửi đánh giá:', err);
      const msg = err.response?.data?.message || 'Có lỗi xảy ra khi gửi đánh giá. Vui lòng đăng nhập và thử lại.';
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle helpful click
  const handleHelpfulClick = async (reviewId) => {
    if (helpfulClicked[reviewId]) return;

    try {
      // Optimistic update
      setHelpfulClicked(prev => ({ ...prev, [reviewId]: true }));
      setReviewsData(prev => ({
        ...prev,
        reviews: prev.reviews.map(r => 
          r.id === reviewId ? { ...r, helpfulCount: r.helpfulCount + 1 } : r
        )
      }));

      await api.put(`/reviews/${reviewId}/helpful`);
    } catch (err) {
      console.error('Lỗi khi thích đánh giá:', err);
      // Revert optimistic update on failure
      setHelpfulClicked(prev => ({ ...prev, [reviewId]: false }));
      setReviewsData(prev => ({
        ...prev,
        reviews: prev.reviews.map(r => 
          r.id === reviewId ? { ...r, helpfulCount: Math.max(0, r.helpfulCount - 1) } : r
        )
      }));
    }
  };

  // Handle AI Tip Summary
  const handleGenerateAiSummary = async () => {
    setIsAiLoading(true);
    setAiError(null);
    try {
      const res = await api.post(`/places/${encodeURIComponent(placeId)}/reviews/ai-summary`, {
        placeName: placeName
      });
      setAiSummary(res.data);
    } catch (err) {
      console.error('Lỗi khi tóm tắt bằng AI:', err);
      setAiError(err.response?.data?.message || 'Không thể tạo tóm tắt AI vào lúc này.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const getStarLabel = (score) => {
    switch (score) {
      case 5: return 'Tuyệt vời & Rất hữu ích';
      case 4: return 'Tốt, đáng trải nghiệm';
      case 3: return 'Bình thường';
      case 2: return 'Chưa hài lòng';
      case 1: return 'Không khuyến khích';
      default: return '';
    }
  };

  const formatDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="review-section-container">
      {/* Header & Stats */}
      <div className="review-header">
        <div className="review-header-left">
          <div className="review-title-row">
            <MessageSquare className="review-title-icon" size={24} />
            <h3 className="review-section-title">Đánh giá & Mẹo du lịch cộng đồng</h3>
          </div>
          <p className="review-section-subtitle">
            Kinh nghiệm thực tế, cảnh báo & mẹo hay tại <strong>{placeName}</strong>
          </p>
        </div>

        <div className="review-header-right">
          <button
            type="button"
            className="ai-summary-btn"
            onClick={handleGenerateAiSummary}
            disabled={isAiLoading || reviewsData.totalReviews === 0}
            title={reviewsData.totalReviews === 0 ? "Chưa có đánh giá nào để AI tóm tắt" : "Tóm tắt mẹo bằng AI"}
          >
            <Sparkles className={`sparkle-icon ${isAiLoading ? 'spin' : ''}`} size={17} />
            <span>{isAiLoading ? 'AI đang tóm tắt...' : '✨ Tóm tắt mẹo bằng AI'}</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="review-stats-bar">
        <div className="stats-score-block">
          <div className="stats-big-number">{reviewsData.averageRating.toFixed(1)}</div>
          <div className="stats-stars">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                size={18}
                className={s <= Math.round(reviewsData.averageRating) ? 'star-filled' : 'star-empty'}
              />
            ))}
          </div>
          <span className="stats-count">({reviewsData.totalReviews} nhận xét)</span>
        </div>

        {reviewsData.totalReviews > 0 && (
          <div className="review-sort-block">
            <span className="sort-label">Sắp xếp:</span>
            <div className="sort-buttons">
              <button
                type="button"
                className={`sort-pill ${sortBy === 'latest' ? 'active' : ''}`}
                onClick={() => setSortBy('latest')}
              >
                Mới nhất
              </button>
              <button
                type="button"
                className={`sort-pill ${sortBy === 'helpful' ? 'active' : ''}`}
                onClick={() => setSortBy('helpful')}
              >
                Hữu ích nhất
              </button>
            </div>
          </div>
        )}
      </div>

      {/* AI Tips Summary Card */}
      {aiSummary && (
        <div className="ai-summary-card animate-fadeIn">
          <div className="ai-summary-header">
            <div className="ai-badge">
              <Sparkles size={16} />
              <span>Gợi ý chắt lọc bởi Gemini AI</span>
            </div>
            <span className="ai-analysis-meta">
              Tổng hợp từ {aiSummary.totalReviewsAnalyzed} mẹo cộng đồng
            </span>
          </div>
          <div className="ai-summary-body">
            <ul className="ai-tips-list">
              {aiSummary.summaryTips && aiSummary.summaryTips.map((tip, idx) => (
                <li key={idx} className="ai-tip-item">
                  <span className="ai-tip-bullet">💡</span>
                  <span className="ai-tip-text">{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {aiError && (
        <div className="review-alert error">
          <AlertCircle size={16} />
          <span>{aiError}</span>
        </div>
      )}

      {/* Write Review Form */}
      <div className="review-form-card">
        <h4 className="form-card-title">Chia sẻ mẹo hoặc đánh giá của bạn</h4>
        <form onSubmit={handleSubmitReview}>
          {/* Star Picker */}
          <div className="form-rating-row">
            <span className="form-label">Chấm điểm:</span>
            <div className="star-picker">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  className="star-btn"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  aria-label={`${star} sao`}
                >
                  <Star
                    size={22}
                    className={(hoverRating || rating) >= star ? 'star-filled' : 'star-empty'}
                  />
                </button>
              ))}
            </div>
            <span className="star-rating-hint">{getStarLabel(hoverRating || rating)}</span>
          </div>

          {/* Text Area */}
          <div className="form-textarea-wrapper">
            <textarea
              className="review-textarea"
              rows={3}
              placeholder="Chia sẻ mẹo hay (ví dụ: giờ vắng vẻ, chỗ gửi xe, lưu ý trang phục, món nên thử...)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={1500}
            />
            <div className="textarea-footer">
              <span className="char-counter">{content.length}/1500 ký tự</span>
            </div>
          </div>

          {submitSuccess && (
            <div className="review-alert success animate-fadeIn">
              <CheckCircle size={16} />
              <span>Cảm ơn bạn! Đánh giá & mẹo đã được chia sẻ công khai.</span>
            </div>
          )}

          <div className="form-submit-row">
            <button
              type="submit"
              className="submit-review-btn"
              disabled={submitting || !content.trim()}
            >
              {submitting ? (
                <>
                  <RefreshCw className="spin" size={16} />
                  <span>Đang đăng...</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>Đăng mẹo & đánh giá</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Review List */}
      <div className="reviews-list-section">
        {loading ? (
          <div className="reviews-loading">
            <RefreshCw className="spin" size={24} />
            <span>Đang tải các đánh giá cộng đồng...</span>
          </div>
        ) : error ? (
          <div className="review-alert error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        ) : reviewsData.reviews.length === 0 ? (
          <div className="reviews-empty-state">
            <div className="empty-icon-wrap">
              <MessageSquare size={36} />
            </div>
            <h4>Chưa có đánh giá nào cho địa điểm này</h4>
            <p>Hãy là người đầu tiên chia sẻ trải nghiệm và mẹo du lịch hữu ích cho cộng đồng!</p>
          </div>
        ) : (
          <div className="reviews-grid">
            {reviewsData.reviews.map((rev) => {
              const isHelpful = !!helpfulClicked[rev.id];
              return (
                <div key={rev.id} className="review-card">
                  <div className="review-card-top">
                    <div className="review-user-info">
                      {rev.userAvatar ? (
                        <img
                          src={rev.userAvatar.startsWith('http') ? rev.userAvatar : `http://localhost:5300${rev.userAvatar}`}
                          alt={rev.userName}
                          className="review-user-avatar"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div
                        className="review-user-fallback-avatar"
                        style={{ display: rev.userAvatar ? 'none' : 'flex' }}
                      >
                        {rev.userName ? rev.userName.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div className="review-user-details">
                        <span className="review-user-name">{rev.userName || 'Người dùng'}</span>
                        <span className="review-date">{formatDate(rev.createdAt)}</span>
                      </div>
                    </div>

                    <div className="review-card-stars">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={15}
                          className={s <= rev.rating ? 'star-filled' : 'star-empty'}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="review-card-content">
                    <p>{rev.content}</p>
                  </div>

                  <div className="review-card-footer">
                    <button
                      type="button"
                      className={`btn-helpful ${isHelpful ? 'active' : ''}`}
                      onClick={() => handleHelpfulClick(rev.id)}
                      title="Bấm nếu mẹo này hữu ích với bạn"
                    >
                      <ThumbsUp size={15} className={isHelpful ? 'thumb-active' : ''} />
                      <span>Hữu ích 👍 ({rev.helpfulCount})</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewSection;
