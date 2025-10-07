import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Calendar, TrendingUp, Building2, User, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    
    const { data: projectData, error: projectError } = await supabase
      .from("projects")
      .select(`*, company:companies(name, tax_id, phone), creator:profiles!created_by(full_name)`)
      .eq("id", id)
      .single();

    if (projectError) {
      toast.error("เกิดข้อผิดพลาด");
      navigate("/projects");
    } else {
      setProject(projectData);
    }

    const { data: purchasesData } = await supabase
      .from("purchase_requests")
      .select(`*, category:expense_categories(name)`)
      .eq("project_id", id)
      .order("created_at", { ascending: false });

    setPurchases(purchasesData || []);
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      planning: { label: "วางแผน", variant: "secondary" },
      in_progress: { label: "กำลังดำเนินการ", variant: "default" },
      completed: { label: "เสร็จสิ้น", variant: "outline" },
      on_hold: { label: "พักงาน", variant: "secondary" },
      cancelled: { label: "ยกเลิก", variant: "destructive" },
    };
    const c = config[status] || config.planning;
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(amount);

  const totalExpenses = purchases.reduce((sum, p) => sum + (p.status === "approved" ? p.estimated_price : 0), 0);

  if (loading) return <div className="p-8 text-center"><p>กำลังโหลด...</p></div>;
  if (!project) return null;

  return (
    <div className="p-8 space-y-6">
      <Button variant="outline" onClick={() => navigate("/projects")} className="gap-2">
        <ArrowLeft size={20} />
        กลับ
      </Button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">{project.name}</h1>
          <p className="text-muted-foreground text-lg">{project.description || "ไม่มีคำอธิบาย"}</p>
        </div>
        {getStatusBadge(project.status)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>ข้อมูลโครงการ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <MapPin className="text-muted-foreground" size={20} />
                <div>
                  <p className="text-sm text-muted-foreground">สถานที่</p>
                  <p className="font-medium">{project.location || "ไม่ระบุ"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Building2 className="text-muted-foreground" size={20} />
                <div>
                  <p className="text-sm text-muted-foreground">บริษัท</p>
                  <p className="font-medium">{project.company?.name || "ไม่ระบุ"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="text-muted-foreground" size={20} />
                <div>
                  <p className="text-sm text-muted-foreground">วันที่เริ่ม</p>
                  <p className="font-medium">{project.start_date ? new Date(project.start_date).toLocaleDateString("th-TH") : "ไม่ระบุ"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="text-muted-foreground" size={20} />
                <div>
                  <p className="text-sm text-muted-foreground">วันที่สิ้นสุด</p>
                  <p className="font-medium">{project.end_date ? new Date(project.end_date).toLocaleDateString("th-TH") : "ไม่ระบุ"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <User className="text-muted-foreground" size={20} />
                <div>
                  <p className="text-sm text-muted-foreground">ผู้สร้าง</p>
                  <p className="font-medium">{project.creator?.full_name || "ไม่ทราบ"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <TrendingUp className="text-primary" size={20} />
                <div>
                  <p className="text-sm text-muted-foreground">งบประมาณ</p>
                  <p className="font-semibold text-primary">{project.budget ? formatCurrency(project.budget) : "ไม่ระบุ"}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>สรุปค่าใช้จ่าย</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-primary/5 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">งบประมาณ</p>
              <p className="text-2xl font-bold text-primary">{project.budget ? formatCurrency(project.budget) : "-"}</p>
            </div>
            
            <div className="p-4 bg-accent/5 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">ค่าใช้จ่ายที่อนุมัติแล้ว</p>
              <p className="text-2xl font-bold text-accent">{formatCurrency(totalExpenses)}</p>
            </div>

            {project.budget && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">คงเหลือ</p>
                <p className="text-2xl font-bold">{formatCurrency(project.budget - totalExpenses)}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart size={20} />
              ใบขอซื้อ ({purchases.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {purchases.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">ยังไม่มีใบขอซื้อ</p>
          ) : (
            <div className="space-y-3">
              {purchases.map(p => (
                <div key={p.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                  <div className="flex-1">
                    <p className="font-medium">{p.item_name}</p>
                    <p className="text-sm text-muted-foreground">{p.quantity} {p.unit} • {p.category?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-accent">{formatCurrency(p.estimated_price)}</p>
                    <Badge variant={p.status === "approved" ? "default" : p.status === "pending" ? "secondary" : "destructive"} className="text-xs">
                      {p.status === "approved" ? "อนุมัติ" : p.status === "pending" ? "รออนุมัติ" : "ปฏิเสธ"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectDetail;
