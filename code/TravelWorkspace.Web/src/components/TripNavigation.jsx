import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const TripNavigation = ({ selectedTripId }) => {
  const navigate = useNavigate();
  const location = useLocation();

  if (!selectedTripId) return null;

  const steps = [
    { num: 1, title: 'Lịch trình', path: '/itinerary' },
    { num: 2, title: 'Chi phí nhóm', path: '/budget' },
    { num: 3, title: 'Cộng tác nhóm', path: '/collaborate' },
    { num: 4, title: 'Bạn đồng hành', path: '/companions' },
    { num: 5, title: 'Hành lý', path: '/packing' }
  ];

  const activeIndex = steps.findIndex(step => location.pathname.includes(step.path));

  return (
    <div className="wizard-steps-container" style={{ marginBottom: '24px' }}>
      <div className="wizard-steps">
        {steps.map((step, index) => {
          const isActive = index === activeIndex || (activeIndex === -1 && index === 0 && location.pathname.includes('itinerary')); 
          // Default to itinerary if activeIndex is -1 but we are somehow on itinerary page but path differs
          const isPast = index < (activeIndex !== -1 ? activeIndex : 0);

          return (
            <React.Fragment key={step.num}>
              <div 
                className={`step ${isActive ? 'active' : ''} ${isPast ? 'completed' : ''}`} 
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`${step.path}?tripId=${selectedTripId}`)}
              >
                <div className="step-circle" style={{ 
                  backgroundColor: isActive || isPast ? '#122B29' : '#e2e8f0', 
                  color: isActive || isPast ? '#fff' : '#64748b' 
                }}>
                  {step.num}
                </div>
                <div className="step-info">
                  <div className="step-title" style={{
                    color: isActive || isPast ? '#122B29' : '#64748b',
                    fontWeight: isActive || isPast ? '700' : '500'
                  }}>
                    {step.title}
                  </div>
                </div>
              </div>
              {index < steps.length - 1 && <div className="step-line" style={{ backgroundColor: isPast ? '#122B29' : '#e2e8f0' }}></div>}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default TripNavigation;
