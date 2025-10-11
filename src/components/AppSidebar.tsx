import {
  Building2,
  Home,
  LayoutDashboard,
  FolderKanban,
  CheckCircle,
  FileText,
  Wallet,
  Users,
  Shield,
  UserCog,
  Clock,
  Calendar,
  User,
  Settings,
  Globe,
  TrendingUp,
  MessageCircle,
  Receipt,
  UserCheck,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useFeatureVisibility } from "@/contexts/FeatureVisibilityContext";
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
  { title: "งานของฉัน", url: "/mywork", icon: CheckCircle },
  { title: "เช็คอิน/เอาท์", url: "/attendance", icon: Clock },
  { title: "แชทรวม", url: "/chat", icon: MessageCircle },
  { title: "โครงการ", url: "/projects", icon: FolderKanban },
  { title: "อนุมัติรายการ", url: "/approvals", icon: CheckCircle },
  { title: "บัญชีวัสดุ", url: "/accounting", icon: FileText },
  { title: "บัญชีค่าแรง", url: "/labor-accounting", icon: Wallet },
  { title: "บัญชีเงินเดือน", url: "/payroll", icon: Wallet },
  { title: "รายการโอนเงิน", url: "/daily-payments", icon: Wallet },
  { title: "ติดตามเอกสารภาษี", url: "/tax-documents", icon: Receipt },
  { title: "วางแผนภาษี", url: "/tax-planning", icon: TrendingUp },
  { title: "ระบบลา", url: "/leave", icon: Calendar },
  { title: "จัดการสิทธิ์การมองเห็น", url: "/visibility", icon: Shield },
  { title: "จัดการสิทธิ์โครงการ", url: "/project-access", icon: UserCheck },
  { title: "จัดการพนักงาน", url: "/hr-management", icon: UserCog },
  { title: "จัดการคนงานต่างด้าว", url: "/foreign-workers", icon: Globe },
  { title: "โปรไฟล์", url: "/profile", icon: User },
  { title: "ตั้งค่า", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingDocCount, setPendingDocCount] = useState(0);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const { visibleFeatures, isAdmin } = useFeatureVisibility();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Filter menu items based on visibility
  const visibleMenuItems = menuItems.filter((item) => {
    if (isAdmin) return true;
    
    const featureCode = item.url.substring(1); // Remove leading slash
    return visibleFeatures.has(featureCode) || visibleFeatures.has('all') || item.url === '/' || item.url === '/profile';
  });

  useEffect(() => {
    // Get current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id);
      }
    });
  }, []);

  useEffect(() => {
    fetchPendingCount();
    fetchPendingDocCount();
    if (currentUserId) {
      fetchUnreadChatCount();
    }

    const onChatRead = () => {
      if (currentUserId) fetchUnreadChatCount();
    };

    const onApprovalsUpdated = () => {
      fetchPendingCount();
    };

    window.addEventListener("chat-read", onChatRead);
    window.addEventListener("approvals-updated", onApprovalsUpdated);

    // Subscribe to real-time updates
    const channel = supabase
      .channel("approval-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, fetchPendingCount)
      .on("postgres_changes", { event: "*", schema: "public", table: "labor_expenses" }, fetchPendingCount)
      .on("postgres_changes", { event: "*", schema: "public", table: "leave_requests" }, fetchPendingCount)
      .on("postgres_changes", { event: "*", schema: "public", table: "document_requests" }, fetchPendingDocCount)
      .on("postgres_changes", { event: "*", schema: "public", table: "general_chat" }, () => {
        if (currentUserId) fetchUnreadChatCount();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "project_messages" }, () => {
        if (currentUserId) fetchUnreadChatCount();
      })
      .subscribe();

    return () => {
      window.removeEventListener("chat-read", onChatRead);
      window.removeEventListener("approvals-updated", onApprovalsUpdated);
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const fetchPendingCount = async () => {
    const [expenses, laborExpenses, leaveRequests] = await Promise.all([
      supabase.from("expenses").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("labor_expenses").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("leave_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ]);

    const total = (expenses.count || 0) + (laborExpenses.count || 0) + (leaveRequests.count || 0);
    setPendingCount(total);
  };

  const fetchPendingDocCount = async () => {
    const { count } = await supabase
      .from("document_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    setPendingDocCount(count || 0);
  };

  const fetchUnreadChatCount = async () => {
    if (!currentUserId) return;

    // Get last read timestamps from localStorage
    const lastReadGeneral = localStorage.getItem(`lastReadChat_general_${currentUserId}`);
    const lastReadGeneralTime = lastReadGeneral ? new Date(lastReadGeneral) : new Date(0);

    // Count unread general chat messages
    const { count: generalCount } = await supabase
      .from("general_chat")
      .select("id", { count: "exact", head: true })
      .neq("user_id", currentUserId)
      .gt("created_at", lastReadGeneralTime.toISOString());

    // Count unread project messages across all projects
    const { data: projects } = await supabase.from("projects").select("id");

    let projectMessagesCount = 0;
    if (projects) {
      for (const project of projects) {
        const lastReadProject = localStorage.getItem(`lastReadChat_project_${project.id}_${currentUserId}`);
        const lastReadProjectTime = lastReadProject ? new Date(lastReadProject) : new Date(0);

        const { count } = await supabase
          .from("project_messages")
          .select("id", { count: "exact", head: true })
          .eq("project_id", project.id)
          .neq("user_id", currentUserId)
          .gt("created_at", lastReadProjectTime.toISOString());

        projectMessagesCount += count || 0;
      }
    }

    const total = (generalCount || 0) + projectMessagesCount;
    setUnreadChatCount(total);
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
              {visibleMenuItems.map((item) => (
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
                      {item.url === "/hr-management" && pendingDocCount > 0 && (
                        <Badge variant="destructive" className="ml-auto">
                          {pendingDocCount}
                        </Badge>
                      )}
                      {item.url === "/approvals" && pendingCount > 0 && (
                        <Badge variant="destructive">
                          {pendingCount}
                        </Badge>
                      )}
                      {item.url === "/chat" && unreadChatCount > 0 && (
                        <Badge variant="destructive">
                          {unreadChatCount}
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
