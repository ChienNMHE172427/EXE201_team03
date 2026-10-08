import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Tag } from 'lucide-react';
import ReviewSection from '../components/ReviewSection';

const PlaceDetailsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);

  const placeId = searchParams.get('placeId') || 'hanoi-default';
  const placeName = searchParams.get('placeName') || 'Địa điểm du lịch';
  const category = searchParams.get('category') || 'Điểm tham quan';
  const description = searchParams.get('desc') || '';

  return (
    <div className="page-container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 20px' }}>
      <button
        onClick={() => navigate(-1)}
        style={{
          background: 'none',
          border: 'none',
          color: '#0284c7',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          fontWeight: '600',
          marginBottom: '20px',
          padding: 0
        }}
      >
        <ArrowLeft size={18} /> Quay lại
      </button>

      {/* Place Summary Header */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
          marginBottom: '24px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span
            style={{
              background: '#e0f2fe',
              color: '#0369a1',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: '600',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Tag size={12} /> {category}
          </span>
        </div>

        <h1 style={{ margin: '0 0 10px 0', fontSize: '1.75rem', fontWeight: '800', color: '#0f172a' }}>
          {placeName}
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.9rem', marginBottom: '14px' }}>
          <MapPin size={16} />
          <span>Mã địa điểm: {placeId}</span>
        </div>

        {description && (
          <p style={{ margin: 0, color: '#334155', lineHeight: '1.6', fontSize: '0.95rem' }}>
            {description}
          </p>
        )}
      </div>

      {/* Community Reviews & Tips Section */}
      <ReviewSection placeId={placeId} placeName={placeName} />
    </div>
  );
};

export default PlaceDetailsPage;
