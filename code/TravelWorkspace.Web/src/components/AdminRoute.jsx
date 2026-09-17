import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const AdminRoute = () => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  try {
    // Decode JWT token to check role (basic approach without library)
    const payload = JSON.parse(atob(token.split('.')[1]));
    const role = payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
    
    if (role === 'Admin') {
      return <Outlet />;
    } else {
      // Not admin, redirect to normal dashboard
      return <Navigate to="/dashboard" replace />;
    }
  } catch (error) {
    return <Navigate to="/login" replace />;
  }
};

export default AdminRoute;
