import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../auth/LoginPage';
import PrivateRoute from '../components/layouts/PrivateRoute';
import MainLayout from '../components/layouts/MainLayout';
import HomePage from '../pages/HomePage';
import TasksPage from '../pages/TasksPage';
import WarehousePage from '../pages/WarehousePage';
import InvoicesPage from '../pages/InvoicesPage';
import ContractorsPage from '../pages/ContractorsPage';
import ReferencesPage from '../pages/ReferencesPage';
import ContractorTasksPage from '../pages/ContractorTasksPage';
import { useAuth } from '../auth/AuthContext';

const AppRouter: React.FC = () => {
  const { currentUser } = useAuth();
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={currentUser ? <Navigate to="/" /> : <LoginPage />} />
        <Route element={<PrivateRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/warehouse" element={<WarehousePage />} />
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/references" element={<ReferencesPage />} />
            <Route path="/contractors" element={<ContractorsPage />} />
            <Route path="/contractors/:contractorId/tasks" element={<ContractorTasksPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
};
export default AppRouter;