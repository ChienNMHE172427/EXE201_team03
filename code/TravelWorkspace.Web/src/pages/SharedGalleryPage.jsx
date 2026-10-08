import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  UploadCloud, 
  Image as ImageIcon, 
  Trash2, 
  Download, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ArrowLeft,
  Users, 
  Calendar,
  CheckCircle2,
  Maximize2
} from 'lucide-react';
import api from '../services/api';
import { getShortLocation, formatItemTitle } from '../utils/formatLocation';
import './SharedGalleryPage.css';

const API_BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5300';

const getFullPhotoUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_BASE_URL}${url.startsWith('/') ? url : '/' + url}`;
};

const SharedGalleryPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [trips, setTrips] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [trip, setTrip] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Optimistic upload state: array of { id, tempUrl, name, progress: 'uploading' | 'done' | 'error' }
  const [uploadQueue, setUploadQueue] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [captionInput, setCaptionInput] = useState('');

  // Lightbox Modal state
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const fileInputRef = useRef(null);

  // Initial fetch of trips
  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const res = await api.get('/Trip');
        setTrips(res.data);

        const params = new URLSearchParams(location.search);
        const tripIdFromUrl = params.get('tripId');
        if (tripIdFromUrl) {
          setSelectedTripId(parseInt(tripIdFromUrl));
        } else {
          const savedTripId = localStorage.getItem('currentTripId');
          if (savedTripId && res.data.some(t => t.id === parseInt(savedTripId))) {
            setSelectedTripId(parseInt(savedTripId));
          }
        }
      } catch (err) {
        console.error('Error fetching trips:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTrips();
  }, [location.search]);

  // Fetch photos when trip selected
  const fetchPhotos = async (tripId) => {
    try {
      const [tripRes, photosRes] = await Promise.all([
        api.get(`/Trip/${tripId}`),
        api.get(`/trips/${tripId}/photos`)
      ]);
      setTrip(tripRes.data);
      setPhotos(photosRes.data);
    } catch (err) {
      console.error('Error fetching gallery photos:', err);
    }
  };

  useEffect(() => {
    if (selectedTripId) {
      fetchPhotos(selectedTripId);
      localStorage.setItem('currentTripId', selectedTripId);
    }
  }, [selectedTripId]);

  // Handle file selection (with Optimistic UX thumbnails)
  const handleFilesSelected = async (filesList) => {
    if (!selectedTripId || !filesList || filesList.length === 0) return;

    const files = Array.from(filesList);

    // 1. Tạo thumbnail tạm thời hiển thị ngay lập tức (Optimistic Preview)
    const tempQueueItems = files.map((file, idx) => ({
      id: `temp_${Date.now()}_${idx}`,
      file,
      tempUrl: URL.createObjectURL(file),
      name: file.name,
      status: 'uploading'
    }));

    setUploadQueue(prev => [...prev, ...tempQueueItems]);

    // 2. Đóng gói FormData và upload lên Backend (đẩy tiếp lên Cloudinary)
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    if (captionInput.trim()) {
      formData.append('caption', captionInput.trim());
    }

    try {
      const res = await api.post(`/trips/${selectedTripId}/photos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // 3. Xóa các queue tạm thời sau khi upload thành công và cập nhật danh sách ảnh thật
      setUploadQueue(prev => prev.filter(q => !tempQueueItems.some(t => t.id === q.id)));
      tempQueueItems.forEach(t => URL.revokeObjectURL(t.tempUrl));

      if (res.data && Array.isArray(res.data)) {
        setPhotos(prev => [...res.data, ...prev]);
      } else {
        await fetchPhotos(selectedTripId);
      }

      setCaptionInput('');
    } catch (err) {
      console.error('Upload error:', err);
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi tải ảnh lên. Vui lòng thử lại.');
      // Xóa queue nếu lỗi
      setUploadQueue(prev => prev.filter(q => !tempQueueItems.some(t => t.id === q.id)));
    }
  };

  // Drag & Drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  // Delete photo handler
  const handleDeletePhoto = async (e, photoId) => {
    e.stopPropagation();
    if (!window.confirm('Bạn có chắc chắn muốn xóa bức ảnh này khỏi kho ảnh chung?')) return;

    try {
      await api.delete(`/trips/${selectedTripId}/photos/${photoId}`);
      setPhotos(prev => prev.filter(p => p.id !== photoId));
      if (lightboxIndex !== null) {
        setLightboxIndex(null);
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert(err.response?.data?.message || 'Không thể xóa ảnh.');
    }
  };

  // Keyboard navigation for Lightbox
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (lightboxIndex === null) return;
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowRight') handleNextPhoto();
      if (e.key === 'ArrowLeft') handlePrevPhoto();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, photos]);

  const handlePrevPhoto = () => {
    if (lightboxIndex > 0) {
      setLightboxIndex(lightboxIndex - 1);
    } else {
      setLightboxIndex(photos.length - 1);
    }
  };

  const handleNextPhoto = () => {
    if (lightboxIndex < photos.length - 1) {
      setLightboxIndex(lightboxIndex + 1);
    } else {
      setLightboxIndex(0);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <h2 style={{ marginTop: 40 }}>Đang tải kho ảnh chung...</h2>
      </div>
    );
  }

  // Trip Selector if not selected
  if (!selectedTripId || !trip) {
    return (
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">Kho ảnh chung của chuyến đi</h1>
            <p className="page-subtitle">Không gian lưu trữ ảnh chất lượng cao tích hợp Cloudinary cho tất cả thành viên trong nhóm.</p>
          </div>
        </div>

        <div className="explore-grid mt-8" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px', marginTop: '32px' }}>
          {trips.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)' }}>Bạn chưa có chuyến đi nào.</p>
          ) : (
            trips.map(t => (
              <div
                key={t.id}
                onClick={() => setSelectedTripId(t.id)}
                style={{ cursor: 'pointer', background: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)', transition: 'transform 0.2s', border: '1px solid #eaeaea' }}
              >
                <div style={{ height: '120px', background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)' }}></div>
                <div style={{ padding: '20px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: 'var(--color-text)' }}>{t.title}</h3>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', lineHeight: '1.5' }}>
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                      <Users size={14} color="#0284c7" style={{ marginRight: 6 }} /> Nhóm: {t.numberOfParticipants || 1} người
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', marginTop: 4 }}>
                      <span style={{ color: '#ef4444', marginRight: 6 }}>📍</span> Điểm đến: {getShortLocation(t.destination)}
                    </span>
                  </p>
                  <div style={{ marginTop: '16px', fontWeight: '600', color: '#0284c7', fontSize: '14px' }}>
                    + Mở kho ảnh chuyến đi
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // Calculate unique contributors
  const contributors = new Set(photos.map(p => p.uploadedByName)).size;
  const currentLightboxPhoto = lightboxIndex !== null ? photos[lightboxIndex] : null;

  return (
    <div className="page-container gallery-container">
      {/* Back button */}
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => { setSelectedTripId(null); setTrip(null); }}
          style={{ background: 'transparent', border: 'none', color: 'var(--color-primary-dark)', cursor: 'pointer', fontWeight: '700', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <ArrowLeft size={18} />
          {trip.title}
        </button>
      </div>

      {/* Wizard Steps */}
      <div className="wizard-steps-container">
        <div className="wizard-steps">
          <div className="step" style={{ cursor: 'pointer' }} onClick={() => navigate(`/itinerary?tripId=${selectedTripId}`)}>
            <div className="step-circle">1</div>
            <div className="step-info"><div className="step-title">Lịch trình</div></div>
          </div>
          <div className="step-line"></div>
          <div className="step" style={{ cursor: 'pointer' }} onClick={() => navigate(`/budget?tripId=${selectedTripId}`)}>
            <div className="step-circle">2</div>
            <div className="step-info"><div className="step-title">Chi phí</div></div>
          </div>
          <div className="step-line"></div>
          <div className="step" style={{ cursor: 'pointer' }} onClick={() => navigate(`/collaborate?tripId=${selectedTripId}`)}>
            <div className="step-circle">3</div>
            <div className="step-info"><div className="step-title">Cộng tác</div></div>
          </div>
          <div className="step-line"></div>
          <div className="step active">
            <div className="step-circle">📸</div>
            <div className="step-info"><div className="step-title">Kho ảnh chung</div></div>
          </div>
        </div>
      </div>

      {/* Page Header */}
      <div className="gallery-header">
        <div className="gallery-title-area">
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            📸 Kho ảnh: {formatItemTitle(trip.title)}
          </h1>
          <p className="page-subtitle">
            Lưu giữ trọn vẹn kỷ niệm du lịch độ phân giải cao trên Cloudinary • {photos.length} bức ảnh • {contributors} người đóng góp
          </p>
        </div>

        <button
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#0284c7' }}
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadCloud size={18} />
          + Tải ảnh lên
        </button>
      </div>

      {/* DRAG & DROP UPLOAD ZONE (Theo yêu cầu kỹ thuật) */}
      <div
        className={`gallery-dropzone ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="gallery-dropzone-icon">
          <UploadCloud size={30} />
        </div>
        <h3 style={{ margin: '0 0 6px 0', fontSize: '17px', color: '#1e293b' }}>
          Kéo & thả ảnh vào đây, hoặc <span style={{ color: '#0284c7', textDecoration: 'underline' }}>chọn nhiều file từ máy</span>
        </h3>
        <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
          Hỗ trợ JPG, PNG, WEBP, GIF dung lượng tối đa 15MB/ảnh. Lưu trữ đám mây Cloudinary không giới hạn.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => handleFilesSelected(e.target.files)}
        />
      </div>

      {/* GOOGLE PHOTOS MASONRY / GRID LAYOUT */}
      {photos.length === 0 && uploadQueue.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 20, border: '1px dashed #cbd5e1' }}>
          <ImageIcon size={56} color="#94a3b8" style={{ margin: '0 auto 16px auto' }} />
          <h3 style={{ fontSize: '18px', color: '#1e293b', marginBottom: 8 }}>Chưa có bức ảnh nào trong chuyến đi này</h3>
          <p style={{ color: '#64748b', fontSize: '14px', maxWidth: 420, margin: '0 auto 20px auto' }}>
            Hãy là người đầu tiên chia sẻ những khoảnh khắc tuyệt vời của chuyến đi cho cả nhóm cùng chiêm ngưỡng!
          </p>
          <button className="btn-primary" onClick={() => fileInputRef.current?.click()}>
            Tải ảnh đầu tiên lên ngay
          </button>
        </div>
      ) : (
        <div className="gallery-grid">
          {/* 1. RENDER OPTIMISTIC UPLOAD CARDS (UX Tối ưu: Xem trước thumbnail tạm thời và spinner xoay) */}
          {uploadQueue.map(tempItem => (
            <div key={tempItem.id} className="gallery-card uploading">
              <img src={tempItem.tempUrl} alt="Uploading..." className="gallery-img" style={{ filter: 'brightness(0.7)' }} />
              <div className="gallery-uploading-spinner-overlay">
                <div className="gallery-spinner"></div>
                <span style={{ fontSize: '13px', fontWeight: '600' }}>Đang tải lên Cloudinary...</span>
                <span style={{ fontSize: '11px', color: '#cbd5e1', maxWidth: '85%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {tempItem.name}
                </span>
              </div>
            </div>
          ))}

          {/* 2. RENDER REAL PHOTOS */}
          {photos.map((photo, index) => (
            <div
              key={photo.id}
              className="gallery-card"
              onClick={() => setLightboxIndex(index)}
            >
              <img
                src={getFullPhotoUrl(photo.photoUrl)}
                alt={photo.caption || 'Trip Photo'}
                className="gallery-img"
                loading="lazy"
              />

              {/* Hover overlay với thông tin uploader và nút chức năng */}
              <div className="gallery-card-overlay">
                <div className="gallery-uploader-badge">
                  <div className="gallery-uploader-avatar">
                    {photo.uploadedByName ? photo.uploadedByName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span>{photo.uploadedByName}</span>
                </div>

                <div className="gallery-card-actions">
                  <button
                    className="gallery-action-btn"
                    title="Xem phóng to"
                    onClick={(e) => { e.stopPropagation(); setLightboxIndex(index); }}
                  >
                    <Maximize2 size={15} />
                  </button>
                  <a
                    href={getFullPhotoUrl(photo.photoUrl)}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="gallery-action-btn"
                    title="Tải về máy"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Download size={15} />
                  </a>
                  {photo.canDelete && (
                    <button
                      className="gallery-action-btn delete-btn"
                      title="Xóa ảnh này"
                      onClick={(e) => handleDeletePhoto(e, photo.id)}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* LIGHTBOX MODAL (Xem ảnh phóng to & điều hướng) */}
      {currentLightboxPhoto && (
        <div className="lightbox-backdrop" onClick={() => setLightboxIndex(null)}>
          {/* Top Bar */}
          <div className="lightbox-topbar" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="gallery-uploader-avatar" style={{ width: 34, height: 34, fontSize: 13 }}>
                {currentLightboxPhoto.uploadedByName?.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{currentLightboxPhoto.uploadedByName}</div>
                <div style={{ fontSize: 12, color: '#cbd5e1' }}>
                  Đã tải lên lúc {new Date(currentLightboxPhoto.uploadedAt).toLocaleString('vi-VN')}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 13, color: '#94a3b8' }}>
                {lightboxIndex + 1} / {photos.length}
              </span>

              <a
                href={getFullPhotoUrl(currentLightboxPhoto.photoUrl)}
                download
                target="_blank"
                rel="noreferrer"
                className="gallery-action-btn"
                title="Tải ảnh gốc về máy"
              >
                <Download size={16} />
              </a>

              {currentLightboxPhoto.canDelete && (
                <button
                  className="gallery-action-btn delete-btn"
                  title="Xóa ảnh này"
                  onClick={(e) => handleDeletePhoto(e, currentLightboxPhoto.id)}
                >
                  <Trash2 size={16} />
                </button>
              )}

              <button
                className="gallery-action-btn"
                title="Đóng (Esc)"
                onClick={() => setLightboxIndex(null)}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Lightbox Content */}
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="lightbox-nav-btn prev"
              onClick={handlePrevPhoto}
              title="Ảnh trước (Mũi tên trái)"
            >
              <ChevronLeft size={28} />
            </button>

            <img
              src={getFullPhotoUrl(currentLightboxPhoto.photoUrl)}
              alt="Lightbox View"
              className="lightbox-main-img"
            />

            <button
              className="lightbox-nav-btn next"
              onClick={handleNextPhoto}
              title="Ảnh sau (Mũi tên phải)"
            >
              <ChevronRight size={28} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SharedGalleryPage;
