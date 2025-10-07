import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban, ShoppingCart, Building2, TrendingUp } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";

const Dashboard = () => {
  const [stats, setStats] = useState({
    projects: 0,
    purchaseRequests: 0,
    companies: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const [projectsRes, requestsRes, companiesRes] = await Promise.all([
        supabase.from("projects").select("*", { count: "exact", head: true }),
        supabase.from("purchase_requests").select("*", { count: "exact", head: true }),
        supabase.from("companies").select("*", { count: "exact", head: true }),
      ]);

      setStats({
        projects: projectsRes.count || 0,
        purchaseRequests: requestsRes.count || 0,
        companies: companiesRes.count || 0,
      });
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: "โครงการทั้งหมด",
      value: stats.projects,
      icon: FolderKanban,
      gradient: "from-primary to-primary/80",
    },
    {
      title: "ใบขอซื้อ",
      value: stats.purchaseRequests,
      icon: ShoppingCart,
      gradient: "from-accent to-accent/80",
    },
    {
      title: "บริษัท",
      value: stats.companies,
      icon: Building2,
      gradient: "from-blue-500 to-blue-400",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">แดชบอร์ด</h1>
          <p className="text-muted-foreground mt-2">
            ภาพรวมการทำงานของระบบบริหารงานก่อสร้าง
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {statCards.map((card) => (
            <Card key={card.title} className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {card.title}
                </CardTitle>
                <div className={`p-2 rounded-lg bg-gradient-to-br ${card.gradient}`}>
                  <card.icon className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  รายการทั้งหมดในระบบ
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              ยินดีต้อนรับสู่ระบบบริหารงานก่อสร้าง
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              ระบบจัดการโครงการและบริษัทรับเหมาก่อสร้างแบบครบวงจร
              รองรับการจัดการโครงการ ใบขอซื้อ บัญชี พนักงาน และอื่นๆ
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
