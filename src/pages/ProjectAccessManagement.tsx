import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowLeft, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePermissions } from "@/hooks/usePermissions";

export default function ProjectAccessManagement() {
  const navigate = useNavigate();
  const { role, loading: permLoading } = usePermissions();
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [projectAccess, setProjectAccess] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!permLoading && role !== "admin" && role !== "manager") {
      toast.error("คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
      navigate("/");
      return;
    }
    fetchData();
  }, [permLoading, role, navigate]);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch all projects
    const { data: projectsData } = await supabase
      .from("projects")
      .select("*")
      .order("name");
    setProjects(projectsData || []);

    // Fetch all users (profiles with worker role or other non-admin/manager roles)
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("is_active", true)
      .order("full_name");

    if (profilesData) {
      // Filter out admins and managers since they have access to all projects
      const { data: allRoles } = await supabase
        .from("user_roles")
        .select("user_id, role");

      const adminManagerIds = new Set(
        allRoles?.filter(r => r.role === 'admin' || r.role === 'manager').map(r => r.user_id) || []
      );

      const nonAdminUsers = profilesData.filter(u => !adminManagerIds.has(u.id));
      setUsers(nonAdminUsers);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (selectedProject) {
      fetchProjectAccess();
    }
  }, [selectedProject]);

  const fetchProjectAccess = async () => {
    if (!selectedProject) return;

    const { data } = await supabase
      .from("project_access")
      .select("user_id")
      .eq("project_id", selectedProject);

    const accessMap: Record<string, boolean> = {};
    data?.forEach(access => {
      accessMap[access.user_id] = true;
    });
    setProjectAccess(accessMap);
  };

  const handleToggleAccess = (userId: string, hasAccess: boolean) => {
    setProjectAccess(prev => ({
      ...prev,
      [userId]: hasAccess
    }));
  };

  const handleSave = async () => {
    if (!selectedProject) {
      toast.error("กรุณาเลือกโครงการ");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("ไม่พบข้อมูลผู้ใช้");

      // Delete all existing access for this project
      await supabase
        .from("project_access")
        .delete()
        .eq("project_id", selectedProject);

      // Insert new access records
      const accessRecords = Object.entries(projectAccess)
        .filter(([_, hasAccess]) => hasAccess)
        .map(([userId]) => ({
          project_id: selectedProject,
          user_id: userId,
          created_by: user.id
        }));

      if (accessRecords.length > 0) {
        const { error } = await supabase
          .from("project_access")
          .insert(accessRecords);

        if (error) throw error;
      }

      toast.success("บันทึกสิทธิ์การเข้าถึงสำเร็จ");
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading || permLoading) {
    return <div className="p-8 text-center"><p>กำลังโหลด...</p></div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
        </Button>
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            จัดการสิทธิ์การเข้าถึงโครงการ
          </h1>
          <p className="text-muted-foreground text-lg">กำหนดว่าผู้ใช้คนไหนสามารถเห็นโครงการไหนได้บ้าง</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>เลือกโครงการ</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger>
              <SelectValue placeholder="เลือกโครงการที่ต้องการจัดการสิทธิ์" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedProject && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              ผู้ใช้ที่สามารถเข้าถึงโครงการนี้
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                หมายเหตุ: ผู้ดูแลระบบและผู้จัดการจะสามารถเห็นโครงการทั้งหมดโดยอัตโนมัติ
              </p>
              {users.length === 0 ? (
                <p className="text-muted-foreground">ไม่มีผู้ใช้ในระบบ</p>
              ) : (
                <div className="space-y-3">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent/5">
                      <Checkbox
                        id={user.id}
                        checked={projectAccess[user.id] || false}
                        onCheckedChange={(checked) => handleToggleAccess(user.id, checked as boolean)}
                      />
                      <label
                        htmlFor={user.id}
                        className="flex-1 cursor-pointer"
                      >
                        <p className="font-medium">{user.full_name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </label>
                    </div>
                  ))}
                </div>
              )}
              <Button 
                onClick={handleSave} 
                className="w-full mt-4"
                disabled={saving}
              >
                {saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
