import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';

const PrivateRoute: React.FC = () => {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  return currentUser ? <Outlet /> : <Navigate to="/login" />;
};
export default PrivateRoute;