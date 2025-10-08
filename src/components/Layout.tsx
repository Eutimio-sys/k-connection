import { useState, useEffect } from "react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Home,
  LayoutDashboard,
  FolderKanban,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Kanban as KanbanIcon,
  Wallet,
  FileText,
  DollarSign,
  CheckCircle,
  Clock,
  Calendar,
  User,
  UserCog,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);

      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();

      if (profileData) {
        setProfile(profileData);
      }
    };

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("ออกจากระบบสำเร็จ");
    navigate("/auth");
  };

  const navItems = [
    { icon: Home, label: "หน้าแรก", path: "/" },
    { icon: LayoutDashboard, label: "แดชบอร์ด", path: "/dashboard" },
    { icon: FolderKanban, label: "โครงการ", path: "/projects" },
    { icon: KanbanIcon, label: "ตารางงาน", path: "/kanban" },
    { icon: CheckCircle, label: "อนุมัติรายการ", path: "/approvals" },
    { icon: FileText, label: "บัญชีวัสดุ", path: "/accounting" },
    { icon: Wallet, label: "บัญชีค่าแรง", path: "/labor-accounting" },
    { icon: DollarSign, label: "รายการโอนเงิน", path: "/daily-payments" },
    { icon: Users, label: "พนักงาน", path: "/employees" },
    { icon: UserCog, label: "จัดการ HR", path: "/hr-management" },
    { icon: Wallet, label: "บัญชีเงินเดือน", path: "/payroll" },
    { icon: Clock, label: "เช็คอิน/เอาท์", path: "/attendance" },
    { icon: Calendar, label: "ระบบลา", path: "/leave" },
    { icon: Users, label: "คนงานต่างด้าว", path: "/foreign-workers" },
    { icon: User, label: "โปรไฟล์", path: "/profile" },
    { icon: Settings, label: "ตั้งค่า", path: "/settings" },
  ];

  const isActive = (path: string) => location.pathname === path;

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } bg-sidebar text-sidebar-foreground transition-all duration-300 flex flex-col border-r border-sidebar-border`}
      >
        {/* Header */}
        <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-sidebar-primary to-accent rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-lg">Construction</span>
            </div>
          ) : (
            <div className="w-10 h-10 bg-gradient-to-br from-sidebar-primary to-accent rounded-xl flex items-center justify-center mx-auto">
              <Building2 className="w-6 h-6 text-white" />
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-sidebar-foreground hover:bg-sidebar-accent"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <Button
              key={item.path}
              variant={isActive(item.path) ? "default" : "ghost"}
              className={`w-full justify-start gap-3 ${!sidebarOpen && "justify-center"} ${
                isActive(item.path)
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              }`}
              onClick={() => navigate(item.path)}
            >
              <item.icon size={20} />
              {sidebarOpen && <span>{item.label}</span>}
            </Button>
          ))}
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-sidebar-border space-y-2">
          {sidebarOpen && profile && (
            <div className="px-3 py-2 text-sm">
              <p className="font-medium">{profile.full_name}</p>
              <p className="text-xs text-sidebar-foreground/70">{profile.role}</p>
            </div>
          )}
          <Button
            variant="ghost"
            className={`w-full justify-start gap-3 ${
              !sidebarOpen && "justify-center"
            } text-sidebar-foreground hover:bg-sidebar-accent`}
            onClick={handleLogout}
          >
            <LogOut size={20} />
            {sidebarOpen && <span>ออกจากระบบ</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
