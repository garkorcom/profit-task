import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../auth/LoginPage';
import PrivateRoute from '../components/layouts/PrivateRoute';
import MainLayout from '../components/layouts/MainLayoutMobileOptimized';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useAuth } from '../auth/AuthContext';

// Immediate loading for core pages
import HomePage from '../pages/HomePage';

// Lazy load heavy pages to improve initial bundle size and mobile performance
const TasksPage = lazy(() => import('../pages/TasksPage'));
const ProductsPage = lazy(() => import('../pages/ProductsPage'));
const InvoicesPage = lazy(() => import('../pages/InvoicesPage'));
const ProjectsPage = lazy(() => import('../pages/ProjectsPage'));
const ReferencesPage = lazy(() => import('../pages/ReferencesPage'));
const ContractorTasksPage = lazy(() => import('../pages/ContractorTasksPage'));
const ShoppingListPage = lazy(() => import('../pages/ShoppingListPage'));
const TaskReviewPage = lazy(() => import('../pages/TaskReviewPage'));
const AnalyticsDashboard = lazy(() => import('../pages/AnalyticsDashboard'));
const PlanFactReportPage = lazy(() => import('../pages/PlanFactReportPage'));
const UserProfilePage = lazy(() => import('../pages/UserProfilePage'));
const WarehousesPage = lazy(() => import('../pages/WarehousesPage'));
const ShipmentsPage = lazy(() => import('../pages/ShipmentsPage'));
const StockDocumentsPage = lazy(() => import('../pages/StockDocumentsPage'));
const ShipmentDetailsPage = lazy(() => import('../pages/ShipmentDetailsPage'));
const NotificationsPage = lazy(() => import('../pages/NotificationsPage'));
const TimeControlPage = lazy(() => import('../pages/TimeControlPage'));
const DevToolsPage = lazy(() => import('../pages/DevToolsPage'));

// Estimates - Heavy components with lots of logic
const EstimatesHub = lazy(() => import('../pages/estimates/EstimatesHub'));
const QuickEstimateCreate = lazy(() => import('../pages/estimates/QuickEstimateCreate'));
const EstimateConstructor = lazy(() => import('../pages/estimates/EstimateConstructor'));

// Counterparty pages
const CounterpartiesPage = lazy(() => import('../pages/counterparty/CounterpartiesPage'));
const CounterpartyDetailsPage = lazy(() => import('../pages/counterparty/CounterpartyDetailsPage'));
const CounterpartyEditPage = lazy(() => import('../pages/counterparty/CounterpartyEditPage'));

// Project pages
const ProjectsV2Page = lazy(() => import('../pages/project/ProjectsV2Page'));
const ProjectDetailsPage = lazy(() => import('../pages/project/ProjectDetailsPage'));

// Public pages (non-lazy for better UX)
const PublicEstimatePage = lazy(() => import('../pages/PublicEstimatePage'));

// Mobile-optimized loading component
const MobileLoadingFallback = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 'calc(100vh - 120px)',
    padding: '20px',
    background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)'
  }}>
    <LoadingSpinner />
    <div style={{
      marginTop: '16px',
      fontSize: '14px',
      color: '#666',
      textAlign: 'center'
    }}>
      Загрузка...
    </div>
  </div>
);

const AppRouterOptimized: React.FC = () => {
  const { currentUser } = useAuth();
  
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={currentUser ? <Navigate to="/" /> : <LoginPage />} />
        
        {/* Публичный маршрут для сметы */}
        <Route 
          path="/public/estimate/:estimateId" 
          element={
            <Suspense fallback={<MobileLoadingFallback />}>
              <PublicEstimatePage />
            </Suspense>
          } 
        />
        
        <Route element={<PrivateRoute />}>
          <Route element={<MainLayout />}>
            {/* Core page - no lazy loading for instant access */}
            <Route path="/" element={<HomePage />} />
            
            {/* Development tools */}
            <Route 
              path="/dev-tools" 
              element={
                <Suspense fallback={<MobileLoadingFallback />}>
                  <DevToolsPage />
                </Suspense>
              } 
            />
            
            {/* Main features with lazy loading */}
            <Route 
              path="/tasks" 
              element={
                <Suspense fallback={<MobileLoadingFallback />}>
                  <TasksPage />
                </Suspense>
              } 
            />
            <Route 
              path="/tasks/:taskId" 
              element={
                <Suspense fallback={<MobileLoadingFallback />}>
                  <TasksPage />
                </Suspense>
              } 
            />
            <Route 
              path="/contractor-tasks" 
              element={
                <Suspense fallback={<MobileLoadingFallback />}>
                  <ContractorTasksPage />
                </Suspense>
              } 
            />
            <Route 
              path="/task-review/:taskId" 
              element={
                <Suspense fallback={<MobileLoadingFallback />}>
                  <TaskReviewPage />
                </Suspense>
              } 
            />
            
            {/* Projects */}
            <Route 
              path="/projects" 
              element={
                <Suspense fallback={<MobileLoadingFallback />}>
                  <ProjectsV2Page />
                </Suspense>
              } 
            />
            <Route 
              path="/projects/:projectId" 
              element={
                <Suspense fallback={<MobileLoadingFallback />}>
                  <ProjectDetailsPage />
                </Suspense>
              } 
            />
            
            {/* Estimates with heavy lazy loading */}
            <Route 
              path="/estimates" 
              element={
                <Suspense fallback={<MobileLoadingFallback />}>
                  <EstimatesHub />
                </Suspense>
              } 
            />
            <Route 
              path="/estimates/:estimateId" 
              element={
                <Suspense fallback={<MobileLoadingFallback />}>
                  <EstimateConstructor />
                </Suspense>
              } 
            />
            <Route 
              path="/estimates/quick-create" 
              element={
                <Suspense fallback={<MobileLoadingFallback />}>
                  <QuickEstimateCreate />
                </Suspense>
              } 
            />
            
            {/* Counterparties */}
            <Route 
              path="/counterparties" 
              element={
                <Suspense fallback={<MobileLoadingFallback />}>
                  <CounterpartiesPage />
                </Suspense>
              } 
            />
            <Route 
              path="/counterparties/new" 
              element={
                <Suspense fallback={<MobileLoadingFallback />}>
                  <CounterpartyEditPage />
                </Suspense>
              } 
            />
            <Route 
              path="/counterparties/:counterpartyId" 
              element={
                <Suspense fallback={<MobileLoadingFallback />}>
                  <CounterpartyDetailsPage />
                </Suspense>
              } 
            />
            <Route 
              path="/counterparties/:counterpartyId/edit" 
              element={
                <Suspense fallback={<MobileLoadingFallback />}>
                  <CounterpartyEditPage />
                </Suspense>
              } 
            />
            
            {/* Products and Warehouse */}
            <Route 
              path="/products" 
              element={
                <Suspense fallback={<MobileLoadingFallback />}>
                  <ProductsPage />
                </Suspense>
              } 
            />
            <Route 
              path="/warehouses" 
              element={
                <Suspense fallback={<MobileLoadingFallback />}>
                  <WarehousesPage />
                </Suspense>
              } 
            />
            <Route 
              path="/shipments" 
              element={
                <Suspense fallback={<MobileLoadingFallback />}>
                  <ShipmentsPage />
                </Suspense>
              } 
            />
            <Route 
              path="/shipments/:shipmentId" 
              element={
                <Suspense fallback={<MobileLoadingFallback />}>
                  <ShipmentDetailsPage />
                </Suspense>
              } 
            />
            <Route 
              path="/stock-documents" 
              element={
                <Suspense fallback={<MobileLoadingFallback />}>
                  <StockDocumentsPage />
                </Suspense>
              } 
            />
            
            {/* Time Control */}
            <Route 
              path="/time-control" 
              element={
                <Suspense fallback={<MobileLoadingFallback />}>
                  <TimeControlPage />
                </Suspense>
              } 
            />
            
            {/* Analytics and Reports */}
            <Route 
              path="/analytics" 
              element={
                <Suspense fallback={<MobileLoadingFallback />}>
                  <AnalyticsDashboard />
                </Suspense>
              } 
            />
            <Route 
              path="/plan-fact-report" 
              element={
                <Suspense fallback={<MobileLoadingFallback />}>
                  <PlanFactReportPage />
                </Suspense>
              } 
            />
            
            {/* References and Settings */}
            <Route 
              path="/references" 
              element={
                <Suspense fallback={<MobileLoadingFallback />}>
                  <ReferencesPage />
                </Suspense>
              } 
            />
            <Route 
              path="/shopping-list" 
              element={
                <Suspense fallback={<MobileLoadingFallback />}>
                  <ShoppingListPage />
                </Suspense>
              } 
            />
            <Route 
              path="/invoices" 
              element={
                <Suspense fallback={<MobileLoadingFallback />}>
                  <InvoicesPage />
                </Suspense>
              } 
            />
            
            {/* User Management */}
            <Route 
              path="/profile" 
              element={
                <Suspense fallback={<MobileLoadingFallback />}>
                  <UserProfilePage />
                </Suspense>
              } 
            />
            <Route 
              path="/notifications" 
              element={
                <Suspense fallback={<MobileLoadingFallback />}>
                  <NotificationsPage />
                </Suspense>
              } 
            />
            
            {/* Legacy routes (consider removing) */}
            <Route 
              path="/projects-legacy" 
              element={
                <Suspense fallback={<MobileLoadingFallback />}>
                  <ProjectsPage />
                </Suspense>
              } 
            />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouterOptimized;