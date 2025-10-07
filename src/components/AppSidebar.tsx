import { Building2, Home, LayoutDashboard, FolderKanban, ShoppingCart, FileText, Users, Settings, User, Clock, Calendar } from "lucide-react";
import { NavLink } from "react-router-dom";
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

const menuItems = [
  { title: "หน้าแรก", url: "/", icon: Home },
  { title: "แดชบอร์ด", url: "/dashboard", icon: LayoutDashboard },
  { title: "โครงการ", url: "/projects", icon: FolderKanban },
  { title: "ใบขอซื้อ", url: "/purchase-requests", icon: ShoppingCart },
  { title: "บัญชีวัสดุ", url: "/accounting", icon: FileText },
  { title: "บัญชีค่าแรง", url: "/labor-accounting", icon: FileText },
  { title: "จ่ายเงินรายวัน", url: "/daily-payments", icon: FileText },
  { title: "เช็คอิน/เอาท์", url: "/attendance", icon: Clock },
  { title: "ระบบลา", url: "/leave", icon: Calendar },
  { title: "พนักงาน", url: "/employees", icon: Users },
  { title: "โปรไฟล์", url: "/profile", icon: User },
  { title: "ตั้งค่า", url: "/settings", icon: Settings },
];

export function AppSidebar() {
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
