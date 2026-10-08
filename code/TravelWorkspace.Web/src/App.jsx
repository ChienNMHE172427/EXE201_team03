import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
import ConfirmEmailPage from './pages/Auth/ConfirmEmailPage';
import DashboardPage from './pages/DashboardPage';
import CreateTripPage from './pages/CreateTripPage';
import CompanionsPage from './pages/CompanionsPage';
import DocumentsPage from './pages/DocumentsPage';
import BudgetPage from './pages/BudgetPage';
import ExpensePage from './pages/ExpensePage';
import Sidebar from './components/Sidebar';
import AdminSidebar from './components/AdminSidebar';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';
import AdminDashboard from './pages/Admin/AdminDashboard';
import AdminUsers from './pages/Admin/AdminUsers';
import AdminPartners from './pages/Admin/AdminPartners';
import AdminContent from './pages/Admin/AdminContent';
import ProfilePage from './pages/ProfilePage';
import ItineraryPage from './pages/ItineraryPage';
import CollaboratePage from './pages/CollaboratePage';
import PackingPage from './pages/PackingPage';
import SharedGalleryPage from './pages/SharedGalleryPage';
import PlaceDetailsPage from './pages/PlaceDetailsPage';
import InvitationsPage from './pages/InvitationsPage';

// Layout component to selectively show sidebars
const Layout = ({ children }) => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isExploreRoute = location.pathname === '/explore';

  return (
    <div className="app-layout">
      {isAdminRoute ? <AdminSidebar /> : <Sidebar />}
      <div 
        className={`main-content ${isExploreRoute ? 'main-content-explore' : ''}`}
        style={isExploreRoute ? { padding: 0 } : undefined}
      >
        {children}
      </div>
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <div className="w-full min-h-screen flex flex-col">
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/confirm-email" element={<ConfirmEmailPage />} />

          {/* Admin Routes */}
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/dashboard" element={<Layout><AdminDashboard /></Layout>} />
            <Route path="/admin/users" element={<Layout><AdminUsers /></Layout>} />
            <Route path="/admin/partners" element={<Layout><AdminPartners /></Layout>} />
            <Route path="/admin/content" element={<Layout><AdminContent /></Layout>} />
          </Route>

          {/* Traveler Routes (Protected) */}
          <Route element={<PrivateRoute />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Layout><DashboardPage /></Layout>} />
            <Route path="/create-trip" element={<Layout><CreateTripPage /></Layout>} />
            <Route path="/explore" element={<Layout><HomePage /></Layout>} />
            <Route path="/invitations" element={<Layout><InvitationsPage /></Layout>} />
            <Route path="/companions" element={<Layout><CompanionsPage /></Layout>} />
            <Route path="/documents" element={<Navigate to="/itinerary" replace />} />
            <Route path="/budget" element={<Layout><BudgetPage /></Layout>} />
            <Route path="/expenses" element={<Layout><ExpensePage /></Layout>} />
            <Route path="/itinerary" element={<Layout><ItineraryPage /></Layout>} />
            <Route path="/itinerary/:tripId" element={<Layout><ItineraryPage /></Layout>} />
            <Route path="/collaborate" element={<Layout><CollaboratePage /></Layout>} />
            <Route path="/packing" element={<Layout><PackingPage /></Layout>} />
            <Route path="/gallery" element={<Layout><SharedGalleryPage /></Layout>} />
            <Route path="/photos" element={<Layout><SharedGalleryPage /></Layout>} />
            <Route path="/place-details" element={<Layout><PlaceDetailsPage /></Layout>} />
            <Route path="/profile" element={<Layout><ProfilePage /></Layout>} />
          </Route>

          {/* Catch-all: redirect unknown paths to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
