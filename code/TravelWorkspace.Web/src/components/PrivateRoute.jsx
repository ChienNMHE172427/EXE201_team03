import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const PrivateRoute = () => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.role === 'Admin') {
        return <Navigate to="/admin/dashboard" replace />;
      }
    }
  } catch (error) {
    // Fallback if parsing fails
  }

  return <Outlet />;
};

export default PrivateRoute;
