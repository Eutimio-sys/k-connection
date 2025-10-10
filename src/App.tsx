import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import Auth from "./pages/Auth";
import { DashboardLayout } from "./components/DashboardLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import Kanban from "./pages/Kanban";
import DailyPayments from "./pages/DailyPayments";
import Approvals from "./pages/Approvals";
import EmployeeDetail from "./pages/EmployeeDetail";
import UserRoles from "./pages/UserRoles";
import HRManagement from "./pages/HRManagement";
import Payroll from "./pages/Payroll";
import ForeignWorkers from "./pages/ForeignWorkers";
import Settings from "./pages/Settings";
import Accounting from "./pages/Accounting";
import LaborAccounting from "./pages/LaborAccounting";
import Profile from "./pages/Profile";
import Attendance from "./pages/Attendance";
import LeaveManagement from "./pages/LeaveManagement";
import TaxPlanning from "./pages/TaxPlanning";
import MyWork from "./pages/MyWork";
import Chat from "./pages/Chat";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route element={<DashboardLayout><Outlet /></DashboardLayout>}>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<ProtectedRoute featureCode="dashboard"><Dashboard /></ProtectedRoute>} />
            <Route path="/projects" element={<ProtectedRoute featureCode="projects"><Projects /></ProtectedRoute>} />
            <Route path="/projects/:id" element={<ProtectedRoute featureCode="projects"><ProjectDetail /></ProtectedRoute>} />
            <Route path="/kanban" element={<ProtectedRoute featureCode="projects"><Kanban /></ProtectedRoute>} />
            <Route path="/approvals" element={<ProtectedRoute featureCode="approvals"><Approvals /></ProtectedRoute>} />
            <Route path="/accounting" element={<ProtectedRoute featureCode="accounting"><Accounting /></ProtectedRoute>} />
            <Route path="/labor-accounting" element={<ProtectedRoute featureCode="labor_expenses"><LaborAccounting /></ProtectedRoute>} />
            <Route path="/daily-payments" element={<ProtectedRoute featureCode="daily_payments"><DailyPayments /></ProtectedRoute>} />
            <Route path="/employees/:id" element={<ProtectedRoute featureCode="employees"><EmployeeDetail /></ProtectedRoute>} />
            <Route path="/user-roles" element={<ProtectedRoute requiredRoles={["admin"]}><UserRoles /></ProtectedRoute>} />
            <Route path="/hr-management" element={<ProtectedRoute featureCode="hr_management"><HRManagement /></ProtectedRoute>} />
            <Route path="/payroll" element={<ProtectedRoute featureCode="payroll"><Payroll /></ProtectedRoute>} />
            <Route path="/foreign-workers" element={<ProtectedRoute featureCode="foreign_workers"><ForeignWorkers /></ProtectedRoute>} />
            <Route path="/tax-planning" element={<ProtectedRoute featureCode="tax_planning"><TaxPlanning /></ProtectedRoute>} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/attendance" element={<ProtectedRoute featureCode="attendance"><Attendance /></ProtectedRoute>} />
            <Route path="/leave" element={<ProtectedRoute featureCode="leave_management"><LeaveManagement /></ProtectedRoute>} />
            <Route path="/mywork" element={<MyWork />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/settings" element={<ProtectedRoute featureCode="settings"><Settings /></ProtectedRoute>} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
