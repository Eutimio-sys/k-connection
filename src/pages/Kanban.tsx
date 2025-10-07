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
import { Plus, GripVertical, UserPlus, UserCheck } from "lucide-react";
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
      .select(`
        *,
        assigned:profiles!assigned_to(full_name),
        creator:profiles!created_by(full_name)
      `)
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
    <div className="min-h-screen bg-gradient-page p-6 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            ตารางงาน Kanban
          </h1>
          <p className="text-muted-foreground text-base md:text-lg">จัดการและติดตามงานในโครงการ</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <Select value={selectedProject} onValueChange={handleProjectChange}>
            <SelectTrigger className="w-full sm:w-64 h-11 rounded-xl">
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
                <Button className="gap-2 h-11 w-full sm:w-auto">
                  <Plus size={18} />
                  เพิ่มงาน
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-semibold">เพิ่มงานใหม่</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateTask} className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">ชื่องาน *</Label>
                    <Input 
                      value={formData.title} 
                      onChange={e => setFormData({...formData, title: e.target.value})} 
                      required 
                      className="h-11 rounded-xl"
                      placeholder="ระบุชื่องาน"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">รายละเอียด</Label>
                    <Textarea 
                      value={formData.description} 
                      onChange={e => setFormData({...formData, description: e.target.value})} 
                      rows={3}
                      className="rounded-xl"
                      placeholder="รายละเอียดงาน (ถ้ามี)"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">ความสำคัญ</Label>
                      <Select value={formData.priority} onValueChange={v => setFormData({...formData, priority: v})}>
                        <SelectTrigger className="h-11 rounded-xl">
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
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">กำหนดส่ง</Label>
                      <Input 
                        type="date" 
                        value={formData.due_date} 
                        onChange={e => setFormData({...formData, due_date: e.target.value})}
                        className="h-11 rounded-xl"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end pt-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="h-11">
                      ยกเลิก
                    </Button>
                    <Button type="submit" className="h-11">บันทึก</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {!selectedProject ? (
        <Card className="p-12 text-center rounded-2xl shadow-md">
          <p className="text-muted-foreground text-lg">กรุณาเลือกโครงการเพื่อดูตารางงาน</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {columns.map(column => (
            <Card key={column.id} className={`${column.color} border-border rounded-2xl overflow-hidden`}>
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-base md:text-lg font-semibold">{column.title}</CardTitle>
                <p className="text-sm text-muted-foreground font-medium">
                  {tasks.filter(t => t.status === column.id).length} งาน
                </p>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">{/* Task cards will be rendered here */}
                {tasks.filter(t => t.status === column.id).map(task => (
                  <Card key={task.id} className="bg-card hover:shadow-lg transition-all duration-200 cursor-pointer border-border rounded-xl">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold line-clamp-2 text-foreground">{task.title}</h4>
                        <GripVertical size={16} className="text-muted-foreground flex-shrink-0" />
                      </div>
                      {task.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={getPriorityColor(task.priority) as any} className="text-xs">
                          {task.priority === "low" ? "ต่ำ" : task.priority === "medium" ? "ปานกลาง" : task.priority === "high" ? "สูง" : "เร่งด่วน"}
                        </Badge>
                        {task.due_date && (
                          <span className="text-xs text-muted-foreground">
                            📅 {new Date(task.due_date).toLocaleDateString("th-TH", { month: "short", day: "numeric" })}
                          </span>
                        )}
                      </div>
                      
                      {/* แสดงคนที่เพิ่มงานและผู้รับผิดชอบ */}
                      <div className="space-y-1.5 pt-2 border-t border-border/50">
                        {task.creator?.full_name && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <UserPlus size={14} className="text-primary" />
                            <span className="font-medium">สร้างโดย:</span>
                            <span>{task.creator.full_name}</span>
                          </div>
                        )}
                        {task.assigned?.full_name && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <UserCheck size={14} className="text-accent" />
                            <span className="font-medium">ผู้รับผิดชอบ:</span>
                            <span>{task.assigned.full_name}</span>
                          </div>
                        )}
                      </div>
                      
                      <Select value={task.status} onValueChange={v => handleStatusChange(task.id, v)}>
                        <SelectTrigger className="h-9 text-xs rounded-lg">
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
