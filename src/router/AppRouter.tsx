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
import TimeManagementPage from '../pages/TimeManagementPage';
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
import ClaudeTest from '../components/ClaudeTest';
import ItemsPage from '../pages/erp/ItemsPage';
import ReportsPage from '../components/reports/ReportsPage';
import AboutPage from '../pages/AboutPage';
import OperationalOverviewPage from '../pages/OperationalOverviewPage';
import { useAuth } from '../auth/AuthContext';
import StartWorkPage from '../pages/StartWorkPage'; // Импортируем новую страницу
import AdminPage from '../pages/admin/AdminPage';
import RoleManagementPage from '../pages/admin/RoleManagementPage';
import UserAccountsPage from '../pages/admin/UserAccountsPage';
import ConditionalPermissionsTest from '../pages/admin/ConditionalPermissionsTest';
import { TrajectoryPage } from '../modules/trajectory/TrajectoryPage';
import StartabilityV2TestPage from '../pages/StartabilityV2TestPage';
import DevTestCounterpartiesPage from '../pages/DevTestCounterpartiesPage';
import TestPublicEstimate from '../pages/TestPublicEstimate';
import DiagnosticsPublicEstimates from '../pages/DiagnosticsPublicEstimates';
// import PublicEstimatePageV2 from '../pages/PublicEstimatePageV2'; // Удален - используем объединенную версию
import ConnectionTest from '../pages/ConnectionTest';
import EstimatePreviewTest from '../pages/EstimatePreviewTest';
// import PermissionDebugger from '../components/admin/PermissionDebugger';
// import AuditLogViewer from '../components/admin/AuditLogViewer';
// import UserOffboardingManager from '../components/admin/UserOffboardingManager';
// import MFASetup from '../components/auth/MFASetup';
// import SessionManager from '../components/security/SessionManager';
// import UserGroupsPage from '../pages/admin/UserGroupsPage';

const AppRouter: React.FC = () => {
  const { currentUser } = useAuth();
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={currentUser ? <Navigate to="/" /> : <LoginPage />} />
        
        {/* Публичный маршрут для смет */}
        <Route path="/public/estimate/:estimateId" element={<PublicEstimatePage />} />
        
        <Route element={<PrivateRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/dev-tools" element={<DevToolsPage />} />
            <Route path="/startability-v2-test" element={<StartabilityV2TestPage />} />
            <Route path="/dev-test-counterparties" element={<DevTestCounterpartiesPage />} />
            <Route path="/test-public-estimate" element={<TestPublicEstimate />} />
            <Route path="/diagnostics-public-estimates" element={<DiagnosticsPublicEstimates />} />
            <Route path="/connection-test" element={<ConnectionTest />} />
            <Route path="/test-estimate-preview" element={<EstimatePreviewTest />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/tasks/review" element={<TaskReviewPage />} />
            <Route path="/analytics" element={<AnalyticsDashboard />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/reports/plan-fact" element={<PlanFactReportPage />} />
            <Route path="/operational-overview" element={<OperationalOverviewPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/profile" element={<UserProfilePage />} />
            <Route path="/products-legacy" element={<ProductsPage />} />
            <Route path="/products" element={<ItemsPage />} />
            <Route path="/erp" element={<ItemsPage />} />
            <Route path="/erp/items" element={<ItemsPage />} />
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/shopping" element={<ShoppingListPage />} />
            <Route path="/projects" element={<ProjectsV2Page />} />
            <Route path="/projects/new" element={<Navigate to="/projects" replace />} />
            <Route path="/projects/:projectId" element={<ProjectDetailsPage />} />
            <Route path="/projects/:projectId/estimates" element={<EstimatesHub />} />
            <Route path="/projects-legacy" element={<ProjectsPage />} />
            <Route path="/counterparties" element={<CounterpartiesPage />} />
            <Route path="/counterparties/:counterpartyId" element={<CounterpartyDetailsPage />} />
            <Route path="/counterparties/:counterpartyId/edit" element={<CounterpartyEditPage />} />
            <Route path="/time-control" element={<TimeControlPage />} />
            <Route path="/start-work" element={<StartWorkPage />} /> {/* <-- ДОБАВЛЕННЫЙ МАРШРУТ */}
            <Route path="/time-management" element={<TimeManagementPage />} />
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
            <Route path="/claude-test" element={<ClaudeTest />} />
            
            {/* Модуль Траектория */}
            <Route path="/trajectory" element={<TrajectoryPage />} />
            
            {/* Административные маршруты */}
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/admin/roles" element={<RoleManagementPage />} />
            <Route path="/admin/users" element={<UserAccountsPage />} />
            {/* <Route path="/admin/permissions-debugger" element={<PermissionDebugger />} /> */}
            {/* <Route path="/admin/audit-log" element={<AuditLogViewer />} /> */}
            {/* <Route path="/admin/offboarding" element={<UserOffboardingManager />} /> */}
            {/* <Route path="/security/mfa" element={<MFASetup />} /> */}
            {/* <Route path="/security/sessions" element={<SessionManager />} /> */}
            {/* <Route path="/admin/user-groups" element={<UserGroupsPage />} /> */}
            <Route path="/admin/conditional-permissions-test" element={<ConditionalPermissionsTest />} />
            
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