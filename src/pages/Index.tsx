import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  Users,
  Settings,
  User,
  Clock,
  Calendar,
  Wallet,
  UserCog,
  CheckCircle,
  ClipboardList,
  MessageCircle,
} from "lucide-react";

type UserRole = "admin" | "manager" | "accountant" | "worker";

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
  const [userRole, setUserRole] = useState<UserRole>("worker");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserRole();
  }, []);

  const fetchUserRole = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

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
      roles: ["admin", "manager", "accountant"],
    },
    {
      title: "งานของฉัน",
      description: "จัดการงานและติดตามความคืบหน้า",
      url: "/mywork",
      icon: ClipboardList,
      gradient: "from-violet-500 to-violet-600",
      roles: ["admin", "manager", "accountant", "worker"],
    },
    {
      title: "โครงการ",
      description: "จัดการและติดตามโครงการทั้งหมด",
      url: "/projects",
      icon: FolderKanban,
      gradient: "from-primary to-primary/70",
      roles: ["admin", "manager", "accountant", "worker"],
    },
    {
      title: "อนุมัติรายการ",
      description: "อนุมัติบัญชีและคำขอต่างๆ",
      url: "/approvals",
      icon: CheckCircle,
      gradient: "from-accent to-orange-600",
      roles: ["admin", "manager"],
    },
    {
      title: "บัญชีวัสดุ",
      description: "ติดตามค่าใช้จ่ายวัสดุ",
      url: "/accounting",
      icon: FileText,
      gradient: "from-green-500 to-green-600",
      roles: ["admin", "manager", "accountant"],
    },
    {
      title: "บัญชีค่าแรง",
      description: "จัดการค่าแรงและค่าจ้าง",
      url: "/labor-accounting",
      icon: Wallet,
      gradient: "from-purple-500 to-purple-600",
      roles: ["admin", "manager", "accountant"],
    },
    {
      title: "รายการโอนเงิน",
      description: "บันทึกการโอนเงินรายวัน",
      url: "/daily-payments",
      icon: Wallet,
      gradient: "from-yellow-500 to-yellow-600",
      roles: ["admin", "manager", "accountant"],
    },
    {
      title: "เช็คอิน/เอาท์",
      description: "ระบบบันทึกเวลาเข้า-ออกงาน",
      url: "/attendance",
      icon: Clock,
      gradient: "from-teal-500 to-teal-600",
      roles: ["admin", "manager", "worker"],
    },
    {
      title: "ระบบลา",
      description: "ยื่นคำขอและจัดการการลา",
      url: "/leave",
      icon: Calendar,
      gradient: "from-pink-500 to-pink-600",
      roles: ["admin", "manager", "worker"],
    },
    {
      title: "พนักงาน",
      description: "จัดการข้อมูลพนักงานทั้งหมด",
      url: "/employees",
      icon: Users,
      gradient: "from-indigo-500 to-indigo-600",
      roles: ["admin", "manager"],
    },
    {
      title: "จัดการ HR",
      description: "ระบบจัดการทรัพยากรบุคคล",
      url: "/hr-management",
      icon: UserCog,
      gradient: "from-violet-500 to-violet-600",
      roles: ["admin", "manager"],
    },
    {
      title: "บัญชีเงินเดือน",
      description: "บันทึกภาษีและประกันสังคม",
      url: "/payroll",
      icon: Wallet,
      gradient: "from-emerald-500 to-emerald-600",
      roles: ["admin", "manager"],
    },
    {
      title: "คนงานต่างด้าว",
      description: "จัดการข้อมูลคนงานต่างด้าว",
      url: "/foreign-workers",
      icon: Users,
      gradient: "from-amber-500 to-amber-600",
      roles: ["admin", "manager"],
    },
    {
      title: "โปรไฟล์",
      description: "จัดการข้อมูลส่วนตัว",
      url: "/profile",
      icon: User,
      gradient: "from-cyan-500 to-cyan-600",
      roles: ["admin", "manager", "accountant", "worker"],
    },
    {
      title: "ตั้งค่า",
      description: "ตั้งค่าระบบและข้อมูลพื้นฐาน",
      url: "/settings",
      icon: Settings,
      gradient: "from-gray-500 to-gray-600",
      roles: ["admin", "manager"],
    },
    {
      title: "แชทรวม",
      description: "สนทนาโครงการทั้งหมด",
      url: "/chat",
      icon: MessageCircle,
      gradient: "from-sky-500 to-sky-600",
      roles: ["admin", "manager", "accountant", "worker"],
    },
  ];

  const visibleMenuItems = allMenuItems.filter((item) => item.roles.includes(userRole));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">กำลังโหลด...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-page p-6 md:p-8 space-y-8">
      <div className="text-center mb-12 animate-fade-in">
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-3">ระบบบริหารงานก่อสร้าง</h1>
        <p className="text-muted-foreground text-lg md:text-xl">เลือกฟังก์ชันที่ต้องการใช้งาน</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 animate-scale-in">
        {visibleMenuItems.map((item, index) => (
          <Card
            key={item.title}
            className="group cursor-pointer border-border hover:border-primary/30 hover:shadow-xl transition-all duration-200 hover:-translate-y-1 rounded-2xl overflow-hidden"
            onClick={() => navigate(item.url)}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between mb-3">
                <div
                  className={`w-14 h-14 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center group-hover:scale-110 transition-transform shadow-md`}
                >
                  <item.icon className="w-7 h-7 text-white" />
                </div>
              </div>
              <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">
                {item.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Index;
