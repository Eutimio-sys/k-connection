import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import ProjectDialog from "@/components/ProjectDialog";
import CompanyDialog from "@/components/CompanyDialog";

const Projects = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [projectsRes, companiesRes] = await Promise.all([
      supabase.from("projects").select(`*, company:companies(name), creator:profiles!created_by(full_name)`).order("created_at", { ascending: false }),
      supabase.from("companies").select("*").eq("is_active", true),
    ]);

    if (projectsRes.error) toast.error("เกิดข้อผิดพลาดในการโหลดโครงการ");
    else setProjects(projectsRes.data || []);

    if (companiesRes.data) setCompanies(companiesRes.data);
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(amount);
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
            จัดการโครงการ
          </h1>
          <p className="text-muted-foreground text-lg">ติดตามและจัดการโครงการก่อสร้างทั้งหมด</p>
        </div>
        <div className="flex gap-2">
          <CompanyDialog onSuccess={fetchData} />
          <ProjectDialog companies={companies} onSuccess={fetchData} />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12"><p className="text-muted-foreground">กำลังโหลด...</p></div>
      ) : projects.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-4">ยังไม่มีโครงการในระบบ</p>
          <ProjectDialog companies={companies} onSuccess={fetchData} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card key={project.id} className="hover:shadow-elegant transition-shadow cursor-pointer" onClick={() => navigate(`/projects/${project.id}`)}>
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <CardTitle className="text-xl line-clamp-1">{project.name}</CardTitle>
                  {getStatusBadge(project.status)}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{project.description || "ไม่มีคำอธิบาย"}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin size={16} />
                  <span className="line-clamp-1">{project.location || "ไม่ระบุสถานที่"}</span>
                </div>
                
                {project.start_date && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar size={16} />
                    <span>
                      {new Date(project.start_date).toLocaleDateString("th-TH")}
                      {project.end_date && ` - ${new Date(project.end_date).toLocaleDateString("th-TH")}`}
                    </span>
                  </div>
                )}

                {project.budget && (
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingUp size={16} className="text-primary" />
                    <span className="font-semibold text-primary">{formatCurrency(project.budget)}</span>
                  </div>
                )}

                <div className="pt-3 border-t text-sm text-muted-foreground">
                  <p>บริษัท: {project.company?.name || "ไม่ระบุ"}</p>
                  <p>สร้างโดย: {project.creator?.full_name || "ไม่ทราบ"}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Projects;
