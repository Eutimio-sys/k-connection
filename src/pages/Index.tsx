import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  LayoutDashboard, 
  FolderKanban, 
  ShoppingCart, 
  FileText, 
  Users, 
  Settings, 
  User, 
  Clock, 
  Calendar,
  Wallet,
  UserCog
} from "lucide-react";

type UserRole = 'admin' | 'manager' | 'accountant' | 'worker';

interface MenuItem {
  title: string;
  description: string;
  url: string;
  icon: any;
  gradient: string;
  roles: UserRole[];
}

const Index = () => {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<UserRole>('worker');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserRole();
  }, []);

  const fetchUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      
      if (profile) {
        setUserRole(profile.role as UserRole);
      }
    }
    setLoading(false);
  };

  const allMenuItems: MenuItem[] = [
    {
      title: "แดชบอร์ด",
      description: "ภาพรวมและสถิติของระบบ",
      url: "/dashboard",
      icon: LayoutDashboard,
      gradient: "from-blue-500 to-blue-600",
      roles: ['admin', 'manager', 'accountant']
    },
    {
      title: "โครงการ",
      description: "จัดการและติดตามโครงการทั้งหมด",
      url: "/projects",
      icon: FolderKanban,
      gradient: "from-primary to-primary/70",
      roles: ['admin', 'manager', 'accountant', 'worker']
    },
    {
      title: "ใบขอซื้อ",
      description: "จัดการใบขอซื้อและอนุมัติ",
      url: "/purchase-requests",
      icon: ShoppingCart,
      gradient: "from-accent to-orange-600",
      roles: ['admin', 'manager', 'accountant']
    },
    {
      title: "บัญชีวัสดุ",
      description: "ติดตามค่าใช้จ่ายวัสดุ",
      url: "/accounting",
      icon: FileText,
      gradient: "from-green-500 to-green-600",
      roles: ['admin', 'manager', 'accountant']
    },
    {
      title: "บัญชีค่าแรง",
      description: "จัดการค่าแรงและค่าจ้าง",
      url: "/labor-accounting",
      icon: Wallet,
      gradient: "from-purple-500 to-purple-600",
      roles: ['admin', 'manager', 'accountant']
    },
    {
      title: "จ่ายเงินรายวัน",
      description: "บันทึกการจ่ายเงินรายวัน",
      url: "/daily-payments",
      icon: FileText,
      gradient: "from-yellow-500 to-yellow-600",
      roles: ['admin', 'manager', 'accountant']
    },
    {
      title: "เช็คอิน/เอาท์",
      description: "ระบบบันทึกเวลาเข้า-ออกงาน",
      url: "/attendance",
      icon: Clock,
      gradient: "from-teal-500 to-teal-600",
      roles: ['admin', 'manager', 'worker']
    },
    {
      title: "ระบบลา",
      description: "ยื่นคำขอและจัดการการลา",
      url: "/leave",
      icon: Calendar,
      gradient: "from-pink-500 to-pink-600",
      roles: ['admin', 'manager', 'worker']
    },
    {
      title: "พนักงาน",
      description: "จัดการข้อมูลพนักงานทั้งหมด",
      url: "/employees",
      icon: Users,
      gradient: "from-indigo-500 to-indigo-600",
      roles: ['admin', 'manager']
    },
    {
      title: "จัดการ HR",
      description: "ระบบจัดการทรัพยากรบุคคล",
      url: "/hr-management",
      icon: UserCog,
      gradient: "from-violet-500 to-violet-600",
      roles: ['admin', 'manager']
    },
    {
      title: "โปรไฟล์",
      description: "จัดการข้อมูลส่วนตัว",
      url: "/profile",
      icon: User,
      gradient: "from-cyan-500 to-cyan-600",
      roles: ['admin', 'manager', 'accountant', 'worker']
    },
    {
      title: "ตั้งค่า",
      description: "ตั้งค่าระบบและข้อมูลพื้นฐาน",
      url: "/settings",
      icon: Settings,
      gradient: "from-gray-500 to-gray-600",
      roles: ['admin', 'manager']
    }
  ];

  const visibleMenuItems = allMenuItems.filter(item => 
    item.roles.includes(userRole)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">กำลังโหลด...</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-4">
          ระบบบริหารงานก่อสร้าง
        </h1>
        <p className="text-muted-foreground text-xl">
          เลือกฟังก์ชันที่ต้องการใช้งาน
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {visibleMenuItems.map((item) => (
          <Card 
            key={item.title}
            className="hover:shadow-elegant transition-all cursor-pointer group hover:scale-105"
            onClick={() => navigate(item.url)}
          >
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <item.icon className="w-8 h-8 text-white" />
                </div>
              </div>
              <CardTitle className="text-xl">{item.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Index;
