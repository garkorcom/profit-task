import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../auth/LoginPage';
import PrivateRoute from '../components/layouts/PrivateRoute';
import MainLayout from '../components/layouts/MainLayout';
import HomeDashboard from '../pages/HomePage';
import TasksPage from '../pages/TasksPage';
import ProductsPage from '../pages/ProductsPage';
import InvoicesPage from '../pages/InvoicesPage';
import ContractorsPage from '../pages/ContractorsPage';
import ProjectsPage from '../pages/ProjectsPage';
import ReferencesPage from '../pages/ReferencesPage';
import ContractorTasksPage from '../pages/ContractorTasksPage';
import ShoppingListPage from '../pages/ShoppingListPage';
import ProjectEstimatesPage from '../pages/ProjectEstimatesPage';
import EstimateEditorPage from '../pages/EstimateEditorPage';
import TaskReviewPage from '../pages/TaskReviewPage';
import AnalyticsDashboard from '../pages/AnalyticsDashboard';
import PlanFactReportPage from '../pages/PlanFactReportPage';
import UserProfilePage from '../pages/UserProfilePage';
import WarehousesPage from '../pages/WarehousesPage';
import ShipmentsPage from '../pages/ShipmentsPage';
import { useAuth } from '../auth/AuthContext';

const AppRouter: React.FC = () => {
  const { currentUser } = useAuth();
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={currentUser ? <Navigate to="/" /> : <LoginPage />} />
        <Route element={<PrivateRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<HomeDashboard />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/tasks/review" element={<TaskReviewPage />} />
            <Route path="/analytics" element={<AnalyticsDashboard />} />
            <Route path="/reports/plan-fact" element={<PlanFactReportPage />} />
            <Route path="/profile" element={<UserProfilePage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/shopping" element={<ShoppingListPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:projectId/estimates" element={<ProjectEstimatesPage />} />
            <Route path="/projects/:projectId/estimates/:estimateId" element={<EstimateEditorPage />} />
            <Route path="/references" element={<ReferencesPage />} />
            <Route path="/warehouses" element={<WarehousesPage />} />
            <Route path="/shipments" element={<ShipmentsPage />} />
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