import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../auth/LoginPage';
import PrivateRoute from '../components/layouts/PrivateRoute';
import MainLayout from '../components/layouts/MainLayout';
import HomePage from '../pages/HomePage';
import TasksPage from '../pages/TasksPage';
import ProductsPage from '../pages/ProductsPage';
import InvoicesPage from '../pages/InvoicesPage';
import ProjectsPage from '../pages/ProjectsPage';
import ReferencesPage from '../pages/ReferencesPage';
import ContractorTasksPage from '../pages/ContractorTasksPage';
import ShoppingListPage from '../pages/ShoppingListPage';
import TaskReviewPage from '../pages/TaskReviewPage';
import AnalyticsDashboard from '../pages/AnalyticsDashboard';
import PlanFactReportPage from '../pages/PlanFactReportPage';
import UserProfilePage from '../pages/UserProfilePage';
import WarehousesPage from '../pages/WarehousesPage';
import ShipmentsPage from '../pages/ShipmentsPage';
import StockDocumentsPage from '../pages/StockDocumentsPage';
import ShipmentDetailsPage from '../pages/ShipmentDetailsPage';
import NotificationsPage from '../pages/NotificationsPage';
import TimeControlPage from '../pages/TimeControlPage';
import DevToolsPage from '../pages/DevToolsPage';
import EstimatesHub from '../pages/estimates/EstimatesHub';
import QuickEstimateCreate from '../pages/estimates/QuickEstimateCreate';
import EstimateConstructor from '../pages/estimates/EstimateConstructor';
import CounterpartiesPage from '../pages/counterparty/CounterpartiesPage';
import CounterpartyDetailsPage from '../pages/counterparty/CounterpartyDetailsPage';
import CounterpartyEditPage from '../pages/counterparty/CounterpartyEditPage';
import ProjectsV2Page from '../pages/project/ProjectsV2Page';
import ProjectDetailsPage from '../pages/project/ProjectDetailsPage';
import PublicEstimatePage from '../pages/PublicEstimatePage';
import { useAuth } from '../auth/AuthContext';

const AppRouter: React.FC = () => {
  const { currentUser } = useAuth();
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={currentUser ? <Navigate to="/" /> : <LoginPage />} />
        
        {/* Публичный маршрут для сметы */}
        <Route path="/public/estimate/:estimateId" element={<PublicEstimatePage />} />
        
        <Route element={<PrivateRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/dev-tools" element={<DevToolsPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/tasks/review" element={<TaskReviewPage />} />
            <Route path="/analytics" element={<AnalyticsDashboard />} />
            <Route path="/reports/plan-fact" element={<PlanFactReportPage />} />
            <Route path="/profile" element={<UserProfilePage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/shopping" element={<ShoppingListPage />} />
            <Route path="/projects" element={<ProjectsV2Page />} />
            <Route path="/projects/:projectId" element={<ProjectDetailsPage />} />
            <Route path="/projects-legacy" element={<ProjectsPage />} />
            <Route path="/counterparties" element={<CounterpartiesPage />} />
            <Route path="/counterparties/:counterpartyId" element={<CounterpartyDetailsPage />} />
            <Route path="/counterparties/:counterpartyId/edit" element={<CounterpartyEditPage />} />
            <Route path="/time-control" element={<TimeControlPage />} />
            <Route path="/estimates" element={<EstimatesHub />} />
            <Route path="/estimates/quick-create" element={<QuickEstimateCreate />} />
            <Route path="/estimates/new" element={<EstimateConstructor />} />
            <Route path="/estimates/:estimateId/constructor" element={<EstimateConstructor />} />
            <Route path="/references" element={<ReferencesPage />} />
            <Route path="/warehouses" element={<WarehousesPage />} />
            <Route path="/shipments" element={<ShipmentsPage />} />
            <Route path="/shipments/:shipmentId" element={<ShipmentDetailsPage />} />
            <Route path="/stock-docs" element={<StockDocumentsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            {/* Старая система contractors - перенаправляем на новую */}
            <Route path="/contractors" element={<Navigate to="/counterparties" replace />} />
            <Route path="/contractors/:contractorId/tasks" element={<ContractorTasksPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
};
export default AppRouter;