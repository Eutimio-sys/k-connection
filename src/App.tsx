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
import TaxDocuments from "./pages/TaxDocuments";
import MyWork from "./pages/MyWork";
import Chat from "./pages/Chat";
import NotFound from "./pages/NotFound";
import ProjectAccessManagement from "./pages/ProjectAccessManagement";

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
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
            <Route path="/projects/:id" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
            <Route path="/kanban" element={<ProtectedRoute><Kanban /></ProtectedRoute>} />
            <Route path="/approvals" element={<ProtectedRoute><Approvals /></ProtectedRoute>} />
            <Route path="/accounting" element={<ProtectedRoute><Accounting /></ProtectedRoute>} />
            <Route path="/labor-accounting" element={<ProtectedRoute><LaborAccounting /></ProtectedRoute>} />
            <Route path="/daily-payments" element={<ProtectedRoute><DailyPayments /></ProtectedRoute>} />
            <Route path="/employees/:id" element={<ProtectedRoute><EmployeeDetail /></ProtectedRoute>} />
            <Route path="/user-roles" element={<ProtectedRoute requiredRoles={["admin"]}><UserRoles /></ProtectedRoute>} />
            <Route path="/hr-management" element={<ProtectedRoute><HRManagement /></ProtectedRoute>} />
            <Route path="/payroll" element={<ProtectedRoute><Payroll /></ProtectedRoute>} />
            <Route path="/foreign-workers" element={<ProtectedRoute><ForeignWorkers /></ProtectedRoute>} />
            <Route path="/tax-planning" element={<ProtectedRoute><TaxPlanning /></ProtectedRoute>} />
            <Route path="/tax-documents" element={<ProtectedRoute><TaxDocuments /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
            <Route path="/leave" element={<ProtectedRoute><LeaveManagement /></ProtectedRoute>} />
            <Route path="/mywork" element={<ProtectedRoute><MyWork /></ProtectedRoute>} />
            <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute requiredRoles={["admin"]}><Settings /></ProtectedRoute>} />
            <Route path="/project-access" element={<ProtectedRoute requiredRoles={["admin"]}><ProjectAccessManagement /></ProtectedRoute>} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
