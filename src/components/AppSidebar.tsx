import {
  Building2,
  Home,
  LayoutDashboard,
  FolderKanban,
  Trello,
  CheckCircle,
  FileText,
  Wallet,
  DollarSign,
  Users,
  UserCog,
  Clock,
  Calendar,
  User,
  Settings,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";

const menuItems = [
  { title: "หน้าแรก", url: "/", icon: Home },
  { title: "แดชบอร์ด", url: "/dashboard", icon: LayoutDashboard },
  { title: "โครงการ", url: "/projects", icon: FolderKanban },
  { title: "ตารางงาน", url: "/kanban", icon: Trello },
  { title: "อนุมัติรายการ", url: "/approvals", icon: CheckCircle },
  { title: "บัญชีวัสดุ", url: "/accounting", icon: FileText },
  { title: "บัญชีค่าแรง", url: "/labor-accounting", icon: Wallet },
  { title: "รายการโอนเงิน", url: "/daily-payments", icon: DollarSign },
  { title: "พนักงาน", url: "/employees", icon: Users },
  { title: "จัดการ HR", url: "/hr-management", icon: UserCog },
  { title: "บัญชีเงินเดือน", url: "/payroll", icon: DollarSign },
  { title: "เช็คอิน/เอาท์", url: "/attendance", icon: Clock },
  { title: "ระบบลา", url: "/leave", icon: Calendar },
  { title: "โปรไฟล์", url: "/profile", icon: User },
  { title: "คนงานต่างด้าว", url: "/foreign-workers", icon: Users },
  { title: "ตั้งค่า", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    fetchPendingCount();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("approval-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, fetchPendingCount)
      .on("postgres_changes", { event: "*", schema: "public", table: "labor_expenses" }, fetchPendingCount)
      .on("postgres_changes", { event: "*", schema: "public", table: "leave_requests" }, fetchPendingCount)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPendingCount = async () => {
    const [expenses, laborExpenses, leaveRequests] = await Promise.all([
      supabase.from("expenses").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("labor_expenses").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("leave_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ]);

    const total = (expenses.count || 0) + (laborExpenses.count || 0) + (leaveRequests.count || 0);
    setPendingCount(total);
  };

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border/50 p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-primary">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-sidebar-foreground text-base">ระบบบริหารงาน</h2>
            <p className="text-xs text-sidebar-foreground/70">Construction ERP</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60 text-xs font-semibold uppercase tracking-wider mb-2 px-3">
            เมนูหลัก
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                          isActive
                            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md font-medium"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        }`
                      }
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="text-sm">{item.title}</span>
                      {item.url === "/approvals" && pendingCount > 0 && (
                        <Badge variant="destructive" className="ml-auto">
                          {pendingCount}
                        </Badge>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
