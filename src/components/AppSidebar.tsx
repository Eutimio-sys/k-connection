import { Building2, LayoutDashboard, FolderKanban, ShoppingCart, FileText, Users, Settings } from "lucide-react";
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
  { title: "แดชบอร์ด", url: "/dashboard", icon: LayoutDashboard },
  { title: "โครงการ", url: "/projects", icon: FolderKanban },
  { title: "ใบขอซื้อ", url: "/purchase-requests", icon: ShoppingCart },
  { title: "บัญชีวัสดุ", url: "/accounting", icon: FileText },
  { title: "บัญชีค่าแรง", url: "/labor-accounting", icon: FileText },
  { title: "จ่ายเงินรายวัน", url: "/daily-payments", icon: FileText },
  { title: "พนักงาน", url: "/employees", icon: Users },
  { title: "ตั้งค่า", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-sidebar-foreground">ระบบบริหารงาน</h2>
            <p className="text-xs text-sidebar-foreground/60">ก่อสร้าง</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>เมนูหลัก</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        isActive ? "bg-sidebar-accent" : ""
                      }
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
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
