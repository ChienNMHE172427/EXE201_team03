import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PublicTripList from '../components/PublicTripList';
import { 
  Sparkles, 
  MapPin, 
  Compass, 
  Users, 
  Calendar, 
  ArrowRight, 
  CheckCircle,
  Layers,
  Zap
} from 'lucide-react';
import './HomePage.css';

export default function HomePage() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
  }, []);

  return (
    <div className="home-page w-full min-h-screen">
      {/* Hero Section */}
      <section className="home-hero w-full">
        <div className="home-hero-inner">
          <div className="home-hero-badge">
            <Zap size={14} />
            <span>TÍNH NĂNG MỚI: CLONE LỊCH TRÌNH 1-CLICK</span>
          </div>

          <h1 className="home-hero-title">
            Khám Phá & Sử Dụng <span>Lịch Trình Mẫu</span> Hàng Đầu
          </h1>

          <p className="home-hero-desc">
            Không còn loay hoay lên kế hoạch từ con số 0. Chọn ngay các lịch trình du lịch chất lượng cao đã được tối ưu điểm đến, cung đường, và tịnh tiến ngày tự động chỉ với 1 cú click.
          </p>

          <div className="home-hero-cta-group">
            <button
              type="button"
              className="home-btn-accent"
              onClick={() => {
                const feed = document.getElementById('public-feed-section');
                if (feed) feed.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <span>🔥 Xem các Template Hot</span>
              <ArrowRight size={16} />
            </button>

            {isLoggedIn ? (
              <button
                type="button"
                className="home-btn-secondary"
                onClick={() => navigate('/dashboard')}
              >
                <span>Vào Workspace của tôi</span>
              </button>
            ) : (
              <button
                type="button"
                className="home-btn-secondary"
                onClick={() => navigate('/register')}
              >
                <span>Bắt đầu miễn phí</span>
              </button>
            )}
          </div>

          {/* Feature Highlights */}
          <div className="home-hero-features">
            <div className="home-feature-pill">
              <div className="home-feature-icon">
                <Layers size={18} strokeWidth={2.4} />
              </div>
              <span>Sao chép sâu toàn bộ chặng</span>
            </div>
            <div className="home-feature-pill">
              <div className="home-feature-icon">
                <Calendar size={18} strokeWidth={2.4} />
              </div>
              <span>Tịnh tiến ngày thông minh</span>
            </div>
            <div className="home-feature-pill">
              <div className="home-feature-icon">
                <CheckCircle size={18} strokeWidth={2.4} />
              </div>
              <span>Bảo mật dữ liệu cá nhân & chi phí</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Public Feed Section */}
      <main className="home-main w-full" id="public-feed-section">
        <PublicTripList />
      </main>

      {/* Footer */}
      <footer className="home-footer">
        <p>© 2026 Travel Workspace Team. Nền tảng quản lý lịch trình & chia sẻ trải nghiệm du lịch số 1.</p>
      </footer>
    </div>
  );
}
