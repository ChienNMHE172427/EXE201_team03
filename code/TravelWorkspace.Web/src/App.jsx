import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import CreateTripPage from './pages/CreateTripPage';
import ExplorePage from './pages/ExplorePage';
import CompanionsPage from './pages/CompanionsPage';
import DocumentsPage from './pages/DocumentsPage';
import BudgetPage from './pages/BudgetPage';
import Sidebar from './components/Sidebar';
import AdminSidebar from './components/AdminSidebar';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';
import AdminDashboard from './pages/Admin/AdminDashboard';
import AdminUsers from './pages/Admin/AdminUsers';
import ProfilePage from './pages/ProfilePage';
import ItineraryPage from './pages/ItineraryPage';
import CollaboratePage from './pages/CollaboratePage';

// Layout component to selectively show sidebars
const Layout = ({ children }) => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <div className="app-layout">
      {isAdminRoute ? <AdminSidebar /> : <Sidebar />}
      <div className="main-content">
        {children}
      </div>
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        
        {/* Admin Routes */}
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<Layout><AdminDashboard /></Layout>} />
          <Route path="/admin/users" element={<Layout><AdminUsers /></Layout>} />
          <Route path="/admin/services" element={<Layout><div className="admin-page"><h2>Duyệt dịch vụ (Coming soon)</h2></div></Layout>} />
        </Route>

        {/* Traveler Routes */}
        <Route element={<PrivateRoute />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Layout><DashboardPage /></Layout>} />
          <Route path="/create-trip" element={<Layout><CreateTripPage /></Layout>} />
          <Route path="/explore" element={<Layout><ExplorePage /></Layout>} />
          <Route path="/companions" element={<Layout><CompanionsPage /></Layout>} />
          <Route path="/documents" element={<Layout><DocumentsPage /></Layout>} />
          <Route path="/budget" element={<Layout><BudgetPage /></Layout>} />
          <Route path="/itinerary" element={<Layout><ItineraryPage /></Layout>} />
          <Route path="/collaborate" element={<Layout><CollaboratePage /></Layout>} />
          <Route path="/profile" element={<Layout><ProfilePage /></Layout>} />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;
