import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const AdminRoute = () => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.role === 'Admin') {
        return <Outlet />;
      }
    }
  } catch (error) {
    // Fallback
  }

  // Not admin, redirect to normal dashboard
  return <Navigate to="/dashboard" replace />;
};

export default AdminRoute;
