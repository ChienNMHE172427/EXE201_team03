import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { getShortLocation, formatItemTitle } from '../utils/formatLocation';
import PackingList from '../components/PackingList';
import { Luggage, ArrowLeft, Users, MapPin } from 'lucide-react';

const PackingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [trips, setTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const res = await api.get('/Trip');
        setTrips(res.data);

        const params = new URLSearchParams(location.search);
        const tripIdFromUrl = params.get('tripId');
        if (tripIdFromUrl) {
          const trip = res.data.find(t => t.id === parseInt(tripIdFromUrl));
          if (trip) setSelectedTrip(trip);
        } else if (res.data.length > 0) {
          const savedTripId = localStorage.getItem('currentTripId');
          const found = res.data.find(t => t.id === parseInt(savedTripId));
          if (found) setSelectedTrip(found);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTrips();
  }, [location.search]);

  const handleSelectTrip = (trip) => {
    setSelectedTrip(trip);
    localStorage.setItem('currentTripId', trip.id.toString());
  };

  const handleBack = () => {
    setSelectedTrip(null);
  };

  if (loading) {
    return (
      <div className="page-container">
        <h2 style={{ marginTop: 40 }}>Đang tải danh sách chuyến đi...</h2>
      </div>
    );
  }

  if (!selectedTrip) {
    return (
      <div className="page-container p-6">
        <div className="page-header mb-8">
          <div>
            <h1 className="page-title text-2xl font-bold text-slate-800">Danh mục hành lý thông minh</h1>
            <p className="page-subtitle text-slate-500">Chọn một chuyến đi để bắt đầu lên danh sách đồ đạc cùng AI</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.length === 0 ? (
            <p className="text-slate-500">Bạn chưa có chuyến đi nào. Hãy tạo chuyến đi trước nhé!</p>
          ) : (
            trips.map(trip => (
              <div
                key={trip.id}
                onClick={() => handleSelectTrip(trip)}
                className="cursor-pointer bg-white rounded-2xl overflow-hidden border border-slate-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
              >
                <div className="h-28 bg-gradient-to-r from-teal-500 to-emerald-400 p-4 flex items-end">
                  <span className="text-white font-bold text-lg drop-shadow-sm">
                    {formatItemTitle(trip.title)}
                  </span>
                </div>
                <div className="p-5 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin className="w-4 h-4 text-rose-500" />
                    <span>Điểm đến: <strong>{getShortLocation(trip.destination)}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Users className="w-4 h-4 text-indigo-500" />
                    <span>Nhóm: <strong>{trip.numberOfParticipants || 1} người</strong></span>
                  </div>
                  <div className="pt-2 text-sm font-semibold text-teal-600 flex items-center gap-1">
                    <span>Mở danh mục hành lý →</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900 transition bg-white px-4 py-2 rounded-xl border border-slate-300 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Trở về chuyến đi</span>
        </button>

        <span className="text-sm font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg">
          📍 {getShortLocation(selectedTrip.destination)}
        </span>
      </div>

      {/* Render Component PackingList */}
      <PackingList tripId={selectedTrip.id} />
    </div>
  );
};

export default PackingPage;
