import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban, ShoppingCart, Building2, TrendingUp } from "lucide-react";

const Dashboard = () => {
  const [stats, setStats] = useState({ totalProjects: 0, activeProjects: 0, pendingRequests: 0, totalCompanies: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const [p, a, r, c] = await Promise.all([
        supabase.from("projects").select("*", { count: "exact", head: true }),
        supabase.from("projects").select("*", { count: "exact", head: true }).eq("status", "in_progress"),
        supabase.from("purchase_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("companies").select("*", { count: "exact", head: true }),
      ]);
      setStats({ totalProjects: p.count || 0, activeProjects: a.count || 0, pendingRequests: r.count || 0, totalCompanies: c.count || 0 });
    };
    fetchStats();
  }, []);

  const cards = [
    { title: "โครงการทั้งหมด", value: stats.totalProjects, icon: FolderKanban, gradient: "from-primary to-primary/70" },
    { title: "โครงการดำเนินการ", value: stats.activeProjects, icon: TrendingUp, gradient: "from-green-500 to-green-600" },
    { title: "ใบขอซื้อรออนุมัติ", value: stats.pendingRequests, icon: ShoppingCart, gradient: "from-accent to-orange-600" },
    { title: "บริษัททั้งหมด", value: stats.totalCompanies, icon: Building2, gradient: "from-blue-500 to-blue-600" },
  ];

  return (
    <div className="p-8 space-y-8">
      <div><h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">แดชบอร์ด</h1><p className="text-muted-foreground text-lg">ภาพรวมระบบ</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map(c => (
          <Card key={c.title} className="hover:shadow-elegant transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${c.gradient} flex items-center justify-center`}><c.icon className="w-6 h-6 text-white" /></div>
            </CardHeader>
            <CardContent><div className="text-3xl font-bold">{c.value}</div></CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;