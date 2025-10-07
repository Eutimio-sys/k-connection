import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, GripVertical } from "lucide-react";
import { toast } from "sonner";

const Kanban = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    due_date: "",
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    const projectId = searchParams.get("project");
    if (projectId) {
      setSelectedProject(projectId);
      fetchTasks(projectId);
    }
  }, [searchParams]);

  const fetchProjects = async () => {
    const { data } = await supabase.from("projects").select("id, name").eq("status", "in_progress").order("name");
    if (data) setProjects(data);
  };

  const fetchTasks = async (projectId: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("tasks")
      .select("*, assigned:profiles!assigned_to(full_name)")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    setTasks(data || []);
    setLoading(false);
  };

  const handleProjectChange = (projectId: string) => {
    setSelectedProject(projectId);
    setSearchParams({ project: projectId });
    fetchTasks(projectId);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("tasks").insert({
      ...formData,
      project_id: selectedProject,
      created_by: user?.id,
      status: "todo",
    });

    if (error) toast.error("เกิดข้อผิดพลาด");
    else {
      toast.success("สร้างงานสำเร็จ");
      setDialogOpen(false);
      setFormData({ title: "", description: "", priority: "medium", due_date: "" });
      fetchTasks(selectedProject);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    const { error } = await supabase.from("tasks").update({ status: newStatus }).eq("id", taskId);
    if (error) toast.error("เกิดข้อผิดพลาด");
    else fetchTasks(selectedProject);
  };

  const columns = [
    { id: "todo", title: "รอดำเนินการ", color: "bg-gray-100" },
    { id: "in_progress", title: "กำลังทำ", color: "bg-blue-100" },
    { id: "review", title: "ตรวจสอบ", color: "bg-yellow-100" },
    { id: "done", title: "เสร็จสิ้น", color: "bg-green-100" },
  ];

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: "secondary",
      medium: "default",
      high: "destructive",
      urgent: "destructive",
    };
    return colors[priority] || "default";
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
            ตารางงาน Kanban
          </h1>
          <p className="text-muted-foreground text-lg">จัดการและติดตามงานในโครงการ</p>
        </div>
        
        <div className="flex gap-3 items-center">
          <Select value={selectedProject} onValueChange={handleProjectChange}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="เลือกโครงการ" />
            </SelectTrigger>
            <SelectContent>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedProject && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus size={20} />
                  เพิ่มงาน
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>เพิ่มงานใหม่</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateTask} className="space-y-4">
                  <div>
                    <Label>ชื่องาน *</Label>
                    <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
                  </div>
                  <div>
                    <Label>รายละเอียด</Label>
                    <Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={3} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>ความสำคัญ</Label>
                      <Select value={formData.priority} onValueChange={v => setFormData({...formData, priority: v})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">ต่ำ</SelectItem>
                          <SelectItem value="medium">ปานกลาง</SelectItem>
                          <SelectItem value="high">สูง</SelectItem>
                          <SelectItem value="urgent">เร่งด่วน</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>กำหนดส่ง</Label>
                      <Input type="date" value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})} />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>ยกเลิก</Button>
                    <Button type="submit">บันทึก</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {!selectedProject ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">กรุณาเลือกโครงการเพื่อดูตารางงาน</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {columns.map(column => (
            <Card key={column.id} className={column.color}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{column.title}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {tasks.filter(t => t.status === column.id).length} งาน
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {tasks.filter(t => t.status === column.id).map(task => (
                  <Card key={task.id} className="bg-white hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold line-clamp-2">{task.title}</h4>
                        <GripVertical size={16} className="text-muted-foreground flex-shrink-0" />
                      </div>
                      {task.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
                      )}
                      <div className="flex items-center gap-2">
                        <Badge variant={getPriorityColor(task.priority) as any} className="text-xs">
                          {task.priority === "low" ? "ต่ำ" : task.priority === "medium" ? "ปานกลาง" : task.priority === "high" ? "สูง" : "เร่งด่วน"}
                        </Badge>
                        {task.due_date && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(task.due_date).toLocaleDateString("th-TH", { month: "short", day: "numeric" })}
                          </span>
                        )}
                      </div>
                      {task.assigned?.full_name && (
                        <p className="text-xs text-muted-foreground">👤 {task.assigned.full_name}</p>
                      )}
                      <Select value={task.status} onValueChange={v => handleStatusChange(task.id, v)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {columns.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Kanban;
