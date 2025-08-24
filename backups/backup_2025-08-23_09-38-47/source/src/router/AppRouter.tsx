import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../auth/LoginPage';
import PrivateRoute from '../components/layouts/PrivateRoute';
import MainLayout from '../components/layouts/MainLayout';
import HomeDashboard from '../pages/HomeDashboard';
import TasksPage from '../pages/TasksPage';
import ProductsPage from '../pages/ProductsPage';
import InvoicesPage from '../pages/InvoicesPage';
import ContractorsPage from '../pages/ContractorsPage';
import ProjectsPage from '../pages/ProjectsPage';
import ReferencesPage from '../pages/ReferencesPage';
import ContractorTasksPage from '../pages/ContractorTasksPage';
import ShoppingListPage from '../pages/ShoppingListPage';
import ProjectEstimatesPage from '../pages/ProjectEstimatesPage';
import ProjectDetailsPage from '../pages/ProjectDetailsPage'; // Импортируем новую страницу
import EstimateEditorPage from '../pages/EstimateEditorPage';
import EstimateConstructorPage from '../pages/EstimateConstructorPage';
import PublicEstimatePage from '../pages/PublicEstimatePage'; // Импортируем новую страницу
import StockDocumentsPage from '../pages/StockDocumentsPage';
import EmployeesPage from '../pages/EmployeesPage';
import EmployeeTimesheetPage from '../pages/EmployeeTimesheetPage';
import TestPage from '../pages/TestPage';
import TestStartWork from '../pages/TestStartWork';
import TimeTrackingTestPage from '../pages/TimeTrackingTestPage';
import TimeTrackingPage from '../pages/TimeTrackingPage';
import TimeTrackingDiagnostics from '../pages/TimeTrackingDiagnostics';
import DevToolsPage from '../pages/DevToolsPage';
import TestHomePage from '../pages/TestHomePage'; // Добавляем импорт
import { useAuth } from '../auth/AuthContext';
import EmployeeAuthPage from '../pages/EmployeeAuthPage'; // Импорт новой страницы
import SimpleTestPage from '../pages/SimpleTestPage'; // Импорт новой страницы

const AppRouter: React.FC = () => {
  const { currentUser } = useAuth();
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={currentUser ? <Navigate to="/" /> : <LoginPage />} />
        
        {/* Публичный маршрут для эстимейта */}
        <Route path="/public/estimate/:shareToken" element={<PublicEstimatePage />} />
        
        <Route element={<PrivateRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<HomeDashboard />} />
            <Route path="/time-tracking" element={<TimeTrackingPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/shopping" element={<ShoppingListPage />} />
            <Route path="/stock-documents" element={<StockDocumentsPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:projectId" element={<ProjectDetailsPage />} /> {/* Новый маршрут */}
            <Route path="/projects/:projectId/estimates" element={<ProjectEstimatesPage />} />
            <Route path="/projects/:projectId/estimates/:estimateId" element={<EstimateEditorPage />} />
            <Route path="/projects/:projectId/estimates/:estimateId/constructor" element={<EstimateConstructorPage />} />
            <Route path="/references" element={<ReferencesPage />} />
            <Route path="/stock-documents" element={<StockDocumentsPage />} />
            <Route path="/employees" element={<EmployeesPage />} />
            <Route path="/employees/:employeeId/timesheet" element={<EmployeeTimesheetPage />} />
            <Route path="/employee-auth-linking" element={<EmployeeAuthPage />} />
            <Route path="/simple-test" element={<SimpleTestPage />} />
            <Route path="/test" element={<TestPage />} />
            <Route path="/test-dialog" element={<TestStartWork />} />
            <Route path="/test-time-tracking" element={<TimeTrackingTestPage />} />
            <Route path="/time-tracking-diagnostics" element={<TimeTrackingDiagnostics />} />
            <Route path="/dev-tools" element={<DevToolsPage />} />
            <Route path="/testhome" element={<TestHomePage />} /> {/* Добавляем роут */}
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