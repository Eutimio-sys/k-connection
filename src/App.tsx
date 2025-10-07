import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Auth from "./pages/Auth";
import Layout from "./components/Layout";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import Kanban from "./pages/Kanban";
import DailyPayments from "./pages/DailyPayments";
import Approvals from "./pages/Approvals";
import Employees from "./pages/Employees";
import EmployeeDetail from "./pages/EmployeeDetail";
import HRManagement from "./pages/HRManagement";
import Payroll from "./pages/Payroll";
import ForeignWorkers from "./pages/ForeignWorkers";
import Settings from "./pages/Settings";
import Accounting from "./pages/Accounting";
import LaborAccounting from "./pages/LaborAccounting";
import Profile from "./pages/Profile";
import Attendance from "./pages/Attendance";
import LeaveManagement from "./pages/LeaveManagement";
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
          <Route element={<Layout />}>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/kanban" element={<Kanban />} />
            <Route path="/approvals" element={<Approvals />} />
            <Route path="/accounting" element={<Accounting />} />
            <Route path="/labor-accounting" element={<LaborAccounting />} />
            <Route path="/daily-payments" element={<DailyPayments />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/employees/:id" element={<EmployeeDetail />} />
            <Route path="/hr-management" element={<HRManagement />} />
          <Route path="/payroll" element={<Payroll />} />
          <Route path="/foreign-workers" element={<ForeignWorkers />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/leave" element={<LeaveManagement />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
